[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / ContainerNode

# Interface: ContainerNode

Defined in: [types/src/index.ts:373](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L373)

A layout container node in the UI tree.

Created by VStack (vertical) or HStack (horizontal).
Contains an ordered list of child nodes.

## Properties

### children

> **children**: [`Node`](../type-aliases/Node.md)[]

Defined in: [types/src/index.ts:379](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L379)

Ordered child nodes.

***

### props

> **props**: [`ContainerProps`](ContainerProps.md)

Defined in: [types/src/index.ts:377](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L377)

Container layout, sizing, and interaction props.

***

### type

> **type**: `"vstack"` \| `"hstack"`

Defined in: [types/src/index.ts:375](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L375)

`"vstack"` for vertical layout, `"hstack"` for horizontal.
