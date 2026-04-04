[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / MockTerminal

# Class: MockTerminal

Defined in: [core/src/terminal.ts:135](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L135)

In-memory terminal for testing.

Captures all written output into a buffer and allows setting
fixed dimensions. No real I/O.

## Implements

- [`Terminal`](../interfaces/Terminal.md)

## Constructors

### Constructor

> **new MockTerminal**(`columns?`, `rows?`): `MockTerminal`

Defined in: [core/src/terminal.ts:143](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L143)

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

Defined in: [core/src/terminal.ts:137](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L137)

All output written to the terminal.

## Accessors

### columns

#### Get Signature

> **get** **columns**(): `number`

Defined in: [core/src/terminal.ts:148](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L148)

Terminal width in columns.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`columns`](../interfaces/Terminal.md#columns)

***

### rows

#### Get Signature

> **get** **rows**(): `number`

Defined in: [core/src/terminal.ts:152](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L152)

Terminal height in rows.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`rows`](../interfaces/Terminal.md#rows)

## Methods

### clearOutput()

> **clearOutput**(): `void`

Defined in: [core/src/terminal.ts:191](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L191)

Clear captured output.

#### Returns

`void`

***

### hideCursor()

> **hideCursor**(): `void`

Defined in: [core/src/terminal.ts:170](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L170)

Hide the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`hideCursor`](../interfaces/Terminal.md#hidecursor)

***

### sendInput()

> **sendInput**(`data`): `void`

Defined in: [core/src/terminal.ts:179](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L179)

Simulate keyboard input.

#### Parameters

##### data

`string`

#### Returns

`void`

***

### setSize()

> **setSize**(`columns`, `rows`): `void`

Defined in: [core/src/terminal.ts:184](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L184)

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

Defined in: [core/src/terminal.ts:174](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L174)

Show the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`showCursor`](../interfaces/Terminal.md#showcursor)

***

### start()

> **start**(`onInput`, `onResize`): `void`

Defined in: [core/src/terminal.ts:160](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L160)

Enter raw mode, enable mouse tracking, hide cursor.

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

Defined in: [core/src/terminal.ts:165](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L165)

Restore terminal state.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`stop`](../interfaces/Terminal.md#stop)

***

### write()

> **write**(`data`): `void`

Defined in: [core/src/terminal.ts:156](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L156)

Write a string to the terminal output.

#### Parameters

##### data

`string`

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`write`](../interfaces/Terminal.md#write)
