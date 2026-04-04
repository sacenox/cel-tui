[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextNode

# Interface: TextNode

Defined in: [types/src/index.ts:311](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L311)

A text leaf node in the UI tree.

Created by the Text function. Has no children — the parent
container controls the box, and height is intrinsic (computed from
content and wrapping).

## Properties

### content

> **content**: `string`

Defined in: [types/src/index.ts:314](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L314)

The text content to display.

***

### props

> **props**: [`TextProps`](TextProps.md)

Defined in: [types/src/index.ts:316](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L316)

Text styling and behavior props.

***

### type

> **type**: `"text"`

Defined in: [types/src/index.ts:312](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/types/src/index.ts#L312)
