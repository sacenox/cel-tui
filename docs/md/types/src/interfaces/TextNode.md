[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextNode

# Interface: TextNode

Defined in: [types/src/index.ts:347](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L347)

A text leaf node in the UI tree.

Created by the Text function. Has no children — the parent
container controls the box, and height is intrinsic (computed from
content and wrapping).

## Properties

### content

> **content**: `string`

Defined in: [types/src/index.ts:350](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L350)

The text content to display.

***

### props

> **props**: [`TextProps`](TextProps.md)

Defined in: [types/src/index.ts:352](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L352)

Text styling and behavior props.

***

### type

> **type**: `"text"`

Defined in: [types/src/index.ts:348](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L348)
