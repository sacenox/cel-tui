[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / SelectInstance

# Interface: SelectInstance()

Defined in: [components/src/select.ts:108](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L108)

A Select component instance returned by [Select](../functions/Select.md).

Call it to get the current Node tree for rendering.
Use `.reset()` to clear the search query and highlight.

> **SelectInstance**(): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [components/src/select.ts:110](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L110)

Returns the current Select node tree. Call inside `cel.viewport()`.

## Returns

[`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

## Methods

### reset()

> **reset**(): `void`

Defined in: [components/src/select.ts:112](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L112)

Reset the search query, highlight position, and scroll offset.

#### Returns

`void`
