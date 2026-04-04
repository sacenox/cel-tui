/**
 * Benchmark: paint — writing styled cells into the cell buffer.
 *
 * Measures the cost of painting laid-out trees into a CellBuffer,
 * including text rendering, style inheritance, clipping, and scrollbars.
 */

import { bench, group, run } from "mitata";
import { CellBuffer } from "@cel-tui/core";
import { layout } from "../packages/core/src/layout.js";
import { paint } from "../packages/core/src/paint.js";
import {
  flatTree,
  nestedTree,
  styledTree,
  scrollableTree,
  wrappedTextTree,
  inkComparableTree,
  appTree,
} from "./helpers.js";

const W = 120;
const H = 40;

// --- Flat tree paint ---

group("paint: flat tree", () => {
  const l10 = layout(flatTree(10), W, H);
  const l100 = layout(flatTree(100), W, H);
  const l1000 = layout(flatTree(1000), W, H);

  bench("10 children", () => {
    const buf = new CellBuffer(W, H);
    paint(l10, buf);
  });

  bench("100 children", () => {
    const buf = new CellBuffer(W, H);
    paint(l100, buf);
  });

  bench("1000 children", () => {
    const buf = new CellBuffer(W, H);
    paint(l1000, buf);
  });
});

// --- Nested tree paint ---

group("paint: nested tree", () => {
  const l = layout(nestedTree(4, 3), W, H);
  bench("depth=4 breadth=3 (121 nodes)", () => {
    const buf = new CellBuffer(W, H);
    paint(l, buf);
  });
});

// --- Styled tree (inheritance + bgColor fill) ---

group("paint: styled tree", () => {
  const l = layout(styledTree(50), W, H);
  bench("50 styled groups", () => {
    const buf = new CellBuffer(W, H);
    paint(l, buf);
  });
});

// --- Scrollable (clipping + scrollbar) ---

group("paint: scrollable", () => {
  const l = layout(scrollableTree(200), W, H);
  bench("200 lines scrollable", () => {
    const buf = new CellBuffer(W, H);
    paint(l, buf);
  });
});

// --- Word-wrap ---

group("paint: word-wrap", () => {
  const l = layout(wrappedTextTree(50), W, H);
  bench("50 word-wrapped paragraphs", () => {
    const buf = new CellBuffer(W, H);
    paint(l, buf);
  });
});

// --- Ink-comparable ---

group("paint: ink-comparable", () => {
  const l = layout(inkComparableTree(), 80, 24);
  bench("styled flex + word-wrap", () => {
    const buf = new CellBuffer(80, 24);
    paint(l, buf);
  });
});

// --- App tree ---

group("paint: app tree", () => {
  const l20 = layout(appTree(20), W, H);
  const l100 = layout(appTree(100), W, H);

  bench("20 messages", () => {
    const buf = new CellBuffer(W, H);
    paint(l20, buf);
  });

  bench("100 messages", () => {
    const buf = new CellBuffer(W, H);
    paint(l100, buf);
  });
});

// --- Terminal sizes ---

group("paint: terminal sizes", () => {
  const tree = appTree(50);

  const small = layout(tree, 80, 24);
  const medium = layout(tree, 120, 40);
  const large = layout(tree, 200, 50);

  bench("80×24 (small)", () => {
    const buf = new CellBuffer(80, 24);
    paint(small, buf);
  });

  bench("120×40 (medium)", () => {
    const buf = new CellBuffer(120, 40);
    paint(medium, buf);
  });

  bench("200×50 (large)", () => {
    const buf = new CellBuffer(200, 50);
    paint(large, buf);
  });
});

await run();
