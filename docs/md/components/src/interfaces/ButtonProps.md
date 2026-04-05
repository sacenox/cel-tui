[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / ButtonProps

# Interface: ButtonProps

Defined in: [components/src/button.ts:12](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/button.ts#L12)

Props for the [Button](../functions/Button.md) component.

Extends [StyleProps](../../../types/src/interfaces/StyleProps.md) — all style props (`fgColor`, `bgColor`,
`bold`, `italic`, `underline`) are set on the container and inherited
by the label text. This enables `focusStyle` to override them when
the button is focused.

## Extends

- [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

## Properties

### bgColor?

> `optional` **bgColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

Defined in: [types/src/index.ts:78](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L78)

Background color.

#### Inherited from

[`StyleProps`](../../../types/src/interfaces/StyleProps.md).[`bgColor`](../../../types/src/interfaces/StyleProps.md#bgcolor)

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:70](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L70)

Render text with bold weight.

#### Inherited from

[`StyleProps`](../../../types/src/interfaces/StyleProps.md).[`bold`](../../../types/src/interfaces/StyleProps.md#bold)

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

Defined in: [types/src/index.ts:76](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L76)

Foreground (text) color.

#### Inherited from

[`StyleProps`](../../../types/src/interfaces/StyleProps.md).[`fgColor`](../../../types/src/interfaces/StyleProps.md#fgcolor)

***

### focusable?

> `optional` **focusable?**: `boolean`

Defined in: [components/src/button.ts:19](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/button.ts#L19)

Whether the button participates in focus traversal.

#### Default

```ts
true
```

***

### focused?

> `optional` **focused?**: `boolean`

Defined in: [components/src/button.ts:25](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/button.ts#L25)

Whether this button is currently focused (controlled mode).
When provided, the app owns focus state and must update it
via [onFocus](#onfocus)/[onBlur](#onblur).

***

### focusStyle?

> `optional` **focusStyle?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/button.ts:35](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/button.ts#L35)

Style overrides applied when focused. Overridden values
participate in inheritance — the label text sees the
focused styles as its defaults.

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:72](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L72)

Render text in italic style.

#### Inherited from

[`StyleProps`](../../../types/src/interfaces/StyleProps.md).[`italic`](../../../types/src/interfaces/StyleProps.md#italic)

***

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: [components/src/button.ts:29](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/button.ts#L29)

Called when the button loses focus.

#### Returns

`void`

***

### onClick

> **onClick**: () => `void`

Defined in: [components/src/button.ts:14](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/button.ts#L14)

Called on mouse click or Enter when focused.

#### Returns

`void`

***

### onFocus?

> `optional` **onFocus?**: () => `void`

Defined in: [components/src/button.ts:27](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/button.ts#L27)

Called when the button receives focus.

#### Returns

`void`

***

### onKeyPress?

> `optional` **onKeyPress?**: (`key`) => `boolean` \| `void`

Defined in: [components/src/button.ts:40](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/button.ts#L40)

Key event handler. Receives keys that bubble up to this button.
Return `false` to keep bubbling.

#### Parameters

##### key

`string`

#### Returns

`boolean` \| `void`

***

### padding?

> `optional` **padding?**: `object`

Defined in: [components/src/button.ts:42](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/button.ts#L42)

Internal padding in cells.

#### x?

> `optional` **x?**: `number`

#### y?

> `optional` **y?**: `number`

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:74](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L74)

Render text with an underline.

#### Inherited from

[`StyleProps`](../../../types/src/interfaces/StyleProps.md).[`underline`](../../../types/src/interfaces/StyleProps.md#underline)
