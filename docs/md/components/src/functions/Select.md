[**cel-tui**](../../../README.md)

***

[cel-tui](../../../modules.md) / [components/src](../README.md) / Select

# Function: Select()

> **Select**(`props`): [`SelectInstance`](../interfaces/SelectInstance.md)

Defined in: [components/src/select.ts:222](https://github.com/sacenox/cel-tui/blob/2d099e69ab5d50da49ab24db1b048765e3824208/packages/components/src/select.ts#L222)

Creates a filterable select list component.

Returns a [SelectInstance](../interfaces/SelectInstance.md) — call it inside `cel.viewport()` to
produce the current Node tree. Internal state (search query, highlight
position, scroll offset) is managed automatically. Keyboard navigation
works when the component is focused (Tab into it or click an item).

**Keyboard:**
| Key         | Action                              |
|-------------|-------------------------------------|
| Type        | Filter items by prefix              |
| `↑` / `↓`  | Move highlight (wraps around)       |
| `Enter`     | Select highlighted item             |
| `Escape`    | Unfocus (framework default)         |
| `Home`/`End`| Jump to first/last                  |
| `Backspace` | Delete last filter character         |

## Parameters

### props

[`SelectProps`](../interfaces/SelectProps.md)

Select configuration and items.

## Returns

[`SelectInstance`](../interfaces/SelectInstance.md)

A callable instance that produces the Select node tree.

## Example

```ts
import { cel, VStack, Text, ProcessTerminal } from "@cel-tui/core";
import { Select } from "@cel-tui/components";

let selected = "";

const fruitSelect = Select({
  items: ["apple", "banana", "cherry", "date", "elderberry"],
  onSelect: (value) => {
    selected = value;
    cel.render();
  },
});

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack({ height: "100%" }, [
    Text(`Selected: ${selected}`),
    fruitSelect(),
  ]),
);
```
