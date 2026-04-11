import { describe, expect, test } from "bun:test";
import {
  insertChar,
  deleteBackward,
  deleteForward,
  deleteWordBackward,
  deleteWordForward,
  moveCursor,
  moveCursorByWord,
  type EditState,
} from "./text-edit.js";

function state(value: string, cursor: number): EditState {
  return { value, cursor };
}

describe("text editing", () => {
  describe("insertChar", () => {
    test("inserts at start", () => {
      const result = insertChar(state("hello", 0), "X");
      expect(result.value).toBe("Xhello");
      expect(result.cursor).toBe(1);
    });

    test("inserts at end", () => {
      const result = insertChar(state("hello", 5), "!");
      expect(result.value).toBe("hello!");
      expect(result.cursor).toBe(6);
    });

    test("inserts in middle", () => {
      const result = insertChar(state("helo", 3), "l");
      expect(result.value).toBe("hello");
      expect(result.cursor).toBe(4);
    });

    test("inserts newline", () => {
      const result = insertChar(state("ab", 1), "\n");
      expect(result.value).toBe("a\nb");
      expect(result.cursor).toBe(2);
    });

    test("inserts tab", () => {
      const result = insertChar(state("ab", 1), "\t");
      expect(result.value).toBe("a\tb");
      expect(result.cursor).toBe(2);
    });
  });

  describe("deleteBackward", () => {
    test("deletes character before cursor", () => {
      const result = deleteBackward(state("hello", 3));
      expect(result.value).toBe("helo");
      expect(result.cursor).toBe(2);
    });

    test("no-op at start of string", () => {
      const result = deleteBackward(state("hello", 0));
      expect(result.value).toBe("hello");
      expect(result.cursor).toBe(0);
    });

    test("deletes last character", () => {
      const result = deleteBackward(state("a", 1));
      expect(result.value).toBe("");
      expect(result.cursor).toBe(0);
    });

    test("deletes entire emoji (multi-codepoint)", () => {
      // 👨‍👩‍👧 is a ZWJ family emoji (multiple codepoints, one grapheme)
      const emoji = "👨\u200D👩\u200D👧";
      const val = "a" + emoji + "b";
      const cursorAfterEmoji = 1 + emoji.length;
      const result = deleteBackward(state(val, cursorAfterEmoji));
      expect(result.value).toBe("ab");
      expect(result.cursor).toBe(1);
    });

    test("deletes single emoji", () => {
      const result = deleteBackward(state("hi😀!", 2 + "😀".length));
      expect(result.value).toBe("hi!");
      expect(result.cursor).toBe(2);
    });
  });

  describe("deleteForward", () => {
    test("deletes character after cursor", () => {
      const result = deleteForward(state("hello", 2));
      expect(result.value).toBe("helo");
      expect(result.cursor).toBe(2);
    });

    test("no-op at end of string", () => {
      const result = deleteForward(state("hello", 5));
      expect(result.value).toBe("hello");
      expect(result.cursor).toBe(5);
    });

    test("deletes entire emoji forward", () => {
      const emoji = "😀";
      const val = "a" + emoji + "b";
      const result = deleteForward(state(val, 1));
      expect(result.value).toBe("ab");
      expect(result.cursor).toBe(1);
    });

    test("deletes ZWJ sequence forward", () => {
      const emoji = "👨\u200D👩\u200D👧";
      const val = "x" + emoji + "y";
      const result = deleteForward(state(val, 1));
      expect(result.value).toBe("xy");
      expect(result.cursor).toBe(1);
    });
  });

  describe("deleteWordBackward", () => {
    test("deletes previous word", () => {
      const result = deleteWordBackward(state("hello brave world", 17));
      expect(result.value).toBe("hello brave ");
      expect(result.cursor).toBe(12);
    });

    test("deletes previous word and preceding spaces as one chunk", () => {
      const result = deleteWordBackward(state("hello   world", 8));
      expect(result.value).toBe("world");
      expect(result.cursor).toBe(0);
    });

    test("deletes an emoji word without splitting the grapheme", () => {
      const result = deleteWordBackward(state("go 😀 now", 5));
      expect(result.value).toBe("go  now");
      expect(result.cursor).toBe(3);
    });
  });

  describe("deleteWordForward", () => {
    test("deletes next word without trimming following whitespace", () => {
      const result = deleteWordForward(state("hello brave world", 6));
      expect(result.value).toBe("hello  world");
      expect(result.cursor).toBe(6);
    });

    test("deletes next word and leading spaces as one chunk", () => {
      const result = deleteWordForward(state("hello   world", 5));
      expect(result.value).toBe("hello");
      expect(result.cursor).toBe(5);
    });

    test("deletes an emoji word without splitting the grapheme", () => {
      const result = deleteWordForward(state("😀 test", 0));
      expect(result.value).toBe(" test");
      expect(result.cursor).toBe(0);
    });
  });

  describe("moveCursorByWord", () => {
    test("backward moves to the start of the previous word", () => {
      const result = moveCursorByWord(
        state("hello brave world", 17),
        "backward",
      );
      expect(result.cursor).toBe(12);
    });

    test("backward skips trailing whitespace before the previous word", () => {
      const result = moveCursorByWord(state("hello   ", 8), "backward");
      expect(result.cursor).toBe(0);
    });

    test("forward moves to the end of the next word", () => {
      const result = moveCursorByWord(state("hello brave world", 0), "forward");
      expect(result.cursor).toBe(5);
    });

    test("forward skips leading whitespace before the next word", () => {
      const result = moveCursorByWord(state("   hello", 0), "forward");
      expect(result.cursor).toBe(8);
    });
  });

  describe("moveCursor", () => {
    test("left moves back one", () => {
      const result = moveCursor(state("hello", 3), "left");
      expect(result.cursor).toBe(2);
    });

    test("left at start stays at 0", () => {
      const result = moveCursor(state("hello", 0), "left");
      expect(result.cursor).toBe(0);
    });

    test("right moves forward one", () => {
      const result = moveCursor(state("hello", 3), "right");
      expect(result.cursor).toBe(4);
    });

    test("right at end stays at end", () => {
      const result = moveCursor(state("hello", 5), "right");
      expect(result.cursor).toBe(5);
    });

    test("left skips over multi-codepoint emoji", () => {
      const emoji = "\ud83d\ude00"; // 😀 is 2 UTF-16 code units
      const val = "a" + emoji + "b";
      const cursorAfterEmoji = 1 + emoji.length;
      const result = moveCursor(state(val, cursorAfterEmoji), "left");
      expect(result.cursor).toBe(1); // before the emoji
    });

    test("right skips over multi-codepoint emoji", () => {
      const emoji = "\ud83d\ude00";
      const val = "a" + emoji + "b";
      const result = moveCursor(state(val, 1), "right");
      expect(result.cursor).toBe(1 + emoji.length); // after the emoji
    });

    test("left skips over ZWJ sequence", () => {
      const emoji = "\ud83d\udc68\u200D\ud83d\udc69\u200D\ud83d\udc67";
      const val = "x" + emoji;
      const result = moveCursor(state(val, val.length), "left");
      expect(result.cursor).toBe(1); // before the ZWJ sequence
    });

    test("home moves to start", () => {
      const result = moveCursor(state("hello", 3), "home");
      expect(result.cursor).toBe(0);
    });

    test("end moves to end", () => {
      const result = moveCursor(state("hello", 2), "end");
      expect(result.cursor).toBe(5);
    });

    test("up follows visual wrapped lines", () => {
      const result = moveCursor(state("foo bar baz", 11), "up", 6);
      expect(result.cursor).toBe(7);
    });

    test("down follows visual wrapped lines", () => {
      const result = moveCursor(state("foo bar baz", 0), "down", 6);
      expect(result.cursor).toBe(4);
    });

    test("down clamps to the end of a shorter wrapped line", () => {
      const result = moveCursor(state("foo bar baz", 7), "down", 6);
      expect(result.cursor).toBe(11);
    });

    test("up moves to previous line", () => {
      const result = moveCursor(state("abc\ndef", 5), "up", 10);
      // Cursor at "e" (offset 5), up should go to offset 1 ("b")
      expect(result.cursor).toBe(1);
    });

    test("down moves to next line", () => {
      const result = moveCursor(state("abc\ndef", 1), "down", 10);
      // Cursor at "b" (offset 1), down should go to offset 5 ("e")
      expect(result.cursor).toBe(5);
    });

    test("up at first line stays at start", () => {
      const result = moveCursor(state("hello", 3), "up", 10);
      expect(result.cursor).toBe(0);
    });

    test("down at last line stays at end", () => {
      const result = moveCursor(state("hello", 3), "down", 10);
      expect(result.cursor).toBe(5);
    });
  });
});
