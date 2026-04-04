[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / SelectProps

# Interface: SelectProps

Defined in: [components/src/select.ts:35](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L35)

Configuration for the [Select](../functions/Select.md) component.

## Properties

### bgColor?

> `optional` **bgColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

Defined in: [components/src/select.ts:80](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L80)

Background color (fills the container rect).

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

Defined in: [components/src/select.ts:78](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L78)

Foreground text color.

***

### flex?

> `optional` **flex?**: `number`

Defined in: [components/src/select.ts:76](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L76)

Flex grow factor.

***

### focusable?

> `optional` **focusable?**: `boolean`

Defined in: [components/src/select.ts:90](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L90)

Whether the select participates in focus traversal.

#### Default

```ts
true
```

***

### focused?

> `optional` **focused?**: `boolean`

Defined in: [components/src/select.ts:85](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L85)

Whether the select is currently focused (controlled mode).
When omitted, focus is uncontrolled (framework-managed).

***

### focusStyle?

> `optional` **focusStyle?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/select.ts:96](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L96)

Style overrides applied when focused.

***

### height?

> `optional` **height?**: [`SizeValue`](../../../types/src/type-aliases/SizeValue.md)

Defined in: [components/src/select.ts:74](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L74)

Fixed height in cells or percentage.

***

### highlightColor?

> `optional` **highlightColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

Defined in: [components/src/select.ts:63](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L63)

Color of the highlighted item and its indicator.

#### Default

```ts
"cyan"
```

***

### indicator?

> `optional` **indicator?**: `string`

Defined in: [components/src/select.ts:58](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L58)

Character used for the highlight indicator.

#### Default

```ts
"›"
```

***

### items

> **items**: [`SelectItem`](../type-aliases/SelectItem.md)[]

Defined in: [components/src/select.ts:37](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L37)

Items to choose from.

***

### maxVisible?

> `optional` **maxVisible?**: `number`

Defined in: [components/src/select.ts:53](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L53)

Maximum number of items visible at once.
When the filtered list exceeds this, a "N more" indicator is shown.

#### Default

```ts
10
```

***

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: [components/src/select.ts:94](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L94)

Called when the select loses focus.

#### Returns

`void`

***

### onFocus?

> `optional` **onFocus?**: () => `void`

Defined in: [components/src/select.ts:92](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L92)

Called when the select receives focus.

#### Returns

`void`

***

### onKeyPress?

> `optional` **onKeyPress?**: (`key`) => `boolean` \| `void`

Defined in: [components/src/select.ts:70](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L70)

Called on key events that bubble up to the Select.
Return `false` to keep bubbling to ancestors.

#### Parameters

##### key

`string`

The key string.

#### Returns

`boolean` \| `void`

***

### onSelect

> **onSelect**: (`value`) => `void`

Defined in: [components/src/select.ts:42](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L42)

Called when the user selects an item (Enter or click).

#### Parameters

##### value

`string`

The selected item's value.

#### Returns

`void`

***

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: [components/src/select.ts:47](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L47)

Placeholder text shown when the search query is empty.

#### Default

```ts
"type to filter..."
```

***

### width?

> `optional` **width?**: [`SizeValue`](../../../types/src/type-aliases/SizeValue.md)

Defined in: [components/src/select.ts:72](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/select.ts#L72)

Fixed width in cells or percentage.
