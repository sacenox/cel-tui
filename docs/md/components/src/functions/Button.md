[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / Button

# Function: Button()

> **Button**(`label`, `props`): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [components/src/button.ts:39](https://github.com/sacenox/cel-tui/blob/c22a4594bf50c6f4704e9f084926eb0b2ffdc459/packages/components/src/button.ts#L39)

Clickable button with a styled text label.

A convenience wrapper around an `HStack` with `onClick` containing
a styled `Text` node. Focusable by default — reachable via Tab and
activated with Enter.

## Parameters

### label

`string`

Button text.

### props

[`ButtonProps`](../interfaces/ButtonProps.md)

Click handler and styling.

## Returns

[`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

A clickable container node.

## Examples

```ts
Button("[Send]", { onClick: handleSend, bold: true, fgColor: "cyan" })
```

```ts
// Mouse-only button (not in Tab order)
Button("✕", { onClick: handleClose, focusable: false })
```
