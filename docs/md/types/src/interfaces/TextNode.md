[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextNode

# Interface: TextNode

Defined in: [types/src/index.ts:296](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L296)

A text leaf node in the UI tree.

Created by the Text function. Has no children — the parent
container controls the box, and height is intrinsic (computed from
content and wrapping).

## Properties

### content

> **content**: `string`

Defined in: [types/src/index.ts:299](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L299)

The text content to display.

***

### props

> **props**: [`TextProps`](TextProps.md)

Defined in: [types/src/index.ts:301](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L301)

Text styling and behavior props.

***

### type

> **type**: `"text"`

Defined in: [types/src/index.ts:297](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L297)
