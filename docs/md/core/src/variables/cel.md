[**cel-tui**](../../../README.md)

---

[cel-tui](../../../modules.md) / [core/src](../README.md) / cel

# Variable: cel

> `const` **cel**: `object`

Defined in: [core/src/cel.ts:266](https://github.com/sacenox/cel-tui/blob/012c589c1da7c914300d2b6f5a482b5357e2ddb4/packages/core/src/cel.ts#L266)

cel-tui framework entrypoint.

The framework is stateless — it renders whatever tree the render function
returns. State management is fully external. Use any approach you like
(plain variables, classes, libraries) and call [cel.render](#render) when
state changes.

## Type Declaration

### init()

> **init**(`term`): `void`

Initialize the framework with a terminal implementation.
Must be called before [cel.viewport](#viewport).

#### Parameters

##### term

[`Terminal`](../interfaces/Terminal.md)

Terminal to render to (ProcessTerminal or MockTerminal).

#### Returns

`void`

### render()

> **render**(): `void`

Request a re-render. Call this after state changes.

Batched via `process.nextTick()` — multiple calls within the same
tick produce a single render.

#### Returns

`void`

### stop()

> **stop**(): `void`

Stop the framework and restore terminal state.

#### Returns

`void`

### viewport()

> **viewport**(`fn`): `void`

Set the render function that returns the UI tree.
Triggers the first render automatically.

#### Parameters

##### fn

`RenderFn`

A function that returns the current UI tree.

#### Returns

`void`

## Example

```ts
import { cel, VStack, Text } from "@cel-tui/core";
import { ProcessTerminal } from "@cel-tui/core/terminal";

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack({ height: "100%" }, [Text("Hello, world!", { bold: true })]),
);
```
