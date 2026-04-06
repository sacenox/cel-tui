import type { Node, Theme } from "@cel-tui/types";
import { CellBuffer } from "./cell-buffer.js";
import { emitBuffer, emitDiff, defaultTheme } from "./emitter.js";
import {
  hitTest,
  findClickHandler,
  findScrollTarget,
  collectKeyPressHandlers,
  collectFocusable,
} from "./hit-test.js";
import { parseKey, isEditingKey } from "./keys.js";
import { layout, type LayoutNode } from "./layout.js";
import {
  paint,
  getTextInputCursor,
  setTextInputCursor,
  getTextInputScroll,
  setTextInputScroll,
  getTextInputCursorScreenPos,
} from "./paint.js";
import {
  insertChar,
  deleteBackward,
  deleteForward,
  moveCursor,
  type EditState,
} from "./text-edit.js";
import type { Terminal } from "./terminal.js";
import { getMaxScrollOffset } from "./scroll.js";

type RenderFn = () => Node | Node[];

let terminal: Terminal | null = null;
let activeTheme: Theme = defaultTheme;
let renderFn: RenderFn | null = null;
let renderScheduled = false;
let prevBuffer: CellBuffer | null = null;
let currentBuffer: CellBuffer | null = null;
let currentLayouts: LayoutNode[] = [];
let lastFocusedIndex = -1;

/**
 * Framework-tracked focus index for uncontrolled focus.
 * Points into the `collectFocusable()` list of the topmost layer.
 * -1 means no uncontrolled element is focused.
 */
let frameworkFocusIndex = -1;

/** The node whose props were stamped with `focused: true` during the last paint. */
let stampedNode: LayoutNode | null = null;

/**
 * Uncontrolled scroll offsets, keyed by structural tree path.
 * The path is a string like "0/2/1" representing the DFS child indices
 * from the layer root to the scrollable container. This survives re-renders
 * because the structural position is the same even with new props objects.
 */
const uncontrolledScrollOffsets = new Map<string, number>();

/** Nodes whose props were stamped with scrollOffset during the last paint. */
let stampedScrollNodes: { node: Node; key: string }[] = [];

function doRender(): void {
  renderScheduled = false;
  if (!renderFn || !terminal) return;

  const width = terminal.columns;
  const height = terminal.rows;

  // Create or resize buffer
  const isResize =
    currentBuffer !== null &&
    (currentBuffer.width !== width || currentBuffer.height !== height);
  const isFirstRender = currentBuffer === null;

  if (isFirstRender || isResize) {
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

  // Stamp uncontrolled focus and scroll before painting
  stampUncontrolledFocus();
  stampUncontrolledScroll();

  // Paint each layer into the buffer
  for (const layoutTree of currentLayouts) {
    paint(layoutTree, currentBuffer);
  }

  // Unstamp after paint so input handlers see clean props
  unstampUncontrolledFocus();
  unstampUncontrolledScroll();

  // Emit to terminal — differential when possible
  if (prevBuffer) {
    const output = emitDiff(prevBuffer, currentBuffer, activeTheme);
    if (output.length > 0) terminal.write(output);
  } else {
    const output = emitBuffer(currentBuffer, activeTheme);
    terminal.write(output);
  }

  // Position the native terminal cursor at the focused TextInput's cursor.
  // This gives us a blinking cursor for free (terminal-managed blink).
  positionTerminalCursor();
}

/**
 * After each render, show the native terminal cursor at the focused
 * TextInput's cursor position (gives blinking for free). When no
 * TextInput is focused, hide the cursor.
 */
function positionTerminalCursor(): void {
  if (!terminal) return;

  // Find focused TextInput in the layout tree (check stamped state during
  // render — we need to check controlled focus in the current layouts)
  const focusedTI = findFocusedTextInputLayout();
  if (focusedTI) {
    const props = focusedTI.node
      .props as import("@cel-tui/types").TextInputProps;
    const pos = getTextInputCursorScreenPos(props, focusedTI.rect);
    if (pos) {
      // CUP: move cursor to (row, col) — 1-indexed
      terminal.write(`\x1b[${pos.y + 1};${pos.x + 1}H`);
      terminal.showCursor();
      return;
    }
  }
  terminal.hideCursor();
}

/**
 * Find the focused TextInput in the current layout tree.
 * Checks controlled focus (props.focused) and uncontrolled
 * (framework-tracked index). Returns the LayoutNode or null.
 */
function findFocusedTextInputLayout(): LayoutNode | null {
  // Check controlled focus: scan all layers for TextInput with focused: true
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    const found = findFocusedTIInTree(currentLayouts[i]!);
    if (found) return found;
  }
  // Check uncontrolled focus
  if (frameworkFocusIndex >= 0) {
    const topLayer = currentLayouts[currentLayouts.length - 1];
    if (topLayer) {
      const focusables = collectFocusable(topLayer);
      if (frameworkFocusIndex < focusables.length) {
        const target = focusables[frameworkFocusIndex]!;
        if (target.node.type === "textinput") return target;
      }
    }
  }
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

// --- Input handling ---

// Regex for a single SGR mouse event (non-anchored, for scanning batched input)
const SGR_MOUSE_RE = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

// Tracks accumulated scroll offsets during a batch of mouse events.
// Controlled scroll reads scrollOffset from props, which doesn't update until
// re-render. Within a single data chunk containing multiple scroll events, we
// need to remember the offset we already dispatched via onScroll.
let batchScrollOffsets: Map<object, number> | null = null;

function handleInput(data: string): void {
  // Terminals may batch multiple mouse events into one data chunk.
  // Scan for all SGR mouse sequences and handle each one.
  SGR_MOUSE_RE.lastIndex = 0;
  let match = SGR_MOUSE_RE.exec(data);
  if (match) {
    batchScrollOffsets = new Map();
    while (match) {
      const mouse = parseSgrMatch(match);
      if (mouse) handleMouseEvent(mouse);
      match = SGR_MOUSE_RE.exec(data);
    }
    batchScrollOffsets = null;
    return;
  }

  // Keyboard input
  const key = parseKey(data);
  handleKeyEvent(key, data);
}

interface MouseEvent {
  type: "click" | "scroll-up" | "scroll-down";
  x: number;
  y: number;
}

/**
 * Parse a single SGR mouse event from a RegExp match.
 * Returns a MouseEvent for scroll and click events, null for unhandled buttons.
 */
function parseSgrMatch(match: RegExpExecArray): MouseEvent | null {
  const cb = parseInt(match[1]!, 10);
  const x = parseInt(match[2]!, 10) - 1; // 1-indexed → 0-indexed
  const y = parseInt(match[3]!, 10) - 1;
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
 * Find the currently focused element across all layers.
 * Checks controlled focus (`focused: true` in props) first,
 * then falls back to framework-tracked uncontrolled focus.
 */
function findFocusedElement(): LayoutNode | null {
  // Controlled: scan tree for focused: true
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    const found = findFocusedInTree(currentLayouts[i]!);
    if (found) return found;
  }
  // Uncontrolled: check framework-tracked index
  if (frameworkFocusIndex >= 0) {
    const topLayer = currentLayouts[currentLayouts.length - 1];
    if (topLayer) {
      const focusables = collectFocusable(topLayer);
      if (frameworkFocusIndex < focusables.length) {
        return focusables[frameworkFocusIndex]!;
      }
    }
    // Index out of bounds (tree changed) — clear
    frameworkFocusIndex = -1;
  }
  return null;
}

/**
 * Stamp `focused: true` on the framework-tracked focused node's props
 * before painting, so that paint/focusStyle/cursor rendering picks it up.
 * Only stamps if no controlled element is already focused.
 * Must be followed by {@link unstampUncontrolledFocus} after paint.
 */
function stampUncontrolledFocus(): void {
  stampedNode = null;
  if (frameworkFocusIndex < 0) return;

  // Don't stamp if a controlled element owns focus
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    if (findFocusedInTree(currentLayouts[i]!)) {
      frameworkFocusIndex = -1;
      return;
    }
  }

  const topLayer = currentLayouts[currentLayouts.length - 1];
  if (!topLayer) return;
  const focusables = collectFocusable(topLayer);
  if (frameworkFocusIndex >= focusables.length) {
    frameworkFocusIndex = -1;
    return;
  }
  const target = focusables[frameworkFocusIndex]!;
  const node = target.node;
  if (
    node.type === "textinput" ||
    node.type === "vstack" ||
    node.type === "hstack"
  ) {
    (node.props as any).focused = true;
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
    delete (node.props as any).focused;
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
    const sub = computeTreePath(root.children[i]!, target);
    if (sub !== null) return sub === "" ? String(i) : `${i}/${sub}`;
  }
  return null;
}

/**
 * Get the full path key for a scrollable node, prefixed by layer index.
 */
function getScrollPathKey(target: LayoutNode): string | null {
  for (let i = 0; i < currentLayouts.length; i++) {
    const path = computeTreePath(currentLayouts[i]!, target);
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
    walkAndStampScroll(currentLayouts[i]!, `L${i}:`);
  }
}

function walkAndStampScroll(ln: LayoutNode, pathKey: string): void {
  const node = ln.node;
  if (node.type === "vstack" || node.type === "hstack") {
    if (
      node.props.overflow === "scroll" &&
      node.props.scrollOffset === undefined &&
      !node.props.onScroll
    ) {
      const offset = uncontrolledScrollOffsets.get(pathKey);
      if (offset !== undefined && offset !== 0) {
        (node.props as any).scrollOffset = offset;
        stampedScrollNodes.push({ node, key: pathKey });
      }
    }
  }
  for (let i = 0; i < ln.children.length; i++) {
    // Keys match getScrollPathKey format: "L0:" for root, "L0:2" for child 2, "L0:2/1" for grandchild
    const childKey = pathKey.endsWith(":")
      ? `${pathKey}${i}`
      : `${pathKey}/${i}`;
    walkAndStampScroll(ln.children[i]!, childKey);
  }
}

function unstampUncontrolledScroll(): void {
  for (const { node } of stampedScrollNodes) {
    if (node.type === "vstack" || node.type === "hstack") {
      delete (node.props as any).scrollOffset;
    }
  }
  stampedScrollNodes = [];
}

/**
 * Blur the currently focused element and focus a new one.
 * Manages both controlled (via onFocus/onBlur callbacks) and
 * uncontrolled (via frameworkFocusIndex) focus.
 */
function changeFocus(target: LayoutNode | null): void {
  const current = findFocusedElement();

  // Blur current — save position for Tab/Shift+Tab continuity
  if (current && current !== target) {
    const topLayer = currentLayouts[currentLayouts.length - 1];
    if (topLayer) {
      const focusables = collectFocusable(topLayer);
      let idx = focusables.indexOf(current);
      if (idx === -1)
        idx = focusables.findIndex((f) => f.node === current.node);
      lastFocusedIndex = idx;
    }
    // Always clear framework tracking on blur
    frameworkFocusIndex = -1;
    const props =
      current.node.type === "textinput"
        ? current.node.props
        : current.node.type !== "text"
          ? current.node.props
          : null;
    if (props && "onBlur" in props && props.onBlur) {
      props.onBlur();
    }
  }

  // Focus new target — clear saved position
  if (target && target !== current) {
    lastFocusedIndex = -1;
    // Set or clear framework tracking based on controlled/uncontrolled
    if (!isControlledFocus(target)) {
      const topLayer = currentLayouts[currentLayouts.length - 1];
      if (topLayer) {
        const focusables = collectFocusable(topLayer);
        frameworkFocusIndex = focusables.indexOf(target);
      }
    } else {
      frameworkFocusIndex = -1;
    }
    const props =
      target.node.type === "textinput"
        ? target.node.props
        : target.node.type !== "text"
          ? target.node.props
          : null;
    if (props && "onFocus" in props && props.onFocus) {
      props.onFocus();
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
  const props = node.props;
  if ((props as any).scrollOffset !== undefined)
    return (props as any).scrollOffset;
  // Check uncontrolled map
  const pathKey = getScrollPathKey(ln);
  if (pathKey !== null) {
    return uncontrolledScrollOffsets.get(pathKey) ?? 0;
  }
  return 0;
}

function handleMouseEvent(event: MouseEvent): void {
  // Hit test on topmost layer first
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    const layoutRoot = currentLayouts[i]!;
    const path = hitTest(layoutRoot, event.x, event.y, resolveScrollOffset);
    if (path.length === 0) continue;

    if (event.type === "click") {
      // Find and focus the focusable element at click position
      const focusable = findClickFocusTarget(path);
      if (focusable) {
        changeFocus(focusable);
      }

      const click = findClickHandler(path);
      if (click) {
        click.handler();
      }
      cel.render();
      return;
    }

    if (event.type === "scroll-up" || event.type === "scroll-down") {
      const target = findScrollTarget(path);
      if (target) {
        const delta = event.type === "scroll-up" ? -1 : 1;
        const maxOffset = getMaxScrollOffset(target);

        if (target.node.type === "textinput") {
          // TextInput scroll is always framework-managed
          const tiProps = target.node.props;
          const current = getTextInputScroll(tiProps);
          const clamped = Math.max(0, Math.min(maxOffset, current + delta));
          setTextInputScroll(tiProps, clamped);
          cel.render();
        } else {
          const props = target.node.type !== "text" ? target.node.props : null;
          if (props && (props as any).overflow === "scroll") {
            if (props.onScroll) {
              // Controlled scroll: notify app.
              // Use batch accumulator if available (multiple events in one chunk),
              // otherwise read from props. Clamp to maxOffset first so that
              // Infinity (sticky-bottom) resolves to a finite value before
              // applying the delta — otherwise Infinity + (-1) = Infinity
              // and scrolling up never unsticks.
              const rawBase =
                batchScrollOffsets?.get(props) ??
                (props as any).scrollOffset ??
                0;
              const baseOffset = Math.min(rawBase, maxOffset);
              const newOffset = Math.max(
                0,
                Math.min(maxOffset, baseOffset + delta),
              );
              batchScrollOffsets?.set(props, newOffset);
              props.onScroll(newOffset, maxOffset);
            } else {
              // Uncontrolled scroll: framework manages state via path key
              const pathKey = getScrollPathKey(target);
              if (pathKey !== null) {
                const current = uncontrolledScrollOffsets.get(pathKey) ?? 0;
                const clamped = Math.max(
                  0,
                  Math.min(maxOffset, current + delta),
                );
                uncontrolledScrollOffsets.set(pathKey, clamped);
              }
            }
            cel.render();
          }
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
    const node = path[i]!.node;
    if (node.type === "textinput") return path[i]!;
    if (node.type === "vstack" || node.type === "hstack") {
      const isFocusable =
        node.props.focusable === true ||
        (node.props.onClick != null && node.props.focusable !== false);
      if (isFocusable) return path[i]!;
    }
  }
  return null;
}

function handleKeyEvent(key: string, rawData?: string): void {
  // --- Focus traversal keys ---

  // Tab / Shift+Tab: cycle through focusable elements
  // Skip focus traversal when a TextInput is focused — Tab is an editing key
  // that inserts \t. The user must Escape first, then Tab to traverse.
  if (key === "tab" || key === "shift+tab") {
    const focusedTI = findFocusedTextInput();
    if (focusedTI) {
      // Fall through to TextInput key routing below
    } else {
      const topLayer = currentLayouts[currentLayouts.length - 1];
      if (!topLayer) return;
      const focusables = collectFocusable(topLayer);
      if (focusables.length === 0) return;

      const current = findFocusedElement();
      let currentIdx = current ? focusables.indexOf(current) : -1;

      // If current not found in focusables list, search by identity
      if (currentIdx === -1 && current) {
        currentIdx = focusables.findIndex((f) => f.node === current.node);
      }

      // If still not found, use the last focused element's position
      // so Tab/Shift+Tab continues from where focus was lost (e.g. after Escape)
      if (
        currentIdx === -1 &&
        lastFocusedIndex >= 0 &&
        lastFocusedIndex < focusables.length
      ) {
        currentIdx = lastFocusedIndex;
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

      changeFocus(focusables[nextIdx]!);
      cel.render();
      return;
    } // end: not a focused TextInput
  }

  // Escape: unfocus current element
  if (key === "escape") {
    const current = findFocusedElement();
    if (current) {
      changeFocus(null);
      cel.render();
      return;
    }
  }

  // Enter: activate focused clickable container
  if (key === "enter") {
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
  // Find the focused TextInput (if any) to route editing keys
  const focusedInput = findFocusedTextInput();

  if (focusedInput) {
    const props = focusedInput.node
      .props as import("@cel-tui/types").TextInputProps;

    // onKeyPress fires before editing — return false prevents the default action
    if (props.onKeyPress) {
      const result = props.onKeyPress(key);
      if (result === false) {
        cel.render();
        return;
      }
    }

    // Editing keys are consumed by TextInput
    if (isEditingKey(key)) {
      const cursor = getTextInputCursor(props);
      const editState: EditState = { value: props.value, cursor };
      let newState: EditState | null = null;

      switch (key) {
        case "backspace":
          newState = deleteBackward(editState);
          break;
        case "delete":
          newState = deleteForward(editState);
          break;
        case "left":
        case "right":
        case "up":
        case "down":
        case "home":
        case "end":
          {
            const tiPadX =
              (focusedInput.node as import("@cel-tui/types").TextInputNode)
                .props.padding?.x ?? 0;
            const contentWidth = Math.max(
              0,
              focusedInput.rect.width - tiPadX * 2,
            );
            newState = moveCursor(
              editState,
              key as "left" | "right" | "up" | "down" | "home" | "end",
              contentWidth,
            );
          }
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
        default:
          // Single printable character — use raw data to preserve case
          if (key.length === 1 && rawData && rawData.length === 1) {
            newState = insertChar(editState, rawData);
          } else if (key.length === 1) {
            newState = insertChar(editState, key);
          }
          break;
      }

      if (newState && newState !== editState) {
        setTextInputCursor(props, newState.cursor);
        if (newState.value !== editState.value) {
          props.onChange(newState.value);
        }
        cel.render();
        return;
      }
    }
  }

  // Key not consumed by TextInput — bubble up from focused element
  const focused = findFocusedElement();
  if (focused) {
    for (let i = currentLayouts.length - 1; i >= 0; i--) {
      const path = findPathTo(currentLayouts[i]!, focused);
      if (path) {
        let handlers = collectKeyPressHandlers(path);
        // If a TextInput's onKeyPress was already called in the pre-editing
        // hook above, exclude it from bubbling to avoid calling it twice.
        if (
          focusedInput &&
          handlers.length > 0 &&
          handlers[0]!.layoutNode === focusedInput
        ) {
          handlers = handlers.slice(1);
        }
        if (handlers.length > 0) {
          let consumed = false;
          for (const h of handlers) {
            const result = h.handler(key);
            if (result !== false) {
              consumed = true;
              break;
            }
            // result === false → key not consumed, keep bubbling
          }
          // Always return — the key was offered to every handler in the
          // focused element's path (including root). Even if all returned
          // false, we don't retry via the unfocused fallback path.
          if (consumed) cel.render();
          return;
        }
      }
    }
  }

  // No focused element — try root onKeyPress on topmost layer
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    const layoutRoot = currentLayouts[i]!;
    const path = [layoutRoot];
    const handlers = collectKeyPressHandlers(path);
    if (handlers.length > 0) {
      for (const h of handlers) {
        const result = h.handler(key);
        if (result !== false) break;
      }
      cel.render();
      return;
    }
  }
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
   * Enables the Kitty keyboard protocol (level 1) via the terminal,
   * enters raw mode, and starts mouse tracking.
   *
   * @param term - Terminal to render to (ProcessTerminal or MockTerminal).
   * @param options - Optional configuration.
   * @param options.theme - Color theme mapping. Defaults to the ANSI 16 theme.
   */
  init(term: Terminal, options?: { theme?: Theme }): void {
    terminal = term;
    activeTheme = options?.theme ?? defaultTheme;
    terminal.start(handleInput, () => cel.render());
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
    process.nextTick(doRender);
  },

  /**
   * Stop the framework and restore terminal state.
   *
   * Pops the Kitty keyboard protocol mode, disables mouse tracking,
   * and restores the terminal to its previous state.
   */
  stop(): void {
    terminal?.stop();
    terminal = null;
    renderFn = null;
    prevBuffer = null;
    currentBuffer = null;
    currentLayouts = [];
    renderScheduled = false;
    lastFocusedIndex = -1;
    frameworkFocusIndex = -1;
    stampedNode = null;
    uncontrolledScrollOffsets.clear();
    stampedScrollNodes = [];
    activeTheme = defaultTheme;
  },

  /** @internal */
  _getBuffer(): CellBuffer | null {
    return currentBuffer;
  },
};
