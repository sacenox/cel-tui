import { afterEach, describe, expect, test } from "bun:test";
import { cel } from "./cel.js";
import { MockTerminal } from "./terminal.js";
import { VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";

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
    term.sendInput("\x7f");
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
    term.sendInput("\r");
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

    term.sendInput("\r");
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
    term.sendInput("\r");
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
    term.sendInput("\x13");
    await waitForRender();

    expect(receivedKey).toBe("ctrl+s");
    expect(value).toBe("text"); // Value unchanged
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
