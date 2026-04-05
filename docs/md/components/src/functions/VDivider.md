[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / VDivider

# Function: VDivider()

> **VDivider**(`props?`): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [components/src/vdivider.ts:46](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/vdivider.ts#L46)

Vertical divider that fills the available height.

Renders a single character on each row within a 1-cell-wide container.
Best used inside an `HStack` to separate columns.

The container uses `height: "100%"` so it fills the parent's cross
axis. In an HStack with the default `alignItems: "stretch"`, it
automatically matches sibling heights.

## Parameters

### props?

[`VDividerProps`](../interfaces/VDividerProps.md) = `{}`

Divider character and color.

## Returns

[`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

A container node 1 cell wide, full parent height.

## Example

```ts
// Default thin vertical line
VDivider()

// Double line with color
VDivider({ char: "║", fgColor: "color08" })

// Separate sidebar from content
HStack({ height: "100%" }, [
  VStack({ width: 20 }, [Text("sidebar")]),
  VDivider({ fgColor: "color08" }),
  VStack({ flex: 1 }, [Text("content")]),
])
```
