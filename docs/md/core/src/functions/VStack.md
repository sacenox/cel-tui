[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / VStack

# Function: VStack()

> **VStack**(`props`, `children`): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [core/src/primitives/stacks.ts:19](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/primitives/stacks.ts#L19)

Create a vertical stack container — children laid out top to bottom.

Equivalent to CSS `flex-direction: column`. Main axis is vertical,
cross axis is horizontal.

## Parameters

### props

[`ContainerProps`](../../../types/src/interfaces/ContainerProps.md)

Layout, sizing, scrolling, focus, and interaction props.

### children

[`Node`](../../../types/src/type-aliases/Node.md)[]

Ordered child nodes.

## Returns

[`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

A container node for the UI tree.

## Example

```ts
VStack({ flex: 1, gap: 1 }, [
  Text("Hello"),
  Text("World"),
])
```
