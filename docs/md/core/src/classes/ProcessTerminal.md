[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / ProcessTerminal

# Class: ProcessTerminal

Defined in: [core/src/terminal.ts:39](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L39)

Real terminal using process.stdin/stdout.

Enables Kitty keyboard protocol level 1, bracketed paste mode, SGR mouse
tracking, and raw mode. The runtime prefers Kitty semantics for full
modifier fidelity, while the parser remains compatible with mixed
tmux/legacy keyboard encodings that may still arrive on stdin. All modes are
restored on stop/crash.

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

Defined in: [core/src/terminal.ts:46](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L46)

Terminal width in columns.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`columns`](../interfaces/Terminal.md#columns)

***

### rows

#### Get Signature

> **get** **rows**(): `number`

Defined in: [core/src/terminal.ts:50](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L50)

Terminal height in rows.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`rows`](../interfaces/Terminal.md#rows)

## Methods

### hideCursor()

> **hideCursor**(): `void`

Defined in: [core/src/terminal.ts:144](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L144)

Hide the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`hideCursor`](../interfaces/Terminal.md#hidecursor)

***

### showCursor()

> **showCursor**(): `void`

Defined in: [core/src/terminal.ts:148](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L148)

Show the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`showCursor`](../interfaces/Terminal.md#showcursor)

***

### start()

> **start**(`onInput`, `onResize`): `void`

Defined in: [core/src/terminal.ts:58](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L58)

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

Defined in: [core/src/terminal.ts:103](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L103)

Restore terminal state.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`stop`](../interfaces/Terminal.md#stop)

***

### write()

> **write**(`data`): `void`

Defined in: [core/src/terminal.ts:54](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/terminal.ts#L54)

Write a string to the terminal output.

#### Parameters

##### data

`string`

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`write`](../interfaces/Terminal.md#write)
