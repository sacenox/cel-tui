/**
 * cel-tui: Agentic Chat UI
 *
 * A simulated agentic chat interface showcasing the full API:
 * - Markdown rendering in streamed agent responses
 * - TextInput with controlled focus
 * - Scrollable message history
 * - Button with focusStyle
 * - Divider, Spacer components
 * - Key bindings (Ctrl+Q quit, Escape/Tab focus traversal)
 *
 * The agent responses are simulated — characters stream in one by
 * one with a small delay, exercising the Markdown component's
 * streaming behavior.
 *
 * Run: bun run examples/chat.ts
 */

import {
  cel,
  VStack,
  HStack,
  Text,
  TextInput,
  ProcessTerminal,
} from "@cel-tui/core";
import { Button, Divider, Markdown, Spacer } from "@cel-tui/components";

// ─── Simulated Agent Responses ──────────────────────────────────

const RESPONSES = [
  `I'll check that for you.

\`\`\`
$ ls -la
file1.ts
file2.ts
README.md
\`\`\`

Found **3 files** in the current directory.`,

  `Here's a quick overview:

## Project Structure

- **file1.ts** — Main entry point
- **file2.ts** — Utility functions
- **README.md** — Project documentation

> All files were last modified today.`,

  `Sure, I can help with that. Here's a code snippet:

\`\`\`ts
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("world"));
\`\`\`

This defines a simple \`greet\` function that returns a formatted string.

---

Let me know if you need anything else!`,

  `Here's what I found:

### Summary

1. The project uses **TypeScript** with strict mode
2. Dependencies are managed via \`bun\`
3. Tests use the built-in \`bun test\` runner

> The codebase follows conventional commits and has pre-commit hooks.

Everything looks good!`,
];

// ─── State ──────────────────────────────────────────────────────

interface Message {
  role: "user" | "agent";
  content: string;
  streaming?: boolean;
}

let messages: Message[] = [];
let input = "";
let inputFocused = true;
let responseIndex = 0;
let streamTimer: ReturnType<typeof setTimeout> | null = null;
let streamSource = "";
let streamPos = 0;
let scrollOffset = 0;
let stickToBottom = true;

// ─── Helpers ────────────────────────────────────────────────────

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerTick = 0;
let spinnerTimer: ReturnType<typeof setInterval> | null = null;

function startSpinner() {
  stopSpinner();
  spinnerTimer = setInterval(() => {
    spinnerTick++;
    cel.render();
  }, 80);
}

function stopSpinner() {
  if (spinnerTimer) {
    clearInterval(spinnerTimer);
    spinnerTimer = null;
  }
}

function isStreaming(): boolean {
  return streamTimer !== null;
}

function streamNextChar() {
  const agentMsg = messages[messages.length - 1];
  if (!agentMsg || agentMsg.role !== "agent") return;

  if (streamPos < streamSource.length) {
    // Stream a few characters at a time for speed
    const chunk = streamSource.slice(streamPos, streamPos + 3);
    streamPos += chunk.length;
    agentMsg.content = streamSource.slice(0, streamPos);
    cel.render();
    streamTimer = setTimeout(streamNextChar, 15);
  } else {
    // Done streaming
    agentMsg.streaming = false;
    streamTimer = null;
    stopSpinner();
    cel.render();
  }
}

function handleSend() {
  const text = input.trim();
  if (text.length === 0 || isStreaming()) return;

  // Add user message
  messages.push({ role: "user", content: text });
  input = "";
  stickToBottom = true;

  // Pick a response and start streaming
  streamSource = RESPONSES[responseIndex % RESPONSES.length]!;
  responseIndex++;
  streamPos = 0;
  messages.push({ role: "agent", content: "", streaming: true });

  startSpinner();
  streamTimer = setTimeout(streamNextChar, 300);
  cel.render();
}

function handleChange(value: string) {
  input = value;
  cel.render();
}

function quit() {
  stopSpinner();
  if (streamTimer) clearTimeout(streamTimer);
  cel.stop();
  process.exit(0);
}

// ─── Message Rendering ──────────────────────────────────────────

function renderMessage(msg: Message, idx: number) {
  const isUser = msg.role === "user";
  const icon = isUser ? "▶" : "▷";
  const label = isUser ? "You" : "Agent";
  const color = isUser ? "blue" : "green";

  const spinner =
    msg.streaming && msg.content.length > 0
      ? ` ${spinnerFrames[spinnerTick % spinnerFrames.length]}`
      : "";

  return VStack({ gap: 0 }, [
    // Role header
    HStack({ gap: 1 }, [
      Text(`${icon} ${label}${spinner}`, { bold: true, fgColor: color }),
    ]),

    // Content
    ...(isUser
      ? [Text(`  ${msg.content}`, { wrap: "word" })]
      : msg.content.length > 0
        ? Markdown(msg.content).map((node) => {
            // Indent agent content by wrapping in a padded container
            if (node.type === "text" && node.content === "") return node;
            return HStack({}, [Text("  "), VStack({ flex: 1 }, [node])]);
          })
        : [
            Text(
              `  ${spinnerFrames[spinnerTick % spinnerFrames.length]} thinking...`,
              { fgColor: "brightBlack", italic: true },
            ),
          ]),
  ]);
}

// ─── UI ─────────────────────────────────────────────────────────

cel.init(new ProcessTerminal());

cel.viewport(() =>
  VStack(
    {
      height: "100%",
      fgColor: "white",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
      },
    },
    [
      // ── Header ──
      HStack({ height: 1, padding: { x: 1 }, bgColor: "blue" }, [
        Text(" Agent ", { bold: true, fgColor: "white", bgColor: "blue" }),
        Spacer(),
        Text("model: gpt-4", { fgColor: "brightBlack" }),
      ]),
      Divider({ fgColor: "brightBlack" }),

      // ── Message History ──
      VStack(
        {
          flex: 1,
          overflow: "scroll",
          scrollbar: true,
          padding: { x: 1 },
          scrollOffset: stickToBottom ? Infinity : scrollOffset,
          onScroll: (offset, maxOffset) => {
            scrollOffset = offset;
            stickToBottom = offset >= maxOffset;
            cel.render();
          },
        },
        messages.length > 0
          ? messages.flatMap((msg, i) => [
              ...(i > 0 ? [Text("")] : []),
              renderMessage(msg, i),
            ])
          : [
              Spacer(),
              VStack({ alignItems: "center" }, [
                Text("No messages yet.", {
                  fgColor: "brightBlack",
                  italic: true,
                }),
                Text("Type a message below to start.", {
                  fgColor: "brightBlack",
                }),
              ]),
              Spacer(),
            ],
      ),

      // ── Input Area ──
      Divider({ fgColor: "brightBlack" }),
      HStack({ padding: { x: 1 }, gap: 1 }, [
        Text(">", { fgColor: "cyan", bold: true }),
        TextInput({
          flex: 1,
          maxHeight: 5,
          value: input,
          onChange: handleChange,
          placeholder: Text("type a message...", { fgColor: "brightBlack" }),
          onSubmit: handleSend,
          focused: inputFocused,
          onFocus: () => {
            inputFocused = true;
            cel.render();
          },
          onBlur: () => {
            inputFocused = false;
            cel.render();
          },
        }),
        Button(" Send ", {
          onClick: handleSend,
          bgColor: "brightBlack",
          bold: true,
          focusStyle: { bgColor: "cyan", fgColor: "black" },
        }),
      ]),
    ],
  ),
);
