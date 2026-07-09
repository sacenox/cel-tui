/**
 * Benchmark: CellBuffer — creation, writing, and ANSI emission.
 *
 * Measures the cost of buffer allocation, full ANSI output generation,
 * and differential rendering (the key to fast re-renders).
 */

import { CellBuffer, emitBuffer } from "@cel-tui/core";
import { bench, group, run } from "mitata";
import { emitDiff } from "../packages/core/src/emitter.js";
import { layout } from "../packages/core/src/layout.js";
import { paint } from "../packages/core/src/paint.js";
import { appTree } from "./helpers.js";

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
  const tree1 = layout(appTree(20), 80, 24);
  const buf1 = new CellBuffer(80, 24);
  paint(tree1, buf1);

  const buf2 = new CellBuffer(80, 24);
  paint(tree1, buf2);
  const changed = buf2.get(10, 5);
  buf2.set(10, 5, { ...changed, char: changed.char === "X" ? "Y" : "X" });
  if (buf1.diff(buf2).length !== 1) {
    throw new Error("Partial-diff benchmark must change exactly one cell");
  }

  bench("80×24 one cell changed", () => {
    emitDiff(buf1, buf2);
  });
});

group("emitDiff: full change", () => {
  const buf1 = new CellBuffer(80, 24);
  const buf2 = new CellBuffer(80, 24);
  const baseCell = {
    fgColor: null,
    bgColor: null,
    bold: false,
    italic: false,
    underline: false,
  } as const;
  buf1.fill(0, 0, 80, 24, { ...baseCell, char: "A" });
  buf2.fill(0, 0, 80, 24, { ...baseCell, char: "B" });
  if (buf1.diff(buf2).length !== 80 * 24) {
    throw new Error("Full-diff benchmark must change every cell");
  }

  bench("80×24 completely different", () => {
    emitDiff(buf1, buf2);
  });
});

await run();
