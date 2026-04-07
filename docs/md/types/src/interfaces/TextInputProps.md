[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextInputProps

# Interface: TextInputProps

Defined in: [types/src/index.ts:315](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L315)

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

Defined in: [types/src/index.ts:155](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L155)

Align children along the cross axis.
- VStack cross axis = horizontal
- HStack cross axis = vertical

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`alignItems`](ContainerProps.md#alignitems)

***

### bgColor?

> `optional` **bgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:79](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L79)

Background color.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`bgColor`](ContainerProps.md#bgcolor)

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:71](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L71)

Render text with bold weight.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`bold`](ContainerProps.md#bold)

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:77](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L77)

Foreground (text) color.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`fgColor`](ContainerProps.md#fgcolor)

***

### flex?

> `optional` **flex?**: `number`

Defined in: [types/src/index.ts:123](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L123)

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

Defined in: [types/src/index.ts:169](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L169)

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

Defined in: [types/src/index.ts:220](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L220)

Whether this container participates in focus traversal.
Defaults to `true` when [onClick](ContainerProps.md#onclick) is set. Set to `false`
to make a container clickable by mouse but not reachable via Tab.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`focusable`](ContainerProps.md#focusable)

***

### focused?

> `optional` **focused?**: `boolean`

Defined in: [types/src/index.ts:230](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L230)

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

Defined in: [types/src/index.ts:256](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L256)

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

Defined in: [types/src/index.ts:141](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L141)

Spacing between children in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`gap`](ContainerProps.md#gap)

***

### height?

> `optional` **height?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:113](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L113)

Fixed height in cells, or percentage of parent height.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`height`](ContainerProps.md#height)

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:73](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L73)

Render text in italic style.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`italic`](ContainerProps.md#italic)

***

### justifyContent?

> `optional` **justifyContent?**: `"start"` \| `"end"` \| `"center"` \| `"space-between"`

Defined in: [types/src/index.ts:148](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L148)

Distribute children along the main axis.
- VStack main axis = vertical
- HStack main axis = horizontal

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`justifyContent`](ContainerProps.md#justifycontent)

***

### maxHeight?

> `optional` **maxHeight?**: `number`

Defined in: [types/src/index.ts:132](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L132)

Maximum height constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`maxHeight`](ContainerProps.md#maxheight)

***

### maxWidth?

> `optional` **maxWidth?**: `number`

Defined in: [types/src/index.ts:128](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L128)

Maximum width constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`maxWidth`](ContainerProps.md#maxwidth)

***

### minHeight?

> `optional` **minHeight?**: `number`

Defined in: [types/src/index.ts:130](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L130)

Minimum height constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`minHeight`](ContainerProps.md#minheight)

***

### minWidth?

> `optional` **minWidth?**: `number`

Defined in: [types/src/index.ts:126](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L126)

Minimum width constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`minWidth`](ContainerProps.md#minwidth)

***

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: [types/src/index.ts:244](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L244)

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

Defined in: [types/src/index.ts:325](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L325)

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

Defined in: [types/src/index.ts:213](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L213)

Called on mouse click or Enter key when this container is focused.
Setting this prop makes the container focusable by default.

#### Returns

`void`

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`onClick`](ContainerProps.md#onclick)

***

### onFocus?

> `optional` **onFocus?**: () => `void`

Defined in: [types/src/index.ts:237](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L237)

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

Defined in: [types/src/index.ts:339](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L339)

Key handler that fires **before** the built-in editing logic.
Return `false` to prevent the default editing action for that key
(no character insertion, no cursor movement, no deletion).
Any other return (or no return) lets the default action proceed.

#### Parameters

##### key

`string`

#### Returns

`boolean` \| `void`

#### Example

```ts
// Enter submits instead of inserting a newline
onKeyPress: (key) => {
  if (key === "enter") { handleSend(); return false; }
}
```

#### Overrides

[`ContainerProps`](ContainerProps.md).[`onKeyPress`](ContainerProps.md#onkeypress)

***

### onScroll?

> `optional` **onScroll?**: (`offset`, `maxOffset`) => `void`

Defined in: [types/src/index.ts:207](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L207)

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

### overflow?

> `optional` **overflow?**: `"hidden"` \| `"scroll"`

Defined in: [types/src/index.ts:176](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L176)

Content overflow behavior.
- `"hidden"` (default) — clip content at the container edge.
- `"scroll"` — enable scrolling along the main axis.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`overflow`](ContainerProps.md#overflow)

***

### padding?

> `optional` **padding?**: `object`

Defined in: [types/src/index.ts:138](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L138)

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

Defined in: [types/src/index.ts:348](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L348)

A [TextNode](TextNode.md) displayed when [value](#value) is empty.
Fully stylable — pass a `Text()` call with any styling props.

#### Example

```ts
placeholder: Text("type a message...", { fgColor: "color08" })
```

***

### scrollbar?

> `optional` **scrollbar?**: `boolean`

Defined in: [types/src/index.ts:179](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L179)

Show a scrollbar indicator when `overflow` is `"scroll"`.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`scrollbar`](ContainerProps.md#scrollbar)

***

### scrollOffset?

> `optional` **scrollOffset?**: `number`

Defined in: [types/src/index.ts:197](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L197)

Controlled scroll position in cells. When provided, the app owns
scroll state and must update this value via [onScroll](ContainerProps.md#onscroll).
When omitted, scroll is framework-managed (uncontrolled).

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`scrollOffset`](ContainerProps.md#scrolloffset)

***

### scrollStep?

> `optional` **scrollStep?**: `number`

Defined in: [types/src/index.ts:190](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L190)

Mouse wheel step size in cells along the container's main axis.
When omitted, the framework uses an adaptive default based on the
scroll target's viewport size: `floor(viewportMainAxis / 3)`,
clamped to the range `3..8`.

Affects mouse wheel input only — not programmatic [scrollOffset](ContainerProps.md#scrolloffset)
updates or TextInput cursor-follow behavior.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`scrollStep`](ContainerProps.md#scrollstep)

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:75](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L75)

Render text with an underline.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`underline`](ContainerProps.md#underline)

***

### value

> **value**: `string`

Defined in: [types/src/index.ts:317](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L317)

Current text content. Controlled — the app owns this value.

***

### width?

> `optional` **width?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:106](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L106)

Fixed width in cells, or percentage of parent width.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`width`](ContainerProps.md#width)
