/**
 * Benchmark: end-to-end render pipeline.
 *
 * Tree construction → layout → paint → emit.
 * This is the headline number — how fast can we go from state change
 * to terminal output?
 *
 * Also includes the Ink-comparable scenario (same tree shape as Ink's
 * benchmark/simple) for direct comparison.
 */

import { bench, group, run } from "mitata";
import { CellBuffer, emitBuffer } from "@cel-tui/core";
import { emitDiff } from "../packages/core/src/emitter.js";
import { layout } from "../packages/core/src/layout.js";
import { paint } from "../packages/core/src/paint.js";
import { flatTree, inkComparableTree, appTree } from "./helpers.js";

// --- Full pipeline: tree → layout → paint → emit ---

group("e2e: full pipeline", () => {
  bench("ink-comparable (80×24)", () => {
    const tree = inkComparableTree();
    const l = layout(tree, 80, 24);
    const buf = new CellBuffer(80, 24);
    paint(l, buf);
    emitBuffer(buf);
  });

  bench("app tree 20 msgs (120×40)", () => {
    const tree = appTree(20);
    const l = layout(tree, 120, 40);
    const buf = new CellBuffer(120, 40);
    paint(l, buf);
    emitBuffer(buf);
  });

  bench("flat 100 lines (80×24)", () => {
    const tree = flatTree(100);
    const l = layout(tree, 80, 24);
    const buf = new CellBuffer(80, 24);
    paint(l, buf);
    emitBuffer(buf);
  });
});

// --- Re-render with diff (the common case) ---

group("e2e: re-render with diff", () => {
  // Simulate: first render, then re-render identical tree (no changes)
  const tree = inkComparableTree();
  const l = layout(tree, 80, 24);
  const prevBuf = new CellBuffer(80, 24);
  paint(l, prevBuf);

  bench("ink-comparable no-change diff", () => {
    const tree2 = inkComparableTree();
    const l2 = layout(tree2, 80, 24);
    const buf = new CellBuffer(80, 24);
    paint(l2, buf);
    emitDiff(prevBuf, buf);
  });
});

group("e2e: re-render with partial change", () => {
  const tree1 = appTree(20);
  const l1 = layout(tree1, 120, 40);
  const prevBuf = new CellBuffer(120, 40);
  paint(l1, prevBuf);

  bench("app tree +1 message diff", () => {
    const tree2 = appTree(21);
    const l2 = layout(tree2, 120, 40);
    const buf = new CellBuffer(120, 40);
    paint(l2, buf);
    emitDiff(prevBuf, buf);
  });
});

// --- Ink comparison: 100k re-renders ---
// Ink's benchmark does 100,000 rerender() calls of the same tree.
// We measure a single re-render and also the total for 100k.

group("e2e: ink comparison — re-render throughput", () => {
  bench("single re-render (ink-comparable tree)", () => {
    const tree = inkComparableTree();
    const l = layout(tree, 80, 24);
    const buf = new CellBuffer(80, 24);
    paint(l, buf);
    emitBuffer(buf);
  });

  // Measure 1000 iterations as a batch to get a total time
  bench("1000 re-renders (ink-comparable tree)", () => {
    for (let i = 0; i < 1000; i++) {
      const tree = inkComparableTree();
      const l = layout(tree, 80, 24);
      const buf = new CellBuffer(80, 24);
      paint(l, buf);
      emitBuffer(buf);
    }
  });
});

await run();
