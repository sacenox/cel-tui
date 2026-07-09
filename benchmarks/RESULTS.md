# cel-tui Benchmark Results

> These are historical snapshots, not universal performance claims. For
> before/after work, run `bun run bench:regression` on the same machine, Bun
> version, and power profile; it emits environment metadata and raw fixed-work
> samples as JSON.

## 2026-07-09 quality-pass comparison

Same-machine, same-runtime (`Bun 1.3.13`) fixed-work medians recorded before
and after the rendering quality pass:

| Case                                      | Before  | After   | Change |
| ----------------------------------------- | ------- | ------- | ------ |
| Allocate `CellBuffer(120, 40)`            | 92.8 µs | 3.4 µs  | -96.3% |
| Allocate + paint 1,000 messages at top    | 1.33 ms | 0.44 ms | -67.1% |
| Allocate + paint 1,000 messages at bottom | 8.61 ms | 0.45 ms | -94.8% |

The bottom-scroll gain comes from translating and clipping during traversal
instead of cloning every layout node in a scrolled subtree. The allocation
gain comes from sharing an immutable empty-cell sentinel. The checked-in
`bench:regression` harness now makes equivalent future comparisons
repeatable and records its raw samples and environment as JSON.

Two mid-pass checkpoints isolate the later ASCII painting fast path: the
Ink-shaped end-to-end case moved from 0.663 ms to 0.198 ms (-70.1%), and the
20-message app case from 4.29 ms to 0.466 ms (-89.1%). These are not the
original repository baseline, so they are intentionally separate from the
table above.

The full test suite also moved from 561 tests in 4.77 s to 608 tests in
0.40 s after replacing fixed timer sleeps with a deterministic render-flush
seam. Line coverage increased from 93.20% to 93.52%.

### SyntaxHighlight cache scaling

The same quality pass replaced the global four-state content-prefix heuristic
with a bounded exact-render cache plus explicit `createSyntaxHighlight()`
instances. The fixed workload below renders 24-line TypeScript snippets for 30
frames after three warmup frames on the same Bun 1.3.13 process shape:

| Static snippets per frame | Before    | After     |
| ------------------------- | --------- | --------- |
| 4                         | 0.0058 ms | 0.0067 ms |
| 5                         | 1.7105 ms | 0.0082 ms |
| 5 / 4 scaling ratio       | 297.3x    | 1.22x     |

Crossing the old four-entry boundary made every lookup miss. At five snippets,
the new cache removes 99.5% of that frame cost while scaling close to the ideal
1.25x increase in work. `bench:regression` now includes fixed-work 4-snippet,
5-snippet, and 32-isolated-instance cases; one recorded run measured medians of
3.40 µs, 4.17 µs, and 0.93 µs per frame respectively.

### Variable-height VirtualList

The first-class `VirtualList` regression case uses 5,000 keyed, variable-height
mini-coder message rows at 120×40. It includes callable component rendering,
visible-row measurement, prefix/window calculation, spacer construction, and
layout. A same-process steady-state run on Bun 1.3.13 measured:

| Case                                | Median        |
| ----------------------------------- | ------------- |
| Build + layout all 5,000 rows       | 134.39 ms     |
| VirtualList + layout visible window | 2.170 ms      |
| Relative reduction / speedup        | 98.4% / 61.9× |

The virtual result retains cell-accurate measured heights for active rows and
uses bounded estimates for cold rows; only the viewport plus configured
overscan appears in the returned node tree. Both cases remain in
`bench:regression` so future changes can be compared with the same fixed-work
harness and raw samples.

### Editing-key lookup

The exploratory key benchmark exposed an immutable `Set` being rebuilt for
every named key event. Hoisting that lookup removed the hot-path allocation on
the same machine and similar measured clock (~1.7 GHz):

| Case                     | Before  | After   | Change        |
| ------------------------ | ------- | ------- | ------------- |
| `isEditingKey("enter")`  | 1.39 µs | 3.94 ns | -99.7% / 353× |
| `isEditingKey("ctrl+s")` | 1.26 µs | 6.03 ns | -99.5% / 209× |

`bench:regression` now includes the combined named-key/shortcut lookup; one
recorded fixed-work median was 11.09 ns for both calls together.

**Machine:** 12th Gen Intel Core i9-12900, ~4.4 GHz  
**Runtime:** Bun 1.3.9 (x64-linux)  
**Date:** 2026-04-05 (updated from 2026-04-04 baseline)

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

| What                                       | cel-tui    | Ink 6.8.0                                         | Ratio     |
| ------------------------------------------ | ---------- | ------------------------------------------------- | --------- |
| **Single render (comparable tree, 80×24)** | **65 µs**  | 632 µs (`renderToString`)                         | **~10×**  |
| **1,000 re-renders**                       | **67 ms**  | 632 ms (`renderToString`) / 1,462 ms (`rerender`) | **9–22×** |
| **Projected 100k re-renders**              | **~6.7 s** | ~63 s (`renderToString`) / ~146 s (`rerender`)    | **9–22×** |

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
| ASCII (64 chars)             | 39.1 ns  |
| ASCII long (640 chars)       | 386.6 ns |
| CJK + emoji (26 graphemes)   | 26.6 ns  |
| Mixed ASCII + CJK (60 chars) | 4.9 ns   |
| ANSI escape sequences        | 3.2 ns   |
| Empty string                 | 0.1 ns   |

The fast ASCII path dominates — pure ASCII strings bypass grapheme segmentation entirely.

### Layout Engine

| Tree                          | Time     |
| ----------------------------- | -------- |
| 10 children (flat)            | 1.5 µs   |
| 100 children (flat)           | 12.0 µs  |
| 1,000 children (flat)         | 125.1 µs |
| depth=3 breadth=3 (40 nodes)  | 3.0 µs   |
| depth=4 breadth=3 (121 nodes) | 15.1 µs  |
| depth=3 breadth=5 (156 nodes) | 9.5 µs   |
| 50 styled groups (200 nodes)  | 52.6 µs  |
| 10 word-wrap paragraphs       | 2.6 µs   |
| 50 word-wrap paragraphs       | 13.1 µs  |
| Ink-comparable tree           | 1.7 µs   |
| App tree (20 messages)        | 10.1 µs  |
| App tree (100 messages)       | 39.6 µs  |

Layout scales linearly with node count (~120 ns/node for flat trees).

### Paint (cell buffer writing)

| Scenario                      | Time   |
| ----------------------------- | ------ |
| 10 children (flat, 120×40)    | 93 µs  |
| 100 children (flat, 120×40)   | 193 µs |
| 1,000 children (flat, 120×40) | 192 µs |
| Nested 121 nodes (120×40)     | 180 µs |
| 50 styled groups (120×40)     | 207 µs |
| 200 lines scrollable (120×40) | 185 µs |
| 50 word-wrapped paragraphs    | 286 µs |
| Ink-comparable (80×24)        | 45 µs  |
| App tree 20 msgs (120×40)     | 208 µs |
| 80×24 (small terminal)        | 109 µs |
| 120×40 (medium terminal)      | 196 µs |
| 200×50 (large terminal)       | 284 µs |

Paint is O(cells), not O(nodes) — 100 vs 1,000 children produce similar times because only visible cells are painted. Cost scales with terminal size.

### CellBuffer & ANSI Emission

| Operation                    | Time                       |
| ---------------------------- | -------------------------- |
| Buffer creation 80×24        | 24.7 µs                    |
| Buffer creation 120×40       | 58.2 µs                    |
| Buffer creation 200×50       | 117.0 µs                   |
| emitBuffer 80×24 (full)      | 21.4 µs                    |
| emitBuffer 120×40 (full)     | 46.4 µs                    |
| emitDiff 80×24 (no changes)  | 11.8 µs                    |
| emitDiff 80×24 (partial)     | invalid historical fixture |
| emitDiff 80×24 (full change) | invalid historical fixture |

The original partial/full-change fixtures accidentally produced identical
visible buffers, so their published timings did not measure the named cases.
The fixtures now assert that exactly one or every cell changes, respectively;
use `bun run benchmarks/cell-buffer.bench.ts` for corrected measurements.

### Hit Test & Focus

| Operation                    | Time    |
| ---------------------------- | ------- |
| hitTest flat 100, center     | 145 ns  |
| hitTest nested 121, center   | 41 ns   |
| hitTest app 50 msgs, center  | 108 ns  |
| hitTest miss (out of bounds) | 7.7 ns  |
| collectFocusable 100 buttons | 1.13 µs |
| collectFocusable app tree    | 0.96 µs |

### Key Parsing

| Input                 | Time   |
| --------------------- | ------ |
| Printable char 'a'    | 15 ns  |
| Ctrl+C (0x03)         | 18 ns  |
| Escape                | ~1 ns  |
| Arrow up (CSI)        | 58 ns  |
| Shift+Tab (CSI Z)     | <1 ns  |
| F5 (CSI 15~)          | 111 ns |
| Backspace (0x7F)      | 7.1 ns |
| normalizeKey "ctrl+s" | 84 ns  |

### End-to-End Pipeline

| Scenario                  | Time   | Renders/sec |
| ------------------------- | ------ | ----------- |
| Ink-comparable (80×24)    | 67 µs  | **14,900**  |
| Flat 100 lines (80×24)    | 152 µs | 6,600       |
| App tree 20 msgs (120×40) | 268 µs | 3,700       |
| Re-render no-change diff  | 61 µs  | 16,300      |
| Re-render +1 message diff | 248 µs | 4,030       |
| 1,000 re-renders batch    | 67 ms  | 14,800      |

## Real-World Synthetic App Shapes

Focused run for the new `benchmarks/real-world.bench.ts` cases.
These numbers use fixtures shaped after `mini-coder` and `mini-coder-next`:
long unvirtualized conversations, syntax-highlight-like wrapping HStack token
rows, and mini-coder-style virtualized scrollback slices.

**Runtime:** Bun 1.3.13 (x64-linux)  
**Date:** 2026-04-25

### mini-coder-next-style unvirtualized conversation

| Scenario                               | Time   |
| -------------------------------------- | ------ |
| Layout 100 messages (120×40)           | 71 ms  |
| Layout 500 messages (120×40)           | 348 ms |
| Layout 1,000 messages (120×40)         | 740 ms |
| Paint pre-laid 500 messages (120×40)   | 4.0 ms |
| Paint pre-laid 1,000 messages (120×40) | 6.5 ms |
| Full render 250 messages (120×40)      | 172 ms |
| Diff render 250 → 251 messages         | 179 ms |

The new benchmark exposes the real bottleneck that the older app-tree cases
missed: long unvirtualized conversation layout dominates render time. Paint is
much smaller but still grows for token-heavy visible content.

### Long wrapping HStack token lists

| Scenario                     | Time   |
| ---------------------------- | ------ |
| Layout 100 tokens (120×40)   | 314 µs |
| Layout 500 tokens (120×40)   | 1.6 ms |
| Layout 1,000 tokens (120×40) | 3.2 ms |
| Paint 100 tokens (120×40)    | 771 µs |
| Paint 500 tokens (120×40)    | 3.5 ms |
| Paint 1,000 tokens (120×40)  | 6.0 ms |

These rows mimic `SyntaxHighlight` output: each logical line becomes an
`HStack({ flexWrap: "wrap" })` with many styled `Text` spans.

### mini-coder-style virtualized conversation

| Scenario                                        | Time   |
| ----------------------------------------------- | ------ |
| Layout total 1,000 / visible 40 (120×40)        | 31 ms  |
| Layout total 5,000 / visible 40 (120×40)        | 26 ms  |
| Paint total 1,000 / visible 40 (120×40)         | 1.6 ms |
| Paint total 5,000 / visible 40 (120×40)         | 1.6 ms |
| Measure content height, 250 messages, width 118 | 56 ms  |

The virtualized shape is mostly insensitive to total message count because the
rendered node count is bounded by the visible slice plus spacers. The remaining
cost is from the visible token-heavy message nodes and cold height measurement.

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
bun run benchmarks/run-all.ts          # full suite
bun run benchmarks/e2e.bench.ts        # just the headline numbers
bun run benchmarks/real-world.bench.ts # real app-shaped stress cases

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
