[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / ContainerNode

# Interface: ContainerNode

Defined in: [types/src/index.ts:322](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L322)

A layout container node in the UI tree.

Created by VStack (vertical) or HStack (horizontal).
Contains an ordered list of child nodes.

## Properties

### children

> **children**: [`Node`](../type-aliases/Node.md)[]

Defined in: [types/src/index.ts:328](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L328)

Ordered child nodes.

***

### props

> **props**: [`ContainerProps`](ContainerProps.md)

Defined in: [types/src/index.ts:326](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L326)

Container layout, sizing, and interaction props.

***

### type

> **type**: `"vstack"` \| `"hstack"`

Defined in: [types/src/index.ts:324](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L324)

`"vstack"` for vertical layout, `"hstack"` for horizontal.
