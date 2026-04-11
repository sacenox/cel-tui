[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / SyntaxHighlight

# Function: SyntaxHighlight()

> **SyntaxHighlight**(`content`, `language`, `props?`): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [components/src/syntax-highlight.ts:739](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/syntax-highlight.ts#L739)

Render syntax-highlighted code as cel-tui primitives.

Uses lextide synchronously at the component boundary while keeping a
streaming parser state per language/theme cache entry. Append-only updates
apply lextide's recall/stable/unstable deltas, while non-append edits reset
the stream and replay the full snippet.

Unknown languages render as plain text. The default theme is terminal-friendly
and maps lextide token classes onto cel's ANSI palette slots while leaving
base text on terminal defaults.

## Parameters

### content

`string`

Source code to render.

### language

`string`

Registered lextide language id or alias.

### props?

[`SyntaxHighlightProps`](../interfaces/SyntaxHighlightProps.md)

Optional theme override.

## Returns

[`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

A `VStack` containing one highlighted line per child.
