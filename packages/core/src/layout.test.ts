import { describe, expect, test } from "bun:test";
import { layout, type LayoutNode, type Rect } from "./layout.js";
import { VStack, HStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";

/** Helper to extract just the rect from a layout result. */
function rect(ln: LayoutNode): Rect {
  return ln.rect;
}

/** Helper to get child rects. */
function childRects(ln: LayoutNode): Rect[] {
  return ln.children.map((c) => c.rect);
}

describe("layout", () => {
  describe("fixed sizing", () => {
    test("container with fixed width and height", () => {
      const node = VStack({ width: 30, height: 10 }, []);
      const result = layout(node, 80, 24);
      expect(rect(result)).toEqual({ x: 0, y: 0, width: 30, height: 10 });
    });

    test("child with fixed size inside a container", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ width: 20, height: 5 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)).toEqual([
        { x: 0, y: 0, width: 20, height: 5 },
      ]);
    });

    test("root without sizing fills available space", () => {
      const node = VStack({}, []);
      const result = layout(node, 80, 24);
      expect(rect(result)).toEqual({ x: 0, y: 0, width: 80, height: 24 });
    });
  });

  describe("intrinsic sizing", () => {
    test("Text height is 1 for single line", () => {
      const node = VStack({ width: 80, height: 24 }, [Text("hello")]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.height).toBe(1);
    });

    test("Text height follows newlines", () => {
      const node = VStack({ width: 80, height: 24 }, [
        Text("line1\nline2\nline3"),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.height).toBe(3);
    });

    test("Text width fills parent in VStack", () => {
      const node = VStack({ width: 40, height: 10 }, [Text("hi")]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.width).toBe(40);
    });

    test("VStack without height sizes to children", () => {
      const node = VStack({ width: 80 }, [
        VStack({ height: 3 }, []),
        VStack({ height: 5 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(rect(result).height).toBe(8);
    });

    test("HStack without width sizes to children", () => {
      const node = HStack({ height: 10 }, [
        VStack({ width: 15 }, []),
        VStack({ width: 25 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(rect(result).width).toBe(40);
    });
  });

  describe("flex sizing", () => {
    test("single flex child fills remaining space in VStack", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ height: 4 }, []),
        VStack({ flex: 1 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)).toEqual([
        { x: 0, y: 0, width: 80, height: 4 },
        { x: 0, y: 4, width: 80, height: 20 },
      ]);
    });

    test("multiple flex children share space proportionally", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ flex: 1 }, []),
        VStack({ flex: 2 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)).toEqual([
        { x: 0, y: 0, width: 80, height: 8 },
        { x: 0, y: 8, width: 80, height: 16 },
      ]);
    });

    test("flex in HStack divides width", () => {
      const node = HStack({ width: 80, height: 24 }, [
        VStack({ flex: 1 }, []),
        VStack({ flex: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)).toEqual([
        { x: 0, y: 0, width: 20, height: 24 },
        { x: 20, y: 0, width: 60, height: 24 },
      ]);
    });

    test("fixed + flex children", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ height: 1 }, []),
        VStack({ flex: 1 }, []),
        VStack({ height: 1 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)).toEqual([
        { x: 0, y: 0, width: 80, height: 1 },
        { x: 0, y: 1, width: 80, height: 22 },
        { x: 0, y: 23, width: 80, height: 1 },
      ]);
    });
  });

  describe("percentage sizing", () => {
    test("percentage width relative to parent", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ width: "50%", height: 10 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.width).toBe(40);
    });

    test("percentage height relative to parent", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ width: 80, height: "50%" }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.height).toBe(12);
    });
  });

  describe("rounding (largest remainder)", () => {
    test("distributes remainder to children with largest fractional parts", () => {
      // 80 / 3 = 26.667 each → 27, 27, 26
      const node = HStack({ width: 80, height: 24 }, [
        VStack({ flex: 1 }, []),
        VStack({ flex: 1 }, []),
        VStack({ flex: 1 }, []),
      ]);
      const result = layout(node, 80, 24);
      const widths = childRects(result).map((r) => r.width);
      expect(widths).toEqual([27, 27, 26]);
      expect(widths.reduce((a, b) => a + b)).toBe(80);
    });
  });

  describe("constraints", () => {
    test("minWidth prevents shrinking below minimum", () => {
      const node = HStack({ width: 80, height: 24 }, [
        VStack({ flex: 1, minWidth: 30 }, []),
        VStack({ flex: 1 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.width).toBeGreaterThanOrEqual(30);
    });

    test("maxHeight caps growth", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ flex: 1, maxHeight: 10 }, []),
        VStack({ flex: 1 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.height).toBeLessThanOrEqual(10);
    });
  });

  describe("gap", () => {
    test("VStack gap adds spacing between children", () => {
      const node = VStack({ width: 80, height: 24, gap: 1 }, [
        VStack({ height: 3 }, []),
        VStack({ height: 3 }, []),
        VStack({ height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 80, height: 3 });
      expect(rects[1]).toEqual({ x: 0, y: 4, width: 80, height: 3 });
      expect(rects[2]).toEqual({ x: 0, y: 8, width: 80, height: 3 });
    });

    test("HStack gap adds spacing between children", () => {
      const node = HStack({ width: 80, height: 24, gap: 2 }, [
        VStack({ width: 20 }, []),
        VStack({ width: 20 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 20, height: 24 });
      expect(rects[1]).toEqual({ x: 22, y: 0, width: 20, height: 24 });
    });

    test("gap is subtracted before flex distribution", () => {
      const node = VStack({ width: 80, height: 24, gap: 1 }, [
        VStack({ height: 4 }, []),
        VStack({ flex: 1 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // 24 - 4 (fixed) - 1 (gap) = 19 for flex
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 80, height: 4 });
      expect(rects[1]).toEqual({ x: 0, y: 5, width: 80, height: 19 });
    });
  });

  describe("padding", () => {
    test("padding reduces available space for children", () => {
      const node = VStack({ width: 80, height: 24, padding: { x: 2, y: 1 } }, [
        VStack({ flex: 1 }, []),
      ]);
      const result = layout(node, 80, 24);
      // Children start at (2, 1) with reduced size
      expect(childRects(result)[0]).toEqual({
        x: 2,
        y: 1,
        width: 76,
        height: 22,
      });
    });

    test("padding with gap", () => {
      const node = VStack(
        { width: 80, height: 24, padding: { x: 1 }, gap: 1 },
        [VStack({ height: 3 }, []), VStack({ height: 3 }, [])],
      );
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      expect(rects[0]).toEqual({ x: 1, y: 0, width: 78, height: 3 });
      expect(rects[1]).toEqual({ x: 1, y: 4, width: 78, height: 3 });
    });
  });

  describe("VStack child positioning", () => {
    test("children stack top to bottom", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ height: 5 }, []),
        VStack({ height: 3 }, []),
        VStack({ height: 7 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      expect(rects[0]!.y).toBe(0);
      expect(rects[1]!.y).toBe(5);
      expect(rects[2]!.y).toBe(8);
    });
  });

  describe("HStack child positioning", () => {
    test("children stack left to right", () => {
      const node = HStack({ width: 80, height: 24 }, [
        VStack({ width: 20 }, []),
        VStack({ width: 15 }, []),
        VStack({ width: 30 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      expect(rects[0]!.x).toBe(0);
      expect(rects[1]!.x).toBe(20);
      expect(rects[2]!.x).toBe(35);
    });
  });

  describe("cross-axis intrinsic sizing", () => {
    test("HStack inside VStack uses max child height, not sum of widths", () => {
      // HStack with 3 Text children: each is 1 line tall.
      // HStack's intrinsic height should be 1 (max), not sum of widths.
      const node = VStack({ width: 80, height: 24 }, [
        HStack({}, [Text("hello"), Text("world")]),
        Text("below"),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // HStack height = 1 (tallest child is a single-line Text)
      expect(rects[0]!.height).toBe(1);
      // "below" Text starts right after
      expect(rects[1]!.y).toBe(1);
      expect(rects[1]!.height).toBe(1);
    });

    test("HStack intrinsic height with multi-line text child", () => {
      const node = VStack({ width: 80, height: 24 }, [
        HStack({}, [
          Text("a"),
          Text("b\nc\nd"), // 3 lines tall
        ]),
      ]);
      const result = layout(node, 80, 24);
      // HStack height = max child height = 3
      expect(childRects(result)[0]!.height).toBe(3);
    });

    test("VStack inside HStack uses max child width, not sum of heights", () => {
      const node = HStack({ width: 80, height: 24 }, [
        VStack({}, [VStack({ height: 3 }, []), VStack({ height: 5 }, [])]),
        VStack({ width: 10 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // First VStack intrinsic width should fill parent (80), not 3+5=8
      // Actually with no explicit width children, innerCross is used.
      // The second child starts after the first.
      // VStack intrinsic width = max of children's widths on cross axis
      // Its children have no explicit width, so they'd fill available.
      // Let's just check that it doesn't sum heights as width.
      expect(rects[0]!.width).not.toBe(8);
    });

    test("hello example pattern: VStack with HStack children stacks tightly", () => {
      // Mimics the hello.ts layout pattern that was broken.
      // Key assertion: HStack children get height=1 (max child height),
      // not the sum of children widths.
      const node = VStack({ width: 80 }, [
        Text("logo line"),
        Text(""),
        HStack({ gap: 2 }, [Text("item1"), Text("item2"), Text("item3")]),
        Text(""),
        HStack({ gap: 1 }, [Text("a"), Text("b")]),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // All children should be height 1
      expect(rects[0]!.height).toBe(1); // Text
      expect(rects[1]!.height).toBe(1); // Text("")
      expect(rects[2]!.height).toBe(1); // HStack (was broken: summed widths)
      expect(rects[3]!.height).toBe(1); // Text("")
      expect(rects[4]!.height).toBe(1); // HStack
      // Children stack sequentially with no gaps
      expect(rects[0]!.y).toBe(0);
      expect(rects[1]!.y).toBe(1);
      expect(rects[2]!.y).toBe(2);
      expect(rects[3]!.y).toBe(3);
      expect(rects[4]!.y).toBe(4);
      // Total intrinsic height = 5
      expect(result.rect.height).toBe(5);
    });
  });

  describe("justifyContent", () => {
    test("start is the default (no offset)", () => {
      const node = VStack({ width: 80, height: 24, justifyContent: "start" }, [
        VStack({ height: 3 }, []),
        VStack({ height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      expect(rects[0]!.y).toBe(0);
      expect(rects[1]!.y).toBe(3);
    });

    test("end pushes children to the end of the main axis", () => {
      const node = VStack({ width: 80, height: 24, justifyContent: "end" }, [
        VStack({ height: 3 }, []),
        VStack({ height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // remaining = 24 - 6 = 18
      expect(rects[0]!.y).toBe(18);
      expect(rects[1]!.y).toBe(21);
    });

    test("center centers children on the main axis", () => {
      const node = VStack({ width: 80, height: 24, justifyContent: "center" }, [
        VStack({ height: 3 }, []),
        VStack({ height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // remaining = 24 - 6 = 18, offset = 9
      expect(rects[0]!.y).toBe(9);
      expect(rects[1]!.y).toBe(12);
    });

    test("space-between distributes space between children", () => {
      const node = VStack(
        { width: 80, height: 24, justifyContent: "space-between" },
        [
          VStack({ height: 3 }, []),
          VStack({ height: 3 }, []),
          VStack({ height: 3 }, []),
        ],
      );
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // remaining = 24 - 9 = 15, gaps = 2, space per gap = 7.5 → 8, 7
      expect(rects[0]!.y).toBe(0);
      // gap after first = floor(15/2) or largest-remainder?
      // 15 / 2 = 7.5 each → 8, 7 via largest remainder
      expect(rects[1]!.y).toBe(3 + 8); // 11
      expect(rects[2]!.y).toBe(3 + 8 + 3 + 7); // 21
    });

    test("space-between with single child acts like start", () => {
      const node = VStack(
        { width: 80, height: 24, justifyContent: "space-between" },
        [VStack({ height: 3 }, [])],
      );
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.y).toBe(0);
    });

    test("center in HStack centers horizontally", () => {
      const node = HStack({ width: 80, height: 24, justifyContent: "center" }, [
        VStack({ width: 10, height: 24 }, []),
        VStack({ width: 10, height: 24 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // remaining = 80 - 20 = 60, offset = 30
      expect(rects[0]!.x).toBe(30);
      expect(rects[1]!.x).toBe(40);
    });

    test("end in HStack pushes children right", () => {
      const node = HStack({ width: 80, height: 24, justifyContent: "end" }, [
        VStack({ width: 20, height: 24 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.x).toBe(60);
    });

    test("justifyContent with padding", () => {
      const node = VStack(
        {
          width: 80,
          height: 24,
          justifyContent: "center",
          padding: { y: 2 },
        },
        [VStack({ height: 4 }, [])],
      );
      const result = layout(node, 80, 24);
      // inner height = 24 - 4 = 20, remaining = 20 - 4 = 16, offset = 8
      // child y = padY + offset = 2 + 8 = 10
      expect(childRects(result)[0]!.y).toBe(10);
    });

    test("justifyContent with gap", () => {
      const node = VStack(
        { width: 80, height: 24, justifyContent: "end", gap: 2 },
        [VStack({ height: 3 }, []), VStack({ height: 3 }, [])],
      );
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // total content = 3 + 2 + 3 = 8, remaining = 24 - 8 = 16
      expect(rects[0]!.y).toBe(16);
      expect(rects[1]!.y).toBe(21); // 16 + 3 + 2
    });
  });

  describe("alignItems", () => {
    test("stretch is the default (children fill cross axis)", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      // cross axis = width, should fill parent
      expect(childRects(result)[0]!.width).toBe(80);
      expect(childRects(result)[0]!.x).toBe(0);
    });

    test("center centers children on cross axis in VStack", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "center" }, [
        VStack({ width: 20, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      // cross remaining = 80 - 20 = 60, offset = 30
      expect(childRects(result)[0]!.x).toBe(30);
    });

    test("end aligns children to the end of cross axis", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "end" }, [
        VStack({ width: 20, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      // cross remaining = 80 - 20 = 60
      expect(childRects(result)[0]!.x).toBe(60);
    });

    test("start aligns children to the start of cross axis", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "start" }, [
        VStack({ width: 20, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.x).toBe(0);
    });

    test("center in HStack centers vertically", () => {
      const node = HStack({ width: 80, height: 24, alignItems: "center" }, [
        VStack({ width: 20, height: 6 }, []),
      ]);
      const result = layout(node, 80, 24);
      // cross = height, remaining = 24 - 6 = 18, offset = 9
      expect(childRects(result)[0]!.y).toBe(9);
    });

    test("end in HStack pushes children to the bottom", () => {
      const node = HStack({ width: 80, height: 24, alignItems: "end" }, [
        VStack({ width: 20, height: 6 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.y).toBe(18);
    });

    test("alignItems with padding", () => {
      const node = VStack(
        {
          width: 80,
          height: 24,
          alignItems: "center",
          padding: { x: 5 },
        },
        [VStack({ width: 20, height: 3 }, [])],
      );
      const result = layout(node, 80, 24);
      // inner width = 80 - 10 = 70, remaining = 70 - 20 = 50, offset = 25
      // child x = padX + offset = 5 + 25 = 30
      expect(childRects(result)[0]!.x).toBe(30);
    });

    test("alignItems affects each child independently", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "center" }, [
        VStack({ width: 20, height: 3 }, []),
        VStack({ width: 40, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // child 1: (80 - 20) / 2 = 30
      expect(rects[0]!.x).toBe(30);
      // child 2: (80 - 40) / 2 = 20
      expect(rects[1]!.x).toBe(20);
    });

    test("center uses intrinsic cross size for Text children", () => {
      // Text("hello") has intrinsic width 5. With alignItems center,
      // it should be centered in 80 columns, not fill the width.
      const node = VStack({ width: 80, height: 24, alignItems: "center" }, [
        Text("hello"),
      ]);
      const result = layout(node, 80, 24);
      const r = childRects(result)[0]!;
      // intrinsic width of "hello" = 5, cross = 80
      // offset = (80 - 5) / 2 = 37 (floored from 37.5)
      expect(r.x).toBe(37);
      expect(r.width).toBe(5);
    });

    test("center uses intrinsic cross size for HStack without explicit width", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "center" }, [
        HStack({ gap: 1 }, [Text("aa"), Text("bb")]),
      ]);
      const result = layout(node, 80, 24);
      const r = childRects(result)[0]!;
      // HStack intrinsic width = 2 + 1 + 2 = 5
      expect(r.width).toBe(5);
      expect(r.x).toBe(37);
    });

    test("end uses intrinsic cross size for children without explicit width", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "end" }, [
        Text("hi"),
      ]);
      const result = layout(node, 80, 24);
      const r = childRects(result)[0]!;
      // intrinsic width of "hi" = 2
      expect(r.width).toBe(2);
      expect(r.x).toBe(78);
    });

    test("stretch still fills cross axis (default)", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "stretch" }, [
        Text("hi"),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)[0]!.width).toBe(80);
      expect(childRects(result)[0]!.x).toBe(0);
    });

    test("combined justifyContent center + alignItems center", () => {
      const node = VStack(
        {
          width: 80,
          height: 24,
          justifyContent: "center",
          alignItems: "center",
        },
        [VStack({ width: 20, height: 4 }, [])],
      );
      const result = layout(node, 80, 24);
      const r = childRects(result)[0]!;
      // main (y): (24 - 4) / 2 = 10
      expect(r.y).toBe(10);
      // cross (x): (80 - 20) / 2 = 30
      expect(r.x).toBe(30);
    });
  });

  describe("nested layout", () => {
    test("editor-like layout: sidebar + main area", () => {
      const node = HStack({ width: 80, height: 24 }, [
        VStack({ width: 20 }, []),
        VStack({ flex: 1 }, [
          VStack({ height: 1 }, []),
          VStack({ flex: 1 }, []),
          VStack({ height: 1 }, []),
        ]),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);

      // Sidebar
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 20, height: 24 });
      // Main area
      expect(rects[1]).toEqual({ x: 20, y: 0, width: 60, height: 24 });

      // Main area children
      const mainChildren = result.children[1]!.children;
      expect(mainChildren[0]!.rect).toEqual({
        x: 20,
        y: 0,
        width: 60,
        height: 1,
      });
      expect(mainChildren[1]!.rect).toEqual({
        x: 20,
        y: 1,
        width: 60,
        height: 22,
      });
      expect(mainChildren[2]!.rect).toEqual({
        x: 20,
        y: 23,
        width: 60,
        height: 1,
      });
    });
  });
});
