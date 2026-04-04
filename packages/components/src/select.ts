import type {
  Color,
  ContainerNode,
  Node,
  SizeValue,
  StyleProps,
} from "@cel-tui/types";
import { cel, VStack, HStack, Text } from "@cel-tui/core";

/**
 * An item in the select list.
 *
 * Strings are used as both label and value. Objects allow separate
 * display text, return value, and filter text.
 *
 * @example
 * // Simple string item
 * "apple"
 *
 * // Rich item with ANSI-colored label
 * { label: "claude-sonnet-4  (free)", value: "anthropic/claude-sonnet-4", filterText: "claude-sonnet-4" }
 */
export type SelectItem =
  | string
  | {
      /** Displayed text (can include ANSI styling). */
      label: string;
      /** Value returned on selection. */
      value: string;
      /** Text matched against the search query. Defaults to `label`. */
      filterText?: string;
    };

/** Configuration for the {@link Select} component. */
export interface SelectProps {
  /** Items to choose from. */
  items: SelectItem[];
  /**
   * Called when the user selects an item (Enter or click).
   * @param value - The selected item's value.
   */
  onSelect: (value: string) => void;
  /**
   * Placeholder text shown when the search query is empty.
   * @default "type to filter..."
   */
  placeholder?: string;
  /**
   * Maximum number of items visible at once.
   * When the filtered list exceeds this, a "N more" indicator is shown.
   * @default 10
   */
  maxVisible?: number;
  /**
   * Character used for the highlight indicator.
   * @default "›"
   */
  indicator?: string;
  /**
   * Color of the highlighted item and its indicator.
   * @default "cyan"
   */
  highlightColor?: Color;
  /**
   * Called for key events not consumed by the Select
   * (e.g., modifier combos like `"ctrl+s"`).
   * Use this to handle application-level shortcuts when the Select is focused.
   *
   * @param key - The unhandled key string.
   */
  onKeyPress?: (key: string) => void;
  /** Fixed width in cells or percentage. */
  width?: SizeValue;
  /** Fixed height in cells or percentage. */
  height?: SizeValue;
  /** Flex grow factor. */
  flex?: number;
  /** Foreground text color. */
  fgColor?: Color;
  /** Background color (fills the container rect). */
  bgColor?: Color;
  /**
   * Whether the select is currently focused (controlled mode).
   * When omitted, focus is uncontrolled (framework-managed).
   */
  focused?: boolean;
  /**
   * Whether the select participates in focus traversal.
   * @default true
   */
  focusable?: boolean;
  /** Called when the select receives focus. */
  onFocus?: () => void;
  /** Called when the select loses focus. */
  onBlur?: () => void;
  /** Style overrides applied when focused. */
  focusStyle?: StyleProps;
}

/**
 * A Select component instance returned by {@link Select}.
 *
 * Call it to get the current Node tree for rendering.
 * Use `.reset()` to clear the search query and highlight.
 */
export interface SelectInstance {
  /** Returns the current Select node tree. Call inside `cel.viewport()`. */
  (): ContainerNode;
  /** Reset the search query, highlight position, and scroll offset. */
  reset(): void;
}

/** Normalized form of a SelectItem with all fields resolved. */
export interface NormalizedItem {
  label: string;
  value: string;
  filterText: string;
}

/**
 * Normalize SelectItem inputs into a consistent shape.
 * Strings become `{ label: s, value: s, filterText: s }`.
 */
export function normalizeItems(items: SelectItem[]): NormalizedItem[] {
  return items.map((item) => {
    if (typeof item === "string") {
      return { label: item, value: item, filterText: item };
    }
    return {
      label: item.label,
      value: item.value,
      filterText: item.filterText ?? item.label,
    };
  });
}

/**
 * Filter items by prefix match against filterText.
 * Matches the start of the full text or any whitespace/slash-separated word.
 */
export function prefixFilter(
  items: NormalizedItem[],
  query: string,
): NormalizedItem[] {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((item) => {
    const text = item.filterText.toLowerCase();
    if (text.startsWith(q)) return true;
    const words = text.split(/[\s/]+/);
    return words.some((word) => word.startsWith(q));
  });
}

/** Move highlight up with wrapping. */
export function moveUp(highlight: number, total: number): number {
  if (total === 0) return 0;
  return highlight <= 0 ? total - 1 : highlight - 1;
}

/** Move highlight down with wrapping. */
export function moveDown(highlight: number, total: number): number {
  if (total === 0) return 0;
  return highlight >= total - 1 ? 0 : highlight + 1;
}

/** Adjust scroll offset to keep the highlighted item visible. */
export function adjustScroll(
  highlight: number,
  scrollOffset: number,
  maxVisible: number,
): number {
  if (highlight < scrollOffset) return highlight;
  if (highlight >= scrollOffset + maxVisible) return highlight - maxVisible + 1;
  return scrollOffset;
}

/**
 * Creates a filterable select list component.
 *
 * Returns a {@link SelectInstance} — call it inside `cel.viewport()` to
 * produce the current Node tree. Internal state (search query, highlight
 * position, scroll offset) is managed automatically. Keyboard navigation
 * works when the component is focused (Tab into it or click an item).
 *
 * **Keyboard:**
 * | Key         | Action                              |
 * |-------------|-------------------------------------|
 * | Type        | Filter items by prefix              |
 * | `↑` / `↓`  | Move highlight (wraps around)       |
 * | `Enter`     | Select highlighted item             |
 * | `Escape`    | Unfocus (framework default)         |
 * | `Home`/`End`| Jump to first/last                  |
 * | `Backspace` | Delete last filter character         |
 *
 * @param props - Select configuration and items.
 * @returns A callable instance that produces the Select node tree.
 *
 * @example
 * ```ts
 * import { cel, VStack, Text, ProcessTerminal } from "@cel-tui/core";
 * import { Select } from "@cel-tui/components";
 *
 * let selected = "";
 *
 * const fruitSelect = Select({
 *   items: ["apple", "banana", "cherry", "date", "elderberry"],
 *   onSelect: (value) => {
 *     selected = value;
 *     cel.render();
 *   },
 * });
 *
 * cel.init(new ProcessTerminal());
 * cel.viewport(() =>
 *   VStack({ height: "100%" }, [
 *     Text(`Selected: ${selected}`),
 *     fruitSelect(),
 *   ]),
 * );
 * ```
 */
export function Select(props: SelectProps): SelectInstance {
  const {
    items: rawItems,
    onSelect,
    placeholder = "type to filter...",
    maxVisible = 10,
    indicator = "›",
    highlightColor = "cyan",
    onKeyPress: userKeyPress,
    width,
    height,
    flex,
    fgColor,
    bgColor,
    focused,
    focusable,
    onFocus,
    onBlur,
    focusStyle,
  } = props;

  let query = "";
  let highlightIndex = 0;
  let scrollOffset = 0;

  function getFiltered(): NormalizedItem[] {
    return prefixFilter(normalizeItems(rawItems), query);
  }

  function handleKey(key: string): void {
    switch (key) {
      case "enter": {
        const filtered = getFiltered();
        const selected = filtered[highlightIndex];
        if (selected) onSelect(selected.value);
        return;
      }

      case "backspace":
        if (query.length > 0) {
          query = query.slice(0, -1);
          highlightIndex = 0;
          scrollOffset = 0;
          cel.render();
        }
        return;

      case "up": {
        const filtered = getFiltered();
        highlightIndex = moveUp(highlightIndex, filtered.length);
        scrollOffset = adjustScroll(highlightIndex, scrollOffset, maxVisible);
        cel.render();
        return;
      }

      case "down": {
        const filtered = getFiltered();
        highlightIndex = moveDown(highlightIndex, filtered.length);
        scrollOffset = adjustScroll(highlightIndex, scrollOffset, maxVisible);
        cel.render();
        return;
      }

      case "home":
        highlightIndex = 0;
        scrollOffset = 0;
        cel.render();
        return;

      case "end": {
        const filtered = getFiltered();
        highlightIndex = Math.max(0, filtered.length - 1);
        scrollOffset = adjustScroll(highlightIndex, scrollOffset, maxVisible);
        cel.render();
        return;
      }

      default:
        // Single printable character — append to query
        if (key.length === 1 && key >= " ") {
          query += key;
          highlightIndex = 0;
          scrollOffset = 0;
          cel.render();
        } else {
          // Forward unrecognized keys to user callback
          userKeyPress?.(key);
        }
        return;
    }
  }

  function render(): ContainerNode {
    const allItems = normalizeItems(rawItems);
    const filtered = prefixFilter(allItems, query);
    const visible = filtered.slice(scrollOffset, scrollOffset + maxVisible);
    const overflow = filtered.length - scrollOffset - visible.length;

    const children: Node[] = [];

    // Search line
    const searchContent = query
      ? Text(query)
      : Text(placeholder, { fgColor: "brightBlack" });
    children.push(
      HStack({}, [Text("search: ", { fgColor: "brightBlack" }), searchContent]),
    );

    // Items
    if (filtered.length === 0) {
      children.push(
        HStack({}, [Text("  no matches", { fgColor: "brightBlack" })]),
      );
    } else {
      for (let i = 0; i < visible.length; i++) {
        const item = visible[i]!;
        const globalIndex = scrollOffset + i;
        const isHighlighted = globalIndex === highlightIndex;

        if (isHighlighted) {
          children.push(
            HStack(
              {
                onClick: () => onSelect(item.value),
                focusable: false,
              },
              [
                Text(`${indicator} `, { fgColor: highlightColor }),
                Text(item.label, { fgColor: highlightColor }),
              ],
            ),
          );
        } else {
          children.push(
            HStack(
              {
                onClick: () => onSelect(item.value),
                focusable: false,
              },
              [Text("  "), Text(item.label)],
            ),
          );
        }
      }
    }

    // Overflow indicator
    if (overflow > 0) {
      children.push(
        HStack({}, [Text(`  ${overflow} more`, { fgColor: "brightBlack" })]),
      );
    }

    return VStack(
      {
        onKeyPress: handleKey,
        focusable: focusable ?? true,
        focused,
        onFocus,
        onBlur,
        focusStyle,
        width,
        height,
        flex,
        fgColor,
        bgColor,
      },
      children,
    );
  }

  render.reset = () => {
    query = "";
    highlightIndex = 0;
    scrollOffset = 0;
  };

  return render as SelectInstance;
}
