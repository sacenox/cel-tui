[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / Cell

# Interface: Cell

Defined in: [core/src/cell-buffer.ts:10](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/cell-buffer.ts#L10)

A single terminal cell with character content and styling.

Each cell represents one column in the terminal grid.
Wide characters (CJK, emoji) occupy two cells — the first cell
holds the character, the second is a continuation marker.

## Properties

### bgColor

> **bgColor**: [`Color`](../../../types/src/type-aliases/Color.md) \| `null`

Defined in: [core/src/cell-buffer.ts:16](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/cell-buffer.ts#L16)

Background color, or null for terminal default.

***

### bold

> **bold**: `boolean`

Defined in: [core/src/cell-buffer.ts:18](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/cell-buffer.ts#L18)

Bold weight.

***

### char

> **char**: `string`

Defined in: [core/src/cell-buffer.ts:12](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/cell-buffer.ts#L12)

The grapheme cluster displayed in this cell.

***

### fgColor

> **fgColor**: [`Color`](../../../types/src/type-aliases/Color.md) \| `null`

Defined in: [core/src/cell-buffer.ts:14](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/cell-buffer.ts#L14)

Foreground color, or null for terminal default.

***

### italic

> **italic**: `boolean`

Defined in: [core/src/cell-buffer.ts:20](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/cell-buffer.ts#L20)

Italic style.

***

### underline

> **underline**: `boolean`

Defined in: [core/src/cell-buffer.ts:22](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/cell-buffer.ts#L22)

Underline decoration.
