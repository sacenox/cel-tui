/**
 * cel-tui: SyntaxHighlight demo
 *
 * Streams TypeScript code into the SyntaxHighlight component.
 * Shows lazy Shiki loading plus append-only incremental highlighting.
 *
 * Run: bun run examples/syntax-highlight.ts
 */

import { cel, VStack, HStack, Text, ProcessTerminal } from "@cel-tui/core";
import { Divider, Spacer, SyntaxHighlight } from "@cel-tui/components";

const LANGUAGE = "typescript";
const MIN_COLS = 52;
const MIN_ROWS = 16;
const CHUNK_SIZE = 3;
const TICK_MS = 18;

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
].join("\n");

let content = "";
let paused = false;
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

  return VStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        if (key === "ctrl+r") restart();
        if (key === "ctrl+p") togglePause();
      },
    },
    [
      HStack({ padding: { x: 1 } }, [
        Text("SyntaxHighlight Demo", { bold: true, fgColor: "color06" }),
        Spacer(),
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
        Text("Shiki loads lazily. Colors appear after first render.", {
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
        [SyntaxHighlight(content, LANGUAGE)],
      ),
      Divider({ fgColor: "color08" }),
      HStack({ padding: { x: 1 }, gap: 1 }, [
        Text("Ctrl+R", { fgColor: "color07", bgColor: "color08", bold: true }),
        Text("restart", { fgColor: "color08" }),
        Text("  "),
        Text("Ctrl+P", { fgColor: "color07", bgColor: "color08", bold: true }),
        Text("pause/resume", { fgColor: "color08" }),
        Spacer(),
        Text("Ctrl+Q quit", { fgColor: "color08" }),
      ]),
    ],
  );
});
