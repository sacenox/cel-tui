[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / visibleWidth

# Function: visibleWidth()

> **visibleWidth**(`str`): `number`

Defined in: [core/src/width.ts:133](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/width.ts#L133)

Calculate the visible width of a string in terminal columns.

Handles ASCII (fast path), East Asian wide characters, emoji,
ANSI escape sequences, and zero-width characters.

## Parameters

### str

`string`

The string to measure.

## Returns

`number`

Width in terminal columns.
