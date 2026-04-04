[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / VStack

# Function: VStack()

> **VStack**(`props`, `children`): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [core/src/primitives/stacks.ts:19](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/primitives/stacks.ts#L19)

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
