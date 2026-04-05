[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / SelectInstance

# Interface: SelectInstance()

Defined in: [components/src/select.ts:105](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/select.ts#L105)

A Select component instance returned by [Select](../functions/Select.md).

Call it to get the current Node tree for rendering.
Use `.reset()` to clear the search query and highlight.

> **SelectInstance**(): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [components/src/select.ts:107](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/select.ts#L107)

Returns the current Select node tree. Call inside `cel.viewport()`.

## Returns

[`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

## Methods

### reset()

> **reset**(): `void`

Defined in: [components/src/select.ts:109](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/select.ts#L109)

Reset the search query, highlight position, and scroll offset.

#### Returns

`void`
