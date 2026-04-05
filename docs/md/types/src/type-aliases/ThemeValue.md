[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / ThemeValue

# Type Alias: ThemeValue

> **ThemeValue** = `number` \| `string`

Defined in: [types/src/index.ts:38](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/types/src/index.ts#L38)

A theme value for a single color slot.

- `number` (0–15) — ANSI palette index. Emitted as standard SGR codes
  (e.g., index 1 → fg 31, bg 41).
- `string` — 24-bit hex color (e.g., `"#ff0000"`). Emitted as
  true-color SGR codes (`38;2;r;g;b` / `48;2;r;g;b`).
