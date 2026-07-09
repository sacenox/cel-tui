/**
 * Deterministic regression benchmark harness.
 *
 * Each case runs a fixed number of operations for two warmup samples and seven
 * measured samples. Results are emitted as JSON so commits and machines can be
 * compared without parsing human-oriented benchmark output.
 */

import { cpus } from "node:os";
import { CellBuffer, emitBuffer, VStack } from "@cel-tui/core";
import {
  createSyntaxHighlight,
  SyntaxHighlight,
} from "../packages/components/src/syntax-highlight.js";
import { VirtualList } from "../packages/components/src/virtual-list.js";
import { emitDiff } from "../packages/core/src/emitter.js";
import { isEditingKey } from "../packages/core/src/keys.js";
import { layout } from "../packages/core/src/layout.js";
import { paint } from "../packages/core/src/paint.js";
import { layoutText } from "../packages/core/src/text-layout.js";
import {
  appTree,
  inkComparableTree,
  miniCoderMessage,
  miniCoderNextConversationTree,
} from "./helpers.js";

const WIDTH = 120;
const HEIGHT = 40;
const WARMUP_SAMPLES = 2;
const MEASURED_SAMPLES = 7;
const LONG_WRAPPED_PARAGRAPH =
  "The quick brown fox jumps over the lazy dog while terminal cells wrap predictably. ".repeat(
    110,
  );
const SYNTAX_SOURCES = Array.from({ length: 32 }, (_, snippet) =>
  Array.from(
    { length: 24 },
    (_, line) => `const value${snippet}_${line}: number = ${snippet + line};`,
  ).join("\n"),
);
const FOUR_SYNTAX_SOURCES = SYNTAX_SOURCES.slice(0, 4);
const FIVE_SYNTAX_SOURCES = SYNTAX_SOURCES.slice(0, 5);
const BENCHMARK_SYNTAX_THEME = {
  name: "regression-benchmark",
  fg: "#e5e5e5",
  tokenColors: [
    { scope: "keyword", settings: { foreground: "#2472c8" } },
    { scope: "string", settings: { foreground: "#0dbc79" } },
  ],
} as const;
const VIRTUAL_MESSAGE_ITEMS = Array.from(
  { length: 5_000 },
  (_, index) => index,
);

interface BenchmarkDefinition {
  name: string;
  iterationsPerSample: number;
  operation: () => number;
}

interface BenchmarkResult {
  name: string;
  iterationsPerSample: number;
  medianNsPerOperation: number;
  rawSamplesNs: number[];
}

let benchmarkSink = 0;

function fixedWorkSample(definition: BenchmarkDefinition): number {
  const start = Bun.nanoseconds();
  for (let i = 0; i < definition.iterationsPerSample; i++) {
    benchmarkSink = (benchmarkSink + definition.operation()) | 0;
  }
  return Bun.nanoseconds() - start;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted[middle];
  if (value === undefined) {
    throw new Error("Cannot calculate the median of an empty sample set");
  }
  return value;
}

function measure(definition: BenchmarkDefinition): BenchmarkResult {
  for (let i = 0; i < WARMUP_SAMPLES; i++) {
    fixedWorkSample(definition);
  }

  const rawSamplesNs: number[] = [];
  for (let i = 0; i < MEASURED_SAMPLES; i++) {
    rawSamplesNs.push(fixedWorkSample(definition));
  }

  return {
    name: definition.name,
    iterationsPerSample: definition.iterationsPerSample,
    medianNsPerOperation: median(rawSamplesNs) / definition.iterationsPerSample,
    rawSamplesNs,
  };
}

function fullRender(
  treeFactory: typeof inkComparableTree | (() => ReturnType<typeof appTree>),
  width: number,
  height: number,
): number {
  const tree = treeFactory();
  const layoutTree = layout(tree, width, height);
  const buffer = new CellBuffer(width, height);
  paint(layoutTree, buffer);
  return emitBuffer(buffer).length;
}

function renderSyntaxFrame(sources: readonly string[]): number {
  let lineCount = 0;
  for (const source of sources) {
    lineCount += SyntaxHighlight(source, "typescript").children.length;
  }
  return lineCount;
}

function renderCustomThemeSyntaxFrame(sources: readonly string[]): number {
  let lineCount = 0;
  for (const source of sources) {
    lineCount += SyntaxHighlight(source, "typescript", {
      theme: BENCHMARK_SYNTAX_THEME,
    }).children.length;
  }
  return lineCount;
}

function setConversationScroll(
  tree: ReturnType<typeof miniCoderNextConversationTree>,
  scrollOffset: number,
): void {
  const conversation = tree.children[0];
  if (conversation?.type !== "vstack" && conversation?.type !== "hstack") {
    throw new Error("Expected the benchmark conversation to be a container");
  }
  conversation.props.scrollOffset = scrollOffset;
}

function commitSha(): string {
  const result = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
    cwd: process.cwd(),
    stderr: "pipe",
    stdout: "pipe",
  });
  if (result.exitCode !== 0) return "unknown";
  return result.stdout.toString().trim() || "unknown";
}

function workingTreeDirty(): boolean {
  const result = Bun.spawnSync(["git", "status", "--porcelain"], {
    cwd: process.cwd(),
    stderr: "pipe",
    stdout: "pipe",
  });
  return result.exitCode === 0 && result.stdout.length > 0;
}

const topTree = miniCoderNextConversationTree(1_000);
setConversationScroll(topTree, 0);
const topLayout = layout(topTree, WIDTH, HEIGHT);

const bottomTree = miniCoderNextConversationTree(1_000);
setConversationScroll(bottomTree, Infinity);
const bottomLayout = layout(bottomTree, WIDTH, HEIGHT);

const identicalLayout = layout(inkComparableTree(), 80, 24);
const identicalPrevious = new CellBuffer(80, 24);
const identicalNext = new CellBuffer(80, 24);
paint(identicalLayout, identicalPrevious);
paint(identicalLayout, identicalNext);

const syntaxInstances = SYNTAX_SOURCES.map(() => createSyntaxHighlight());
for (let index = 0; index < syntaxInstances.length; index++) {
  syntaxInstances[index]?.(SYNTAX_SOURCES[index] ?? "", "typescript");
}

// Prime direct-call entries so these cases measure steady-state frames. The
// historical four-entry prefix cache was fast at four snippets and thrashed at
// five; keeping both cases makes that cliff visible in regression output.
renderSyntaxFrame(FIVE_SYNTAX_SOURCES);
renderCustomThemeSyntaxFrame(FIVE_SYNTAX_SOURCES);

const virtualConversation = VirtualList<number>({
  itemKey: (index) => index,
  renderItem: miniCoderMessage,
  estimatedItemHeight: 8,
  gap: 1,
  overscan: HEIGHT,
  defaultStickToBottom: true,
});

function renderVirtualConversation(): number {
  const tree = virtualConversation({
    items: VIRTUAL_MESSAGE_ITEMS,
    width: WIDTH,
    height: HEIGHT,
  });
  const layoutTree = layout(tree, WIDTH, HEIGHT);
  return (
    virtualConversation.getState().renderedItems + layoutTree.children.length
  );
}

// Prime measured row heights so the regression case represents a steady-state
// interactive frame rather than first-mount cache population.
renderVirtualConversation();

const definitions: BenchmarkDefinition[] = [
  {
    name: "cell_buffer_create_120x40",
    iterationsPerSample: 400,
    operation: () => {
      const buffer = new CellBuffer(WIDTH, HEIGHT);
      return buffer.width + buffer.height + buffer.get(0, 0).char.length;
    },
  },
  {
    name: "e2e_ink_comparable_80x24",
    iterationsPerSample: 200,
    operation: () => fullRender(inkComparableTree, 80, 24),
  },
  {
    name: "e2e_app_tree_20_120x40",
    iterationsPerSample: 100,
    operation: () => fullRender(() => appTree(20), WIDTH, HEIGHT),
  },
  {
    name: "allocate_and_paint_1000_messages_top_120x40",
    iterationsPerSample: 8,
    operation: () => {
      const buffer = new CellBuffer(WIDTH, HEIGHT);
      paint(topLayout, buffer);
      return buffer.get(0, 0).char.length + buffer.get(10, 10).char.length;
    },
  },
  {
    name: "build_and_layout_5000_messages_unvirtualized_120x40",
    iterationsPerSample: 1,
    operation: () => {
      const tree = VStack(
        {
          width: WIDTH,
          height: HEIGHT,
          gap: 1,
          overflow: "scroll",
          scrollOffset: Infinity,
        },
        VIRTUAL_MESSAGE_ITEMS.map(miniCoderMessage),
      );
      return layout(tree, WIDTH, HEIGHT).children.length;
    },
  },
  {
    name: "virtual_list_5000_variable_messages_120x40",
    iterationsPerSample: 20,
    operation: renderVirtualConversation,
  },
  {
    name: "layout_text_ascii_9130_chars_width_80",
    iterationsPerSample: 10,
    operation: () => {
      const result = layoutText(LONG_WRAPPED_PARAGRAPH, 80, "word");
      return result.lineCount + (result.lines.at(-1)?.endOffset ?? 0);
    },
  },
  {
    name: "allocate_and_paint_1000_messages_bottom_120x40",
    iterationsPerSample: 8,
    operation: () => {
      const buffer = new CellBuffer(WIDTH, HEIGHT);
      paint(bottomLayout, buffer);
      return buffer.get(0, 0).char.length + buffer.get(10, 10).char.length;
    },
  },
  {
    name: "emit_diff_identical_80x24",
    iterationsPerSample: 400,
    operation: () =>
      emitDiff(identicalPrevious, identicalNext).length + identicalNext.width,
  },
  {
    name: "editing_key_lookup_named_and_shortcut",
    iterationsPerSample: 20_000,
    operation: () =>
      Number(isEditingKey("enter")) + Number(isEditingKey("ctrl+s")),
  },
  {
    name: "syntax_highlight_direct_4_static_snippets_frame",
    iterationsPerSample: 200,
    operation: () => renderSyntaxFrame(FOUR_SYNTAX_SOURCES),
  },
  {
    name: "syntax_highlight_direct_5_static_snippets_frame",
    iterationsPerSample: 200,
    operation: () => renderSyntaxFrame(FIVE_SYNTAX_SOURCES),
  },
  {
    name: "syntax_highlight_32_isolated_instances_frame",
    iterationsPerSample: 100,
    operation: () => {
      let lineCount = 0;
      for (let index = 0; index < syntaxInstances.length; index++) {
        lineCount +=
          syntaxInstances[index]?.(SYNTAX_SOURCES[index] ?? "", "typescript")
            .children.length ?? 0;
      }
      return lineCount;
    },
  },
  {
    name: "syntax_highlight_cached_custom_theme_5_snippets_frame",
    iterationsPerSample: 200,
    operation: () => renderCustomThemeSyntaxFrame(FIVE_SYNTAX_SOURCES),
  },
];

const output = {
  schemaVersion: 1,
  environment: {
    bunVersion: Bun.version,
    platform: process.platform,
    arch: process.arch,
    cpuModel: cpus()[0]?.model ?? "unknown",
    commitSha: commitSha(),
    workingTreeDirty: workingTreeDirty(),
  },
  methodology: {
    clock: "Bun.nanoseconds",
    unit: "nanoseconds",
    statistic: "median",
    warmupSamples: WARMUP_SAMPLES,
    measuredSamples: MEASURED_SAMPLES,
    fixedIterationsPerSample: true,
  },
  cases: definitions.map(measure),
  checksum: benchmarkSink,
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
