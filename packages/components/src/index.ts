/**
 * @module @cel-tui/components
 *
 * Pre-made components built with `@cel-tui/core` primitives.
 * These are convenience wrappers for common UI patterns.
 *
 * @example
 * ```ts
 * import { Spacer, Divider, VDivider, Button, Select, VirtualList, Spinner, Markdown, SyntaxHighlight } from "@cel-tui/components";
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
  type NormalizedItem,
  prefixFilter,
  Select,
  type SelectFilter,
  type SelectInstance,
  type SelectItem,
  type SelectModel,
  type SelectProps,
  type SelectRowContext,
  type SelectRowRenderer,
  type SelectState,
} from "./select.js";
export { Spacer } from "./spacer.js";
export {
  DEFAULT_SPINNER_FRAMES,
  Spinner,
  type SpinnerInstance,
  type SpinnerProps,
} from "./spinner.js";
export {
  createSyntaxHighlight,
  SyntaxHighlight,
  type SyntaxHighlightInstance,
  type SyntaxHighlightNativeTheme,
  type SyntaxHighlightProps,
  type SyntaxHighlightTheme,
  type SyntaxHighlightThemeRegistration,
  type SyntaxHighlightThemeTokenColor,
} from "./syntax-highlight.js";
export {
  createTicker,
  type Ticker,
  type TickerOptions,
  type TickerTick,
} from "./ticker.js";
export { VDivider, type VDividerProps } from "./vdivider.js";
export {
  VirtualList,
  type VirtualListInstance,
  type VirtualListOptions,
  type VirtualListProps,
  type VirtualListScrollHandler,
  type VirtualListScrollReason,
  type VirtualListState,
} from "./virtual-list.js";
