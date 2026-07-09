/**
 * Shared helpers for benchmark tree construction.
 */

import { HStack, Text, TextInput, VStack } from "@cel-tui/core";
import type { ContainerNode, Node, StyleProps } from "@cel-tui/types";

/** Build a flat VStack with N Text children. */
export function flatTree(n: number): ContainerNode {
  const children: Node[] = [];
  for (let i = 0; i < n; i++) {
    children.push(
      Text(`Line ${i}: The quick brown fox jumps over the lazy dog`),
    );
  }
  return VStack({ height: "100%" }, children);
}

/** Build a nested tree: depth levels of alternating VStack/HStack, `breadth` children per level. */
export function nestedTree(depth: number, breadth: number): ContainerNode {
  function build(d: number, isV: boolean): Node {
    if (d === 0) {
      return Text("leaf content here");
    }
    const children: Node[] = [];
    for (let i = 0; i < breadth; i++) {
      children.push(build(d - 1, !isV));
    }
    return isV ? VStack({ flex: 1 }, children) : HStack({ flex: 1 }, children);
  }
  return build(depth, true) as ContainerNode;
}

/** Build a styled tree with bgColor, fgColor, bold, focusStyle — stress inheritance. */
export function styledTree(n: number): ContainerNode {
  const children: Node[] = [];
  for (let i = 0; i < n; i++) {
    children.push(
      VStack({ fgColor: "color06", bgColor: "color00", padding: { x: 1 } }, [
        Text(`Styled line ${i}`, { bold: true, fgColor: "color03" }),
        HStack({ fgColor: "color07" }, [
          Text("left "),
          Text("right", { fgColor: "color02" }),
        ]),
      ]),
    );
  }
  return VStack(
    { height: "100%", fgColor: "color07", bgColor: "color04" },
    children,
  );
}

/** Build a scrollable tree with more content than fits. */
export function scrollableTree(lines: number): ContainerNode {
  const children: Node[] = [];
  for (let i = 0; i < lines; i++) {
    children.push(Text(`Scrollable line ${i}: lorem ipsum dolor sit amet`));
  }
  return VStack(
    { height: "100%", overflow: "scroll", scrollbar: true },
    children,
  );
}

/** Build a word-wrap heavy tree. */
export function wrappedTextTree(paragraphs: number): ContainerNode {
  const lorem =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.";
  const children: Node[] = [];
  for (let i = 0; i < paragraphs; i++) {
    children.push(Text(lorem, { wrap: "word" }));
  }
  return VStack({ height: "100%" }, children);
}

/** Build a tree resembling the Ink benchmark: styled text, flex layout, word-wrap. */
export function inkComparableTree(): ContainerNode {
  return VStack({ padding: { y: 1, x: 1 } }, [
    Text("Hello World", { underline: true, bold: true, fgColor: "color01" }),
    VStack({ width: 60 }, [
      Text(
        "Cupcake ipsum dolor sit amet candy candy. Sesame snaps cookie I love tootsie roll apple pie bonbon wafer. Caramels sesame snaps icing cotton candy I love cookie sweet roll. I love bonbon sweet.",
        { wrap: "word" },
      ),
    ]),
    VStack({}, [
      Text("Colors:", { fgColor: "color00", bgColor: "color07" }),
      VStack({ padding: { x: 1 } }, [
        Text("- Red", { fgColor: "color01" }),
        Text("- Blue", { fgColor: "color04" }),
        Text("- Green", { fgColor: "color02" }),
      ]),
    ]),
  ]);
}

/** Build a complex app-like tree (header, scrollable body, input bar). */
export function appTree(messageCount: number): ContainerNode {
  const messages: Node[] = [];
  for (let i = 0; i < messageCount; i++) {
    messages.push(
      VStack({}, [
        Text(`▶ User message ${i}`, { bold: true, fgColor: "color04" }),
        Text(
          `  This is the content of message ${i}. It can be quite long and detailed.`,
        ),
      ]),
    );
  }
  return VStack({ height: "100%", fgColor: "color07" }, [
    // Header
    HStack({ height: 1, padding: { x: 1 } }, [
      Text("Agent Chat", { bold: true }),
      VStack({ flex: 1 }, []),
      Text("model: gpt", { fgColor: "color08" }),
    ]),
    // Body
    VStack(
      { flex: 1, overflow: "scroll", scrollbar: true, padding: { x: 1 } },
      messages,
    ),
    // Input bar
    HStack({ height: 1, padding: { x: 1 }, gap: 1 }, [
      Text("> "),
      Text("type a message...", { fgColor: "color08" }),
      HStack({ bgColor: "color08" }, [Text("[Send]", { bold: true })]),
    ]),
  ]);
}

const TOKEN_TEXT = [
  "const",
  " ",
  "result",
  " ",
  "=",
  " ",
  "await",
  " ",
  "agent",
  ".",
  "run",
  "(",
  "{",
  " cwd",
  ": ",
  "projectRoot",
  ", ",
  "prompt",
  ": ",
  "message",
  " }",
  ")",
  ";",
  " // stream tool output",
];

const TOKEN_STYLES: StyleProps[] = [
  { fgColor: "color05", bold: true },
  { fgColor: "color07" },
  { fgColor: "color06" },
  { fgColor: "color07" },
  { fgColor: "color08" },
  { fgColor: "color07" },
  { fgColor: "color05", bold: true },
  { fgColor: "color07" },
  { fgColor: "color02" },
  { fgColor: "color08" },
  { fgColor: "color04" },
  { fgColor: "color08" },
  { fgColor: "color03" },
  { fgColor: "color06" },
  { fgColor: "color08" },
  { fgColor: "color02" },
  { fgColor: "color08" },
  { fgColor: "color06" },
  { fgColor: "color08" },
  { fgColor: "color02" },
  { fgColor: "color03" },
  { fgColor: "color08" },
  { fgColor: "color08" },
  { fgColor: "color08", italic: true },
];

const MESSAGE_BODIES = [
  "I'll inspect the rendering pipeline and then patch the benchmark helpers.",
  "Please add a regression case for wide token rows and scrollback-heavy conversations.",
  "tool: grep completed with 14 matches across packages/core/src/layout.ts and paint.ts",
  "The fix preserves controlled scroll offsets while keeping the cursor visible.",
];

const MESSAGE_KINDS = ["user", "assistant", "tool"] as const;

/** Build one wrapping HStack row with many styled Text token children. */
export function hstackTokenRow(tokenCount: number): ContainerNode {
  const children: Node[] = [];
  for (let i = 0; i < tokenCount; i++) {
    const index = i % TOKEN_TEXT.length;
    children.push(Text(TOKEN_TEXT[index], TOKEN_STYLES[index]));
  }
  return HStack({ flexWrap: "wrap" }, children);
}

/** Build a syntax-highlight-like block without depending on clew. */
export function syntaxLikeBlock(
  lines: number,
  tokensPerLine: number,
): ContainerNode {
  const children: Node[] = [];
  for (let i = 0; i < lines; i++) {
    children.push(
      HStack({ flexWrap: "wrap" }, [
        Text(`${String(i + 1).padStart(3, " ")} │ `, { fgColor: "color08" }),
        ...hstackTokenRow(tokensPerLine).children,
      ]),
    );
  }
  return VStack({ gap: 0 }, children);
}

/** Build one representative variable-height mini-coder conversation row. */
export function miniCoderMessage(index: number): ContainerNode {
  const kind = MESSAGE_KINDS[index % MESSAGE_KINDS.length];
  const isUser = kind === "user";
  const isTool = kind === "tool";
  const title = isUser ? "user" : isTool ? "tool" : "assistant";
  const color = isUser ? "color04" : isTool ? "color03" : "color02";
  const children: Node[] = [
    HStack({ gap: 1 }, [
      Text(title, { bold: true, fgColor: color }),
      Text(`#${index}`, { fgColor: "color08" }),
      Text(isTool ? "shell" : "chat", { fgColor: "color08" }),
    ]),
    Text(MESSAGE_BODIES[index % MESSAGE_BODIES.length], { wrap: "word" }),
  ];

  if (!isUser) {
    children.push(syntaxLikeBlock(isTool ? 3 : 5, isTool ? 10 : 16));
  }

  children.push(
    HStack({ gap: 1, flexWrap: "wrap" }, [
      HStack({ padding: { x: 1 }, bgColor: "color08" }, [
        Text(isTool ? "tool-call" : "tokens", { fgColor: "color00" }),
      ]),
      HStack({ padding: { x: 1 }, bgColor: "color00" }, [
        Text(isTool ? "exit 0" : `${800 + (index % 400)} tok`, {
          fgColor: "color07",
        }),
      ]),
      Text("cached", { fgColor: "color08" }),
    ]),
  );

  return VStack(
    {
      gap: 1,
      padding: { x: 1, y: 1 },
      bgColor: isUser ? "color00" : undefined,
      fgColor: "color07",
    },
    children,
  );
}

function miniCoderRoot(messages: Node[], totalMessages: number): ContainerNode {
  return VStack({ height: "100%", gap: 1, padding: { x: 1, y: 1 } }, [
    VStack(
      { flex: 1, gap: 1, overflow: "scroll", scrollOffset: Infinity },
      messages,
    ),
    HStack({ height: 1, gap: 1 }, [
      Text("mini-coder", { bold: true, fgColor: "color02" }),
      Text(`${totalMessages} messages`, { fgColor: "color08" }),
      Text("model: sonnet", { fgColor: "color08" }),
    ]),
    TextInput({
      height: 3,
      value: "Summarize the benchmark bottleneck and propose the next patch.",
      onChange: () => {},
      placeholder: Text("message mini-coder", { fgColor: "color08" }),
      bgColor: "color00",
      fgColor: "color07",
    }),
  ]);
}

/** Build a mini-coder-next-like unvirtualized conversation tree. */
export function miniCoderNextConversationTree(
  messageCount: number,
): ContainerNode {
  const messages: Node[] = [];
  for (let i = 0; i < messageCount; i++) {
    messages.push(miniCoderMessage(i));
  }
  return miniCoderRoot(messages, messageCount);
}

/**
 * Build a mini-coder-like virtualized conversation tree.
 * Only a visible slice is rendered; fixed-height spacers represent the rest.
 */
export function miniCoderVirtualizedConversationTree(
  totalMessages: number,
  visibleMessages: number,
): ContainerNode {
  const start = Math.max(0, totalMessages - visibleMessages);
  const hiddenBefore = start;
  const hiddenAfter = Math.max(0, totalMessages - start - visibleMessages);
  const messages: Node[] = [];

  if (hiddenBefore > 0) {
    messages.push(VStack({ height: hiddenBefore * 8 }, []));
  }
  for (
    let i = start;
    i < Math.min(totalMessages, start + visibleMessages);
    i++
  ) {
    messages.push(miniCoderMessage(i));
  }
  if (hiddenAfter > 0) {
    messages.push(VStack({ height: hiddenAfter * 8 }, []));
  }

  return miniCoderRoot(messages, totalMessages);
}

/** Representative mini-coder-next message nodes for content-height measurement. */
export function miniCoderNextMeasureNodes(count: number): Node[] {
  const nodes: Node[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push(miniCoderMessage(i));
  }
  return nodes;
}

/** Pure ASCII string for width benchmarking. */
export const ASCII_STRING =
  "The quick brown fox jumps over the lazy dog. 0123456789!@#$%^&*()";

/** CJK + emoji string for width benchmarking. */
export const CJK_EMOJI_STRING = "世界你好 🌍🎉 東京タワー 한국어 テスト 😀👨‍👩‍👧";

/** Mixed content string. */
export const MIXED_STRING =
  "Hello 世界! Testing 🎉 mixed content with ASCII and CJK 東京.";
