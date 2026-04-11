import { describe, expect, test } from "bun:test";
import { isEditingKey, normalizeKey, parseKey } from "./keys.js";
import { kittyEncode } from "./test-helpers.js";

// ── kittyEncode helper sanity checks ────────────────────────────────────────

describe("kittyEncode helper", () => {
  test("unmodified printable → raw byte", () => {
    expect(kittyEncode("a")).toBe("a");
    expect(kittyEncode("1")).toBe("1");
    expect(kittyEncode("/")).toBe("/");
  });

  test("named printable keys → raw byte when unmodified", () => {
    expect(kittyEncode("space")).toBe(" ");
    expect(kittyEncode("plus")).toBe("+");
  });

  test("special keys → CSI u", () => {
    expect(kittyEncode("escape")).toBe("\x1b[27u");
    expect(kittyEncode("enter")).toBe("\x1b[13u");
    expect(kittyEncode("tab")).toBe("\x1b[9u");
    expect(kittyEncode("backspace")).toBe("\x1b[127u");
  });

  test("modifier combos → CSI u with modifier param", () => {
    // Modifier bitmask: shift=1, alt=2, ctrl=4. Param = bitmask + 1.
    expect(kittyEncode("ctrl+c")).toBe("\x1b[99;5u"); // ctrl=4 → 5
    expect(kittyEncode("alt+x")).toBe("\x1b[120;3u"); // alt=2 → 3
    expect(kittyEncode("shift+enter")).toBe("\x1b[13;2u"); // shift=1 → 2
    expect(kittyEncode("ctrl+shift+n")).toBe("\x1b[110;6u"); // ctrl+shift=5 → 6
    expect(kittyEncode("ctrl+alt+shift+a")).toBe("\x1b[97;8u"); // all=7 → 8
  });

  test("arrow keys → CSI letter", () => {
    expect(kittyEncode("up")).toBe("\x1b[A");
    expect(kittyEncode("ctrl+up")).toBe("\x1b[1;5A");
  });

  test("tilde keys", () => {
    expect(kittyEncode("delete")).toBe("\x1b[3~");
    expect(kittyEncode("shift+delete")).toBe("\x1b[3;2~");
  });

  test("function keys", () => {
    expect(kittyEncode("f1")).toBe("\x1b[11~");
    expect(kittyEncode("ctrl+f5")).toBe("\x1b[15;5~");
  });

  test("named printable keys with modifiers → CSI u", () => {
    expect(kittyEncode("ctrl+space")).toBe("\x1b[32;5u");
    expect(kittyEncode("ctrl+plus")).toBe("\x1b[43;5u");
  });
});

// ── parseKey ────────────────────────────────────────────────────────────────

describe("parseKey", () => {
  // --- Raw printable characters (arrive as raw bytes at level 1) ---

  describe("raw printable characters", () => {
    test("lowercase letters", () => {
      expect(parseKey("a")).toBe("a");
      expect(parseKey("z")).toBe("z");
    });

    test("uppercase letters lowercased", () => {
      expect(parseKey("A")).toBe("a");
      expect(parseKey("Z")).toBe("z");
    });

    test("digits", () => {
      expect(parseKey("1")).toBe("1");
      expect(parseKey("0")).toBe("0");
    });

    test("symbols", () => {
      expect(parseKey("/")).toBe("/");
      expect(parseKey("-")).toBe("-");
      expect(parseKey("=")).toBe("=");
      expect(parseKey("[")).toBe("[");
    });

    test("space maps to named key", () => {
      expect(parseKey(" ")).toBe("space");
    });

    test("plus maps to named key", () => {
      expect(parseKey("+")).toBe("plus");
    });

    test("multi-byte UTF-8 passed through", () => {
      expect(parseKey("世")).toBe("世");
      expect(parseKey("é")).toBe("é");
    });
  });

  // --- Legacy bytes for unmodified special keys ---
  // At Kitty level 1, unmodified special keys retain their traditional
  // encoding. Only modified variants get the CSI u treatment.

  describe("legacy bytes for unmodified special keys", () => {
    test("tab", () => {
      expect(parseKey("\t")).toBe("tab");
    });

    test("enter", () => {
      expect(parseKey("\r")).toBe("enter");
    });

    test("escape", () => {
      expect(parseKey("\x1b")).toBe("escape");
    });

    test("backspace", () => {
      expect(parseKey("\x7f")).toBe("backspace");
    });
  });

  describe("legacy compatibility encodings", () => {
    test("recoverable ASCII control bytes normalize to ctrl+letter", () => {
      expect(parseKey("\x01")).toBe("ctrl+a");
      expect(parseKey("\x08")).toBe("ctrl+h");
      expect(parseKey("\x12")).toBe("ctrl+r");
      expect(parseKey("\x1a")).toBe("ctrl+z");
    });

    test("ESC-prefixed Alt combinations normalize to alt+<key>", () => {
      expect(parseKey("\x1bx")).toBe("alt+x");
      expect(parseKey("\x1bX")).toBe("alt+x");
      expect(parseKey("\x1b+")).toBe("alt+plus");
    });
  });

  // --- CSI u: special keys (also valid, sent by some terminals) ---

  describe("CSI u special keys", () => {
    test("escape", () => {
      expect(parseKey("\x1b[27u")).toBe("escape");
    });

    test("enter", () => {
      expect(parseKey("\x1b[13u")).toBe("enter");
    });

    test("tab", () => {
      expect(parseKey("\x1b[9u")).toBe("tab");
    });

    test("backspace", () => {
      expect(parseKey("\x1b[127u")).toBe("backspace");
    });

    test("space via CSI u", () => {
      expect(parseKey("\x1b[32u")).toBe("space");
    });

    test("plus via CSI u", () => {
      expect(parseKey("\x1b[43u")).toBe("plus");
    });

    test("legacy shift+tab (CSI Z)", () => {
      // tmux and some terminals send this instead of CSI 9;2 u
      expect(parseKey("\x1b[Z")).toBe("shift+tab");
    });

    test("explicit modifier=1 means no modifiers", () => {
      expect(parseKey("\x1b[27;1u")).toBe("escape");
      expect(parseKey("\x1b[13;1u")).toBe("enter");
    });

    test("printable codepoint via CSI u (robustness)", () => {
      // At level 1 unmodified printable chars arrive as raw bytes,
      // but the parser should handle CSI u for them gracefully
      expect(parseKey("\x1b[97u")).toBe("a");
      expect(parseKey("\x1b[65u")).toBe("a"); // uppercase A codepoint → lowercase
    });
  });

  // --- CSI u: modifier combos ---

  describe("CSI u modifier combos", () => {
    test("ctrl+letter", () => {
      expect(parseKey(kittyEncode("ctrl+c"))).toBe("ctrl+c");
      expect(parseKey(kittyEncode("ctrl+s"))).toBe("ctrl+s");
      expect(parseKey(kittyEncode("ctrl+q"))).toBe("ctrl+q");
      expect(parseKey(kittyEncode("ctrl+a"))).toBe("ctrl+a");
    });

    test("alt+letter", () => {
      expect(parseKey(kittyEncode("alt+x"))).toBe("alt+x");
      expect(parseKey(kittyEncode("alt+a"))).toBe("alt+a");
    });

    test("shift+special", () => {
      expect(parseKey(kittyEncode("shift+enter"))).toBe("shift+enter");
      expect(parseKey(kittyEncode("shift+tab"))).toBe("shift+tab");
    });

    test("ctrl+special", () => {
      expect(parseKey(kittyEncode("ctrl+enter"))).toBe("ctrl+enter");
      expect(parseKey(kittyEncode("ctrl+space"))).toBe("ctrl+space");
      expect(parseKey(kittyEncode("ctrl+plus"))).toBe("ctrl+plus");
    });

    test("multi-modifier combos", () => {
      expect(parseKey(kittyEncode("ctrl+shift+n"))).toBe("ctrl+shift+n");
      expect(parseKey(kittyEncode("ctrl+alt+shift+a"))).toBe(
        "ctrl+alt+shift+a",
      );
      expect(parseKey(kittyEncode("ctrl+alt+x"))).toBe("ctrl+alt+x");
    });
  });

  // --- Arrow keys ---

  describe("arrow keys", () => {
    test("unmodified arrows", () => {
      expect(parseKey(kittyEncode("up"))).toBe("up");
      expect(parseKey(kittyEncode("down"))).toBe("down");
      expect(parseKey(kittyEncode("right"))).toBe("right");
      expect(parseKey(kittyEncode("left"))).toBe("left");
    });

    test("modified arrows", () => {
      expect(parseKey(kittyEncode("ctrl+up"))).toBe("ctrl+up");
      expect(parseKey(kittyEncode("shift+left"))).toBe("shift+left");
      expect(parseKey(kittyEncode("alt+down"))).toBe("alt+down");
      expect(parseKey(kittyEncode("ctrl+shift+right"))).toBe(
        "ctrl+shift+right",
      );
    });
  });

  // --- Home/End ---

  describe("home/end", () => {
    test("unmodified", () => {
      expect(parseKey(kittyEncode("home"))).toBe("home");
      expect(parseKey(kittyEncode("end"))).toBe("end");
    });

    test("modified", () => {
      expect(parseKey(kittyEncode("ctrl+home"))).toBe("ctrl+home");
      expect(parseKey(kittyEncode("shift+end"))).toBe("shift+end");
    });
  });

  // --- Tilde keys (Delete, PageUp, PageDown) ---

  describe("tilde keys", () => {
    test("unmodified", () => {
      expect(parseKey(kittyEncode("delete"))).toBe("delete");
      expect(parseKey(kittyEncode("pageup"))).toBe("pageup");
      expect(parseKey(kittyEncode("pagedown"))).toBe("pagedown");
    });

    test("modified", () => {
      expect(parseKey(kittyEncode("shift+delete"))).toBe("shift+delete");
      expect(parseKey(kittyEncode("ctrl+pageup"))).toBe("ctrl+pageup");
    });
  });

  // --- Function keys ---

  describe("function keys", () => {
    test("unmodified", () => {
      expect(parseKey(kittyEncode("f1"))).toBe("f1");
      expect(parseKey(kittyEncode("f5"))).toBe("f5");
      expect(parseKey(kittyEncode("f12"))).toBe("f12");
    });

    test("modified", () => {
      expect(parseKey(kittyEncode("ctrl+f5"))).toBe("ctrl+f5");
      expect(parseKey(kittyEncode("shift+f1"))).toBe("shift+f1");
    });
  });
});

// ── isEditingKey ────────────────────────────────────────────────────────────

describe("isEditingKey", () => {
  test("single printable characters are editing keys", () => {
    expect(isEditingKey("a")).toBe(true);
    expect(isEditingKey("1")).toBe(true);
    expect(isEditingKey("/")).toBe(true);
  });

  test("named editing keys", () => {
    expect(isEditingKey("enter")).toBe(true);
    expect(isEditingKey("backspace")).toBe(true);
    expect(isEditingKey("delete")).toBe(true);
    expect(isEditingKey("tab")).toBe(true);
    expect(isEditingKey("space")).toBe(true);
    expect(isEditingKey("plus")).toBe(true);
    expect(isEditingKey("up")).toBe(true);
    expect(isEditingKey("down")).toBe(true);
    expect(isEditingKey("left")).toBe(true);
    expect(isEditingKey("right")).toBe(true);
    expect(isEditingKey("home")).toBe(true);
    expect(isEditingKey("end")).toBe(true);
  });

  test("shift+enter is an editing key (inserts newline)", () => {
    expect(isEditingKey("shift+enter")).toBe(true);
  });

  test("TextInput modifier editing shortcuts are editing keys", () => {
    expect(isEditingKey("ctrl+a")).toBe(true);
    expect(isEditingKey("ctrl+e")).toBe(true);
    expect(isEditingKey("alt+b")).toBe(true);
    expect(isEditingKey("alt+f")).toBe(true);
    expect(isEditingKey("ctrl+left")).toBe(true);
    expect(isEditingKey("ctrl+right")).toBe(true);
    expect(isEditingKey("ctrl+w")).toBe(true);
    expect(isEditingKey("alt+d")).toBe(true);
  });

  test("other modifier combos are NOT editing keys", () => {
    expect(isEditingKey("ctrl+s")).toBe(false);
    expect(isEditingKey("ctrl+r")).toBe(false);
    expect(isEditingKey("alt+x")).toBe(false);
    expect(isEditingKey("alt+plus")).toBe(false);
    expect(isEditingKey("ctrl+shift+n")).toBe(false);
    expect(isEditingKey("shift+tab")).toBe(false);
  });

  test("escape is NOT an editing key", () => {
    expect(isEditingKey("escape")).toBe(false);
  });
});

// ── normalizeKey ────────────────────────────────────────────────────────────

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
