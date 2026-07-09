import { describe, expect, test } from "bun:test";
import { Text, VStack } from "@cel-tui/core";
import type { ContainerNode } from "@cel-tui/types";
import { layout } from "../../core/src/layout.js";
import { getMaxScrollOffset } from "../../core/src/scroll.js";
import { VirtualList as PublicVirtualList } from "./index.js";
import {
  calculateVirtualWindow,
  VirtualList,
  type VirtualListScrollReason,
} from "./virtual-list.js";

interface Row {
  id: string;
  height: number;
  label?: string;
}

function fixedRows(count: number, height = 1, prefix = "row"): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    height,
  }));
}

function renderedRows(node: ContainerNode): number {
  const block = node.children.find(
    (child) => child.type === "vstack" && child.children.length > 0,
  );
  return block?.type === "vstack" ? block.children.length : 0;
}

function createFixedList(
  options: {
    overscan?: number;
    maxCachedItems?: number;
    maxRenderedItems?: number;
    defaultScrollOffset?: number;
    defaultStickToBottom?: boolean;
  } = {},
) {
  return VirtualList<Row>({
    itemKey: (row) => row.id,
    renderItem: (row) => VStack({ height: row.height }, []),
    estimatedItemHeight: 1,
    ...options,
  });
}

describe("calculateVirtualWindow", () => {
  test("keeps the visible window even when overscan exceeds the hard cap", () => {
    const starts = Array.from({ length: 1_000 }, (_, index) => index);
    const ends = starts.map((start) => start + 1);
    const range = calculateVirtualWindow({ starts, ends }, 500, 10, 10_000, 20);

    expect(range.end - range.start).toBe(20);
    expect(range.start).toBeLessThanOrEqual(500);
    expect(range.end).toBeGreaterThanOrEqual(510);
  });
});

describe("VirtualList", () => {
  test("is available from the public components barrel", () => {
    expect(PublicVirtualList).toBe(VirtualList);
  });

  test("measures variable-height rows and replaces estimates incrementally", () => {
    const rows: Row[] = [
      { id: "a", height: 1 },
      { id: "b", height: 3 },
      { id: "c", height: 2 },
      { id: "d", height: 4 },
    ];
    const list = createFixedList({ overscan: 8 });

    const node = list({ items: rows, width: 20, height: 3 });
    const state = list.getState();

    expect(state.totalHeight).toBe(10);
    expect(state.measuredItems).toBe(4);
    expect(state.cachedItems).toBe(4);
    expect(renderedRows(node)).toBe(4);
    expect(state.visibleStart).toBe(0);
  });

  test("includes configured cell gaps in prefix and scroll extents", () => {
    const list = VirtualList<Row>({
      itemKey: (row) => row.id,
      renderItem: (row) => VStack({ height: row.height }, []),
      estimatedItemHeight: 1,
      gap: 2,
      overscan: 20,
    });

    const node = list({
      items: [
        { id: "a", height: 1 },
        { id: "b", height: 2 },
        { id: "c", height: 3 },
      ],
      width: 20,
      height: 4,
    });

    expect(list.getState()).toMatchObject({
      totalHeight: 10,
      maxScrollOffset: 6,
    });
    expect(getMaxScrollOffset(layout(node, 20, 4))).toBe(6);
  });

  test("keeps rendered allocation bounded independently of collection length", () => {
    const rows = fixedRows(10_000);
    let renderCalls = 0;
    const list = VirtualList<Row>({
      itemKey: (row) => row.id,
      renderItem: (row) => {
        renderCalls++;
        return Text(row.id);
      },
      estimatedItemHeight: 1,
      overscan: 4,
      maxRenderedItems: 32,
    });

    const node = list({ items: rows, width: 80, height: 12 });

    expect(list.getState().renderedItems).toBeLessThanOrEqual(32);
    expect(renderedRows(node)).toBeLessThanOrEqual(32);
    expect(renderCalls).toBeLessThanOrEqual(32 * 3);
    expect(list.getState().totalHeight).toBe(10_000);
  });

  test("supports controlled scrolling without mutating the supplied offset", () => {
    const rows = fixedRows(100);
    const events: Array<[number, number, VirtualListScrollReason]> = [];
    const list = createFixedList({ overscan: 0 });
    const onScroll = (
      offset: number,
      maxOffset: number,
      reason: VirtualListScrollReason,
    ) => {
      events.push([offset, maxOffset, reason]);
    };

    const first = list({
      items: rows,
      width: 20,
      height: 10,
      scrollOffset: 0,
      onScroll,
    });
    first.props.onScroll?.(20, 90);

    expect(events).toEqual([[20, 90, "input"]]);
    expect(list.getState().scrollOffset).toBe(0);

    list({
      items: rows,
      width: 20,
      height: 10,
      scrollOffset: 20,
      onScroll,
    });
    expect(list.getState().scrollOffset).toBe(20);
    expect(list.getState().anchorKey).toBe("row-20");
  });

  test("manages omitted scrollOffset internally", () => {
    const rows = fixedRows(100);
    const list = createFixedList({ overscan: 0 });
    const first = list({ items: rows, width: 20, height: 10 });

    first.props.onScroll?.(25, 90);
    list({ items: rows, width: 20, height: 10 });

    expect(list.getState().scrollOffset).toBe(25);
    expect(list.getState().anchorKey).toBe("row-25");
  });

  test("sticks to appended content until wheel input leaves the bottom", () => {
    let rows = fixedRows(20);
    const stickyChanges: boolean[] = [];
    const list = createFixedList({
      overscan: 0,
      defaultStickToBottom: true,
    });

    let node = list({
      items: rows,
      width: 20,
      height: 5,
      onStickToBottomChange: (stuck) => stickyChanges.push(stuck),
    });
    expect(list.getState()).toMatchObject({
      scrollOffset: 15,
      stickToBottom: true,
      anchorKey: "row-15",
    });

    rows = [...rows, ...fixedRows(5, 1, "new")];
    node = list({
      items: rows,
      width: 20,
      height: 5,
      onStickToBottomChange: (stuck) => stickyChanges.push(stuck),
    });
    expect(list.getState().scrollOffset).toBe(20);

    node.props.onScroll?.(16, 20);
    list({ items: rows, width: 20, height: 5 });
    expect(list.getState()).toMatchObject({
      scrollOffset: 16,
      stickToBottom: false,
    });
    expect(stickyChanges).toEqual([false]);

    rows = [...rows, ...fixedRows(5, 1, "later")];
    list({ items: rows, width: 20, height: 5 });
    expect(list.getState().anchorKey).toBe("row-16");
    expect(list.getState().scrollOffset).toBe(16);
  });

  test("preserves the core Infinity means scroll-to-end convention", () => {
    let rows = fixedRows(20);
    const list = createFixedList({ overscan: 0 });

    list({
      items: rows,
      width: 20,
      height: 5,
      scrollOffset: Infinity,
    });
    expect(list.getState()).toMatchObject({
      scrollOffset: 15,
      stickToBottom: true,
    });

    rows = [...rows, ...fixedRows(5, 1, "new")];
    list({
      items: rows,
      width: 20,
      height: 5,
      scrollOffset: Infinity,
    });
    expect(list.getState()).toMatchObject({
      scrollOffset: 20,
      anchorKey: "new-0",
    });
  });

  test("preserves a keyed viewport anchor across prepend and removal", () => {
    let rows = fixedRows(50);
    const list = createFixedList({
      overscan: 8,
      defaultScrollOffset: 20,
    });

    list({ items: rows, width: 20, height: 5 });
    expect(list.getState().anchorKey).toBe("row-20");

    const prepended = fixedRows(5, 2, "old");
    rows = [...prepended, ...rows];
    list({ items: rows, width: 20, height: 5 });
    expect(list.getState()).toMatchObject({
      anchorKey: "row-20",
      scrollOffset: 30,
    });

    rows = rows.slice(3);
    list({ items: rows, width: 20, height: 5 });
    expect(list.getState()).toMatchObject({
      anchorKey: "row-20",
      scrollOffset: 24,
    });
  });

  test("compensates when a measured row above the anchor changes height", () => {
    let rows = fixedRows(8);
    const list = createFixedList({
      overscan: 0,
      defaultScrollOffset: 3,
    });

    list({ items: rows, width: 20, height: 2 });
    expect(list.getState()).toMatchObject({
      anchorKey: "row-3",
      scrollOffset: 3,
    });

    rows = rows.map((row, index) =>
      index === 0 ? { ...row, height: 4 } : row,
    );
    list({ items: rows, width: 20, height: 2 });

    expect(list.getState()).toMatchObject({
      anchorKey: "row-3",
      scrollOffset: 6,
      totalHeight: 11,
    });
  });

  test("invalidates measured heights and reflows at a new width", () => {
    const rows = [
      { id: "a", text: "abcdefghij" },
      { id: "b", text: "abcdefghij" },
      { id: "c", text: "abcdefghij" },
    ];
    let renderCalls = 0;
    const list = VirtualList<(typeof rows)[number]>({
      itemKey: (row) => row.id,
      renderItem: (row) => {
        renderCalls++;
        return Text(row.text, { wrap: "word" });
      },
      estimatedItemHeight: 1,
      overscan: 20,
      defaultScrollOffset: 1,
    });

    list({ items: rows, width: 10, height: 2 });
    expect(list.getState().totalHeight).toBe(3);
    const callsAtWideWidth = renderCalls;

    list({ items: rows, width: 5, height: 2 });
    expect(renderCalls).toBeGreaterThan(callsAtWideWidth);
    expect(list.getState()).toMatchObject({
      anchorKey: "b",
      scrollOffset: 2,
      totalHeight: 6,
      cachedItems: 3,
    });
  });

  test("applies and reports controlled anchor compensation", () => {
    let rows = fixedRows(20);
    const events: Array<[number, VirtualListScrollReason]> = [];
    const list = createFixedList({ overscan: 8 });
    const onScroll = (
      offset: number,
      _maxOffset: number,
      reason: VirtualListScrollReason,
    ) => {
      events.push([offset, reason]);
    };

    list({
      items: rows,
      width: 20,
      height: 5,
      scrollOffset: 10,
      onScroll,
    });
    rows = [{ id: "old", height: 3 }, ...rows];
    const anchored = list({
      items: rows,
      width: 20,
      height: 5,
      scrollOffset: 10,
      onScroll,
    });

    expect(anchored.props.scrollOffset).toBe(13);
    expect(list.getState().anchorKey).toBe("row-10");
    expect(events).toContainEqual([13, "anchor"]);

    list({
      items: rows,
      width: 20,
      height: 5,
      scrollOffset: 10,
      onScroll: (offset, _maxOffset, reason) => {
        events.push([offset, reason]);
      },
    });
    expect(events).toEqual([[13, "anchor"]]);
  });

  test("bounds and eagerly releases its measurement cache", () => {
    const rows = fixedRows(100);
    const list = createFixedList({
      overscan: 0,
      maxCachedItems: 3,
      maxRenderedItems: 8,
    });

    for (const offset of [0, 20, 40]) {
      list({ items: rows, width: 20, height: 3, scrollOffset: offset });
      expect(list.getState().cachedItems).toBeLessThanOrEqual(3);
    }

    list.dispose();
    expect(list.getState()).toMatchObject({ cachedItems: 0, measuredItems: 0 });

    list({ items: rows, width: 20, height: 3 });
    expect(list.getState().cachedItems).toBeGreaterThan(0);
  });

  test("supports explicit invalidation for mutable item content", () => {
    const rows = fixedRows(3);
    const list = createFixedList({ overscan: 8 });
    list({ items: rows, width: 20, height: 2 });
    expect(list.getState().totalHeight).toBe(3);

    const firstRow = rows[0];
    if (!firstRow) throw new Error("Expected a first row");
    firstRow.height = 4;
    list.invalidate("row-0");
    list({ items: rows, width: 20, height: 2 });
    expect(list.getState().totalHeight).toBe(6);
  });

  test("exposes imperative uncontrolled scrolling and reset", () => {
    const rows = fixedRows(20);
    const list = createFixedList({ overscan: 0 });
    list({ items: rows, width: 20, height: 5 });

    list.scrollTo(8);
    list({ items: rows, width: 20, height: 5 });
    expect(list.getState().scrollOffset).toBe(8);

    list.scrollToEnd();
    list({ items: rows, width: 20, height: 5 });
    expect(list.getState()).toMatchObject({
      scrollOffset: 15,
      stickToBottom: true,
    });

    list.reset();
    expect(list.getState()).toMatchObject({
      scrollOffset: 0,
      cachedItems: 0,
      stickToBottom: false,
    });
  });

  test("keeps numeric and string keys distinct", () => {
    const list = VirtualList<{ id: string | number }>({
      itemKey: (row) => row.id,
      renderItem: (row) => Text(String(row.id)),
    });

    expect(() =>
      list({
        items: [{ id: 1 }, { id: "1" }],
        width: 20,
        height: 5,
      }),
    ).not.toThrow();
  });

  test("rejects duplicate typed item keys deterministically", () => {
    const list = VirtualList<Row>({
      itemKey: () => "same",
      renderItem: (row) => VStack({ height: row.height }, []),
    });

    expect(() => list({ items: fixedRows(2), width: 20, height: 5 })).toThrow(
      'Duplicate VirtualList item key: string "same"',
    );
  });
});
