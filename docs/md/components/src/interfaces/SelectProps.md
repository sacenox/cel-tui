[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / SelectProps

# Interface: SelectProps

Defined in: [components/src/select.ts:38](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L38)

## Properties

### bgColor?

> `optional` **bgColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

Defined in: [components/src/select.ts:83](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L83)

Background color (fills the container rect).

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

Defined in: [components/src/select.ts:81](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L81)

Foreground text color.

***

### flex?

> `optional` **flex?**: `number`

Defined in: [components/src/select.ts:79](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L79)

Flex grow factor.

***

### focusable?

> `optional` **focusable?**: `boolean`

Defined in: [components/src/select.ts:93](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L93)

Whether the select participates in focus traversal.

#### Default

```ts
true
```

***

### focused?

> `optional` **focused?**: `boolean`

Defined in: [components/src/select.ts:88](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L88)

Whether the select is currently focused (controlled mode).
When omitted, focus is uncontrolled (framework-managed).

***

### focusStyle?

> `optional` **focusStyle?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/select.ts:99](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L99)

Style overrides applied when focused.

***

### height?

> `optional` **height?**: [`SizeValue`](../../../types/src/type-aliases/SizeValue.md)

Defined in: [components/src/select.ts:77](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L77)

Fixed height in cells or percentage.

***

### highlightColor?

> `optional` **highlightColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

Defined in: [components/src/select.ts:66](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L66)

Color of the highlighted item and its indicator.

#### Default

```ts
"color06"
```

***

### indicator?

> `optional` **indicator?**: `string`

Defined in: [components/src/select.ts:61](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L61)

Character used for the highlight indicator.

#### Default

```ts
"›"
```

***

### items

> **items**: [`SelectItem`](../type-aliases/SelectItem.md)[]

Defined in: [components/src/select.ts:40](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L40)

Items to choose from.

***

### maxVisible?

> `optional` **maxVisible?**: `number`

Defined in: [components/src/select.ts:56](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L56)

Maximum number of items visible at once.
When the filtered list exceeds this, a "N more" indicator is shown.

#### Default

```ts
10
```

***

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: [components/src/select.ts:97](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L97)

Called when the select loses focus.

#### Returns

`void`

***

### onFocus?

> `optional` **onFocus?**: () => `void`

Defined in: [components/src/select.ts:95](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L95)

Called when the select receives focus.

#### Returns

`void`

***

### onKeyPress?

> `optional` **onKeyPress?**: [`KeyPressHandler`](../../../types/src/type-aliases/KeyPressHandler.md)

Defined in: [components/src/select.ts:73](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L73)

Called on key events that bubble up to the Select.
Return `false` to keep bubbling to ancestors.

#### Param

The normalized semantic key string.

***

### onSelect

> **onSelect**: (`value`) => `void`

Defined in: [components/src/select.ts:45](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L45)

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

Defined in: [components/src/select.ts:50](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L50)

Placeholder text shown when the search query is empty.

#### Default

```ts
"type to filter..."
```

***

### width?

> `optional` **width?**: [`SizeValue`](../../../types/src/type-aliases/SizeValue.md)

Defined in: [components/src/select.ts:75](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/select.ts#L75)

Fixed width in cells or percentage.
