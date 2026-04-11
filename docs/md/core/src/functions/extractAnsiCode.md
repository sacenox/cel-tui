[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / extractAnsiCode

# Function: extractAnsiCode()

> **extractAnsiCode**(`str`, `pos`): \{ `code`: `string`; `length`: `number`; \} \| `null`

Defined in: [core/src/width.ts:12](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/width.ts#L12)

Extract an ANSI escape sequence starting at `pos` in `str`.
Handles CSI (ESC [), OSC (ESC ]), and APC (ESC _) sequences.
Returns null if no escape sequence starts at `pos`.

## Parameters

### str

`string`

### pos

`number`

## Returns

\{ `code`: `string`; `length`: `number`; \} \| `null`
