import { describe, expect, test } from "bun:test";
import { layoutText } from "./text-layout.js";

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
});
