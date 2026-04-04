import { describe, it, expect } from "bun:test";
import {
  normalizeItems,
  prefixFilter,
  moveUp,
  moveDown,
  adjustScroll,
  Select,
} from "./select.js";
import type { NormalizedItem } from "./select.js";

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
    const lastChild = node.children[6]!;
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

  it("sets focusable true by default", () => {
    const select = Select({
      items: ["apple"],
      onSelect: () => {},
    });
    const node = select();
    expect(node.props.focusable).toBe(true);
  });

  it("forwards container props", () => {
    const select = Select({
      items: ["apple"],
      onSelect: () => {},
      width: 30,
      fgColor: "green",
      bgColor: "black",
      flex: 1,
    });
    const node = select();
    expect(node.props.width).toBe(30);
    expect(node.props.fgColor).toBe("green");
    expect(node.props.bgColor).toBe("black");
    expect(node.props.flex).toBe(1);
  });
});
