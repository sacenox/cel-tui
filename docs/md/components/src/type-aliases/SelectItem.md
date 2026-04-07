[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / SelectItem

# Type Alias: SelectItem

> **SelectItem** = `string` \| \{ `filterText?`: `string`; `label`: `string`; `value`: `string`; \}

Defined in: [components/src/select.ts:23](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/components/src/select.ts#L23)

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
