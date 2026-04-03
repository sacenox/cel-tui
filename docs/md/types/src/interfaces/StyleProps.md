[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [types/src](../README.md) / StyleProps

# Interface: StyleProps

Defined in: [types/src/index.ts:31](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L31)

Styling props shared by [TextProps](TextProps.md) and [TextInputProps](TextInputProps.md).

Maps directly to terminal SGR (Select Graphic Rendition) attributes.
There is no style inheritance — every node sets its own styles explicitly.

## Extended by

- [`TextProps`](TextProps.md)
- [`TextInputProps`](TextInputProps.md)

## Properties

### bgColor?

> `optional` **bgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:41](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L41)

Background color.

---

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:33](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L33)

Render text with bold weight.

---

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:39](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L39)

Foreground (text) color.

---

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:35](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L35)

Render text in italic style.

---

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:37](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L37)

Render text with an underline.
