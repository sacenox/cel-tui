[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextInputProps

# Interface: TextInputProps

Defined in: [types/src/index.ts:217](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L217)

Props for the TextInput primitive.

TextInput is a multi-line editable text container. It accepts container
sizing props but has no children — its content is the [value](#value) prop.
Scroll is always framework-managed (follows cursor and responds to mouse wheel).
Word-wrap is always on.

## Extends

- [`ContainerProps`](ContainerProps.md).[`StyleProps`](StyleProps.md)

## Properties

### alignItems?

> `optional` **alignItems?**: `"start"` \| `"end"` \| `"center"` \| `"stretch"`

Defined in: [types/src/index.ts:114](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L114)

Align children along the cross axis.

- VStack cross axis = horizontal
- HStack cross axis = vertical

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`alignItems`](ContainerProps.md#alignitems)

---

### bgColor?

> `optional` **bgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:41](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L41)

Background color.

#### Inherited from

[`StyleProps`](StyleProps.md).[`bgColor`](StyleProps.md#bgcolor)

---

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:33](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L33)

Render text with bold weight.

#### Inherited from

[`StyleProps`](StyleProps.md).[`bold`](StyleProps.md#bold)

---

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:39](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L39)

Foreground (text) color.

#### Inherited from

[`StyleProps`](StyleProps.md).[`fgColor`](StyleProps.md#fgcolor)

---

### flex?

> `optional` **flex?**: `number`

Defined in: [types/src/index.ts:82](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L82)

Flex grow factor. Space remaining after fixed and intrinsic children
is distributed proportionally among flex children.

#### Example

```ts
flex: 1; // equal share
flex: 2; // double share
```

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`flex`](ContainerProps.md#flex)

---

### focusable?

> `optional` **focusable?**: `boolean`

Defined in: [types/src/index.ts:153](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L153)

Whether this container participates in focus traversal.
Defaults to `true` when [onClick](ContainerProps.md#onclick) is set. Set to `false`
to make a container clickable by mouse but not reachable via Tab.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`focusable`](ContainerProps.md#focusable)

---

### focused?

> `optional` **focused?**: `boolean`

Defined in: [types/src/index.ts:257](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L257)

Whether this input is currently focused. Controlled — the app
owns focus state. TextInput is always focusable.

#### Overrides

[`ContainerProps`](ContainerProps.md).[`focused`](ContainerProps.md#focused)

---

### gap?

> `optional` **gap?**: `number`

Defined in: [types/src/index.ts:100](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L100)

Spacing between children in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`gap`](ContainerProps.md#gap)

---

### height?

> `optional` **height?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:72](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L72)

Fixed height in cells, or percentage of parent height.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`height`](ContainerProps.md#height)

---

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:35](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L35)

Render text in italic style.

#### Inherited from

[`StyleProps`](StyleProps.md).[`italic`](StyleProps.md#italic)

---

### justifyContent?

> `optional` **justifyContent?**: `"start"` \| `"end"` \| `"center"` \| `"space-between"`

Defined in: [types/src/index.ts:107](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L107)

Distribute children along the main axis.

- VStack main axis = vertical
- HStack main axis = horizontal

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`justifyContent`](ContainerProps.md#justifycontent)

---

### maxHeight?

> `optional` **maxHeight?**: `number`

Defined in: [types/src/index.ts:91](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L91)

Maximum height constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`maxHeight`](ContainerProps.md#maxheight)

---

### maxWidth?

> `optional` **maxWidth?**: `number`

Defined in: [types/src/index.ts:87](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L87)

Maximum width constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`maxWidth`](ContainerProps.md#maxwidth)

---

### minHeight?

> `optional` **minHeight?**: `number`

Defined in: [types/src/index.ts:89](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L89)

Minimum height constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`minHeight`](ContainerProps.md#minheight)

---

### minWidth?

> `optional` **minWidth?**: `number`

Defined in: [types/src/index.ts:85](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L85)

Minimum width constraint in cells.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`minWidth`](ContainerProps.md#minwidth)

---

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: [types/src/index.ts:263](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L263)

Called when this input loses focus.

#### Returns

`void`

#### Overrides

[`ContainerProps`](ContainerProps.md).[`onBlur`](ContainerProps.md#onblur)

---

### onChange

> **onChange**: (`value`) => `void`

Defined in: [types/src/index.ts:227](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L227)

Called when the user edits text. Update [value](#onchange) with the new
string and call `cel.render()` to reflect the change.

#### Parameters

##### value

`string`

The new text content.

#### Returns

`void`

---

### onClick?

> `optional` **onClick?**: () => `void`

Defined in: [types/src/index.ts:146](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L146)

Called on mouse click or Enter key when this container is focused.
Setting this prop makes the container focusable by default.

#### Returns

`void`

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`onClick`](ContainerProps.md#onclick)

---

### onFocus?

> `optional` **onFocus?**: () => `void`

Defined in: [types/src/index.ts:260](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L260)

Called when this input receives focus (Tab, Shift+Tab, or mouse click).

#### Returns

`void`

#### Overrides

[`ContainerProps`](ContainerProps.md).[`onFocus`](ContainerProps.md#onfocus)

---

### onKeyPress?

> `optional` **onKeyPress?**: (`key`) => `void`

Defined in: [types/src/index.ts:178](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L178)

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

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`onKeyPress`](ContainerProps.md#onkeypress)

---

### onScroll?

> `optional` **onScroll?**: (`offset`) => `void`

Defined in: [types/src/index.ts:140](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L140)

Called when the user scrolls this container (mouse wheel).
In controlled mode, update [scrollOffset](ContainerProps.md#scrolloffset) with the new value
to move the scroll position.

#### Parameters

##### offset

`number`

The new scroll offset in cells.

#### Returns

`void`

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`onScroll`](ContainerProps.md#onscroll)

---

### onSubmit?

> `optional` **onSubmit?**: () => `void`

Defined in: [types/src/index.ts:233](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L233)

Called when the user presses the submit key.

#### Returns

`void`

#### See

[submitKey](#submitkey)

---

### overflow?

> `optional` **overflow?**: `"hidden"` \| `"scroll"`

Defined in: [types/src/index.ts:121](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L121)

Content overflow behavior.

- `"hidden"` (default) — clip content at the container edge.
- `"scroll"` — enable scrolling along the main axis.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`overflow`](ContainerProps.md#overflow)

---

### padding?

> `optional` **padding?**: `object`

Defined in: [types/src/index.ts:97](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L97)

Internal padding in cells.
`x` adds horizontal padding (left + right), `y` adds vertical (top + bottom).

#### x?

> `optional` **x?**: `number`

#### y?

> `optional` **y?**: `number`

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`padding`](ContainerProps.md#padding)

---

### placeholder?

> `optional` **placeholder?**: [`TextNode`](TextNode.md)

Defined in: [types/src/index.ts:251](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L251)

A [TextNode](TextNode.md) displayed when [value](#value) is empty.
Fully stylable — pass a `Text()` call with any styling props.

#### Example

```ts
placeholder: Text("type a message...", { fgColor: "brightBlack" });
```

---

### scrollbar?

> `optional` **scrollbar?**: `boolean`

Defined in: [types/src/index.ts:124](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L124)

Show a scrollbar indicator when `overflow` is `"scroll"`.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`scrollbar`](ContainerProps.md#scrollbar)

---

### scrollOffset?

> `optional` **scrollOffset?**: `number`

Defined in: [types/src/index.ts:131](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L131)

Controlled scroll position in cells. When provided, the app owns
scroll state and must update this value via [onScroll](ContainerProps.md#onscroll).
When omitted, scroll is framework-managed (uncontrolled).

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`scrollOffset`](ContainerProps.md#scrolloffset)

---

### submitKey?

> `optional` **submitKey?**: `string`

Defined in: [types/src/index.ts:242](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L242)

Key combo that fires [onSubmit](#onsubmit).

#### Default

```ts
"enter";
```

#### Example

```ts
submitKey: "ctrl+enter"; // Enter inserts newline, Ctrl+Enter submits
```

---

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:37](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L37)

Render text with an underline.

#### Inherited from

[`StyleProps`](StyleProps.md).[`underline`](StyleProps.md#underline)

---

### value

> **value**: `string`

Defined in: [types/src/index.ts:219](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L219)

Current text content. Controlled — the app owns this value.

---

### width?

> `optional` **width?**: [`SizeValue`](../type-aliases/SizeValue.md)

Defined in: [types/src/index.ts:65](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L65)

Fixed width in cells, or percentage of parent width.
When omitted, the container uses intrinsic sizing (fits content)
or flex/percentage if those are set.

#### Inherited from

[`ContainerProps`](ContainerProps.md).[`width`](ContainerProps.md#width)
