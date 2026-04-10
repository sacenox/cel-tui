/**
 * cel-tui: SyntaxHighlight demo
 *
 * Streams TypeScript code into the SyntaxHighlight component.
 * Shows lazy Shiki loading plus append-only incremental highlighting.
 *
 * Run: bun run examples/syntax-highlight.ts
 */

import { cel, VStack, HStack, Text, ProcessTerminal } from "@cel-tui/core";
import {
  Divider,
  Spacer,
  SyntaxHighlight,
  type SyntaxHighlightTheme,
} from "@cel-tui/components";

const LANGUAGE = "typescript";
const MIN_COLS = 52;
const MIN_ROWS = 16;
const CHUNK_SIZE = 3;
const TICK_MS = 18;

const CUSTOM_THEME: SyntaxHighlightTheme = {
  name: "cel-demo-sunset",
  type: "dark",
  fg: "#f8f8f2",
  bg: "#1f2335",
  tokenColors: [
    { settings: { foreground: "#f8f8f2" } },
    {
      scope: ["comment", "string.quoted.docstring.multi"],
      settings: { foreground: "#7f849c", fontStyle: "italic" },
    },
    {
      scope: ["keyword", "storage", "entity.name.operator"],
      settings: { foreground: "#ff79c6" },
    },
    {
      scope: ["string", "markup.inline"],
      settings: { foreground: "#f1fa8c" },
    },
    {
      scope: ["constant.numeric", "constant.language", "constant.character"],
      settings: { foreground: "#ffb86c" },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: { foreground: "#50fa7b" },
    },
    {
      scope: [
        "entity.name.type",
        "support.type",
        "support.class",
        "entity.other.inherited-class",
      ],
      settings: { foreground: "#8be9fd" },
    },
    {
      scope: [
        "variable.parameter",
        "meta.object-literal.key",
        "meta.property-name",
      ],
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
    help: "Custom Shiki theme remapped onto cel ANSI slots.",
    theme: CUSTOM_THEME,
  },
];

const FULL_CODE = [
  "/**",
  " * Streaming syntax highlight demo.",
  " */",
  "interface User {",
  "  id: number;",
  "  name: string;",
  "}",
  "",
  "const users: User[] = [",
  '  { id: 1, name: "Ada" },',
  '  { id: 2, name: "Linus" },',
  "];",
  "",
  "function greet(user: User): string {",
  "  return `Hello, ${user.name}!`;",
  "}",
  "",
  "/* Multi-line comment to test streamed grammar state */",
  "for (const user of users) {",
  "  console.log(greet(user));",
  "}",
  "Long ass line to see the wrapping behaviuour on the example.Long ass line to see the wrapping behaviuour on the example.Long ass line to see the wrapping behaviuour on the example.Long ass line to see the wrapping behaviuour on the example.Long ass line to see the wrapping behaviuour on the example.Long ass line to see the wrapping behaviuour on the example.",
].join("\n");

let content = "";
let paused = false;
let themeIndex = 0;
let streamTimer: ReturnType<typeof setTimeout> | null = null;

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

function isDone(): boolean {
  return content.length >= FULL_CODE.length;
}

function startStreaming() {
  stopStreaming();
  if (isDone() || paused) return;
  streamTimer = setTimeout(streamNext, TICK_MS);
}

function streamNext() {
  if (paused || isDone()) {
    streamTimer = null;
    cel.render();
    return;
  }

  content += FULL_CODE.slice(content.length, content.length + CHUNK_SIZE);
  cel.render();

  if (isDone()) {
    streamTimer = null;
    return;
  }

  streamTimer = setTimeout(streamNext, TICK_MS);
}

function restart() {
  content = "";
  paused = false;
  startStreaming();
  cel.render();
}

function togglePause() {
  if (isDone()) return;
  paused = !paused;
  if (!paused) startStreaming();
  else stopStreaming();
  cel.render();
}

function toggleTheme() {
  themeIndex = (themeIndex + 1) % THEME_OPTIONS.length;
  cel.render();
}

startStreaming();

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
        Text("┌───────────────────────────────┐", { fgColor: "color03" }),
        Text("│  Terminal too small :(       │", { fgColor: "color03" }),
        Text("│                               │", { fgColor: "color03" }),
        Text("│  Please resize to at least   │", { fgColor: "color03" }),
        Text(
          `│  ${String(MIN_COLS).padStart(3)}×${String(MIN_ROWS).padStart(2)} characters.        │`,
          { fgColor: "color03" },
        ),
        Text("│                               │", { fgColor: "color03" }),
        Text("│  Ctrl+Q to quit              │", { fgColor: "color03" }),
        Text("└───────────────────────────────┘", { fgColor: "color03" }),
      ],
    );
  }

  const status = isDone() ? "done" : paused ? "paused" : "streaming";
  const statusColor = isDone() ? "color02" : paused ? "color03" : "color06";
  const theme = THEME_OPTIONS[themeIndex]!;

  return VStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        if (key === "ctrl+r") restart();
        if (key === "ctrl+p") togglePause();
        if (key === "ctrl+t") toggleTheme();
      },
    },
    [
      HStack({ padding: { x: 1 }, gap: 2 }, [
        Text("SyntaxHighlight Demo", { bold: true, fgColor: "color06" }),
        Spacer(),
        Text(`theme: ${theme.label}`, { fgColor: "color03" }),
        Text(LANGUAGE, { fgColor: "color08" }),
      ]),
      Divider({ fgColor: "color08" }),
      HStack({ padding: { x: 1 }, gap: 2 }, [
        Text(`status: ${status}`, { fgColor: statusColor, bold: true }),
        Text(`chars: ${content.length}/${FULL_CODE.length}`, {
          fgColor: "color08",
        }),
      ]),
      HStack({ padding: { x: 1 } }, [
        Text(theme.help, {
          fgColor: "color08",
          italic: true,
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
        [SyntaxHighlight(content, LANGUAGE, { theme: theme.theme })],
      ),
      Divider({ fgColor: "color08" }),
      VStack({ padding: { x: 1 } }, [
        HStack({ gap: 1 }, [
          Text("Ctrl+R", {
            fgColor: "color07",
            bgColor: "color08",
            bold: true,
          }),
          Text("restart", { fgColor: "color08" }),
          Text("  "),
          Text("Ctrl+P", {
            fgColor: "color07",
            bgColor: "color08",
            bold: true,
          }),
          Text("pause", { fgColor: "color08" }),
          Text("  "),
          Text("Ctrl+T", {
            fgColor: "color07",
            bgColor: "color08",
            bold: true,
          }),
          Text("theme", { fgColor: "color08" }),
        ]),
        HStack({ gap: 1 }, [
          Spacer(),
          Text("Ctrl+Q", {
            fgColor: "color07",
            bgColor: "color08",
            bold: true,
          }),
          Text("quit", { fgColor: "color08" }),
        ]),
      ]),
    ],
  );
});
