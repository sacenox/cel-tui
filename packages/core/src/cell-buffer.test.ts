import { describe, expect, test } from "bun:test";
import { CellBuffer, type Cell, EMPTY_CELL } from "./cell-buffer.js";

describe("CellBuffer", () => {
  describe("creation", () => {
    test("creates buffer with correct dimensions", () => {
      const buf = new CellBuffer(80, 24);
      expect(buf.width).toBe(80);
      expect(buf.height).toBe(24);
    });

    test("all cells start empty", () => {
      const buf = new CellBuffer(3, 2);
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 3; x++) {
          expect(buf.get(x, y)).toEqual(EMPTY_CELL);
        }
      }
    });

    test("zero dimensions", () => {
      const buf = new CellBuffer(0, 0);
      expect(buf.width).toBe(0);
      expect(buf.height).toBe(0);
    });
  });

  describe("get/set", () => {
    test("write and read a cell", () => {
      const buf = new CellBuffer(10, 5);
      const cell: Cell = {
        char: "A",
        fgColor: "color01",
        bgColor: null,
        bold: true,
        italic: false,
        underline: false,
      };
      buf.set(3, 2, cell);
      expect(buf.get(3, 2)).toEqual(cell);
    });

    test("out-of-bounds get returns empty cell", () => {
      const buf = new CellBuffer(5, 5);
      expect(buf.get(-1, 0)).toEqual(EMPTY_CELL);
      expect(buf.get(5, 0)).toEqual(EMPTY_CELL);
      expect(buf.get(0, -1)).toEqual(EMPTY_CELL);
      expect(buf.get(0, 5)).toEqual(EMPTY_CELL);
    });

    test("out-of-bounds set is a no-op", () => {
      const buf = new CellBuffer(5, 5);
      const cell: Cell = {
        char: "X",
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      };
      buf.set(-1, 0, cell);
      buf.set(5, 0, cell);
      buf.set(0, -1, cell);
      buf.set(0, 5, cell);
      // Should not throw, buffer unchanged
      expect(buf.get(0, 0)).toEqual(EMPTY_CELL);
    });

    test("overwrite existing cell", () => {
      const buf = new CellBuffer(5, 5);
      buf.set(0, 0, {
        char: "A",
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
      buf.set(0, 0, {
        char: "B",
        fgColor: "color04",
        bgColor: null,
        bold: true,
        italic: false,
        underline: false,
      });
      expect(buf.get(0, 0).char).toBe("B");
      expect(buf.get(0, 0).fgColor).toBe("color04");
    });
  });

  describe("clear", () => {
    test("resets all cells to empty", () => {
      const buf = new CellBuffer(3, 3);
      buf.set(1, 1, {
        char: "X",
        fgColor: "color01",
        bgColor: null,
        bold: true,
        italic: false,
        underline: false,
      });
      buf.clear();
      expect(buf.get(1, 1)).toEqual(EMPTY_CELL);
    });
  });

  describe("resize", () => {
    test("grows buffer, new cells are empty", () => {
      const buf = new CellBuffer(3, 3);
      buf.set(1, 1, {
        char: "A",
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
      buf.resize(5, 5);
      expect(buf.width).toBe(5);
      expect(buf.height).toBe(5);
      expect(buf.get(1, 1).char).toBe("A");
      expect(buf.get(4, 4)).toEqual(EMPTY_CELL);
    });

    test("shrinks buffer, clips content", () => {
      const buf = new CellBuffer(5, 5);
      buf.set(4, 4, {
        char: "X",
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
      buf.resize(3, 3);
      expect(buf.width).toBe(3);
      expect(buf.height).toBe(3);
      expect(buf.get(4, 4)).toEqual(EMPTY_CELL); // out of bounds now
    });
  });

  describe("fill", () => {
    test("fills a rectangular region", () => {
      const buf = new CellBuffer(5, 5);
      const cell: Cell = {
        char: "#",
        fgColor: "color02",
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      };
      buf.fill(1, 1, 3, 2, cell);
      expect(buf.get(1, 1)).toEqual(cell);
      expect(buf.get(2, 1)).toEqual(cell);
      expect(buf.get(3, 1)).toEqual(cell);
      expect(buf.get(1, 2)).toEqual(cell);
      expect(buf.get(3, 2)).toEqual(cell);
      // Outside the fill region
      expect(buf.get(0, 0)).toEqual(EMPTY_CELL);
      expect(buf.get(4, 3)).toEqual(EMPTY_CELL);
    });

    test("clips to buffer bounds", () => {
      const buf = new CellBuffer(3, 3);
      const cell: Cell = {
        char: "X",
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      };
      // Fill extends beyond bounds — should not throw
      buf.fill(1, 1, 5, 5, cell);
      expect(buf.get(1, 1)).toEqual(cell);
      expect(buf.get(2, 2)).toEqual(cell);
    });
  });

  describe("diff", () => {
    test("identical buffers produce no changes", () => {
      const a = new CellBuffer(3, 3);
      const b = new CellBuffer(3, 3);
      expect(a.diff(b)).toEqual([]);
    });

    test("detects changed cells", () => {
      const a = new CellBuffer(3, 3);
      const b = new CellBuffer(3, 3);
      b.set(1, 1, {
        char: "X",
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
      const changes = a.diff(b);
      expect(changes).toEqual([{ x: 1, y: 1 }]);
    });

    test("detects multiple changes", () => {
      const a = new CellBuffer(3, 3);
      const b = new CellBuffer(3, 3);
      b.set(0, 0, {
        char: "A",
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
      b.set(2, 2, {
        char: "B",
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
      const changes = a.diff(b);
      expect(changes).toHaveLength(2);
      expect(changes).toContainEqual({ x: 0, y: 0 });
      expect(changes).toContainEqual({ x: 2, y: 2 });
    });

    test("detects style-only changes", () => {
      const a = new CellBuffer(3, 3);
      const b = new CellBuffer(3, 3);
      a.set(0, 0, {
        char: "X",
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
      b.set(0, 0, {
        char: "X",
        fgColor: "color01",
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
      expect(a.diff(b)).toEqual([{ x: 0, y: 0 }]);
    });
  });

  describe("isEmpty", () => {
    test("empty cell is transparent", () => {
      const buf = new CellBuffer(3, 3);
      expect(buf.isEmpty(0, 0)).toBe(true);
    });

    test("non-empty cell is not transparent", () => {
      const buf = new CellBuffer(3, 3);
      buf.set(1, 1, {
        char: "X",
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
      expect(buf.isEmpty(1, 1)).toBe(false);
    });

    test("space with background is not transparent", () => {
      const buf = new CellBuffer(3, 3);
      buf.set(0, 0, {
        char: " ",
        fgColor: null,
        bgColor: "color04",
        bold: false,
        italic: false,
        underline: false,
      });
      expect(buf.isEmpty(0, 0)).toBe(false);
    });
  });
});
