import { describe, test, expect } from "bun:test";
import type { ContainerNode, Node, TextNode } from "@cel-tui/types";
import { Markdown } from "./markdown";

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

// ─── Markdown component ─────────────────────────────────────────

describe("Markdown", () => {
  test("returns empty array for empty string", () => {
    const nodes = Markdown("");
    expect(nodes).toHaveLength(0);
  });

  test("heading renders as styled Text", () => {
    const nodes = Markdown("# Hello");
    expect(nodes).toHaveLength(1);
    const t = asText(nodes[0]!);
    expect(t.content).toBe("Hello");
    expect(t.props.bold).toBe(true);
    expect(t.props.fgColor).toBe("color06");
  });

  test("heading levels have different styles", () => {
    const nodes = Markdown("# H1\n## H2\n### H3");
    const h1 = asText(nodes[0]!);
    const h2 = asText(nodes[1]!);
    const h3 = asText(nodes[2]!);
    expect(h1.props.fgColor).toBe("color06");
    expect(h2.props.fgColor).toBe("color03");
    expect(h3.props.fgColor).toBe("color02");
  });

  test("plain paragraph renders as wrapping Text", () => {
    const nodes = Markdown("Hello world");
    expect(nodes).toHaveLength(1);
    const t = asText(nodes[0]!);
    expect(t.content).toBe("Hello world");
    expect(t.props.wrap).toBe("word");
  });

  test("paragraph with bold renders as wrapping HStack", () => {
    const nodes = Markdown("Hello **bold** world");
    expect(nodes).toHaveLength(1);
    const hstack = asContainer(nodes[0]!);
    expect(hstack.type).toBe("hstack");
    expect(hstack.props.flexWrap).toBe("wrap");
    // Children: "Hello", " ", bold("bold"), " ", "world"
    expect(hstack.children).toHaveLength(5);
    expect(asText(hstack.children[0]!).content).toBe("Hello");
    expect(asText(hstack.children[1]!).content).toBe(" ");
    const boldNode = asText(hstack.children[2]!);
    expect(boldNode.content).toBe("bold");
    expect(boldNode.props.bold).toBe(true);
    expect(asText(hstack.children[3]!).content).toBe(" ");
    expect(asText(hstack.children[4]!).content).toBe("world");
  });

  test("paragraph with italic renders styled nodes", () => {
    const nodes = Markdown("some *italic* text");
    const hstack = asContainer(nodes[0]!);
    expect(hstack.type).toBe("hstack");
    // "some", " ", italic("italic"), " ", "text"
    const italicNode = asText(hstack.children[2]!);
    expect(italicNode.content).toBe("italic");
    expect(italicNode.props.italic).toBe(true);
  });

  test("paragraph with inline code keeps code span atomic", () => {
    const nodes = Markdown("use `foo bar` here");
    const hstack = asContainer(nodes[0]!);
    expect(hstack.type).toBe("hstack");
    // "use", " ", code("foo bar"), " ", "here"
    expect(hstack.children).toHaveLength(5);
    const codeNode = asText(hstack.children[2]!);
    expect(codeNode.content).toBe("foo bar");
    expect(codeNode.props.fgColor).toBe("color03");
  });

  test("paragraph with link keeps link text atomic", () => {
    const nodes = Markdown("see [the docs](https://example.com) here");
    const hstack = asContainer(nodes[0]!);
    // "see", " ", link("the docs"), " ", "here"
    expect(hstack.children).toHaveLength(5);
    const linkNode = asText(hstack.children[2]!);
    expect(linkNode.content).toBe("the docs");
    expect(linkNode.props.fgColor).toBe("color06");
    expect(linkNode.props.underline).toBe(true);
  });

  test("paragraph with mixed formatting", () => {
    const nodes = Markdown("Hello, **bold**!");
    const hstack = asContainer(nodes[0]!);
    // "Hello,", " ", bold("bold"), "!"
    expect(hstack.children).toHaveLength(4);
    expect(asText(hstack.children[0]!).content).toBe("Hello,");
    expect(asText(hstack.children[1]!).content).toBe(" ");
    expect(asText(hstack.children[2]!).props.bold).toBe(true);
    // No space before "!" — punctuation is adjacent
    expect(asText(hstack.children[3]!).content).toBe("!");
  });

  test("code block renders as VStack with Text", () => {
    const nodes = Markdown("```js\nconst x = 1;\n```");
    expect(nodes).toHaveLength(1);
    const container = asContainer(nodes[0]!);
    expect(container.type).toBe("vstack");
    expect(container.props.padding).toEqual({ x: 1 });
    expect(container.props.bgColor).toBe("color08");
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
    expect(marker.props.fgColor).toBe("color03");

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
    expect(bar.props.fgColor).toBe("color02");

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
    expect(t.props.fgColor).toBe("color08");
  });

  test("blank line renders as empty Text", () => {
    const nodes = Markdown("hello\n\nworld");
    expect(nodes).toHaveLength(3);
    expect(textContent(nodes[1]!)).toBe("");
  });

  test("custom theme overrides defaults", () => {
    const nodes = Markdown("# Hello", {
      theme: { heading1: { bold: true, fgColor: "color05" } },
    });
    const t = asText(nodes[0]!);
    expect(t.props.fgColor).toBe("color05");
  });

  test("custom theme partial — unset properties use defaults", () => {
    const nodes = Markdown("# H1\n> quote", {
      theme: { heading1: { fgColor: "color01" } },
    });
    // Heading uses custom
    expect(asText(nodes[0]!).props.fgColor).toBe("color01");
    // Blockquote bar uses default
    const row = asContainer(nodes[1]!);
    expect(asText(row.children[0]!).props.fgColor).toBe("color02");
  });

  test("inline formatting in headings is stripped to plain text", () => {
    const nodes = Markdown("# Hello **world** and `code`");
    const t = asText(nodes[0]!);
    expect(t.content).toBe("Hello world and code");
  });

  test("link text is used, url is stripped", () => {
    const nodes = Markdown("See [the docs](https://example.com) here.");
    const hstack = asContainer(nodes[0]!);
    expect(hstack.type).toBe("hstack");
    expect(hstack.props.flexWrap).toBe("wrap");
    // "See", " ", link("the docs"), " ", "here."
    expect(hstack.children).toHaveLength(5);
    expect(asText(hstack.children[0]!).content).toBe("See");
    const link = asText(hstack.children[2]!);
    expect(link.content).toBe("the docs");
    expect(link.props.fgColor).toBe("color06");
    expect(asText(hstack.children[4]!).content).toBe("here.");
  });

  test("streaming: unclosed code block renders as code", () => {
    const nodes = Markdown("```js\nconst x = 1;");
    expect(nodes).toHaveLength(1);
    const container = asContainer(nodes[0]!);
    expect(container.props.bgColor).toBe("color08");
    expect(textContent(container.children[0]!)).toBe("const x = 1;");
  });

  test("streaming: unclosed bold appears as plain text", () => {
    // Unclosed ** is not parsed as bold — stays as text span
    const nodes = Markdown("hello **world");
    const t = asText(nodes[0]!);
    expect(t.content).toBe("hello **world");
    expect(t.props.wrap).toBe("word");
  });

  test("list item with inline formatting", () => {
    const nodes = Markdown("- hello **bold** world");
    const row = asContainer(nodes[0]!);
    expect(row.type).toBe("hstack");
    const wrapper = asContainer(row.children[1]!);
    expect(wrapper.type).toBe("vstack");
    // Content is a wrapping HStack
    const content = asContainer(wrapper.children[0]!);
    expect(content.type).toBe("hstack");
    expect(content.props.flexWrap).toBe("wrap");
    // "hello", " ", bold("bold"), " ", "world"
    expect(content.children).toHaveLength(5);
    expect(asText(content.children[2]!).props.bold).toBe(true);
  });

  test("blockquote with inline formatting", () => {
    const nodes = Markdown("> hello **bold** text");
    const row = asContainer(nodes[0]!);
    const wrapper = asContainer(row.children[1]!);
    const content = asContainer(wrapper.children[0]!);
    expect(content.type).toBe("hstack");
    expect(content.props.flexWrap).toBe("wrap");
    // blockquoteText style (italic) applied to the wrapping HStack
    expect(content.props.italic).toBe(true);
    // bold node inside inherits italic from parent, also has bold
    expect(asText(content.children[2]!).props.bold).toBe(true);
  });

  test("inline code theme is customizable", () => {
    const nodes = Markdown("use `code` here", {
      theme: { inlineCode: { fgColor: "color01", bgColor: "color00" } },
    });
    const hstack = asContainer(nodes[0]!);
    const codeNode = asText(hstack.children[2]!);
    expect(codeNode.props.fgColor).toBe("color01");
    expect(codeNode.props.bgColor).toBe("color00");
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
