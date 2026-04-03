[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / ContainerProps

# Interface: ContainerProps

Defined in: [types/src/index.ts:59](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L59)

Props shared by all container nodes ([ContainerNode](ContainerNode.md) and [TextInputNode](TextInputNode.md)).

Controls layout, sizing, scrolling, focus, click handling, and key events.

## Extended by

- [`TextInputProps`](TextInputProps.md)

## Properties

### alignItems?

> `optional` **alignItems?**: `"start"` \| `"end"` \| `"center"` \| `"stretch"`

Defined in: [types/src/index.ts:114](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L114)

Align children along the cross axis.
- VStack cross axis = horizontal
- HStack cross axis = vertical

***

### flex?

> `optional` **flex?**: `number`

Defined in: [types/src/index.ts:82](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L82)

Flex grow factor. Space remaining after fixed and intrinsic children
is distributed proportionally among flex children.

#### Example

```ts
flex: 1  // equal share
flex: 2  // double share
```

***

### focusable?

> `optional` **focusable?**: `boolean`

Defined in: [types/src/index.ts:153](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L153)

Whether this container participates in focus traversal.
Defaults to `true` when [onClick](#onclick) is set. Set to `false`
to make a container clickable by mouse but not reachable via Tab.

***

### focused?

> `optional` **focused?**: `boolean`

Defined in: [types/src/index.ts:159](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L159)

Whether this container is currently focused. Controlled by the app —
only one element should be focused at a time.

***

### gap?

> `optional` **gap?**: `number`

Defined in: [types/src/index.ts:100](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L100)

Spacing between children in cells.

***

### height?

> `optional` **height?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:72](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L72)

Fixed height in cells, or percentage of parent height.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.

***

### justifyContent?

> `optional` **justifyContent?**: `"start"` \| `"end"` \| `"center"` \| `"space-between"`

Defined in: [types/src/index.ts:107](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L107)

Distribute children along the main axis.
- VStack main axis = vertical
- HStack main axis = horizontal

***

### maxHeight?

> `optional` **maxHeight?**: `number`

Defined in: [types/src/index.ts:91](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L91)

Maximum height constraint in cells.

***

### maxWidth?

> `optional` **maxWidth?**: `number`

Defined in: [types/src/index.ts:87](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L87)

Maximum width constraint in cells.

***

### minHeight?

> `optional` **minHeight?**: `number`

Defined in: [types/src/index.ts:89](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L89)

Minimum height constraint in cells.

***

### minWidth?

> `optional` **minWidth?**: `number`

Defined in: [types/src/index.ts:85](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L85)

Minimum width constraint in cells.

***

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: [types/src/index.ts:165](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L165)

Called when this container loses focus.

#### Returns

`void`

***

### onClick?

> `optional` **onClick?**: () => `void`

Defined in: [types/src/index.ts:146](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L146)

Called on mouse click or Enter key when this container is focused.
Setting this prop makes the container focusable by default.

#### Returns

`void`

***

### onFocus?

> `optional` **onFocus?**: () => `void`

Defined in: [types/src/index.ts:162](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L162)

Called when this container receives focus (Tab, Shift+Tab, or mouse click).

#### Returns

`void`

***

### onKeyPress?

> `optional` **onKeyPress?**: (`key`) => `void`

Defined in: [types/src/index.ts:178](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L178)

Called on key events that bubble up to this container.
Keys are first handled by the focused element; unconsumed keys
(e.g., modifier combos like `"ctrl+s"`) bubble up through ancestors.
The root container's `onKeyPress` acts as the global key handler.

Key format: all lowercase, modifiers joined by `+` in canonical
order `ctrl+alt+shift+<key>` (e.g., `"ctrl+s"`, `"alt+up"`, `"escape"`).

#### Parameters

##### key

`string`

Normalized key string.

#### Returns

`void`

***

### onScroll?

> `optional` **onScroll?**: (`offset`) => `void`

Defined in: [types/src/index.ts:140](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L140)

Called when the user scrolls this container (mouse wheel).
In controlled mode, update [scrollOffset](#scrolloffset) with the new value
to move the scroll position.

#### Parameters

##### offset

`number`

The new scroll offset in cells.

#### Returns

`void`

***

### overflow?

> `optional` **overflow?**: `"hidden"` \| `"scroll"`

Defined in: [types/src/index.ts:121](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L121)

Content overflow behavior.
- `"hidden"` (default) — clip content at the container edge.
- `"scroll"` — enable scrolling along the main axis.

***

### padding?

> `optional` **padding?**: `object`

Defined in: [types/src/index.ts:97](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L97)

Internal padding in cells.
`x` adds horizontal padding (left + right), `y` adds vertical (top + bottom).

#### x?

> `optional` **x?**: `number`

#### y?

> `optional` **y?**: `number`

***

### scrollbar?

> `optional` **scrollbar?**: `boolean`

Defined in: [types/src/index.ts:124](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L124)

Show a scrollbar indicator when `overflow` is `"scroll"`.

***

### scrollOffset?

> `optional` **scrollOffset?**: `number`

Defined in: [types/src/index.ts:131](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L131)

Controlled scroll position in cells. When provided, the app owns
scroll state and must update this value via [onScroll](#onscroll).
When omitted, scroll is framework-managed (uncontrolled).

***

### width?

> `optional` **width?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:65](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L65)

Fixed width in cells, or percentage of parent width.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.
