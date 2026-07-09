import { describe, expect, test } from "bun:test";
import {
  CellBuffer,
  defaultTheme,
  emitBuffer,
  measureContentHeight,
  type Theme,
} from "@cel-tui/core";
import type { ContainerNode, Node, TextNode } from "@cel-tui/types";
import {
  createSyntaxHighlight,
  SyntaxHighlight,
  type SyntaxHighlightNativeTheme,
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

  test("native themes preserve palette slots without hex quantization", () => {
    const theme: SyntaxHighlightNativeTheme = {
      baseStyle: { fgColor: "color13", bgColor: "color00" },
      scopeStyles: {
        keyword: { fgColor: "color11" },
        number: { fgColor: "color10" },
      },
    };
    const node = render("const value = 42", "typescript", { theme });

    expect(findText(node, "const").props.fgColor).toBe("color11");
    expect(findTextContaining(node, "value").props.fgColor).toBe("color13");
    expect(findText(node, "42").props.fgColor).toBe("color10");
    expect(findText(node, "const").props.bgColor).toBe("color00");
  });

  test("native palette slots follow runtime theme replacement without re-highlighting", () => {
    const node = render("const value = 1", "typescript", {
      theme: { scopeStyles: { keyword: { fgColor: "color12" } } },
    });
    const keyword = findText(node, "const");
    const buffer = new CellBuffer(1, 1);
    buffer.set(0, 0, {
      char: "K",
      fgColor: keyword.props.fgColor ?? null,
      bgColor: null,
      bold: false,
      italic: false,
      underline: false,
    });
    const firstTheme: Theme = { ...defaultTheme, color12: "#112233" };
    const secondTheme: Theme = { ...defaultTheme, color12: "#aabbcc" };

    expect(emitBuffer(buffer, firstTheme)).toContain("\x1b[38;2;17;34;51m");
    expect(emitBuffer(buffer, secondTheme)).toContain("\x1b[38;2;170;187;204m");
    expect(keyword.props.fgColor).toBe("color12");
  });

  test("native scope styles preserve explicit false values", () => {
    const node = render("// plain comment", "typescript", {
      theme: {
        scopeStyles: {
          comment: { bold: false, italic: false, underline: false },
        },
      },
    });
    const comment = findText(node, "plain");

    expect(comment.props.bold).toBe(false);
    expect(comment.props.italic).toBe(false);
    expect(comment.props.underline).toBe(false);
    expect(comment.props.fgColor).toBe("color08");
  });

  test("native fields take precedence over compatible TextMate fields", () => {
    const node = render("const value = 1", "typescript", {
      theme: {
        fg: "#cd3131",
        tokenColors: [
          {
            scope: "keyword",
            settings: {
              foreground: "#0dbc79",
              fontStyle: "bold italic underline",
            },
          },
        ],
        baseStyle: { fgColor: "color14" },
        scopeStyles: {
          keyword: {
            fgColor: "color12",
            bold: false,
            italic: false,
            underline: false,
          },
        },
      },
    });
    const keyword = findText(node, "const");

    expect(findTextContaining(node, "value").props.fgColor).toBe("color14");
    expect(keyword.props.fgColor).toBe("color12");
    expect(keyword.props.bold).toBe(false);
    expect(keyword.props.italic).toBe(false);
    expect(keyword.props.underline).toBe(false);
  });

  test("keeps TextMate-only theme registrations compatible", () => {
    const node = render('const value = "text"', "typescript", {
      theme: {
        fg: "#e5e5e5",
        tokenColors: [
          {
            scope: "keyword",
            settings: { foreground: "#cd3131", fontStyle: "bold" },
          },
          { scope: "string", settings: { foreground: "#0dbc79" } },
        ],
      },
    });

    expect(findText(node, "const").props.fgColor).toBe("color01");
    expect(findText(node, "const").props.bold).toBe(true);
    expect(findText(node, '"text"').props.fgColor).toBe("color02");
    expect(findTextContaining(node, "value").props.fgColor).toBe("color07");
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
    const highlight = createSyntaxHighlight();
    highlight('const message = "hel', "javascript");
    const node = highlight('const message = "hello"', "javascript");

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

    const highlight = createSyntaxHighlight();
    highlight(firstChunk, "typescript", { theme: streamedTheme });
    highlight(`${firstChunk}${secondChunk}`, "typescript", {
      theme: streamedTheme,
    });
    const streamed = highlight(finalContent, "typescript", {
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
    const highlight = createSyntaxHighlight();
    highlight("cat <<EOF\nhello", "bash");
    const node = highlight("cat <<EOF\nhello\nEOF", "bash");

    expect(node.children).toHaveLength(3);
    expect(lineText(item(node.children, 0))).toBe("cat <<EOF");
    expect(lineText(item(node.children, 1))).toBe("hello");
    expect(lineText(item(node.children, 2))).toBe("EOF");
    expect(findText(node, "hello").props.fgColor).toBe("color02");
    expect(findText(node, "EOF").props.fgColor).toBe("color02");
  });

  test("falls back to full rehighlight on non-append edits", () => {
    const highlight = createSyntaxHighlight();
    highlight("const value = 42", "javascript");
    const node = highlight("function value() {}", "javascript");

    expect(node.children).toHaveLength(1);
    expect(lineText(item(node.children, 0))).toBe("function value() {}");
    expect(firstText(item(node.children, 0)).content).toBe("function");
    expect(firstText(item(node.children, 0)).props.fgColor).toBeDefined();
  });

  test("does not infer direct-call identity from content prefixes", () => {
    const prefix = render("const message", "javascript");

    render('const message = "hello"', "javascript");

    expect(render("const message", "javascript")).toBe(prefix);
  });

  test("keeps more than four direct-call snippets hot", () => {
    const snippets = Array.from(
      { length: 5 },
      (_, index) => `const message${index} = ${index}`,
    );
    const firstFrame = snippets.map((source) => render(source, "typescript"));
    const secondFrame = snippets.map((source) => render(source, "typescript"));

    expect(secondFrame).toEqual(firstFrame);
    for (let index = 0; index < snippets.length; index++) {
      expect(secondFrame[index]).toBe(firstFrame[index]);
    }
  });

  test("bounds the direct-render cache", () => {
    const firstSource = "const cacheBound0 = 0";
    const first = render(firstSource, "typescript");

    for (let index = 1; index <= 128; index++) {
      render(`const cacheBound${index} = ${index}`, "typescript");
    }

    expect(render(firstSource, "typescript")).not.toBe(first);
  });

  test("isolates append streams in callable instances", () => {
    const first = createSyntaxHighlight();
    const second = createSyntaxHighlight();

    const firstInitial = first('const message = "hel', "typescript");
    const secondInitial = second('const message = "hel', "typescript");

    const firstResult = first('const message = "hello"', "typescript");
    const secondResult = second('const message = "help"', "typescript");

    expect(secondInitial).not.toBe(firstInitial);
    expect(lineText(item(firstResult.children, 0))).toBe(
      'const message = "hello"',
    );
    expect(lineText(item(secondResult.children, 0))).toBe(
      'const message = "help"',
    );
  });

  test("reuses an instance node until its content changes", () => {
    const highlight = createSyntaxHighlight();
    const first = highlight("const value = 1", "typescript");

    expect(highlight("const value = 1", "typescript")).toBe(first);
    expect(highlight("const value = 12", "typescript")).not.toBe(first);
  });

  test("dispose releases a callable instance's parser state", () => {
    const highlight = createSyntaxHighlight();
    const beforeDispose = highlight("const value = 1", "typescript");

    highlight.dispose();

    expect(highlight("const value = 1", "typescript")).not.toBe(beforeDispose);
  });

  test("reuses resolved custom themes created from equivalent registrations", () => {
    const firstTheme = {
      name: "cached-theme",
      tokenColors: [{ scope: "keyword", settings: { foreground: "#cd3131" } }],
    } as const;
    const secondTheme = {
      name: "cached-theme",
      tokenColors: [{ scope: "keyword", settings: { foreground: "#cd3131" } }],
    } as const;

    const first = render("const value = 1", "typescript", {
      theme: firstTheme,
    });
    const second = render("const value = 1", "typescript", {
      theme: secondTheme,
    });

    expect(second).toBe(first);
  });
});
