[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / ProcessTerminal

# Class: ProcessTerminal

Defined in: [core/src/terminal.ts:27](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L27)

Real terminal using process.stdin/stdout.

## Implements

- [`Terminal`](../interfaces/Terminal.md)

## Constructors

### Constructor

> **new ProcessTerminal**(): `ProcessTerminal`

#### Returns

`ProcessTerminal`

## Accessors

### columns

#### Get Signature

> **get** **columns**(): `number`

Defined in: [core/src/terminal.ts:34](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L34)

Terminal width in columns.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`columns`](../interfaces/Terminal.md#columns)

***

### rows

#### Get Signature

> **get** **rows**(): `number`

Defined in: [core/src/terminal.ts:38](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L38)

Terminal height in rows.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`rows`](../interfaces/Terminal.md#rows)

## Methods

### hideCursor()

> **hideCursor**(): `void`

Defined in: [core/src/terminal.ts:120](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L120)

Hide the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`hideCursor`](../interfaces/Terminal.md#hidecursor)

***

### showCursor()

> **showCursor**(): `void`

Defined in: [core/src/terminal.ts:124](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L124)

Show the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`showCursor`](../interfaces/Terminal.md#showcursor)

***

### start()

> **start**(`onInput`, `onResize`): `void`

Defined in: [core/src/terminal.ts:46](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L46)

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

Defined in: [core/src/terminal.ts:85](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L85)

Restore terminal state.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`stop`](../interfaces/Terminal.md#stop)

***

### write()

> **write**(`data`): `void`

Defined in: [core/src/terminal.ts:42](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/core/src/terminal.ts#L42)

Write a string to the terminal output.

#### Parameters

##### data

`string`

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`write`](../interfaces/Terminal.md#write)
