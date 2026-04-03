[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextProps

# Interface: TextProps

Defined in: [types/src/index.ts:188](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L188)

Props for the Text primitive.

Text is a styled leaf node with no children and no sizing props —
the parent container controls the box. Height is intrinsic, computed
from content, newlines, and word-wrapping at the given width.

## Extends

- [`StyleProps`](StyleProps.md)

## Properties

### bgColor?

> `optional` **bgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:41](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L41)

Background color.

#### Inherited from

[`StyleProps`](StyleProps.md).[`bgColor`](StyleProps.md#bgcolor)

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:33](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L33)

Render text with bold weight.

#### Inherited from

[`StyleProps`](StyleProps.md).[`bold`](StyleProps.md#bold)

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:39](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L39)

Foreground (text) color.

#### Inherited from

[`StyleProps`](StyleProps.md).[`fgColor`](StyleProps.md#fgcolor)

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:35](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L35)

Render text in italic style.

#### Inherited from

[`StyleProps`](StyleProps.md).[`italic`](StyleProps.md#italic)

***

### repeat?

> `optional` **repeat?**: `number` \| `"fill"`

Defined in: [types/src/index.ts:197](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L197)

Repeat the text content a fixed number of times or to fill the
available width. When set, wrapping is ignored.

#### Example

```ts
repeat: "fill"  // fills parent width (e.g., dividers)
repeat: 20      // repeats exactly 20 times
```

***

### underline?

> `optional` **underline?**: `boolean`

Defined in: [types/src/index.ts:37](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L37)

Render text with an underline.

#### Inherited from

[`StyleProps`](StyleProps.md).[`underline`](StyleProps.md#underline)

***

### wrap?

> `optional` **wrap?**: `"none"` \| `"word"`

Defined in: [types/src/index.ts:206](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/types/src/index.ts#L206)

Text wrapping mode.
- `"none"` (default) — no wrapping, content is hard-clipped at the box edge.
- `"word"` — word-wrap to fit available width. Affects computed height.

Whitespace is always preserved. `\n` produces explicit line breaks.
