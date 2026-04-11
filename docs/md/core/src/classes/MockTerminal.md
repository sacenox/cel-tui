[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / MockTerminal

# Class: MockTerminal

Defined in: [core/src/terminal.ts:159](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L159)

In-memory terminal for testing.

Captures all written output into a buffer and allows setting
fixed dimensions. No real I/O.

## Implements

- [`Terminal`](../interfaces/Terminal.md)

## Constructors

### Constructor

> **new MockTerminal**(`columns?`, `rows?`): `MockTerminal`

Defined in: [core/src/terminal.ts:167](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L167)

#### Parameters

##### columns?

`number` = `80`

##### rows?

`number` = `24`

#### Returns

`MockTerminal`

## Properties

### output

> **output**: `string` = `""`

Defined in: [core/src/terminal.ts:161](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L161)

All output written to the terminal.

## Accessors

### columns

#### Get Signature

> **get** **columns**(): `number`

Defined in: [core/src/terminal.ts:172](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L172)

Terminal width in columns.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`columns`](../interfaces/Terminal.md#columns)

***

### rows

#### Get Signature

> **get** **rows**(): `number`

Defined in: [core/src/terminal.ts:176](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L176)

Terminal height in rows.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`rows`](../interfaces/Terminal.md#rows)

## Methods

### clearOutput()

> **clearOutput**(): `void`

Defined in: [core/src/terminal.ts:215](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L215)

Clear captured output.

#### Returns

`void`

***

### hideCursor()

> **hideCursor**(): `void`

Defined in: [core/src/terminal.ts:194](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L194)

Hide the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`hideCursor`](../interfaces/Terminal.md#hidecursor)

***

### sendInput()

> **sendInput**(`data`): `void`

Defined in: [core/src/terminal.ts:203](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L203)

Simulate keyboard input.

#### Parameters

##### data

`string`

#### Returns

`void`

***

### setSize()

> **setSize**(`columns`, `rows`): `void`

Defined in: [core/src/terminal.ts:208](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L208)

Simulate terminal resize.

#### Parameters

##### columns

`number`

##### rows

`number`

#### Returns

`void`

***

### showCursor()

> **showCursor**(): `void`

Defined in: [core/src/terminal.ts:198](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L198)

Show the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`showCursor`](../interfaces/Terminal.md#showcursor)

***

### start()

> **start**(`onInput`, `onResize`): `void`

Defined in: [core/src/terminal.ts:184](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L184)

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

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`start`](../interfaces/Terminal.md#start)

***

### stop()

> **stop**(): `void`

Defined in: [core/src/terminal.ts:189](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L189)

Restore terminal state.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`stop`](../interfaces/Terminal.md#stop)

***

### write()

> **write**(`data`): `void`

Defined in: [core/src/terminal.ts:180](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L180)

Write a string to the terminal output.

#### Parameters

##### data

`string`

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`write`](../interfaces/Terminal.md#write)
