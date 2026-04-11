[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / Terminal

# Interface: Terminal

Defined in: [core/src/terminal.ts:7](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L7)

Minimal terminal interface.

Abstracts terminal I/O for both real usage (ProcessTerminal)
and testing (MockTerminal).

## Accessors

### columns

#### Get Signature

> **get** **columns**(): `number`

Defined in: [core/src/terminal.ts:11](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L11)

Terminal width in columns.

##### Returns

`number`

***

### rows

#### Get Signature

> **get** **rows**(): `number`

Defined in: [core/src/terminal.ts:13](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L13)

Terminal height in rows.

##### Returns

`number`

## Methods

### hideCursor()

> **hideCursor**(): `void`

Defined in: [core/src/terminal.ts:25](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L25)

Hide the terminal cursor.

#### Returns

`void`

***

### showCursor()

> **showCursor**(): `void`

Defined in: [core/src/terminal.ts:27](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L27)

Show the terminal cursor.

#### Returns

`void`

***

### start()

> **start**(`onInput`, `onResize`): `void`

Defined in: [core/src/terminal.ts:21](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L21)

Enter raw mode, enable Kitty level 1 keyboard reporting, enable bracketed
paste mode, enable mouse tracking, and hide the cursor.

The framework prefers Kitty semantics but its parser also accepts mixed
tmux/legacy keyboard encodings that may still arrive on stdin.

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

Defined in: [core/src/terminal.ts:23](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L23)

Restore terminal state.

#### Returns

`void`

***

### write()

> **write**(`data`): `void`

Defined in: [core/src/terminal.ts:9](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L9)

Write a string to the terminal output.

#### Parameters

##### data

`string`

#### Returns

`void`
