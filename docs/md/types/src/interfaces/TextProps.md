[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / TextProps

# Interface: TextProps

Defined in: [types/src/index.ts:223](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L223)

Props for the Text primitive.

Text is a styled leaf node with no children and no sizing props —
the parent container controls the box. Height is intrinsic, computed
from content, newlines, and word-wrapping at the given width.

## Extends

- [`StyleProps`](StyleProps.md)

## Properties

### bgColor?

> `optional` **bgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:42](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L42)

Background color.

#### Inherited from

[`StyleProps`](StyleProps.md).[`bgColor`](StyleProps.md#bgcolor)

***

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/src/index.ts:34](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L34)

Render text with bold weight.

#### Inherited from

[`StyleProps`](StyleProps.md).[`bold`](StyleProps.md#bold)

***

### fgColor?

> `optional` **fgColor?**: [`Color`](../type-aliases/Color.md)

Defined in: [types/src/index.ts:40](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L40)

Foreground (text) color.

#### Inherited from

[`StyleProps`](StyleProps.md).[`fgColor`](StyleProps.md#fgcolor)

***

### italic?

> `optional` **italic?**: `boolean`

Defined in: [types/src/index.ts:36](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L36)

Render text in italic style.

#### Inherited from

[`StyleProps`](StyleProps.md).[`italic`](StyleProps.md#italic)

***

### repeat?

> `optional` **repeat?**: `number` \| `"fill"`

Defined in: [types/src/index.ts:232](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L232)

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

Defined in: [types/src/index.ts:38](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L38)

Render text with an underline.

#### Inherited from

[`StyleProps`](StyleProps.md).[`underline`](StyleProps.md#underline)

***

### wrap?

> `optional` **wrap?**: `"none"` \| `"word"`

Defined in: [types/src/index.ts:241](https://github.com/sacenox/cel-tui/blob/f2a837959f6d7d9dca284e25c18a66f158f34f2f/packages/types/src/index.ts#L241)

Text wrapping mode.
- `"none"` (default) — no wrapping, content is hard-clipped at the box edge.
- `"word"` — word-wrap to fit available width. Affects computed height.

Whitespace is always preserved. `\n` produces explicit line breaks.
