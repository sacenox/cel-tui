[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / TextInput

# Function: TextInput()

> **TextInput**(`props`): [`TextInputNode`](../../../types/src/interfaces/TextInputNode.md)

Defined in: [core/src/primitives/text-input.ts:50](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/primitives/text-input.ts#L50)

Create a multi-line editable text container.

TextInput accepts container sizing props (`flex`, `width`, `height`,
`padding`, `maxHeight`, etc.) but has no children — its content is the
[value](../../../types/src/interfaces/TextInputProps.md#value) prop.

Word-wrap is always on. Cursor position is framework-managed.
Scroll is always uncontrolled — the view follows the cursor and
responds to mouse wheel automatically.

TextInput is always focusable. When focused, it consumes insertable text
plus editing/navigation keys (arrows, backspace, delete, Enter, Tab),
along with a small set of readline-style shortcuts: `ctrl+a` / `ctrl+e`,
`alt+b` / `alt+f`, `ctrl+left` / `ctrl+right`, `ctrl+w`, and `alt+d`.
Word movement and deletion use whitespace-delimited boundaries, and
`up` / `down` follow visual wrapped lines. Other modifier combos (e.g.,
`ctrl+s`) and non-insertable control keys bubble up to ancestor
`onKeyPress` handlers.

Use `onKeyPress` to intercept keys before editing. The handler receives a
normalized semantic key string; inserted text preserves the original
characters. Return `false` to prevent the default editing action.

## Parameters

### props

[`TextInputProps`](../../../types/src/interfaces/TextInputProps.md)

Value, callbacks, sizing, styling, and focus props.

## Returns

[`TextInputNode`](../../../types/src/interfaces/TextInputNode.md)

A text input node for the UI tree.

## Examples

```ts
// Basic input
TextInput({
  value: text,
  onChange: (v) => { text = v; cel.render(); },
})
```

```ts
// Growing input with max height, Enter submits
TextInput({
  flex: 1,
  maxHeight: 10,
  value: text,
  onChange: handleChange,
  onKeyPress: (key) => {
    if (key === "enter") { handleSend(); return false; }
  },
  placeholder: Text("type a message...", { fgColor: "color08" }),
})
```
