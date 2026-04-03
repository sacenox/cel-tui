[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [types/src](../README.md) / SizeValue

# Type Alias: SizeValue

> **SizeValue** = `number` \| `` `${number}%` ``

Defined in: [types/src/index.ts:52](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/types/src/index.ts#L52)

A size value expressed as a fixed cell count or a percentage string.

## Example

```ts
30; // 30 cells
("50%"); // 50% of parent
("100%"); // fill parent
```
