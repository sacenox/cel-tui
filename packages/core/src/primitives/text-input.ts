import type { TextInputNode, TextInputProps } from "@cel-tui/types";

/**
 * Create a multi-line editable text container.
 *
 * TextInput accepts container sizing props (`flex`, `width`, `height`,
 * `padding`, `maxHeight`, etc.) but has no children — its content is the
 * {@link TextInputProps.value | value} prop.
 *
 * Word-wrap is always on. Cursor position is framework-managed unless the
 * controlled `cursor` prop is provided with `onCursorChange`.
 * `cursorStyle` selects a block (default), bar, or underline cursor for both
 * the painted fallback and native terminal cursor.
 * Scroll is always uncontrolled — the view follows the cursor and
 * responds to mouse wheel automatically.
 *
 * TextInput is focusable by default; pass `focusable: false` to remove it
 * from keyboard traversal and mouse focus. When focused through controlled
 * focus, it consumes insertable text
 * plus editing/navigation keys (arrows, backspace, delete, Enter, Tab),
 * along with a small set of readline-style shortcuts: `ctrl+a` / `ctrl+e`,
 * `alt+b` / `alt+f`, `ctrl+left` / `ctrl+right`, `ctrl+w`, and `alt+d`.
 * Word movement and deletion use whitespace-delimited boundaries, and
 * `up` / `down` follow visual wrapped lines. Other modifier combos (e.g.,
 * `ctrl+s`) and non-insertable control keys bubble up to ancestor
 * `onKeyPress` handlers.
 *
 * Use `onKeyPress` to intercept keys before editing. The handler receives a
 * normalized semantic key string and structured event metadata; `event.text`
 * preserves exact insertable characters. Return `false` to prevent the
 * default editing action.
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
 * // Growing input with max height, Enter submits
 * TextInput({
 *   flex: 1,
 *   maxHeight: 10,
 *   value: text,
 *   onChange: handleChange,
 *   onKeyPress: (key) => {
 *     if (key === "enter") { handleSend(); return false; }
 *   },
 *   placeholder: Text("type a message...", { fgColor: "color08" }),
 * })
 */
export function TextInput(props: TextInputProps): TextInputNode {
  return { type: "textinput", props };
}
