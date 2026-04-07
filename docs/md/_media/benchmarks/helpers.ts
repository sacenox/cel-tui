/**
 * Shared helpers for benchmark tree construction.
 */

import type { Node, ContainerNode } from "@cel-tui/types";
import { VStack, HStack, Text, TextInput } from "@cel-tui/core";

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

/** Pure ASCII string for width benchmarking. */
export const ASCII_STRING =
  "The quick brown fox jumps over the lazy dog. 0123456789!@#$%^&*()";

/** CJK + emoji string for width benchmarking. */
export const CJK_EMOJI_STRING = "世界你好 🌍🎉 東京タワー 한국어 テスト 😀👨‍👩‍👧";

/** Mixed content string. */
export const MIXED_STRING =
  "Hello 世界! Testing 🎉 mixed content with ASCII and CJK 東京.";
