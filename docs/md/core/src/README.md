[**cel-tui**](../../README.md)

***

[cel-tui](../../modules.md) / core/src

# core/src

## Example

```ts
import { cel, VStack, HStack, Text, TextInput, ProcessTerminal } from "@cel-tui/core";

let name = "";

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack({ height: "100%" }, [
    Text("What is your name?", { bold: true }),
    TextInput({
      value: name,
      onChange: (v) => { name = v; cel.render(); },
    }),
  ])
);
```

## Classes

- [CellBuffer](classes/CellBuffer.md)
- [MockTerminal](classes/MockTerminal.md)
- [ProcessTerminal](classes/ProcessTerminal.md)

## Interfaces

- [Cell](interfaces/Cell.md)
- [Terminal](interfaces/Terminal.md)

## Variables

- [cel](variables/cel.md)
- [defaultTheme](variables/defaultTheme.md)
- [EMPTY\_CELL](variables/EMPTY_CELL.md)

## Functions

- [emitBuffer](functions/emitBuffer.md)
- [extractAnsiCode](functions/extractAnsiCode.md)
- [HStack](functions/HStack.md)
- [measureContentHeight](functions/measureContentHeight.md)
- [Text](functions/Text.md)
- [TextInput](functions/TextInput.md)
- [visibleWidth](functions/visibleWidth.md)
- [VStack](functions/VStack.md)

## References

### Color

Re-exports [Color](../../types/src/type-aliases/Color.md)

***

### ContainerNode

Re-exports [ContainerNode](../../types/src/interfaces/ContainerNode.md)

***

### ContainerProps

Re-exports [ContainerProps](../../types/src/interfaces/ContainerProps.md)

***

### Node

Re-exports [Node](../../types/src/type-aliases/Node.md)

***

### SizeValue

Re-exports [SizeValue](../../types/src/type-aliases/SizeValue.md)

***

### StyleProps

Re-exports [StyleProps](../../types/src/interfaces/StyleProps.md)

***

### TextInputNode

Re-exports [TextInputNode](../../types/src/interfaces/TextInputNode.md)

***

### TextInputProps

Re-exports [TextInputProps](../../types/src/interfaces/TextInputProps.md)

***

### TextNode

Re-exports [TextNode](../../types/src/interfaces/TextNode.md)

***

### TextProps

Re-exports [TextProps](../../types/src/interfaces/TextProps.md)

***

### Theme

Re-exports [Theme](../../types/src/type-aliases/Theme.md)

***

### ThemeValue

Re-exports [ThemeValue](../../types/src/type-aliases/ThemeValue.md)
