/**
 * @module @cel-tui/core
 *
 * Core framework package. Provides the four primitives ({@link VStack},
 * {@link HStack}, {@link Text}, {@link TextInput}), the framework
 * entrypoint ({@link cel}), and measurement helpers such as
 * {@link measureContentHeight}.
 *
 * All types are re-exported from `@cel-tui/types`.
 *
 * @example
 * ```ts
 * import { cel, VStack, HStack, Text, TextInput, ProcessTerminal } from "@cel-tui/core";
 *
 * let name = "";
 *
 * cel.init(new ProcessTerminal());
 * cel.viewport(() =>
 *   VStack({ height: "100%" }, [
 *     Text("What is your name?", { bold: true }),
 *     TextInput({
 *       value: name,
 *       onChange: (v) => { name = v; cel.render(); },
 *     }),
 *   ])
 * );
 * ```
 */

export type {
  Color,
  ContainerNode,
  ContainerProps,
  CursorStyle,
  FocusChangeEvent,
  FocusChangeHandler,
  FocusChangeReason,
  KeyEvent,
  KeyEventType,
  KeyModifiers,
  KeyPressHandler,
  KittyKeyboardOptions,
  Node,
  ScrollbarPartStyle,
  ScrollbarStyle,
  ScrollHandler,
  SizeValue,
  StateKey,
  StyleProps,
  TextInputBaseProps,
  TextInputNode,
  TextInputProps,
  TextNode,
  TextProps,
  Theme,
  ThemeValue,
} from "@cel-tui/types";
export { type Cel, type CelInitOptions, cel, type RenderFn } from "./cel.js";
export { type Cell, CellBuffer, EMPTY_CELL } from "./cell-buffer.js";
export {
  defaultTheme,
  type EmitOptions,
  emitBuffer,
  type TerminalCursorState,
} from "./emitter.js";
export { measureContentHeight } from "./layout.js";
export { HStack, VStack } from "./primitives/stacks.js";
export { Text } from "./primitives/text.js";
export { TextInput } from "./primitives/text-input.js";
export {
  MockTerminal,
  ProcessTerminal,
  type Terminal,
  type TerminalStartOptions,
} from "./terminal.js";
export { extractAnsiCode, visibleWidth } from "./width.js";
