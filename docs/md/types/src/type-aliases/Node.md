[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / Node

# Type Alias: Node

> **Node** = [`TextNode`](../interfaces/TextNode.md) \| [`TextInputNode`](../interfaces/TextInputNode.md) \| [`ContainerNode`](../interfaces/ContainerNode.md)

Defined in: [types/src/index.ts:418](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L418)

Any node in the cel-tui UI tree.

The tree is built from three node types:
- [ContainerNode](../interfaces/ContainerNode.md) — layout containers (VStack, HStack)
- [TextNode](../interfaces/TextNode.md) — styled text leaf
- [TextInputNode](../interfaces/TextInputNode.md) — editable text container
