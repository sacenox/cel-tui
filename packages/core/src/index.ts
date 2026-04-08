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
  ThemeValue,
  Theme,
  StyleProps,
  SizeValue,
  ContainerProps,
  TextProps,
  TextInputProps,
  TextNode,
  TextInputNode,
  ContainerNode,
  Node,
} from "@cel-tui/types";

export { VStack, HStack } from "./primitives/stacks.js";
export { Text } from "./primitives/text.js";
export { TextInput } from "./primitives/text-input.js";
export { cel } from "./cel.js";
export { measureContentHeight } from "./layout.js";
export { CellBuffer, EMPTY_CELL, type Cell } from "./cell-buffer.js";
export { emitBuffer, defaultTheme } from "./emitter.js";
export { visibleWidth, extractAnsiCode } from "./width.js";
export { type Terminal, ProcessTerminal, MockTerminal } from "./terminal.js";
