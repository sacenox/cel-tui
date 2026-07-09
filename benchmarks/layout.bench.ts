/**
 * Benchmark: layout engine — flexbox sizing and positioning.
 *
 * Measures the cost of computing absolute screen rects for various
 * tree shapes and sizes.
 */

import { bench, group, run } from "mitata";
import { layout } from "../packages/core/src/layout.js";
import {
  appTree,
  flatTree,
  inkComparableTree,
  nestedTree,
  styledTree,
  wrappedTextTree,
} from "./helpers.js";

const W = 120;
const H = 40;

// --- Flat trees (varying child count) ---

group("layout: flat tree", () => {
  const t10 = flatTree(10);
  const t100 = flatTree(100);
  const t1000 = flatTree(1000);

  bench("10 children", () => {
    layout(t10, W, H);
  });

  bench("100 children", () => {
    layout(t100, W, H);
  });

  bench("1000 children", () => {
    layout(t1000, W, H);
  });
});

// --- Nested trees (depth × breadth) ---

group("layout: nested tree", () => {
  const d3b3 = nestedTree(3, 3); // 3^3 = 27 leaves
  const d4b3 = nestedTree(4, 3); // 3^4 = 81 leaves
  const d3b5 = nestedTree(3, 5); // 5^3 = 125 leaves

  bench("depth=3 breadth=3 (40 nodes)", () => {
    layout(d3b3, W, H);
  });

  bench("depth=4 breadth=3 (121 nodes)", () => {
    layout(d4b3, W, H);
  });

  bench("depth=3 breadth=5 (156 nodes)", () => {
    layout(d3b5, W, H);
  });
});

// --- Styled tree (inheritance overhead) ---

group("layout: styled tree", () => {
  const s50 = styledTree(50);
  bench("50 styled groups", () => {
    layout(s50, W, H);
  });
});

// --- Word-wrap text ---

group("layout: word-wrap", () => {
  const w10 = wrappedTextTree(10);
  const w50 = wrappedTextTree(50);

  bench("10 paragraphs", () => {
    layout(w10, W, H);
  });

  bench("50 paragraphs", () => {
    layout(w50, W, H);
  });
});

// --- Ink-comparable tree ---

group("layout: ink-comparable", () => {
  const tree = inkComparableTree();
  bench("styled flex + word-wrap", () => {
    layout(tree, 80, 24);
  });
});

// --- App-like tree ---

group("layout: app tree", () => {
  const a20 = appTree(20);
  const a100 = appTree(100);

  bench("20 messages", () => {
    layout(a20, W, H);
  });

  bench("100 messages", () => {
    layout(a100, W, H);
  });
});

await run();
