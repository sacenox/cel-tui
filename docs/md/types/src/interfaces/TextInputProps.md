[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextInputProps

# Interface: TextInputProps

Defined in: [types/src/index.ts:303](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L303)

Props for the TextInput primitive.

TextInput is a multi-line editable text container. It accepts container
sizing props but has no children — its content is the [value](#value) prop.
Scroll is always framework-managed (follows cursor and responds to mouse wheel).
Word-wrap is always on.

## Extends

- [`ContainerProps`](ContainerProps.md)

## Properties

### alignItems?

> `optional` **alignItems?**: `"start"` \| `"end"` \| `"center"` \| `"stretch"`

Defined in: [types/src/index.ts:154](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L154)

Align children along the cross axis.
- VStack cross axis = horizontal
- HStack cross axis = vertical

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`alignItems`](ContainerProps.md#alignitems)

***

### bgColor?

> `optional` **bgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:78](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L78)

Background color.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`bgColor`](ContainerProps.md#bgcolor)

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:70](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L70)

Render text with bold weight.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`bold`](ContainerProps.md#bold)

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:76](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L76)

Foreground (text) color.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`fgColor`](ContainerProps.md#fgcolor)

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

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`flex`](ContainerProps.md#flex)

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

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`flexWrap`](ContainerProps.md#flexwrap)

***

### focusable?

> `optional` **focusable?**: `boolean`

Defined in: [types/src/index.ts:208](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L208)

Whether this container participates in focus traversal.
Defaults to `true` when [onClick](ContainerProps.md#onclick) is set. Set to `false`
to make a container clickable by mouse but not reachable via Tab.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`focusable`](ContainerProps.md#focusable)

***

### focused?

> `optional` **focused?**: `boolean`

Defined in: [types/src/index.ts:218](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L218)

Whether this container is currently focused.

When provided, focus is **controlled** — the app owns the state and
must update this value via [onFocus](ContainerProps.md#onfocus)/[onBlur](ContainerProps.md#onblur).
When omitted, focus is **uncontrolled** — the framework manages
focus internally (Tab/Shift+Tab/Escape/click just work).

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`focused`](ContainerProps.md#focused)

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

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`focusStyle`](ContainerProps.md#focusstyle)

***

### gap?

> `optional` **gap?**: `number`

Defined in: [types/src/index.ts:140](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L140)

Spacing between children in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`gap`](ContainerProps.md#gap)

***

### height?

> `optional` **height?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:112](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L112)

Fixed height in cells, or percentage of parent height.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`height`](ContainerProps.md#height)

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:72](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L72)

Render text in italic style.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`italic`](ContainerProps.md#italic)

***

### justifyContent?

> `optional` **justifyContent?**: `"start"` \| `"end"` \| `"center"` \| `"space-between"`

Defined in: [types/src/index.ts:147](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L147)

Distribute children along the main axis.
- VStack main axis = vertical
- HStack main axis = horizontal

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`justifyContent`](ContainerProps.md#justifycontent)

***

### maxHeight?

> `optional` **maxHeight?**: `number`

Defined in: [types/src/index.ts:131](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L131)

Maximum height constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`maxHeight`](ContainerProps.md#maxheight)

***

### maxWidth?

> `optional` **maxWidth?**: `number`

Defined in: [types/src/index.ts:127](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L127)

Maximum width constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`maxWidth`](ContainerProps.md#maxwidth)

***

### minHeight?

> `optional` **minHeight?**: `number`

Defined in: [types/src/index.ts:129](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L129)

Minimum height constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`minHeight`](ContainerProps.md#minheight)

***

### minWidth?

> `optional` **minWidth?**: `number`

Defined in: [types/src/index.ts:125](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L125)

Minimum width constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`minWidth`](ContainerProps.md#minwidth)

***

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: [types/src/index.ts:232](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L232)

Called when this container loses focus.
In uncontrolled mode, this is a notification callback.
In controlled mode, update [focused](ContainerProps.md#focused) here.

#### Returns

`void`

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`onBlur`](ContainerProps.md#onblur)

***

### onChange

> **onChange**: (`value`) => `void`

Defined in: [types/src/index.ts:313](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L313)

Called when the user edits text. Update [value](#onchange) with the new
string and call `cel.render()` to reflect the change.

#### Parameters

##### value

`string`

The new text content.

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

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`onClick`](ContainerProps.md#onclick)

***

### onFocus?

> `optional` **onFocus?**: () => `void`

Defined in: [types/src/index.ts:225](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L225)

Called when this container receives focus (Tab, Shift+Tab, or mouse click).
In uncontrolled mode, this is a notification callback.
In controlled mode, update [focused](ContainerProps.md#focused) here.

#### Returns

`void`

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`onFocus`](ContainerProps.md#onfocus)

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

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`onKeyPress`](ContainerProps.md#onkeypress)

***

### onScroll?

> `optional` **onScroll?**: (`offset`, `maxOffset`) => `void`

Defined in: [types/src/index.ts:195](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L195)

Called when the user scrolls this container (mouse wheel).
In controlled mode, update [scrollOffset](ContainerProps.md#scrolloffset) with the new value
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

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`onScroll`](ContainerProps.md#onscroll)

***

### onSubmit?

> `optional` **onSubmit?**: () => `void`

Defined in: [types/src/index.ts:319](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L319)

Called when the user presses the submit key.

#### Returns

`void`

#### See

[submitKey](#submitkey)

***

### overflow?

> `optional` **overflow?**: `"hidden"` \| `"scroll"`

Defined in: [types/src/index.ts:175](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L175)

Content overflow behavior.
- `"hidden"` (default) — clip content at the container edge.
- `"scroll"` — enable scrolling along the main axis.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`overflow`](ContainerProps.md#overflow)

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

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`padding`](ContainerProps.md#padding)

***

### placeholder?

> `optional` **placeholder?**: [`TextNode`](TextNode.md)

Defined in: [types/src/index.ts:337](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L337)

A [TextNode](TextNode.md) displayed when [value](#value) is empty.
Fully stylable — pass a `Text()` call with any styling props.

#### Example

```ts
placeholder: Text("type a message...", { fgColor: "color08" })
```

***

### scrollbar?

> `optional` **scrollbar?**: `boolean`

Defined in: [types/src/index.ts:178](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L178)

Show a scrollbar indicator when `overflow` is `"scroll"`.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`scrollbar`](ContainerProps.md#scrollbar)

***

### scrollOffset?

> `optional` **scrollOffset?**: `number`

Defined in: [types/src/index.ts:185](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L185)

Controlled scroll position in cells. When provided, the app owns
scroll state and must update this value via [onScroll](ContainerProps.md#onscroll).
When omitted, scroll is framework-managed (uncontrolled).

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`scrollOffset`](ContainerProps.md#scrolloffset)

***

### submitKey?

> `optional` **submitKey?**: `string`

Defined in: [types/src/index.ts:328](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L328)

Key combo that fires [onSubmit](#onsubmit).

#### Default

```ts
"enter"
```

#### Example

```ts
submitKey: "ctrl+enter"  // Enter inserts newline, Ctrl+Enter submits
```

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:74](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L74)

Render text with an underline.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`underline`](ContainerProps.md#underline)

***

### value

> **value**: `string`

Defined in: [types/src/index.ts:305](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L305)

Current text content. Controlled — the app owns this value.

***

### width?

> `optional` **width?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:105](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L105)

Fixed width in cells, or percentage of parent width.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`width`](ContainerProps.md#width)
