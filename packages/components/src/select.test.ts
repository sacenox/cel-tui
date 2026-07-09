import { afterEach, describe, expect, it } from "bun:test";
import {
  MockTerminal,
  type Node,
  Text,
  type TextInputNode,
  VStack,
} from "@cel-tui/core";
import { testCel as cel } from "../../core/src/test-helpers.js";
import type { NormalizedItem } from "./select.js";
import {
  adjustScroll,
  moveDown,
  moveUp,
  normalizeItems,
  prefixFilter,
  Select,
} from "./select.js";

const LEFT = "\x1b[D";
const DOWN = "\x1b[B";
const ENTER = "\x1b[13u";
const ESCAPE = "\x1b[27u";
const BACKSPACE = "\x1b[127u";
const TAB = "\x1b[9u";
const CTRL_Q = "\x1b[113;5u";
const BRACKETED_PASTE_START = "\x1b[200~";
const BRACKETED_PASTE_END = "\x1b[201~";

function bracketedPaste(text: string): string {
  return `${BRACKETED_PASTE_START}${text}${BRACKETED_PASTE_END}`;
}

function item<T>(items: readonly T[], index: number): T {
  const value = items[index];
  expect(value).toBeDefined();
  if (value === undefined) {
    throw new Error(`Missing item at index ${index}`);
  }
  return value;
}

function findTextInput(node: Node): TextInputNode {
  if (node.type === "textinput") return node;
  if (node.type !== "text") {
    for (const child of node.children) {
      try {
        return findTextInput(child);
      } catch {
        // Search the next branch.
      }
    }
  }
  throw new Error("Expected Select to contain a TextInput");
}

function collectText(node: Node): string {
  if (node.type === "text") return node.content;
  if (node.type === "textinput") return node.props.value;
  return node.children.map(collectText).join("");
}

describe("normalizeItems", () => {
  it("normalizes string items", () => {
    const result = normalizeItems(["apple", "banana"]);
    expect(result).toEqual([
      { label: "apple", value: "apple", filterText: "apple" },
      { label: "banana", value: "banana", filterText: "banana" },
    ]);
  });

  it("normalizes object items with filterText", () => {
    const result = normalizeItems([
      { label: "Apple (red)", value: "apple", filterText: "apple" },
    ]);
    expect(result).toEqual([
      { label: "Apple (red)", value: "apple", filterText: "apple" },
    ]);
  });

  it("defaults filterText to label", () => {
    const result = normalizeItems([{ label: "Apple", value: "apple" }]);
    expect(result).toEqual([
      { label: "Apple", value: "apple", filterText: "Apple" },
    ]);
  });
});

describe("prefixFilter", () => {
  const items: NormalizedItem[] = [
    { label: "apple", value: "apple", filterText: "apple" },
    { label: "banana", value: "banana", filterText: "banana" },
    { label: "cherry", value: "cherry", filterText: "cherry" },
    { label: "avocado", value: "avocado", filterText: "avocado" },
  ];

  it("returns all items for empty query", () => {
    expect(prefixFilter(items, "")).toEqual(items);
  });

  it("filters by prefix", () => {
    const result = prefixFilter(items, "a");
    expect(result).toEqual([
      { label: "apple", value: "apple", filterText: "apple" },
      { label: "avocado", value: "avocado", filterText: "avocado" },
    ]);
  });

  it("is case-insensitive", () => {
    const result = prefixFilter(items, "A");
    expect(result.length).toBe(2);
  });

  it("matches word boundaries", () => {
    const paths: NormalizedItem[] = [
      {
        label: "src/components/button.ts",
        value: "button",
        filterText: "src/components/button.ts",
      },
    ];
    const result = prefixFilter(paths, "button");
    expect(result.length).toBe(1);
  });

  it("returns empty for no matches", () => {
    const result = prefixFilter(items, "xyz");
    expect(result).toEqual([]);
  });
});

describe("moveUp", () => {
  it("moves up by one", () => {
    expect(moveUp(2, 5)).toBe(1);
  });

  it("wraps from first to last", () => {
    expect(moveUp(0, 5)).toBe(4);
  });

  it("returns 0 for empty list", () => {
    expect(moveUp(0, 0)).toBe(0);
  });
});

describe("moveDown", () => {
  it("moves down by one", () => {
    expect(moveDown(2, 5)).toBe(3);
  });

  it("wraps from last to first", () => {
    expect(moveDown(4, 5)).toBe(0);
  });

  it("returns 0 for empty list", () => {
    expect(moveDown(0, 0)).toBe(0);
  });
});

describe("adjustScroll", () => {
  it("keeps scroll when highlight is visible", () => {
    expect(adjustScroll(3, 0, 5)).toBe(0);
  });

  it("scrolls up when highlight is above viewport", () => {
    expect(adjustScroll(1, 3, 5)).toBe(1);
  });

  it("scrolls down when highlight is below viewport", () => {
    expect(adjustScroll(7, 0, 5)).toBe(3);
  });
});

describe("Select", () => {
  it("returns a callable render function", () => {
    const select = Select({
      items: ["apple", "banana"],
      onSelect: () => {},
    });
    const node = select();
    expect(node.type).toBe("vstack");
    expect(node.children.length).toBeGreaterThan(0);
  });

  it("renders search line and items", () => {
    const select = Select({
      items: ["apple", "banana", "cherry"],
      onSelect: () => {},
    });
    const node = select();
    // Search line + 3 items = 4 children
    expect(node.children.length).toBe(4);
  });

  it("shows overflow indicator when items exceed maxVisible", () => {
    const items = Array.from({ length: 15 }, (_, i) => `item-${i}`);
    const select = Select({
      items,
      onSelect: () => {},
      maxVisible: 5,
    });
    const node = select();
    // Search line + 5 visible items + overflow indicator = 7
    expect(node.children.length).toBe(7);
    // Last child should contain overflow text
    const lastChild = item(node.children, 6);
    expect(lastChild.type).toBe("hstack");
    if (lastChild.type === "hstack") {
      const text = lastChild.children[0];
      expect(text).toBeDefined();
      if (text?.type === "text") {
        expect(text.content).toContain("10 more");
      }
    }
  });

  it("has reset method that clears state", () => {
    const select = Select({
      items: ["apple", "banana"],
      onSelect: () => {},
    });
    // reset exists and is callable
    expect(typeof select.reset).toBe("function");
    select.reset(); // should not throw
  });

  it("uses a TextInput as its sole focus target", () => {
    const select = Select({
      items: ["apple"],
      onSelect: () => {},
    });
    const node = select();
    expect(node.props.focusable).toBe(false);
    expect(findTextInput(node).props.focusable).toBe(true);
  });

  it("forwards container props", () => {
    const select = Select({
      items: ["apple"],
      onSelect: () => {},
      width: 30,
      fgColor: "color02",
      bgColor: "color00",
      flex: 1,
    });
    const node = select();
    expect(node.props.width).toBe(30);
    expect(node.props.fgColor).toBe("color02");
    expect(node.props.bgColor).toBe("color00");
    expect(node.props.flex).toBe(1);
  });

  it("applies focusStyle to the whole Select while its input is focused", () => {
    const select = Select({
      items: ["apple"],
      focused: true,
      fgColor: "color07",
      focusStyle: {
        fgColor: "color00",
        bgColor: "color06",
        bold: true,
      },
      onSelect: () => {},
    });

    const node = select();
    expect(node.props.fgColor).toBe("color00");
    expect(node.props.bgColor).toBe("color06");
    expect(node.props.bold).toBe(true);
  });

  it("supports initial query and highlight state", () => {
    const select = Select({
      items: ["banana", "bandana", "apple"],
      initialQuery: "ban",
      initialHighlightIndex: 1,
      onSelect: () => {},
    });

    const node = select();
    expect(findTextInput(node).props.value).toBe("ban");
    expect(select.getState()).toMatchObject({
      query: "ban",
      cursor: 3,
      highlightIndex: 1,
    });
  });

  it("clamps a controlled cursor backward to a query grapheme boundary", () => {
    const family = "👨‍👩‍👧‍👦";
    const select = Select({
      items: ["anything"],
      query: `A${family}B`,
      cursor: 2,
      onSelect: () => {},
    });

    const node = select();
    expect(findTextInput(node).props.cursor).toBe(1);
    expect(select.getState().cursor).toBe(1);
  });

  it("updates items and uncontrolled state without recreating the instance", () => {
    const select = Select({ items: ["old"], onSelect: () => {} });

    select.update({
      items: ["new one", "new two"],
      query: "two",
      cursor: 1,
      highlightIndex: 0,
    });

    const node = select();
    expect(collectText(node)).toContain("new two");
    expect(collectText(node)).not.toContain("old");
    expect(select.getState()).toMatchObject({ query: "two", cursor: 1 });

    const overridden = select({ items: ["render model"], query: "" });
    expect(collectText(overridden)).toContain("render model");
  });

  it("accepts custom list filtering and row rendering", () => {
    const calls: string[] = [];
    const select = Select({
      items: ["apple", "cherry"],
      initialQuery: "err",
      onSelect: () => {},
      filter: (items, query) => {
        calls.push(query);
        return items.filter((candidate) => candidate.label.includes(query));
      },
      renderRow: (candidate, context) =>
        Text(
          `${context.highlighted ? "*" : "-"}${candidate.label}:${context.query}`,
        ),
    });

    const node = select();
    expect(calls).toEqual(["err"]);
    expect(collectText(node)).toContain("*cherry:err");
    expect(collectText(node)).not.toContain("apple");
  });
});

describe("Select TextInput integration", () => {
  let terminal: MockTerminal | undefined;

  afterEach(() => {
    cel.stop();
    terminal = undefined;
  });

  function setup(select: ReturnType<typeof Select>): MockTerminal {
    terminal = new MockTerminal(60, 12);
    cel.init(terminal);
    cel.viewport(() => VStack({ width: 60, height: 12 }, [select()]));
    return terminal;
  }

  it("preserves exact text and uses cursor-aware grapheme editing and paste", async () => {
    const family = "👨‍👩‍👧‍👦";
    const pasted = "É 🧑🏽‍💻";
    const changes: string[] = [];
    const select = Select({
      items: ["anything"],
      initialQuery: `A${family}B`,
      focused: true,
      onQueryChange: (query) => changes.push(query),
      onSelect: () => {},
    });
    const term = setup(select);
    await cel._flush();

    // One input chunk exercises TextInput's batched edit accumulator: the
    // Backspace must observe the cursor move that precedes it.
    term.sendInput(`${LEFT}${BACKSPACE}`);
    await cel._flush();
    expect(select.getState().query).toBe("AB");

    term.sendInput(" z");
    await cel._flush();
    expect(select.getState().query).toBe("A zB");

    const changesBeforePaste = changes.length;
    term.sendInput(bracketedPaste(pasted));
    await cel._flush();

    expect(select.getState()).toMatchObject({
      query: `A z${pasted}B`,
      cursor: `A z${pasted}`.length,
    });
    expect(changes).toHaveLength(changesBeforePaste + 1);
  });

  it("keeps controlled query, cursor, and highlight authoritative", async () => {
    let query = "ac";
    let cursor = 1;
    let highlightIndex = 0;
    const queryRequests: string[] = [];
    const cursorRequests: number[] = [];
    const highlightRequests: number[] = [];
    const select = Select({
      items: ["acorn", "active", "actor"],
      query,
      cursor,
      highlightIndex,
      focused: true,
      onQueryChange: (next) => queryRequests.push(next),
      onCursorChange: (next) => cursorRequests.push(next),
      onHighlightChange: (next) => highlightRequests.push(next),
      onSelect: () => {},
    });

    terminal = new MockTerminal(60, 12);
    cel.init(terminal);
    cel.viewport(() =>
      VStack({ width: 60, height: 12 }, [
        select({ query, cursor, highlightIndex }),
      ]),
    );
    await cel._flush();

    terminal.sendInput("Z");
    await cel._flush();
    expect(queryRequests).toEqual(["aZc"]);
    expect(cursorRequests).toEqual([2]);
    expect(select.getState()).toMatchObject({ query: "ac", cursor: 1 });

    query = "";
    cursor = 0;
    cel.render();
    await cel._flush();
    terminal.sendInput(DOWN);
    await cel._flush();
    expect(highlightRequests.at(-1)).toBe(1);
    expect(select.getState().highlightIndex).toBe(0);

    highlightIndex = 1;
    cel.render();
    await cel._flush();
    expect(select.getState().highlightIndex).toBe(1);
  });

  it("selects with Enter without inserting a newline", async () => {
    const selected: string[] = [];
    const select = Select({
      items: ["apple", "banana"],
      initialQuery: "ban",
      focused: true,
      onSelect: (value) => selected.push(value),
    });
    const term = setup(select);
    await cel._flush();

    term.sendInput(ENTER);
    await cel._flush();

    expect(selected).toEqual(["banana"]);
    expect(select.getState().query).toBe("ban");
  });

  it("uses the latest query and highlight throughout one mixed input chunk", async () => {
    const selected: string[] = [];
    const highlightRequests: number[] = [];
    const select = Select({
      items: ["banana", "apple", "apricot"],
      focused: true,
      onHighlightChange: (index) => highlightRequests.push(index),
      onSelect: (value) => selected.push(value),
    });
    const term = setup(select);
    await cel._flush();

    // Filter, move within the newly filtered list, and select before any
    // render can rebuild the handler closures.
    term.sendInput(`a${DOWN}${ENTER}`);
    await cel._flush();

    expect(highlightRequests).toEqual([1]);
    expect(selected).toEqual(["apricot"]);
    expect(select.getState()).toMatchObject({
      query: "a",
      highlightIndex: 1,
    });
  });

  it("routes Escape to onCancel and keeps the input mounted and focused", async () => {
    const cancellations: string[] = [];
    const blurReasons: string[] = [];
    const select = Select({
      items: ["apple"],
      initialQuery: "app",
      autoFocus: true,
      onCancel: (state) => cancellations.push(state.query),
      onBlur: ({ reason }) => blurReasons.push(reason),
      onSelect: () => {},
    });
    const term = setup(select);
    await cel._flush();

    term.sendInput(ESCAPE);
    await cel._flush();

    expect(cancellations).toEqual(["app"]);
    expect(blurReasons).toEqual([]);
  });

  it("retains the framework Escape blur fallback without onCancel", async () => {
    const blurReasons: string[] = [];
    const select = Select({
      items: ["apple"],
      autoFocus: true,
      onBlur: ({ reason }) => blurReasons.push(reason),
      onSelect: () => {},
    });
    const term = setup(select);
    await cel._flush();

    term.sendInput(ESCAPE);
    await cel._flush();

    expect(blurReasons).toEqual(["escape"]);
  });

  it("lets non-editing shortcuts bubble through the Select", async () => {
    const keys: string[] = [];
    const select = Select({
      items: ["apple"],
      focused: true,
      onKeyPress: (key) => {
        keys.push(key);
      },
      onSelect: () => {},
    });
    const term = setup(select);
    await cel._flush();

    term.sendInput(CTRL_Q);
    await cel._flush();

    expect(keys).toEqual(["ctrl+q"]);
  });

  it("continues bubbling when its onKeyPress returns false", async () => {
    const keys: string[] = [];
    const select = Select({
      items: ["apple"],
      focused: true,
      onKeyPress: (key) => {
        keys.push(`select:${key}`);
        return false;
      },
      onSelect: () => {},
    });

    terminal = new MockTerminal(60, 12);
    cel.init(terminal);
    cel.viewport(() =>
      VStack(
        {
          width: 60,
          height: 12,
          onKeyPress: (key) => {
            keys.push(`root:${key}`);
          },
        },
        [select()],
      ),
    );
    await cel._flush();

    terminal.sendInput(CTRL_Q);
    await cel._flush();

    expect(keys).toEqual(["select:ctrl+q", "root:ctrl+q"]);
  });

  it("honors focusable: false for keyboard traversal and clicks", async () => {
    const focusReasons: string[] = [];
    const select = Select({
      items: ["apple"],
      focusable: false,
      onFocus: ({ reason }) => focusReasons.push(reason),
      onSelect: () => {},
    });
    const term = setup(select);
    await cel._flush();

    term.sendInput(TAB);
    await cel._flush();
    term.sendInput("x");
    await cel._flush();

    // Search input begins after "search: "; this is a mouse-button release
    // inside it. A non-focusable TextInput must not become focused by click.
    term.sendInput("\x1b[<0;10;1m");
    await cel._flush();
    term.sendInput("y");
    await cel._flush();

    expect(focusReasons).toEqual([]);
    expect(select.getState().query).toBe("");
  });
});
