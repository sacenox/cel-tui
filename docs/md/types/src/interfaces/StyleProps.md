[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / StyleProps

# Interface: StyleProps

Defined in: [types/src/index.ts:32](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L32)

Styling props shared by all node types.

Maps directly to terminal SGR (Select Graphic Rendition) attributes.
Containers propagate their styles to descendants — child nodes inherit
the nearest ancestor's values unless they set a value explicitly.

## Extended by

- [`ContainerProps`](ContainerProps.md)
- [`TextProps`](TextProps.md)

## Properties

### bgColor?

> `optional` **bgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:42](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L42)

Background color.

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:34](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L34)

Render text with bold weight.

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:40](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L40)

Foreground (text) color.

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:36](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L36)

Render text in italic style.

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:38](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L38)

Render text with an underline.
