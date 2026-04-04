# cel-tui Benchmark Results

**Machine:** 12th Gen Intel Core i9-12900, ~4.4 GHz  
**Runtime:** Bun 1.3.9 (x64-linux)  
**Date:** 2026-04-04

## Ink Comparison (caveat emptor)

These numbers compare cel-tui's end-to-end pipeline against Ink using a
visually similar tree (styled text, flexbox columns, word-wrap, nested
containers with colors — the same shape as Ink's own `benchmark/simple`).

**This is not an apples-to-apples comparison.** Ink is a React-based
framework that does significantly more work per render: JSX → React
reconciliation → Yoga layout (C++ via NAPI) → segment compositing →
ANSI output. It supports React hooks, component lifecycle, concurrent
mode, and a rich ecosystem of composable components. cel-tui is a
minimal stateless framework that builds plain JS objects and writes
cells into a flat buffer — it's a fundamentally different (and much
simpler) architecture.

The comparison is included as a rough reference point, not a claim of
superiority. Ink solves a broader set of problems; cel-tui trades
features for raw throughput.

| What                                       | cel-tui    | Ink 6.8.0                                         | Ratio      |
| ------------------------------------------ | ---------- | ------------------------------------------------- | ---------- |
| **Single render (comparable tree, 80×24)** | **65 µs**  | 632 µs (`renderToString`)                         | **~10×**   |
| **1,000 re-renders**                       | **64 ms**  | 632 ms (`renderToString`) / 1,462 ms (`rerender`) | **10–23×** |
| **Projected 100k re-renders**              | **~6.4 s** | ~63 s (`renderToString`) / ~146 s (`rerender`)    | **10–23×** |

The Ink benchmark script we used is a custom `renderToString` loop (see
[How to Reproduce](#how-to-reproduce)), not Ink's own shipped benchmark,
which does 100k `rerender()` calls that also write to stdout. Both
numbers are included above.

### What each framework does per render

| Step                 | cel-tui                          | Ink                             |
| -------------------- | -------------------------------- | ------------------------------- |
| Tree construction    | Plain JS objects (~0 cost)       | React.createElement + JSX       |
| Layout               | Custom flexbox (TypeScript)      | Yoga (C++ via NAPI)             |
| Painting             | Cell buffer (typed array writes) | Segment compositor (string ops) |
| Output               | ANSI emitter (string concat)     | ANSI string builder (chalk)     |
| State reconciliation | None (stateless)                 | React reconciler                |

## cel-tui Pipeline Breakdown

### visibleWidth (character measurement)

| Input                        | Time     |
| ---------------------------- | -------- |
| ASCII short (5 chars)        | 4.1 ns   |
| ASCII (64 chars)             | 40.3 ns  |
| ASCII long (640 chars)       | 398.6 ns |
| CJK + emoji (26 graphemes)   | 26.8 ns  |
| Mixed ASCII + CJK (60 chars) | 5.1 ns   |
| ANSI escape sequences        | 2.9 ns   |
| Empty string                 | 0.1 ns   |

The fast ASCII path dominates — pure ASCII strings bypass grapheme segmentation entirely.

### Layout Engine

| Tree                          | Time     |
| ----------------------------- | -------- |
| 10 children (flat)            | 1.5 µs   |
| 100 children (flat)           | 11.9 µs  |
| 1,000 children (flat)         | 124.5 µs |
| depth=3 breadth=3 (40 nodes)  | 3.0 µs   |
| depth=4 breadth=3 (121 nodes) | 15.3 µs  |
| depth=3 breadth=5 (156 nodes) | 9.5 µs   |
| 50 styled groups (200 nodes)  | 49.9 µs  |
| 10 word-wrap paragraphs       | 2.6 µs   |
| 50 word-wrap paragraphs       | 12.3 µs  |
| Ink-comparable tree           | 1.6 µs   |
| App tree (20 messages)        | 9.9 µs   |
| App tree (100 messages)       | 37.9 µs  |

Layout scales linearly with node count (~120 ns/node for flat trees).

### Paint (cell buffer writing)

| Scenario                      | Time   |
| ----------------------------- | ------ |
| 10 children (flat, 120×40)    | 95 µs  |
| 100 children (flat, 120×40)   | 195 µs |
| 1,000 children (flat, 120×40) | 198 µs |
| Nested 121 nodes (120×40)     | 185 µs |
| 50 styled groups (120×40)     | 220 µs |
| 200 lines scrollable (120×40) | 198 µs |
| 50 word-wrapped paragraphs    | 283 µs |
| Ink-comparable (80×24)        | 46 µs  |
| App tree 20 msgs (120×40)     | 187 µs |
| 80×24 (small terminal)        | 110 µs |
| 120×40 (medium terminal)      | 209 µs |
| 200×50 (large terminal)       | 312 µs |

Paint is O(cells), not O(nodes) — 100 vs 1,000 children produce similar times because only visible cells are painted. Cost scales with terminal size.

### CellBuffer & ANSI Emission

| Operation                    | Time     |
| ---------------------------- | -------- |
| Buffer creation 80×24        | 24.2 µs  |
| Buffer creation 120×40       | 58.6 µs  |
| Buffer creation 200×50       | 122.2 µs |
| emitBuffer 80×24 (full)      | 19.3 µs  |
| emitBuffer 120×40 (full)     | 46.8 µs  |
| emitDiff 80×24 (no changes)  | 11.6 µs  |
| emitDiff 80×24 (partial)     | 11.9 µs  |
| emitDiff 80×24 (full change) | 10.7 µs  |

Differential rendering has near-constant cost regardless of change amount — dominated by the comparison scan over all cells.

### Hit Test & Focus

| Operation                    | Time    |
| ---------------------------- | ------- |
| hitTest flat 100, center     | 135 ns  |
| hitTest nested 121, center   | 35 ns   |
| hitTest app 50 msgs, center  | 102 ns  |
| hitTest miss (out of bounds) | 1.5 ns  |
| collectFocusable 100 buttons | 1.15 µs |
| collectFocusable app tree    | 1.03 µs |

### Key Parsing

| Input                 | Time   |
| --------------------- | ------ |
| Printable char 'a'    | <1 ns  |
| Ctrl+C (0x03)         | <1 ns  |
| Escape                | <1 ns  |
| Arrow up (CSI)        | 2.7 ns |
| Shift+Tab (CSI Z)     | 7.6 ns |
| F5 (CSI 15~)          | 163 ns |
| Backspace (0x7F)      | 6.8 ns |
| normalizeKey "ctrl+s" | 90 ns  |

### End-to-End Pipeline

| Scenario                  | Time   | Renders/sec |
| ------------------------- | ------ | ----------- |
| Ink-comparable (80×24)    | 65 µs  | **15,400**  |
| Flat 100 lines (80×24)    | 153 µs | 6,500       |
| App tree 20 msgs (120×40) | 267 µs | 3,700       |
| Re-render no-change diff  | 61 µs  | 16,400      |
| Re-render +1 message diff | 252 µs | 3,970       |
| 1,000 re-renders batch    | 64 ms  | 15,600      |

## Ink Raw Numbers

Ink v6.8.0, visually similar tree to cel-tui's "ink-comparable"
scenario. Run with Bun 1.3.9 on the same machine. Note: the
`renderToString` benchmark was written by us (not shipped by Ink) to
isolate the render pipeline from terminal I/O.

### `renderToString` (pure pipeline, no I/O)

```
Run 1: 1,000 renders: 632.75 ms — 632 µs/render
Run 2: 1,000 renders: 632.66 ms — 633 µs/render
Run 3: 1,000 renders: 630.99 ms — 631 µs/render
```

### `rerender` (full render with React reconciler + stdout)

```
Run 1: 1,000 re-renders: 1473.63 ms — 1,474 µs/render
Run 2: 1,000 re-renders: 1461.48 ms — 1,461 µs/render
Run 3: 1,000 re-renders: 1450.79 ms — 1,451 µs/render
```

## How to Reproduce

```bash
# cel-tui benchmarks
cd cel-tui
bun install
bun run benchmarks/run-all.ts       # full suite
bun run benchmarks/e2e.bench.ts     # just the headline numbers

# Ink benchmarks
git clone https://github.com/vadimdemedes/ink.git /tmp/ink-bench
cd /tmp/ink-bench
npm install && npm run build

# Create a renderToString benchmark (Ink ships rerender-to-stdout only)
cat > benchmark/simple/bench-rts.tsx << 'BENCH'
import React from "react";
import { renderToString, Box, Text } from "../../src/index.js";

function App() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text underline bold color="red">{"Hello World"}</Text>
      <Box marginTop={1} width={60}>
        <Text>
          Cupcake ipsum dolor sit amet candy candy. Sesame snaps cookie
          I love tootsie roll apple pie bonbon wafer. Caramels sesame
          snaps icing cotton candy I love cookie sweet roll.
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text backgroundColor="white" color="black">Colors:</Text>
        <Box flexDirection="column" paddingLeft={1}>
          <Text>- <Text color="red">Red</Text></Text>
          <Text>- <Text color="blue">Blue</Text></Text>
          <Text>- <Text color="green">Green</Text></Text>
        </Box>
      </Box>
    </Box>
  );
}

renderToString(<App />, { columns: 80 }); // warmup
const start = performance.now();
for (let i = 0; i < 1_000; i++) renderToString(<App />, { columns: 80 });
const elapsed = performance.now() - start;
console.log(`1,000 renders: ${elapsed.toFixed(2)} ms (${(elapsed / 1000).toFixed(3)} ms/render)`);
BENCH

bun run benchmark/simple/bench-rts.tsx
```
