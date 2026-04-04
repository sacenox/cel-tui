/**
 * @module @cel-tui/components
 *
 * Pre-made components built with `@cel-tui/core` primitives.
 * These are convenience wrappers for common UI patterns.
 *
 * @example
 * ```ts
 * import { Spacer, Divider, Button, Select } from "@cel-tui/components";
 *
 * HStack({ height: 1 }, [
 *   Text("Title", { bold: true }),
 *   Spacer(),
 *   Button("[OK]", { onClick: handleOk }),
 * ])
 * ```
 */

export { Spacer } from "./spacer.js";
export { Divider, type DividerProps } from "./divider.js";
export { VDivider, type VDividerProps } from "./vdivider.js";
export { Button, type ButtonProps } from "./button.js";
export {
  Select,
  type SelectProps,
  type SelectItem,
  type SelectInstance,
} from "./select.js";
export {
  Markdown,
  tokenize,
  type MarkdownProps,
  type MarkdownTheme,
  type BlockToken,
  type InlineSpan,
} from "./markdown.js";
