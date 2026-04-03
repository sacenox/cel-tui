[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / Spacer

# Function: Spacer()

> **Spacer**(): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [components/src/spacer.ts:20](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/components/src/spacer.ts#L20)

Flexible spacer that fills available space along the parent's main axis.

Equivalent to an empty `VStack({ flex: 1 }, [])`. Use inside an HStack
to push siblings apart, or inside a VStack for vertical spacing.

## Returns

[`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

A flex container node that expands to fill remaining space.

## Example

```ts
// Push items to opposite ends of a row
HStack({ height: 1 }, [
  Text("left"),
  Spacer(),
  Text("right"),
])
```
