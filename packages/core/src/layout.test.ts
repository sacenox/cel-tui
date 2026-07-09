import { describe, expect, test } from "bun:test";
import { measureContentHeight } from "./index.js";
import { type LayoutNode, layout, type Rect } from "./layout.js";
import { HStack, VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";

/** Helper to extract just the rect from a layout result. */
function rect(ln: LayoutNode): Rect {
  return ln.rect;
}

/** Helper to get child rects. */
function childRects(ln: LayoutNode): Rect[] {
  return ln.children.map((c) => c.rect);
}

function item<T>(items: readonly T[], index: number): T {
  const value = items[index];
  expect(value).toBeDefined();
  if (value === undefined) {
    throw new Error(`Missing item at index ${index}`);
  }
  return value;
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
      expect(item(childRects(result), 0).height).toBe(1);
    });

    test("Text height follows newlines", () => {
      const node = VStack({ width: 80, height: 24 }, [
        Text("line1\nline2\nline3"),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).height).toBe(3);
    });

    test("Text width fills parent in VStack", () => {
      const node = VStack({ width: 40, height: 10 }, [Text("hi")]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).width).toBe(40);
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

  describe("visibleWidth-aware sizing", () => {
    test("CJK text intrinsic width counts double-width chars", () => {
      const node = HStack({ height: 10, alignItems: "start" }, [
        Text("世界"), // 2 chars, each width 2 = 4 columns
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).width).toBe(4);
    });

    test("CJK text word-wrap height uses visible width", () => {
      // 6 CJK chars = 12 columns wide, wrap at width 5 → 3 visual lines
      const node = VStack({ width: 5, height: 24 }, [
        Text("世界世界世界", { wrap: "word" }),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).height).toBe(3);
    });

    test("Text word-wrap height follows visual word wrapping, not hard width wrapping", () => {
      const node = VStack({ width: 6, height: 24 }, [
        Text("foo bar baz", { wrap: "word" }),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).height).toBe(3);
    });

    test("TextInput intrinsic height follows visual word wrapping", () => {
      const node = VStack({ width: 6, height: 24 }, [
        TextInput({ value: "foo bar baz", onChange: () => {} }),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).height).toBe(3);
    });

    test("emoji text intrinsic width counts width 2", () => {
      const node = HStack({ height: 10, alignItems: "start" }, [
        Text("😀hi"), // emoji(2) + h(1) + i(1) = 4
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).width).toBe(4);
    });

    test("mixed ASCII and CJK intrinsic width", () => {
      const node = HStack({ height: 10, alignItems: "start" }, [
        Text("hi世界"), // h(1) + i(1) + 世(2) + 界(2) = 6
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).width).toBe(6);
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

    test("repeat fill claims remaining width in HStack", () => {
      const node = HStack({ width: 10, height: 1 }, [
        Text("A"),
        Text("-", { repeat: "fill" }),
        Text("B"),
      ]);
      const result = layout(node, 10, 1);
      expect(childRects(result)).toEqual([
        { x: 0, y: 0, width: 1, height: 1 },
        { x: 1, y: 0, width: 8, height: 1 },
        { x: 9, y: 0, width: 1, height: 1 },
      ]);
    });
  });

  describe("percentage sizing", () => {
    test("percentage width relative to parent", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ width: "50%", height: 10 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).width).toBe(40);
    });

    test("percentage height relative to parent", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ width: 80, height: "50%" }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).height).toBe(12);
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
    test("minWidth redistributes the remaining flex width", () => {
      const node = HStack({ width: 80, height: 24 }, [
        VStack({ flex: 1, minWidth: 60 }, []),
        VStack({ flex: 1 }, []),
      ]);
      const result = layout(node, 80, 24);
      const widths = childRects(result).map((child) => child.width);
      expect(widths).toEqual([60, 20]);
      expect(widths.reduce((sum, width) => sum + width, 0)).toBe(80);
    });

    test("maxHeight redistributes the remaining flex height", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ flex: 1, maxHeight: 10 }, []),
        VStack({ flex: 1 }, []),
      ]);
      const result = layout(node, 80, 24);
      const heights = childRects(result).map((child) => child.height);
      expect(heights).toEqual([10, 14]);
      expect(heights.reduce((sum, height) => sum + height, 0)).toBe(24);
    });

    test("mixed minWidth and maxWidth constraints keep redistributing flex width", () => {
      const node = HStack({ width: 100, height: 24 }, [
        VStack({ flex: 1, minWidth: 80 }, []),
        VStack({ flex: 1, maxWidth: 10 }, []),
      ]);
      const result = layout(node, 100, 24);
      const widths = childRects(result).map((child) => child.width);
      expect(widths).toEqual([90, 10]);
      expect(widths.reduce((sum, width) => sum + width, 0)).toBe(100);
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
      expect(item(rects, 0).y).toBe(0);
      expect(item(rects, 1).y).toBe(5);
      expect(item(rects, 2).y).toBe(8);
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
      expect(item(rects, 0).x).toBe(0);
      expect(item(rects, 1).x).toBe(20);
      expect(item(rects, 2).x).toBe(35);
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
      expect(item(rects, 0).height).toBe(1);
      // "below" Text starts right after
      expect(item(rects, 1).y).toBe(1);
      expect(item(rects, 1).height).toBe(1);
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
      expect(item(childRects(result), 0).height).toBe(3);
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
      expect(item(rects, 0).width).not.toBe(8);
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
      expect(item(rects, 0).height).toBe(1); // Text
      expect(item(rects, 1).height).toBe(1); // Text("")
      expect(item(rects, 2).height).toBe(1); // HStack (was broken: summed widths)
      expect(item(rects, 3).height).toBe(1); // Text("")
      expect(item(rects, 4).height).toBe(1); // HStack
      // Children stack sequentially with no gaps
      expect(item(rects, 0).y).toBe(0);
      expect(item(rects, 1).y).toBe(1);
      expect(item(rects, 2).y).toBe(2);
      expect(item(rects, 3).y).toBe(3);
      expect(item(rects, 4).y).toBe(4);
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
      expect(item(rects, 0).y).toBe(0);
      expect(item(rects, 1).y).toBe(3);
    });

    test("end pushes children to the end of the main axis", () => {
      const node = VStack({ width: 80, height: 24, justifyContent: "end" }, [
        VStack({ height: 3 }, []),
        VStack({ height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // remaining = 24 - 6 = 18
      expect(item(rects, 0).y).toBe(18);
      expect(item(rects, 1).y).toBe(21);
    });

    test("center centers children on the main axis", () => {
      const node = VStack({ width: 80, height: 24, justifyContent: "center" }, [
        VStack({ height: 3 }, []),
        VStack({ height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // remaining = 24 - 6 = 18, offset = 9
      expect(item(rects, 0).y).toBe(9);
      expect(item(rects, 1).y).toBe(12);
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
      expect(item(rects, 0).y).toBe(0);
      // gap after first = floor(15/2) or largest-remainder?
      // 15 / 2 = 7.5 each → 8, 7 via largest remainder
      expect(item(rects, 1).y).toBe(3 + 8); // 11
      expect(item(rects, 2).y).toBe(3 + 8 + 3 + 7); // 21
    });

    test("space-between with single child acts like start", () => {
      const node = VStack(
        { width: 80, height: 24, justifyContent: "space-between" },
        [VStack({ height: 3 }, [])],
      );
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).y).toBe(0);
    });

    test("space-between ignores main-axis gap in HStack", () => {
      const node = HStack(
        {
          width: 25,
          height: 1,
          justifyContent: "space-between",
          gap: 4,
        },
        [
          VStack({ width: 6, height: 1 }, []),
          VStack({ width: 6, height: 1 }, []),
          VStack({ width: 6, height: 1 }, []),
        ],
      );
      const result = layout(node, 25, 1);
      const rects = childRects(result);

      expect(rects[0]).toEqual({ x: 0, y: 0, width: 6, height: 1 });
      expect(rects[1]).toEqual({ x: 10, y: 0, width: 6, height: 1 });
      expect(rects[2]).toEqual({ x: 19, y: 0, width: 6, height: 1 });
    });

    test("center in HStack centers horizontally", () => {
      const node = HStack({ width: 80, height: 24, justifyContent: "center" }, [
        VStack({ width: 10, height: 24 }, []),
        VStack({ width: 10, height: 24 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // remaining = 80 - 20 = 60, offset = 30
      expect(item(rects, 0).x).toBe(30);
      expect(item(rects, 1).x).toBe(40);
    });

    test("end in HStack pushes children right", () => {
      const node = HStack({ width: 80, height: 24, justifyContent: "end" }, [
        VStack({ width: 20, height: 24 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).x).toBe(60);
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
      expect(item(childRects(result), 0).y).toBe(10);
    });

    test("justifyContent with gap", () => {
      const node = VStack(
        { width: 80, height: 24, justifyContent: "end", gap: 2 },
        [VStack({ height: 3 }, []), VStack({ height: 3 }, [])],
      );
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // total content = 3 + 2 + 3 = 8, remaining = 24 - 8 = 16
      expect(item(rects, 0).y).toBe(16);
      expect(item(rects, 1).y).toBe(21); // 16 + 3 + 2
    });
  });

  describe("alignItems", () => {
    test("stretch is the default (children fill cross axis)", () => {
      const node = VStack({ width: 80, height: 24 }, [
        VStack({ height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      // cross axis = width, should fill parent
      expect(item(childRects(result), 0).width).toBe(80);
      expect(item(childRects(result), 0).x).toBe(0);
    });

    test("center centers children on cross axis in VStack", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "center" }, [
        VStack({ width: 20, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      // cross remaining = 80 - 20 = 60, offset = 30
      expect(item(childRects(result), 0).x).toBe(30);
    });

    test("end aligns children to the end of cross axis", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "end" }, [
        VStack({ width: 20, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      // cross remaining = 80 - 20 = 60
      expect(item(childRects(result), 0).x).toBe(60);
    });

    test("start aligns children to the start of cross axis", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "start" }, [
        VStack({ width: 20, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).x).toBe(0);
    });

    test("center in HStack centers vertically", () => {
      const node = HStack({ width: 80, height: 24, alignItems: "center" }, [
        VStack({ width: 20, height: 6 }, []),
      ]);
      const result = layout(node, 80, 24);
      // cross = height, remaining = 24 - 6 = 18, offset = 9
      expect(item(childRects(result), 0).y).toBe(9);
    });

    test("end in HStack pushes children to the bottom", () => {
      const node = HStack({ width: 80, height: 24, alignItems: "end" }, [
        VStack({ width: 20, height: 6 }, []),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).y).toBe(18);
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
      expect(item(childRects(result), 0).x).toBe(30);
    });

    test("alignItems affects each child independently", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "center" }, [
        VStack({ width: 20, height: 3 }, []),
        VStack({ width: 40, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // child 1: (80 - 20) / 2 = 30
      expect(item(rects, 0).x).toBe(30);
      // child 2: (80 - 40) / 2 = 20
      expect(item(rects, 1).x).toBe(20);
    });

    test("center uses intrinsic cross size for Text children", () => {
      // Text("hello") has intrinsic width 5. With alignItems center,
      // it should be centered in 80 columns, not fill the width.
      const node = VStack({ width: 80, height: 24, alignItems: "center" }, [
        Text("hello"),
      ]);
      const result = layout(node, 80, 24);
      const r = item(childRects(result), 0);
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
      const r = item(childRects(result), 0);
      // HStack intrinsic width = 2 + 1 + 2 = 5
      expect(r.width).toBe(5);
      expect(r.x).toBe(37);
    });

    test("end uses intrinsic cross size for children without explicit width", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "end" }, [
        Text("hi"),
      ]);
      const result = layout(node, 80, 24);
      const r = item(childRects(result), 0);
      // intrinsic width of "hi" = 2
      expect(r.width).toBe(2);
      expect(r.x).toBe(78);
    });

    test("stretch still fills cross axis (default)", () => {
      const node = VStack({ width: 80, height: 24, alignItems: "stretch" }, [
        Text("hi"),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).width).toBe(80);
      expect(item(childRects(result), 0).x).toBe(0);
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
      const r = item(childRects(result), 0);
      // main (y): (24 - 4) / 2 = 10
      expect(r.y).toBe(10);
      // cross (x): (80 - 20) / 2 = 30
      expect(r.x).toBe(30);
    });
  });

  describe("flexWrap", () => {
    test("nowrap is the default — children stay on one line", () => {
      // Three 30-wide children in an 80-wide HStack: total 90, no wrapping
      const node = HStack({ width: 80, height: 24 }, [
        VStack({ width: 30, height: 5 }, []),
        VStack({ width: 30, height: 5 }, []),
        VStack({ width: 30, height: 5 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // All on same row (y=0), positioned left-to-right
      expect(item(rects, 0).y).toBe(0);
      expect(item(rects, 1).y).toBe(0);
      expect(item(rects, 2).y).toBe(0);
      expect(item(rects, 0).x).toBe(0);
      expect(item(rects, 1).x).toBe(30);
      expect(item(rects, 2).x).toBe(60);
    });

    test("wrap splits children into rows when they exceed width", () => {
      // Three 30-wide children in an 80-wide HStack with wrap
      // Row 1: child0 (30) + child1 (30) = 60 ≤ 80 ✓
      // Row 2: child2 (30) — adding to row 1 would be 90 > 80
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 30, height: 5 }, []),
        VStack({ width: 30, height: 5 }, []),
        VStack({ width: 30, height: 5 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Row 1: child0 at (0,0), child1 at (30,0)
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 30, height: 5 });
      expect(rects[1]).toEqual({ x: 30, y: 0, width: 30, height: 5 });
      // Row 2: child2 at (0,5)
      expect(rects[2]).toEqual({ x: 0, y: 5, width: 30, height: 5 });
    });

    test("all children fit on one row — no wrapping", () => {
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 20, height: 3 }, []),
        VStack({ width: 20, height: 3 }, []),
        VStack({ width: 20, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 20, height: 3 });
      expect(rects[1]).toEqual({ x: 20, y: 0, width: 20, height: 3 });
      expect(rects[2]).toEqual({ x: 40, y: 0, width: 20, height: 3 });
    });

    test("each child on its own row when each exceeds half the width", () => {
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 50, height: 2 }, []),
        VStack({ width: 50, height: 3 }, []),
        VStack({ width: 50, height: 4 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 50, height: 2 });
      expect(rects[1]).toEqual({ x: 0, y: 2, width: 50, height: 3 });
      expect(rects[2]).toEqual({ x: 0, y: 5, width: 50, height: 4 });
    });

    test("row height is the max cross-size of children in that row", () => {
      // Row 1: height-2 and height-5 → row height 5
      // Row 2: height-3 → row height 3
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 50, height: 2 }, []),
        VStack({ width: 20, height: 5 }, []),
        VStack({ width: 50, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Row 1: both at y=0, row height = max(2,5) = 5
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 50, height: 2 });
      expect(rects[1]).toEqual({ x: 50, y: 0, width: 20, height: 5 });
      // Row 2: starts at y=5
      expect(rects[2]).toEqual({ x: 0, y: 5, width: 50, height: 3 });
    });

    test("gap between items within a row", () => {
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap", gap: 2 }, [
        VStack({ width: 30, height: 3 }, []),
        VStack({ width: 30, height: 3 }, []),
        VStack({ width: 30, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Row 1: child0(30) + gap(2) + child1(30) = 62 ≤ 80 ✓
      //         + gap(2) + child2(30) = 94 > 80 ✗
      // Row 2: child2
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 30, height: 3 });
      expect(rects[1]).toEqual({ x: 32, y: 0, width: 30, height: 3 });
      // Row 2 starts at y = row1Height(3) + gap(2) = 5
      expect(rects[2]).toEqual({ x: 0, y: 5, width: 30, height: 3 });
    });

    test("gap between rows", () => {
      // Every child gets its own row, gap between rows
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap", gap: 1 }, [
        VStack({ width: 80, height: 2 }, []),
        VStack({ width: 80, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 80, height: 2 });
      // gap between rows = 1
      expect(rects[1]).toEqual({ x: 0, y: 3, width: 80, height: 3 });
    });

    test("flex children distribute remaining space within their row", () => {
      // Row 1: fixed(20) + flex(1) → flex gets 80-20 = 60
      // Row 2: flex(1) → flex gets 80
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 20, height: 3 }, []),
        VStack({ flex: 1, height: 3 }, []),
        VStack({ width: 90, height: 4 }, []), // wider than container, own row
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Row 1: fixed + flex
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 20, height: 3 });
      expect(rects[1]).toEqual({ x: 20, y: 0, width: 60, height: 3 });
      // Row 2: child wider than container
      expect(item(rects, 2).y).toBe(3);
    });

    test("multiple flex children in one row share space", () => {
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 20, height: 3 }, []),
        VStack({ flex: 1, height: 3 }, []),
        VStack({ flex: 1, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // All fit in one row. Remaining = 80 - 20 = 60, split 30/30
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 20, height: 3 });
      expect(rects[1]).toEqual({ x: 20, y: 0, width: 30, height: 3 });
      expect(rects[2]).toEqual({ x: 50, y: 0, width: 30, height: 3 });
    });

    test("row flex redistribution honors minWidth after clamping", () => {
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 20, height: 3 }, []),
        VStack({ flex: 1, minWidth: 40, height: 3 }, []),
        VStack({ flex: 1, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const widths = childRects(result).map((child) => child.width);
      expect(widths).toEqual([20, 40, 20]);
      expect(widths.reduce((sum, width) => sum + width, 0)).toBe(80);
    });

    test("row flex redistribution honors maxWidth after clamping", () => {
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 20, height: 3 }, []),
        VStack({ flex: 1, maxWidth: 10, height: 3 }, []),
        VStack({ flex: 1, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const widths = childRects(result).map((child) => child.width);
      expect(widths).toEqual([20, 10, 50]);
      expect(widths.reduce((sum, width) => sum + width, 0)).toBe(80);
    });

    test("row flex redistribution keeps going after mixed minWidth and maxWidth clamps", () => {
      const node = HStack({ width: 100, height: 24, flexWrap: "wrap" }, [
        VStack({ flex: 1, minWidth: 80, height: 3 }, []),
        VStack({ flex: 1, maxWidth: 10, height: 3 }, []),
      ]);
      const result = layout(node, 100, 24);
      const widths = childRects(result).map((child) => child.width);
      expect(widths).toEqual([90, 10]);
      expect(widths.reduce((sum, width) => sum + width, 0)).toBe(100);
    });

    test("padding reduces available width for wrapping", () => {
      // Inner width = 80 - 2*5 = 70
      // Row 1: 40 ≤ 70 ✓, 40+40=80 > 70 ✗
      // Row 2: 40
      const node = HStack(
        { width: 80, height: 24, flexWrap: "wrap", padding: { x: 5, y: 2 } },
        [
          VStack({ width: 40, height: 3 }, []),
          VStack({ width: 40, height: 3 }, []),
        ],
      );
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Row 1 at padded origin
      expect(rects[0]).toEqual({ x: 5, y: 2, width: 40, height: 3 });
      // Row 2
      expect(rects[1]).toEqual({ x: 5, y: 5, width: 40, height: 3 });
    });

    test("alignItems stretch makes children fill row height", () => {
      // Default alignItems is stretch. Children should fill their row's height.
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 50, height: 2 }, []),
        VStack({ width: 20 }, []), // no explicit height
        VStack({ width: 50, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Row 1: max height = 2 (first child), second child stretches to 2
      // But wait — when the second child has no explicit height, under stretch
      // it should fill the row height, which is determined by the tallest child.
      // The tallest in row 1 is 2, so stretched child gets 2.
      expect(item(rects, 0).height).toBe(2);
      expect(item(rects, 1).height).toBe(2);
      // Row 2
      expect(item(rects, 2).height).toBe(3);
    });

    test("alignItems center centers children vertically within row", () => {
      const node = HStack(
        { width: 80, height: 24, flexWrap: "wrap", alignItems: "center" },
        [
          VStack({ width: 50, height: 6 }, []),
          VStack({ width: 20, height: 2 }, []),
        ],
      );
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Single row, row height = 6
      // First child: y=0, height=6 (fills row)
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 50, height: 6 });
      // Second child: centered in 6-high row → (6-2)/2 = 2
      expect(rects[1]).toEqual({ x: 50, y: 2, width: 20, height: 2 });
    });

    test("alignItems end aligns children to bottom of row", () => {
      const node = HStack(
        { width: 80, height: 24, flexWrap: "wrap", alignItems: "end" },
        [
          VStack({ width: 50, height: 6 }, []),
          VStack({ width: 20, height: 2 }, []),
        ],
      );
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Row height = 6. Second child at bottom: y = 6-2 = 4
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 50, height: 6 });
      expect(rects[1]).toEqual({ x: 50, y: 4, width: 20, height: 2 });
    });

    test("justifyContent center centers items within each row", () => {
      const node = HStack(
        { width: 80, height: 24, flexWrap: "wrap", justifyContent: "center" },
        [
          VStack({ width: 30, height: 3 }, []),
          VStack({ width: 30, height: 3 }, []),
          VStack({ width: 30, height: 3 }, []),
        ],
      );
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Row 1: child0+child1 = 60, remaining = 20, offset = 10
      expect(rects[0]).toEqual({ x: 10, y: 0, width: 30, height: 3 });
      expect(rects[1]).toEqual({ x: 40, y: 0, width: 30, height: 3 });
      // Row 2: child2 = 30, remaining = 50, offset = 25
      expect(rects[2]).toEqual({ x: 25, y: 3, width: 30, height: 3 });
    });

    test("justifyContent end pushes items to end of each row", () => {
      const node = HStack(
        { width: 80, height: 24, flexWrap: "wrap", justifyContent: "end" },
        [
          VStack({ width: 30, height: 3 }, []),
          VStack({ width: 30, height: 3 }, []),
          VStack({ width: 30, height: 3 }, []),
        ],
      );
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Row 1: 30+30 = 60, remaining = 20, offset = 20
      expect(rects[0]).toEqual({ x: 20, y: 0, width: 30, height: 3 });
      expect(rects[1]).toEqual({ x: 50, y: 0, width: 30, height: 3 });
      // Row 2: 30, remaining = 50, offset = 50
      expect(rects[2]).toEqual({ x: 50, y: 3, width: 30, height: 3 });
    });

    test("justifyContent space-between distributes within each row", () => {
      const node = HStack(
        {
          width: 80,
          height: 24,
          flexWrap: "wrap",
          justifyContent: "space-between",
        },
        [
          VStack({ width: 20, height: 3 }, []),
          VStack({ width: 20, height: 3 }, []),
          VStack({ width: 20, height: 3 }, []),
          VStack({ width: 20, height: 3 }, []),
        ],
      );
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // All 4 fit: 20*4 = 80 — no wrapping needed
      // Remaining = 0 with space-between
      expect(item(rects, 0).x).toBe(0);
      expect(item(rects, 1).x).toBe(20);
      expect(item(rects, 2).x).toBe(40);
      expect(item(rects, 3).x).toBe(60);
    });

    test("wrapping HStack space-between ignores main-axis gap", () => {
      const node = HStack(
        {
          width: 25,
          height: 4,
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 4,
        },
        [
          VStack({ width: 6, height: 1 }, []),
          VStack({ width: 6, height: 1 }, []),
          VStack({ width: 6, height: 1 }, []),
        ],
      );
      const result = layout(node, 25, 4);
      const rects = childRects(result);

      expect(rects[0]).toEqual({ x: 0, y: 0, width: 6, height: 1 });
      expect(rects[1]).toEqual({ x: 10, y: 0, width: 6, height: 1 });
      expect(rects[2]).toEqual({ x: 19, y: 0, width: 6, height: 1 });
    });

    test("intrinsic height of wrapping HStack equals sum of row heights", () => {
      // HStack with no explicit height should size to fit all rows
      const node = VStack({ width: 80, height: 24 }, [
        HStack({ flexWrap: "wrap" }, [
          VStack({ width: 50, height: 3 }, []),
          VStack({ width: 50, height: 4 }, []),
        ]),
        Text("below"),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // HStack: row1 height=3, row2 height=4, total = 7
      expect(item(rects, 0).height).toBe(7);
      // Text below starts at y=7
      expect(item(rects, 1).y).toBe(7);
    });

    test("re-measures flex child height at its allocated row width", () => {
      const node = VStack({ width: 10 }, [
        HStack({ flexWrap: "wrap" }, [
          VStack({ width: 5, height: 1 }, []),
          VStack({ flex: 1 }, [Text("abcdefghij", { wrap: "word" })]),
        ]),
        Text("after"),
      ]);

      const result = layout(node, 10, 24);
      const wrappingRow = item(result.children, 0);
      const followingText = item(result.children, 1);
      const flexChild = item(wrappingRow.children, 1);

      expect(result.rect.height).toBe(3);
      expect(wrappingRow.rect.height).toBe(2);
      expect(flexChild.rect).toEqual({ x: 5, y: 0, width: 5, height: 2 });
      expect(item(flexChild.children, 0).rect.height).toBe(2);
      expect(followingText.rect.y).toBe(2);
    });

    test("uses constrained flex widths when measuring wrapped row height", () => {
      const node = VStack({ width: 12 }, [
        HStack({ flexWrap: "wrap", alignItems: "start" }, [
          VStack({ width: 4, height: 1 }, []),
          VStack({ flex: 1, minWidth: 6 }, [
            Text("abcdefghijkl", { wrap: "word" }),
          ]),
          VStack({ flex: 1, maxWidth: 2 }, [Text("abcdef", { wrap: "word" })]),
        ]),
        Text("after"),
      ]);

      const result = layout(node, 12, 24);
      const wrappingRow = item(result.children, 0);

      expect(wrappingRow.children.map((child) => child.rect.width)).toEqual([
        4, 6, 2,
      ]);
      expect(wrappingRow.children.map((child) => child.rect.height)).toEqual([
        1, 2, 3,
      ]);
      expect(wrappingRow.rect.height).toBe(3);
      expect(item(result.children, 1).rect.y).toBe(3);
    });

    test("uses percentage widths when measuring wrapped row height", () => {
      const node = VStack({ width: 10 }, [
        HStack({ flexWrap: "wrap", alignItems: "start" }, [
          VStack({ width: "50%" }, [Text("abcdefghij", { wrap: "word" })]),
          VStack({ flex: 1 }, [Text("klmnopqrst", { wrap: "word" })]),
        ]),
        Text("after"),
      ]);

      const result = layout(node, 10, 24);
      const wrappingRow = item(result.children, 0);

      expect(wrappingRow.children.map((child) => child.rect.width)).toEqual([
        5, 5,
      ]);
      expect(wrappingRow.children.map((child) => child.rect.height)).toEqual([
        2, 2,
      ]);
      expect(wrappingRow.rect.height).toBe(2);
      expect(item(result.children, 1).rect.y).toBe(2);
    });

    test("intrinsic height with gap includes gaps between rows", () => {
      const node = VStack({ width: 80, height: 24 }, [
        HStack({ flexWrap: "wrap", gap: 1 }, [
          VStack({ width: 80, height: 2 }, []),
          VStack({ width: 80, height: 3 }, []),
        ]),
        Text("below"),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Two rows: 2 + gap(1) + 3 = 6
      expect(item(rects, 0).height).toBe(6);
      expect(item(rects, 1).y).toBe(6);
    });

    test("Text children wrap based on intrinsic width", () => {
      // Text nodes have intrinsic width. They should wrap like other nodes.
      const node = HStack({ width: 20, height: 10, flexWrap: "wrap" }, [
        Text("hello"), // width 5
        Text("world"), // width 5
        Text("this is long text"), // width 17
      ]);
      const result = layout(node, 20, 10);
      const rects = childRects(result);
      // Row 1: "hello"(5) + "world"(5) = 10 ≤ 20 ✓
      //         + "this is long text"(17) = 27 > 20 ✗
      // Row 2: "this is long text"
      expect(item(rects, 0).y).toBe(0);
      expect(item(rects, 1).y).toBe(0);
      expect(item(rects, 2).y).toBe(1); // second row
      expect(item(rects, 0).x).toBe(0);
      expect(item(rects, 1).x).toBe(5);
      expect(item(rects, 2).x).toBe(0);
    });

    test("single child wider than container gets its own row", () => {
      const node = HStack({ width: 40, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 20, height: 3 }, []),
        VStack({ width: 50, height: 4 }, []), // wider than container
        VStack({ width: 20, height: 2 }, []),
      ]);
      const result = layout(node, 40, 24);
      const rects = childRects(result);
      // Row 1: child0 (20 ≤ 40)
      // child1 (20+50 > 40, starts new row)
      // Row 2: child1 (50 > 40, but it's the first item so it goes on this row)
      // Row 3: child2 (50+20 > 40, new row)
      expect(item(rects, 0).y).toBe(0);
      expect(item(rects, 1).y).toBe(3); // after row 1 (height 3)
      expect(item(rects, 2).y).toBe(7); // after row 2 (height 4)
    });

    test("empty HStack with flexWrap produces no children", () => {
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, []);
      const result = layout(node, 80, 24);
      expect(result.children).toEqual([]);
    });

    test("single child in wrapping HStack", () => {
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ width: 30, height: 5 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      expect(rects[0]).toEqual({ x: 0, y: 0, width: 30, height: 5 });
    });

    test("flexWrap on VStack is ignored (treated as nowrap)", () => {
      // flexWrap is only meaningful on HStack per the spec
      const node = VStack({ width: 80, height: 10, flexWrap: "wrap" }, [
        VStack({ height: 4 }, []),
        VStack({ height: 4 }, []),
        VStack({ height: 4 }, []),
      ]);
      const result = layout(node, 80, 10);
      const rects = childRects(result);
      // Normal VStack behavior — children stack vertically, overflow
      expect(item(rects, 0).y).toBe(0);
      expect(item(rects, 1).y).toBe(4);
      expect(item(rects, 2).y).toBe(8);
    });

    test("nested wrapping HStack inside VStack", () => {
      const node = VStack({ width: 60, height: 24 }, [
        Text("Title"),
        HStack({ flexWrap: "wrap", gap: 1 }, [
          VStack({ width: 25, height: 2 }, []),
          VStack({ width: 25, height: 2 }, []),
          VStack({ width: 25, height: 2 }, []),
        ]),
        Text("Footer"),
      ]);
      const result = layout(node, 60, 24);
      const rects = childRects(result);

      // Title at y=0, height=1
      expect(item(rects, 0).y).toBe(0);
      expect(item(rects, 0).height).toBe(1);

      // HStack at y=1
      // Row 1: 25 + 1 + 25 = 51 ≤ 60, + 1 + 25 = 77 > 60
      // Row 2: 25
      // HStack height = 2 + 1 + 2 = 5
      expect(item(rects, 1).y).toBe(1);
      expect(item(rects, 1).height).toBe(5);

      // Footer at y=6
      expect(item(rects, 2).y).toBe(6);

      // Verify HStack's children
      const hstackChildren = item(result.children, 1).children;
      expect(item(hstackChildren, 0).rect).toEqual({
        x: 0,
        y: 1,
        width: 25,
        height: 2,
      });
      expect(item(hstackChildren, 1).rect).toEqual({
        x: 26,
        y: 1,
        width: 25,
        height: 2,
      });
      expect(item(hstackChildren, 2).rect).toEqual({
        x: 0,
        y: 4,
        width: 25,
        height: 2,
      });
    });

    test("constraints apply to children in wrapped rows", () => {
      const node = HStack({ width: 80, height: 24, flexWrap: "wrap" }, [
        VStack({ flex: 1, minWidth: 30, height: 3 }, []),
        VStack({ flex: 1, minWidth: 30, height: 3 }, []),
        VStack({ flex: 1, minWidth: 30, height: 3 }, []),
      ]);
      const result = layout(node, 80, 24);
      const rects = childRects(result);
      // Flex children: need to decide row membership based on min sizes
      // Each has minWidth 30. Three at 30 = 90 > 80, so wrapping occurs.
      // Row 1: child0 + child1 at minWidth 30 each = 60 ≤ 80
      //   Remaining = 80 - 0 (no fixed) = 80, shared between 2 flex → 40 each
      //   Both ≥ 30 ✓
      // Row 2: child2 → gets full 80
      expect(item(rects, 0).width).toBe(40);
      expect(item(rects, 1).width).toBe(40);
      expect(item(rects, 2).y).toBe(3);
      expect(item(rects, 2).width).toBe(80);
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
      const mainChildren = item(result.children, 1).children;
      expect(item(mainChildren, 0).rect).toEqual({
        x: 20,
        y: 0,
        width: 60,
        height: 1,
      });
      expect(item(mainChildren, 1).rect).toEqual({
        x: 20,
        y: 1,
        width: 60,
        height: 22,
      });
      expect(item(mainChildren, 2).rect).toEqual({
        x: 20,
        y: 23,
        width: 60,
        height: 1,
      });
    });
  });

  describe("cross-axis constraints", () => {
    test("maxHeight on child in HStack is respected", () => {
      const node = HStack({ width: 40, height: 10 }, [
        VStack({ flex: 1, maxHeight: 3 }, [Text("hello")]),
      ]);
      const result = layout(node, 80, 24);
      expect(childRects(result)).toEqual([
        { x: 0, y: 0, width: 40, height: 3 },
      ]);
    });

    test("minHeight on child in HStack is respected", () => {
      const node = HStack({ width: 40, height: 10, alignItems: "start" }, [
        VStack({ flex: 1, minHeight: 5 }, [Text("hi")]),
      ]);
      const result = layout(node, 80, 24);
      // Intrinsic height of VStack containing "hi" is 1, but minHeight is 5
      expect(item(childRects(result), 0).height).toBe(5);
    });

    test("maxWidth on child in VStack is respected", () => {
      const node = VStack({ width: 40, height: 10 }, [
        HStack({ flex: 1, maxWidth: 20 }, [Text("x")]),
      ]);
      const result = layout(node, 80, 24);
      expect(item(childRects(result), 0).width).toBe(20);
    });

    test("TextInput maxHeight in HStack creates autogrowing input", () => {
      // Nest HStack in VStack so HStack gets intrinsic height
      // Empty value → height 1
      const node1 = VStack({ width: 80, height: 24 }, [
        HStack({}, [
          TextInput({
            flex: 1,
            maxHeight: 5,
            value: "",
            onChange: () => {},
          }),
        ]),
        Text("after"),
      ]);
      const r1 = layout(node1, 80, 24);
      expect(item(r1.children, 0).rect.height).toBe(1);
      expect(item(item(r1.children, 0).children, 0).rect.height).toBe(1);

      // Multi-line value → grows to content height
      const node2 = VStack({ width: 80, height: 24 }, [
        HStack({}, [
          TextInput({
            flex: 1,
            maxHeight: 5,
            value: "line1\nline2\nline3",
            onChange: () => {},
          }),
        ]),
        Text("after"),
      ]);
      const r2 = layout(node2, 80, 24);
      expect(item(r2.children, 0).rect.height).toBe(3);
      expect(item(item(r2.children, 0).children, 0).rect.height).toBe(3);

      // Many lines → capped at maxHeight
      const node3 = VStack({ width: 80, height: 24 }, [
        HStack({}, [
          TextInput({
            flex: 1,
            maxHeight: 5,
            value: "1\n2\n3\n4\n5\n6\n7\n8",
            onChange: () => {},
          }),
        ]),
        Text("after"),
      ]);
      const r3 = layout(node3, 80, 24);
      expect(item(r3.children, 0).rect.height).toBe(5);
      expect(item(item(r3.children, 0).children, 0).rect.height).toBe(5);
    });

    test("cross-axis constraints in intrinsic container sizing", () => {
      // HStack with no explicit height, child has maxHeight:
      // HStack intrinsic height should respect child's maxHeight
      const node = VStack({ width: 80, height: 24 }, [
        HStack({}, [
          TextInput({
            flex: 1,
            maxHeight: 3,
            value: "1\n2\n3\n4\n5",
            onChange: () => {},
          }),
        ]),
        Text("after"),
      ]);
      const result = layout(node, 80, 24);
      // HStack should be 3 tall (capped by TextInput's maxHeight)
      expect(item(result.children, 0).rect.height).toBe(3);
      // Text "after" should be right after it
      expect(item(result.children, 1).rect.y).toBe(3);
    });
  });

  describe("measureContentHeight", () => {
    test("wrapped Text returns the visual line count for the provided width", () => {
      // Arrange
      const node = Text("foo bar baz", { wrap: "word" });

      // Act
      const height = measureContentHeight(node, { width: 6 });

      // Assert
      expect(height).toBe(3);
    });

    test("padded VStack accounts for its own padding when measuring children", () => {
      // Arrange
      const node = VStack({ padding: { x: 1, y: 1 }, gap: 1 }, [
        Text("foo bar", { wrap: "word" }),
        Text("baz"),
      ]);

      // Act
      const height = measureContentHeight(node, { width: 8 });

      // Assert
      expect(height).toBe(6);
    });

    test("wrapping HStack returns the sum of row heights plus row gaps", () => {
      // Arrange
      const node = HStack({ flexWrap: "wrap", gap: 1 }, [
        VStack({ width: 5, height: 2 }, []),
        VStack({ width: 5, height: 3 }, []),
        VStack({ width: 5, height: 4 }, []),
      ]);

      // Act
      const height = measureContentHeight(node, { width: 11 });

      // Assert
      expect(height).toBe(8);
    });

    test("TextInput returns wrapped content height including its own padding", () => {
      // Arrange
      const node = TextInput({
        padding: { x: 1, y: 1 },
        value: "foo bar baz",
        onChange: () => {},
      });

      // Act
      const height = measureContentHeight(node, { width: 8 });

      // Assert
      expect(height).toBe(5);
    });

    test("explicit root height does not limit the measured content height", () => {
      // Arrange
      const node = VStack({ height: 1 }, [
        Text("line 1"),
        Text("line 2"),
        Text("line 3"),
      ]);

      // Act
      const height = measureContentHeight(node, { width: 10 });

      // Assert
      expect(height).toBe(3);
    });

    test("caller-provided width overrides the measured root width prop", () => {
      // Arrange
      const node = VStack({ width: 10 }, [
        Text("foo bar baz", { wrap: "word" }),
      ]);

      // Act
      const height = measureContentHeight(node, { width: 100 });

      // Assert
      expect(height).toBe(1);
    });
  });
});
