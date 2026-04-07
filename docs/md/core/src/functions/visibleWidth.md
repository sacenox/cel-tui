[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / visibleWidth

# Function: visibleWidth()

> **visibleWidth**(`str`): `number`

Defined in: [core/src/width.ts:133](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/core/src/width.ts#L133)

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
