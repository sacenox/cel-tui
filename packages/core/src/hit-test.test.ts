import { describe, expect, test } from "bun:test";
import {
  collectFocusable,
  collectKeyPressHandlers,
  collectScrollTargets,
  findClickHandler,
  findScrollTarget,
  hitTest,
} from "./hit-test.js";
import { type LayoutNode, layout } from "./layout.js";
import { HStack, VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";

function item<T>(items: readonly T[], index: number): T {
  const value = items[index];
  expect(value).toBeDefined();
  if (value === undefined) {
    throw new Error(`Missing item at index ${index}`);
  }
  return value;
}

function expectSome<T>(value: T | null | undefined): T {
  expect(value).toBeDefined();
  expect(value).not.toBeNull();
  if (value == null) {
    throw new Error("Expected value to be present");
  }
  return value;
}

function last<T>(items: readonly T[]): T {
  return item(items, items.length - 1);
}

function textContent(layoutNode: LayoutNode): string {
  expect(layoutNode.node.type).toBe("text");
  if (layoutNode.node.type !== "text") {
    throw new Error(`Expected text node, got ${layoutNode.node.type}`);
  }
  return layoutNode.node.content;
}

describe("hitTest", () => {
  test("returns path to deepest node at position", () => {
    const node = VStack({ width: 20, height: 10 }, [Text("hello")]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 5, 0);
    expect(path.length).toBe(2); // root VStack + Text
    expect(last(path).node.type).toBe("text");
  });

  test("returns root only when hitting empty area", () => {
    const node = VStack({ width: 20, height: 10 }, [
      VStack({ height: 2 }, [Text("top")]),
    ]);
    const ln = layout(node, 20, 10);
    // Hit below the child (y=5)
    const path = hitTest(ln, 5, 5);
    expect(path.length).toBe(1);
    expect(item(path, 0).node.type).toBe("vstack");
  });

  test("returns empty for out-of-bounds", () => {
    const node = VStack({ width: 20, height: 10 }, []);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 25, 5);
    expect(path.length).toBe(0);
  });

  test("finds correct child in HStack", () => {
    const node = HStack({ width: 20, height: 5 }, [
      VStack({ width: 10 }, [Text("left")]),
      VStack({ width: 10 }, [Text("right")]),
    ]);
    const ln = layout(node, 20, 5);

    const pathLeft = hitTest(ln, 3, 0);
    expect(last(pathLeft).node.type).toBe("text");
    expect(textContent(last(pathLeft))).toBe("left");

    const pathRight = hitTest(ln, 13, 0);
    expect(textContent(last(pathRight))).toBe("right");
  });

  test("finds deepest nested node", () => {
    const node = VStack({ width: 30, height: 10 }, [
      HStack({ height: 5 }, [VStack({ width: 15 }, [Text("deep")])]),
    ]);
    const ln = layout(node, 30, 10);
    const path = hitTest(ln, 3, 0);
    expect(path.length).toBe(4); // root > HStack > VStack > Text
    expect(textContent(last(path))).toBe("deep");
  });

  test("adjusts for vertical scroll offset", () => {
    // VStack with 5 children of height 1 in a 3-row viewport
    const node = VStack(
      { width: 20, height: 3, overflow: "scroll", scrollOffset: 2 },
      [
        Text("line 0"),
        Text("line 1"),
        Text("line 2"),
        Text("line 3"),
        Text("line 4"),
      ],
    );
    const ln = layout(node, 20, 3);

    // With scrollOffset=2, clicking at row 0 should hit "line 2"
    // (the 3rd child, which is visually at the top)
    const path = hitTest(ln, 3, 0);
    expect(textContent(last(path))).toBe("line 2");

    // Row 2 should hit "line 4"
    const path2 = hitTest(ln, 3, 2);
    expect(textContent(last(path2))).toBe("line 4");
  });

  test("adjusts for horizontal scroll offset", () => {
    const node = HStack(
      { width: 10, height: 3, overflow: "scroll", scrollOffset: 5 },
      [
        VStack({ width: 5 }, [Text("a")]),
        VStack({ width: 5 }, [Text("b")]),
        VStack({ width: 5 }, [Text("c")]),
      ],
    );
    const ln = layout(node, 10, 3);

    // With scrollOffset=5, clicking at col 0 should hit child "b" (starts at x=5 in layout)
    const path = hitTest(ln, 0, 0);
    expect(textContent(last(path))).toBe("b");
  });

  test("clamps vertical scroll offset before hit testing", () => {
    const node = VStack(
      { width: 20, height: 3, overflow: "scroll", scrollOffset: Infinity },
      [
        Text("line 0"),
        Text("line 1"),
        Text("line 2"),
        Text("line 3"),
        Text("line 4"),
      ],
    );
    const ln = layout(node, 20, 3);

    const topPath = hitTest(ln, 3, 0);
    expect(textContent(last(topPath))).toBe("line 2");

    const bottomPath = hitTest(ln, 3, 2);
    expect(textContent(last(bottomPath))).toBe("line 4");
  });

  test("clamps horizontal over-max scroll offset before hit testing", () => {
    const node = HStack(
      { width: 10, height: 3, overflow: "scroll", scrollOffset: 999 },
      [
        VStack({ width: 5 }, [Text("a")]),
        VStack({ width: 5 }, [Text("b")]),
        VStack({ width: 5 }, [Text("c")]),
      ],
    );
    const ln = layout(node, 10, 3);

    const path = hitTest(ln, 0, 0);
    expect(textContent(last(path))).toBe("b");
  });

  test("no scroll adjustment without overflow scroll", () => {
    const node = VStack({ width: 20, height: 3 }, [
      Text("line 0"),
      Text("line 1"),
      Text("line 2"),
    ]);
    const ln = layout(node, 20, 3);
    const path = hitTest(ln, 3, 0);
    expect(textContent(last(path))).toBe("line 0");
  });
});

describe("findClickHandler", () => {
  test("finds nearest ancestor with onClick", () => {
    const handler = () => {};
    const node = VStack({ width: 20, height: 10 }, [
      HStack({ onClick: handler }, [Text("clickable")]),
    ]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    const result = findClickHandler(path);
    expect(result).not.toBeNull();
    expect(expectSome(result).handler).toBe(handler);
  });

  test("returns null when no onClick in path", () => {
    const node = VStack({ width: 20, height: 10 }, [Text("plain")]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    expect(findClickHandler(path)).toBeNull();
  });

  test("innermost clickable wins", () => {
    const outer = () => {};
    const inner = () => {};
    const node = VStack({ width: 20, height: 10, onClick: outer }, [
      HStack({ onClick: inner }, [Text("nested")]),
    ]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    const result = findClickHandler(path);
    expect(expectSome(result).handler).toBe(inner);
  });
});

describe("findScrollTarget", () => {
  test("finds nearest scrollable ancestor", () => {
    const node = VStack({ width: 20, height: 10, overflow: "scroll" }, [
      Text("scrollable"),
    ]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    const target = expectSome(findScrollTarget(path));
    expect(target.node.type).toBe("vstack");
  });

  test("returns null when no scrollable in path", () => {
    const node = VStack({ width: 20, height: 10 }, [Text("plain")]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    expect(findScrollTarget(path)).toBeNull();
  });

  test("findScrollTarget returns the innermost scrollable", () => {
    const node = VStack({ width: 20, height: 10, overflow: "scroll" }, [
      VStack({ height: 5, overflow: "scroll" }, [Text("inner")]),
    ]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    const target = expectSome(findScrollTarget(path));
    // The inner VStack should win
    expect(target.node.type).toBe("vstack");
    if (target.node.type === "vstack") {
      expect(target.node.props.height).toBe(5);
    }
  });
});

describe("collectScrollTargets", () => {
  test("collects scrollable ancestors from innermost to outermost", () => {
    const node = VStack({ width: 20, height: 10, overflow: "scroll" }, [
      VStack({ height: 6 }, [
        VStack({ height: 4, overflow: "scroll" }, [Text("inner")]),
      ]),
    ]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    const targets = collectScrollTargets(path);

    expect(targets).toHaveLength(2);
    const inner = item(targets, 0);
    const outer = item(targets, 1);
    expect(inner.node.type).toBe("vstack");
    expect(outer.node.type).toBe("vstack");
    if (inner.node.type === "vstack") {
      expect(inner.node.props.height).toBe(4);
    }
    if (outer.node.type === "vstack") {
      expect(outer.node.props.height).toBe(10);
    }
  });
});

describe("collectKeyPressHandlers", () => {
  test("collects handlers from deepest to root", () => {
    const rootHandler = (_key: string) => {};
    const midHandler = (_key: string) => {};
    const node = VStack({ width: 20, height: 10, onKeyPress: rootHandler }, [
      VStack({ onKeyPress: midHandler }, [Text("hello")]),
    ]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    const handlers = collectKeyPressHandlers(path);
    expect(handlers).toHaveLength(2);
    expect(item(handlers, 0).handler).toBe(midHandler);
    expect(item(handlers, 1).handler).toBe(rootHandler);
  });

  test("returns single handler when only root has onKeyPress", () => {
    const handler = (_key: string) => {};
    const node = VStack({ width: 20, height: 10, onKeyPress: handler }, [
      Text("hello"),
    ]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    const handlers = collectKeyPressHandlers(path);
    expect(handlers).toHaveLength(1);
    expect(item(handlers, 0).handler).toBe(handler);
  });

  test("returns empty array when no onKeyPress in path", () => {
    const node = VStack({ width: 20, height: 10 }, [Text("hello")]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    expect(collectKeyPressHandlers(path)).toEqual([]);
  });
});

describe("collectFocusable", () => {
  test("collects TextInput nodes", () => {
    const node = VStack({ width: 20, height: 10 }, [
      Text("not focusable"),
      TextInput({ value: "editable", onChange: () => {} }),
      HStack({ onClick: () => {} }, [Text("button")]),
    ]);
    const ln = layout(node, 20, 10);
    const focusable = collectFocusable(ln);
    expect(focusable.length).toBe(2);
    expect(focusable[0]?.node.type).toBe("textinput");
  });

  test("containers respect focusable: false", () => {
    const node = VStack({ width: 20, height: 10 }, [
      HStack({ onClick: () => {}, focusable: false }, [
        Text("not in tab order"),
      ]),
      HStack({ onClick: () => {} }, [Text("in tab order")]),
    ]);
    const ln = layout(node, 20, 10);
    const focusable = collectFocusable(ln);
    expect(focusable.length).toBe(1);
  });

  test("TextInput respects focusable: false", () => {
    const node = VStack({ width: 20, height: 10 }, [
      TextInput({
        value: "display only",
        onChange: () => {},
        focusable: false,
      }),
      TextInput({ value: "editable", onChange: () => {} }),
    ]);
    const ln = layout(node, 20, 10);
    const focusable = collectFocusable(ln);

    expect(focusable).toHaveLength(1);
    expect(focusable[0]?.node.type).toBe("textinput");
    if (focusable[0]?.node.type === "textinput") {
      expect(focusable[0].node.props.value).toBe("editable");
    }
  });

  test("returns nodes in document order (depth-first)", () => {
    const node = VStack({ width: 20, height: 10 }, [
      HStack({ onClick: () => {} }, [Text("first")]),
      VStack({}, [HStack({ onClick: () => {} }, [Text("second")])]),
      HStack({ onClick: () => {} }, [Text("third")]),
    ]);
    const ln = layout(node, 20, 10);
    const focusable = collectFocusable(ln);
    expect(focusable.length).toBe(3);
  });

  test("explicit focusable: true without onClick is focusable", () => {
    const node = VStack({ width: 20, height: 10 }, [
      HStack({ focusable: true }, [Text("keyboard-only")]),
      HStack({ onClick: () => {} }, [Text("clickable")]),
    ]);
    const ln = layout(node, 20, 10);
    const focusable = collectFocusable(ln);
    expect(focusable.length).toBe(2);
  });
});
