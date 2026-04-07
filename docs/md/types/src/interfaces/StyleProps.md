[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / StyleProps

# Interface: StyleProps

Defined in: [types/src/index.ts:69](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L69)

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

Defined in: [types/src/index.ts:79](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L79)

Background color.

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:71](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L71)

Render text with bold weight.

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:77](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L77)

Foreground (text) color.

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:73](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L73)

Render text in italic style.

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:75](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L75)

Render text with an underline.
