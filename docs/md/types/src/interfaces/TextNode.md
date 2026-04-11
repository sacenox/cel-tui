[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextNode

# Interface: TextNode

Defined in: [types/src/index.ts:375](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L375)

A text leaf node in the UI tree.

Created by the `Text` function. Has no children — the parent
container controls the box, and height is intrinsic (computed from
content and wrapping).

## Properties

### content

> **content**: `string`

Defined in: [types/src/index.ts:378](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L378)

The text content to display.

***

### props

> **props**: [`TextProps`](TextProps.md)

Defined in: [types/src/index.ts:380](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L380)

Text styling and behavior props.

***

### type

> **type**: `"text"`

Defined in: [types/src/index.ts:376](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L376)
