[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextNode

# Interface: TextNode

Defined in: [types/src/index.ts:358](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L358)

A text leaf node in the UI tree.

Created by the Text function. Has no children — the parent
container controls the box, and height is intrinsic (computed from
content and wrapping).

## Properties

### content

> **content**: `string`

Defined in: [types/src/index.ts:361](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L361)

The text content to display.

***

### props

> **props**: [`TextProps`](TextProps.md)

Defined in: [types/src/index.ts:363](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L363)

Text styling and behavior props.

***

### type

> **type**: `"text"`

Defined in: [types/src/index.ts:359](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L359)
