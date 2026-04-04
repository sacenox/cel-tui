[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / Spacer

# Function: Spacer()

> **Spacer**(): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [components/src/spacer.ts:20](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/spacer.ts#L20)

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
