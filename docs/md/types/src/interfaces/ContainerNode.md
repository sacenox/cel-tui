[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / ContainerNode

# Interface: ContainerNode

Defined in: [types/src/index.ts:315](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L315)

A layout container node in the UI tree.

Created by VStack (vertical) or HStack (horizontal).
Contains an ordered list of child nodes.

## Properties

### children

> **children**: [`Node`](../type-aliases/Node.md)[]

Defined in: [types/src/index.ts:321](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L321)

Ordered child nodes.

***

### props

> **props**: [`ContainerProps`](ContainerProps.md)

Defined in: [types/src/index.ts:319](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L319)

Container layout, sizing, and interaction props.

***

### type

> **type**: `"vstack"` \| `"hstack"`

Defined in: [types/src/index.ts:317](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L317)

`"vstack"` for vertical layout, `"hstack"` for horizontal.
