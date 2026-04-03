import { describe, expect, test } from "bun:test";
import {
  insertChar,
  deleteBackward,
  deleteForward,
  moveCursor,
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

    test("home moves to start", () => {
      const result = moveCursor(state("hello", 3), "home");
      expect(result.cursor).toBe(0);
    });

    test("end moves to end", () => {
      const result = moveCursor(state("hello", 2), "end");
      expect(result.cursor).toBe(5);
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
