[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / Node

# Type Alias: Node

> **Node** = [`TextNode`](../interfaces/TextNode.md) \| [`TextInputNode`](../interfaces/TextInputNode.md) \| [`ContainerNode`](../interfaces/ContainerNode.md)

Defined in: [types/src/index.ts:390](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L390)

Any node in the cel-tui UI tree.

The tree is built from three node types:
- [ContainerNode](../interfaces/ContainerNode.md) — layout containers (VStack, HStack)
- [TextNode](../interfaces/TextNode.md) — styled text leaf
- [TextInputNode](../interfaces/TextInputNode.md) — editable text container
