[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / ContainerProps

# Interface: ContainerProps

Defined in: [types/src/index.ts:63](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L63)

Props shared by all container nodes ([ContainerNode](ContainerNode.md) and [TextInputNode](TextInputNode.md)).

Controls layout, sizing, scrolling, focus, click handling, key events,
and styling. Style props on containers are inherited by descendants —
child nodes use the nearest ancestor's values unless they set their own.
Container `bgColor` fills the container rect before painting children.

## Extends

- [`StyleProps`](StyleProps.md)

## Extended by

- [`TextInputProps`](TextInputProps.md)

## Properties

### alignItems?

> `optional` **alignItems?**: `"start"` \| `"end"` \| `"center"` \| `"stretch"`

Defined in: [types/src/index.ts:118](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L118)

Align children along the cross axis.
- VStack cross axis = horizontal
- HStack cross axis = vertical

***

### bgColor?

> `optional` **bgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:42](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L42)

Background color.

#### Inherited from

[`StyleProps`](StyleProps.md).[`bgColor`](StyleProps.md#bgcolor)

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:34](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L34)

Render text with bold weight.

#### Inherited from

[`StyleProps`](StyleProps.md).[`bold`](StyleProps.md#bold)

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:40](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L40)

Foreground (text) color.

#### Inherited from

[`StyleProps`](StyleProps.md).[`fgColor`](StyleProps.md#fgcolor)

***

### flex?

> `optional` **flex?**: `number`

Defined in: [types/src/index.ts:86](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L86)

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

Defined in: [types/src/index.ts:157](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L157)

Whether this container participates in focus traversal.
Defaults to `true` when [onClick](#onclick) is set. Set to `false`
to make a container clickable by mouse but not reachable via Tab.

***

### focused?

> `optional` **focused?**: `boolean`

Defined in: [types/src/index.ts:167](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L167)

Whether this container is currently focused.

When provided, focus is **controlled** — the app owns the state and
must update this value via [onFocus](#onfocus)/[onBlur](#onblur).
When omitted, focus is **uncontrolled** — the framework manages
focus internally (Tab/Shift+Tab/Escape/click just work).

***

### focusStyle?

> `optional` **focusStyle?**: [`StyleProps`](StyleProps.md)

Defined in: [types/src/index.ts:193](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L193)

Style overrides applied when this element is focused.
Accepts any [StyleProps](StyleProps.md) — overridden values replace the
element's normal styles and participate in inheritance.

Works in both uncontrolled and controlled focus modes.

#### Example

```ts
{ bgColor: "cyan", fgColor: "black" }  // reverse-video effect
```

***

### gap?

> `optional` **gap?**: `number`

Defined in: [types/src/index.ts:104](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L104)

Spacing between children in cells.

***

### height?

> `optional` **height?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:76](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L76)

Fixed height in cells, or percentage of parent height.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:36](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L36)

Render text in italic style.

#### Inherited from

[`StyleProps`](StyleProps.md).[`italic`](StyleProps.md#italic)

***

### justifyContent?

> `optional` **justifyContent?**: `"start"` \| `"end"` \| `"center"` \| `"space-between"`

Defined in: [types/src/index.ts:111](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L111)

Distribute children along the main axis.
- VStack main axis = vertical
- HStack main axis = horizontal

***

### maxHeight?

> `optional` **maxHeight?**: `number`

Defined in: [types/src/index.ts:95](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L95)

Maximum height constraint in cells.

***

### maxWidth?

> `optional` **maxWidth?**: `number`

Defined in: [types/src/index.ts:91](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L91)

Maximum width constraint in cells.

***

### minHeight?

> `optional` **minHeight?**: `number`

Defined in: [types/src/index.ts:93](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L93)

Minimum height constraint in cells.

***

### minWidth?

> `optional` **minWidth?**: `number`

Defined in: [types/src/index.ts:89](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L89)

Minimum width constraint in cells.

***

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: [types/src/index.ts:181](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L181)

Called when this container loses focus.
In uncontrolled mode, this is a notification callback.
In controlled mode, update [focused](#focused) here.

#### Returns

`void`

***

### onClick?

> `optional` **onClick?**: () => `void`

Defined in: [types/src/index.ts:150](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L150)

Called on mouse click or Enter key when this container is focused.
Setting this prop makes the container focusable by default.

#### Returns

`void`

***

### onFocus?

> `optional` **onFocus?**: () => `void`

Defined in: [types/src/index.ts:174](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L174)

Called when this container receives focus (Tab, Shift+Tab, or mouse click).
In uncontrolled mode, this is a notification callback.
In controlled mode, update [focused](#focused) here.

#### Returns

`void`

***

### onKeyPress?

> `optional` **onKeyPress?**: (`key`) => `void`

Defined in: [types/src/index.ts:206](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L206)

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

Defined in: [types/src/index.ts:144](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L144)

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

Defined in: [types/src/index.ts:125](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L125)

Content overflow behavior.
- `"hidden"` (default) — clip content at the container edge.
- `"scroll"` — enable scrolling along the main axis.

***

### padding?

> `optional` **padding?**: `object`

Defined in: [types/src/index.ts:101](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L101)

Internal padding in cells.
`x` adds horizontal padding (left + right), `y` adds vertical (top + bottom).

#### x?

> `optional` **x?**: `number`

#### y?

> `optional` **y?**: `number`

***

### scrollbar?

> `optional` **scrollbar?**: `boolean`

Defined in: [types/src/index.ts:128](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L128)

Show a scrollbar indicator when `overflow` is `"scroll"`.

***

### scrollOffset?

> `optional` **scrollOffset?**: `number`

Defined in: [types/src/index.ts:135](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L135)

Controlled scroll position in cells. When provided, the app owns
scroll state and must update this value via [onScroll](#onscroll).
When omitted, scroll is framework-managed (uncontrolled).

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:38](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L38)

Render text with an underline.

#### Inherited from

[`StyleProps`](StyleProps.md).[`underline`](StyleProps.md#underline)

***

### width?

> `optional` **width?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:69](https://github.com/sacenox/cel-tui/blob/3f42b8f9f04e894bda687c40d5c606614db01a42/packages/types/src/index.ts#L69)

Fixed width in cells, or percentage of parent width.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.
