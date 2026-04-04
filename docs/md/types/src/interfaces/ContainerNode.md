[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / ContainerNode

# Interface: ContainerNode

Defined in: [types/src/index.ts:337](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L337)

A layout container node in the UI tree.

Created by VStack (vertical) or HStack (horizontal).
Contains an ordered list of child nodes.

## Properties

### children

> **children**: [`Node`](../type-aliases/Node.md)[]

Defined in: [types/src/index.ts:343](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L343)

Ordered child nodes.

***

### props

> **props**: [`ContainerProps`](ContainerProps.md)

Defined in: [types/src/index.ts:341](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L341)

Container layout, sizing, and interaction props.

***

### type

> **type**: `"vstack"` \| `"hstack"`

Defined in: [types/src/index.ts:339](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L339)

`"vstack"` for vertical layout, `"hstack"` for horizontal.
