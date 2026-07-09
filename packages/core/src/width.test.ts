import { describe, expect, test } from "bun:test";
import { visibleWidth, visibleWidthFromColumn } from "./width.js";

describe("visibleWidth", () => {
  describe("ASCII fast path", () => {
    test("empty string", () => {
      expect(visibleWidth("")).toBe(0);
    });

    test("simple ASCII", () => {
      expect(visibleWidth("hello")).toBe(5);
    });

    test("ASCII with spaces", () => {
      expect(visibleWidth("hello world")).toBe(11);
    });

    test("ASCII punctuation", () => {
      expect(visibleWidth("a-b_c.d")).toBe(7);
    });

    test("single character", () => {
      expect(visibleWidth("x")).toBe(1);
    });
  });

  describe("East Asian wide characters", () => {
    test("CJK characters are width 2", () => {
      expect(visibleWidth("世界")).toBe(4);
    });

    test("mixed ASCII and CJK", () => {
      expect(visibleWidth("hi世界")).toBe(6);
    });

    test("fullwidth punctuation", () => {
      expect(visibleWidth("！")).toBe(2);
    });
  });

  describe("emoji", () => {
    test("simple emoji is width 2", () => {
      expect(visibleWidth("😀")).toBe(2);
    });

    test("emoji in text", () => {
      expect(visibleWidth("hi 😀 there")).toBe(11);
    });

    test("ZWJ emoji sequence", () => {
      expect(visibleWidth("👨‍👩‍👧")).toBe(2);
    });

    test("flag emoji", () => {
      expect(visibleWidth("🇺🇸")).toBe(2);
    });

    test("emoji with skin tone", () => {
      expect(visibleWidth("👋🏽")).toBe(2);
    });
  });

  describe("ANSI escape sequences", () => {
    test("CSI SGR codes are zero width", () => {
      expect(visibleWidth("\x1b[31mred\x1b[0m")).toBe(3);
    });

    test("bold + color", () => {
      expect(visibleWidth("\x1b[1;34mblue\x1b[0m")).toBe(4);
    });

    test("256 color", () => {
      expect(visibleWidth("\x1b[38;5;240mgray\x1b[0m")).toBe(4);
    });

    test("RGB color", () => {
      expect(visibleWidth("\x1b[38;2;255;128;0morange\x1b[0m")).toBe(6);
    });

    test("only ANSI codes, no visible content", () => {
      expect(visibleWidth("\x1b[31m\x1b[0m")).toBe(0);
    });

    test("CSI sequences accept any standard final byte", () => {
      expect(visibleWidth("\x1b[2~")).toBe(0);
      expect(visibleWidth("A\x1b[2~B")).toBe(2);
    });

    test("OSC hyperlink", () => {
      expect(
        visibleWidth("\x1b]8;;https://example.com\x07link\x1b]8;;\x07"),
      ).toBe(4);
    });
  });

  describe("zero-width characters", () => {
    test("combining marks", () => {
      // e + combining acute accent = 1 grapheme, width 1
      expect(visibleWidth("e\u0301")).toBe(1);
    });

    test("zero-width joiner", () => {
      expect(visibleWidth("\u200D")).toBe(0);
    });
  });

  describe("tabs", () => {
    test("expand to the next tab stop from column zero", () => {
      expect(visibleWidth("\tfoo")).toBe(7);
    });

    test("expand relative to the current column", () => {
      expect(visibleWidth("a\tb")).toBe(5);
      expect(visibleWidthFromColumn("\t", 3)).toBe(1);
    });
  });

  describe("mixed content", () => {
    test("CJK + ANSI + ASCII", () => {
      expect(visibleWidth("\x1b[1m世界\x1b[0m hello")).toBe(10);
    });

    test("emoji + ANSI", () => {
      expect(visibleWidth("\x1b[32m😀\x1b[0m ok")).toBe(5);
    });
  });
});
