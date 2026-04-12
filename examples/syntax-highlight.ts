/**
 * cel-tui: SyntaxHighlight streaming demo
 *
 * Streams every built-in lextide language through SyntaxHighlight.
 * The large pane renders SyntaxHighlight, while the stream board mirrors
 * lextide's recall/stable/unstable updates for the same append-only chunks.
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
import {
  all,
  createLowlight,
  type HighlightStream,
  type StreamUpdate,
} from "lextide";
import { warningBox } from "./warning-box";

const lowlight = createLowlight(all);

const MIN_COLS = 72;
const MIN_ROWS = 22;
const STACKED_MIN_ROWS = 29;
const SIDE_BY_SIDE_MIN_COLS = 116;
const TICK_MS = 72;

const CUSTOM_THEME: SyntaxHighlightTheme = {
  name: "cel-demo-sunset",
  type: "dark",
  fg: "#f8f8f2",
  bg: "#1f2335",
  tokenColors: [
    { settings: { foreground: "#f8f8f2" } },
    {
      scope: ["comment", "quote", "doctag"],
      settings: { foreground: "#7f849c", fontStyle: "italic" },
    },
    {
      scope: ["keyword", "operator"],
      settings: { foreground: "#ff79c6" },
    },
    {
      scope: ["string", "code"],
      settings: { foreground: "#f1fa8c" },
    },
    {
      scope: ["number", "literal", "escape", "symbol"],
      settings: { foreground: "#ffb86c" },
    },
    {
      scope: ["function_", "title"],
      settings: { foreground: "#50fa7b" },
    },
    {
      scope: ["class_", "type", "built_in", "inherited__"],
      settings: { foreground: "#8be9fd" },
    },
    {
      scope: ["params", "property", "attr", "attribute", "selector-attr"],
      settings: { foreground: "#bd93f9" },
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
    help: "Default theme follows terminal defaults plus ANSI slots.",
  },
  {
    label: "custom sunset",
    help: "Custom token theme remapped onto cel ANSI slots.",
    theme: CUSTOM_THEME,
  },
];

interface DemoSample {
  language: string;
  title: string;
  aliases: readonly string[];
  description: string;
  chunkSize: number;
  source: string;
}

const SAMPLE_BY_LANGUAGE = {
  bash: {
    title: "Bash",
    aliases: ["sh", "shell", "zsh"],
    description: "Variables, conditionals, and a heredoc.",
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
      "keep parser state warm",
      "EOF",
      "fi",
    ].join("\n"),
  },
  javascript: {
    title: "JavaScript",
    aliases: ["js", "jsx", "mjs", "cjs"],
    description: "Async code, destructuring, and template literals.",
    chunkSize: 5,
    source: [
      "async function loadUsers(signal) {",
      '  const response = await fetch("/api/users", { signal });',
      "  if (!response.ok) {",
      "    throw new Error(`HTTP ${response.status}`);",
      "  }",
      "  const users = await response.json();",
      "  return users",
      "    .map(({ id, name }) => `${id}:${name}`)",
      '    .join(", ");',
      "}",
    ].join("\n"),
  },
  markdown: {
    title: "Markdown",
    aliases: ["md", "mkdown", "mkd"],
    description: "Headings, lists, inline code, and a fenced block.",
    chunkSize: 6,
    source: [
      "# Streaming markdown",
      "",
      "`SyntaxHighlight` keeps append-only updates cheap.",
      "",
      "- headings",
      "- emphasis",
      "- `inline code`",
      "",
      "```ts",
      'const status = "streaming";',
      "console.log(status);",
      "```",
      "",
      "> Fences and inline spans arrive a few bytes at a time.",
    ].join("\n"),
  },
  python: {
    title: "Python",
    aliases: ["py"],
    description:
      "Decorators, dataclasses, triple-quoted strings, and f-strings.",
    chunkSize: 5,
    source: [
      "from dataclasses import dataclass",
      "",
      "@dataclass(slots=True)",
      "class Job:",
      "    name: str",
      "    retries: int = 0",
      "",
      "def describe(job: Job) -> str:",
      '    note = """append-only streams',
      '    stay highlighted across chunks"""',
      '    return f"{job.name}:{job.retries} -> {note.strip()}"',
    ].join("\n"),
  },
  typescript: {
    title: "TypeScript",
    aliases: ["ts", "tsx", "mts", "cts"],
    description: "Types, generics, comments, and a template literal.",
    chunkSize: 4,
    source: [
      "/**",
      " * Streaming state stays append-only.",
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
} satisfies Record<string, Omit<DemoSample, "language">>;

function hasDemoSample(
  language: string,
): language is keyof typeof SAMPLE_BY_LANGUAGE {
  return Object.prototype.hasOwnProperty.call(SAMPLE_BY_LANGUAGE, language);
}

const REGISTERED_LANGUAGES = lowlight.listLanguages().sort();
const MISSING_SAMPLES = REGISTERED_LANGUAGES.filter(
  (language) => !hasDemoSample(language),
);

if (MISSING_SAMPLES.length > 0) {
  throw new Error(
    `Missing syntax-highlight demo samples for lextide languages: ${MISSING_SAMPLES.join(", ")}`,
  );
}

const DEMO_SAMPLES: readonly DemoSample[] = REGISTERED_LANGUAGES.map(
  (language) => {
    if (!hasDemoSample(language)) {
      throw new Error(`Unsupported demo language: ${language}`);
    }

    return {
      language,
      ...SAMPLE_BY_LANGUAGE[language],
    };
  },
);

interface StreamDelta {
  recall: number;
  stable: number;
  unstable: number;
}

interface DemoStreamState {
  sample: DemoSample;
  content: string;
  chunks: number;
  lastChunk: string;
  lastUpdate: StreamDelta;
  stream: HighlightStream;
}

const EMPTY_DELTA: StreamDelta = {
  recall: 0,
  stable: 0,
  unstable: 0,
};

let streams = createStreams();
let paused = false;
let themeIndex = 0;
let selectedIndex = Math.max(
  0,
  DEMO_SAMPLES.findIndex((sample) => sample.language === "typescript"),
);
let streamTimer: ReturnType<typeof setTimeout> | null = null;

function createStreamState(sample: DemoSample): DemoStreamState {
  return {
    sample,
    content: "",
    chunks: 0,
    lastChunk: "",
    lastUpdate: EMPTY_DELTA,
    stream: lowlight.stream(sample.language, { allowRecalls: true }),
  };
}

function createStreams(): DemoStreamState[] {
  return DEMO_SAMPLES.map(createStreamState);
}

function quit() {
  stopStreaming();
  cel.stop();
  process.exit(0);
}

function stopStreaming() {
  if (streamTimer) {
    clearTimeout(streamTimer);
    streamTimer = null;
  }
}

function isStreamDone(state: DemoStreamState): boolean {
  return state.content.length >= state.sample.source.length;
}

function isDone(): boolean {
  return streams.every(isStreamDone);
}

function startStreaming() {
  stopStreaming();
  if (paused || isDone()) {
    return;
  }
  streamTimer = setTimeout(streamNext, TICK_MS);
}

function applyTelemetry(
  state: DemoStreamState,
  chunk: string,
  update: StreamUpdate,
): void {
  state.content += chunk;
  state.chunks += 1;
  state.lastChunk = chunk;
  state.lastUpdate = {
    recall: update.recall,
    stable: update.stable.length,
    unstable: update.unstable.length,
  };
}

function streamNext() {
  if (paused || isDone()) {
    streamTimer = null;
    cel.render();
    return;
  }

  for (const state of streams) {
    if (isStreamDone(state)) {
      continue;
    }

    const nextLength = Math.min(
      state.sample.source.length,
      state.content.length + state.sample.chunkSize,
    );
    const chunk = state.sample.source.slice(state.content.length, nextLength);
    if (chunk.length === 0) {
      continue;
    }

    const update = state.stream.write(chunk);
    applyTelemetry(state, chunk, update);
  }

  cel.render();

  if (isDone()) {
    streamTimer = null;
    return;
  }

  streamTimer = setTimeout(streamNext, TICK_MS);
}

function restart() {
  streams = createStreams();
  paused = false;
  startStreaming();
  cel.render();
}

function togglePause() {
  if (isDone()) {
    return;
  }

  paused = !paused;
  if (paused) {
    stopStreaming();
  } else {
    startStreaming();
  }
  cel.render();
}

function toggleTheme() {
  themeIndex = (themeIndex + 1) % THEME_OPTIONS.length;
  cel.render();
}

function cycleSelection(delta: number) {
  selectedIndex =
    (selectedIndex + delta + streams.length) % Math.max(1, streams.length);
  cel.render();
}

function currentTheme() {
  return THEME_OPTIONS[themeIndex]!;
}

function globalStatus(): "done" | "paused" | "streaming" {
  if (isDone()) {
    return "done";
  }
  if (paused) {
    return "paused";
  }
  return "streaming";
}

function streamStatus(state: DemoStreamState): "done" | "paused" | "streaming" {
  if (isStreamDone(state)) {
    return "done";
  }
  if (paused) {
    return "paused";
  }
  return "streaming";
}

function statusColor(status: "done" | "paused" | "streaming") {
  if (status === "done") {
    return "color02";
  }
  if (status === "paused") {
    return "color03";
  }
  return "color06";
}

function percentComplete(state: DemoStreamState): number {
  return Math.round((state.content.length / state.sample.source.length) * 100);
}

function previewChunk(chunk: string, maxLength = 24): string {
  if (chunk.length === 0) {
    return "waiting";
  }

  const escaped = chunk
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t")
    .replaceAll('"', '\\"');

  if (escaped.length <= maxLength) {
    return escaped;
  }

  return `${escaped.slice(0, maxLength - 3)}...`;
}

function keycap(label: string) {
  return Text(` ${label} `, {
    fgColor: "color07",
    bgColor: "color08",
    bold: true,
  });
}

function languageChip(state: DemoStreamState, index: number) {
  const selected = index === selectedIndex;
  const status = streamStatus(state);
  const bgColor = selected
    ? "color06"
    : status === "done"
      ? "color10"
      : "color08";
  const fgColor = selected || status === "done" ? "color00" : "color07";

  return Text(` ${state.sample.language} `, {
    fgColor,
    bgColor,
    bold: true,
  });
}

function detailPane(theme?: SyntaxHighlightTheme) {
  const selected = streams[selectedIndex]!;
  const status = streamStatus(selected);

  return VStack({ flex: 1 }, [
    HStack(
      {
        height: 1,
        padding: { x: 1 },
        gap: 1,
        bgColor: "color08",
      },
      [
        Text(`${selected.sample.title} (${selected.sample.language})`, {
          bold: true,
          fgColor: "color06",
        }),
        Spacer(),
        Text(`${selected.content.length}/${selected.sample.source.length}`, {
          fgColor: "color15",
        }),
        Text(status, {
          fgColor: statusColor(status),
          bold: true,
        }),
      ],
    ),
    VStack({ padding: { x: 1 } }, [
      Text(selected.sample.description, {
        fgColor: "color08",
        italic: true,
      }),
      Text(`aliases: ${selected.sample.aliases.join(", ")}`, {
        fgColor: "color08",
      }),
      Text(
        `append-only: ${selected.sample.chunkSize} chars/tick | last delta r${selected.lastUpdate.recall} s${selected.lastUpdate.stable} u${selected.lastUpdate.unstable}`,
        {
          fgColor: "color08",
        },
      ),
      Text(`last chunk: "${previewChunk(selected.lastChunk, 30)}"`, {
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
      [SyntaxHighlight(selected.content, selected.sample.language, { theme })],
    ),
  ]);
}

function streamRow(state: DemoStreamState, index: number) {
  const selected = index === selectedIndex;
  const status = streamStatus(state);

  return VStack(
    {
      padding: { x: 1 },
      bgColor: selected ? "color08" : undefined,
    },
    [
      HStack({ gap: 1 }, [
        Text(selected ? ">" : " ", {
          fgColor: selected ? "color15" : "color08",
          bold: selected || undefined,
        }),
        Text(state.sample.title, {
          fgColor: selected ? "color15" : "color06",
          bold: true,
        }),
        Spacer(),
        Text(`${percentComplete(state)}%`, {
          fgColor: "color08",
        }),
        Text(status, {
          fgColor: statusColor(status),
          bold: true,
        }),
      ]),
      HStack({ gap: 1 }, [
        Text(`+"${previewChunk(state.lastChunk, 18)}"`, {
          fgColor: "color08",
        }),
        Spacer(),
        Text(`r${state.lastUpdate.recall}`, { fgColor: "color01" }),
        Text(`s${state.lastUpdate.stable}`, { fgColor: "color02" }),
        Text(`u${state.lastUpdate.unstable}`, { fgColor: "color03" }),
        Text(`c${state.chunks}`, { fgColor: "color06" }),
      ]),
    ],
  );
}

function streamBoard() {
  const status = globalStatus();

  return VStack({ flex: 1 }, [
    HStack(
      {
        height: 1,
        padding: { x: 1 },
        bgColor: "color08",
      },
      [
        Text("Live stream board", {
          bold: true,
          fgColor: "color06",
        }),
        Spacer(),
        Text(status, {
          fgColor: statusColor(status),
          bold: true,
        }),
      ],
    ),
    VStack({ padding: { x: 1 } }, [
      Text("Parallel lowlight.stream(..., { allowRecalls: true }).", {
        fgColor: "color08",
        italic: true,
      }),
      Text("Each row shows the last chunk plus r/s/u counts.", {
        fgColor: "color08",
        italic: true,
      }),
    ]),
    Divider({ fgColor: "color08" }),
    VStack(
      {
        flex: 1,
        overflow: "hidden",
      },
      streams.flatMap((state, index) => [
        streamRow(state, index),
        ...(index < streams.length - 1
          ? [Divider({ fgColor: "color08" })]
          : []),
      ]),
    ),
  ]);
}

startStreaming();

cel.init(new ProcessTerminal());
cel.viewport(() => {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const useSideBySide = cols >= SIDE_BY_SIDE_MIN_COLS;
  const minRows = useSideBySide ? MIN_ROWS : STACKED_MIN_ROWS;
  const theme = currentTheme();

  if (cols < MIN_COLS || rows < minRows) {
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
          "  Please resize to at least",
          `  ${String(MIN_COLS).padStart(3)}x${String(minRows).padStart(2)} characters.`,
          "",
          "  Ctrl+Q to quit",
        ]),
      ],
    );
  }

  const mainPane = useSideBySide
    ? HStack({ flex: 1 }, [
        detailPane(theme.theme),
        VDivider({ fgColor: "color08" }),
        streamBoard(),
      ])
    : VStack({ flex: 1 }, [
        detailPane(theme.theme),
        Divider({ fgColor: "color08" }),
        streamBoard(),
      ]);

  return VStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") {
          quit();
        }
        if (key === "ctrl+r") {
          restart();
        }
        if (key === "ctrl+p") {
          togglePause();
        }
        if (key === "ctrl+t") {
          toggleTheme();
        }
        if (key === "left" || key === "shift+tab") {
          cycleSelection(-1);
        }
        if (key === "right" || key === "tab") {
          cycleSelection(1);
        }
      },
    },
    [
      HStack({ padding: { x: 1 }, gap: 2 }, [
        Text("SyntaxHighlight streaming demo", {
          bold: true,
          fgColor: "color06",
        }),
        Spacer(),
        Text(`theme: ${theme.label}`, { fgColor: "color03" }),
        Text(`built-ins: ${DEMO_SAMPLES.length}`, { fgColor: "color08" }),
      ]),
      Divider({ fgColor: "color08" }),
      VStack({ padding: { x: 1 } }, [
        Text("All registered lextide built-ins stream in append-only chunks.", {
          fgColor: "color08",
          italic: true,
        }),
        Text(
          "The large pane renders SyntaxHighlight(); the board shows the matching lowlight.stream(...) deltas.",
          {
            fgColor: "color08",
            italic: true,
          },
        ),
        Text(theme.help, {
          fgColor: "color08",
        }),
      ]),
      HStack({ padding: { x: 1 }, gap: 1, flexWrap: "wrap" }, [
        ...streams.map(languageChip),
      ]),
      Divider({ fgColor: "color08" }),
      mainPane,
      Divider({ fgColor: "color08" }),
      VStack({ padding: { x: 1 } }, [
        HStack({ gap: 1, flexWrap: "wrap" }, [
          keycap("Left/Right"),
          Text("select language", { fgColor: "color08" }),
          keycap("Ctrl+P"),
          Text("pause", { fgColor: "color08" }),
          keycap("Ctrl+R"),
          Text("restart", { fgColor: "color08" }),
          keycap("Ctrl+T"),
          Text("theme", { fgColor: "color08" }),
          keycap("Ctrl+Q"),
          Text("quit", { fgColor: "color08" }),
        ]),
        Text(
          "Append-only only: restarting rebuilds every stream from empty; non-append edits would reset the streaming parser state.",
          {
            fgColor: "color08",
          },
        ),
      ]),
    ],
  );
});
