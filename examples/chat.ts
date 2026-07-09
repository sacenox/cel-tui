/**
 * cel-tui: Agentic Chat UI
 *
 * A polished chat demo showing:
 * - Scrollable message history with sticky-bottom behavior
 * - Streaming markdown responses
 * - Controlled TextInput focus
 * - Buttons, starter prompts, and keyboard shortcuts
 * - Explicit external state with a small render tree
 *
 * Run: bun run examples/chat.ts
 */

import {
  Button,
  Divider,
  Markdown,
  Spacer,
  Spinner,
} from "@cel-tui/components";
import {
  cel,
  HStack,
  ProcessTerminal,
  Text,
  TextInput,
  VStack,
} from "@cel-tui/core";
import { warningBox } from "./warning-box";

const MIN_COLS = 56;
const MIN_ROWS = 18;

const RESPONSES = [
  `Here’s the high-level layout model.

## cel-tui in one screen

- **VStack** lays children out top-to-bottom
- **HStack** lays children out left-to-right
- **Text** is a pure leaf node
- **TextInput** is an editable container

\`flex\`, fixed sizes, padding, and gap work together to make terminal layout feel predictable.`,

  `A good focus + scroll pattern usually looks like this:

1. Let the framework manage focus by default
2. Only control focus when app logic genuinely needs it
3. Use \`scrollOffset: Infinity\` for sticky-bottom UIs
4. Keep state outside the framework, then call \`cel.render()\`

> The framework owns rendering. Your app owns state.`,

  `Markdown is a fun fit for chat UIs because it makes streamed responses feel richer.

\`\`\`ts
const history = VStack(
  { flex: 1, overflow: "scroll", scrollbar: true },
  messages.flatMap(renderMessage)
);
\`\`\`

That lets you mix **lists**, *emphasis*, code fences, and quotes without building a separate renderer.`,

  `If you want the app to feel polished, focus on a few small UX details:

- starter actions when the screen is empty
- clear keyboard hints
- sticky scroll when new content arrives
- buttons that still work well with Tab + Enter

---

That’s the kind of “boring but good” structure cel-tui is great at.`,
];

const STARTER_PROMPTS = [
  {
    label: "layout",
    prompt: "Explain cel-tui's layout model in one screen.",
  },
  {
    label: "focus + scroll",
    prompt: "What focus and scroll patterns work well in cel-tui?",
  },
  {
    label: "markdown",
    prompt: "Why does markdown work nicely for terminal chat demos?",
  },
  {
    label: "ux tips",
    prompt: "Give me a few concrete UX tips for a cel-tui app.",
  },
] as const;

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

const spinner = Spinner({ maxFps: 12.5 });

function startSpinner() {
  spinner.reset();
  spinner.start();
}

function stopSpinner() {
  spinner.stop();
}

function stopStreaming() {
  if (streamTimer) {
    clearTimeout(streamTimer);
    streamTimer = null;
  }
  stopSpinner();
}

function isStreaming(): boolean {
  return streamTimer !== null;
}

function canSend(text = input): boolean {
  return text.trim().length > 0 && !isStreaming();
}

function streamNextChar() {
  const agentMessage = messages[messages.length - 1];
  if (agentMessage?.role !== "agent") {
    stopStreaming();
    return;
  }

  if (streamPos < streamSource.length) {
    const chunk = streamSource.slice(streamPos, streamPos + 4);
    streamPos += chunk.length;
    agentMessage.content = streamSource.slice(0, streamPos);
    cel.render();
    streamTimer = setTimeout(streamNextChar, 14);
    return;
  }

  agentMessage.streaming = false;
  streamTimer = null;
  stopSpinner();
  cel.render();
}

function queueResponse(response: string) {
  streamSource = response;
  streamPos = 0;
  messages.push({ role: "agent", content: "", streaming: true });
  startSpinner();
  streamTimer = setTimeout(streamNextChar, 240);
}

function handleSend(nextText = input) {
  const text = nextText.trim();
  if (!canSend(nextText)) return;

  messages.push({ role: "user", content: text });
  input = "";
  stickToBottom = true;

  const response = RESPONSES[responseIndex % RESPONSES.length]!;
  responseIndex++;
  queueResponse(response);
  cel.render();
}

function handleChange(value: string) {
  input = value;
  cel.render();
}

function resetChat() {
  stopStreaming();
  messages = [];
  input = "";
  responseIndex = 0;
  streamSource = "";
  streamPos = 0;
  scrollOffset = 0;
  stickToBottom = true;
  inputFocused = true;
  cel.render();
}

function quit() {
  stopStreaming();
  spinner.dispose();
  cel.stop();
  process.exit(0);
}

function currentSpinner(): string {
  return spinner.current;
}

function renderMarkdownNode(node: ReturnType<typeof Markdown>[number]) {
  if (node.type === "text" && node.content === "") return node;
  return HStack({}, [Text("  "), VStack({ flex: 1 }, [node])]);
}

function renderMessage(message: Message) {
  const isUser = message.role === "user";
  const accent = isUser ? "color04" : "color02";
  const label = isUser ? "You" : "Demo Agent";
  const icon = isUser ? "▶" : "✦";
  const spinner = message.streaming ? ` ${currentSpinner()}` : "";

  return VStack(
    {
      gap: 0,
      padding: { x: 1 },
      bgColor: isUser ? "color08" : undefined,
    },
    [
      Text(`${icon} ${label}${spinner}`, {
        bold: true,
        fgColor: accent,
      }),
      ...(isUser
        ? [Text(message.content, { wrap: "word" })]
        : message.content.length > 0
          ? Markdown(message.content).map(renderMarkdownNode)
          : [
              Text(`  ${currentSpinner()} thinking...`, {
                fgColor: "color08",
                italic: true,
              }),
            ]),
    ],
  );
}

function renderStarterPrompts() {
  return HStack(
    { flexWrap: "wrap", gap: 1, justifyContent: "center" },
    STARTER_PROMPTS.map((starter) =>
      Button(` ${starter.label} `, {
        onClick: () => handleSend(starter.prompt),
        fgColor: "color06",
        bold: true,
        focusStyle: { bgColor: "color06", fgColor: "color00" },
      }),
    ),
  );
}

function emptyState(compact = false) {
  const intro = VStack({ alignItems: "center", gap: 1, padding: { x: 2 } }, [
    Text("Ask the demo agent about cel-tui", {
      bold: true,
      fgColor: "color06",
    }),
    Text("Starter prompts stream markdown replies.", {
      fgColor: "color08",
    }),
    ...(compact
      ? []
      : [
          Text("They also keep the first screen from feeling empty.", {
            fgColor: "color08",
          }),
          Text("Try one of these:", { fgColor: "color08", italic: true }),
        ]),
    renderStarterPrompts(),
  ]);

  return compact ? [intro] : [Spacer(), intro, Spacer()];
}

cel.init(new ProcessTerminal());
cel.viewport(() => {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const compact = cols < 70;
  const sendLabel = isStreaming() ? " Wait " : " Send ";
  const sendColor = canSend() ? "color06" : "color08";
  const placeholderText = compact
    ? "ask about layout or ux..."
    : "ask about layout, focus, markdown, or UX...";

  const composerInput = TextInput({
    flex: 1,
    maxHeight: 5,
    value: input,
    onChange: handleChange,
    placeholder: Text(placeholderText, {
      fgColor: "color08",
    }),
    onKeyPress: (key) => {
      if (key === "enter") {
        handleSend();
        return false;
      }
    },
    focused: inputFocused,
    onFocus: () => {
      inputFocused = true;
      cel.render();
    },
    onBlur: () => {
      inputFocused = false;
      cel.render();
    },
  });

  const clearButton = Button(" Clear ", {
    onClick: resetChat,
    fgColor: "color08",
    focusStyle: { bgColor: "color08", fgColor: "color00" },
  });

  const sendButton = Button(sendLabel, {
    onClick: () => handleSend(),
    bgColor: sendColor,
    fgColor: "color00",
    bold: true,
    focusStyle: { bgColor: "color06", fgColor: "color00" },
  });

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
        if (key === "ctrl+l") resetChat();
      },
    },
    [
      HStack(
        {
          height: 1,
          padding: { x: 1 },
          bgColor: "color04",
          fgColor: "color07",
        },
        [
          Text(" Demo Agent ", { bold: true }),
          Spacer(),
          Text(isStreaming() ? `${currentSpinner()} streaming` : "ready"),
          Text("  "),
          Text(`${messages.length} msgs`, { fgColor: "color15" }),
        ],
      ),
      compact
        ? HStack({ padding: { x: 1 } }, [
            Text("Starter prompts, markdown streaming, sticky scroll.", {
              fgColor: "color08",
            }),
          ])
        : HStack({ padding: { x: 1 }, gap: 2 }, [
            Text("Simulated replies with markdown streaming.", {
              fgColor: "color08",
            }),
            Spacer(),
            Text("Ctrl+L clear", { fgColor: "color08" }),
          ]),
      Divider({ fgColor: "color08" }),
      VStack(
        {
          flex: 1,
          overflow: "scroll",
          scrollbar: true,
          padding: { x: 1, y: 1 },
          gap: 1,
          scrollOffset: stickToBottom ? Infinity : scrollOffset,
          onScroll: (offset, maxOffset) => {
            scrollOffset = offset;
            stickToBottom = offset >= maxOffset;
            cel.render();
          },
        },
        messages.length > 0 ? messages.map(renderMessage) : emptyState(compact),
      ),
      Divider({ fgColor: "color08" }),
      ...(compact
        ? [
            VStack({ padding: { x: 1 }, gap: 1 }, [
              HStack({ gap: 1 }, [
                Text(">", {
                  fgColor: canSend() ? "color06" : "color08",
                  bold: true,
                }),
                composerInput,
              ]),
              HStack({ justifyContent: "end", gap: 1 }, [
                clearButton,
                sendButton,
              ]),
            ]),
          ]
        : [
            HStack({ padding: { x: 1 }, gap: 1 }, [
              Text(">", {
                fgColor: canSend() ? "color06" : "color08",
                bold: true,
              }),
              composerInput,
              clearButton,
              sendButton,
            ]),
          ]),
      HStack({ padding: { x: 1 }, gap: 1, flexWrap: "wrap" }, [
        Text("Enter", { fgColor: "color08", bold: true }),
        Text("send", { fgColor: "color08" }),
        Text("·", { fgColor: "color08" }),
        Text("Tab", { fgColor: "color08", bold: true }),
        Text("move focus", { fgColor: "color08" }),
        Text("·", { fgColor: "color08" }),
        Text("Esc", { fgColor: "color08", bold: true }),
        Text("blur", { fgColor: "color08" }),
        Text("·", { fgColor: "color08" }),
        Text("Ctrl+Q", { fgColor: "color08", bold: true }),
        Text("quit", { fgColor: "color08" }),
      ]),
    ],
  );
});
