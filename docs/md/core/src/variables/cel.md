[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [core/src](../README.md) / cel

# Variable: cel

> `const` **cel**: `object`

Defined in: [core/src/cel.ts:863](https://github.com/sacenox/cel-tui/blob/7a13002be0f32f691a11f759a0697d7adbbfd9b6/packages/core/src/cel.ts#L863)

cel-tui framework entrypoint.

The framework is stateless — it renders whatever tree the render function
returns. State management is fully external. Use any approach you like
(plain variables, classes, libraries) and call [cel.render](#render) when
state changes.

## Type Declaration

### init()

> **init**(`term`, `options?`): `void`

Initialize the framework with a terminal implementation.
Must be called before [cel.viewport](#viewport).

Enables the Kitty keyboard protocol (level 1) via the terminal,
enters raw mode, and starts mouse tracking.

#### Parameters

##### term

[`Terminal`](../interfaces/Terminal.md)

Terminal to render to (ProcessTerminal or MockTerminal).

##### options?

Optional configuration.

###### theme?

[`Theme`](../../../types/src/type-aliases/Theme.md)

Color theme mapping. Defaults to the ANSI 16 theme.

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

Pops the Kitty keyboard protocol mode, disables mouse tracking,
and restores the terminal to its previous state.

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
import { cel, VStack, Text, ProcessTerminal } from "@cel-tui/core";

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack({ height: "100%" }, [
    Text("Hello, world!", { bold: true }),
  ])
);
```
