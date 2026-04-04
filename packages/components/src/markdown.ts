import type { Color, Node, StyleProps } from "@cel-tui/types";
import { VStack, HStack, Text } from "@cel-tui/core";
import { Divider } from "./divider.js";

// ─── Token Types ────────────────────────────────────────────────
// These mirror the token API that yoctomarkdown will expose after
// its ANSI-free refactor. Until then, we use a local tokenizer.

/**
 * An inline span within a block of markdown text.
 *
 * Represents a segment of text with a specific formatting type.
 * A paragraph like `"Some **bold** and *italic* text"` is parsed
 * into an array of spans:
 * ```
 * [
 *   { type: "text", content: "Some " },
 *   { type: "bold", content: "bold" },
 *   { type: "text", content: " and " },
 *   { type: "italic", content: "italic" },
 *   { type: "text", content: " text" },
 * ]
 * ```
 */
export type InlineSpan =
  | { type: "text"; content: string }
  | { type: "bold"; content: string }
  | { type: "italic"; content: string }
  | { type: "code"; content: string }
  | { type: "link"; text: string; url: string };

/**
 * A block-level markdown token.
 *
 * Each token represents one logical block in the document:
 * a heading, paragraph, code block, list item, blockquote,
 * horizontal rule, or blank line.
 */
export type BlockToken =
  | { type: "heading"; depth: 1 | 2 | 3; spans: InlineSpan[] }
  | { type: "paragraph"; spans: InlineSpan[] }
  | { type: "code_block"; lang: string; content: string }
  | {
      type: "list_item";
      ordered: boolean;
      index: number;
      spans: InlineSpan[];
    }
  | { type: "blockquote"; spans: InlineSpan[] }
  | { type: "hr" }
  | { type: "blank" };

// ─── Tokenizer ──────────────────────────────────────────────────
// Line-by-line parser matching yoctomarkdown's supported subset.
// Will be replaced by yoctomarkdown's token API once available.

/**
 * Parse inline formatting within a line of text.
 *
 * Recognizes: `` `code` ``, `**bold**`, `*italic*`, `[text](url)`.
 * Unclosed constructs are emitted as plain text (safe for streaming).
 *
 * @param text - A single line of text (no newlines).
 * @returns Array of inline spans.
 */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let i = 0;
  let current = "";

  function flush(): void {
    if (current.length > 0) {
      spans.push({ type: "text", content: current });
      current = "";
    }
  }

  while (i < text.length) {
    // Inline code: `code`
    if (text[i] === "`" && text[i + 1] !== "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        flush();
        spans.push({ type: "code", content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Bold: **text**
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        flush();
        spans.push({ type: "bold", content: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // Italic: *text* (not **)
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1 && text[end + 1] !== "*") {
        flush();
        spans.push({ type: "italic", content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Link: [text](url)
    if (text[i] === "[") {
      const bracketEnd = text.indexOf("]", i + 1);
      if (bracketEnd !== -1 && text[bracketEnd + 1] === "(") {
        const parenEnd = text.indexOf(")", bracketEnd + 2);
        if (parenEnd !== -1) {
          flush();
          spans.push({
            type: "link",
            text: text.slice(i + 1, bracketEnd),
            url: text.slice(bracketEnd + 2, parenEnd),
          });
          i = parenEnd + 1;
          continue;
        }
      }
    }

    current += text[i];
    i++;
  }

  flush();
  return spans;
}

/**
 * Tokenize a markdown string into block-level tokens.
 *
 * Parses line-by-line, recognizing headings, code blocks, lists,
 * blockquotes, horizontal rules, and paragraphs. Inline formatting
 * within text blocks is parsed into {@link InlineSpan} arrays.
 *
 * Handles streaming gracefully: unclosed code blocks are emitted
 * as `code_block` tokens, and unclosed inline formatting appears
 * as plain text.
 *
 * @param content - Markdown string (may be partial during streaming).
 * @returns Array of block tokens.
 */
export function tokenize(content: string): BlockToken[] {
  const tokens: BlockToken[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  for (const line of lines) {
    if (inCodeBlock) {
      if (line.trim().startsWith("```")) {
        tokens.push({
          type: "code_block",
          lang: codeBlockLang,
          content: codeBlockLines.join("\n"),
        });
        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockLines = [];
        continue;
      }
      codeBlockLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Code block opening
    if (trimmed.startsWith("```")) {
      inCodeBlock = true;
      codeBlockLang = trimmed.slice(3).trim();
      continue;
    }

    // Horizontal rule
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      tokens.push({ type: "hr" });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const depth = headingMatch[1]!.length as 1 | 2 | 3;
      tokens.push({
        type: "heading",
        depth,
        spans: parseInline(headingMatch[2]!),
      });
      continue;
    }

    // Blockquote
    const bqMatch = line.match(/^>\s?(.*)$/);
    if (bqMatch) {
      tokens.push({ type: "blockquote", spans: parseInline(bqMatch[1]!) });
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      tokens.push({
        type: "list_item",
        ordered: false,
        index: 0,
        spans: parseInline(ulMatch[1]!),
      });
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      tokens.push({
        type: "list_item",
        ordered: true,
        index: parseInt(olMatch[1]!, 10),
        spans: parseInline(olMatch[2]!),
      });
      continue;
    }

    // Blank line
    if (trimmed === "") {
      tokens.push({ type: "blank" });
      continue;
    }

    // Plain paragraph
    tokens.push({ type: "paragraph", spans: parseInline(line) });
  }

  // Unclosed code block — emit what we have (streaming case)
  if (inCodeBlock) {
    tokens.push({
      type: "code_block",
      lang: codeBlockLang,
      content: codeBlockLines.join("\n"),
    });
  }

  return tokens;
}

// ─── Theme ──────────────────────────────────────────────────────

/**
 * Style configuration for the {@link Markdown} component.
 *
 * Each property controls the styling of a specific markdown element.
 * All properties are optional — unset values fall back to the
 * built-in default theme.
 */
export interface MarkdownTheme {
  /** Style for `# heading` (level 1). */
  heading1?: StyleProps;
  /** Style for `## heading` (level 2). */
  heading2?: StyleProps;
  /** Style for `### heading` (level 3). */
  heading3?: StyleProps;
  /** Container style for fenced code blocks (applied to the wrapping VStack). */
  codeBlock?: StyleProps;
  /** Text style inside fenced code blocks. */
  codeContent?: StyleProps;
  /** Style for list markers (`•`, `1.`). */
  listMarker?: StyleProps;
  /** Style for the blockquote bar character (`│`). */
  blockquoteBar?: StyleProps;
  /** Text style for blockquote content. */
  blockquoteText?: StyleProps;
  /** Divider color and character for horizontal rules. */
  hr?: { fgColor?: Color; char?: string };
}

const defaults: Required<MarkdownTheme> = {
  heading1: { bold: true, fgColor: "cyan" },
  heading2: { bold: true, fgColor: "yellow" },
  heading3: { bold: true, fgColor: "green" },
  codeBlock: { bgColor: "brightBlack" },
  codeContent: {},
  listMarker: { fgColor: "yellow", bold: true },
  blockquoteBar: { fgColor: "green" },
  blockquoteText: { italic: true },
  hr: { fgColor: "brightBlack", char: "─" },
};

function resolveTheme(theme?: MarkdownTheme): Required<MarkdownTheme> {
  if (!theme) return defaults;
  return {
    heading1: theme.heading1 ?? defaults.heading1,
    heading2: theme.heading2 ?? defaults.heading2,
    heading3: theme.heading3 ?? defaults.heading3,
    codeBlock: theme.codeBlock ?? defaults.codeBlock,
    codeContent: theme.codeContent ?? defaults.codeContent,
    listMarker: theme.listMarker ?? defaults.listMarker,
    blockquoteBar: theme.blockquoteBar ?? defaults.blockquoteBar,
    blockquoteText: theme.blockquoteText ?? defaults.blockquoteText,
    hr: theme.hr ?? defaults.hr,
  };
}

// ─── Helpers ────────────────────────────────────────────────────

/** Concatenate inline spans into plain text (markdown markers stripped). */
function spansToText(spans: InlineSpan[]): string {
  return spans.map((s) => (s.type === "link" ? s.text : s.content)).join("");
}

// ─── Component ──────────────────────────────────────────────────

/** Props for the {@link Markdown} component. */
export interface MarkdownProps {
  /**
   * Theme overrides. Unset properties fall back to the built-in
   * default theme (cyan headings, yellow code blocks, etc.).
   */
  theme?: MarkdownTheme;
}

/**
 * Render a markdown string as an array of cel-tui nodes.
 *
 * Parses the content into block-level tokens and maps each to
 * styled primitives. The returned array is meant to be used as
 * children of a container (typically a scrollable VStack).
 *
 * **Block-level styling** is fully supported: headings, code blocks,
 * lists, blockquotes, and horizontal rules are rendered with distinct
 * styles. **Inline styling** (bold, italic, code, links within
 * paragraphs) is not yet rendered — inline-formatted text appears
 * as clean plain text with markdown markers stripped.
 *
 * **Streaming** works naturally: append chunks to the content string
 * and call `cel.render()`. The component re-tokenizes the full string
 * each render. Unclosed code blocks and inline formatting are handled
 * gracefully.
 *
 * @param content - Markdown string (may be partial during streaming).
 * @param props - Optional theme overrides.
 * @returns Array of nodes to spread into a container's children.
 *
 * @example
 * // Static content
 * VStack({ flex: 1, overflow: "scroll", padding: { x: 1 } },
 *   Markdown("# Hello\n\nSome **bold** text.\n\n```js\nconst x = 1;\n```")
 * )
 *
 * @example
 * // Streaming from an LLM
 * let content = "";
 * onChunk((chunk) => { content += chunk; cel.render(); });
 *
 * VStack({ flex: 1, overflow: "scroll" },
 *   Markdown(content)
 * )
 *
 * @example
 * // Custom theme
 * Markdown(content, {
 *   theme: { heading1: { bold: true, fgColor: "magenta" } }
 * })
 */
export function Markdown(content: string, props?: MarkdownProps): Node[] {
  const theme = resolveTheme(props?.theme);
  const tokens = tokenize(content);
  const nodes: Node[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const style =
          token.depth === 1
            ? theme.heading1
            : token.depth === 2
              ? theme.heading2
              : theme.heading3;
        nodes.push(Text(spansToText(token.spans), style));
        break;
      }

      case "paragraph":
        nodes.push(Text(spansToText(token.spans), { wrap: "word" }));
        break;

      case "code_block":
        nodes.push(
          VStack({ padding: { x: 1 }, ...theme.codeBlock }, [
            Text(token.content, theme.codeContent),
          ]),
        );
        break;

      case "list_item": {
        const marker = token.ordered ? `${token.index}.` : "•";
        nodes.push(
          HStack({}, [
            Text(`${marker} `, theme.listMarker),
            VStack({ flex: 1 }, [
              Text(spansToText(token.spans), { wrap: "word" }),
            ]),
          ]),
        );
        break;
      }

      case "blockquote":
        nodes.push(
          HStack({}, [
            Text("│ ", theme.blockquoteBar),
            VStack({ flex: 1 }, [
              Text(spansToText(token.spans), {
                wrap: "word",
                ...theme.blockquoteText,
              }),
            ]),
          ]),
        );
        break;

      case "hr":
        nodes.push(Divider({ fgColor: theme.hr.fgColor, char: theme.hr.char }));
        break;

      case "blank":
        nodes.push(Text(""));
        break;
    }
  }

  return nodes;
}
