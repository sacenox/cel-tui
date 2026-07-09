import type {
  CursorStyle,
  FocusChangeReason,
  KittyKeyboardOptions,
  Node,
  TextInputNode,
  TextInputProps,
  Theme,
} from "@cel-tui/types";
import { CellBuffer } from "./cell-buffer.js";
import { defaultTheme, emitBuffer, emitDiff } from "./emitter.js";
import {
  collectFocusable,
  collectKeyPressHandlers,
  collectScrollTargets,
  findClickHandler,
  hitTest,
} from "./hit-test.js";
import { decodeKeyEvents, isEditingKey, type KeyInput } from "./keys.js";
import { type LayoutNode, layout, type Rect } from "./layout.js";
import {
  getTextInputCursor,
  getTextInputCursorScreenPos,
  getTextInputScroll,
  paint,
  resetTextInputState,
  retainTextInputStateKeys,
  setTextInputCursor,
  setTextInputScroll,
} from "./paint.js";
import {
  clampScrollOffset,
  getMaxScrollOffset,
  getScrollStep,
} from "./scroll.js";
import {
  explicitStateIdentity,
  inspectMountedStateKeys,
  layerIdentity,
  type MountedStateSnapshot,
} from "./state-identity.js";
import type { Terminal } from "./terminal.js";
import {
  deleteBackward,
  deleteForward,
  deleteWordBackward,
  deleteWordForward,
  type EditState,
  insertChar,
  moveCursor,
  moveCursorByWord,
} from "./text-edit.js";

/** Reactive viewport function evaluated for each requested frame. */
export type RenderFn = () => Node | Node[];

/** Framework initialization options. */
export interface CelInitOptions {
  /** Color theme mapping. Defaults to the ANSI 16 theme. */
  theme?: Theme;
  /** Kitty progressive-enhancement flags. Baseline disambiguation stays on. */
  kittyKeyboard?: KittyKeyboardOptions;
}

/** Public cel-tui runtime controller. */
export interface Cel {
  /** Initialize terminal I/O and runtime state. */
  init(term: Terminal, options?: CelInitOptions): void;
  /** Install the reactive viewport function and request its first frame. */
  viewport(fn: RenderFn): void;
  /** Request a batched differential render. */
  render(): void;
  /** Request a batched full-frame redraw. */
  redraw(): void;
  /** Replace the active palette and request a full redraw. */
  setTheme(theme: Theme): void;
  /** Set the sanitized terminal window or tab title. */
  setTitle(title: string): void;
  /** Stop the runtime and restore terminal state. */
  stop(): void;
}

/** Runtime-only hooks hidden behind the test-helper module. */
interface CelTestRuntime extends Cel {
  _getBuffer(): CellBuffer | null;
  _flush(): Promise<void>;
}

type TerminalCursorState =
  | { visible: false }
  | {
      visible: true;
      x: number;
      y: number;
      style: CursorStyle;
    };

let terminal: Terminal | null = null;
let activeTheme: Theme = defaultTheme;
let renderFn: RenderFn | null = null;
let renderScheduled = false;
let renderWaiters: Array<() => void> = [];
let fullRedrawScheduled = false;
let prevBuffer: CellBuffer | null = null;
let currentBuffer: CellBuffer | null = null;
let currentLayouts: LayoutNode[] = [];

type FocusRef =
  { kind: "keyed"; identity: string } | { kind: "legacy"; index: number };

interface LayerFocusState {
  current: FocusRef | null;
  last: FocusRef | null;
  autoFocusConsumed: Set<string>;
}

/** Focus is remembered independently for each mounted viewport layer. */
const layerFocusStates = new Map<string, LayerFocusState>();

/** The node whose props were stamped with `focused: true` during the last paint. */
let stampedNode: LayoutNode | null = null;

/**
 * Uncontrolled scroll offsets, keyed by explicit state identity when present
 * and by structural tree path as the compatible fallback.
 */
const uncontrolledScrollOffsets = new Map<string, number>();

/** Nodes whose props were stamped with scrollOffset during the last paint. */
let stampedScrollNodes: { node: Node; key: string }[] = [];

/** The cursor state currently expected on the terminal. */
let lastTerminalCursor: TerminalCursorState | null = { visible: false };
let lastTerminalTitle: string | null = null;

function requiredAt<T>(
  items: readonly T[],
  index: number,
  description: string,
): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Missing ${description} at index ${index}`);
  }
  return item;
}

function topLayerContext(): {
  root: LayoutNode;
  identity: string;
  focus: LayerFocusState;
} | null {
  const index = currentLayouts.length - 1;
  const root = currentLayouts[index];
  if (!root) return null;
  const identity = layerIdentity(root, index);
  let focus = layerFocusStates.get(identity);
  if (!focus) {
    focus = { current: null, last: null, autoFocusConsumed: new Set() };
    layerFocusStates.set(identity, focus);
  }
  return { root, identity, focus };
}

function focusRefFor(
  target: LayoutNode,
  focusables: readonly LayoutNode[],
): FocusRef {
  const identity = explicitStateIdentity(target.node);
  return identity === null
    ? { kind: "legacy", index: focusables.indexOf(target) }
    : { kind: "keyed", identity };
}

function resolveFocusRef(
  ref: FocusRef | null,
  focusables: readonly LayoutNode[],
): LayoutNode | null {
  if (ref === null) return null;
  if (ref.kind === "legacy") return focusables[ref.index] ?? null;
  return (
    focusables.find(
      (focusable) => explicitStateIdentity(focusable.node) === ref.identity,
    ) ?? null
  );
}

function autoFocusIdentity(
  target: LayoutNode,
  focusables: readonly LayoutNode[],
): string {
  return (
    explicitStateIdentity(target.node) ?? `legacy:${focusables.indexOf(target)}`
  );
}

function hasAutoFocus(target: LayoutNode): boolean {
  return target.node.type !== "text" && target.node.props.autoFocus === true;
}

function seedAutoFocus(
  focus: LayerFocusState,
  focusables: readonly LayoutNode[],
  focusAlreadyOwned: boolean,
): void {
  const pending = focusables.filter(
    (target) =>
      hasAutoFocus(target) &&
      !focus.autoFocusConsumed.has(autoFocusIdentity(target, focusables)),
  );
  for (const target of pending) {
    focus.autoFocusConsumed.add(autoFocusIdentity(target, focusables));
  }
  if (focusAlreadyOwned || pending.length === 0) return;

  const target = requiredAt(pending, 0, "autoFocus target");
  if (!isControlledFocus(target)) {
    focus.current = focusRefFor(target, focusables);
  }
  if (target.node.type !== "text") {
    target.node.props.onFocus?.({ reason: "auto" });
  }
}

/** Discard state only after the frame using this mount set rendered fully. */
function finalizeMountedStateKeys(keys: MountedStateSnapshot): void {
  retainTextInputStateKeys(keys.textInputKeys);
  const mountedLayers = new Map<string, LayoutNode>();
  for (let i = 0; i < currentLayouts.length; i++) {
    const root = requiredAt(currentLayouts, i, "layout root");
    mountedLayers.set(layerIdentity(root, i), root);
  }

  for (const identity of uncontrolledScrollOffsets.keys()) {
    if (identity.startsWith("K:") && !keys.containerIdentities.has(identity)) {
      uncontrolledScrollOffsets.delete(identity);
    }
  }

  for (const [identity, focus] of layerFocusStates) {
    if (!keys.layerIdentities.has(identity)) {
      layerFocusStates.delete(identity);
      continue;
    }
    if (
      focus.current?.kind === "keyed" &&
      !keys.stateIdentities.has(focus.current.identity)
    ) {
      focus.current = null;
    }
    if (
      focus.last?.kind === "keyed" &&
      !keys.stateIdentities.has(focus.last.identity)
    ) {
      focus.last = null;
    }

    const root = mountedLayers.get(identity);
    if (root) {
      const focusables = collectFocusable(root);
      const mountedAutoFocus = new Set(
        focusables
          .filter(hasAutoFocus)
          .map((target) => autoFocusIdentity(target, focusables)),
      );
      for (const consumed of focus.autoFocusConsumed) {
        if (!mountedAutoFocus.has(consumed)) {
          focus.autoFocusConsumed.delete(consumed);
        }
      }
    }
  }
}

function resolveRenderWaiters(): void {
  const waiters = renderWaiters;
  renderWaiters = [];
  for (const resolve of waiters) resolve();
}

function doRender(): void {
  renderScheduled = false;
  if (!renderFn || !terminal) return;

  const forceFullRedraw = fullRedrawScheduled;
  fullRedrawScheduled = false;

  const width = terminal.columns;
  const height = terminal.rows;

  // Create or resize buffer
  const isResize =
    currentBuffer !== null &&
    (currentBuffer.width !== width || currentBuffer.height !== height);
  const isFirstRender = currentBuffer === null;

  if (isFirstRender || isResize || forceFullRedraw) {
    prevBuffer = null;
    currentBuffer = new CellBuffer(width, height);
  } else {
    prevBuffer = currentBuffer;
    currentBuffer = new CellBuffer(width, height);
  }

  // Get the tree from the render function
  const tree = renderFn();
  const layers = Array.isArray(tree) ? tree : [tree];

  // Layout each layer
  currentLayouts = [];
  for (const layer of layers) {
    const layoutTree = layout(layer, width, height);
    currentLayouts.push(layoutTree);
  }

  const mountedStateKeys = inspectMountedStateKeys(currentLayouts);

  syncLayerFocusState();

  let nextCursor: TerminalCursorState;
  try {
    // Stamp uncontrolled focus and scroll before painting
    stampUncontrolledFocus();
    stampUncontrolledScroll();

    // Paint each layer into the buffer
    for (const layoutTree of currentLayouts) {
      paint(layoutTree, currentBuffer);
    }

    nextCursor = getDesiredTerminalCursor();
  } finally {
    // Never leave framework-only state on application-owned node props.
    unstampUncontrolledFocus();
    unstampUncontrolledScroll();
  }

  // Emit to terminal — differential when possible
  if (prevBuffer) {
    const output = emitDiff(prevBuffer, currentBuffer, activeTheme, {
      cursor: nextCursor,
      previousCursor: lastTerminalCursor,
    });
    if (output.length > 0) terminal.write(output);
  } else {
    const output = emitBuffer(currentBuffer, activeTheme, {
      cursor: nextCursor,
      previousCursor: lastTerminalCursor,
    });
    terminal.write(output);
  }

  lastTerminalCursor = nextCursor;
  finalizeMountedStateKeys(mountedStateKeys);
}

/**
 * Resolve the final terminal cursor state for the current frame.
 * The cursor is shown only for a focused TextInput whose cursor is visible
 * within the clipped viewport.
 */
function getDesiredTerminalCursor(): TerminalCursorState {
  const focusedTI = findFocusedTextInputLayout();
  if (!focusedTI) return { visible: false };

  const path = findPathInCurrentLayouts(focusedTI);
  if (!path) return { visible: false };

  const projection = projectLayoutThroughAncestors(path);
  if (!projection) return { visible: false };

  const props = focusedTI.node.props as import("@cel-tui/types").TextInputProps;
  const pos = getTextInputCursorScreenPos(props, projection.rect);
  if (!pos || !pointInRect(pos.x, pos.y, projection.clip)) {
    return { visible: false };
  }

  return {
    visible: true,
    x: pos.x,
    y: pos.y,
    style: props.cursorStyle ?? "block",
  };
}

function findPathInCurrentLayouts(target: LayoutNode): LayoutNode[] | null {
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    const path = findPathTo(
      requiredAt(currentLayouts, i, "layout root"),
      target,
    );
    if (path) return path;
  }
  return null;
}

function projectLayoutThroughAncestors(
  path: LayoutNode[],
): { rect: Rect; clip: Rect } | null {
  if (!terminal || path.length === 0) return null;

  let offsetX = 0;
  let offsetY = 0;
  let clip: Rect = {
    x: 0,
    y: 0,
    width: terminal.columns,
    height: terminal.rows,
  };

  for (let i = 0; i < path.length; i++) {
    const current = requiredAt(path, i, "focused path node");
    const projectedRect = translateRect(current.rect, offsetX, offsetY);
    clip = intersectRects(clip, projectedRect);
    if (clip.width <= 0 || clip.height <= 0) return null;

    if (i === path.length - 1) {
      return { rect: projectedRect, clip };
    }

    if (
      (current.node.type === "vstack" || current.node.type === "hstack") &&
      current.node.props.overflow === "scroll"
    ) {
      const scrollOffset = resolveScrollOffset(current);
      if (current.node.type === "vstack") {
        offsetY -= scrollOffset;
      } else {
        offsetX -= scrollOffset;
      }
    }
  }

  return null;
}

function translateRect(rect: Rect, offsetX: number, offsetY: number): Rect {
  return {
    x: rect.x + offsetX,
    y: rect.y + offsetY,
    width: rect.width,
    height: rect.height,
  };
}

function intersectRects(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
}

function pointInRect(x: number, y: number, rect: Rect): boolean {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}

/**
 * Find the focused TextInput in the current layout tree.
 * Checks controlled focus (props.focused) and uncontrolled
 * (framework-tracked index). Returns the LayoutNode or null.
 */
function findFocusedTextInputLayout(): LayoutNode | null {
  const context = topLayerContext();
  if (!context) return null;

  const controlled = findFocusedTIInTree(context.root);
  if (controlled) return controlled;

  const target = resolveFocusRef(
    context.focus.current,
    collectFocusable(context.root),
  );
  if (target?.node.type === "textinput") return target;
  return null;
}

function findFocusedTIInTree(ln: LayoutNode): LayoutNode | null {
  if (ln.node.type === "textinput" && ln.node.props.focused) return ln;
  for (const child of ln.children) {
    const found = findFocusedTIInTree(child);
    if (found) return found;
  }
  return null;
}

function syncLayerFocusState(): void {
  const context = topLayerContext();
  if (!context) return;

  const focusables = collectFocusable(context.root);
  if (focusables.length === 0) {
    context.focus.current = null;
    context.focus.last = null;
    return;
  }

  const controlled = findFocusedInTree(context.root);
  const uncontrolled = resolveFocusRef(context.focus.current, focusables);
  if (uncontrolled === null && context.focus.current?.kind === "keyed") {
    context.focus.current = null;
  }
  seedAutoFocus(
    context.focus,
    focusables,
    controlled !== null || uncontrolled !== null,
  );

  if (controlled) {
    context.focus.last = focusRefFor(controlled, focusables);
    return;
  }
}

// --- Input handling ---

const BRACKETED_PASTE_START = "\x1b[200~";
const BRACKETED_PASTE_END = "\x1b[201~";
const LEGACY_ESCAPE_TIMEOUT_MS = 25;

// Regex for a single SGR mouse event, anchored to the current parse position.
// biome-ignore lint/complexity/useRegexLiterals: using RegExp here avoids control-character regex diagnostics.
const SGR_MOUSE_RE = new RegExp(String.raw`^\x1b\[<(\d+);(\d+);(\d+)([Mm])`);
// biome-ignore lint/complexity/useRegexLiterals: using RegExp here avoids control-character regex diagnostics.
const TERMINAL_TITLE_CONTROL_CHARS_RE = new RegExp(
  String.raw`[\x00-\x1f\x7f-\x9f]`,
  "g",
);

// Trailing input that ended with an incomplete CSI or paste-start sequence.
let pendingKeyData = "";
let pendingEscapeTimer: ReturnType<typeof setTimeout> | null = null;

// Bracketed paste state across stdin chunks.
let inBracketedPaste = false;
let bracketedPasteData = "";
let bracketedPasteSuffix = "";

// Tracks accumulated scroll offsets during a batch of mouse events.
// Controlled scroll reads scrollOffset from props, which doesn't update until
// re-render. Within a single data chunk containing multiple scroll events, we
// need to remember the offset we already dispatched via onScroll.
let batchScrollOffsets: Map<object, number> | null = null;

// Tracks the focused TextInput's latest edit state during a batched keyboard
// chunk. The layout tree does not re-render until the next tick, so subsequent
// keys in the same chunk must see the updated value/cursor immediately.
let batchTextInputEdits: Map<TextInputProps, EditState> | null = null;

function sanitizeTerminalTitle(title: string): string {
  return title.replace(TERMINAL_TITLE_CONTROL_CHARS_RE, "");
}

function handleInput(data: string): void {
  clearPendingEscapeTimer();
  batchTextInputEdits = new Map();

  try {
    let remaining = data;

    if (inBracketedPaste) {
      remaining = consumeBracketedPasteData(remaining);
      if (remaining.length === 0) return;
    }

    let chunk = pendingKeyData + remaining;
    pendingKeyData = "";

    let keyChunkStart = 0;
    let index = 0;

    while (index < chunk.length) {
      if (chunk.startsWith(BRACKETED_PASTE_START, index)) {
        handleKeyChunk(chunk.slice(keyChunkStart, index));

        index += BRACKETED_PASTE_START.length;
        keyChunkStart = index;
        inBracketedPaste = true;

        const afterPaste = consumeBracketedPasteData(chunk.slice(index));
        if (afterPaste.length === 0) return;

        chunk = afterPaste;
        index = 0;
        keyChunkStart = 0;
        continue;
      }

      const mouse = readSgrMouseEvent(chunk, index);
      if (mouse) {
        handleKeyChunk(chunk.slice(keyChunkStart, index));

        if (batchScrollOffsets === null) {
          batchScrollOffsets = new Map();
        }
        if (mouse.event) handleMouseEvent(mouse.event);

        index = mouse.nextIndex;
        keyChunkStart = index;
        continue;
      }

      index++;
    }

    const { complete, pending } = splitIncompleteInputSuffix(
      chunk.slice(keyChunkStart),
    );
    handleKeyChunk(complete);
    pendingKeyData = pending;
    schedulePendingEscape();
  } finally {
    batchScrollOffsets = null;
    batchTextInputEdits = null;
  }
}

function handleKeyChunk(data: string): void {
  if (data.length === 0) return;
  for (const key of decodeKeyEvents(data)) {
    handleKeyEvent(key);
  }
}

function clearPendingEscapeTimer(): void {
  if (pendingEscapeTimer === null) return;
  clearTimeout(pendingEscapeTimer);
  pendingEscapeTimer = null;
}

function schedulePendingEscape(): void {
  if (pendingKeyData !== "\x1b") return;

  pendingEscapeTimer = setTimeout(() => {
    pendingEscapeTimer = null;
    if (pendingKeyData !== "\x1b") return;

    const escapeData = pendingKeyData;
    pendingKeyData = "";
    handleKeyChunk(escapeData);
  }, LEGACY_ESCAPE_TIMEOUT_MS);
}

function consumeBracketedPasteData(data: string): string {
  const chunk = bracketedPasteSuffix + data;
  bracketedPasteSuffix = "";

  const endIndex = chunk.indexOf(BRACKETED_PASTE_END);
  if (endIndex === -1) {
    const { complete, pending } = splitTrailingMarkerPrefix(
      chunk,
      BRACKETED_PASTE_END,
    );
    bracketedPasteData += complete;
    bracketedPasteSuffix = pending;
    return "";
  }

  bracketedPasteData += chunk.slice(0, endIndex);
  const pastedText = bracketedPasteData;

  inBracketedPaste = false;
  bracketedPasteData = "";
  bracketedPasteSuffix = "";
  handleBracketedPaste(pastedText);

  return chunk.slice(endIndex + BRACKETED_PASTE_END.length);
}

function splitTrailingMarkerPrefix(
  data: string,
  marker: string,
): { complete: string; pending: string } {
  const maxPrefixLength = Math.min(data.length, marker.length - 1);
  for (let length = maxPrefixLength; length > 0; length--) {
    if (data.endsWith(marker.slice(0, length))) {
      return {
        complete: data.slice(0, data.length - length),
        pending: data.slice(data.length - length),
      };
    }
  }
  return { complete: data, pending: "" };
}

function splitIncompleteInputSuffix(data: string): {
  complete: string;
  pending: string;
} {
  const pasteStart = splitTrailingMarkerPrefix(data, BRACKETED_PASTE_START);
  if (pasteStart.pending.length > 0) {
    return pasteStart;
  }

  const csiStart = data.lastIndexOf("\x1b[");
  if (csiStart === -1) return { complete: data, pending: "" };

  const suffix = data.slice(csiStart);
  for (let i = 2; i < suffix.length; i++) {
    const code = suffix.charCodeAt(i);
    if (code >= 0x40 && code <= 0x7e) {
      return { complete: data, pending: "" };
    }
  }

  return { complete: data.slice(0, csiStart), pending: suffix };
}

interface MouseEvent {
  type: "click" | "scroll-up" | "scroll-down";
  x: number;
  y: number;
}

function readSgrMouseEvent(
  data: string,
  index: number,
): { event: MouseEvent | null; nextIndex: number } | null {
  const match = SGR_MOUSE_RE.exec(data.slice(index));
  if (!match) return null;
  return {
    event: parseSgrMatch(match),
    nextIndex: index + match[0].length,
  };
}

/**
 * Parse a single SGR mouse event from a RegExp match.
 * Returns a MouseEvent for scroll and click events, null for unhandled buttons.
 */
function parseSgrMatch(match: RegExpExecArray): MouseEvent | null {
  const cbMatch = match[1];
  const xMatch = match[2];
  const yMatch = match[3];
  if (cbMatch === undefined || xMatch === undefined || yMatch === undefined) {
    throw new Error("Incomplete SGR mouse match");
  }

  const cb = parseInt(cbMatch, 10);
  const x = parseInt(xMatch, 10) - 1; // 1-indexed → 0-indexed
  const y = parseInt(yMatch, 10) - 1;
  const isRelease = match[4] === "m";

  // Scroll up (cb=64) / scroll down (cb=65)
  if (cb === 64) return { type: "scroll-up", x, y };
  if (cb === 65) return { type: "scroll-down", x, y };

  // Button click (cb=0 for left button, release event)
  if (cb === 0 && isRelease) return { type: "click", x, y };

  return null;
}

/**
 * Check if a focusable element uses controlled focus (explicit `focused` prop).
 */
function isControlledFocus(ln: LayoutNode): boolean {
  const node = ln.node;
  if (node.type === "textinput") return node.props.focused !== undefined;
  if (node.type === "vstack" || node.type === "hstack")
    return node.props.focused !== undefined;
  return false;
}

/**
 * Find the currently focused element in the active (topmost) layer.
 * Checks controlled focus (`focused: true` in props) first,
 * then falls back to framework-tracked uncontrolled focus.
 */
function findFocusedElement(): LayoutNode | null {
  const context = topLayerContext();
  if (!context) return null;
  const controlled = findFocusedInTree(context.root);
  if (controlled) return controlled;
  return resolveFocusRef(context.focus.current, collectFocusable(context.root));
}

/**
 * Stamp `focused: true` on the framework-tracked focused node's props
 * before painting, so that paint/focusStyle/cursor rendering picks it up.
 * Only stamps if no controlled element is already focused.
 * Must be followed by {@link unstampUncontrolledFocus} after paint.
 */
function stampUncontrolledFocus(): void {
  stampedNode = null;
  const context = topLayerContext();
  if (!context || context.focus.current === null) return;

  // Controlled focus replaces uncontrolled focus within the same layer.
  if (findFocusedInTree(context.root)) {
    context.focus.current = null;
    return;
  }

  const target = resolveFocusRef(
    context.focus.current,
    collectFocusable(context.root),
  );
  if (!target) return;
  const node = target.node;
  if (
    node.type === "textinput" ||
    node.type === "vstack" ||
    node.type === "hstack"
  ) {
    node.props.focused = true;
    stampedNode = target;
  }
}

/**
 * Remove the `focused: true` stamp set by {@link stampUncontrolledFocus}.
 * Called after paint so input handlers see the original props and can
 * correctly distinguish controlled from uncontrolled elements.
 */
function unstampUncontrolledFocus(): void {
  if (!stampedNode) return;
  const node = stampedNode.node;
  if (
    node.type === "textinput" ||
    node.type === "vstack" ||
    node.type === "hstack"
  ) {
    delete node.props.focused;
  }
  stampedNode = null;
}

/**
 * Compute the structural tree path from a layer root to a target LayoutNode.
 * Returns a string like "0/2/1" or null if target is not in the tree.
 */
function computeTreePath(root: LayoutNode, target: LayoutNode): string | null {
  if (root === target) return "";
  for (let i = 0; i < root.children.length; i++) {
    const sub = computeTreePath(
      requiredAt(root.children, i, "layout child"),
      target,
    );
    if (sub !== null) return sub === "" ? String(i) : `${i}/${sub}`;
  }
  return null;
}

/**
 * Get the full path key for a scrollable node, prefixed by layer index.
 */
function getScrollPathKey(target: LayoutNode): string | null {
  const explicit = explicitStateIdentity(target.node);
  if (explicit !== null) return explicit;

  for (let i = 0; i < currentLayouts.length; i++) {
    const path = computeTreePath(
      requiredAt(currentLayouts, i, "layout root"),
      target,
    );
    if (path !== null) return `L${i}:${path}`;
  }
  return null;
}

/**
 * Stamp `scrollOffset` on uncontrolled scrollable containers' props
 * before painting, so paint reads the correct offset.
 */
function stampUncontrolledScroll(): void {
  stampedScrollNodes = [];
  if (uncontrolledScrollOffsets.size === 0) return;
  for (let i = 0; i < currentLayouts.length; i++) {
    walkAndStampScroll(requiredAt(currentLayouts, i, "layout root"), `L${i}:`);
  }
}

function walkAndStampScroll(ln: LayoutNode, pathKey: string): void {
  const node = ln.node;
  if (node.type === "vstack" || node.type === "hstack") {
    if (
      node.props.overflow === "scroll" &&
      node.props.scrollOffset === undefined
    ) {
      const stateIdentity = explicitStateIdentity(node) ?? pathKey;
      const offset = uncontrolledScrollOffsets.get(stateIdentity);
      if (offset !== undefined && offset !== 0) {
        node.props.scrollOffset = offset;
        stampedScrollNodes.push({ node, key: stateIdentity });
      }
    }
  }
  for (let i = 0; i < ln.children.length; i++) {
    // Keys match getScrollPathKey format: "L0:" for root, "L0:2" for child 2, "L0:2/1" for grandchild
    const childKey = pathKey.endsWith(":")
      ? `${pathKey}${i}`
      : `${pathKey}/${i}`;
    walkAndStampScroll(requiredAt(ln.children, i, "layout child"), childKey);
  }
}

function unstampUncontrolledScroll(): void {
  for (const { node } of stampedScrollNodes) {
    if (node.type === "vstack" || node.type === "hstack") {
      delete node.props.scrollOffset;
    }
  }
  stampedScrollNodes = [];
}

/**
 * Blur the currently focused element and focus a new one.
 * Manages both controlled (via onFocus/onBlur callbacks) and
 * uncontrolled per-layer focus.
 */
function changeFocus(
  target: LayoutNode | null,
  reason: FocusChangeReason,
): void {
  const context = topLayerContext();
  if (!context) return;
  const focusables = collectFocusable(context.root);
  const current = findFocusedElement();
  const event = { reason };

  // Blur current — save position for Tab/Shift+Tab continuity
  if (current && current !== target) {
    context.focus.last = focusRefFor(current, focusables);
    context.focus.current = null;
    const props =
      current.node.type === "textinput"
        ? current.node.props
        : current.node.type !== "text"
          ? current.node.props
          : null;
    if (props && "onBlur" in props && props.onBlur) {
      props.onBlur(event);
    }
  }

  // Focus new target — clear saved position
  if (target && target !== current) {
    context.focus.last = null;
    // Set or clear framework tracking based on controlled/uncontrolled
    if (!isControlledFocus(target)) {
      context.focus.current = focusRefFor(target, focusables);
    } else {
      context.focus.current = null;
    }
    const props =
      target.node.type === "textinput"
        ? target.node.props
        : target.node.type !== "text"
          ? target.node.props
          : null;
    if (props && "onFocus" in props && props.onFocus) {
      props.onFocus(event);
    }
  }
}

/**
 * Resolve the current scroll offset for a layout node.
 * Checks controlled (props.scrollOffset), then uncontrolled (path-based map).
 */
function resolveScrollOffset(ln: import("./layout.js").LayoutNode): number {
  const node = ln.node;
  if (node.type === "text") return 0;
  if (node.type === "textinput") {
    return getTextInputScroll(node.props);
  }
  const props = node.props;
  if (props.scrollOffset !== undefined) {
    return clampScrollOffset(ln, props.scrollOffset);
  }
  // Check uncontrolled map
  const pathKey = getScrollPathKey(ln);
  if (pathKey !== null) {
    return clampScrollOffset(ln, uncontrolledScrollOffsets.get(pathKey) ?? 0);
  }
  return 0;
}

function handleMouseEvent(event: MouseEvent): void {
  // Hit test on topmost layer first
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    const layoutRoot = requiredAt(currentLayouts, i, "layout root");
    const path = hitTest(layoutRoot, event.x, event.y, resolveScrollOffset);
    if (path.length === 0) continue;

    if (event.type === "click") {
      // Find and focus the focusable element at click position
      const focusable = findClickFocusTarget(path);
      if (focusable) {
        changeFocus(focusable, "click");
      }

      const click = findClickHandler(path);
      if (click) {
        click.handler();
      }
      cel.render();
      return;
    }

    if (event.type === "scroll-up" || event.type === "scroll-down") {
      const targets = collectScrollTargets(path);
      for (const target of targets) {
        const step = getScrollStep(target);
        const delta = event.type === "scroll-up" ? -step : step;
        const maxOffset = getMaxScrollOffset(target);

        if (target.node.type === "textinput") {
          // TextInput scroll is always framework-managed and consumes wheel input.
          const tiProps = target.node.props;
          const current = getTextInputScroll(tiProps);
          const clamped = Math.max(0, Math.min(maxOffset, current + delta));
          setTextInputScroll(tiProps, clamped);
          cel.render();
          return;
        }

        if (target.node.type === "vstack" || target.node.type === "hstack") {
          const props = target.node.props;
          if (props.overflow !== "scroll") continue;

          if (props.scrollOffset !== undefined) {
            // Controlled scroll: the app owns the offset. Notify it when a
            // handler is present, but never write framework scroll state.
            // Use batch accumulator if available (multiple events in one chunk),
            // otherwise read from props. Clamp to maxOffset first so that
            // Infinity (sticky-bottom) resolves to a finite value before
            // applying the delta — otherwise Infinity + (-1) = Infinity
            // and scrolling up never unsticks.
            if (props.onScroll) {
              const rawBase =
                batchScrollOffsets?.get(props) ?? props.scrollOffset;
              const baseOffset = Math.min(rawBase, maxOffset);
              const newOffset = Math.max(
                0,
                Math.min(maxOffset, baseOffset + delta),
              );
              const result = props.onScroll(newOffset, maxOffset);
              if (result === false) continue;
              batchScrollOffsets?.set(props, newOffset);
            }
          } else {
            // Uncontrolled scroll: callbacks participate in consume/bubble
            // routing, while the framework remains the source of truth.
            const pathKey = getScrollPathKey(target);
            const current =
              pathKey === null
                ? 0
                : (uncontrolledScrollOffsets.get(pathKey) ?? 0);
            const newOffset = Math.max(0, Math.min(maxOffset, current + delta));

            if (props.onScroll) {
              const result = props.onScroll(newOffset, maxOffset);
              if (result === false) continue;
            }

            if (pathKey !== null) {
              uncontrolledScrollOffsets.set(pathKey, newOffset);
            }
          }

          cel.render();
          return;
        }
      }
      return;
    }
  }
}

/**
 * Find the nearest focusable element in a hit path (for mouse click focusing).
 */
function findClickFocusTarget(path: LayoutNode[]): LayoutNode | null {
  for (let i = path.length - 1; i >= 0; i--) {
    const layoutNode = requiredAt(path, i, "hit path node");
    const node = layoutNode.node;
    if (node.type === "textinput" && node.props.focusable !== false) {
      return layoutNode;
    }
    if (node.type === "vstack" || node.type === "hstack") {
      const isFocusable =
        node.props.focusable === true ||
        (node.props.onClick != null && node.props.focusable !== false);
      if (isFocusable) return layoutNode;
    }
  }
  return null;
}

function getTextInputEditState(props: TextInputProps): EditState {
  const batched = batchTextInputEdits?.get(props);
  if (batched) return batched;
  return {
    value: props.value,
    cursor: getTextInputCursor(props),
  };
}

function commitTextInputEdit(
  props: TextInputProps,
  previousState: EditState,
  nextState: EditState,
): void {
  batchTextInputEdits?.set(props, nextState);
  setTextInputCursor(props, nextState.cursor, nextState.value);
  if (nextState.value !== previousState.value) {
    props.onChange(nextState.value);
  }
  if (nextState.cursor !== previousState.cursor) {
    props.onCursorChange?.(nextState.cursor);
  }
  cel.render();
}

function handleBracketedPaste(text: string): void {
  if (text.length === 0) return;

  const focusedInput = findFocusedTextInput();
  if (!focusedInput) return;

  const props = focusedInput.node.props as TextInputProps;
  const editState = getTextInputEditState(props);
  const nextState = insertChar(editState, text);
  commitTextInputEdit(props, editState, nextState);
}

function blurFocusedElement(reason: FocusChangeReason = "escape"): boolean {
  const current = findFocusedElement();
  if (!current) return false;

  changeFocus(null, reason);
  cel.render();
  return true;
}

function handleKeyEvent(event: KeyInput): void {
  const { key, text } = event;
  const isRelease = event.eventType === "release";

  // --- Focus traversal keys ---

  // Tab / Shift+Tab: cycle through focusable elements
  // Skip focus traversal when a TextInput is focused — Tab is an editing key
  // that inserts \t. The user must Escape first, then Tab to traverse.
  if (!isRelease && (key === "tab" || key === "shift+tab")) {
    const focusedTI = findFocusedTextInput();
    if (focusedTI) {
      // Fall through to TextInput key routing below
    } else {
      const context = topLayerContext();
      if (!context) return;
      const focusables = collectFocusable(context.root);
      if (focusables.length === 0) return;

      const current = findFocusedElement();
      let currentIdx = current ? focusables.indexOf(current) : -1;

      // If current not found in focusables list, search by identity
      if (currentIdx === -1 && current) {
        currentIdx = focusables.findIndex((f) => f.node === current.node);
      }

      // Continue from the last focused identity after Escape. Keyed refs
      // survive sibling reordering; the legacy fallback remains positional.
      if (currentIdx === -1) {
        const previous = resolveFocusRef(context.focus.last, focusables);
        if (previous) currentIdx = focusables.indexOf(previous);
      }

      let nextIdx: number;
      if (key === "tab") {
        nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % focusables.length;
      } else {
        nextIdx =
          currentIdx === -1
            ? focusables.length - 1
            : (currentIdx - 1 + focusables.length) % focusables.length;
      }

      changeFocus(
        requiredAt(focusables, nextIdx, "focusable node"),
        key === "tab" ? "tab" : "shift+tab",
      );
      cel.render();
      return;
    } // end: not a focused TextInput
  }

  // Enter: activate focused clickable container
  if (!isRelease && key === "enter") {
    const current = findFocusedElement();
    if (current && current.node.type !== "textinput") {
      const props = current.node.type !== "text" ? current.node.props : null;
      if (props?.onClick) {
        props.onClick();
        cel.render();
        return;
      }
    }
  }

  // --- TextInput key routing ---
  const focusedInput = findFocusedTextInput();

  if (focusedInput) {
    const props = focusedInput.node.props as TextInputProps;

    // onKeyPress fires before editing — return false prevents the default action
    if (props.onKeyPress) {
      const result = props.onKeyPress(key, event);
      if (result === false) {
        cel.render();
        return;
      }
    }

    let newState: EditState | null = null;
    const editState = getTextInputEditState(props);
    const isTextInputEditingKey =
      !isRelease && text === undefined && isEditingKey(key);

    if (!isRelease && text !== undefined) {
      newState = insertChar(editState, text);
    } else if (isTextInputEditingKey) {
      switch (key) {
        case "backspace":
          newState = deleteBackward(editState);
          break;
        case "delete":
          newState = deleteForward(editState);
          break;
        case "ctrl+w":
          newState = deleteWordBackward(editState);
          break;
        case "alt+d":
          newState = deleteWordForward(editState);
          break;
        case "left":
        case "right":
        case "up":
        case "down":
        case "home":
        case "end":
        case "ctrl+a":
        case "ctrl+e":
          {
            const tiPadX =
              (focusedInput.node as TextInputNode).props.padding?.x ?? 0;
            const contentWidth = Math.max(
              0,
              focusedInput.rect.width - tiPadX * 2,
            );
            const direction =
              key === "ctrl+a" ? "home" : key === "ctrl+e" ? "end" : key;
            newState = moveCursor(
              editState,
              direction as "left" | "right" | "up" | "down" | "home" | "end",
              contentWidth,
            );
          }
          break;
        case "alt+b":
        case "ctrl+left":
          newState = moveCursorByWord(editState, "backward");
          break;
        case "alt+f":
        case "ctrl+right":
          newState = moveCursorByWord(editState, "forward");
          break;
        case "enter":
        case "shift+enter":
          newState = insertChar(editState, "\n");
          break;
        case "tab":
          newState = insertChar(editState, "\t");
          break;
        case "space":
          newState = insertChar(editState, " ");
          break;
        case "plus":
          newState = insertChar(editState, "+");
          break;
      }
    }

    if (newState && newState !== editState) {
      commitTextInputEdit(props, editState, newState);
      return;
    }

    // Editing keys belong to the focused TextInput even when the requested
    // operation is a boundary no-op (for example, Backspace at offset 0).
    if (isTextInputEditingKey) return;
  }

  // Key not consumed by TextInput — bubble up from focused element
  const focused = findFocusedElement();
  if (focused) {
    for (let i = currentLayouts.length - 1; i >= 0; i--) {
      const path = findPathTo(
        requiredAt(currentLayouts, i, "layout root"),
        focused,
      );
      if (path) {
        let handlers = collectKeyPressHandlers(path);
        // If a TextInput's onKeyPress was already called in the pre-editing
        // hook above, exclude it from bubbling to avoid calling it twice.
        if (
          focusedInput &&
          handlers.length > 0 &&
          requiredAt(handlers, 0, "key handler").layoutNode === focusedInput
        ) {
          handlers = handlers.slice(1);
        }
        if (handlers.length > 0) {
          let consumed = false;
          for (const h of handlers) {
            const result = h.handler(key, event);
            if (result !== false) {
              consumed = true;
              break;
            }
            // result === false → key not consumed, keep bubbling
          }
          // Always return — the key was offered to every handler in the
          // focused element's path (including root). Even if all returned
          // false, we don't retry via the top-layer fallback path.
          if (consumed) {
            cel.render();
            return;
          }
          if (!isRelease && key === "escape" && blurFocusedElement()) return;
          return;
        }

        // The focused path already includes the top-layer root. Do not retry
        // the fallback path after excluding a TextInput's pre-edit handler.
        if (!isRelease && key === "escape" && blurFocusedElement()) return;
        return;
      }
    }
  }

  // Fallback: offer the key to the topmost layer's root when it was not
  // already handled on the focused path.
  const topLayer = currentLayouts[currentLayouts.length - 1];
  if (!topLayer) {
    if (key === "escape") blurFocusedElement();
    return;
  }

  const handlers = collectKeyPressHandlers([topLayer]);
  if (handlers.length > 0) {
    let consumed = false;
    for (const h of handlers) {
      const result = h.handler(key, event);
      if (result !== false) {
        consumed = true;
        break;
      }
    }
    if (consumed) {
      cel.render();
      return;
    }
  }

  if (!isRelease && key === "escape" && blurFocusedElement()) return;
  if (handlers.length === 0) return;
  cel.render();
}

/**
 * Build the path from root to a target node (depth-first search).
 * Returns the path array [root, ..., target] or null if not found.
 */
function findPathTo(root: LayoutNode, target: LayoutNode): LayoutNode[] | null {
  if (root === target || root.node === target.node) return [root];
  for (const child of root.children) {
    const childPath = findPathTo(child, target);
    if (childPath) return [root, ...childPath];
  }
  return null;
}

function findFocusedTextInput(): LayoutNode | null {
  const focused = findFocusedElement();
  return focused && focused.node.type === "textinput" ? focused : null;
}

function findFocusedInTree(ln: LayoutNode): LayoutNode | null {
  if (ln.node.type === "textinput" && ln.node.props.focused) {
    return ln;
  }
  if (
    (ln.node.type === "vstack" || ln.node.type === "hstack") &&
    ln.node.props.focused
  ) {
    return ln;
  }
  for (const child of ln.children) {
    const found = findFocusedInTree(child);
    if (found) return found;
  }
  return null;
}

// --- Public API ---

/**
 * cel-tui framework entrypoint.
 *
 * The framework is stateless — it renders whatever tree the render function
 * returns. State management is fully external. Use any approach you like
 * (plain variables, classes, libraries) and call {@link cel.render} when
 * state changes.
 *
 * @example
 * ```ts
 * import { cel, VStack, Text, ProcessTerminal } from "@cel-tui/core";
 *
 * cel.init(new ProcessTerminal());
 * cel.viewport(() =>
 *   VStack({ height: "100%" }, [
 *     Text("Hello, world!", { bold: true }),
 *   ])
 * );
 * ```
 */
export const cel = {
  /**
   * Initialize the framework with a terminal implementation.
   * Must be called before {@link cel.viewport}.
   *
   * Enables Kitty baseline disambiguation and any requested progressive
   * enhancements, plus bracketed paste and mouse tracking via the terminal.
   *
   * @param term - Terminal to render to (ProcessTerminal or MockTerminal).
   * @param options - Optional configuration.
   * @param options.theme - Color theme mapping. Defaults to the ANSI 16 theme.
   * @param options.kittyKeyboard - Advanced Kitty keyboard reporting flags.
   */
  init(term: Terminal, options?: CelInitOptions): void {
    terminal = term;
    activeTheme = options?.theme ?? defaultTheme;
    layerFocusStates.clear();
    resetTextInputState();
    lastTerminalCursor = { visible: false };
    lastTerminalTitle = null;
    fullRedrawScheduled = false;
    terminal.start(
      handleInput,
      () => cel.render(),
      options?.kittyKeyboard
        ? { kittyKeyboard: options.kittyKeyboard }
        : undefined,
    );
  },

  /**
   * Set the render function that returns the UI tree.
   * Triggers the first render automatically.
   *
   * @param fn - A function that returns the current UI tree.
   */
  viewport(fn: RenderFn): void {
    renderFn = fn;
    cel.render();
  },

  /**
   * Request a re-render. Call this after state changes.
   *
   * Batched via `process.nextTick()` — multiple calls within the same
   * tick produce a single render.
   */
  render(): void {
    if (renderScheduled) return;
    renderScheduled = true;
    process.nextTick(() => {
      try {
        doRender();
      } finally {
        resolveRenderWaiters();
      }
    });
  },

  /**
   * Request a full redraw of the current viewport.
   *
   * Unlike {@link cel.render}, this discards the differential baseline and
   * re-emits every cell. Use it after external screen corruption or terminal
   * resume. Calls remain batched within the current tick.
   */
  redraw(): void {
    fullRedrawScheduled = true;
    cel.render();
  },

  /**
   * Replace the active color theme at runtime and redraw every cell.
   *
   * A full redraw is required because cell buffers store palette slots, so a
   * normal logical diff cannot observe that a slot's rendered color changed.
   */
  setTheme(theme: Theme): void {
    activeTheme = theme;
    cel.redraw();
  },

  /**
   * Set the terminal window or tab title.
   *
   * This is an imperative side effect, not part of the render tree.
   * Control characters are stripped from the title before writing the
   * terminal sequence. Best effort only — some hosts may ignore it.
   */
  setTitle(title: string): void {
    if (!terminal) return;
    const sanitized = sanitizeTerminalTitle(title);
    if (sanitized === lastTerminalTitle) return;
    terminal.write(`\x1b]2;${sanitized}\x1b\\`);
    lastTerminalTitle = sanitized;
  },

  /**
   * Stop the framework and restore terminal state.
   *
   * Pops the Kitty keyboard protocol mode, disables bracketed paste and mouse
   * tracking, and restores the terminal to its previous state.
   */
  stop(): void {
    terminal?.stop();
    terminal = null;
    renderFn = null;
    prevBuffer = null;
    currentBuffer = null;
    currentLayouts = [];
    renderScheduled = false;
    resolveRenderWaiters();
    fullRedrawScheduled = false;
    layerFocusStates.clear();
    stampedNode = null;
    uncontrolledScrollOffsets.clear();
    resetTextInputState();
    stampedScrollNodes = [];
    clearPendingEscapeTimer();
    pendingKeyData = "";
    inBracketedPaste = false;
    bracketedPasteData = "";
    bracketedPasteSuffix = "";
    lastTerminalCursor = { visible: false };
    lastTerminalTitle = null;
    activeTheme = defaultTheme;
  },

  /** @internal */
  _getBuffer(): CellBuffer | null {
    return currentBuffer;
  },

  /** Resolve after the currently scheduled render finishes. @internal */
  _flush(): Promise<void> {
    if (!renderScheduled) return Promise.resolve();
    return new Promise((resolve) => renderWaiters.push(resolve));
  },
} satisfies CelTestRuntime as Cel;
