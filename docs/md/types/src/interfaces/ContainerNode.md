[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [types/src](../README.md) / ContainerNode

# Interface: ContainerNode

Defined in: [types/src/index.ts:299](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L299)

A layout container node in the UI tree.

Created by VStack (vertical) or HStack (horizontal).
Contains an ordered list of child nodes.

## Properties

### children

> **children**: [`Node`](../type-aliases/Node.md)[]

Defined in: [types/src/index.ts:305](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L305)

Ordered child nodes.

---

### props

> **props**: [`ContainerProps`](ContainerProps.md)

Defined in: [types/src/index.ts:303](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L303)

Container layout, sizing, and interaction props.

---

### type

> **type**: `"vstack"` \| `"hstack"`

Defined in: [types/src/index.ts:301](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L301)

`"vstack"` for vertical layout, `"hstack"` for horizontal.
