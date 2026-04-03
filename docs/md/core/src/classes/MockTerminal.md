[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [core/src](../README.md) / MockTerminal

# Class: MockTerminal

Defined in: [core/src/terminal.ts:90](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L90)

In-memory terminal for testing.

Captures all written output into a buffer and allows setting
fixed dimensions. No real I/O.

## Implements

- [`Terminal`](../interfaces/Terminal.md)

## Constructors

### Constructor

> **new MockTerminal**(`columns?`, `rows?`): `MockTerminal`

Defined in: [core/src/terminal.ts:98](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L98)

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

Defined in: [core/src/terminal.ts:92](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L92)

All output written to the terminal.

## Accessors

### columns

#### Get Signature

> **get** **columns**(): `number`

Defined in: [core/src/terminal.ts:103](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L103)

Terminal width in columns.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`columns`](../interfaces/Terminal.md#columns)

---

### rows

#### Get Signature

> **get** **rows**(): `number`

Defined in: [core/src/terminal.ts:107](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L107)

Terminal height in rows.

##### Returns

`number`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`rows`](../interfaces/Terminal.md#rows)

## Methods

### clearOutput()

> **clearOutput**(): `void`

Defined in: [core/src/terminal.ts:146](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L146)

Clear captured output.

#### Returns

`void`

---

### hideCursor()

> **hideCursor**(): `void`

Defined in: [core/src/terminal.ts:125](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L125)

Hide the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`hideCursor`](../interfaces/Terminal.md#hidecursor)

---

### sendInput()

> **sendInput**(`data`): `void`

Defined in: [core/src/terminal.ts:134](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L134)

Simulate keyboard input.

#### Parameters

##### data

`string`

#### Returns

`void`

---

### setSize()

> **setSize**(`columns`, `rows`): `void`

Defined in: [core/src/terminal.ts:139](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L139)

Simulate terminal resize.

#### Parameters

##### columns

`number`

##### rows

`number`

#### Returns

`void`

---

### showCursor()

> **showCursor**(): `void`

Defined in: [core/src/terminal.ts:129](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L129)

Show the terminal cursor.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`showCursor`](../interfaces/Terminal.md#showcursor)

---

### start()

> **start**(`onInput`, `onResize`): `void`

Defined in: [core/src/terminal.ts:115](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L115)

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

Defined in: [core/src/terminal.ts:120](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L120)

Restore terminal state.

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`stop`](../interfaces/Terminal.md#stop)

---

### write()

> **write**(`data`): `void`

Defined in: [core/src/terminal.ts:111](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/terminal.ts#L111)

Write a string to the terminal output.

#### Parameters

##### data

`string`

#### Returns

`void`

#### Implementation of

[`Terminal`](../interfaces/Terminal.md).[`write`](../interfaces/Terminal.md#write)
