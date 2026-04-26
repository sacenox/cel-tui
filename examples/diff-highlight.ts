/**
 * cel-tui: Diff / patch highlighting
 *
 * Demonstrates clew's `diff` / `patch` language support through the
 * SyntaxHighlight component, including git-style patches and output shaped
 * like `createPatch` from the npm `diff` package.
 *
 * Run: bun run examples/diff-highlight.ts
 */

import { cel, HStack, ProcessTerminal, Text, VStack } from "@cel-tui/core";
import {
  Divider,
  Spacer,
  SyntaxHighlight,
  type SyntaxHighlightTheme,
  VDivider,
} from "@cel-tui/components";
import { warningBox } from "./warning-box";

const MIN_COLS = 58;
const MIN_ROWS = 16;
const SIDE_BY_SIDE_MIN_COLS = 104;

interface PatchSample {
  title: string;
  language: "diff" | "patch";
  description: string;
  source: string;
}

const DIFF_THEME: SyntaxHighlightTheme = {
  name: "diff-highlight-demo",
  type: "dark",
  fg: "#e5e5e5",
  bg: "#000000",
  tokenColors: [
    { settings: { foreground: "#e5e5e5" } },
    {
      scope: ["diff.header", "diff.hunk"],
      settings: { foreground: "#29b8db", fontStyle: "bold" },
    },
    {
      scope: "diff.file.old",
      settings: { foreground: "#f14c4c", fontStyle: "bold" },
    },
    {
      scope: "diff.file.new",
      settings: { foreground: "#23d18b", fontStyle: "bold" },
    },
    {
      scope: "diff.inserted",
      settings: { foreground: "#23d18b" },
    },
    {
      scope: "diff.deleted",
      settings: { foreground: "#f14c4c" },
    },
    {
      scope: "diff.context",
      settings: { foreground: "#e5e5e5" },
    },
    {
      scope: "diff.no-newline",
      settings: { foreground: "#666666", fontStyle: "italic" },
    },
    {
      scope: ["operator", "diff.marker"],
      settings: { foreground: "#bc3fbc" },
    },
  ],
};

const THEME_OPTIONS: ReadonlyArray<{
  label: string;
  theme?: SyntaxHighlightTheme;
}> = [
  { label: "terminal ansi16" },
  { label: "diff tuned", theme: DIFF_THEME },
  { label: "dark-plus", theme: "dark-plus" },
];

const SAMPLES: readonly PatchSample[] = [
  {
    title: "Git patch",
    language: "diff",
    description:
      "A unified git patch with file metadata, hunk headers, additions, removals, and context lines.",
    source: [
      "diff --git a/packages/clew/src/index.ts b/packages/clew/src/index.ts",
      "index a734b9a..0928140 100644",
      "--- a/packages/clew/src/index.ts",
      "+++ b/packages/clew/src/index.ts",
      "@@ -34,7 +34,7 @@ export function clew(content: string, options: ClewOptions) {",
      '  * Streaming is the default mode, and `stability` defaults to "eager".',
      "  *",
      "  * The current implementation supports TypeScript / JavaScript ids, Python,",
      "- * Bash, JSON, and Markdown.",
      "+ * Bash, JSON, Markdown, and diff/patch.",
      "  */",
      " export function clew(content: string, options: ClewStreamOptions): ClewStream;",
    ].join("\n"),
  },
  {
    title: "createPatch output",
    language: "patch",
    description:
      "A patch shaped like createPatch(filename, oldText, newText) from the npm diff package.",
    source: [
      "Index: greeting.txt",
      "===================================================================",
      "--- greeting.txt",
      "+++ greeting.txt",
      "@@ -1,6 +1,7 @@",
      " hello from cel-tui",
      "-old tokenizer path",
      "+new diff tokenizer path",
      " context survives unchanged",
      "+patch aliases are supported too",
      " final line",
      "\\ No newline at end of file",
    ].join("\n"),
  },
];

let sampleIndex = 0;
let themeIndex = 1;

function currentSample(): PatchSample {
  return SAMPLES[sampleIndex] ?? SAMPLES[0]!;
}

function currentTheme() {
  return THEME_OPTIONS[themeIndex] ?? THEME_OPTIONS[0]!;
}

function selectSample(delta: number) {
  sampleIndex = (sampleIndex + delta + SAMPLES.length) % SAMPLES.length;
  cel.render();
}

function toggleTheme() {
  themeIndex = (themeIndex + 1) % THEME_OPTIONS.length;
  cel.render();
}

function quit() {
  cel.stop();
  process.exit(0);
}

function sampleChip(sample: PatchSample, index: number) {
  const selected = index === sampleIndex;

  return Text(` ${sample.language} `, {
    fgColor: selected ? "color15" : "color08",
    bgColor: selected ? "color06" : undefined,
    bold: selected || undefined,
  });
}

function infoPane() {
  const sample = currentSample();
  const theme = currentTheme();

  return VStack({ padding: { x: 1 }, gap: 1 }, [
    Text("Diff highlight demo", { bold: true, fgColor: "color06" }),
    Text("SyntaxHighlight(sample, language, { theme })", {
      fgColor: "color08",
      italic: true,
    }),
    Divider({ fgColor: "color08" }),
    Text(sample.title, { bold: true, fgColor: "color03" }),
    Text(sample.description, { fgColor: "color08", wrap: "word" }),
    Text(`language: ${sample.language}`, { fgColor: "color08" }),
    Text(`theme: ${theme.label}`, { fgColor: "color08" }),
    Divider({ fgColor: "color08" }),
    Text("Try it", { bold: true, fgColor: "color06" }),
    Text("Left/Right or Tab  switch patch", { fgColor: "color08" }),
    Text("Ctrl+T             cycle theme", { fgColor: "color08" }),
    Text("Ctrl+Q             quit", { fgColor: "color08" }),
  ]);
}

function patchPane() {
  const sample = currentSample();
  const theme = currentTheme();

  return VStack({ flex: 1 }, [
    HStack({ padding: { x: 1 }, gap: 1 }, [
      Text(sample.title, { bold: true, fgColor: "color06" }),
      Spacer(),
      Text(`SyntaxHighlight(..., \"${sample.language}\")`, {
        fgColor: "color08",
      }),
    ]),
    Divider({ fgColor: "color08" }),
    VStack(
      {
        flex: 1,
        overflow: "scroll",
        scrollbar: true,
        padding: { x: 1 },
      },
      [SyntaxHighlight(sample.source, sample.language, { theme: theme.theme })],
    ),
  ]);
}

function mainView(cols: number) {
  if (cols >= SIDE_BY_SIDE_MIN_COLS) {
    return HStack({ flex: 1 }, [
      VStack({ width: 36, overflow: "scroll", scrollbar: true }, [infoPane()]),
      VDivider({ fgColor: "color08" }),
      patchPane(),
    ]);
  }

  return VStack({ flex: 1 }, [
    infoPane(),
    Divider({ fgColor: "color08" }),
    patchPane(),
  ]);
}

cel.init(new ProcessTerminal());
cel.viewport(() => {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  if (cols < MIN_COLS || rows < MIN_ROWS) {
    return VStack(
      {
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        onKeyPress: (key) => {
          if (key === "ctrl+q" || key === "ctrl+c") quit();
        },
      },
      [
        ...warningBox([
          "  Terminal too small :(",
          "",
          "  Please resize to at",
          `  least ${String(MIN_COLS).padStart(3)}×${String(MIN_ROWS).padStart(2)} chars.`,
          "",
          "  Ctrl+Q to quit",
        ]),
      ],
    );
  }

  return VStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        if (key === "ctrl+t") toggleTheme();
        if (key === "left" || key === "shift+tab") selectSample(-1);
        if (key === "right" || key === "tab") selectSample(1);
      },
    },
    [
      HStack({ padding: { x: 1 }, gap: 2 }, [
        Text("Diff / patch highlighting", { bold: true, fgColor: "color06" }),
        Spacer(),
        Text(`theme: ${currentTheme().label}`, { fgColor: "color03" }),
      ]),
      Divider({ fgColor: "color08" }),
      HStack({ padding: { x: 1 }, gap: 1, flexWrap: "wrap" }, [
        ...SAMPLES.map(sampleChip),
      ]),
      Divider({ fgColor: "color08" }),
      mainView(cols),
    ],
  );
});
