[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [core/src](../README.md) / ProcessTerminal

# Class: ProcessTerminal

Defined in: [core/src/terminal.ts:27](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L27)

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

Defined in: [core/src/terminal.ts:31](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L31)

Terminal width in columns.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`columns`](../interfaces/Terminal.md#columns)

---

### rows

#### Get Signature

> **get** **rows**(): `number`

Defined in: [core/src/terminal.ts:35](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L35)

Terminal height in rows.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`rows`](../interfaces/Terminal.md#rows)

## Methods

### hideCursor()

> **hideCursor**(): `void`

Defined in: [core/src/terminal.ts:75](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L75)

Hide the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`hideCursor`](../interfaces/Terminal.md#hidecursor)

---

### showCursor()

> **showCursor**(): `void`

Defined in: [core/src/terminal.ts:79](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L79)

Show the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`showCursor`](../interfaces/Terminal.md#showcursor)

---

### start()

> **start**(`onInput`, `onResize`): `void`

Defined in: [core/src/terminal.ts:43](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L43)

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

---

### stop()

> **stop**(): `void`

Defined in: [core/src/terminal.ts:60](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L60)

Restore terminal state.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`stop`](../interfaces/Terminal.md#stop)

---

### write()

> **write**(`data`): `void`

Defined in: [core/src/terminal.ts:39](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L39)

Write a string to the terminal output.

#### Parameters

##### data

`string`

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`write`](../interfaces/Terminal.md#write)
