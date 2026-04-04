[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / StyleProps

# Interface: StyleProps

Defined in: [types/src/index.ts:32](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L32)

Styling props shared by all node types.

Maps directly to terminal SGR (Select Graphic Rendition) attributes.
Containers propagate their styles to descendants — child nodes inherit
the nearest ancestor's values unless they set a value explicitly.

## Extended by

- [`ContainerProps`](ContainerProps.md)
- [`TextProps`](TextProps.md)
- [`ButtonProps`](../../../components/src/interfaces/ButtonProps.md)

## Properties

### bgColor?

> `optional` **bgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:42](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L42)

Background color.

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:34](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L34)

Render text with bold weight.

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:40](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L40)

Foreground (text) color.

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:36](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L36)

Render text in italic style.

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:38](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L38)

Render text with an underline.
