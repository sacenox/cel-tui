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
import { parseKey, isEditingKey } from "./keys.js";
import { layout, type LayoutNode } from "./layout.js";
import { paint } from "./paint.js";
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
        if (props && "onScroll" in props && props.onScroll) {
          const offset = (props as any).scrollOffset ?? 0;
          const delta = event.type === "scroll-up" ? -1 : 1;
          props.onScroll(offset + delta);
          cel.render();
        }
      }
      return;
    }
  }
}

function handleKeyEvent(key: string): void {
  // Tab / Shift+Tab — focus traversal (handled by app via onFocus/onBlur)
  // Escape — unfocus (handled by app)
  // Enter on focused clickable — find and fire onClick

  // For now, route key events through the layout tree:
  // Walk all layers top-to-bottom, find onKeyPress handlers
  for (let i = currentLayouts.length - 1; i >= 0; i--) {
    const layoutRoot = currentLayouts[i]!;

    // Find the first onKeyPress handler in the tree (root acts as global)
    // In a full implementation, this would start from the focused element
    // and bubble up. For now, walk from root.
    const path = [layoutRoot];
    const handler = findKeyPressHandler(path);
    if (handler) {
      handler.handler(key);
      cel.render();
      return;
    }
  }
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
