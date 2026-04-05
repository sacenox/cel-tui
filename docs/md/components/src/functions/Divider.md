[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / Divider

# Function: Divider()

> **Divider**(`props?`): [`TextNode`](../../../types/src/interfaces/TextNode.md)

Defined in: [components/src/divider.ts:34](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/components/src/divider.ts#L34)

Horizontal divider that fills the available width.

Renders a single character repeated to fill the parent's width
using `Text` with `repeat: "fill"`.

## Parameters

### props?

[`DividerProps`](../interfaces/DividerProps.md) = `{}`

Divider character and color.

## Returns

[`TextNode`](../../../types/src/interfaces/TextNode.md)

A text node that fills the available width.

## Example

```ts
// Default thin line
Divider()

// Thick line with color
Divider({ char: "━", fgColor: "color08" })

// Double line
Divider({ char: "═" })
```
