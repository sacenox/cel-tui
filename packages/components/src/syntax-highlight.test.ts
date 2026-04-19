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

  test("highlights javascript synchronously through clew", () => {
    const node = render("const value = 42", "javascript");

    expect(node.type).toBe("vstack");
    expect(node.children).toHaveLength(1);

    const firstLine = asContainer(item(node.children, 0));
    const firstToken = asText(item(firstLine.children, 0));
    expect(firstLine.props.flexWrap).toBe("wrap");
    expect(firstToken.content).toBe("const");
    expect(firstToken.props.fgColor).toBeDefined();
  });

  test("highlights python decorators, types, builtins, and strings", () => {
    const node = render(
      '@dataclass\nclass Job:\n    def render(self):\n        print("hi")',
      "python",
    );

    expect(findText(node, "@dataclass").props.fgColor).toBe("color06");
    expect(findText(node, "class").props.fgColor).toBe("color05");
    expect(findText(node, "Job").props.fgColor).toBe("color06");
    expect(findText(node, "render").props.fgColor).toBe("color04");
    expect(findText(node, "print").props.fgColor).toBe("color06");
    expect(findText(node, '"hi"').props.fgColor).toBe("color02");
  });

  test("highlights richer TypeScript scopes through clew", () => {
    const node = render(
      [
        "@sealed",
        "interface Job {",
        "  status: Phase;",
        "}",
        'type Phase = "idle";',
        "const render = (job: Job) => console.log(job.status, config.port);",
        "const config = { port: 3000 };",
      ].join("\n"),
      "typescript",
      {
        theme: {
          name: "syntax-highlight-typescript-semantics",
          type: "dark",
          fg: "#e5e5e5",
          bg: "#000000",
          tokenColors: [
            { settings: { foreground: "#e5e5e5" } },
            { scope: "meta", settings: { foreground: "#e5e510" } },
            { scope: "type", settings: { foreground: "#2472c8" } },
            { scope: "property", settings: { foreground: "#0dbc79" } },
            { scope: "function", settings: { foreground: "#cd3131" } },
            { scope: "builtin", settings: { foreground: "#bc3fbc" } },
          ],
        },
      },
    );

    expect(findText(node, "sealed").props.fgColor).toBe("color03");
    expect(findText(node, "Job").props.fgColor).toBe("color04");
    expect(findText(node, "status").props.fgColor).toBe("color02");
    expect(findText(node, "render").props.fgColor).toBe("color01");
    expect(findText(node, "console").props.fgColor).toBe("color05");
  });

  test("highlights bash keywords and builtins", () => {
    const node = render('if true; then echo "$HOME"; fi', "bash");

    expect(findText(node, "if").props.fgColor).toBeDefined();
    expect(findText(node, "then").props.fgColor).toBeDefined();
    expect(findText(node, "fi").props.fgColor).toBeDefined();
    expect(findText(node, "echo").props.fgColor).toBeDefined();
    expect(findText(node, "$HOME").props.fgColor).toBeUndefined();
  });

  test("highlights json properties and literals", () => {
    const node = render('{"name":"cel","ok":true,"count":2}', "json");

    expect(findText(node, '"name"').props.fgColor).toBe("color06");
    expect(findText(node, '"cel"').props.fgColor).toBe("color02");
    expect(findText(node, "true").props.fgColor).toBe("color05");
    expect(findText(node, "2").props.fgColor).toBe("color03");
  });

  test("highlights markdown headings, lists, code, and links", () => {
    const node = render(
      "# Title\n- item with `code`\n> quote [link](https://example.com)",
      "markdown",
    );

    expect(findText(node, "Title").props.bold).toBe(true);
    expect(findText(node, "Title").props.fgColor).toBe("color06");
    expect(findText(node, "-").props.fgColor).toBe("color03");
    expect(findText(node, "`code`").props.fgColor).toBe("color02");
    expect(findText(node, "[link](https://example.com)").props.underline).toBe(
      true,
    );
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

  test("expands tabs before laying out wrapped highlight lines", () => {
    const node = render("const\tvalue = 42", "javascript");

    expect(lineText(item(node.children, 0))).toBe("const   value = 42");
    expect(measureContentHeight(node, { width: 10 })).toBeGreaterThan(1);
  });

  test("default ansi16 theme uses terminal defaults for base identifiers", () => {
    const node = render("let value = 42", "javascript");

    expect(findText(node, "let").props.fgColor).toBe("color05");
    expect(findTextContaining(node, "value").props.fgColor).toBeUndefined();
    expect(findText(node, "42").props.fgColor).toBe("color03");
  });

  test("default ansi16 theme styles bash heredocs as strings", () => {
    const node = render("cat <<EOF\nhello\nEOF", "bash");

    expect(findText(node, "cat").props.fgColor).toBe("color04");
    expect(findText(node, "hello").props.fgColor).toBe("color02");
    expect(findText(node, "EOF").props.fgColor).toBe("color02");
  });

  test("custom theme object matches direct clew scopes for typescript", () => {
    const node = render('type Phase = "idle"', "typescript", {
      theme: {
        name: "syntax-highlight-test-theme",
        type: "dark",
        fg: "#e5e5e5",
        bg: "#000000",
        tokenColors: [
          { settings: { foreground: "#e5e5e5" } },
          {
            scope: ["keyword", "string"],
            settings: { foreground: "#cd3131" },
          },
        ],
      },
    });

    expect(findText(node, "type").props.fgColor).toBe("color01");
    expect(findText(node, '"idle"').props.fgColor).toBe("color01");
    expect(findText(node, "Phase").props.fgColor).toBe("color06");
  });

  test("custom theme object matches direct clew scopes for bash", () => {
    const node = render('name="hi"\necho $(pwd) "$name"', "bash", {
      theme: {
        name: "syntax-highlight-bash-scope-theme",
        type: "dark",
        fg: "#e5e5e5",
        bg: "#000000",
        tokenColors: [
          { settings: { foreground: "#e5e5e5" } },
          {
            scope: ["command", "builtin"],
            settings: { foreground: "#0dbc79" },
          },
          { scope: "variable", settings: { foreground: "#cd3131" } },
          {
            scope: "meta.substitution.command",
            settings: { foreground: "#bc3fbc" },
          },
        ],
      },
    });

    expect(findText(node, "name").props.fgColor).toBe("color01");
    expect(findText(node, "echo").props.fgColor).toBe("color02");
    expect(findText(node, "$(pwd)").props.fgColor).toBe("color05");
    expect(findText(node, "$name").props.fgColor).toBe("color01");
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
    const finalContent = `${firstChunk}${secondChunk}const x: Foo<string> = { value: "a" };\n`;
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

  test("preserves highlighting across appended bash heredoc lines", () => {
    render("cat <<EOF\nhello", "bash");
    const node = render("cat <<EOF\nhello\nEOF", "bash");

    expect(node.children).toHaveLength(3);
    expect(lineText(item(node.children, 0))).toBe("cat <<EOF");
    expect(lineText(item(node.children, 1))).toBe("hello");
    expect(lineText(item(node.children, 2))).toBe("EOF");
    expect(findText(node, "hello").props.fgColor).toBe("color02");
    expect(findText(node, "EOF").props.fgColor).toBe("color02");
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
