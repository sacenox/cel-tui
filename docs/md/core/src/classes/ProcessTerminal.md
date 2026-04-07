[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / ProcessTerminal

# Class: ProcessTerminal

Defined in: [core/src/terminal.ts:30](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/core/src/terminal.ts#L30)

Real terminal using process.stdin/stdout.

Enables the Kitty keyboard protocol (level 1) for unambiguous key input,
SGR mouse tracking, and raw mode. All modes are restored on stop/crash.

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

Defined in: [core/src/terminal.ts:37](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/core/src/terminal.ts#L37)

Terminal width in columns.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`columns`](../interfaces/Terminal.md#columns)

***

### rows

#### Get Signature

> **get** **rows**(): `number`

Defined in: [core/src/terminal.ts:41](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/core/src/terminal.ts#L41)

Terminal height in rows.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`rows`](../interfaces/Terminal.md#rows)

## Methods

### hideCursor()

> **hideCursor**(): `void`

Defined in: [core/src/terminal.ts:131](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/core/src/terminal.ts#L131)

Hide the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`hideCursor`](../interfaces/Terminal.md#hidecursor)

***

### showCursor()

> **showCursor**(): `void`

Defined in: [core/src/terminal.ts:135](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/core/src/terminal.ts#L135)

Show the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`showCursor`](../interfaces/Terminal.md#showcursor)

***

### start()

> **start**(`onInput`, `onResize`): `void`

Defined in: [core/src/terminal.ts:49](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/core/src/terminal.ts#L49)

Enter raw mode, enable Kitty keyboard protocol, enable mouse tracking, hide cursor.

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

Defined in: [core/src/terminal.ts:92](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/core/src/terminal.ts#L92)

Restore terminal state.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`stop`](../interfaces/Terminal.md#stop)

***

### write()

> **write**(`data`): `void`

Defined in: [core/src/terminal.ts:45](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/core/src/terminal.ts#L45)

Write a string to the terminal output.

#### Parameters

##### data

`string`

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`write`](../interfaces/Terminal.md#write)
