[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / emitBuffer

# Function: emitBuffer()

> **emitBuffer**(`buf`, `theme?`, `options?`): `string`

Defined in: [core/src/emitter.ts:172](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/emitter.ts#L172)

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

### theme?

[`Theme`](../../../types/src/type-aliases/Theme.md) = `defaultTheme`

Color theme mapping. Defaults to the ANSI 16 theme.

### options?

`EmitOptions`

Optional terminal cursor state to apply before the synchronized output ends.

## Returns

`string`

A complete ANSI string ready to write to the terminal.
