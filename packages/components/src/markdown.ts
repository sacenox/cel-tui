import { HStack, Text, VStack } from "@cel-tui/core";
import type { Color, Node, StyleProps } from "@cel-tui/types";
import { type InlineSpan, tokenize } from "yoctomarkdown";
import { Divider } from "./divider.js";

// Re-export token types so consumers don't need a direct yoctomarkdown dep
export type { BlockToken, InlineSpan } from "yoctomarkdown";
export { tokenize } from "yoctomarkdown";

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
  /** Style for **bold** inline text. */
  bold?: StyleProps;
  /** Style for *italic* inline text. */
  italic?: StyleProps;
  /** Style for `inline code` text. */
  inlineCode?: StyleProps;
  /** Style for `[link](url)` inline text. */
  link?: StyleProps;
}

const defaults: Required<MarkdownTheme> = {
  heading1: { bold: true, fgColor: "color06" },
  heading2: { bold: true, fgColor: "color03" },
  heading3: { bold: true, fgColor: "color02" },
  codeBlock: { bgColor: "color08" },
  codeContent: {},
  listMarker: { fgColor: "color03", bold: true },
  blockquoteBar: { fgColor: "color02" },
  blockquoteText: { italic: true },
  hr: { fgColor: "color08", char: "─" },
  bold: { bold: true },
  italic: { italic: true },
  inlineCode: { fgColor: "color03" },
  link: { fgColor: "color06", underline: true },
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
    bold: theme.bold ?? defaults.bold,
    italic: theme.italic ?? defaults.italic,
    inlineCode: theme.inlineCode ?? defaults.inlineCode,
    link: theme.link ?? defaults.link,
  };
}

// ─── Helpers ────────────────────────────────────────────────────

/** Concatenate inline spans into plain text (markdown markers stripped). */
function spansToText(spans: InlineSpan[]): string {
  return spans.map((s) => (s.type === "link" ? s.text : s.content)).join("");
}

/** Check whether spans contain any inline formatting. */
function hasFormatting(spans: InlineSpan[]): boolean {
  return spans.some((s) => s.type !== "text");
}

/**
 * Convert inline spans into individual Text nodes for use inside a
 * wrapping HStack. Text/bold/italic spans are split at word/whitespace
 * boundaries (`/\S+|\s+/g`) so flexWrap can break between words.
 * Code and link spans are kept atomic (single node, no split).
 */
function spansToNodes(
  spans: InlineSpan[],
  theme: Required<MarkdownTheme>,
): Node[] {
  const nodes: Node[] = [];

  for (const span of spans) {
    let style: StyleProps;
    let text: string;

    switch (span.type) {
      case "text":
        style = {};
        text = span.content;
        break;
      case "bold":
        style = theme.bold;
        text = span.content;
        break;
      case "italic":
        style = theme.italic;
        text = span.content;
        break;
      case "code":
        // Code spans are atomic — don't split at word boundaries
        nodes.push(Text(span.content, theme.inlineCode));
        continue;
      case "link":
        // Links are atomic — keep link text as one unit
        nodes.push(Text(span.text, theme.link));
        continue;
    }

    // Split at word/whitespace boundaries so flexWrap can break between words
    const pieces = text.match(/\S+|\s+/g);
    if (pieces) {
      for (const piece of pieces) {
        nodes.push(Text(piece, style));
      }
    }
  }

  return nodes;
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
 * Parses the content into block-level tokens (via
 * [yoctomarkdown](https://www.npmjs.com/package/yoctomarkdown))
 * and maps each to styled primitives. The returned array is meant
 * to be used as children of a container (typically a scrollable VStack).
 *
 * **Block-level styling** is fully supported: headings, code blocks,
 * lists, blockquotes, and horizontal rules are rendered with distinct
 * styles. **Inline styling** (bold, italic, code, links) is rendered
 * in paragraphs, list items, and blockquotes by splitting spans at
 * word boundaries into individual `Text` nodes inside a wrapping
 * `HStack({ flexWrap: "wrap" })`. Headings strip inline formatting
 * to plain text (they're typically short and single-line).
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
 *   theme: { heading1: { bold: true, fgColor: "color05" } }
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
        if (hasFormatting(token.spans)) {
          nodes.push(
            HStack({ flexWrap: "wrap" }, spansToNodes(token.spans, theme)),
          );
        } else {
          nodes.push(Text(spansToText(token.spans), { wrap: "word" }));
        }
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
        const liContent = hasFormatting(token.spans)
          ? HStack({ flexWrap: "wrap" }, spansToNodes(token.spans, theme))
          : Text(spansToText(token.spans), { wrap: "word" });
        nodes.push(
          HStack({}, [
            Text(`${marker} `, theme.listMarker),
            VStack({ flex: 1 }, [liContent]),
          ]),
        );
        break;
      }

      case "blockquote": {
        const bqContent = hasFormatting(token.spans)
          ? HStack(
              { flexWrap: "wrap", ...theme.blockquoteText },
              spansToNodes(token.spans, theme),
            )
          : Text(spansToText(token.spans), {
              wrap: "word",
              ...theme.blockquoteText,
            });
        nodes.push(
          HStack({}, [
            Text("│ ", theme.blockquoteBar),
            VStack({ flex: 1 }, [bqContent]),
          ]),
        );
        break;
      }

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
