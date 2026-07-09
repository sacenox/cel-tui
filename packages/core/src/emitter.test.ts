import { describe, expect, test } from "bun:test";
import type { Theme } from "@cel-tui/types";
import { type Cell, CellBuffer } from "./cell-buffer.js";
import { defaultTheme, emitBuffer, emitDiff } from "./emitter.js";

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

  test("emits foreground color using default ANSI theme", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(0, 0, cell("X", { fgColor: "color01" }));
    const output = emitBuffer(buf);
    // color01 = ANSI 1 (red) → fg SGR 31
    expect(output).toContain("\x1b[31m");
    expect(output).toContain("X");
  });

  test("emits background color using default ANSI theme", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(0, 0, cell("X", { bgColor: "color04" }));
    const output = emitBuffer(buf);
    // color04 = ANSI 4 (blue) → bg SGR 44
    expect(output).toContain("\x1b[44m");
    expect(output).toContain("X");
  });

  test("emits bright color variants", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(0, 0, cell("X", { fgColor: "color08" }));
    const output = emitBuffer(buf);
    // color08 = ANSI 8 (bright black) → fg SGR 90
    expect(output).toContain("\x1b[90m");
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
      cell("X", { bold: true, fgColor: "color02", bgColor: "color00" }),
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
    buf.set(0, 0, cell("A", { fgColor: "color01" }));
    buf.set(1, 0, cell("B", { fgColor: "color04" }));
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

  test("establishes a default SGR baseline before rendering the full frame", () => {
    const buf = new CellBuffer(1, 1);
    const output = emitBuffer(buf);

    expect(output.startsWith("\x1b[?2026h\x1b[H\x1b[0m")).toBe(true);
  });

  test("empty cells render as spaces", () => {
    const buf = new CellBuffer(3, 1);
    // Leave all cells empty
    const output = emitBuffer(buf);
    expect(output).toContain("   ");
  });

  test("wide character continuation cells are skipped", () => {
    const buf = new CellBuffer(5, 1);
    // Simulate a wide char at col 0 with continuation at col 1
    buf.set(0, 0, cell("\u4e16")); // CJK char (2 cols)
    buf.set(1, 0, cell("")); // continuation marker
    buf.set(2, 0, cell("x"));
    const output = emitBuffer(buf);
    // The output should contain the wide char and "x" without
    // an extra space between them (continuation is skipped)
    expect(output).toContain("\u4e16x");
    // Should NOT contain "\u4e16 x" (space from continuation)
    expect(output).not.toContain("\u4e16 x");
  });

  test("custom theme with ANSI index remapping", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(0, 0, cell("X", { fgColor: "color01" }));
    // Remap color01 to ANSI index 6 (cyan) instead of 1 (red)
    const theme: Theme = {
      color00: 0,
      color01: 6,
      color02: 2,
      color03: 3,
      color04: 4,
      color05: 5,
      color06: 1,
      color07: 7,
      color08: 8,
      color09: 9,
      color10: 10,
      color11: 11,
      color12: 12,
      color13: 13,
      color14: 14,
      color15: 15,
    };
    const output = emitBuffer(buf, theme);
    // color01 remapped to ANSI 6 → fg SGR 36 (cyan)
    expect(output).toContain("\x1b[36m");
    expect(output).not.toContain("\x1b[31m");
  });

  test("custom theme with true color hex values", () => {
    const buf = new CellBuffer(1, 1);
    buf.set(0, 0, cell("X", { fgColor: "color01", bgColor: "color00" }));
    const theme: Theme = {
      color00: "#1e1e2e",
      color01: "#f38ba8",
      color02: 2,
      color03: 3,
      color04: 4,
      color05: 5,
      color06: 6,
      color07: 7,
      color08: 8,
      color09: 9,
      color10: 10,
      color11: 11,
      color12: 12,
      color13: 13,
      color14: 14,
      color15: 15,
    };
    const output = emitBuffer(buf, theme);
    // color01 = "#f38ba8" → fg 38;2;243;139;168
    expect(output).toContain("38;2;243;139;168");
    // color00 = "#1e1e2e" → bg 48;2;30;30;46
    expect(output).toContain("48;2;30;30;46");
  });
});

describe("emitDiff", () => {
  test("returns empty string when buffers are identical", () => {
    const prev = new CellBuffer(5, 2);
    const next = new CellBuffer(5, 2);
    prev.set(0, 0, cell("A"));
    next.set(0, 0, cell("A"));
    const output = emitDiff(prev, next);
    expect(output).toBe("");
  });

  test("returns empty string when cells and visible cursor are unchanged", () => {
    const prev = new CellBuffer(5, 1);
    const next = new CellBuffer(5, 1);

    const output = emitDiff(prev, next, defaultTheme, {
      cursor: { visible: true, x: 2, y: 0 },
      previousCursor: { visible: true, x: 2, y: 0 },
    });

    expect(output).toBe("");
  });

  test("returns empty string when the explicit cursor style is unchanged", () => {
    const prev = new CellBuffer(5, 1);
    const next = new CellBuffer(5, 1);

    const output = emitDiff(prev, next, defaultTheme, {
      cursor: { visible: true, x: 2, y: 0, style: "bar" },
      previousCursor: { visible: true, x: 2, y: 0, style: "bar" },
    });

    expect(output).toBe("");
  });

  test("emits a deterministic shape-only cursor update", () => {
    const prev = new CellBuffer(5, 1);
    const next = new CellBuffer(5, 1);

    const output = emitDiff(prev, next, defaultTheme, {
      cursor: { visible: true, x: 2, y: 0, style: "underline" },
      previousCursor: { visible: true, x: 2, y: 0, style: "bar" },
    });

    expect(output).toBe("\x1b[?2026h\x1b[3 q\x1b[?2026l");
  });

  test("emits a cursor-only update when its position changes", () => {
    const prev = new CellBuffer(5, 1);
    const next = new CellBuffer(5, 1);

    const output = emitDiff(prev, next, defaultTheme, {
      cursor: { visible: true, x: 3, y: 0 },
      previousCursor: { visible: true, x: 2, y: 0 },
    });

    expect(output).toBe("\x1b[?2026h\x1b[1;4H\x1b[?2026l");
  });

  test("emits only changed cells with cursor positioning", () => {
    const prev = new CellBuffer(5, 2);
    const next = new CellBuffer(5, 2);
    prev.set(0, 0, cell("A"));
    next.set(0, 0, cell("A"));
    // Change cell at (2, 1)
    next.set(2, 1, cell("X"));
    const output = emitDiff(prev, next);
    // Should position cursor at (2, 1) = CSI row;col H (1-indexed)
    expect(output).toContain("\x1b[2;3H");
    expect(output).toContain("X");
  });

  test("emits styled changed cells", () => {
    const prev = new CellBuffer(3, 1);
    const next = new CellBuffer(3, 1);
    next.set(1, 0, cell("Z", { fgColor: "color01", bold: true }));
    const output = emitDiff(prev, next);
    expect(output).toContain("\x1b[1;2H"); // cursor to (1, 0)
    expect(output).toContain("Z");
    expect(output).toContain("\x1b[1;31m"); // bold + red
  });

  test("wraps in synchronized output markers", () => {
    const prev = new CellBuffer(1, 1);
    const next = new CellBuffer(1, 1);
    next.set(0, 0, cell("Q"));
    const output = emitDiff(prev, next);
    expect(output.startsWith("\x1b[?2026h")).toBe(true);
    expect(output.endsWith("\x1b[?2026l")).toBe(true);
  });

  test("batches consecutive changed cells on same row", () => {
    const prev = new CellBuffer(5, 1);
    const next = new CellBuffer(5, 1);
    next.set(1, 0, cell("A"));
    next.set(2, 0, cell("B"));
    next.set(3, 0, cell("C"));
    const output = emitDiff(prev, next);
    // Should position once and emit ABC together
    expect(output).toContain("ABC");
    // Only one cursor positioning for this run
    // biome-ignore lint/suspicious/noControlCharactersInRegex: matching terminal escape sequences requires ESC bytes.
    const cursorMoves = output.match(/\x1b\[\d+;\d+H/g) || [];
    expect(cursorMoves.length).toBe(1);
  });

  test("wide character continuation cells are skipped in diff", () => {
    const prev = new CellBuffer(5, 1);
    const next = new CellBuffer(5, 1);
    // Wide char at col 0 with continuation at col 1
    next.set(0, 0, cell("\u4e16"));
    next.set(1, 0, cell("")); // continuation
    next.set(2, 0, cell("x"));
    const output = emitDiff(prev, next);
    // Should emit the wide char and x without extra space
    expect(output).toContain("\u4e16");
    expect(output).toContain("x");
    // Continuation cell should not produce any output character
    expect(output).not.toContain("\u4e16 ");
  });

  test("restores an unchanged visible cursor inside synchronized diff output", () => {
    const prev = new CellBuffer(5, 1);
    const next = new CellBuffer(5, 1);
    next.set(2, 0, cell("X"));

    const output = emitDiff(prev, next, defaultTheme, {
      cursor: { visible: true, x: 4, y: 2 },
      previousCursor: { visible: true, x: 4, y: 2 },
    });

    expect(output.startsWith("\x1b[?2026h\x1b7")).toBe(true);
    expect(output.endsWith("\x1b8\x1b[?2026l")).toBe(true);
    expect(output).not.toContain("\x1b[?25h");
  });

  test("moves and shows the cursor before ending synchronized full output", () => {
    const buf = new CellBuffer(2, 1);
    const output = emitBuffer(buf, defaultTheme, {
      cursor: { visible: true, x: 1, y: 0 },
      previousCursor: { visible: false },
    });

    expect(output.endsWith("\x1b[1;2H\x1b[1 q\x1b[?25h\x1b[?2026l")).toBe(true);
  });

  for (const [style, sequence] of [
    ["block", "\x1b[1 q"],
    ["underline", "\x1b[3 q"],
    ["bar", "\x1b[5 q"],
  ] as const) {
    test(`full output selects the ${style} native cursor shape`, () => {
      const output = emitBuffer(new CellBuffer(2, 1), defaultTheme, {
        cursor: { visible: true, x: 1, y: 0, style },
        previousCursor: { visible: false },
      });

      expect(output).toContain(`\x1b[1;2H${sequence}\x1b[?25h`);
    });
  }

  test("full output repairs cursor state even when the logical cursor is unchanged", () => {
    const buf = new CellBuffer(2, 1);
    const output = emitBuffer(buf, defaultTheme, {
      cursor: { visible: true, x: 1, y: 0 },
      previousCursor: { visible: true, x: 1, y: 0 },
    });

    expect(output).not.toContain("\x1b7");
    expect(output).not.toContain("\x1b8");
    expect(output.endsWith("\x1b[1;2H\x1b[1 q\x1b[?25h\x1b[?2026l")).toBe(true);
  });

  test("full output explicitly hides the cursor from an unknown terminal state", () => {
    const output = emitBuffer(new CellBuffer(1, 1), defaultTheme, {
      cursor: { visible: false },
      previousCursor: { visible: false },
    });

    expect(output.endsWith("\x1b[?25l\x1b[?2026l")).toBe(true);
  });

  test("hides a previously visible cursor inside synchronized diff output", () => {
    const prev = new CellBuffer(1, 1);
    const next = new CellBuffer(1, 1);

    const output = emitDiff(prev, next, defaultTheme, {
      cursor: { visible: false },
      previousCursor: { visible: true, x: 0, y: 0 },
    });

    expect(output).toBe("\x1b[?2026h\x1b[?25l\x1b[?2026l");
  });

  test("custom theme applies to diff output", () => {
    const prev = new CellBuffer(3, 1);
    const next = new CellBuffer(3, 1);
    next.set(1, 0, cell("Z", { fgColor: "color01" }));
    const theme: Theme = {
      color00: "#000000",
      color01: "#ff0000",
      color02: 2,
      color03: 3,
      color04: 4,
      color05: 5,
      color06: 6,
      color07: 7,
      color08: 8,
      color09: 9,
      color10: 10,
      color11: 11,
      color12: 12,
      color13: 13,
      color14: 14,
      color15: 15,
    };
    const output = emitDiff(prev, next, theme);
    // color01 = "#ff0000" → fg 38;2;255;0;0
    expect(output).toContain("38;2;255;0;0");
  });
});
