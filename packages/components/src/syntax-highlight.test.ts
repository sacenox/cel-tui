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

function item<T>(items: readonly T[], index: number): T {
  const value = items[index];
  expect(value).toBeDefined();
  if (value === undefined) {
    throw new Error(`Missing item at index ${index}`);
  }
  return value;
}

function lineText(line: Node): string {
  const container = asContainer(line);
  return container.children.map((child) => asText(child).content).join("");
}

function firstText(line: Node): TextNode {
  const container = asContainer(line);
  return asText(item(container.children, 0));
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

function lineTokens(line: Node) {
  const container = asContainer(line);
  return container.children.map((child) => {
    const text = asText(child);
    return {
      content: text.content,
      fgColor: text.props.fgColor,
      bgColor: text.props.bgColor,
      bold: text.props.bold,
      italic: text.props.italic,
      underline: text.props.underline,
    };
  });
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

function render(
  content: string,
  language: string,
  props?: SyntaxHighlightProps,
): ContainerNode {
  return SyntaxHighlight(content, language, props);
}

describe("SyntaxHighlight", () => {
  test("renders plain text for unknown languages", () => {
    const node = render("plain text", "definitely-not-real");

    expect(node.type).toBe("vstack");
    expect(node.children).toHaveLength(1);
    expect(lineText(item(node.children, 0))).toBe("plain text");
    expect(hasStyledText(node)).toBe(false);
  });

  test("highlights javascript synchronously", () => {
    const node = render("const value = 42", "javascript");

    expect(node.type).toBe("vstack");
    expect(node.children).toHaveLength(1);

    const firstLine = asContainer(item(node.children, 0));
    const firstToken = asText(item(firstLine.children, 0));
    expect(firstLine.props.flexWrap).toBe("wrap");
    expect(firstToken.content).toBe("const");
    expect(firstToken.props.fgColor).toBeDefined();
  });

  test("supports shell alias highlighting", () => {
    const node = render('if true; then echo "$HOME"; fi', "shell");

    expect(findText(node, "if").props.fgColor).toBeDefined();
    expect(findText(node, "then").props.fgColor).toBeDefined();
    expect(findText(node, "fi").props.fgColor).toBeDefined();
  });

  test("wraps plain fallback content by default", () => {
    const node = render(
      "alpha beta gamma delta epsilon",
      "definitely-not-real",
    );

    expect(measureContentHeight(node, { width: 10 })).toBeGreaterThan(1);
  });

  test("wraps highlighted content by default", () => {
    const node = render(
      "const alpha beta gamma delta epsilon = 42",
      "javascript",
    );

    expect(measureContentHeight(node, { width: 12 })).toBeGreaterThan(1);
  });

  test("default ansi16 theme uses terminal defaults for base text", () => {
    const node = render("let value = 42", "javascript");

    expect(findText(node, "let").props.fgColor).toBe("color05");
    expect(findTextContaining(node, "value").props.fgColor).toBeUndefined();
    expect(findText(node, "42").props.fgColor).toBe("color03");
  });

  test("default ansi16 theme styles markdown code blocks from direct lextide classes", () => {
    const node = render("# title\n\n```ts\nconst value = 1\n```", "markdown");

    expect(findText(node, "#").props.fgColor).toBeDefined();
    expect(findText(node, "```ts").props.fgColor).toBeDefined();
    expect(findText(node, "const").props.fgColor).toBeDefined();
  });

  test("custom theme object matches bare lextide class names directly", () => {
    const node = render("class Derived extends Base {}", "typescript", {
      theme: {
        name: "syntax-highlight-test-theme",
        type: "dark",
        fg: "#e5e5e5",
        bg: "#000000",
        tokenColors: [
          { settings: { foreground: "#e5e5e5" } },
          {
            scope: ["class_", "inherited__"],
            settings: { foreground: "#cd3131" },
          },
        ],
      },
    });

    expect(findText(node, "Derived").props.fgColor).toBe("color01");
    expect(findText(node, "Base").props.fgColor).toBe("color01");
    expect(findText(node, "class").props.fgColor).toBe("color05");
  });

  test("custom theme object matches prefixed hljs class names directly", () => {
    const node = render("# title\n\n```ts\nconst value = 1\n```", "markdown", {
      theme: {
        name: "syntax-highlight-prefixed-class-theme",
        type: "dark",
        fg: "#e5e5e5",
        bg: "#000000",
        tokenColors: [
          { settings: { foreground: "#e5e5e5" } },
          { scope: "hljs-code", settings: { foreground: "#0dbc79" } },
        ],
      },
    });

    expect(findText(node, "```ts").props.fgColor).toBe("color02");
    expect(findText(node, "const").props.fgColor).toBe("color02");
    expect(findText(node, "#").props.fgColor).toBe("color09");
  });

  test("named theme presets are accepted", () => {
    const node = render("const value = 42", "javascript", {
      theme: "dark-plus",
    });

    expect(findText(node, "const").props.fgColor).toBeDefined();
  });

  test("keeps one rendered child per source line", () => {
    render("const first = 1", "javascript");
    const node = render("const first = 1\nconst second = 2", "javascript");

    expect(node.children).toHaveLength(2);
    expect(lineText(item(node.children, 0))).toBe("const first = 1");
    expect(lineText(item(node.children, 1))).toBe("const second = 2");
  });

  test("updates append-only content without duplicating previous text", () => {
    render('const message = "hel', "javascript");
    const node = render('const message = "hello"', "javascript");

    expect(node.children).toHaveLength(1);
    expect(lineText(item(node.children, 0))).toBe('const message = "hello"');
  });

  test("produces the same final highlight regardless of append chunk boundaries", () => {
    const firstChunk = "t";
    const secondChunk = "ype Foo<T extends string | number> = { value: T };\n";
    const finalContent = `${firstChunk}${secondChunk}const x: Foo<string> = { value: \"a\" };\n`;
    const streamedTheme = {
      name: "syntax-highlight-streamed-boundary-regression",
      tokenColors: [],
    };
    const directTheme = {
      name: "syntax-highlight-direct-boundary-regression",
      tokenColors: [],
    };

    render(firstChunk, "typescript", { theme: streamedTheme });
    render(`${firstChunk}${secondChunk}`, "typescript", {
      theme: streamedTheme,
    });
    const streamed = render(finalContent, "typescript", {
      theme: streamedTheme,
    });
    const direct = render(finalContent, "typescript", { theme: directTheme });

    expect(lineTokens(item(streamed.children, 0))).toEqual(
      lineTokens(item(direct.children, 0)),
    );
    expect(lineTokens(item(streamed.children, 1))).toEqual(
      lineTokens(item(direct.children, 1)),
    );
  });

  test("preserves highlighting across appended multiline comment", () => {
    render("/* hello", "javascript");
    const node = render("/* hello\nworld */", "javascript");

    expect(node.children).toHaveLength(2);
    expect(lineText(item(node.children, 0))).toBe("/* hello");
    expect(lineText(item(node.children, 1))).toBe("world */");

    const firstLine = firstText(item(node.children, 0));
    const secondLine = firstText(item(node.children, 1));
    expect(firstLine.props.fgColor).toBeDefined();
    expect(secondLine.props.fgColor).toBe(firstLine.props.fgColor);
  });

  test("template substitutions reset back to base text style", () => {
    const interpolation = `${"$"}{name}`;
    const node = render(`\`hi ${interpolation}\``, "javascript");

    expect(findText(node, "`hi").props.fgColor).toBe("color02");
    expect(findText(node, " ").props.fgColor).toBe("color02");
    expect(
      findTextContaining(node, interpolation).props.fgColor,
    ).toBeUndefined();
  });

  test("falls back to full rehighlight on non-append edits", () => {
    render("const value = 42", "javascript");
    const node = render("function value() {}", "javascript");

    expect(node.children).toHaveLength(1);
    expect(lineText(item(node.children, 0))).toBe("function value() {}");
    expect(firstText(item(node.children, 0)).content).toBe("function");
    expect(firstText(item(node.children, 0)).props.fgColor).toBeDefined();
  });
});
