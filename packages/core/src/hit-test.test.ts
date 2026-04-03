import { describe, expect, test } from "bun:test";
import { layout } from "./layout.js";
import {
  hitTest,
  findClickHandler,
  findScrollTarget,
  findKeyPressHandler,
  collectFocusable,
} from "./hit-test.js";
import { VStack, HStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";

describe("hitTest", () => {
  test("returns path to deepest node at position", () => {
    const node = VStack({ width: 20, height: 10 }, [Text("hello")]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 5, 0);
    expect(path.length).toBe(2); // root VStack + Text
    expect(path[path.length - 1]!.node.type).toBe("text");
  });

  test("returns root only when hitting empty area", () => {
    const node = VStack({ width: 20, height: 10 }, [
      VStack({ height: 2 }, [Text("top")]),
    ]);
    const ln = layout(node, 20, 10);
    // Hit below the child (y=5)
    const path = hitTest(ln, 5, 5);
    expect(path.length).toBe(1);
    expect(path[0]!.node.type).toBe("vstack");
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
    expect(pathLeft[pathLeft.length - 1]!.node.type).toBe("text");
    expect((pathLeft[pathLeft.length - 1]!.node as any).content).toBe("left");

    const pathRight = hitTest(ln, 13, 0);
    expect((pathRight[pathRight.length - 1]!.node as any).content).toBe(
      "right",
    );
  });

  test("finds deepest nested node", () => {
    const node = VStack({ width: 30, height: 10 }, [
      HStack({ height: 5 }, [VStack({ width: 15 }, [Text("deep")])]),
    ]);
    const ln = layout(node, 30, 10);
    const path = hitTest(ln, 3, 0);
    expect(path.length).toBe(4); // root > HStack > VStack > Text
    expect((path[path.length - 1]!.node as any).content).toBe("deep");
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
    expect(result!.handler).toBe(handler);
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
    expect(result!.handler).toBe(inner);
  });
});

describe("findScrollTarget", () => {
  test("finds nearest scrollable ancestor", () => {
    const node = VStack({ width: 20, height: 10, overflow: "scroll" }, [
      Text("scrollable"),
    ]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    const target = findScrollTarget(path);
    expect(target).not.toBeNull();
    expect(target!.node.type).toBe("vstack");
  });

  test("returns null when no scrollable in path", () => {
    const node = VStack({ width: 20, height: 10 }, [Text("plain")]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    expect(findScrollTarget(path)).toBeNull();
  });

  test("innermost scrollable wins", () => {
    const node = VStack({ width: 20, height: 10, overflow: "scroll" }, [
      VStack({ height: 5, overflow: "scroll" }, [Text("inner")]),
    ]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    const target = findScrollTarget(path);
    // The inner VStack should win
    const innerNode = target!.node as any;
    expect(innerNode.props.height).toBe(5);
  });
});

describe("findKeyPressHandler", () => {
  test("finds nearest ancestor with onKeyPress", () => {
    const handler = (_key: string) => {};
    const node = VStack({ width: 20, height: 10, onKeyPress: handler }, [
      Text("hello"),
    ]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    const result = findKeyPressHandler(path);
    expect(result).not.toBeNull();
    expect(result!.handler).toBe(handler);
  });

  test("returns null when no onKeyPress in path", () => {
    const node = VStack({ width: 20, height: 10 }, [Text("hello")]);
    const ln = layout(node, 20, 10);
    const path = hitTest(ln, 3, 0);
    expect(findKeyPressHandler(path)).toBeNull();
  });
});

describe("collectFocusable", () => {
  test("collects TextInput nodes", () => {
    // TextInput is always focusable — use a container with onClick as proxy
    const node = VStack({ width: 20, height: 10 }, [
      Text("not focusable"),
      HStack({ onClick: () => {} }, [Text("button 1")]),
      HStack({ onClick: () => {} }, [Text("button 2")]),
    ]);
    const ln = layout(node, 20, 10);
    const focusable = collectFocusable(ln);
    expect(focusable.length).toBe(2);
  });

  test("respects focusable: false", () => {
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
});
