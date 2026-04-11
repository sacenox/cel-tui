[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / visibleWidth

# Function: visibleWidth()

> **visibleWidth**(`str`): `number`

Defined in: [core/src/width.ts:138](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/width.ts#L138)

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
