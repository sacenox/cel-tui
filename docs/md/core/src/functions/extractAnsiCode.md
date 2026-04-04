[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / extractAnsiCode

# Function: extractAnsiCode()

> **extractAnsiCode**(`str`, `pos`): \{ `code`: `string`; `length`: `number`; \} \| `null`

Defined in: [core/src/width.ts:12](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/core/src/width.ts#L12)

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
