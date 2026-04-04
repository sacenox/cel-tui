[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / Terminal

# Interface: Terminal

Defined in: [core/src/terminal.ts:7](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/terminal.ts#L7)

Minimal terminal interface.

Abstracts terminal I/O for both real usage (ProcessTerminal)
and testing (MockTerminal).

## Accessors

### columns

#### Get Signature

> **get** **columns**(): `number`

Defined in: [core/src/terminal.ts:11](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/terminal.ts#L11)

Terminal width in columns.

##### Returns

`number`

***

### rows

#### Get Signature

> **get** **rows**(): `number`

Defined in: [core/src/terminal.ts:13](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/terminal.ts#L13)

Terminal height in rows.

##### Returns

`number`

## Methods

### hideCursor()

> **hideCursor**(): `void`

Defined in: [core/src/terminal.ts:19](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/terminal.ts#L19)

Hide the terminal cursor.

#### Returns

`void`

***

### showCursor()

> **showCursor**(): `void`

Defined in: [core/src/terminal.ts:21](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/terminal.ts#L21)

Show the terminal cursor.

#### Returns

`void`

***

### start()

> **start**(`onInput`, `onResize`): `void`

Defined in: [core/src/terminal.ts:15](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/terminal.ts#L15)

Enter raw mode, enable mouse tracking, hide cursor.

#### Parameters

##### onInput

(`data`) => `void`

##### onResize

() => `void`

#### Returns

`void`

***

### stop()

> **stop**(): `void`

Defined in: [core/src/terminal.ts:17](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/terminal.ts#L17)

Restore terminal state.

#### Returns

`void`

***

### write()

> **write**(`data`): `void`

Defined in: [core/src/terminal.ts:9](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/core/src/terminal.ts#L9)

Write a string to the terminal output.

#### Parameters

##### data

`string`

#### Returns

`void`
