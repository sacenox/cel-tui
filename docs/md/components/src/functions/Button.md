[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / Button

# Function: Button()

> **Button**(`label`, `props`): [`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

Defined in: [components/src/button.ts:76](https://github.com/sacenox/cel-tui/blob/a5941362efd130e2b0ae863d7be6a9f5fe664b2a/packages/components/src/button.ts#L76)

Clickable button with a styled text label.

A convenience wrapper around an `HStack` with `onClick` containing
a styled `Text` node. Focusable by default — reachable via Tab and
activated with Enter.

Style props are set on the container, not the text — this means
`bgColor` fills the button rect and `focusStyle` can override
any style when focused.

## Parameters

### label

`string`

Button text.

### props

[`ButtonProps`](../interfaces/ButtonProps.md)

Click handler, styling, and focus configuration.

## Returns

[`ContainerNode`](../../../types/src/interfaces/ContainerNode.md)

A clickable container node.

## Examples

```ts
// Basic styled button
Button("[Send]", { onClick: handleSend, bold: true, fgColor: "cyan" })
```

```ts
// Button with focus style (keyboard navigation)
Button("[OK]", {
  onClick: handleOk,
  bgColor: "brightBlack",
  focusStyle: { bgColor: "green", fgColor: "black" },
})
```

```ts
// Mouse-only button (not in Tab order)
Button("✕", { onClick: handleClose, focusable: false })
```
