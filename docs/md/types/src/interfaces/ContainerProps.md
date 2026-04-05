[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / ContainerProps

# Interface: ContainerProps

Defined in: [types/src/index.ts:99](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L99)

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

Defined in: [types/src/index.ts:154](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L154)

Align children along the cross axis.
- VStack cross axis = horizontal
- HStack cross axis = vertical

***

### bgColor?

> `optional` **bgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:78](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L78)

Background color.

#### Inherited from

[`StyleProps`](StyleProps.md).[`bgColor`](StyleProps.md#bgcolor)

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:70](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L70)

Render text with bold weight.

#### Inherited from

[`StyleProps`](StyleProps.md).[`bold`](StyleProps.md#bold)

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:76](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L76)

Foreground (text) color.

#### Inherited from

[`StyleProps`](StyleProps.md).[`fgColor`](StyleProps.md#fgcolor)

***

### flex?

> `optional` **flex?**: `number`

Defined in: [types/src/index.ts:122](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L122)

Flex grow factor. Space remaining after fixed and intrinsic children
is distributed proportionally among flex children.

#### Example

```ts
flex: 1  // equal share
flex: 2  // double share
```

***

### flexWrap?

> `optional` **flexWrap?**: `"nowrap"` \| `"wrap"`

Defined in: [types/src/index.ts:168](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L168)

Whether children wrap to the next line when they exceed the
container's main-axis size. Only meaningful on HStack.

- `"nowrap"` (default) — all children on one line, may overflow.
- `"wrap"` — children that exceed the width flow to the next row.

When wrapping, each row is laid out independently: flex children
distribute remaining space within their row, `justifyContent`
applies per row, and `alignItems` applies per row. Rows are
stacked vertically with `gap` spacing between them.

***

### focusable?

> `optional` **focusable?**: `boolean`

Defined in: [types/src/index.ts:208](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L208)

Whether this container participates in focus traversal.
Defaults to `true` when [onClick](#onclick) is set. Set to `false`
to make a container clickable by mouse but not reachable via Tab.

***

### focused?

> `optional` **focused?**: `boolean`

Defined in: [types/src/index.ts:218](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L218)

Whether this container is currently focused.

When provided, focus is **controlled** — the app owns the state and
must update this value via [onFocus](#onfocus)/[onBlur](#onblur).
When omitted, focus is **uncontrolled** — the framework manages
focus internally (Tab/Shift+Tab/Escape/click just work).

***

### focusStyle?

> `optional` **focusStyle?**: [`StyleProps`](StyleProps.md)

Defined in: [types/src/index.ts:244](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L244)

Style overrides applied when this element is focused.
Accepts any [StyleProps](StyleProps.md) — overridden values replace the
element's normal styles and participate in inheritance.

Works in both uncontrolled and controlled focus modes.

#### Example

```ts
{ bgColor: "color06", fgColor: "color00" }  // reverse-video effect
```

***

### gap?

> `optional` **gap?**: `number`

Defined in: [types/src/index.ts:140](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L140)

Spacing between children in cells.

***

### height?

> `optional` **height?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:112](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L112)

Fixed height in cells, or percentage of parent height.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:72](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L72)

Render text in italic style.

#### Inherited from

[`StyleProps`](StyleProps.md).[`italic`](StyleProps.md#italic)

***

### justifyContent?

> `optional` **justifyContent?**: `"start"` \| `"end"` \| `"center"` \| `"space-between"`

Defined in: [types/src/index.ts:147](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L147)

Distribute children along the main axis.
- VStack main axis = vertical
- HStack main axis = horizontal

***

### maxHeight?

> `optional` **maxHeight?**: `number`

Defined in: [types/src/index.ts:131](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L131)

Maximum height constraint in cells.

***

### maxWidth?

> `optional` **maxWidth?**: `number`

Defined in: [types/src/index.ts:127](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L127)

Maximum width constraint in cells.

***

### minHeight?

> `optional` **minHeight?**: `number`

Defined in: [types/src/index.ts:129](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L129)

Minimum height constraint in cells.

***

### minWidth?

> `optional` **minWidth?**: `number`

Defined in: [types/src/index.ts:125](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L125)

Minimum width constraint in cells.

***

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: [types/src/index.ts:232](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L232)

Called when this container loses focus.
In uncontrolled mode, this is a notification callback.
In controlled mode, update [focused](#focused) here.

#### Returns

`void`

***

### onClick?

> `optional` **onClick?**: () => `void`

Defined in: [types/src/index.ts:201](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L201)

Called on mouse click or Enter key when this container is focused.
Setting this prop makes the container focusable by default.

#### Returns

`void`

***

### onFocus?

> `optional` **onFocus?**: () => `void`

Defined in: [types/src/index.ts:225](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L225)

Called when this container receives focus (Tab, Shift+Tab, or mouse click).
In uncontrolled mode, this is a notification callback.
In controlled mode, update [focused](#focused) here.

#### Returns

`void`

***

### onKeyPress?

> `optional` **onKeyPress?**: (`key`) => `boolean` \| `void`

Defined in: [types/src/index.ts:264](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L264)

Called on key events that bubble up to this container.
Keys are first handled by the focused element; unconsumed keys
(e.g., modifier combos like `"ctrl+s"`) bubble up through ancestors.
The root container's `onKeyPress` acts as the global key handler.

Return `false` to indicate the key was **not consumed** — it will
continue bubbling to the next ancestor handler. Any other return
value (`undefined`, `true`, or no return) means the key was consumed
and bubbling stops. This is backward-compatible: existing `void`
handlers consume by default.

Key format: all lowercase, modifiers joined by `+` in canonical
order `ctrl+alt+shift+<key>` (e.g., `"ctrl+s"`, `"alt+up"`, `"escape"`).

#### Parameters

##### key

`string`

Normalized key string.

#### Returns

`boolean` \| `void`

`false` to keep bubbling, anything else to consume.

***

### onScroll?

> `optional` **onScroll?**: (`offset`, `maxOffset`) => `void`

Defined in: [types/src/index.ts:195](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L195)

Called when the user scrolls this container (mouse wheel).
In controlled mode, update [scrollOffset](#scrolloffset) with the new value
to move the scroll position.

#### Parameters

##### offset

`number`

The new scroll offset in cells.

##### maxOffset

`number`

The maximum scroll offset (content size minus viewport size).

#### Returns

`void`

***

### overflow?

> `optional` **overflow?**: `"hidden"` \| `"scroll"`

Defined in: [types/src/index.ts:175](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L175)

Content overflow behavior.
- `"hidden"` (default) — clip content at the container edge.
- `"scroll"` — enable scrolling along the main axis.

***

### padding?

> `optional` **padding?**: `object`

Defined in: [types/src/index.ts:137](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L137)

Internal padding in cells.
`x` adds horizontal padding (left + right), `y` adds vertical (top + bottom).

#### x?

> `optional` **x?**: `number`

#### y?

> `optional` **y?**: `number`

***

### scrollbar?

> `optional` **scrollbar?**: `boolean`

Defined in: [types/src/index.ts:178](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L178)

Show a scrollbar indicator when `overflow` is `"scroll"`.

***

### scrollOffset?

> `optional` **scrollOffset?**: `number`

Defined in: [types/src/index.ts:185](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L185)

Controlled scroll position in cells. When provided, the app owns
scroll state and must update this value via [onScroll](#onscroll).
When omitted, scroll is framework-managed (uncontrolled).

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:74](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L74)

Render text with an underline.

#### Inherited from

[`StyleProps`](StyleProps.md).[`underline`](StyleProps.md#underline)

***

### width?

> `optional` **width?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:105](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L105)

Fixed width in cells, or percentage of parent width.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.
