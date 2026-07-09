import { afterEach, describe, expect, test } from "bun:test";
import { VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";
import { MockTerminal } from "./terminal.js";
import { testCel as cel, kittyEncode } from "./test-helpers.js";

const ENTER = kittyEncode("enter");
const BACKSPACE = kittyEncode("backspace");
const CTRL_A = kittyEncode("ctrl+a");
const CTRL_E = kittyEncode("ctrl+e");
const CTRL_LEFT = kittyEncode("ctrl+left");
const CTRL_RIGHT = kittyEncode("ctrl+right");
const CTRL_S = kittyEncode("ctrl+s");
const CTRL_W = kittyEncode("ctrl+w");
const ALT_B = kittyEncode("alt+b");
const ALT_D = kittyEncode("alt+d");
const ALT_F = kittyEncode("alt+f");
const UP = kittyEncode("up");
const DOWN = kittyEncode("down");
const LEFT = kittyEncode("left");
const RIGHT = kittyEncode("right");
const DELETE = kittyEncode("delete");
const LEGACY_CTRL_R = "\x12";
const LEGACY_ALT_X = "\x1bx";
const BRACKETED_PASTE_START = "\x1b[200~";
const BRACKETED_PASTE_END = "\x1b[201~";

function bracketedPaste(text: string): string {
  return `${BRACKETED_PASTE_START}${text}${BRACKETED_PASTE_END}`;
}

describe("TextInput integration", () => {
  let term: MockTerminal;

  afterEach(() => {
    cel.stop();
  });

  function setup(columns = 20, rows = 5): MockTerminal {
    term = new MockTerminal(columns, rows);
    cel.init(term);
    return term;
  }

  async function waitForRender(): Promise<void> {
    await cel._flush();
  }

  function currentBuffer() {
    const buf = cel._getBuffer();
    expect(buf).not.toBeNull();
    if (buf === null) {
      throw new Error("Expected a rendered buffer");
    }
    return buf;
  }

  test("renders value text", async () => {
    const term = setup(20, 3);
    cel.viewport(() =>
      VStack({}, [TextInput({ value: "hello", onChange: () => {} })]),
    );
    await waitForRender();
    expect(term.output).toContain("hello");
  });

  test("renders placeholder when value is empty", async () => {
    const term = setup(20, 3);
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value: "",
          onChange: () => {},
          placeholder: Text("type here...", { fgColor: "color08" }),
        }),
      ]),
    );
    await waitForRender();
    expect(term.output).toContain("type here...");
  });

  test("typing fires onChange with new value", async () => {
    const term = setup(20, 3);
    let value = "hi";
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
          },
        }),
      ]),
    );
    await waitForRender();

    // Type "!"
    term.sendInput("!");
    await waitForRender();

    expect(value).toBe("hi!");
  });

  test("batched printable input inserts all characters in order", async () => {
    const term = setup(20, 3);
    let value = "hi";
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
          },
        }),
      ]),
    );
    await waitForRender();

    term.sendInput("ab");
    await waitForRender();

    expect(value).toBe("hiab");
  });

  test("bracketed paste in focused TextInput inserts full payload literally and skips onKeyPress", async () => {
    const term = setup(20, 3);
    let value = "hi";
    let onChangeCalls = 0;
    const keys: string[] = [];

    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
            onChangeCalls++;
          },
          onKeyPress: (key) => {
            keys.push(key);
          },
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(bracketedPaste("!\n\tok"));
    await waitForRender();

    expect(value).toBe("hi!\n\tok");
    expect(onChangeCalls).toBe(1);
    expect(keys).toEqual([]);
  });

  test("bracketed paste split across stdin chunks waits for end marker and fires one onChange", async () => {
    const term = setup(20, 3);
    let value = "";
    let onChangeCalls = 0;

    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
            onChangeCalls++;
          },
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(`${BRACKETED_PASTE_START}hel`);
    await waitForRender();
    expect(value).toBe("");
    expect(onChangeCalls).toBe(0);

    term.sendInput("lo\nwo");
    await waitForRender();
    expect(value).toBe("");
    expect(onChangeCalls).toBe(0);

    term.sendInput(`rld${BRACKETED_PASTE_END}`);
    await waitForRender();

    expect(value).toBe("hello\nworld");
    expect(onChangeCalls).toBe(1);
  });

  test("bracketed paste start marker can be split at every byte boundary", async () => {
    for (let split = 1; split < BRACKETED_PASTE_START.length; split++) {
      if (split > 1) {
        cel.stop();
      }

      const term = setup(20, 3);
      let value = "";
      let onChangeCalls = 0;

      cel.viewport(() =>
        VStack({}, [
          TextInput({
            value,
            focused: true,
            onChange: (v) => {
              value = v;
              onChangeCalls++;
            },
          }),
        ]),
      );
      await waitForRender();

      term.sendInput(BRACKETED_PASTE_START.slice(0, split));
      await waitForRender();
      expect(value).toBe("");
      expect(onChangeCalls).toBe(0);

      term.sendInput(
        `${BRACKETED_PASTE_START.slice(split)}hi${BRACKETED_PASTE_END}`,
      );
      await waitForRender();

      expect(value).toBe("hi");
      expect(onChangeCalls).toBe(1);
    }
  });

  test("a standalone legacy Escape is dispatched after the ambiguous prefix timeout", async () => {
    const term = setup(20, 3);
    const keys: string[] = [];

    cel.viewport(() =>
      VStack(
        {
          onKeyPress: (key) => {
            keys.push(key);
          },
        },
        [Text("content")],
      ),
    );
    await waitForRender();

    term.sendInput("\x1b");
    await new Promise((resolve) => setTimeout(resolve, 35));

    expect(keys).toEqual(["escape"]);
  });

  test("bracketed paste with no focused TextInput is ignored and does not bubble as keys", async () => {
    const term = setup(20, 3);
    let value = "";
    const receivedKeys: string[] = [];

    cel.viewport(() =>
      VStack(
        {
          onKeyPress: (key) => {
            receivedKeys.push(key);
          },
        },
        [
          TextInput({
            value,
            focused: false,
            onChange: (v) => {
              value = v;
            },
          }),
        ],
      ),
    );
    await waitForRender();

    term.sendInput(bracketedPaste("abc\n\tdef"));
    await waitForRender();

    expect(value).toBe("");
    expect(receivedKeys).toEqual([]);
  });

  test("onKeyPress receives normalized keys while TextInput inserts original text", async () => {
    const term = setup(20, 3);
    let keyReceived = "";
    let value = "";
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
          },
          onKeyPress: (key) => {
            keyReceived = key;
          },
        }),
      ]),
    );
    await waitForRender();

    term.sendInput("A");
    await waitForRender();

    expect(keyReceived).toBe("a");
    expect(value).toBe("A");
  });

  test("backspace deletes character", async () => {
    const term = setup(20, 3);
    let value = "abc";
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
          },
        }),
      ]),
    );
    await waitForRender();

    // Press backspace
    term.sendInput(BACKSPACE);
    await waitForRender();

    expect(value).toBe("ab");
  });

  test("ctrl+a and ctrl+e move to the start and end of the value", async () => {
    const term = setup(20, 3);
    let value = "hello";
    const onChange = (v: string) => {
      value = v;
    };
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(CTRL_A);
    await waitForRender();
    term.sendInput("X");
    await waitForRender();

    expect(value).toBe("Xhello");

    term.sendInput(CTRL_E);
    await waitForRender();
    term.sendInput("!");
    await waitForRender();

    expect(value).toBe("Xhello!");
  });

  test("alt+b and alt+f move by whitespace-delimited words", async () => {
    const term = setup(20, 3);
    let value = "hello brave world";
    const onChange = (v: string) => {
      value = v;
    };
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(ALT_B);
    await waitForRender();
    term.sendInput("!");
    await waitForRender();

    expect(value).toBe("hello brave !world");

    term.sendInput(CTRL_A);
    await waitForRender();
    term.sendInput(ALT_F);
    await waitForRender();
    term.sendInput("?");
    await waitForRender();

    expect(value).toBe("hello? brave !world");
  });

  test("ctrl+left and ctrl+right move by whitespace-delimited words", async () => {
    const term = setup(20, 3);
    let value = "hello brave world";
    const onChange = (v: string) => {
      value = v;
    };
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(CTRL_LEFT);
    await waitForRender();
    term.sendInput("!");
    await waitForRender();

    expect(value).toBe("hello brave !world");

    term.sendInput(CTRL_A);
    await waitForRender();
    term.sendInput(CTRL_RIGHT);
    await waitForRender();
    term.sendInput("?");
    await waitForRender();

    expect(value).toBe("hello? brave !world");
  });

  test("ctrl+w and alt+d delete by whitespace-delimited words", async () => {
    const term = setup(20, 3);
    let value = "hello brave world";
    const onChange = (v: string) => {
      value = v;
    };
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(CTRL_W);
    await waitForRender();

    expect(value).toBe("hello brave ");

    term.sendInput(CTRL_A);
    await waitForRender();
    term.sendInput(ALT_D);
    await waitForRender();

    expect(value).toBe(" brave ");
  });

  test("up follows visual wrapped lines in TextInput", async () => {
    const term = setup(20, 3);
    let value = "foo bar baz";
    const onChange = (v: string) => {
      value = v;
    };
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          width: 6,
          value,
          focused: true,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(UP);
    await waitForRender();
    term.sendInput("!");
    await waitForRender();

    expect(value).toBe("foo bar! baz");
  });

  test("down follows visual wrapped lines in TextInput", async () => {
    const term = setup(20, 3);
    let value = "foo bar baz";
    const onChange = (v: string) => {
      value = v;
    };
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          width: 6,
          value,
          focused: true,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(CTRL_A);
    await waitForRender();
    term.sendInput(DOWN);
    await waitForRender();
    term.sendInput("?");
    await waitForRender();

    expect(value).toBe("foo ?bar baz");
  });

  test("TextInput consumes editing modifier shortcuts instead of bubbling them", async () => {
    const term = setup(20, 3);
    let parentKey = "";
    let value = "hello brave world";
    cel.viewport(() =>
      VStack(
        {
          onKeyPress: (key) => {
            parentKey = key;
          },
        },
        [
          TextInput({
            value,
            focused: true,
            onChange: (v) => {
              value = v;
            },
          }),
        ],
      ),
    );
    await waitForRender();

    term.sendInput(CTRL_W);
    await waitForRender();

    expect(value).toBe("hello brave ");
    expect(parentKey).toBe("");
  });

  test("TextInput consumes editing keys when they are boundary no-ops", async () => {
    const term = setup(20, 3);
    const parentKeys: string[] = [];

    cel.viewport(() =>
      VStack(
        {
          onKeyPress: (key) => {
            parentKeys.push(key);
          },
        },
        [
          TextInput({
            value: "",
            focused: true,
            onChange: () => {},
          }),
        ],
      ),
    );
    await waitForRender();

    term.sendInput(
      BACKSPACE +
        LEFT +
        RIGHT +
        DELETE +
        CTRL_LEFT +
        CTRL_RIGHT +
        CTRL_W +
        ALT_B +
        ALT_D +
        ALT_F,
    );
    await waitForRender();

    expect(parentKeys).toEqual([]);
  });

  test("enter inserts newline by default", async () => {
    const term = setup(20, 3);
    let value = "ab";
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
          },
        }),
      ]),
    );
    await waitForRender();

    // Press enter
    term.sendInput(ENTER);
    await waitForRender();

    expect(value).toBe("ab\n");
  });

  test("onKeyPress returning false prevents default editing action", async () => {
    const term = setup(20, 3);
    let submitted = false;
    let value = "hello";
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
          },
          onKeyPress: (key) => {
            if (key === "enter") {
              submitted = true;
              return false;
            }
          },
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(ENTER);
    await waitForRender();

    expect(submitted).toBe(true);
    expect(value).toBe("hello"); // No newline inserted
  });

  test("onKeyPress not returning false allows default editing", async () => {
    const term = setup(20, 3);
    let keyReceived = "";
    let value = "hi";
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
          },
          onKeyPress: (key) => {
            keyReceived = key;
            // no return false — default editing proceeds
          },
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(ENTER);
    await waitForRender();

    expect(keyReceived).toBe("enter");
    expect(value).toBe("hi\n"); // Newline inserted
  });

  test("onKeyPress returning false prevents character insertion", async () => {
    const term = setup(20, 3);
    let value = "abc";
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
          },
          onKeyPress: (key) => {
            if (key === "x") return false;
          },
        }),
      ]),
    );
    await waitForRender();

    // "x" should be prevented
    term.sendInput("x");
    await waitForRender();
    expect(value).toBe("abc");

    // "y" should go through
    term.sendInput("y");
    await waitForRender();
    expect(value).toBe("abcy");
  });

  test("onKeyPress returning false prevents backspace", async () => {
    const term = setup(20, 3);
    let value = "abc";
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
          },
          onKeyPress: (key) => {
            if (key === "backspace") return false;
          },
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(BACKSPACE);
    await waitForRender();

    expect(value).toBe("abc"); // No deletion
  });

  test("onKeyPress on TextInput fires before ancestor onKeyPress", async () => {
    const term = setup(20, 3);
    let parentKey = "";
    let inputKey = "";
    let value = "hi";
    cel.viewport(() =>
      VStack(
        {
          onKeyPress: (key) => {
            parentKey = key;
          },
        },
        [
          TextInput({
            value,
            focused: true,
            onChange: (v) => {
              value = v;
            },
            onKeyPress: (key) => {
              if (key === "enter") {
                inputKey = key;
                return false; // prevent default, consume key
              }
            },
          }),
        ],
      ),
    );
    await waitForRender();

    term.sendInput(ENTER);
    await waitForRender();

    expect(inputKey).toBe("enter");
    expect(parentKey).toBe(""); // Ancestor never sees it
    expect(value).toBe("hi"); // No newline
  });

  test("non-editing key bubbles to ancestor when onKeyPress doesn't intercept", async () => {
    const term = setup(20, 3);
    let parentKey = "";
    let value = "hi";
    cel.viewport(() =>
      VStack(
        {
          onKeyPress: (key) => {
            parentKey = key;
          },
        },
        [
          TextInput({
            value,
            focused: true,
            onChange: (v) => {
              value = v;
            },
            onKeyPress: (key) => {
              // only intercept enter
              if (key === "enter") return false;
            },
          }),
        ],
      ),
    );
    await waitForRender();

    // ctrl+s is not intercepted by onKeyPress, and not an editing key — bubbles up
    term.sendInput(CTRL_S);
    await waitForRender();

    expect(parentKey).toBe("ctrl+s"); // Bubbled up
    expect(value).toBe("hi"); // Unchanged
  });

  test("modifier keys bubble up (not consumed by TextInput)", async () => {
    const term = setup(20, 3);
    let receivedKey = "";
    let value = "text";
    cel.viewport(() =>
      VStack(
        {
          onKeyPress: (key) => {
            receivedKey = key;
          },
        },
        [
          TextInput({
            value,
            focused: true,
            onChange: (v) => {
              value = v;
            },
          }),
        ],
      ),
    );
    await waitForRender();

    // Ctrl+S should bubble up
    term.sendInput(CTRL_S);
    await waitForRender();

    expect(receivedKey).toBe("ctrl+s");
    expect(value).toBe("text"); // Value unchanged
  });

  test("legacy ctrl+letter from tmux bubbles to ancestor without editing", async () => {
    const term = setup(20, 3);
    let parentKey = "";
    let value = "text";
    cel.viewport(() =>
      VStack(
        {
          onKeyPress: (key) => {
            parentKey = key;
          },
        },
        [
          TextInput({
            value,
            focused: true,
            onChange: (v) => {
              value = v;
            },
          }),
        ],
      ),
    );
    await waitForRender();

    term.sendInput(LEGACY_CTRL_R);
    await waitForRender();

    expect(parentKey).toBe("ctrl+r");
    expect(value).toBe("text");
  });

  test("ESC-prefixed Alt combos bubble to ancestor without editing", async () => {
    const term = setup(20, 3);
    let parentKey = "";
    let value = "text";
    cel.viewport(() =>
      VStack(
        {
          onKeyPress: (key) => {
            parentKey = key;
          },
        },
        [
          TextInput({
            value,
            focused: true,
            onChange: (v) => {
              value = v;
            },
          }),
        ],
      ),
    );
    await waitForRender();

    term.sendInput(LEGACY_ALT_X);
    await waitForRender();

    expect(parentKey).toBe("alt+x");
    expect(value).toBe("text");
  });

  test("cursor position persists across re-renders", async () => {
    const term = setup(20, 3);
    let value = "abcdef";
    const onChange = (v: string) => {
      value = v;
      cel.render();
    };

    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    // Move cursor left 3 times (from end of "abcdef")
    term.sendInput(LEFT); // left
    await waitForRender();
    term.sendInput(LEFT); // left
    await waitForRender();
    term.sendInput(LEFT); // left
    await waitForRender();

    // Now type "X" — should insert at position 3 (after "abc")
    term.sendInput("X");
    await waitForRender();

    expect(value).toBe("abcXdef");
  });

  test("stateKey preserves cursor across inline callback recreation", async () => {
    const term = setup(20, 3);
    let value = "abcdef";
    let showHeader = false;

    cel.viewport(() =>
      VStack({}, [
        ...(showHeader ? [Text("header")] : []),
        TextInput({
          stateKey: "editor",
          value,
          focused: true,
          onChange: (next) => {
            value = next;
          },
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(LEFT);
    await waitForRender();
    term.sendInput(LEFT);
    await waitForRender();
    term.sendInput(LEFT);
    await waitForRender();
    showHeader = true;
    cel.render();
    await waitForRender();
    term.sendInput("X");
    await waitForRender();

    expect(value).toBe("abcXdef");
  });

  test("controlled cursor inserts at the requested offset and reports updates", async () => {
    const term = setup(20, 3);
    let value = "abc";
    let cursor = 1;
    const cursorUpdates: number[] = [];

    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          cursor,
          focused: true,
          onChange: (next) => {
            value = next;
          },
          onCursorChange: (next) => {
            cursor = next;
            cursorUpdates.push(next);
          },
        }),
      ]),
    );
    await waitForRender();

    term.sendInput("X");
    await waitForRender();
    term.sendInput(RIGHT);
    await waitForRender();

    expect(value).toBe("aXbc");
    expect(cursor).toBe(3);
    expect(cursorUpdates).toEqual([2, 3]);
  });

  test("controlled cursor clamps backward to a grapheme boundary", async () => {
    const term = setup(20, 3);
    let value = "A👨‍👩‍👧B";
    let cursor = 2; // Inside the multi-codepoint family emoji.

    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          cursor,
          focused: true,
          onChange: (next) => {
            value = next;
          },
          onCursorChange: (next) => {
            cursor = next;
          },
        }),
      ]),
    );
    await waitForRender();

    term.sendInput("X");
    await waitForRender();

    expect(value).toBe("AX👨‍👩‍👧B");
    expect(cursor).toBe(2);
  });

  test("programmatic controlled cursor updates take effect on the next render", async () => {
    const term = setup(20, 3);
    let value = "abc";
    let cursor = 0;

    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          cursor,
          focused: true,
          onChange: (next) => {
            value = next;
          },
          onCursorChange: (next) => {
            cursor = next;
          },
        }),
      ]),
    );
    await waitForRender();

    cursor = 3;
    cel.render();
    await waitForRender();
    term.sendInput("X");
    await waitForRender();

    expect(value).toBe("abcX");
    expect(cursor).toBe(4);
  });

  test("unmounting a stateKey disposes its TextInput cursor state", async () => {
    const term = setup(20, 3);
    let value = "abc";
    let mounted = true;

    cel.viewport(() =>
      VStack(
        {},
        mounted
          ? [
              TextInput({
                stateKey: "editor",
                value,
                focused: true,
                onChange: (next) => {
                  value = next;
                },
              }),
            ]
          : [Text("unmounted")],
      ),
    );
    await waitForRender();

    term.sendInput(LEFT);
    await waitForRender();
    mounted = false;
    cel.render();
    await waitForRender();
    mounted = true;
    cel.render();
    await waitForRender();
    term.sendInput("X");
    await waitForRender();

    expect(value).toBe("abcX");
  });

  test("animated sibling updates do not emit cursor commands after synchronized output", async () => {
    const term = setup(20, 3);
    let tick = 0;
    const onChange = () => {};

    cel.viewport(() =>
      VStack({ height: "100%" }, [
        Text(`tick:${tick}`),
        TextInput({
          value: "abc",
          focused: true,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    term.clearOutput();
    tick = 1;
    cel.render();
    await waitForRender();

    expect(term.output.endsWith("\x1b[?2026l")).toBe(true);
    expect(term.output).not.toContain("\x1b[?25h");
    expect(term.output).toContain("\x1b7");
    expect(term.output).toContain("\x1b8");
  });

  test("auto-scrolls to keep cursor visible when typing past viewport", async () => {
    const term = setup(20, 3); // 3 rows tall
    let value = "line1\nline2\nline3";
    const onChange = (v: string) => {
      value = v;
      cel.render();
    };

    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          height: 3,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    // Press enter to add line4 — cursor is now on line 4 (index 3)
    // which is below the 3-row viewport
    term.sendInput(ENTER);
    await waitForRender();

    // The buffer should show the cursor line (line4 area)
    // not the top lines. Check that the scroll adjusted.
    const buf = currentBuffer();
    // The cursor should be visible somewhere in the viewport.
    // With 4 lines and 3-row viewport, scroll should be at least 1.
    // Row 2 (bottom of viewport) should show content from line3 or line4 area.
    // At minimum, the empty line4 cursor should be visible.
    // Let's verify line1 is NOT visible (scrolled past)
    let hasLine1 = false;
    for (let x = 0; x < 20; x++) {
      if (buf.get(x, 0).char === "l" && buf.get(x + 1, 0).char === "i") {
        const row = Array.from(
          { length: 5 },
          (_, i) => buf.get(x + i, 0).char,
        ).join("");
        if (row === "line1") hasLine1 = true;
      }
    }
    expect(hasLine1).toBe(false);
  });

  test("native cursor follows a TextInput shifted by ancestor scroll", async () => {
    const term = setup(10, 1);
    const onChange = () => {};

    cel.viewport(() =>
      VStack({ width: 10, height: 1, overflow: "scroll", scrollOffset: 1 }, [
        Text("above"),
        TextInput({ value: "x", height: 1, focused: true, onChange }),
      ]),
    );
    await waitForRender();

    expect(currentBuffer().get(0, 0).char).toBe("x");
    expect(term.output).toContain("\x1b[1;2H\x1b[1 q\x1b[?25h");
    expect(term.output).not.toContain("\x1b[2;2H");
  });

  test("native cursor shape follows TextInput cursorStyle", async () => {
    const term = setup(10, 1);

    cel.viewport(() =>
      TextInput({
        value: "x",
        cursorStyle: "bar",
        focused: true,
        onChange: () => {},
      }),
    );
    await waitForRender();

    expect(term.output).toContain("\x1b[1;2H\x1b[5 q\x1b[?25h");
  });

  test("native cursor is hidden when ancestor clipping scrolls the input away", async () => {
    const term = setup(10, 1);
    const onChange = () => {};

    cel.viewport(() =>
      VStack({ width: 10, height: 1, overflow: "scroll", scrollOffset: 1 }, [
        TextInput({ value: "x", height: 1, focused: true, onChange }),
        Text("below"),
      ]),
    );
    await waitForRender();

    expect(currentBuffer().get(0, 0).char).toBe("b");
    expect(term.output).not.toContain("\x1b[?25h");
    expect(term.output).not.toContain("\x1b[1;2H");
  });

  test("unfocused TextInput does not consume keys", async () => {
    const term = setup(20, 3);
    let receivedKey = "";
    let value = "text";
    cel.viewport(() =>
      VStack(
        {
          onKeyPress: (key) => {
            receivedKey = key;
          },
        },
        [
          TextInput({
            value,
            focused: false,
            onChange: (v) => {
              value = v;
            },
          }),
        ],
      ),
    );
    await waitForRender();

    term.sendInput("a");
    await waitForRender();

    expect(value).toBe("text"); // Not consumed
    expect(receivedKey).toBe("a"); // Bubbled up
  });

  test("padding insets content area", async () => {
    setup(20, 5);
    let value = "hi";

    cel.viewport(() =>
      VStack({ width: 20, height: 5 }, [
        TextInput({
          width: 10,
          height: 3,
          padding: { x: 2, y: 1 },
          value,
          onChange: (v) => {
            value = v;
          },
          focused: true,
        }),
      ]),
    );
    await waitForRender();

    const buf = currentBuffer();
    // With padding x=2, content starts at col 2. With padding y=1, content at row 1.
    // Content should be at (2, 1) not (0, 0)
    expect(buf.get(0, 0).char).toBe(" "); // padding
    expect(buf.get(1, 0).char).toBe(" "); // padding
    expect(buf.get(2, 1).char).not.toBe(" "); // content area — "h" or cursor
  });

  test("cursor resets when value is cleared externally", async () => {
    const term = setup(30, 3);
    let value = "hello";
    const onChange = (v: string) => {
      value = v;
      cel.render();
    };

    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    // Type a character to confirm cursor is at end
    term.sendInput("!");
    await waitForRender();
    expect(value).toBe("hello!");

    // Simulate external clear (e.g. after send)
    value = "";
    cel.render();
    await waitForRender();

    // Now type again — should appear at position 0, not at stale cursor
    term.sendInput("a");
    await waitForRender();
    expect(value).toBe("a");

    // Verify the text is actually visible in the buffer
    const buf = currentBuffer();
    let found = false;
    for (let x = 0; x < 30; x++) {
      if (buf.get(x, 0).char === "a") {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test("programmatic insert at the cursor advances the cursor", async () => {
    const term = setup(30, 3);
    let value = "abcd";
    const onChange = (v: string) => {
      value = v;
      cel.render();
    };

    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange,
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(LEFT);
    await waitForRender();
    term.sendInput(LEFT);
    await waitForRender();

    value = "abXcd";
    cel.render();
    await waitForRender();

    term.sendInput("!");
    await waitForRender();

    expect(value).toBe("abX!cd");
  });

  test("padding affects intrinsic height", async () => {
    setup(20, 10);
    let value = "line1";

    cel.viewport(() =>
      VStack({ width: 20, height: 10 }, [
        TextInput({
          width: 10,
          padding: { y: 1 },
          value,
          onChange: (v) => {
            value = v;
          },
        }),
        Text("after"),
      ]),
    );
    await waitForRender();

    const buf = currentBuffer();
    // TextInput should have height 3 (1 content + 2 padding)
    // "after" should start at row 3
    let afterRow = "";
    for (let x = 0; x < 5; x++) afterRow += buf.get(x, 3).char;
    expect(afterRow).toBe("after");
  });
});
