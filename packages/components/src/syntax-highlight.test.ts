import { describe, expect, test } from "bun:test";
import { measureContentHeight } from "@cel-tui/core";
import type { ContainerNode, Node, TextNode } from "@cel-tui/types";
import {
  SyntaxHighlight,
  type SyntaxHighlightProps,
} from "./syntax-highlight.js";

function asContainer(node: Node): ContainerNode {
  expect(node.type === "vstack" || node.type === "hstack").toBe(true);
  return node as ContainerNode;
}

function asText(node: Node): TextNode {
  expect(node.type).toBe("text");
  return node as TextNode;
}

function lineText(line: Node): string {
  const container = asContainer(line);
  return container.children.map((child) => asText(child).content).join("");
}

function firstText(line: Node): TextNode {
  const container = asContainer(line);
  return asText(container.children[0]!);
}

function textNodes(node: ContainerNode): TextNode[] {
  return node.children.flatMap((line) => {
    const container = asContainer(line);
    return container.children.map((child) => asText(child));
  });
}

function findText(node: ContainerNode, content: string): TextNode {
  const text = textNodes(node).find((token) => token.content === content);
  if (!text) {
    throw new Error(`Missing token: ${content}`);
  }
  return text;
}

function findTextContaining(node: ContainerNode, content: string): TextNode {
  const text = textNodes(node).find((token) => token.content.includes(content));
  if (!text) {
    throw new Error(`Missing token containing: ${content}`);
  }
  return text;
}

function hasStyledText(node: ContainerNode): boolean {
  return node.children.some((line) => {
    const container = asContainer(line);
    return container.children.some((child) => {
      const text = asText(child);
      return (
        text.props.fgColor !== undefined ||
        text.props.bgColor !== undefined ||
        text.props.bold === true ||
        text.props.italic === true ||
        text.props.underline === true
      );
    });
  });
}

async function waitForHighlight(
  content: string,
  language: string,
  props?: SyntaxHighlightProps,
): Promise<ContainerNode> {
  const deadline = Date.now() + 10_000;

  while (true) {
    const node = SyntaxHighlight(content, language, props);
    if (hasStyledText(node)) {
      return node;
    }

    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${language} highlighter`);
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("SyntaxHighlight", () => {
  test("renders plain text for unknown languages", () => {
    const node = SyntaxHighlight("plain text", "definitely-not-real");

    expect(node.type).toBe("vstack");
    expect(node.children).toHaveLength(1);
    expect(lineText(node.children[0]!)).toBe("plain text");
    expect(hasStyledText(node)).toBe(false);
  });

  test("eventually highlights javascript after lazy language load", async () => {
    const node = await waitForHighlight("const value = 42", "javascript");

    expect(node.type).toBe("vstack");
    expect(node.children).toHaveLength(1);

    const firstLine = asContainer(node.children[0]!);
    const firstToken = asText(firstLine.children[0]!);
    expect(firstLine.props.flexWrap).toBe("wrap");
    expect(firstToken.content).toBe("const");
    expect(firstToken.props.fgColor).toBeDefined();
  });

  test("wraps plain fallback content by default", () => {
    const node = SyntaxHighlight(
      "alpha beta gamma delta epsilon",
      "definitely-not-real",
    );

    expect(measureContentHeight(node, { width: 10 })).toBeGreaterThan(1);
  });

  test("wraps highlighted content by default", async () => {
    const node = await waitForHighlight(
      "const alpha beta gamma delta epsilon = 42",
      "javascript",
    );

    expect(measureContentHeight(node, { width: 12 })).toBeGreaterThan(1);
  });

  test("default ansi16 theme uses terminal defaults for base text", async () => {
    const node = await waitForHighlight("let value = 42", "javascript");

    expect(findText(node, "let").props.fgColor).toBe("color05");
    expect(findTextContaining(node, "value").props.fgColor).toBeUndefined();
    expect(findText(node, "42").props.fgColor).toBe("color03");
  });

  test("custom theme object overrides default colors", async () => {
    const node = await waitForHighlight(
      'const message = "hello"',
      "javascript",
      {
        theme: {
          name: "syntax-highlight-test-theme",
          type: "dark",
          fg: "#e5e5e5",
          bg: "#000000",
          tokenColors: [
            { settings: { foreground: "#e5e5e5" } },
            {
              scope: ["keyword", "storage"],
              settings: { foreground: "#cd3131" },
            },
            { scope: "string", settings: { foreground: "#0dbc79" } },
          ],
        },
      },
    );

    expect(findText(node, "const").props.fgColor).toBe("color01");
    expect(findTextContaining(node, "hello").props.fgColor).toBe("color02");
  });

  test("bundled shiki theme names load on demand", async () => {
    const node = await waitForHighlight("const value = 42", "javascript", {
      theme: "dark-plus",
    });

    expect(findText(node, "const").props.fgColor).toBeDefined();
  });

  test("keeps one rendered child per source line", async () => {
    await waitForHighlight("const first = 1", "javascript");
    const node = SyntaxHighlight(
      "const first = 1\nconst second = 2",
      "javascript",
    );

    expect(node.children).toHaveLength(2);
    expect(lineText(node.children[0]!)).toBe("const first = 1");
    expect(lineText(node.children[1]!)).toBe("const second = 2");
  });

  test("updates append-only content without duplicating previous text", async () => {
    await waitForHighlight('const message = "hel', "javascript");
    const node = SyntaxHighlight('const message = "hello"', "javascript");

    expect(node.children).toHaveLength(1);
    expect(lineText(node.children[0]!)).toBe('const message = "hello"');
  });

  test("preserves grammar state across appended multiline comment", async () => {
    await waitForHighlight("/* hello", "javascript");
    const node = SyntaxHighlight("/* hello\nworld */", "javascript");

    expect(node.children).toHaveLength(2);
    expect(lineText(node.children[0]!)).toBe("/* hello");
    expect(lineText(node.children[1]!)).toBe("world */");

    const firstLine = firstText(node.children[0]!);
    const secondLine = firstText(node.children[1]!);
    expect(firstLine.props.fgColor).toBeDefined();
    expect(secondLine.props.fgColor).toBe(firstLine.props.fgColor);
  });

  test("falls back to full rehighlight on non-append edits", async () => {
    await waitForHighlight("const value = 42", "javascript");
    const node = SyntaxHighlight("function value() {}", "javascript");

    expect(node.children).toHaveLength(1);
    expect(lineText(node.children[0]!)).toBe("function value() {}");
    expect(firstText(node.children[0]!).content).toBe("function");
    expect(firstText(node.children[0]!).props.fgColor).toBeDefined();
  });
});
