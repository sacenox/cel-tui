[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / Theme

# Type Alias: Theme

> **Theme** = `Record`\<[`Color`](Color.md), [`ThemeValue`](ThemeValue.md)\>

Defined in: [types/src/index.ts:60](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L60)

A mapping from the 16 color slots to rendering output.

The default theme maps each slot to its matching ANSI palette index
(color00 → 0, color01 → 1, etc.), inheriting the terminal's configured
color scheme automatically.

Custom themes can remap slots to different ANSI indices, 24-bit hex
colors, or a mix of both.

## Example

```ts
// Catppuccin Mocha (true color)
const mocha: Theme = {
  color00: "#1e1e2e",
  color01: "#f38ba8",
  color02: "#a6e3a1",
  // ... remaining slots
};
```
