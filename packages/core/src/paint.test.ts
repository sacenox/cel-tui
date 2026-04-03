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
