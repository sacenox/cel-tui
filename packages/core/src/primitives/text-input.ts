import type { TextInputNode, TextInputProps } from "@cel-tui/types";

/**
 * Create a multi-line editable text container.
 *
 * TextInput accepts container sizing props (`flex`, `width`, `height`,
 * `padding`, `maxHeight`, etc.) but has no children — its content is the
 * {@link TextInputProps.value | value} prop.
 *
 * Word-wrap is always on. Cursor position is framework-managed.
 * Scroll is always uncontrolled — the view follows the cursor and
 * responds to mouse wheel automatically.
 *
 * TextInput is always focusable. When focused, text-editing keys
 * (printable characters, arrows, backspace, Tab) are consumed.
 * Modifier combos (e.g., `ctrl+s`) bubble up to ancestor `onKeyPress` handlers.
 *
 * @param props - Value, callbacks, sizing, styling, and focus props.
 * @returns A text input node for the UI tree.
 *
 * @example
 * // Basic input
 * TextInput({
 *   value: text,
 *   onChange: (v) => { text = v; cel.render(); },
 * })
 *
 * @example
 * // Growing input with max height
 * TextInput({
 *   flex: 1,
 *   maxHeight: 10,
 *   value: text,
 *   onChange: handleChange,
 *   onSubmit: handleSend,
 *   submitKey: "ctrl+enter",
 *   placeholder: Text("type a message...", { fgColor: "brightBlack" }),
 * })
 */
export function TextInput(props: TextInputProps): TextInputNode {
  return { type: "textinput", props };
}
