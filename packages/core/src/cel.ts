import type { Node } from "@cel-tui/types";
import { CellBuffer } from "./cell-buffer.js";
import { emitBuffer } from "./emitter.js";
import { layout } from "./layout.js";
import { paint } from "./paint.js";
import type { Terminal } from "./terminal.js";

type RenderFn = () => Node | Node[];

let terminal: Terminal | null = null;
let renderFn: RenderFn | null = null;
let renderScheduled = false;
let currentBuffer: CellBuffer | null = null;

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
  for (const layer of layers) {
    const layoutTree = layout(layer, width, height);
    paint(layoutTree, currentBuffer);
  }

  // Emit to terminal
  const output = emitBuffer(currentBuffer);
  terminal.write(output);
}

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
    terminal.start(
      (_data) => {
        // TODO: input routing (keys, mouse)
      },
      () => {
        // Terminal resize — trigger re-render
        cel.render();
      },
    );
  },

  /**
   * Set the render function that returns the UI tree.
   * Triggers the first render automatically.
   *
   * The render function is called by the framework whenever a render is
   * needed (after {@link cel.render} is called, or on terminal resize).
   * It should return a single {@link Node} (one layer) or an array of
   * nodes (multiple layers, composited bottom-to-top).
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
   * tick produce a single render. Safe to call from any callback
   * (`onChange`, `onClick`, `onKeyPress`, etc.).
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
    renderScheduled = false;
  },

  /** @internal — exposed for testing. */
  _getBuffer(): CellBuffer | null {
    return currentBuffer;
  },
};
