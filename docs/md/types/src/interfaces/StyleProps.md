[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / StyleProps

# Interface: StyleProps

Defined in: [types/src/index.ts:68](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L68)

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

Defined in: [types/src/index.ts:78](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L78)

Background color.

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:70](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L70)

Render text with bold weight.

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:76](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L76)

Foreground (text) color.

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:72](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L72)

Render text in italic style.

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:74](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L74)

Render text with an underline.
