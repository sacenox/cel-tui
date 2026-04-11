[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / Markdown

# Function: Markdown()

> **Markdown**(`content`, `props?`): [`Node`](../../../types/src/type-aliases/Node.md)[]

Defined in: [components/src/markdown.ts:203](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/markdown.ts#L203)

Render a markdown string as an array of cel-tui nodes.

Parses the content into block-level tokens (via
[yoctomarkdown](https://www.npmjs.com/package/yoctomarkdown))
and maps each to styled primitives. The returned array is meant
to be used as children of a container (typically a scrollable VStack).

**Block-level styling** is fully supported: headings, code blocks,
lists, blockquotes, and horizontal rules are rendered with distinct
styles. **Inline styling** (bold, italic, code, links) is rendered
in paragraphs, list items, and blockquotes by splitting spans at
word boundaries into individual `Text` nodes inside a wrapping
`HStack({ flexWrap: "wrap" })`. Headings strip inline formatting
to plain text (they're typically short and single-line).

**Streaming** works naturally: append chunks to the content string
and call `cel.render()`. The component re-tokenizes the full string
each render. Unclosed code blocks and inline formatting are handled
gracefully.

## Parameters

### content

`string`

Markdown string (may be partial during streaming).

### props?

[`MarkdownProps`](../interfaces/MarkdownProps.md)

Optional theme overrides.

## Returns

[`Node`](../../../types/src/type-aliases/Node.md)[]

Array of nodes to spread into a container's children.

## Examples

// Static content
VStack({ flex: 1, overflow: "scroll", padding: { x: 1 } },
  Markdown("# Hello\n\nSome **bold** text.\n\n```js\nconst x = 1;\n```")
)

```ts
// Streaming from an LLM
let content = "";
onChunk((chunk) => { content += chunk; cel.render(); });

VStack({ flex: 1, overflow: "scroll" },
  Markdown(content)
)
```

```ts
// Custom theme
Markdown(content, {
  theme: { heading1: { bold: true, fgColor: "color05" } }
})
```
