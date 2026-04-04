import type { Color, Node, StyleProps } from "@cel-tui/types";
import { VStack, HStack, Text } from "@cel-tui/core";
import { tokenize, type BlockToken, type InlineSpan } from "yoctomarkdown";
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
 * Parses the content into block-level tokens (via
 * [yoctomarkdown](https://www.npmjs.com/package/yoctomarkdown))
 * and maps each to styled primitives. The returned array is meant
 * to be used as children of a container (typically a scrollable VStack).
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
