/**
 * cel-tui: SyntaxHighlight component demo
 *
 * This example is intentionally component-focused.
 * It streams append-only chunks into `SyntaxHighlight(content, language, { theme })`
 * and lets you switch samples and themes, without reaching into tokenizer internals.
 *
 * Run: bun run examples/syntax-highlight.ts
 */

import { cel, HStack, ProcessTerminal, Text, VStack } from "@cel-tui/core";
import {
  Divider,
  Spacer,
  SyntaxHighlight,
  VDivider,
  type SyntaxHighlightTheme,
} from "@cel-tui/components";
import { warningBox } from "./warning-box";

const MIN_COLS = 76;
const MIN_ROWS = 20;
const SIDE_BY_SIDE_MIN_COLS = 110;
const TICK_MS = 70;

interface DemoSample {
  title: string;
  language: string;
  aliases: readonly string[];
  description: string;
  chunkSize: number;
  source: string;
}

const CUSTOM_THEME: SyntaxHighlightTheme = {
  name: "syntax-highlight-demo-sunset",
  type: "dark",
  fg: "#f8f8f2",
  bg: "#1f2335",
  tokenColors: [
    { settings: { foreground: "#f8f8f2" } },
    {
      scope: ["comment"],
      settings: { foreground: "#7f849c", fontStyle: "italic" },
    },
    {
      scope: ["keyword", "operator"],
      settings: { foreground: "#ff79c6" },
    },
    {
      scope: ["string"],
      settings: { foreground: "#f1fa8c" },
    },
    {
      scope: ["number", "escape"],
      settings: { foreground: "#ffb86c" },
    },
    {
      scope: ["command", "function"],
      settings: { foreground: "#50fa7b" },
    },
    {
      scope: ["type", "builtin", "meta", "markup.heading"],
      settings: { foreground: "#8be9fd" },
    },
    {
      scope: ["variable", "property"],
      settings: { foreground: "#bd93f9" },
    },
    {
      scope: ["link"],
      settings: { foreground: "#8be9fd", fontStyle: "underline" },
    },
    {
      scope: ["markup.list", "markup.quote"],
      settings: { foreground: "#ffb86c" },
    },
  ],
};

const THEME_OPTIONS: ReadonlyArray<{
  label: string;
  help: string;
  theme?: SyntaxHighlightTheme;
}> = [
  {
    label: "terminal ansi16",
    help: "Default theme follows terminal defaults plus ANSI slot accents.",
  },
  {
    label: "dark-plus",
    help: "Built-in preset with a VS Code-ish dark palette.",
    theme: "dark-plus",
  },
  {
    label: "custom sunset",
    help: "Custom token theme mapped onto cel's ANSI palette slots.",
    theme: CUSTOM_THEME,
  },
];

const SAMPLES: readonly DemoSample[] = [
  {
    title: "TypeScript",
    language: "typescript",
    aliases: ["ts", "tsx", "mts", "cts"],
    description:
      "Shows the current clew-backed path: keywords, strings, comments, and append-only updates.",
    chunkSize: 4,
    source: [
      "/**",
      " * clew is stream-first.",
      " */",
      'type Phase = "idle" | "streaming" | "done";',
      "",
      "interface Chunk<T> {",
      "  id: number;",
      "  payload: T;",
      "}",
      "",
      "function renderChunk<T extends string | number>(chunk: Chunk<T>): string {",
      "  return `${chunk.id}:${String(chunk.payload)}`;",
      "}",
      "",
      'const preview: Chunk<string> = { id: 7, payload: "hello" };',
      "renderChunk(preview);",
    ].join("\n"),
  },
  {
    title: "JavaScript",
    language: "javascript",
    aliases: ["js", "jsx", "mjs", "cjs"],
    description: "Async code, destructuring, and a template literal.",
    chunkSize: 5,
    source: [
      "async function loadUsers(signal) {",
      '  const response = await fetch("/api/users", { signal });',
      "  if (!response.ok) {",
      "    throw new Error(`HTTP ${response.status}`);",
      "  }",
      "  const users = await response.json();",
      "  return users.map(({ id, name }) => `${id}:${name}`).join(', ');",
      "}",
    ].join("\n"),
  },
  {
    title: "Python",
    language: "python",
    aliases: ["py"],
    description: "Decorators, classes, builtins, and an f-string.",
    chunkSize: 5,
    source: [
      "from dataclasses import dataclass",
      "",
      "@dataclass",
      "class Job:",
      "    name: str",
      "    retries: int = 0",
      "",
      "    def render(self) -> str:",
      '        return f"{self.name}:{self.retries}"',
      "",
      'print(Job("clew", 2).render())',
    ].join("\n"),
  },
  {
    title: "Bash",
    language: "bash",
    aliases: ["bash"],
    description:
      "Bash-only support: builtins, variables, substitutions, and a heredoc.",
    chunkSize: 5,
    source: [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "",
      "name=${1:-stream}",
      'printf "start %s\\n" "$name"',
      "",
      'if [[ "$name" == "stream" ]]; then',
      "  cat <<'EOF'",
      "append-only shell chunks",
      "EOF",
      "fi",
    ].join("\n"),
  },
  {
    title: "JSON",
    language: "json",
    aliases: ["json"],
    description:
      "Object keys, string values, booleans, null, numbers, and nested arrays.",
    chunkSize: 6,
    source: [
      "{",
      '  "name": "clew",',
      '  "stream": true,',
      '  "stability": "eager",',
      '  "retries": 2,',
      '  "features": ["json", "markdown", null],',
      '  "theme": { "name": "dark-plus", "enabled": true }',
      "}",
    ].join("\n"),
  },
  {
    title: "Markdown",
    language: "markdown",
    aliases: ["markdown"],
    description:
      "Headings, list markers, links, inline code, blockquotes, and fenced code.",
    chunkSize: 5,
    source: [
      "# clew notes",
      "",
      "- stream-first updates",
      '- `SyntaxHighlight(content, "markdown")`',
      "> Links stay atomic: [docs](https://example.com)",
      "",
      "```ts",
      'const mode = "streaming";',
      "```",
    ].join("\n"),
  },
];

let sampleIndex = 0;
let themeIndex = 0;
let content = "";
let cursor = 0;
let chunks = 0;
let lastChunk = "";
let paused = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function currentSample(): DemoSample {
  return SAMPLES[sampleIndex] ?? SAMPLES[0]!;
}

function currentTheme() {
  return THEME_OPTIONS[themeIndex] ?? THEME_OPTIONS[0]!;
}

function stopStreaming() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function scheduleTick() {
  stopStreaming();
  if (paused || cursor >= currentSample().source.length) {
    return;
  }
  timer = setTimeout(tick, TICK_MS);
}

function resetCurrentSample() {
  stopStreaming();
  content = "";
  cursor = 0;
  chunks = 0;
  lastChunk = "";
  paused = false;
  scheduleTick();
  cel.render();
}

function selectSample(delta: number) {
  sampleIndex = (sampleIndex + delta + SAMPLES.length) % SAMPLES.length;
  resetCurrentSample();
}

function toggleTheme() {
  themeIndex = (themeIndex + 1) % THEME_OPTIONS.length;
  cel.render();
}

function togglePause() {
  paused = !paused;
  scheduleTick();
  cel.render();
}

function previewChunk(chunk: string, max = 24): string {
  return chunk.length > max ? `${chunk.slice(0, max - 1)}…` : chunk;
}

function progressLine(sample: DemoSample): string {
  return `${String(cursor).padStart(String(sample.source.length).length)}/${sample.source.length} chars`;
}

function tick() {
  const sample = currentSample();
  if (cursor >= sample.source.length) {
    stopStreaming();
    cel.render();
    return;
  }

  const nextCursor = Math.min(sample.source.length, cursor + sample.chunkSize);
  lastChunk = sample.source.slice(cursor, nextCursor);
  content += lastChunk;
  cursor = nextCursor;
  chunks += 1;

  scheduleTick();
  cel.render();
}

function quit() {
  stopStreaming();
  cel.stop();
  process.exit(0);
}

function statusText(sample: DemoSample): string {
  if (cursor >= sample.source.length) {
    return "done";
  }
  return paused ? "paused" : "streaming";
}

function sampleChip(sample: DemoSample, index: number) {
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
    Text("SyntaxHighlight component demo", {
      bold: true,
      fgColor: "color06",
    }),
    Text(
      "This example only uses SyntaxHighlight(content, language, { theme }).",
      {
        fgColor: "color08",
        italic: true,
      },
    ),
    Text(
      "Append-only chunks are streamed into the component; backend details stay internal.",
      {
        fgColor: "color08",
        italic: true,
      },
    ),
    Divider({ fgColor: "color08" }),
    Text(`${sample.title} (${sample.language})`, {
      bold: true,
      fgColor: "color03",
    }),
    Text(sample.description, { fgColor: "color08" }),
    Text(`aliases: ${sample.aliases.join(", ")}`, { fgColor: "color08" }),
    Text(`theme: ${theme.label}`, { fgColor: "color08" }),
    Text(`status: ${statusText(sample)}`, { fgColor: "color08" }),
    Text(`progress: ${progressLine(sample)} | ${chunks} chunks`, {
      fgColor: "color08",
    }),
    Text(`last chunk: "${previewChunk(lastChunk)}"`, { fgColor: "color08" }),
    Divider({ fgColor: "color08" }),
    Text("Component call", { bold: true, fgColor: "color06" }),
    Text(`SyntaxHighlight(content, "${sample.language}", {`, {
      fgColor: "color07",
    }),
    Text(
      `  theme: ${typeof theme.theme === "string" ? JSON.stringify(theme.theme) : theme.theme ? "<custom theme>" : "undefined"}`,
      { fgColor: "color07" },
    ),
    Text("})", { fgColor: "color07" }),
    Divider({ fgColor: "color08" }),
    Text("Controls", { bold: true, fgColor: "color06" }),
    Text("Left/Right or Tab/Shift+Tab  switch sample", { fgColor: "color08" }),
    Text("Ctrl+T                       cycle theme", { fgColor: "color08" }),
    Text("Space                        pause/resume stream", {
      fgColor: "color08",
    }),
    Text("Ctrl+R                       restart current sample", {
      fgColor: "color08",
    }),
    Text("Ctrl+Q                       quit", { fgColor: "color08" }),
  ]);
}

function highlightPane() {
  const sample = currentSample();
  const theme = currentTheme();

  return VStack({ flex: 1 }, [
    HStack({ padding: { x: 1 }, gap: 1 }, [
      Text(sample.title, { bold: true, fgColor: "color06" }),
      Spacer(),
      Text(theme.help, { fgColor: "color08" }),
    ]),
    Divider({ fgColor: "color08" }),
    VStack(
      {
        flex: 1,
        overflow: "scroll",
        scrollbar: true,
        padding: { x: 1 },
      },
      [SyntaxHighlight(content, sample.language, { theme: theme.theme })],
    ),
  ]);
}

function mainView(cols: number) {
  const wide = cols >= SIDE_BY_SIDE_MIN_COLS;

  if (wide) {
    return HStack({ flex: 1 }, [
      VStack({ width: 42, overflow: "scroll", scrollbar: true }, [infoPane()]),
      VDivider({ fgColor: "color08" }),
      highlightPane(),
    ]);
  }

  return VStack({ flex: 1 }, [
    infoPane(),
    Divider({ fgColor: "color08" }),
    highlightPane(),
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
          if (key === "ctrl+q" || key === "ctrl+c") {
            quit();
          }
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
      overflow: "scroll",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") {
          quit();
        }
        if (key === "ctrl+r") {
          resetCurrentSample();
        }
        if (key === "ctrl+t") {
          toggleTheme();
        }
        if (key === "space") {
          togglePause();
        }
        if (key === "left" || key === "shift+tab") {
          selectSample(-1);
        }
        if (key === "right" || key === "tab") {
          selectSample(1);
        }
      },
    },
    [
      HStack({ padding: { x: 1 }, gap: 2 }, [
        Text("SyntaxHighlight example", { bold: true, fgColor: "color06" }),
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

resetCurrentSample();
