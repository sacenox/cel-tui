[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextNode

# Interface: TextNode

Defined in: [types/src/index.ts:273](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L273)

A text leaf node in the UI tree.

Created by the Text function. Has no children — the parent
container controls the box, and height is intrinsic (computed from
content and wrapping).

## Properties

### content

> **content**: `string`

Defined in: [types/src/index.ts:276](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L276)

The text content to display.

---

### props

> **props**: [`TextProps`](TextProps.md)

Defined in: [types/src/index.ts:278](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L278)

Text styling and behavior props.

---

### type

> **type**: `"text"`

Defined in: [types/src/index.ts:274](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L274)
