/**
 * Benchmark: real-world synthetic app shapes.
 *
 * These fixtures mimic mini-coder / mini-coder-next node tree shapes without
 * importing those apps: long unvirtualized conversations, virtualized message
 * windows, syntax-highlight-like blocks, and wide wrapping token rows.
 */

import { CellBuffer, emitBuffer, measureContentHeight } from "@cel-tui/core";
import { bench, group, run } from "mitata";
import { emitDiff } from "../packages/core/src/emitter.js";
import { layout } from "../packages/core/src/layout.js";
import { paint } from "../packages/core/src/paint.js";
import { clearTextMeasurementCaches } from "../packages/core/src/text-layout.js";
import { clearVisibleWidthCache } from "../packages/core/src/width.js";
import {
  hstackTokenRow,
  miniCoderNextConversationTree,
  miniCoderNextMeasureNodes,
  miniCoderVirtualizedConversationTree,
} from "./helpers.js";

const W = 120;
const H = 40;

function clearMeasurementCaches(): void {
  clearTextMeasurementCaches();
  clearVisibleWidthCache();
}

// --- mini-coder-next: unvirtualized long conversation layout ---

group("real-world: mini-coder-next long conversation layout", () => {
  const t100 = miniCoderNextConversationTree(100);
  const t500 = miniCoderNextConversationTree(500);
  const t1000 = miniCoderNextConversationTree(1000);

  bench("100 messages (120×40)", () => {
    layout(t100, W, H);
  });

  bench("500 messages (120×40)", () => {
    layout(t500, W, H);
  });

  bench("1000 messages (120×40)", () => {
    layout(t1000, W, H);
  });
});

// --- mini-coder-next: cold-cache first render/layout ---

group("real-world: mini-coder-next cold first render", () => {
  const t100 = miniCoderNextConversationTree(100);
  const t500 = miniCoderNextConversationTree(500);
  const t1000 = miniCoderNextConversationTree(1000);
  const measureNodes = miniCoderNextMeasureNodes(250);

  bench("cold layout 100 messages (120×40)", () => {
    clearMeasurementCaches();
    layout(t100, W, H);
  });

  bench("cold layout 500 messages (120×40)", () => {
    clearMeasurementCaches();
    layout(t500, W, H);
  });

  bench("cold layout 1000 messages (120×40)", () => {
    clearMeasurementCaches();
    layout(t1000, W, H);
  });

  bench("cold full render 250 messages (120×40)", () => {
    clearMeasurementCaches();
    const tree = miniCoderNextConversationTree(250);
    const l = layout(tree, W, H);
    const buf = new CellBuffer(W, H);
    paint(l, buf);
    emitBuffer(buf);
  });

  bench("cold measure content height 250 nodes at width 118", () => {
    clearMeasurementCaches();
    let total = 0;
    for (const node of measureNodes) {
      total += measureContentHeight(node, { width: 118 });
    }
    return total;
  });
});

// --- mini-coder-next: paint pre-laid unvirtualized conversations ---

group("real-world: mini-coder-next long conversation paint", () => {
  const l500 = layout(miniCoderNextConversationTree(500), W, H);
  const l1000 = layout(miniCoderNextConversationTree(1000), W, H);

  bench("500 messages (120×40)", () => {
    const buf = new CellBuffer(W, H);
    paint(l500, buf);
  });

  bench("1000 messages (120×40)", () => {
    const buf = new CellBuffer(W, H);
    paint(l1000, buf);
  });
});

// --- mini-coder-next: full render and diff render including tree construction ---

group("real-world: mini-coder-next e2e", () => {
  const prevTree = miniCoderNextConversationTree(250);
  const prevLayout = layout(prevTree, W, H);
  const prevBuf = new CellBuffer(W, H);
  paint(prevLayout, prevBuf);

  bench("full render 250 messages (120×40)", () => {
    const tree = miniCoderNextConversationTree(250);
    const l = layout(tree, W, H);
    const buf = new CellBuffer(W, H);
    paint(l, buf);
    emitBuffer(buf);
  });

  bench("diff render 250 → 251 messages (120×40)", () => {
    const tree = miniCoderNextConversationTree(251);
    const l = layout(tree, W, H);
    const buf = new CellBuffer(W, H);
    paint(l, buf);
    emitDiff(prevBuf, buf);
  });
});

// --- HStack token-list stress tests ---

group("real-world: hstack token lists", () => {
  const r100 = hstackTokenRow(100);
  const r500 = hstackTokenRow(500);
  const r1000 = hstackTokenRow(1000);
  const l100 = layout(r100, W, H);
  const l500 = layout(r500, W, H);
  const l1000 = layout(r1000, W, H);

  bench("layout 100 tokens (120×40)", () => {
    layout(r100, W, H);
  });

  bench("layout 500 tokens (120×40)", () => {
    layout(r500, W, H);
  });

  bench("layout 1000 tokens (120×40)", () => {
    layout(r1000, W, H);
  });

  bench("paint 100 tokens (120×40)", () => {
    const buf = new CellBuffer(W, H);
    paint(l100, buf);
  });

  bench("paint 500 tokens (120×40)", () => {
    const buf = new CellBuffer(W, H);
    paint(l500, buf);
  });

  bench("paint 1000 tokens (120×40)", () => {
    const buf = new CellBuffer(W, H);
    paint(l1000, buf);
  });
});

// --- mini-coder: virtualized conversation layout/paint ---

group("real-world: mini-coder virtualized conversation", () => {
  const v1000 = miniCoderVirtualizedConversationTree(1000, 40);
  const v5000 = miniCoderVirtualizedConversationTree(5000, 40);
  const l1000 = layout(v1000, W, H);
  const l5000 = layout(v5000, W, H);

  bench("layout total 1000 / visible 40 (120×40)", () => {
    layout(v1000, W, H);
  });

  bench("layout total 5000 / visible 40 (120×40)", () => {
    layout(v5000, W, H);
  });

  bench("paint total 1000 / visible 40 (120×40)", () => {
    const buf = new CellBuffer(W, H);
    paint(l1000, buf);
  });

  bench("paint total 5000 / visible 40 (120×40)", () => {
    const buf = new CellBuffer(W, H);
    paint(l5000, buf);
  });
});

// --- Content height measurement for prebuilt message nodes ---

group("real-world: content height measurement", () => {
  const nodes = miniCoderNextMeasureNodes(250);

  bench("250 representative message nodes at width 118", () => {
    let total = 0;
    for (const node of nodes) {
      total += measureContentHeight(node, { width: 118 });
    }
    return total;
  });
});

await run();
