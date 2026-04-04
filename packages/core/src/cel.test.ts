import { afterEach, describe, expect, test } from "bun:test";
import { cel } from "./cel.js";
import { MockTerminal } from "./terminal.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";
import { VStack, HStack } from "./primitives/stacks.js";

describe("cel end-to-end", () => {
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
    // process.nextTick batching — wait for it to fire
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  test("renders a single Text node", async () => {
    const term = setup(10, 1);
    cel.viewport(() => Text("Hello"));
    await waitForRender();

    expect(term.output).toContain("Hello");
  });

  test("renders styled text with color", async () => {
    const term = setup(10, 1);
    cel.viewport(() => Text("Red", { fgColor: "red" }));
    await waitForRender();

    expect(term.output).toContain("\x1b[31m");
    expect(term.output).toContain("Red");
  });

  test("renders bold text", async () => {
    const term = setup(10, 1);
    cel.viewport(() => Text("Bold", { bold: true }));
    await waitForRender();

    expect(term.output).toContain("\x1b[1m");
    expect(term.output).toContain("Bold");
  });

  test("renders text with repeat fill", async () => {
    const term = setup(10, 1);
    cel.viewport(() => Text("-", { repeat: "fill" }));
    await waitForRender();

    expect(term.output).toContain("----------");
  });

  test("renders VStack with children", async () => {
    const term = setup(10, 4);
    cel.viewport(() => VStack({}, [Text("Line 1"), Text("Line 2")]));
    await waitForRender();

    expect(term.output).toContain("Line 1");
    expect(term.output).toContain("Line 2");
  });

  test("renders HStack with children", async () => {
    const term = setup(20, 1);
    cel.viewport(() => HStack({}, [Text("Left"), Text("Right")]));
    await waitForRender();

    expect(term.output).toContain("Left");
    expect(term.output).toContain("Right");
  });

  test("re-renders on cel.render()", async () => {
    const term = setup(10, 1);
    let text = "First";
    cel.viewport(() => Text(text));
    await waitForRender();

    expect(term.output).toContain("First");

    term.clearOutput();
    text = "Second";
    cel.render();
    await waitForRender();

    expect(term.output).toContain("Second");
  });

  test("batches multiple render calls", async () => {
    const term = setup(10, 1);
    let count = 0;
    let renderCount = 0;

    cel.viewport(() => {
      renderCount++;
      return Text(`Count: ${count}`);
    });
    await waitForRender();
    expect(renderCount).toBe(1);

    // Multiple synchronous render calls — should batch into one
    count = 1;
    cel.render();
    count = 2;
    cel.render();
    count = 3;
    cel.render();

    await waitForRender();

    expect(renderCount).toBe(2);
    // Differential rendering: initial full render has "Count: 0",
    // subsequent render emits only the changed character "3"
    expect(term.output).toContain("Count: 0");
    expect(term.output).toContain("3");
  });

  test("wraps output in synchronized output markers", async () => {
    const term = setup(10, 1);
    cel.viewport(() => Text("Hi"));
    await waitForRender();

    expect(term.output).toContain("\x1b[?2026h");
    expect(term.output).toContain("\x1b[?2026l");
  });

  describe("input handling", () => {
    test("onClick fires on mouse click", async () => {
      const term = setup(20, 5);
      let clicked = false;
      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {
                clicked = true;
              },
            },
            [Text("Click me")],
          ),
        ]),
      );
      await waitForRender();

      // SGR mouse click release at (3, 0): ESC [ < 0 ; 4 ; 1 m
      term.sendInput("\x1b[<0;4;1m");
      await waitForRender();

      expect(clicked).toBe(true);
    });

    test("onKeyPress fires on key input", async () => {
      const term = setup(20, 5);
      let receivedKey = "";
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              receivedKey = key;
            },
          },
          [Text("hello")],
        ),
      );
      await waitForRender();

      // Send Ctrl+S
      term.sendInput("\x13");
      await waitForRender();

      expect(receivedKey).toBe("ctrl+s");
    });

    test("onScroll fires on mouse wheel", async () => {
      const term = setup(20, 5);
      let scrollOffset = 0;
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            overflow: "scroll",
            scrollOffset: scrollOffset,
            onScroll: (offset) => {
              scrollOffset = offset;
            },
          },
          // Enough content to exceed viewport (5 rows)
          Array.from({ length: 10 }, (_, i) => Text(`line ${i + 1}`)),
        ),
      );
      await waitForRender();

      // SGR scroll down at (3, 2): ESC [ < 65 ; 4 ; 3 M
      term.sendInput("\x1b[<65;4;3M");
      await waitForRender();

      expect(scrollOffset).toBe(1);
    });

    test("batched mouse scroll events are all processed", async () => {
      const term = setup(20, 5);
      let scrollOffset = 0;
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            overflow: "scroll",
            scrollOffset: scrollOffset,
            onScroll: (offset) => {
              scrollOffset = offset;
            },
          },
          [
            Text("line1"),
            Text("line2"),
            Text("line3"),
            Text("line4"),
            Text("line5"),
            Text("line6"),
            Text("line7"),
            Text("line8"),
          ],
        ),
      );
      await waitForRender();

      // 3 scroll-down events batched in one data chunk (as real terminals do)
      term.sendInput("\x1b[<65;4;3M\x1b[<65;4;3M\x1b[<65;4;3M");
      await waitForRender();

      expect(scrollOffset).toBe(3);
    });

    test("scroll clamps at max offset (no blank space past content)", async () => {
      const term = setup(20, 5);
      let scrollOffset = 0;
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            overflow: "scroll",
            scrollOffset: scrollOffset,
            onScroll: (offset) => {
              scrollOffset = offset;
            },
          },
          // 8 items in 5-row viewport → max offset = 3
          Array.from({ length: 8 }, (_, i) => Text(`item ${i + 1}`)),
        ),
      );
      await waitForRender();

      // Scroll down 10 times — should clamp at 3
      for (let i = 0; i < 10; i++) {
        term.sendInput("\x1b[<65;4;3M");
        await waitForRender();
      }

      expect(scrollOffset).toBe(3);
    });
  });

  describe("focus system", () => {
    test("Tab moves focus to next focusable element", async () => {
      const term = setup(20, 5);
      const focused: string[] = [];
      let focus1 = false;
      let focus2 = false;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: focus1,
              onFocus: () => {
                focus1 = true;
                focus2 = false;
                focused.push("btn1");
              },
              onBlur: () => {
                focus1 = false;
              },
            },
            [Text("Btn1")],
          ),
          HStack(
            {
              onClick: () => {},
              focused: focus2,
              onFocus: () => {
                focus2 = true;
                focus1 = false;
                focused.push("btn2");
              },
              onBlur: () => {
                focus2 = false;
              },
            },
            [Text("Btn2")],
          ),
        ]),
      );
      await waitForRender();

      // Tab to focus first element
      term.sendInput("\t");
      await waitForRender();
      expect(focused).toEqual(["btn1"]);

      // Tab to focus second element
      term.sendInput("\t");
      await waitForRender();
      expect(focused).toEqual(["btn1", "btn2"]);
    });

    test("Shift+Tab moves focus backwards", async () => {
      const term = setup(20, 5);
      let focus1 = false;
      let focus2 = true;
      const focused: string[] = [];

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: focus1,
              onFocus: () => {
                focus1 = true;
                focus2 = false;
                focused.push("btn1");
              },
              onBlur: () => {
                focus1 = false;
              },
            },
            [Text("Btn1")],
          ),
          HStack(
            {
              onClick: () => {},
              focused: focus2,
              onFocus: () => {
                focus2 = true;
                focus1 = false;
                focused.push("btn2");
              },
              onBlur: () => {
                focus2 = false;
              },
            },
            [Text("Btn2")],
          ),
        ]),
      );
      await waitForRender();

      // Shift+Tab from btn2 should focus btn1
      term.sendInput("\x1b[Z");
      await waitForRender();
      expect(focused).toEqual(["btn1"]);
    });

    test("Escape unfocuses the current element", async () => {
      const term = setup(20, 5);
      let blurred = false;
      let btnFocused = true;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: btnFocused,
              onBlur: () => {
                blurred = true;
                btnFocused = false;
              },
            },
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();

      term.sendInput("\x1b");
      await waitForRender();
      expect(blurred).toBe(true);
    });

    test("Enter activates focused clickable container", async () => {
      const term = setup(20, 5);
      let clicked = false;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {
                clicked = true;
              },
              focused: true,
            },
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();

      term.sendInput("\r");
      await waitForRender();
      expect(clicked).toBe(true);
    });

    test("mouse click on focusable element fires onFocus", async () => {
      const term = setup(20, 5);
      let btnFocused = false;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: btnFocused,
              onFocus: () => {
                btnFocused = true;
              },
            },
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();

      // Click on the button at (1, 0)
      term.sendInput("\x1b[<0;2;1m");
      await waitForRender();
      expect(btnFocused).toBe(true);
    });

    test("Tab wraps around to first element", async () => {
      const term = setup(20, 5);
      let focus1 = false;
      let focus2 = true;
      const focused: string[] = [];

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: focus1,
              onFocus: () => {
                focus1 = true;
                focus2 = false;
                focused.push("btn1");
              },
              onBlur: () => {
                focus1 = false;
              },
            },
            [Text("Btn1")],
          ),
          HStack(
            {
              onClick: () => {},
              focused: focus2,
              onFocus: () => {
                focus2 = true;
                focus1 = false;
                focused.push("btn2");
              },
              onBlur: () => {
                focus2 = false;
              },
            },
            [Text("Btn2")],
          ),
        ]),
      );
      await waitForRender();

      // Tab from btn2 (last) should wrap to btn1
      term.sendInput("\t");
      await waitForRender();
      expect(focused).toEqual(["btn1"]);
    });
  });

  describe("onKeyPress bubbling", () => {
    test("key bubbles from focused element up through ancestors", async () => {
      const term = setup(20, 5);
      const received: string[] = [];

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              received.push("root:" + key);
            },
          },
          [
            VStack(
              {
                onKeyPress: (key) => {
                  received.push("mid:" + key);
                },
              },
              [
                HStack(
                  {
                    onClick: () => {},
                    focused: true,
                  },
                  [Text("Focused Btn")],
                ),
              ],
            ),
          ],
        ),
      );
      await waitForRender();

      // Send a key — should bubble from focused btn through mid, then root
      term.sendInput("x");
      await waitForRender();

      // Nearest ancestor with onKeyPress is "mid", so it handles first
      expect(received).toEqual(["mid:x"]);
    });

    test("key reaches root onKeyPress when no intermediate handlers", async () => {
      const term = setup(20, 5);
      let rootKey = "";

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              rootKey = key;
            },
          },
          [
            HStack(
              {
                onClick: () => {},
                focused: true,
              },
              [Text("Btn")],
            ),
          ],
        ),
      );
      await waitForRender();

      term.sendInput("y");
      await waitForRender();
      expect(rootKey).toBe("y");
    });

    test("modifier key from focused TextInput bubbles to ancestors", async () => {
      const term = setup(20, 5);
      let parentKey = "";
      let inputValue = "hello";

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              parentKey = key;
            },
          },
          [
            TextInput({
              value: inputValue,
              onChange: (v) => {
                inputValue = v;
              },
              focused: true,
            }),
          ],
        ),
      );
      await waitForRender();

      // Ctrl+S is not an editing key — should bubble up
      term.sendInput("\x13");
      await waitForRender();
      expect(parentKey).toBe("ctrl+s");
    });

    test("unfocused state bubbles from root only", async () => {
      const term = setup(20, 5);
      let rootKey = "";

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              rootKey = key;
            },
          },
          [Text("no focus")],
        ),
      );
      await waitForRender();

      term.sendInput("z");
      await waitForRender();
      expect(rootKey).toBe("z");
    });
  });

  describe("TextInput Tab handling", () => {
    test("Tab inserts \\t when TextInput is focused", async () => {
      const term = setup(20, 5);
      let value = "hello";
      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
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

      // Tab should insert \t, not traverse focus
      term.sendInput("\t");
      await waitForRender();
      expect(value).toBe("hello\t");
    });

    test("Shift+Tab does not traverse focus when TextInput is focused", async () => {
      const term = setup(20, 5);
      let value = "hello";
      let btnFocused = false;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: btnFocused,
              onFocus: () => {
                btnFocused = true;
              },
            },
            [Text("Btn")],
          ),
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

      // Shift+Tab should not move focus away from TextInput
      term.sendInput("\x1b[Z");
      await waitForRender();
      expect(btnFocused).toBe(false);
    });

    test("Tab traverses focus when TextInput is NOT focused", async () => {
      const term = setup(20, 5);
      let tiFocused = false;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          TextInput({
            value: "text",
            focused: tiFocused,
            onChange: () => {},
            onFocus: () => {
              tiFocused = true;
            },
          }),
        ]),
      );
      await waitForRender();

      // Tab should traverse to the TextInput (it's not focused yet)
      term.sendInput("\t");
      await waitForRender();
      expect(tiFocused).toBe(true);
    });

    test("Escape then Tab leaves TextInput and traverses", async () => {
      const term = setup(20, 5);
      let tiFocused = true;
      let btnFocused = false;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: btnFocused,
              onFocus: () => {
                btnFocused = true;
                tiFocused = false;
              },
            },
            [Text("Btn")],
          ),
          TextInput({
            value: "text",
            focused: tiFocused,
            onChange: () => {},
            onBlur: () => {
              tiFocused = false;
            },
          }),
        ]),
      );
      await waitForRender();

      // Escape to leave TextInput
      term.sendInput("\x1b");
      await waitForRender();
      expect(tiFocused).toBe(false);

      // Tab should now traverse to the button
      term.sendInput("\t");
      await waitForRender();
      expect(btnFocused).toBe(true);
    });

    test("Escape then Tab advances past the element that was unfocused", async () => {
      const term = setup(20, 5);
      let focused: string | null = "ti";

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          TextInput({
            value: "text",
            focused: focused === "ti",
            onChange: () => {},
            onFocus: () => {
              focused = "ti";
            },
            onBlur: () => {
              if (focused === "ti") focused = null;
            },
          }),
          HStack(
            {
              onClick: () => {},
              focused: focused === "btn",
              onFocus: () => {
                focused = "btn";
              },
              onBlur: () => {
                if (focused === "btn") focused = null;
              },
            },
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();
      expect(focused as string | null).toBe("ti");

      // Escape to unfocus TextInput
      term.sendInput("\x1b");
      await waitForRender();
      expect(focused as string | null).toBe(null);

      // Tab should go FORWARD to the button (next after TextInput),
      // not back to the TextInput
      term.sendInput("\t");
      await waitForRender();
      expect(focused as string | null).toBe("btn");
    });

    test("Escape then Shift+Tab goes backward from the unfocused element", async () => {
      const term = setup(20, 5);
      let focused: string | null = null;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: focused === "a",
              onFocus: () => {
                focused = "a";
              },
              onBlur: () => {
                if (focused === "a") focused = null;
              },
            },
            [Text("A")],
          ),
          HStack(
            {
              onClick: () => {},
              focused: focused === "b",
              onFocus: () => {
                focused = "b";
              },
              onBlur: () => {
                if (focused === "b") focused = null;
              },
            },
            [Text("B")],
          ),
          HStack(
            {
              onClick: () => {},
              focused: focused === "c",
              onFocus: () => {
                focused = "c";
              },
              onBlur: () => {
                if (focused === "c") focused = null;
              },
            },
            [Text("C")],
          ),
        ]),
      );
      await waitForRender();

      // Tab to B
      term.sendInput("\t"); // → A
      await waitForRender();
      term.sendInput("\t"); // → B
      await waitForRender();
      expect(focused as string | null).toBe("b");

      // Escape, then Shift+Tab should go backward to A
      term.sendInput("\x1b");
      await waitForRender();
      expect(focused as string | null).toBe(null);

      term.sendInput("\x1b[Z"); // Shift+Tab
      await waitForRender();
      expect(focused as string | null).toBe("a");
    });
  });

  describe("TextInput mouse wheel scroll", () => {
    test("mouse wheel scrolls TextInput content", async () => {
      const term = setup(20, 3);
      let value = "line1\nline2\nline3\nline4\nline5";
      // Stable onChange ref so TextInput scroll state persists across re-renders
      const onChange = (v: string) => {
        value = v;
      };

      cel.viewport(() =>
        VStack({ width: 20, height: 3 }, [
          TextInput({
            value,
            height: 3,
            onChange,
          }),
        ]),
      );
      await waitForRender();

      // Initially line1 should be visible
      const buf1 = cel._getBuffer()!;
      let row0 = "";
      for (let x = 0; x < 5; x++) row0 += buf1.get(x, 0).char;
      expect(row0).toBe("line1");

      // Scroll down at (5, 1)
      term.sendInput("\x1b[<65;6;2M");
      await waitForRender();

      // After scrolling down, line1 should no longer be at row 0
      const buf2 = cel._getBuffer()!;
      let row0After = "";
      for (let x = 0; x < 5; x++) row0After += buf2.get(x, 0).char;
      expect(row0After).toBe("line2");
    });

    test("mouse wheel scroll up clamps at 0", async () => {
      const term = setup(20, 3);
      let value = "line1\nline2\nline3\nline4";
      const onChange = (v: string) => {
        value = v;
      };

      cel.viewport(() =>
        VStack({ width: 20, height: 3 }, [
          TextInput({
            value,
            height: 3,
            onChange,
          }),
        ]),
      );
      await waitForRender();

      // Scroll up (already at top, should clamp to 0)
      term.sendInput("\x1b[<64;6;2M");
      await waitForRender();

      // line1 should still be at row 0
      const buf = cel._getBuffer()!;
      let row0 = "";
      for (let x = 0; x < 5; x++) row0 += buf.get(x, 0).char;
      expect(row0).toBe("line1");
    });

    test("mouse wheel prefers innermost TextInput over outer scrollable", async () => {
      const term = setup(20, 3);
      let outerScrolled = false;
      let value = "line1\nline2\nline3\nline4";
      const onChange = (v: string) => {
        value = v;
      };

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 3,
            overflow: "scroll",
            scrollOffset: 0,
            onScroll: () => {
              outerScrolled = true;
            },
          },
          [
            TextInput({
              value,
              height: 3,
              onChange,
            }),
          ],
        ),
      );
      await waitForRender();

      // Scroll down — should target TextInput, not outer VStack
      term.sendInput("\x1b[<65;6;2M");
      await waitForRender();

      expect(outerScrolled).toBe(false);

      // Verify TextInput scrolled
      const buf = cel._getBuffer()!;
      let row0 = "";
      for (let x = 0; x < 5; x++) row0 += buf.get(x, 0).char;
      expect(row0).toBe("line2");
    });
  });
});
