[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / emitBuffer

# Function: emitBuffer()

> **emitBuffer**(`buf`): `string`

Defined in: [core/src/emitter.ts:98](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/emitter.ts#L98)

Emit a full cell buffer as an ANSI string for terminal output.

Generates cursor positioning, SGR styling codes, and character content
for every cell. Output is wrapped in synchronized output markers
(CSI 2026) for flicker-free rendering.

Optimizes by batching consecutive cells with the same style and
only emitting SGR codes when the style changes.

## Parameters

### buf

[`CellBuffer`](../classes/CellBuffer.md)

The cell buffer to render.

## Returns

`string`

A complete ANSI string ready to write to the terminal.
