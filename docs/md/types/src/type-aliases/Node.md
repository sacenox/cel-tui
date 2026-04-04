[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / Node

# Type Alias: Node

> **Node** = [`TextNode`](../interfaces/TextNode.md) \| [`TextInputNode`](../interfaces/TextInputNode.md) \| [`ContainerNode`](../interfaces/ContainerNode.md)

Defined in: [types/src/index.ts:332](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L332)

Any node in the cel-tui UI tree.

The tree is built from three node types:
- [ContainerNode](../interfaces/ContainerNode.md) — layout containers (VStack, HStack)
- [TextNode](../interfaces/TextNode.md) — styled text leaf
- [TextInputNode](../interfaces/TextInputNode.md) — editable text container
