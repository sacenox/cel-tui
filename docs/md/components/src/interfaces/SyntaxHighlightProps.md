[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / SyntaxHighlightProps

# Interface: SyntaxHighlightProps

Defined in: [components/src/syntax-highlight.ts:91](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/syntax-highlight.ts#L91)

Props for the [SyntaxHighlight](../functions/SyntaxHighlight.md) component.

## Properties

### theme?

> `optional` **theme?**: [`SyntaxHighlightTheme`](../type-aliases/SyntaxHighlightTheme.md)

Defined in: [components/src/syntax-highlight.ts:99](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/components/src/syntax-highlight.ts#L99)

Optional theme override.

Built-in presets currently include `"default"` and `"dark-plus"`.
Theme registration objects are applied as best-effort overrides onto the
lextide token categories used by this component.
