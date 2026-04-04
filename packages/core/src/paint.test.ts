import { describe, expect, test } from "bun:test";
import { CellBuffer } from "./cell-buffer.js";
import { layout } from "./layout.js";
import { paint } from "./paint.js";
import { VStack, HStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";

/** Read a row from the buffer as a string (trimming trailing spaces). */
function readRow(buf: CellBuffer, y: number): string {
  let row = "";
  for (let x = 0; x < buf.width; x++) {
    row += buf.get(x, y).char;
  }
  return row.trimEnd();
}

/** Read all rows as strings. */
function readAll(buf: CellBuffer): string[] {
  const rows: string[] = [];
  for (let y = 0; y < buf.height; y++) {
    rows.push(readRow(buf, y));
  }
  return rows;
}

describe("paint", () => {
  describe("Text rendering", () => {
    test("paints text at correct position", () => {
      const node = VStack({ width: 20, height: 3 }, [Text("Hello")]);
      const ln = layout(node, 20, 3);
      const buf = new CellBuffer(20, 3);
      paint(ln, buf);
      expect(readRow(buf, 0)).toBe("Hello");
    });

    test("clips text at rect boundary", () => {
      const node = VStack({ width: 5, height: 1 }, [Text("Hello, world!")]);
      const ln = layout(node, 5, 1);
      const buf = new CellBuffer(5, 1);
      paint(ln, buf);
      expect(readRow(buf, 0)).toBe("Hello");
    });

    test("paints multiline text from newlines", () => {
      const node = VStack({ width: 20, height: 5 }, [
        Text("line1\nline2\nline3"),
      ]);
      const ln = layout(node, 20, 5);
      const buf = new CellBuffer(20, 5);
      paint(ln, buf);
      expect(readRow(buf, 0)).toBe("line1");
      expect(readRow(buf, 1)).toBe("line2");
      expect(readRow(buf, 2)).toBe("line3");
    });

    test("repeat fill fills the width", () => {
      const node = VStack({ width: 10, height: 1 }, [
        Text("-", { repeat: "fill" }),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);
      expect(readRow(buf, 0)).toBe("----------");
    });

    test("repeat number repeats exact count", () => {
      const node = VStack({ width: 20, height: 1 }, [
        Text("ab", { repeat: 3 }),
      ]);
      const ln = layout(node, 20, 1);
      const buf = new CellBuffer(20, 1);
      paint(ln, buf);
      expect(readRow(buf, 0)).toBe("ababab");
    });

    test("applies foreground color", () => {
      const node = VStack({ width: 10, height: 1 }, [
        Text("Hi", { fgColor: "red" }),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);
      expect(buf.get(0, 0).fgColor).toBe("red");
      expect(buf.get(1, 0).fgColor).toBe("red");
    });

    test("applies background color", () => {
      const node = VStack({ width: 10, height: 1 }, [
        Text("Hi", { bgColor: "blue" }),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);
      expect(buf.get(0, 0).bgColor).toBe("blue");
    });

    test("applies bold/italic/underline", () => {
      const node = VStack({ width: 10, height: 1 }, [
        Text("X", { bold: true, italic: true, underline: true }),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);
      const cell = buf.get(0, 0);
      expect(cell.bold).toBe(true);
      expect(cell.italic).toBe(true);
      expect(cell.underline).toBe(true);
    });
  });

  describe("layout-driven positioning", () => {
    test("VStack children paint at correct vertical positions", () => {
      const node = VStack({ width: 20, height: 10 }, [
        Text("Header"),
        Text("Body"),
      ]);
      const ln = layout(node, 20, 10);
      const buf = new CellBuffer(20, 10);
      paint(ln, buf);
      expect(readRow(buf, 0)).toBe("Header");
      expect(readRow(buf, 1)).toBe("Body");
    });

    test("HStack children paint at correct horizontal positions", () => {
      const node = HStack({ width: 20, height: 1 }, [
        VStack({ width: 8 }, [Text("Left")]),
        VStack({ width: 12 }, [Text("Right")]),
      ]);
      const ln = layout(node, 20, 1);
      const buf = new CellBuffer(20, 1);
      paint(ln, buf);
      expect(readRow(buf, 0)).toBe("Left    Right");
    });

    test("flex children fill space correctly", () => {
      const node = HStack({ width: 20, height: 1 }, [
        VStack({ width: 5 }, [Text("A")]),
        VStack({ flex: 1 }, [Text("B")]),
      ]);
      const ln = layout(node, 20, 1);
      const buf = new CellBuffer(20, 1);
      paint(ln, buf);
      expect(buf.get(0, 0).char).toBe("A");
      expect(buf.get(5, 0).char).toBe("B");
    });

    test("padding offsets children", () => {
      const node = VStack({ width: 20, height: 5, padding: { x: 2, y: 1 } }, [
        Text("Hi"),
      ]);
      const ln = layout(node, 20, 5);
      const buf = new CellBuffer(20, 5);
      paint(ln, buf);
      // Row 0 should be empty (padding), text starts at row 1, col 2
      expect(readRow(buf, 0)).toBe("");
      expect(buf.get(2, 1).char).toBe("H");
      expect(buf.get(3, 1).char).toBe("i");
    });
  });

  describe("wide character rendering", () => {
    test("CJK characters occupy 2 cells each", () => {
      const node = VStack({ width: 20, height: 1 }, [Text("\u4e16\u754c")]);
      const ln = layout(node, 20, 1);
      const buf = new CellBuffer(20, 1);
      paint(ln, buf);
      // \u4e16 at col 0 (wide), continuation at col 1, \u754c at col 2 (wide), continuation at col 3
      expect(buf.get(0, 0).char).toBe("\u4e16");
      expect(buf.get(1, 0).char).toBe(""); // continuation marker
      expect(buf.get(2, 0).char).toBe("\u754c");
      expect(buf.get(3, 0).char).toBe(""); // continuation marker
    });

    test("emoji occupies 2 cells", () => {
      const node = VStack({ width: 20, height: 1 }, [Text("\ud83d\ude00x")]);
      const ln = layout(node, 20, 1);
      const buf = new CellBuffer(20, 1);
      paint(ln, buf);
      // emoji at col 0 (wide), continuation at col 1, x at col 2
      expect(buf.get(0, 0).char).toBe("\ud83d\ude00");
      expect(buf.get(1, 0).char).toBe(""); // continuation marker
      expect(buf.get(2, 0).char).toBe("x");
    });

    test("repeat fill with CJK char fills by visible width", () => {
      const node = VStack({ width: 6, height: 1 }, [
        Text("\u4e16", { repeat: "fill" }), // width 2, fills 6 cols = 3 repeats
      ]);
      const ln = layout(node, 6, 1);
      const buf = new CellBuffer(6, 1);
      paint(ln, buf);
      expect(buf.get(0, 0).char).toBe("\u4e16");
      expect(buf.get(2, 0).char).toBe("\u4e16");
      expect(buf.get(4, 0).char).toBe("\u4e16");
    });

    test("mixed ASCII and CJK paints at correct positions", () => {
      const node = VStack({ width: 20, height: 1 }, [Text("hi\u4e16\u754c")]);
      const ln = layout(node, 20, 1);
      const buf = new CellBuffer(20, 1);
      paint(ln, buf);
      expect(buf.get(0, 0).char).toBe("h");
      expect(buf.get(1, 0).char).toBe("i");
      expect(buf.get(2, 0).char).toBe("\u4e16");
      expect(buf.get(4, 0).char).toBe("\u754c");
    });

    test("CJK text clips at rect boundary", () => {
      // \u4e16(2) + \u754c(2) = 4, but rect is 3 wide \u2192 clip \u754c
      const node = VStack({ width: 3, height: 1 }, [Text("\u4e16\u754c")]);
      const ln = layout(node, 3, 1);
      const buf = new CellBuffer(3, 1);
      paint(ln, buf);
      expect(buf.get(0, 0).char).toBe("\u4e16");
      // col 2 should be empty - \u754c doesn't fit (needs 2 cols, only 1 remains)
      expect(buf.get(2, 0).char).toBe(" ");
    });
  });

  describe("overflow clipping", () => {
    test("text extending beyond container width is clipped", () => {
      // Container is 5 wide, child text is longer
      const node = VStack({ width: 5, height: 3 }, [
        VStack({ width: 5, height: 1 }, [Text("HelloWorld")]),
      ]);
      const ln = layout(node, 10, 3);
      const buf = new CellBuffer(10, 3);
      paint(ln, buf);
      // Only "Hello" should appear, "World" clipped by container
      expect(readRow(buf, 0)).toBe("Hello");
    });

    test("child positioned outside parent bounds is clipped", () => {
      // Parent is 10 wide, 3 tall. Two children each 2 tall = 4 total.
      // Second child overflows vertically.
      const node = VStack({ width: 10, height: 3 }, [
        VStack({ height: 2 }, [Text("AA")]),
        VStack({ height: 2 }, [Text("BB")]),
      ]);
      const ln = layout(node, 10, 3);
      const buf = new CellBuffer(10, 5);
      paint(ln, buf);
      expect(readRow(buf, 0)).toBe("AA");
      expect(readRow(buf, 2)).toBe("BB");
      // Row 3 is outside the parent (height=3), second line of "BB" child
      // would be at y=3 but should be clipped
      expect(readRow(buf, 3)).toBe("");
    });

    test("nested containers clip to innermost parent", () => {
      // Outer 10x3, inner 5x2 at position (0,0)
      // Text inside inner is long
      const node = VStack({ width: 10, height: 3 }, [
        VStack({ width: 5, height: 2 }, [Text("LongTextHere")]),
      ]);
      const ln = layout(node, 10, 3);
      const buf = new CellBuffer(10, 3);
      paint(ln, buf);
      // Clipped to inner container width of 5
      expect(readRow(buf, 0)).toBe("LongT");
    });

    test("HStack children clipped horizontally by parent", () => {
      const node = HStack({ width: 8, height: 1 }, [
        VStack({ width: 5 }, [Text("AAAAA")]),
        VStack({ width: 5 }, [Text("BBBBB")]),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);
      // First child fills 0-4 ("AAAAA"), second starts at 5
      // But parent is only 8 wide, so second child clipped at col 8
      expect(readRow(buf, 0)).toBe("AAAAABBB");
    });

    test("deeply nested clipping", () => {
      const node = VStack({ width: 6, height: 2 }, [
        HStack({}, [VStack({ width: 10 }, [Text("TooWide!!!")])]),
      ]);
      const ln = layout(node, 10, 2);
      const buf = new CellBuffer(10, 2);
      paint(ln, buf);
      // Should be clipped to outermost container width of 6
      expect(readRow(buf, 0)).toBe("TooWid");
    });
  });

  describe("scroll rendering", () => {
    test("VStack with overflow scroll and scrollOffset offsets children vertically", () => {
      const node = VStack(
        { width: 10, height: 3, overflow: "scroll", scrollOffset: 1 },
        [
          Text("line0"),
          Text("line1"),
          Text("line2"),
          Text("line3"),
          Text("line4"),
        ],
      );
      const ln = layout(node, 10, 3);
      const buf = new CellBuffer(10, 5);
      paint(ln, buf);
      // scrollOffset=1 means first visible line is line1
      expect(readRow(buf, 0)).toBe("line1");
      expect(readRow(buf, 1)).toBe("line2");
      expect(readRow(buf, 2)).toBe("line3");
      // Row 3 should be empty (outside container)
      expect(readRow(buf, 3)).toBe("");
    });

    test("scrollOffset 0 shows from the top", () => {
      const node = VStack(
        { width: 10, height: 2, overflow: "scroll", scrollOffset: 0 },
        [Text("first"), Text("second"), Text("third")],
      );
      const ln = layout(node, 10, 2);
      const buf = new CellBuffer(10, 3);
      paint(ln, buf);
      expect(readRow(buf, 0)).toBe("first");
      expect(readRow(buf, 1)).toBe("second");
      expect(readRow(buf, 2)).toBe("");
    });

    test("HStack with overflow scroll and scrollOffset offsets children horizontally", () => {
      const node = HStack(
        { width: 5, height: 1, overflow: "scroll", scrollOffset: 3 },
        [
          VStack({ width: 4 }, [Text("AAAA")]),
          VStack({ width: 4 }, [Text("BBBB")]),
          VStack({ width: 4 }, [Text("CCCC")]),
        ],
      );
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);
      // Total content width = 12, scrollOffset=3, viewport=5
      // Visible: cols 3-7 of content = "A" + "BBBB" → "ABBBB" but clipped to 5
      expect(readRow(buf, 0)).toBe("ABBBB");
    });

    test("scroll with scrollbar shows indicator", () => {
      const node = VStack(
        {
          width: 10,
          height: 4,
          overflow: "scroll",
          scrollOffset: 0,
          scrollbar: true,
        },
        [
          Text("line0"),
          Text("line1"),
          Text("line2"),
          Text("line3"),
          Text("line4"),
          Text("line5"),
          Text("line6"),
          Text("line7"),
        ],
      );
      const ln = layout(node, 10, 4);
      const buf = new CellBuffer(10, 4);
      paint(ln, buf);
      // Scrollbar should be in the last column (col 9)
      // Content height = 8, viewport = 4, scrollOffset = 0
      // Scrollbar thumb should be at top rows
      const lastCol = Array.from({ length: 4 }, (_, y) => buf.get(9, y).char);
      // At least one cell should have the scrollbar character
      expect(lastCol.some((c) => c !== " ")).toBe(true);
    });

    test("scroll clamps to max offset", () => {
      const node = VStack(
        { width: 10, height: 3, overflow: "scroll", scrollOffset: 99 },
        [Text("line0"), Text("line1"), Text("line2"), Text("line3")],
      );
      const ln = layout(node, 10, 5);
      const buf = new CellBuffer(10, 5);
      paint(ln, buf);
      // 4 items in 3-row viewport → max offset = 1
      // scrollOffset=99 is clamped to 1, so line1–line3 visible
      expect(readRow(buf, 0)).toBe("line1");
      expect(readRow(buf, 1)).toBe("line2");
      expect(readRow(buf, 2)).toBe("line3");
    });

    test("scroll clamps to 0 when content fits", () => {
      const node = VStack(
        { width: 10, height: 5, overflow: "scroll", scrollOffset: 10 },
        [Text("line0"), Text("line1")],
      );
      const ln = layout(node, 10, 5);
      const buf = new CellBuffer(10, 5);
      paint(ln, buf);
      // 2 items in 5-row viewport → max offset = 0
      // scrollOffset=10 clamped to 0
      expect(readRow(buf, 0)).toBe("line0");
      expect(readRow(buf, 1)).toBe("line1");
    });
  });

  describe("flexWrap rendering", () => {
    test("wrapping HStack paints children on multiple rows", () => {
      const node = HStack({ width: 10, height: 5, flexWrap: "wrap" }, [
        VStack({ width: 6 }, [Text("AAAAAA")]),
        VStack({ width: 6 }, [Text("BBBBBB")]),
      ]);
      const ln = layout(node, 10, 5);
      const buf = new CellBuffer(10, 5);
      paint(ln, buf);
      // Row 1: "AAAAAA" at y=0
      expect(readRow(buf, 0)).toBe("AAAAAA");
      // Row 2: "BBBBBB" at y=1
      expect(readRow(buf, 1)).toBe("BBBBBB");
    });

    test("wrapping HStack with gap paints correctly", () => {
      const node = HStack({ width: 12, height: 5, flexWrap: "wrap", gap: 1 }, [
        VStack({ width: 5 }, [Text("AAA")]),
        VStack({ width: 5 }, [Text("BBB")]),
        VStack({ width: 5 }, [Text("CCC")]),
      ]);
      const ln = layout(node, 12, 5);
      const buf = new CellBuffer(12, 5);
      paint(ln, buf);
      // Row 1: "AAA" at x=0, "BBB" at x=6 (5+gap1)
      // 5 + 1 + 5 = 11 ≤ 12, + 1 + 5 = 17 > 12
      expect(buf.get(0, 0).char).toBe("A");
      expect(buf.get(6, 0).char).toBe("B");
      // Row 2: "CCC" at x=0, y=1+gap(1)=2... or y depends on row height
      // Row height = 1 (Text is 1 line), gap between rows = 1
      // So row 2 at y=2
      expect(buf.get(0, 2).char).toBe("C");
    });

    test("wrapping HStack with bgColor fills all rows", () => {
      const node = HStack(
        { width: 10, height: 6, flexWrap: "wrap", bgColor: "blue" },
        [
          VStack({ width: 6, height: 2 }, []),
          VStack({ width: 6, height: 2 }, []),
        ],
      );
      const ln = layout(node, 10, 6);
      const buf = new CellBuffer(10, 6);
      paint(ln, buf);
      // Background should fill the entire HStack rect
      expect(buf.get(0, 0).bgColor).toBe("blue");
      expect(buf.get(9, 3).bgColor).toBe("blue");
    });

    test("wrapping HStack clips children to container bounds", () => {
      // Container is 10x3, wrapping creates rows beyond height
      const node = HStack({ width: 10, height: 3, flexWrap: "wrap" }, [
        VStack({ width: 10, height: 2 }, [Text("Row1")]),
        VStack({ width: 10, height: 2 }, [Text("Row2")]),
      ]);
      const ln = layout(node, 10, 3);
      const buf = new CellBuffer(10, 4);
      paint(ln, buf);
      // Row 1 at y=0, visible
      expect(readRow(buf, 0)).toBe("Row1");
      // Row 2 at y=2, first line visible (y=2 < height=3)
      expect(readRow(buf, 2)).toBe("Row2");
      // Row 2 second line at y=3, clipped (y=3 ≥ height=3)
      expect(readRow(buf, 3)).toBe("");
    });
  });

  describe("nested layout", () => {
    test("editor-like layout paints correctly", () => {
      const node = HStack({ width: 30, height: 5 }, [
        VStack({ width: 10 }, [Text("sidebar")]),
        VStack({ flex: 1 }, [
          VStack({ height: 1 }, [Text("tab bar")]),
          VStack({ flex: 1 }, [Text("editor")]),
          VStack({ height: 1 }, [Text("status")]),
        ]),
      ]);
      const ln = layout(node, 30, 5);
      const buf = new CellBuffer(30, 5);
      paint(ln, buf);

      // Sidebar at col 0
      expect(readRow(buf, 0).startsWith("sidebar")).toBe(true);
      // Tab bar at col 10, row 0
      expect(buf.get(10, 0).char).toBe("t");
      // Editor at col 10, row 1
      expect(buf.get(10, 1).char).toBe("e");
      // Status at col 10, row 4
      expect(buf.get(10, 4).char).toBe("s");
    });
  });

  describe("container background", () => {
    test("bgColor fills the container rect", () => {
      const node = VStack({ width: 5, height: 3, bgColor: "blue" }, []);
      const ln = layout(node, 5, 3);
      const buf = new CellBuffer(5, 3);
      paint(ln, buf);

      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 5; x++) {
          expect(buf.get(x, y).bgColor).toBe("blue");
        }
      }
    });

    test("bgColor fills behind child text", () => {
      const node = VStack({ width: 10, height: 3, bgColor: "blue" }, [
        Text("Hi"),
      ]);
      const ln = layout(node, 10, 3);
      const buf = new CellBuffer(10, 3);
      paint(ln, buf);

      // Text cells have the container background
      expect(buf.get(0, 0).char).toBe("H");
      expect(buf.get(0, 0).bgColor).toBe("blue");
      // Empty cells in the container also have the background
      expect(buf.get(5, 0).bgColor).toBe("blue");
      expect(buf.get(0, 2).bgColor).toBe("blue");
    });

    test("nested container bgColor only fills inner rect", () => {
      const node = VStack({ width: 10, height: 5 }, [
        VStack({ width: 6, height: 2, bgColor: "red" }, [Text("X")]),
      ]);
      const ln = layout(node, 10, 5);
      const buf = new CellBuffer(10, 5);
      paint(ln, buf);

      // Inner rect (0,0)-(5,1) has red background
      expect(buf.get(0, 0).bgColor).toBe("red");
      expect(buf.get(5, 1).bgColor).toBe("red");
      // Outside inner rect has no background
      expect(buf.get(7, 0).bgColor).toBeNull();
      expect(buf.get(0, 3).bgColor).toBeNull();
    });

    test("container without bgColor has no background fill", () => {
      const node = VStack({ width: 5, height: 3 }, [Text("Hi")]);
      const ln = layout(node, 5, 3);
      const buf = new CellBuffer(5, 3);
      paint(ln, buf);

      // Empty cells should have no bgColor
      expect(buf.get(4, 2).bgColor).toBeNull();
    });

    test("HStack bgColor fills its rect", () => {
      const node = HStack({ width: 8, height: 2, bgColor: "green" }, [
        VStack({ width: 4 }, [Text("AB")]),
      ]);
      const ln = layout(node, 8, 2);
      const buf = new CellBuffer(8, 2);
      paint(ln, buf);

      // All cells in the HStack rect have green background
      expect(buf.get(0, 0).bgColor).toBe("green");
      expect(buf.get(7, 1).bgColor).toBe("green");
    });
  });

  describe("style inheritance", () => {
    test("Text inherits fgColor from parent container", () => {
      const node = VStack({ width: 10, height: 1, fgColor: "red" }, [
        Text("hello"),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      expect(buf.get(0, 0).char).toBe("h");
      expect(buf.get(0, 0).fgColor).toBe("red");
    });

    test("Text inherits bgColor from parent container", () => {
      const node = VStack({ width: 10, height: 1, bgColor: "blue" }, [
        Text("hello"),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      expect(buf.get(0, 0).char).toBe("h");
      expect(buf.get(0, 0).bgColor).toBe("blue");
    });

    test("Text explicit fgColor overrides inherited", () => {
      const node = VStack({ width: 10, height: 1, fgColor: "red" }, [
        Text("hello", { fgColor: "green" }),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      expect(buf.get(0, 0).fgColor).toBe("green");
    });

    test("Text explicit bgColor overrides inherited", () => {
      const node = VStack({ width: 10, height: 1, bgColor: "blue" }, [
        Text("hello", { bgColor: "red" }),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      expect(buf.get(0, 0).bgColor).toBe("red");
    });

    test("nested container overrides outer fgColor", () => {
      const node = VStack({ width: 10, height: 2, fgColor: "red" }, [
        Text("outer"),
        VStack({ fgColor: "cyan" }, [Text("inner")]),
      ]);
      const ln = layout(node, 10, 2);
      const buf = new CellBuffer(10, 2);
      paint(ln, buf);

      expect(buf.get(0, 0).fgColor).toBe("red");
      expect(buf.get(0, 1).fgColor).toBe("cyan");
    });

    test("Text inherits bold from parent container", () => {
      const node = VStack({ width: 10, height: 1, bold: true }, [
        Text("hello"),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      expect(buf.get(0, 0).bold).toBe(true);
    });

    test("inheritance crosses multiple nesting levels", () => {
      const node = VStack({ width: 10, height: 1, fgColor: "red" }, [
        HStack({}, [VStack({}, [Text("deep")])]),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      expect(buf.get(0, 0).fgColor).toBe("red");
    });

    test("HStack inherits from parent VStack and propagates to children", () => {
      const node = VStack({ width: 20, height: 1, fgColor: "yellow" }, [
        HStack({}, [
          VStack({ width: 5 }, [Text("A")]),
          VStack({ width: 5 }, [Text("B", { fgColor: "blue" })]),
        ]),
      ]);
      const ln = layout(node, 20, 1);
      const buf = new CellBuffer(20, 1);
      paint(ln, buf);

      // A inherits yellow from root
      expect(buf.get(0, 0).fgColor).toBe("yellow");
      // B overrides with blue
      expect(buf.get(5, 0).fgColor).toBe("blue");
    });

    test("repeat fill text inherits styles from container", () => {
      const node = VStack(
        { width: 10, height: 1, fgColor: "red", bgColor: "blue" },
        [Text("-", { repeat: "fill" })],
      );
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      expect(buf.get(0, 0).char).toBe("-");
      expect(buf.get(0, 0).fgColor).toBe("red");
      expect(buf.get(0, 0).bgColor).toBe("blue");
    });

    test("TextInput inherits styles from parent container", () => {
      const node = VStack({ width: 10, height: 1, fgColor: "cyan" }, [
        TextInput({ value: "hi", onChange: () => {} }),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      expect(buf.get(0, 0).char).toBe("h");
      expect(buf.get(0, 0).fgColor).toBe("cyan");
    });

    test("TextInput placeholder inherits styles from parent container", () => {
      const node = VStack({ width: 10, height: 1, fgColor: "green" }, [
        TextInput({
          value: "",
          onChange: () => {},
          placeholder: Text("type..."),
        }),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      // Placeholder "type..." should inherit fgColor: "green" from parent VStack
      expect(buf.get(0, 0).char).toBe("t");
      expect(buf.get(0, 0).fgColor).toBe("green");
    });

    test("TextInput placeholder explicit style overrides inherited", () => {
      const node = VStack({ width: 10, height: 1, fgColor: "green" }, [
        TextInput({
          value: "",
          onChange: () => {},
          placeholder: Text("type...", { fgColor: "brightBlack" }),
        }),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      // Explicit fgColor on placeholder should win over inherited
      expect(buf.get(0, 0).char).toBe("t");
      expect(buf.get(0, 0).fgColor).toBe("brightBlack");
    });
  });

  describe("focusStyle", () => {
    test("container with focused=true applies focusStyle bgColor", () => {
      const node = VStack({ width: 10, height: 3 }, [
        HStack(
          {
            onClick: () => {},
            focused: true,
            bgColor: "black",
            focusStyle: { bgColor: "cyan" },
          },
          [Text("Btn")],
        ),
      ]);
      const ln = layout(node, 10, 3);
      const buf = new CellBuffer(10, 3);
      paint(ln, buf);

      // The focused element's bgColor should be overridden to cyan
      expect(buf.get(0, 0).bgColor).toBe("cyan");
    });

    test("focusStyle fgColor is inherited by child Text", () => {
      const node = VStack({ width: 10, height: 1 }, [
        HStack(
          {
            onClick: () => {},
            focused: true,
            fgColor: "white",
            focusStyle: { fgColor: "black" },
          },
          [Text("Btn")],
        ),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      // Text should inherit the focusStyle fgColor
      expect(buf.get(0, 0).char).toBe("B");
      expect(buf.get(0, 0).fgColor).toBe("black");
    });

    test("container with focused=false uses normal style", () => {
      const node = VStack({ width: 10, height: 1 }, [
        HStack(
          {
            onClick: () => {},
            focused: false,
            bgColor: "black",
            fgColor: "white",
            focusStyle: { bgColor: "cyan", fgColor: "black" },
          },
          [Text("Btn")],
        ),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      // Not focused — normal styles apply
      expect(buf.get(0, 0).bgColor).toBe("black");
      expect(buf.get(0, 0).fgColor).toBe("white");
    });

    test("Text explicit fgColor overrides focusStyle inheritance", () => {
      const node = VStack({ width: 10, height: 1 }, [
        HStack(
          {
            onClick: () => {},
            focused: true,
            fgColor: "white",
            focusStyle: { fgColor: "black" },
          },
          [Text("Btn", { fgColor: "red" })],
        ),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      // Text's explicit fgColor wins over focusStyle inheritance
      expect(buf.get(0, 0).fgColor).toBe("red");
    });

    test("focusStyle with no focused prop uses normal style", () => {
      const node = VStack({ width: 10, height: 1 }, [
        HStack(
          {
            onClick: () => {},
            bgColor: "black",
            focusStyle: { bgColor: "cyan" },
          },
          [Text("Btn")],
        ),
      ]);
      const ln = layout(node, 10, 1);
      const buf = new CellBuffer(10, 1);
      paint(ln, buf);

      // No focused prop — normal style applies
      expect(buf.get(0, 0).bgColor).toBe("black");
    });
  });
});
