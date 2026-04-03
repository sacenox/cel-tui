import type { Node } from "@cel-tui/types";

type RenderFn = () => Node | Node[];

let renderFn: RenderFn | null = null;
let renderScheduled = false;

function doRender(): void {
  renderScheduled = false;
  if (!renderFn) return;
  const _tree = renderFn();
  // TODO: layout → paint → composite → diff → emit
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
 * let count = 0;
 *
 * cel.viewport(() =>
 *   VStack({ height: "100%" }, [
 *     Text(`Count: ${count}`),
 *     HStack({ onClick: () => { count++; cel.render(); } }, [
 *       Text("[+1]"),
 *     ]),
 *   ])
 * );
 * ```
 */
export const cel = {
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
   *
   * @example
   * // Single layer
   * cel.viewport(() => VStack({ height: "100%" }, [...]))
   *
   * // Multiple layers (modal on top)
   * cel.viewport(() => [
   *   VStack({ height: "100%" }, [...mainUI]),
   *   VStack({ height: "100%" }, [...modalUI]),
   * ])
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
};
