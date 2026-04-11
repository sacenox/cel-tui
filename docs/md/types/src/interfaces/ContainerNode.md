[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / ContainerNode

# Interface: ContainerNode

Defined in: [types/src/index.ts:401](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L401)

A layout container node in the UI tree.

Created by `VStack` (vertical) or `HStack` (horizontal).
Contains an ordered list of child nodes.

## Properties

### children

> **children**: [`Node`](../type-aliases/Node.md)[]

Defined in: [types/src/index.ts:407](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L407)

Ordered child nodes.

***

### props

> **props**: [`ContainerProps`](ContainerProps.md)

Defined in: [types/src/index.ts:405](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L405)

Container layout, sizing, and interaction props.

***

### type

> **type**: `"vstack"` \| `"hstack"`

Defined in: [types/src/index.ts:403](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L403)

`"vstack"` for vertical layout, `"hstack"` for horizontal.
