import { describe, expect, test } from "bun:test";
import { parseKey, normalizeKey } from "./keys.js";

describe("parseKey", () => {
  test("printable ASCII character", () => {
    expect(parseKey("a")).toBe("a");
    expect(parseKey("z")).toBe("z");
    expect(parseKey("1")).toBe("1");
    expect(parseKey("/")).toBe("/");
  });

  test("enter key", () => {
    expect(parseKey("\r")).toBe("enter");
  });

  test("escape key", () => {
    expect(parseKey("\x1b")).toBe("escape");
  });

  test("tab key", () => {
    expect(parseKey("\t")).toBe("tab");
  });

  test("backspace", () => {
    expect(parseKey("\x7f")).toBe("backspace");
  });

  test("ctrl+c", () => {
    expect(parseKey("\x03")).toBe("ctrl+c");
  });

  test("ctrl+s", () => {
    expect(parseKey("\x13")).toBe("ctrl+s");
  });

  test("ctrl+q", () => {
    expect(parseKey("\x11")).toBe("ctrl+q");
  });

  test("arrow keys", () => {
    expect(parseKey("\x1b[A")).toBe("up");
    expect(parseKey("\x1b[B")).toBe("down");
    expect(parseKey("\x1b[C")).toBe("right");
    expect(parseKey("\x1b[D")).toBe("left");
  });

  test("shift+tab", () => {
    expect(parseKey("\x1b[Z")).toBe("shift+tab");
  });

  test("home/end", () => {
    expect(parseKey("\x1b[H")).toBe("home");
    expect(parseKey("\x1b[F")).toBe("end");
  });

  test("delete", () => {
    expect(parseKey("\x1b[3~")).toBe("delete");
  });

  test("page up/down", () => {
    expect(parseKey("\x1b[5~")).toBe("pageup");
    expect(parseKey("\x1b[6~")).toBe("pagedown");
  });
});

describe("normalizeKey", () => {
  test("already normalized", () => {
    expect(normalizeKey("ctrl+s")).toBe("ctrl+s");
  });

  test("reorders modifiers to canonical order", () => {
    expect(normalizeKey("shift+ctrl+s")).toBe("ctrl+shift+s");
    expect(normalizeKey("alt+ctrl+shift+a")).toBe("ctrl+alt+shift+a");
  });

  test("lowercases everything", () => {
    expect(normalizeKey("Ctrl+S")).toBe("ctrl+s");
  });
});
