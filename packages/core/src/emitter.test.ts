import { describe, expect, test } from "bun:test";
import { CellBuffer, type Cell } from "./cell-buffer.js";
import { emitBuffer } from "./emitter.js";

function cell(char: string, overrides: Partial<Cell> = {}): Cell {
  return {
    char,
    fgColor: null,
    bgColor: null,
    bold: false,
    italic: false,
    underline: false,
    ...overrides,
  };
}

describe("emitBuffer", () => {
  test("emits plain text", () => {
    const buf = new CellBuffer(5, 1);
    buf.set(0, 0, cell("H"));
    buf.set(1, 0, cell("e"));
    buf.set(2, 0, cell("l"));
    buf.set(3, 0, cell("l"));
    buf.set(4, 0, cell("o"));
    const output = emitBuffer(buf);
    // Should contain "Hello" somewhere in the output
    expect(output).toContain("Hello");
  });

  test("emits multiple rows", () => {
    const buf = new CellBuffer(2, 2);
    buf.set(0, 0, cell("A"));
    buf.set(1, 0, cell("B"));
    buf.set(0, 1, cell("C"));
    buf.set(1, 1, cell("D"));
    const output = emitBuffer(buf);
    expect(output).toContain("AB");
    expect(output).toContain("CD");
  });

  test("emits foreground color", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(0, 0, cell("X", { fgColor: "red" }));
    const output = emitBuffer(buf);
    // CSI 31m = red foreground
    expect(output).toContain("\x1b[31m");
    expect(output).toContain("X");
  });

  test("emits background color", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(0, 0, cell("X", { bgColor: "blue" }));
    const output = emitBuffer(buf);
    // CSI 44m = blue background
    expect(output).toContain("\x1b[44m");
    expect(output).toContain("X");
  });

  test("emits bold", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(0, 0, cell("X", { bold: true }));
    const output = emitBuffer(buf);
    expect(output).toContain("\x1b[1m");
  });

  test("emits italic", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(0, 0, cell("X", { italic: true }));
    const output = emitBuffer(buf);
    expect(output).toContain("\x1b[3m");
  });

  test("emits underline", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(0, 0, cell("X", { underline: true }));
    const output = emitBuffer(buf);
    expect(output).toContain("\x1b[4m");
  });

  test("combines multiple style attributes", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(
      0,
      0,
      cell("X", { bold: true, fgColor: "green", bgColor: "black" }),
    );
    const output = emitBuffer(buf);
    expect(output).toContain("X");
    // Should contain bold (1), green fg (32), black bg (40) in some SGR
    expect(output).toContain("1");
    expect(output).toContain("32");
    expect(output).toContain("40");
  });

  test("resets style between differently styled cells", () => {
    const buf = new CellBuffer(2, 1);
    buf.set(0, 0, cell("A", { fgColor: "red" }));
    buf.set(1, 0, cell("B", { fgColor: "blue" }));
    const output = emitBuffer(buf);
    expect(output).toContain("A");
    expect(output).toContain("B");
    // Should contain reset between the two
    expect(output).toContain("\x1b[0m");
  });

  test("wraps output in synchronized output markers", () => {
    const buf = new CellBuffer(1, 1);
    const output = emitBuffer(buf);
    // Begin synchronized output
    expect(output.startsWith("\x1b[?2026h")).toBe(true);
    // End synchronized output
    expect(output.endsWith("\x1b[?2026l")).toBe(true);
  });

  test("positions cursor at home before rendering", () => {
    const buf = new CellBuffer(1, 1);
    const output = emitBuffer(buf);
    // Should contain cursor home (CSI H)
    expect(output).toContain("\x1b[H");
  });

  test("empty cells render as spaces", () => {
    const buf = new CellBuffer(3, 1);
    // Leave all cells empty
    const output = emitBuffer(buf);
    expect(output).toContain("   ");
  });
});
