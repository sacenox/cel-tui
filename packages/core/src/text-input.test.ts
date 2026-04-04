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
          placeholder: Text("type here...", { fgColor: "brightBlack" }),
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

  test("submitKey fires onSubmit instead of inserting", async () => {
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
          onSubmit: () => {
            submitted = true;
          },
          submitKey: "enter",
        }),
      ]),
    );
    await waitForRender();

    term.sendInput(ENTER);
    await waitForRender();

    expect(submitted).toBe(true);
    expect(value).toBe("hello"); // Value should not change
  });

  test("ctrl+enter as submitKey with enter for newlines", async () => {
    const term = setup(20, 3);
    let submitted = false;
    let value = "hi";
    cel.viewport(() =>
      VStack({}, [
        TextInput({
          value,
          focused: true,
          onChange: (v) => {
            value = v;
          },
          onSubmit: () => {
            submitted = true;
          },
          submitKey: "ctrl+enter",
        }),
      ]),
    );
    await waitForRender();

    // Enter should insert newline (not submit)
    term.sendInput(ENTER);
    await waitForRender();
    expect(value).toBe("hi\n");
    expect(submitted).toBe(false);
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
});
