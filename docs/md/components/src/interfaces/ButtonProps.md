[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [components/src](../README.md) / ButtonProps

# Interface: ButtonProps

Defined in: [components/src/button.ts:5](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/components/src/button.ts#L5)

Props for the [Button](../functions/Button.md) component.

## Properties

### bgColor?

> `optional` **bgColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

Defined in: [components/src/button.ts:13](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/components/src/button.ts#L13)

Label background color.

---

### bold?

> `optional` **bold?**: `boolean`

Defined in: [components/src/button.ts:9](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/components/src/button.ts#L9)

Render the label in bold.

---

### fgColor?

> `optional` **fgColor?**: [`Color`](../../../types/src/type-aliases/Color.md)

Defined in: [components/src/button.ts:11](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/components/src/button.ts#L11)

Label text color.

---

### focusable?

> `optional` **focusable?**: `boolean`

Defined in: [components/src/button.ts:18](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/components/src/button.ts#L18)

Whether the button participates in focus traversal.

#### Default

```ts
true;
```

---

### onClick

> **onClick**: () => `void`

Defined in: [components/src/button.ts:7](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/components/src/button.ts#L7)

Called on mouse click or Enter when focused.

#### Returns

`void`
