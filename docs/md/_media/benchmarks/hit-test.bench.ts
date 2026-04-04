/**
 * Benchmark: hit testing and focus collection.
 *
 * Measures the cost of spatial lookups used for mouse click/scroll
 * routing and keyboard focus traversal.
 */

import { bench, group, run } from "mitata";
import { layout } from "../packages/core/src/layout.js";
import { hitTest, collectFocusable } from "../packages/core/src/hit-test.js";
import { flatTree, nestedTree, appTree } from "./helpers.js";
import { VStack, HStack, Text } from "@cel-tui/core";
import type { Node } from "@cel-tui/types";

const W = 120;
const H = 40;

// --- hitTest ---

group("hitTest", () => {
  const flatL = layout(flatTree(100), W, H);
  bench("flat tree (100 children), center", () => {
    hitTest(flatL, 60, 20);
  });

  const nestedL = layout(nestedTree(4, 3), W, H);
  bench("nested tree (121 nodes), center", () => {
    hitTest(nestedL, 60, 20);
  });

  const appL = layout(appTree(50), W, H);
  bench("app tree (50 messages), corner", () => {
    hitTest(appL, 0, 0);
  });

  bench("app tree (50 messages), center", () => {
    hitTest(appL, 60, 20);
  });

  bench("app tree (50 messages), miss", () => {
    hitTest(appL, 200, 200);
  });
});

// --- collectFocusable ---

group("collectFocusable", () => {
  // Build a tree with many focusable elements
  const buttons: Node[] = [];
  for (let i = 0; i < 100; i++) {
    buttons.push(HStack({ onClick: () => {} }, [Text(`Button ${i}`)]));
  }
  const focusableTree = VStack({ height: "100%" }, buttons);
  const focusableL = layout(focusableTree, W, H);

  bench("100 focusable buttons", () => {
    collectFocusable(focusableL);
  });

  const appL = layout(appTree(50), W, H);
  bench("app tree (few focusables)", () => {
    collectFocusable(appL);
  });
});

await run();
