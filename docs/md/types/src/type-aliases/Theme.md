[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / Theme

# Type Alias: Theme

> **Theme** = `Record`\<[`Color`](Color.md), [`ThemeValue`](ThemeValue.md)\>

Defined in: [types/src/index.ts:59](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L59)

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
