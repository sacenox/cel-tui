import { describe, test, expect } from "bun:test";
import type { ContainerNode, Node, TextNode } from "@cel-tui/types";
import {
  parseInline,
  tokenize,
  Markdown,
  type BlockToken,
  type InlineSpan,
} from "./markdown";

// ─── Helpers ────────────────────────────────────────────────────

/** Extract the text content of a Text node. */
function textContent(node: Node): string {
  if (node.type === "text") return node.content;
  throw new Error(`Expected text node, got ${node.type}`);
}

/** Assert a node is a Text node and return it. */
function asText(node: Node): TextNode {
  expect(node.type).toBe("text");
  return node as TextNode;
}

/** Assert a node is a container (vstack/hstack) and return it. */
function asContainer(node: Node): ContainerNode {
  expect(["vstack", "hstack"]).toContain(node.type);
  return node as ContainerNode;
}

// ─── parseInline ────────────────────────────────────────────────

describe("parseInline", () => {
  test("plain text", () => {
    expect(parseInline("hello world")).toEqual([
      { type: "text", content: "hello world" },
    ]);
  });

  test("bold", () => {
    expect(parseInline("some **bold** text")).toEqual([
      { type: "text", content: "some " },
      { type: "bold", content: "bold" },
      { type: "text", content: " text" },
    ]);
  });

  test("italic", () => {
    expect(parseInline("some *italic* text")).toEqual([
      { type: "text", content: "some " },
      { type: "italic", content: "italic" },
      { type: "text", content: " text" },
    ]);
  });

  test("inline code", () => {
    expect(parseInline("use `foo()` here")).toEqual([
      { type: "text", content: "use " },
      { type: "code", content: "foo()" },
      { type: "text", content: " here" },
    ]);
  });

  test("link", () => {
    expect(parseInline("see [docs](https://example.com) now")).toEqual([
      { type: "text", content: "see " },
      { type: "link", text: "docs", url: "https://example.com" },
      { type: "text", content: " now" },
    ]);
  });

  test("mixed inline", () => {
    const spans = parseInline("**bold** and *italic* and `code`");
    expect(spans).toEqual([
      { type: "bold", content: "bold" },
      { type: "text", content: " and " },
      { type: "italic", content: "italic" },
      { type: "text", content: " and " },
      { type: "code", content: "code" },
    ]);
  });

  test("unclosed bold is plain text", () => {
    expect(parseInline("some **unclosed")).toEqual([
      { type: "text", content: "some **unclosed" },
    ]);
  });

  test("unclosed italic is plain text", () => {
    expect(parseInline("some *unclosed")).toEqual([
      { type: "text", content: "some *unclosed" },
    ]);
  });

  test("unclosed code is plain text", () => {
    expect(parseInline("some `unclosed")).toEqual([
      { type: "text", content: "some `unclosed" },
    ]);
  });

  test("unclosed link is plain text", () => {
    expect(parseInline("see [docs](no-close")).toEqual([
      { type: "text", content: "see [docs](no-close" },
    ]);
  });

  test("empty string", () => {
    expect(parseInline("")).toEqual([]);
  });

  test("code has priority over bold", () => {
    // The ` opens before ** can match
    expect(parseInline("`**not bold**`")).toEqual([
      { type: "code", content: "**not bold**" },
    ]);
  });
});

// ─── tokenize ───────────────────────────────────────────────────

describe("tokenize", () => {
  test("heading levels", () => {
    const tokens = tokenize("# H1\n## H2\n### H3");
    expect(tokens).toEqual([
      { type: "heading", depth: 1, spans: [{ type: "text", content: "H1" }] },
      { type: "heading", depth: 2, spans: [{ type: "text", content: "H2" }] },
      { type: "heading", depth: 3, spans: [{ type: "text", content: "H3" }] },
    ]);
  });

  test("heading with inline formatting", () => {
    const tokens = tokenize("# Hello **world**");
    expect(tokens[0]).toEqual({
      type: "heading",
      depth: 1,
      spans: [
        { type: "text", content: "Hello " },
        { type: "bold", content: "world" },
      ],
    });
  });

  test("paragraph", () => {
    const tokens = tokenize("Hello world");
    expect(tokens).toEqual([
      { type: "paragraph", spans: [{ type: "text", content: "Hello world" }] },
    ]);
  });

  test("code block with lang", () => {
    const tokens = tokenize("```js\nconst x = 1;\nconst y = 2;\n```");
    expect(tokens).toEqual([
      {
        type: "code_block",
        lang: "js",
        content: "const x = 1;\nconst y = 2;",
      },
    ]);
  });

  test("code block without lang", () => {
    const tokens = tokenize("```\nsome code\n```");
    expect(tokens).toEqual([
      { type: "code_block", lang: "", content: "some code" },
    ]);
  });

  test("unclosed code block (streaming)", () => {
    const tokens = tokenize("```js\nconst x = 1;");
    expect(tokens).toEqual([
      { type: "code_block", lang: "js", content: "const x = 1;" },
    ]);
  });

  test("unordered list", () => {
    const tokens = tokenize("- first\n- second\n* third");
    expect(tokens).toEqual([
      {
        type: "list_item",
        ordered: false,
        index: 0,
        spans: [{ type: "text", content: "first" }],
      },
      {
        type: "list_item",
        ordered: false,
        index: 0,
        spans: [{ type: "text", content: "second" }],
      },
      {
        type: "list_item",
        ordered: false,
        index: 0,
        spans: [{ type: "text", content: "third" }],
      },
    ]);
  });

  test("ordered list", () => {
    const tokens = tokenize("1. first\n2. second");
    expect(tokens).toEqual([
      {
        type: "list_item",
        ordered: true,
        index: 1,
        spans: [{ type: "text", content: "first" }],
      },
      {
        type: "list_item",
        ordered: true,
        index: 2,
        spans: [{ type: "text", content: "second" }],
      },
    ]);
  });

  test("blockquote", () => {
    const tokens = tokenize("> some quote");
    expect(tokens).toEqual([
      {
        type: "blockquote",
        spans: [{ type: "text", content: "some quote" }],
      },
    ]);
  });

  test("blockquote with inline formatting", () => {
    const tokens = tokenize("> a **bold** quote");
    expect(tokens[0]).toEqual({
      type: "blockquote",
      spans: [
        { type: "text", content: "a " },
        { type: "bold", content: "bold" },
        { type: "text", content: " quote" },
      ],
    });
  });

  test("horizontal rules", () => {
    expect(tokenize("---")).toEqual([{ type: "hr" }]);
    expect(tokenize("***")).toEqual([{ type: "hr" }]);
    expect(tokenize("___")).toEqual([{ type: "hr" }]);
    expect(tokenize("----")).toEqual([{ type: "hr" }]);
  });

  test("blank lines", () => {
    const tokens = tokenize("hello\n\nworld");
    expect(tokens).toEqual([
      { type: "paragraph", spans: [{ type: "text", content: "hello" }] },
      { type: "blank" },
      { type: "paragraph", spans: [{ type: "text", content: "world" }] },
    ]);
  });

  test("full document", () => {
    const md = [
      "# Title",
      "",
      "A paragraph with **bold**.",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
      "- item one",
      "- item two",
      "",
      "> a quote",
      "",
      "---",
    ].join("\n");

    const tokens = tokenize(md);
    const types = tokens.map((t) => t.type);
    expect(types).toEqual([
      "heading",
      "blank",
      "paragraph",
      "blank",
      "code_block",
      "blank",
      "list_item",
      "list_item",
      "blank",
      "blockquote",
      "blank",
      "hr",
    ]);
  });

  test("empty content", () => {
    expect(tokenize("")).toEqual([{ type: "blank" }]);
  });

  test("code block preserves content verbatim", () => {
    const tokens = tokenize("```\n  indented\n**not bold**\n```");
    const cb = tokens[0] as { type: "code_block"; content: string };
    expect(cb.content).toBe("  indented\n**not bold**");
  });

  test("list item with inline formatting", () => {
    const tokens = tokenize("- some **bold** item");
    expect(tokens[0]).toEqual({
      type: "list_item",
      ordered: false,
      index: 0,
      spans: [
        { type: "text", content: "some " },
        { type: "bold", content: "bold" },
        { type: "text", content: " item" },
      ],
    });
  });
});

// ─── Markdown component ─────────────────────────────────────────

describe("Markdown", () => {
  test("returns empty array for empty string", () => {
    // Empty string tokenizes to one blank → one Text("")
    const nodes = Markdown("");
    expect(nodes).toHaveLength(1);
    expect(textContent(nodes[0]!)).toBe("");
  });

  test("heading renders as styled Text", () => {
    const nodes = Markdown("# Hello");
    expect(nodes).toHaveLength(1);
    const t = asText(nodes[0]!);
    expect(t.content).toBe("Hello");
    expect(t.props.bold).toBe(true);
    expect(t.props.fgColor).toBe("cyan");
  });

  test("heading levels have different styles", () => {
    const nodes = Markdown("# H1\n## H2\n### H3");
    const h1 = asText(nodes[0]!);
    const h2 = asText(nodes[1]!);
    const h3 = asText(nodes[2]!);
    expect(h1.props.fgColor).toBe("cyan");
    expect(h2.props.fgColor).toBe("yellow");
    expect(h3.props.fgColor).toBe("green");
  });

  test("paragraph renders as wrapping Text", () => {
    const nodes = Markdown("Hello **bold** world");
    expect(nodes).toHaveLength(1);
    const t = asText(nodes[0]!);
    // Inline markers stripped, plain text content
    expect(t.content).toBe("Hello bold world");
    expect(t.props.wrap).toBe("word");
  });

  test("code block renders as VStack with Text", () => {
    const nodes = Markdown("```js\nconst x = 1;\n```");
    expect(nodes).toHaveLength(1);
    const container = asContainer(nodes[0]!);
    expect(container.type).toBe("vstack");
    expect(container.props.padding).toEqual({ x: 1 });
    expect(container.props.bgColor).toBe("brightBlack");
    expect(container.children).toHaveLength(1);
    expect(textContent(container.children[0]!)).toBe("const x = 1;");
  });

  test("unordered list item renders as HStack with marker", () => {
    const nodes = Markdown("- hello world");
    expect(nodes).toHaveLength(1);
    const row = asContainer(nodes[0]!);
    expect(row.type).toBe("hstack");
    expect(row.children).toHaveLength(2);

    // Marker
    const marker = asText(row.children[0]!);
    expect(marker.content).toBe("• ");
    expect(marker.props.fgColor).toBe("yellow");

    // Content in flex VStack
    const wrapper = asContainer(row.children[1]!);
    expect(wrapper.type).toBe("vstack");
    expect(wrapper.props.flex).toBe(1);
    const content = asText(wrapper.children[0]!);
    expect(content.content).toBe("hello world");
    expect(content.props.wrap).toBe("word");
  });

  test("ordered list item uses index as marker", () => {
    const nodes = Markdown("3. third item");
    const row = asContainer(nodes[0]!);
    const marker = asText(row.children[0]!);
    expect(marker.content).toBe("3. ");
  });

  test("blockquote renders with bar and italic content", () => {
    const nodes = Markdown("> quoted text");
    expect(nodes).toHaveLength(1);
    const row = asContainer(nodes[0]!);
    expect(row.type).toBe("hstack");

    // Bar
    const bar = asText(row.children[0]!);
    expect(bar.content).toBe("│ ");
    expect(bar.props.fgColor).toBe("green");

    // Content
    const wrapper = asContainer(row.children[1]!);
    const content = asText(wrapper.children[0]!);
    expect(content.content).toBe("quoted text");
    expect(content.props.italic).toBe(true);
    expect(content.props.wrap).toBe("word");
  });

  test("horizontal rule renders as Divider", () => {
    const nodes = Markdown("---");
    expect(nodes).toHaveLength(1);
    const t = asText(nodes[0]!);
    // Divider is a Text with repeat: "fill"
    expect(t.content).toBe("─");
    expect(t.props.repeat).toBe("fill");
    expect(t.props.fgColor).toBe("brightBlack");
  });

  test("blank line renders as empty Text", () => {
    const nodes = Markdown("hello\n\nworld");
    expect(nodes).toHaveLength(3);
    expect(textContent(nodes[1]!)).toBe("");
  });

  test("custom theme overrides defaults", () => {
    const nodes = Markdown("# Hello", {
      theme: { heading1: { bold: true, fgColor: "magenta" } },
    });
    const t = asText(nodes[0]!);
    expect(t.props.fgColor).toBe("magenta");
  });

  test("custom theme partial — unset properties use defaults", () => {
    const nodes = Markdown("# H1\n> quote", {
      theme: { heading1: { fgColor: "red" } },
    });
    // Heading uses custom
    expect(asText(nodes[0]!).props.fgColor).toBe("red");
    // Blockquote bar uses default
    const row = asContainer(nodes[1]!);
    expect(asText(row.children[0]!).props.fgColor).toBe("green");
  });

  test("inline formatting in headings is stripped to plain text", () => {
    const nodes = Markdown("# Hello **world** and `code`");
    const t = asText(nodes[0]!);
    expect(t.content).toBe("Hello world and code");
  });

  test("link text is used, url is stripped", () => {
    const nodes = Markdown("See [the docs](https://example.com) here.");
    const t = asText(nodes[0]!);
    expect(t.content).toBe("See the docs here.");
  });

  test("streaming: unclosed code block renders as code", () => {
    const nodes = Markdown("```js\nconst x = 1;");
    expect(nodes).toHaveLength(1);
    const container = asContainer(nodes[0]!);
    expect(container.props.bgColor).toBe("brightBlack");
    expect(textContent(container.children[0]!)).toBe("const x = 1;");
  });

  test("streaming: unclosed bold appears as plain text", () => {
    const nodes = Markdown("hello **world");
    const t = asText(nodes[0]!);
    expect(t.content).toBe("hello **world");
  });

  test("full document produces correct node sequence", () => {
    const md = [
      "# Title",
      "",
      "Some text here.",
      "",
      "```",
      "code",
      "```",
      "",
      "- item",
      "",
      "> quote",
      "",
      "---",
    ].join("\n");

    const nodes = Markdown(md);
    const types = nodes.map((n) => {
      if (n.type === "text") {
        if (n.content === "") return "blank";
        if (n.props.repeat === "fill") return "hr";
        if (n.props.bold && n.props.fgColor) return "heading";
        return "paragraph";
      }
      if (n.type === "vstack") return "code_block";
      if (n.type === "hstack") {
        const first = (n as ContainerNode).children[0];
        if (first?.type === "text" && (first as TextNode).content === "│ ")
          return "blockquote";
        return "list_item";
      }
      return n.type;
    });

    expect(types).toEqual([
      "heading",
      "blank",
      "paragraph",
      "blank",
      "code_block",
      "blank",
      "list_item",
      "blank",
      "blockquote",
      "blank",
      "hr",
    ]);
  });
});
