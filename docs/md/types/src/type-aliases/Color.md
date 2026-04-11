[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [types/src](../README.md) / Color

# Type Alias: Color

> **Color** = `"color00"` \| `"color01"` \| `"color02"` \| `"color03"` \| `"color04"` \| `"color05"` \| `"color06"` \| `"color07"` \| `"color08"` \| `"color09"` \| `"color10"` \| `"color11"` \| `"color12"` \| `"color13"` \| `"color14"` \| `"color15"`

Defined in: [types/src/index.ts:12](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/types/src/index.ts#L12)

A numbered color slot in the 16-color palette.

Colors are abstract palette references — `"color00"` through `"color15"`.
The active [Theme](Theme.md) determines what each slot actually looks like.
With the default ANSI 16 theme, they map to the terminal's configured
color palette (matching standard ANSI indices 0–15).

Omitting a color prop (`undefined`) means "use the terminal default",
which is separate from any palette slot.
