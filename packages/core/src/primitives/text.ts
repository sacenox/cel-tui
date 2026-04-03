import type { TextNode, TextProps } from "@cel-tui/types";

/**
 * Create a styled text leaf node.
 *
 * Text has no children and no sizing props — the parent container
 * controls the box. Width is always parent-assigned. Height is intrinsic,
 * computed from content, newlines (`\n`), and word-wrapping at the given width.
 *
 * Whitespace is always preserved. Content that exceeds the box is
 * hard-clipped (no ellipsis).
 *
 * @param content - The text string to display.
 * @param props - Styling, repeat, and wrapping props.
 * @returns A text node for the UI tree.
 *
 * @example
 * // Simple styled text
 * Text("Hello", { bold: true, fgColor: "cyan" })
 *
 * // Horizontal divider
 * Text("─", { repeat: "fill" })
 *
 * // Word-wrapped paragraph
 * Text(paragraph, { wrap: "word" })
 */
export function Text(content: string, props: TextProps = {}): TextNode {
  return { type: "text", content, props };
}
