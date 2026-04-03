import { describe, expect, test } from "bun:test";
import { CellBuffer } from "./cell-buffer.js";
import { layout } from "./layout.js";
import { paint } from "./paint.js";
import { VStack, HStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";

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
      // \u4e16 at col 0 (wide), \u754c at col 2 (wide)
      expect(buf.get(0, 0).char).toBe("\u4e16");
      expect(buf.get(2, 0).char).toBe("\u754c");
    });

    test("emoji occupies 2 cells", () => {
      const node = VStack({ width: 20, height: 1 }, [Text("\ud83d\ude00x")]);
      const ln = layout(node, 20, 1);
      const buf = new CellBuffer(20, 1);
      paint(ln, buf);
      // emoji at col 0 (wide), x at col 2
      expect(buf.get(0, 0).char).toBe("\ud83d\ude00");
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
});
