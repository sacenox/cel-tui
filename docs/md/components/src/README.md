[**cel-tui**](../../README.md)

***

[cel-tui](../../modules.md) / components/src

# components/src

## Example

```ts
import { Spacer, Divider, Button, Select } from "@cel-tui/components";

HStack({ height: 1 }, [
  Text("Title", { bold: true }),
  Spacer(),
  Button("[OK]", { onClick: handleOk }),
])
```

## Interfaces

- [ButtonProps](interfaces/ButtonProps.md)
- [DividerProps](interfaces/DividerProps.md)
- [SelectInstance](interfaces/SelectInstance.md)
- [SelectProps](interfaces/SelectProps.md)

## Type Aliases

- [SelectItem](type-aliases/SelectItem.md)

## Functions

- [Button](functions/Button.md)
- [Divider](functions/Divider.md)
- [Select](functions/Select.md)
- [Spacer](functions/Spacer.md)
