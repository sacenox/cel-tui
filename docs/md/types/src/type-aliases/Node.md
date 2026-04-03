[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [types/src](../README.md) / Node

# Type Alias: Node

> **Node** = [`TextNode`](../interfaces/TextNode.md) \| [`TextInputNode`](../interfaces/TextInputNode.md) \| [`ContainerNode`](../interfaces/ContainerNode.md)

Defined in: [types/src/index.ts:316](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L316)

Any node in the cel-tui UI tree.

The tree is built from three node types:

- [ContainerNode](../interfaces/ContainerNode.md) — layout containers (VStack, HStack)
- [TextNode](../interfaces/TextNode.md) — styled text leaf
- [TextInputNode](../interfaces/TextInputNode.md) — editable text container
