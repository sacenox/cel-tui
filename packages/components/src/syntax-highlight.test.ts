import { describe, expect, test } from "bun:test";
import type { ContainerNode, Node, TextNode } from "@cel-tui/types";
import { SyntaxHighlight } from "./syntax-highlight.js";

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
): Promise<ContainerNode> {
  const deadline = Date.now() + 10_000;

  while (true) {
    const node = SyntaxHighlight(content, language);
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
    expect(firstToken.content).toBe("const");
    expect(firstToken.props.fgColor).toBeDefined();
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
