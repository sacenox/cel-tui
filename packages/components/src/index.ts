/**
 * @module @cel-tui/components
 *
 * Pre-made components built with `@cel-tui/core` primitives.
 * These are convenience wrappers for common UI patterns.
 *
 * @example
 * ```ts
 * import { Spacer, Divider, VDivider, Button, Select, Markdown, SyntaxHighlight } from "@cel-tui/components";
 *
 * HStack({ height: 1 }, [
 *   Text("Title", { bold: true }),
 *   Spacer(),
 *   Button("[OK]", { onClick: handleOk }),
 * ])
 * ```
 */

export { Button, type ButtonProps } from "./button.js";
export { Divider, type DividerProps } from "./divider.js";
export {
  type BlockToken,
  type InlineSpan,
  Markdown,
  type MarkdownProps,
  type MarkdownTheme,
  tokenize,
} from "./markdown.js";
export {
  Select,
  type SelectInstance,
  type SelectItem,
  type SelectProps,
} from "./select.js";
export { Spacer } from "./spacer.js";
export {
  SyntaxHighlight,
  type SyntaxHighlightProps,
  type SyntaxHighlightTheme,
} from "./syntax-highlight.js";
export { VDivider, type VDividerProps } from "./vdivider.js";
