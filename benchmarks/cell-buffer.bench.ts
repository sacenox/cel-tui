/**
 * Benchmark: CellBuffer — creation, writing, and ANSI emission.
 *
 * Measures the cost of buffer allocation, full ANSI output generation,
 * and differential rendering (the key to fast re-renders).
 */

import { bench, group, run } from "mitata";
import { CellBuffer, emitBuffer } from "@cel-tui/core";
import { emitDiff } from "../packages/core/src/emitter.js";
import { layout } from "../packages/core/src/layout.js";
import { paint } from "../packages/core/src/paint.js";
import { appTree, flatTree, inkComparableTree } from "./helpers.js";

// --- Buffer creation ---

group("CellBuffer: creation", () => {
  bench("80×24", () => {
    new CellBuffer(80, 24);
  });

  bench("120×40", () => {
    new CellBuffer(120, 40);
  });

  bench("200×50", () => {
    new CellBuffer(200, 50);
  });
});

// --- emitBuffer (full render) ---

group("emitBuffer: full render", () => {
  // Prepare a painted buffer
  const tree80 = layout(appTree(20), 80, 24);
  const buf80 = new CellBuffer(80, 24);
  paint(tree80, buf80);

  const tree120 = layout(appTree(50), 120, 40);
  const buf120 = new CellBuffer(120, 40);
  paint(tree120, buf120);

  bench("80×24 app tree", () => {
    emitBuffer(buf80);
  });

  bench("120×40 app tree", () => {
    emitBuffer(buf120);
  });
});

// --- emitDiff (differential render) ---

group("emitDiff: no changes", () => {
  const tree = layout(appTree(20), 80, 24);
  const buf = new CellBuffer(80, 24);
  paint(tree, buf);
  // Clone the buffer by creating identical content
  const buf2 = new CellBuffer(80, 24);
  paint(tree, buf2);

  bench("80×24 identical buffers", () => {
    emitDiff(buf, buf2);
  });
});

group("emitDiff: partial changes", () => {
  // Base buffer
  const tree1 = layout(appTree(20), 80, 24);
  const buf1 = new CellBuffer(80, 24);
  paint(tree1, buf1);

  // Changed buffer — different message count changes bottom portion
  const tree2 = layout(appTree(21), 80, 24);
  const buf2 = new CellBuffer(80, 24);
  paint(tree2, buf2);

  bench("80×24 one message added", () => {
    emitDiff(buf1, buf2);
  });
});

group("emitDiff: full change", () => {
  const tree1 = layout(flatTree(24), 80, 24);
  const buf1 = new CellBuffer(80, 24);
  paint(tree1, buf1);

  const tree2 = layout(flatTree(100), 80, 24);
  const buf2 = new CellBuffer(80, 24);
  paint(tree2, buf2);

  bench("80×24 completely different", () => {
    emitDiff(buf1, buf2);
  });
});

await run();
