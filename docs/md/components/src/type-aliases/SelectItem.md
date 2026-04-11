[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / SelectItem

# Type Alias: SelectItem

> **SelectItem** = `string` \| \{ `filterText?`: `string`; `label`: `string`; `value`: `string`; \}

Defined in: [components/src/select.ts:24](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L24)

An item in the select list.

Strings are used as both label and value. Objects allow separate
display text, return value, and filter text.

## Union Members

`string`

***

### Type Literal

\{ `filterText?`: `string`; `label`: `string`; `value`: `string`; \}

#### filterText?

> `optional` **filterText?**: `string`

Text matched against the search query. Defaults to `label`.

#### label

> **label**: `string`

Displayed text (can include ANSI styling).

#### value

> **value**: `string`

Value returned on selection.

## Example

```ts
// Simple string item
"apple"

// Rich item with ANSI-colored label
{ label: "claude-sonnet-4  (free)", value: "anthropic/claude-sonnet-4", filterText: "claude-sonnet-4" }
```
