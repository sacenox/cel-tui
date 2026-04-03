[**cel-tui**](../../README.md)

---

[cel-tui](../../modules.md) / components/src

# components/src

## Example

```ts
import { Spacer, Divider, Button } from "@cel-tui/components";

HStack({ height: 1 }, [
  Text("Title", { bold: true }),
  Spacer(),
  Button("[OK]", { onClick: handleOk }),
]);
```

## Interfaces

- [ButtonProps](interfaces/ButtonProps.md)
- [DividerProps](interfaces/DividerProps.md)

## Functions

- [Button](functions/Button.md)
- [Divider](functions/Divider.md)
- [Spacer](functions/Spacer.md)
