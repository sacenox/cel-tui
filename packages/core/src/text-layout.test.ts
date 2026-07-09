import { describe, expect, test } from "bun:test";
import { layoutText, measureTextLineCount } from "./text-layout.js";
import { visibleWidth } from "./width.js";

describe("text-layout", () => {
  test("preserves whitespace at soft wraps and maps offsets using visual lines", () => {
    const result = layoutText("foo bar baz", 6, "word");

    expect(result.lines.map((line) => line.text)).toEqual([
      "foo ",
      "bar ",
      "baz",
    ]);
    expect(result.lineCount).toBe(3);

    expect(result.offsetToPosition(4)).toEqual({ line: 1, col: 0 });
    expect(result.offsetToPosition(5)).toEqual({ line: 1, col: 1 });
    expect(result.offsetToPosition(8)).toEqual({ line: 2, col: 0 });

    expect(result.positionToOffset(1, 0)).toBe(4);
    expect(result.positionToOffset(1, 1)).toBe(5);
    expect(result.positionToOffset(2, 0)).toBe(8);
  });

  test("preserves repeated and trailing spaces", () => {
    const result = layoutText("a  b ", 3, "word");

    expect(result.lines.map((line) => line.text)).toEqual(["a  ", "b "]);
    expect(result.offsetToPosition(3)).toEqual({ line: 1, col: 0 });
    expect(result.offsetToPosition(5)).toEqual({ line: 1, col: 2 });
  });

  test("preserves explicit trailing newline as an empty final visual line", () => {
    const result = layoutText("a\n", 10, "word");

    expect(result.lines.map((line) => line.text)).toEqual(["a", ""]);
    expect(result.lineCount).toBe(2);
    expect(result.offsetToPosition(1)).toEqual({ line: 0, col: 1 });
    expect(result.offsetToPosition(2)).toEqual({ line: 1, col: 0 });
  });

  test("wraps tabs using visual tab-stop width", () => {
    const result = layoutText("\tfoo", 6, "word");

    expect(
      result.lines.map((line) => ({ text: line.text, width: line.width })),
    ).toEqual([
      { text: "\t", width: 4 },
      { text: "foo", width: 3 },
    ]);
    expect(result.offsetToPosition(1)).toEqual({ line: 1, col: 0 });
  });

  test("recomputes tab stops after soft wrapping", () => {
    const result = layoutText("abcde\tXYZ", 6, "word");

    expect(result.lines.every((line) => line.width <= 6)).toBe(true);
    expect(result.lines.map((line) => line.width)).toEqual(
      result.lines.map((line) => visibleWidth(line.text)),
    );
    expect(measureTextLineCount("abcde\tXYZ", 6, "word")).toBe(
      result.lineCount,
    );
  });

  test("strips ANSI control sequences while preserving visible text", () => {
    const result = layoutText("\x1b[31mred\x1b[0m", 10, "none");

    expect(result.lines).toEqual([
      {
        text: "red",
        startOffset: 0,
        endOffset: 12,
        width: 3,
      },
    ]);
    expect(result.offsetToPosition(0)).toEqual({ line: 0, col: 0 });
    expect(result.offsetToPosition(4)).toEqual({ line: 0, col: 0 });
    expect(result.offsetToPosition(12)).toEqual({ line: 0, col: 3 });
    expect(result.positionToOffset(0, 3)).toBe(12);
    expect(measureTextLineCount("\x1b[31m", 10, "word")).toBe(1);
  });

  test("does not create a blank wrapped line for ANSI before a wide grapheme", () => {
    const result = layoutText("\x1b[31m界\x1b[0m", 1, "word");

    expect(result.lines).toEqual([
      { text: "界", startOffset: 0, endOffset: 10, width: 2 },
    ]);
    expect(result.lineCount).toBe(1);
  });

  test("wraps unbroken wide graphemes by grapheme boundaries", () => {
    const result = layoutText("世界世界", 5, "word");

    expect(
      result.lines.map((line) => ({ text: line.text, width: line.width })),
    ).toEqual([
      { text: "世界", width: 4 },
      { text: "世界", width: 4 },
    ]);
    expect(result.offsetToPosition(2)).toEqual({ line: 1, col: 0 });
    expect(result.positionToOffset(1, 1)).toBe(3);
  });

  test("measureTextLineCount fast path counts hard lines for wrap none", () => {
    expect(measureTextLineCount("", 10, "none")).toBe(1);
    expect(measureTextLineCount("hello", 1, "none")).toBe(1);
    expect(measureTextLineCount("a\nb\n", 1, "none")).toBe(3);
  });

  test("measureTextLineCount matches layoutText lineCount for wrapped cases", () => {
    const cases = [
      ["foo bar baz", 6],
      ["a  b ", 3],
      ["a\n", 10],
      ["\tfoo", 6],
      ["世界世界", 5],
    ] as const;

    for (const [value, width] of cases) {
      expect(measureTextLineCount(value, width, "word")).toBe(
        layoutText(value, width, "word").lineCount,
      );
    }
  });
});
