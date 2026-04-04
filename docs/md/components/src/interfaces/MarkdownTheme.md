[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / MarkdownTheme

# Interface: MarkdownTheme

Defined in: [components/src/markdown.ts:19](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L19)

Style configuration for the [Markdown](../functions/Markdown.md) component.

Each property controls the styling of a specific markdown element.
All properties are optional — unset values fall back to the
built-in default theme.

## Properties

### blockquoteBar?

> `optional` **blockquoteBar?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:33](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L33)

Style for the blockquote bar character (`│`).

***

### blockquoteText?

> `optional` **blockquoteText?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:35](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L35)

Text style for blockquote content.

***

### bold?

> `optional` **bold?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:39](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L39)

Style for **bold** inline text.

***

### codeBlock?

> `optional` **codeBlock?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:27](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L27)

Container style for fenced code blocks (applied to the wrapping VStack).

***

### codeContent?

> `optional` **codeContent?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:29](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L29)

Text style inside fenced code blocks.

***

### heading1?

> `optional` **heading1?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:21](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L21)

Style for `# heading` (level 1).

***

### heading2?

> `optional` **heading2?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:23](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L23)

Style for `## heading` (level 2).

***

### heading3?

> `optional` **heading3?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:25](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L25)

Style for `### heading` (level 3).

***

### hr?

> `optional` **hr?**: `object`

Defined in: [components/src/markdown.ts:37](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L37)

Divider color and character for horizontal rules.

#### char?

> `optional` **char?**: `string`

#### fgColor?

> `optional` **fgColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

***

### inlineCode?

> `optional` **inlineCode?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:43](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L43)

Style for `inline code` text.

***

### italic?

> `optional` **italic?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:41](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L41)

Style for *italic* inline text.

***

### link?

> `optional` **link?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:45](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L45)

Style for [link](url) text.

***

### listMarker?

> `optional` **listMarker?**: [`StyleProps`](../../../types/src/interfaces/StyleProps.md)

Defined in: [components/src/markdown.ts:31](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/markdown.ts#L31)

Style for list markers (`•`, `1.`).
