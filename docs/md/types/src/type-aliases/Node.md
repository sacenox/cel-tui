[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / Node

# Type Alias: Node

> **Node** = [`TextNode`](../interfaces/TextNode.md) \| [`TextInputNode`](../interfaces/TextInputNode.md) \| [`ContainerNode`](../interfaces/ContainerNode.md)

Defined in: [types/src/index.ts:354](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L354)

Any node in the cel-tui UI tree.

The tree is built from three node types:
- [ContainerNode](../interfaces/ContainerNode.md) — layout containers (VStack, HStack)
- [TextNode](../interfaces/TextNode.md) — styled text leaf
- [TextInputNode](../interfaces/TextInputNode.md) — editable text container
