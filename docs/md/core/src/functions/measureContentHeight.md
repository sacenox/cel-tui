[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / measureContentHeight

# Function: measureContentHeight()

> **measureContentHeight**(`node`, `options`): `number`

Defined in: [core/src/layout.ts:326](https://github.com/sacenox/cel-tui/blob/0b562f7e6ef4714e6324d16018cd997c4e9e5d95/packages/core/src/layout.ts#L326)

Measure a node tree's intrinsic content height at the provided width.

This is a content-measurement helper, not a viewport/clipping helper.
The caller-provided `width` is the authoritative wrapping width for the
measured subtree. Measurement starts at the given node, ignores that
node's own main-axis height constraints, and walks downward through its
descendants. Descendant sizing rules still apply normally.

Use this for intrinsically sized content such as scrollback/message
history chunks. If a wrapper's visible height is controlled by `height`,
`flex`, or percentage sizing, measure the content subtree inside that
wrapper instead.

## Parameters

### node

[`Node`](../../../types/src/type-aliases/Node.md)

### options

#### width

`number`

## Returns

`number`

## Example

```ts
const addedHeight = measureContentHeight(
  VStack({}, olderMessages.map(renderMessage)),
  { width: historyContentWidth },
);

scrollOffset += addedHeight;
```
