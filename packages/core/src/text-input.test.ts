import { afterEach, describe, expect, test } from "bun:test";
import { cel } from "./cel.js";
import { MockTerminal } from "./terminal.js";
import { VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";
import { kittyEncode } from "./test-helpers.js";

const ENTER = kittyEncode("enter");
const BACKSPACE = kittyEncode("backspace");
const CTRL_S = kittyEncode("ctrl+s");
const LEFT = kittyEncode("left");

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
    await new Promise((resolve) => setTimeout(resolve, 10));
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
    const buf = cel._getBuffer()!;
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

    const buf = cel._getBuffer()!;
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
    const buf = cel._getBuffer()!;
    let found = false;
    for (let x = 0; x < 30; x++) {
      if (buf.get(x, 0).char === "a") {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
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

    const buf = cel._getBuffer()!;
    // TextInput should have height 3 (1 content + 2 padding)
    // "after" should start at row 3
    let afterRow = "";
    for (let x = 0; x < 5; x++) afterRow += buf.get(x, 3).char;
    expect(afterRow).toBe("after");
  });
});
