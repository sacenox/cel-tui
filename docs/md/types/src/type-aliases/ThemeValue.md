[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / ThemeValue

# Type Alias: ThemeValue

> **ThemeValue** = `number` \| `string`

Defined in: [types/src/index.ts:39](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/types/src/index.ts#L39)

A theme value for a single color slot.

- `number` (0–15) — ANSI 16 palette index. Emitted as standard SGR codes
  (e.g., index 1 → fg 31, bg 41). Values outside 0–15 are not supported
  and will produce incorrect SGR codes.
- `string` — 24-bit hex color (e.g., `"#ff0000"`). Emitted as
  true-color SGR codes (`38;2;r;g;b` / `48;2;r;g;b`).
