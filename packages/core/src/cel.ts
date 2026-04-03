import type { Node } from "@cel-tui/types";
import { CellBuffer } from "./cell-buffer.js";
import { emitBuffer } from "./emitter.js";
import {
  hitTest,
  findClickHandler,
  findScrollTarget,
  findKeyPressHandler,
  collectFocusable,
} from "./hit-test.js";
import { parseKey, isEditingKey, normalizeKey } from "./keys.js";
import { layout, type LayoutNode } from "./layout.js";
import {
  paint,
  getTextInputCursor,
  setTextInputCursor,
  setTextInputScroll,
  getContainerScroll,
  setContainerScroll,
} from "./paint.js";
import {
  insertChar,
  deleteBackward,
  deleteForward,
  moveCursor,
  type EditState,
} from "./text-edit.js";
import type { Terminal } from "./terminal.js";

type RenderFn = () => Node | Node[];

let terminal: Terminal | null = null;
let renderFn: RenderFn | null = null;
let renderScheduled = false;
let currentBuffer: CellBuffer | null = null;
let currentLayouts: LayoutNode[] = [];

function doRender(): void {
  renderScheduled = false;
  if (!renderFn || !terminal) return;

  const width = terminal.columns;
  const height = terminal.rows;

  // Create or resize buffer
  if (
    !currentBuffer ||
    currentBuffer.width !== width ||
    currentBuffer.height !== height
  ) {
    currentBuffer = new CellBuffer(width, height);
  } else {
    currentBuffer.clear();
  }

  // Get the tree from the render function
  const tree = renderFn();
  const layers = Array.isArray(tree) ? tree : [tree];

  // Layout and paint each layer into the buffer
  currentLayouts = [];
  for (const layer of layers) {
    const layoutTree = layout(layer, width, height);
    currentLayouts.push(layoutTree);
    paint(layoutTree, currentBuffer);
  }

  // Emit to terminal
  const output = emitBuffer(currentBuffer);
  terminal.write(output);
}

// --- Input handling ---

function handleInput(data: string): void {
  // Try to parse as mouse event
  const mouse = parseMouseEvent(data);
  if (mouse) {
    handleMouseEvent(mouse);
    return;
  }

  // Keyboard input
  const key = parseKey(data);
  handleKeyEvent(key);
}

interface MouseEvent {
  type: "click" | "scroll-up" | "scroll-down";
  x: number;
  y: number;
}

function parseMouseEvent(data: string): MouseEvent | null {
  // SGR mouse mode: ESC [ < Cb ; Cx ; Cy M (press) or m (release)
  const match = data.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/);
  if (!match) return null;

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

function handleMouseEvent(event: MouseEvent): void {
  // Hit test on topmost layer first
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    const layoutRoot = currentLayouts[i]!;
    const path = hitTest(layoutRoot, event.x, event.y);
    if (path.length === 0) continue;

    if (event.type === "click") {
      const click = findClickHandler(path);
      if (click) {
        click.handler();
        cel.render();
      }
      // Clicking a focusable element — fire onFocus/onBlur via props
      return;
    }

    if (event.type === "scroll-up" || event.type === "scroll-down") {
      const target = findScrollTarget(path);
      if (target) {
        const props = target.node.type !== "text" ? target.node.props : null;
        if (props && "onScroll" in props) {
          const delta = event.type === "scroll-up" ? -1 : 1;
          if (props.onScroll) {
            // Controlled scroll: notify app
            const offset = (props as any).scrollOffset ?? 0;
            props.onScroll(Math.max(0, offset + delta));
          } else {
            // Uncontrolled scroll: framework manages state
            const current = getContainerScroll(props);
            setContainerScroll(props, Math.max(0, current + delta));
          }
          cel.render();
        }
      }
      return;
    }
  }
}

function handleKeyEvent(key: string): void {
  // Find the focused TextInput (if any) to route editing keys
  const focusedInput = findFocusedTextInput();

  if (focusedInput) {
    const props = focusedInput.node
      .props as import("@cel-tui/types").TextInputProps;

    // Check submitKey
    const submitKey = normalizeKey(props.submitKey ?? "enter");
    if (key === submitKey && props.onSubmit) {
      props.onSubmit();
      cel.render();
      return;
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
          newState = moveCursor(
            editState,
            key as "left" | "right" | "up" | "down" | "home" | "end",
            focusedInput.rect.width,
          );
          break;
        case "enter":
          newState = insertChar(editState, "\n");
          break;
        case "tab":
          newState = insertChar(editState, "\t");
          break;
        default:
          // Single printable character
          if (key.length === 1) {
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

  // Key not consumed by TextInput — bubble through layers
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    const layoutRoot = currentLayouts[i]!;
    const path = [layoutRoot];
    const handler = findKeyPressHandler(path);
    if (handler) {
      handler.handler(key);
      cel.render();
      return;
    }
  }
}

function findFocusedTextInput(): LayoutNode | null {
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    const found = findFocusedInTree(currentLayouts[i]!);
    if (found) return found;
  }
  return null;
}

function findFocusedInTree(ln: LayoutNode): LayoutNode | null {
  if (ln.node.type === "textinput" && ln.node.props.focused) {
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
 * import { cel, VStack, Text } from "@cel-tui/core";
 * import { ProcessTerminal } from "@cel-tui/core/terminal";
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
   * @param term - Terminal to render to (ProcessTerminal or MockTerminal).
   */
  init(term: Terminal): void {
    terminal = term;
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
   */
  stop(): void {
    terminal?.stop();
    terminal = null;
    renderFn = null;
    currentBuffer = null;
    currentLayouts = [];
    renderScheduled = false;
  },

  /** @internal */
  _getBuffer(): CellBuffer | null {
    return currentBuffer;
  },
};
