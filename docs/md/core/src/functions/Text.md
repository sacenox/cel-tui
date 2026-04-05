[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / Text

# Function: Text()

> **Text**(`content`, `props?`): [`TextNode`](../../../types/src/interfaces/TextNode.md)

Defined in: [core/src/primitives/text.ts:27](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/primitives/text.ts#L27)

Create a styled text leaf node.

Text has no children and no sizing props — the parent container
controls the box. Width is always parent-assigned. Height is intrinsic,
computed from content, newlines (`\n`), and word-wrapping at the given width.

Whitespace is always preserved. Content that exceeds the box is
hard-clipped (no ellipsis).

## Parameters

### content

`string`

The text string to display.

### props?

[`TextProps`](../../../types/src/interfaces/TextProps.md) = `{}`

Styling, repeat, and wrapping props.

## Returns

[`TextNode`](../../../types/src/interfaces/TextNode.md)

A text node for the UI tree.

## Example

```ts
// Simple styled text
Text("Hello", { bold: true, fgColor: "color06" })

// Horizontal divider
Text("─", { repeat: "fill" })

// Word-wrapped paragraph
Text(paragraph, { wrap: "word" })
```
