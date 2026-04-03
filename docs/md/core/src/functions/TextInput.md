[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [core/src](../README.md) / TextInput

# Function: TextInput()

> **TextInput**(`props`): [`TextInputNode`](../../../types/src/interfaces/TextInputNode.md)

Defined in: [core/src/primitives/text-input.ts:40](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/primitives/text-input.ts#L40)

Create a multi-line editable text container.

TextInput accepts container sizing props (`flex`, `width`, `height`,
`padding`, `maxHeight`, etc.) but has no children — its content is the
[value](../../../types/src/interfaces/TextInputProps.md#value) prop.

Word-wrap is always on. Cursor position is framework-managed.
Scroll is always uncontrolled — the view follows the cursor and
responds to mouse wheel automatically.

TextInput is always focusable. When focused, text-editing keys
(printable characters, arrows, backspace, Tab) are consumed.
Modifier combos (e.g., `ctrl+s`) bubble up to ancestor `onKeyPress` handlers.

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
  onChange: (v) => {
    text = v;
    cel.render();
  },
});
```

```ts
// Growing input with max height
TextInput({
  flex: 1,
  maxHeight: 10,
  value: text,
  onChange: handleChange,
  onSubmit: handleSend,
  submitKey: "ctrl+enter",
  placeholder: Text("type a message...", { fgColor: "brightBlack" }),
});
```
