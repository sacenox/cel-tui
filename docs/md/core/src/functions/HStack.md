[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / HStack

# Function: HStack()

> **HStack**(`props`, `children`): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [core/src/primitives/stacks.ts:40](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/core/src/primitives/stacks.ts#L40)

Create a horizontal stack container — children laid out left to right.

Equivalent to CSS `flex-direction: row`. Main axis is horizontal,
cross axis is vertical.

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
HStack({ height: 1, gap: 1 }, [
  Text("Name", { bold: true }),
  VStack({ flex: 1 }, []),
  Text("value", { fgColor: "color08" }),
])
```
