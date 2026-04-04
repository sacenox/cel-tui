[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / CellBuffer

# Class: CellBuffer

Defined in: [core/src/cell-buffer.ts:61](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L61)

A 2D grid of styled terminal cells.

The cell buffer is the core rendering target. The layout engine
computes rects, painting writes styled cells into those rects,
and the diff algorithm compares the current buffer against the
previous one to produce minimal terminal updates.

Empty cells (matching [EMPTY\_CELL](../variables/EMPTY_CELL.md)) are considered transparent
for layer compositing — higher layers overwrite lower layers only
where they have non-empty content.

## Constructors

### Constructor

> **new CellBuffer**(`width`, `height`): `CellBuffer`

Defined in: [core/src/cell-buffer.ts:72](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L72)

Create a new cell buffer filled with empty cells.

#### Parameters

##### width

`number`

Buffer width in columns.

##### height

`number`

Buffer height in rows.

#### Returns

`CellBuffer`

## Accessors

### height

#### Get Signature

> **get** **height**(): `number`

Defined in: [core/src/cell-buffer.ts:85](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L85)

Buffer height in rows.

##### Returns

`number`

***

### width

#### Get Signature

> **get** **width**(): `number`

Defined in: [core/src/cell-buffer.ts:80](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L80)

Buffer width in columns.

##### Returns

`number`

## Methods

### clear()

> **clear**(): `void`

Defined in: [core/src/cell-buffer.ts:118](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L118)

Reset all cells to [EMPTY\_CELL](../variables/EMPTY_CELL.md).

#### Returns

`void`

***

### diff()

> **diff**(`other`): `object`[]

Defined in: [core/src/cell-buffer.ts:177](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L177)

Compare this buffer against another and return positions that differ.
Used for differential rendering — only changed cells need terminal updates.

#### Parameters

##### other

`CellBuffer`

The buffer to compare against.

#### Returns

`object`[]

Array of `{ x, y }` positions where cells differ.

***

### fill()

> **fill**(`x`, `y`, `w`, `h`, `cell`): `void`

Defined in: [core/src/cell-buffer.ts:132](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L132)

Fill a rectangular region with a cell value.
Coordinates are clipped to buffer bounds.

#### Parameters

##### x

`number`

Left column (inclusive).

##### y

`number`

Top row (inclusive).

##### w

`number`

Width in columns.

##### h

`number`

Height in rows.

##### cell

[`Cell`](../interfaces/Cell.md)

Cell value to fill with.

#### Returns

`void`

***

### get()

> **get**(`x`, `y`): [`Cell`](../interfaces/Cell.md)

Defined in: [core/src/cell-buffer.ts:93](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L93)

Get the cell at `(x, y)`.
Returns [EMPTY\_CELL](../variables/EMPTY_CELL.md) for out-of-bounds coordinates.

#### Parameters

##### x

`number`

##### y

`number`

#### Returns

[`Cell`](../interfaces/Cell.md)

***

### isEmpty()

> **isEmpty**(`x`, `y`): `boolean`

Defined in: [core/src/cell-buffer.ts:113](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L113)

Check if the cell at `(x, y)` is empty (transparent).
A cell is empty if it matches [EMPTY\_CELL](../variables/EMPTY_CELL.md) exactly.

#### Parameters

##### x

`number`

##### y

`number`

#### Returns

`boolean`

***

### resize()

> **resize**(`width`, `height`): `void`

Defined in: [core/src/cell-buffer.ts:151](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L151)

Resize the buffer. Existing content within the new bounds is preserved.
New cells are initialized to [EMPTY\_CELL](../variables/EMPTY_CELL.md).

#### Parameters

##### width

`number`

New width in columns.

##### height

`number`

New height in rows.

#### Returns

`void`

***

### set()

> **set**(`x`, `y`, `cell`): `void`

Defined in: [core/src/cell-buffer.ts:104](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/cell-buffer.ts#L104)

Set the cell at `(x, y)`.
Out-of-bounds writes are silently ignored.

#### Parameters

##### x

`number`

##### y

`number`

##### cell

[`Cell`](../interfaces/Cell.md)

#### Returns

`void`
