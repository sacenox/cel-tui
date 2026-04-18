import { afterEach, describe, expect, test } from "bun:test";
import { cel } from "./cel.js";
import { HStack, VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";
import { MockTerminal } from "./terminal.js";
import { kittyEncode } from "./test-helpers.js";

// Kitty protocol byte sequences for commonly used keys
const TAB = kittyEncode("tab");
const ENTER = kittyEncode("enter");
const ESCAPE = kittyEncode("escape");
const SHIFT_TAB = kittyEncode("shift+tab");
const CTRL_S = kittyEncode("ctrl+s");
const LEGACY_CTRL_R = "\x12";
// biome-ignore lint/complexity/useRegexLiterals: using RegExp here avoids control-character regex diagnostics.
const TITLE_SEQUENCE_RE = new RegExp(
  String.raw`\x1b\][02];([^\x07\x1b]*)(?:\x07|\x1b\\)`,
  "g",
);

function extractTitlePayloads(output: string): string[] {
  return Array.from(output.matchAll(TITLE_SEQUENCE_RE), (match) => {
    const payload = match[1];
    if (payload === undefined) {
      throw new Error("Missing terminal title payload");
    }
    return payload;
  });
}

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

  function currentBuffer() {
    const buf = cel._getBuffer();
    expect(buf).not.toBeNull();
    if (buf === null) {
      throw new Error("Expected a rendered buffer");
    }
    return buf;
  }

  test("renders a single Text node", async () => {
    const term = setup(10, 1);
    cel.viewport(() => Text("Hello"));
    await waitForRender();

    expect(term.output).toContain("Hello");
  });

  test("renders styled text with color", async () => {
    const term = setup(10, 1);
    cel.viewport(() => Text("Red", { fgColor: "color01" }));
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

  describe("terminal title", () => {
    test("setTitle writes a terminal title OSC sequence with the requested text", () => {
      const term = setup();

      cel.setTitle("cel-tui demo");

      expect(extractTitlePayloads(term.output)).toEqual(["cel-tui demo"]);
    });

    test("setTitle strips control characters from the title text", () => {
      const term = setup();

      cel.setTitle("ab\x00c\nd\te\x1bf");

      expect(extractTitlePayloads(term.output)).toEqual(["abcdef"]);
    });

    test("setTitle can be called multiple times and writes each title update", () => {
      const term = setup();

      cel.setTitle("first");
      cel.setTitle("second");

      expect(extractTitlePayloads(term.output)).toEqual(["first", "second"]);
    });

    test("stop does not emit a title restore sequence", () => {
      const term = setup();
      cel.setTitle("session");
      term.clearOutput();

      cel.stop();

      expect(extractTitlePayloads(term.output)).toEqual([]);
    });
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
      term.sendInput(CTRL_S);
      await waitForRender();

      expect(receivedKey).toBe("ctrl+s");
    });

    test("batched keyboard events are all processed in order", async () => {
      const term = setup(20, 5);
      const receivedKeys: string[] = [];
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              receivedKeys.push(key);
            },
          },
          [Text("hello")],
        ),
      );
      await waitForRender();

      term.sendInput(`${LEGACY_CTRL_R}${CTRL_S}`);
      await waitForRender();

      expect(receivedKeys).toEqual(["ctrl+r", "ctrl+s"]);
    });

    test("onScroll fires on mouse wheel using the adaptive default step", async () => {
      const term = setup(20, 12);
      let scrollOffset = 0;
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 12,
            overflow: "scroll",
            scrollOffset: scrollOffset,
            onScroll: (offset) => {
              scrollOffset = offset;
            },
          },
          // 12-row viewport → adaptive wheel step = floor(12 / 3) = 4
          Array.from({ length: 20 }, (_, i) => Text(`line ${i + 1}`)),
        ),
      );
      await waitForRender();

      term.sendInput("\x1b[<65;4;3M");
      await waitForRender();

      expect(scrollOffset).toBe(4);
    });

    test("batched mouse scroll events are all processed", async () => {
      const term = setup(20, 12);
      let scrollOffset = 0;
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 12,
            overflow: "scroll",
            scrollOffset: scrollOffset,
            onScroll: (offset) => {
              scrollOffset = offset;
            },
          },
          Array.from({ length: 30 }, (_, i) => Text(`line${i + 1}`)),
        ),
      );
      await waitForRender();

      // 3 scroll-down events batched in one data chunk (as real terminals do)
      // 12-row viewport → adaptive wheel step = 4, so total = 12
      term.sendInput("\x1b[<65;4;3M\x1b[<65;4;3M\x1b[<65;4;3M");
      await waitForRender();

      expect(scrollOffset).toBe(12);
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

    test("onScroll receives maxOffset", async () => {
      const term = setup(20, 12);
      let scrollOffset = 0;
      let receivedMax = -1;
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 12,
            overflow: "scroll",
            scrollOffset: scrollOffset,
            onScroll: (offset, maxOffset) => {
              scrollOffset = offset;
              receivedMax = maxOffset;
            },
          },
          // 20 items in 12-row viewport → max offset = 8
          Array.from({ length: 20 }, (_, i) => Text(`item ${i + 1}`)),
        ),
      );
      await waitForRender();

      term.sendInput("\x1b[<65;4;3M");
      await waitForRender();

      expect(scrollOffset).toBe(4);
      expect(receivedMax).toBe(8);
    });

    test("scrollStep overrides the adaptive default", async () => {
      const term = setup(20, 12);
      let scrollOffset = 0;
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 12,
            overflow: "scroll",
            scrollStep: 6,
            scrollOffset: scrollOffset,
            onScroll: (offset) => {
              scrollOffset = offset;
            },
          },
          Array.from({ length: 30 }, (_, i) => Text(`line ${i + 1}`)),
        ),
      );
      await waitForRender();

      term.sendInput("\x1b[<65;4;3M");
      await waitForRender();

      expect(scrollOffset).toBe(6);
    });

    test("uncontrolled scroll works without onScroll", async () => {
      const term = setup(20, 12);
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 12,
            overflow: "scroll",
          },
          Array.from({ length: 20 }, (_, i) => Text(`line ${i + 1}`)),
        ),
      );
      await waitForRender();

      // Before scroll, line 1 should be visible at row 0
      const buf1 = currentBuffer();
      expect(buf1.get(0, 0).char).toBe("l"); // "line 1"

      term.sendInput("\x1b[<65;4;3M");
      await waitForRender();

      // After scrolling by the adaptive step (4), line 5 should now be at row 0
      const buf2 = currentBuffer();
      let row0 = "";
      for (let x = 0; x < 6; x++) row0 += buf2.get(x, 0).char;
      expect(row0).toBe("line 5");
    });

    test("uncontrolled scroll clamps at max offset", async () => {
      const term = setup(20, 3);
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 3,
            overflow: "scroll",
          },
          // 5 items in 3-row viewport → max offset = 2
          Array.from({ length: 5 }, (_, i) => Text(`item ${i + 1}`)),
        ),
      );
      await waitForRender();

      // Scroll down 10 times — should clamp at 2
      for (let i = 0; i < 10; i++) {
        term.sendInput("\x1b[<65;4;2M");
        await waitForRender();
      }

      // Row 0 should show item 3 (offset=2), row 2 should show item 5
      const buf = currentBuffer();
      let row0 = "";
      for (let x = 0; x < 6; x++) row0 += buf.get(x, 0).char;
      expect(row0).toBe("item 3");

      let row2 = "";
      for (let x = 0; x < 6; x++) row2 += buf.get(x, 2).char;
      expect(row2).toBe("item 5");
    });

    test("scroll clamps correctly with padding", async () => {
      const term = setup(20, 7);
      let scrollOffset = 0;
      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 7,
            overflow: "scroll",
            padding: { y: 1 },
            scrollOffset: scrollOffset,
            onScroll: (offset) => {
              scrollOffset = offset;
            },
          },
          // 7 items, viewport inner height = 5 (7 - 2*1), max offset = 2
          Array.from({ length: 7 }, (_, i) => Text(`line ${i}`)),
        ),
      );
      await waitForRender();

      // Scroll down 10 times — should clamp at 2 (7 items - 5 visible = 2)
      for (let i = 0; i < 10; i++) {
        term.sendInput("\x1b[<65;4;4M");
        await waitForRender();
      }

      expect(scrollOffset).toBe(2);
    });

    test("scroll up unsticks from Infinity scrollOffset (sticky-bottom pattern)", async () => {
      const term = setup(20, 5);
      let scrollOffset = 0;
      let stickToBottom = true;

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            overflow: "scroll",
            scrollbar: true,
            scrollOffset: stickToBottom ? Infinity : scrollOffset,
            onScroll: (offset, maxOffset) => {
              scrollOffset = offset;
              stickToBottom = offset >= maxOffset;
              cel.render();
            },
          },
          // 10 items in 5-row viewport → max offset = 5, adaptive wheel step = 3
          Array.from({ length: 10 }, (_, i) => Text(`line ${i + 1}`)),
        ),
      );
      await waitForRender();

      // Initially stuck to bottom (Infinity → clamped to maxOffset=5)
      expect(stickToBottom).toBe(true);

      // Scroll up — should unstick from bottom
      term.sendInput("\x1b[<64;4;3M");
      await waitForRender();

      expect(stickToBottom).toBe(false);
      expect(scrollOffset).toBe(2); // maxOffset(5) - 3 = 2
    });
  });

  describe("focus system", () => {
    test("Tab moves focus to next focusable element", async () => {
      const term = setup(20, 5);
      const focused: string[] = [];
      const blurred: string[] = [];
      let focus1 = false;
      let focus2 = false;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: focus1,
              onFocus: (event) => {
                focus1 = true;
                focus2 = false;
                focused.push(`btn1:${event.reason}`);
              },
              onBlur: (event) => {
                focus1 = false;
                blurred.push(`btn1:${event.reason}`);
              },
            },
            [Text("Btn1")],
          ),
          HStack(
            {
              onClick: () => {},
              focused: focus2,
              onFocus: (event) => {
                focus2 = true;
                focus1 = false;
                focused.push(`btn2:${event.reason}`);
              },
              onBlur: (event) => {
                focus2 = false;
                blurred.push(`btn2:${event.reason}`);
              },
            },
            [Text("Btn2")],
          ),
        ]),
      );
      await waitForRender();

      // Tab to focus first element
      term.sendInput(TAB);
      await waitForRender();
      expect(focused).toEqual(["btn1:tab"]);
      expect(blurred).toEqual([]);

      // Tab to focus second element
      term.sendInput(TAB);
      await waitForRender();
      expect(focused).toEqual(["btn1:tab", "btn2:tab"]);
      expect(blurred).toEqual(["btn1:tab"]);
    });

    test("Shift+Tab moves focus backwards", async () => {
      const term = setup(20, 5);
      let focus1 = false;
      let focus2 = true;
      const focused: string[] = [];
      const blurred: string[] = [];

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: focus1,
              onFocus: (event) => {
                focus1 = true;
                focus2 = false;
                focused.push(`btn1:${event.reason}`);
              },
              onBlur: (event) => {
                focus1 = false;
                blurred.push(`btn1:${event.reason}`);
              },
            },
            [Text("Btn1")],
          ),
          HStack(
            {
              onClick: () => {},
              focused: focus2,
              onFocus: (event) => {
                focus2 = true;
                focus1 = false;
                focused.push(`btn2:${event.reason}`);
              },
              onBlur: (event) => {
                focus2 = false;
                blurred.push(`btn2:${event.reason}`);
              },
            },
            [Text("Btn2")],
          ),
        ]),
      );
      await waitForRender();

      // Shift+Tab from btn2 should focus btn1
      term.sendInput(SHIFT_TAB);
      await waitForRender();
      expect(focused).toEqual(["btn1:shift+tab"]);
      expect(blurred).toEqual(["btn2:shift+tab"]);
    });

    test("Escape unfocuses the current element", async () => {
      const term = setup(20, 5);
      let blurReason = "";
      let btnFocused = true;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: btnFocused,
              onBlur: (event) => {
                blurReason = event.reason;
                btnFocused = false;
              },
            },
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();

      term.sendInput(ESCAPE);
      await waitForRender();
      expect(blurReason).toBe("escape");
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

      term.sendInput(ENTER);
      await waitForRender();
      expect(clicked).toBe(true);
    });

    test("mouse click on focusable element fires onFocus", async () => {
      const term = setup(20, 5);
      let btnFocused = false;
      let focusReason = "";

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              focused: btnFocused,
              onFocus: (event) => {
                btnFocused = true;
                focusReason = event.reason;
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
      expect(focusReason).toBe("click");
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
      term.sendInput(TAB);
      await waitForRender();
      expect(focused).toEqual(["btn1"]);
    });
  });

  describe("onKeyPress bubbling", () => {
    test("void handler consumes key — no further bubbling (backward compat)", async () => {
      const term = setup(20, 5);
      const received: string[] = [];

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              received.push(`root:${key}`);
            },
          },
          [
            VStack(
              {
                onKeyPress: (key) => {
                  received.push(`mid:${key}`);
                  // void return = consumed
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

      term.sendInput("x");
      await waitForRender();

      // mid handler consumes (void return), root never sees the key
      expect(received).toEqual(["mid:x"]);
    });

    test("returning false continues bubbling to parent handlers", async () => {
      const term = setup(20, 5);
      const received: string[] = [];

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              received.push(`root:${key}`);
            },
          },
          [
            VStack(
              {
                onKeyPress: (key) => {
                  received.push(`mid:${key}`);
                  return false; // not consumed — keep bubbling
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

      term.sendInput("x");
      await waitForRender();

      // mid returns false, so key continues to root
      expect(received).toEqual(["mid:x", "root:x"]);
    });

    test("selective bubbling — consume some keys, pass others", async () => {
      const term = setup(20, 5);
      const received: string[] = [];

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              received.push(`root:${key}`);
            },
          },
          [
            VStack(
              {
                onKeyPress: (key) => {
                  received.push(`mid:${key}`);
                  // Consume "a" but pass through everything else
                  if (key === "a") return; // consumed
                  return false; // not consumed
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

      term.sendInput("a");
      await waitForRender();
      expect(received).toEqual(["mid:a"]); // consumed by mid

      received.length = 0;
      term.sendInput("b");
      await waitForRender();
      expect(received).toEqual(["mid:b", "root:b"]); // passed through to root
    });

    test("all handlers return false — every handler in chain is called", async () => {
      const term = setup(20, 5);
      const received: string[] = [];

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              received.push(`root:${key}`);
              return false;
            },
          },
          [
            VStack(
              {
                onKeyPress: (key) => {
                  received.push(`mid:${key}`);
                  return false;
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

      term.sendInput("x");
      await waitForRender();

      expect(received).toEqual(["mid:x", "root:x"]);
    });

    test("ancestor onKeyPress can consume Escape before blur", async () => {
      const term = setup(20, 5);
      const received: string[] = [];
      let btnFocused = true;
      let blurred = false;

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              received.push(key);
            },
          },
          [
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
          ],
        ),
      );
      await waitForRender();

      term.sendInput(ESCAPE);
      await waitForRender();

      expect(received).toEqual(["escape"]);
      expect(blurred).toBe(false);
      expect(btnFocused).toBe(true);
    });

    test("Escape blurs after bubbling when ancestor handlers return false", async () => {
      const term = setup(20, 5);
      const received: string[] = [];
      let btnFocused = true;
      let blurred = false;

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              received.push(key);
              return false;
            },
          },
          [
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
          ],
        ),
      );
      await waitForRender();

      term.sendInput(ESCAPE);
      await waitForRender();

      expect(received).toEqual(["escape"]);
      expect(blurred).toBe(true);
      expect(btnFocused).toBe(false);
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
      term.sendInput(CTRL_S);
      await waitForRender();
      expect(parentKey).toBe("ctrl+s");
    });

    test("TextInput onKeyPress returning false prevents Escape blur", async () => {
      const term = setup(20, 5);
      let parentKey = "";
      let inputKey = "";
      let inputValue = "hello";
      let inputFocused = true;

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
              focused: inputFocused,
              onBlur: () => {
                inputFocused = false;
              },
              onKeyPress: (key) => {
                inputKey = key;
                if (key === "escape") return false;
              },
            }),
          ],
        ),
      );
      await waitForRender();

      term.sendInput(ESCAPE);
      await waitForRender();

      expect(inputKey).toBe("escape");
      expect(parentKey).toBe("");
      expect(inputFocused).toBe(true);
      expect(inputValue).toBe("hello");
    });

    test("unfocused state routes key to root handler", async () => {
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

    test("unfocused key does not leak through a topmost layer without a root handler", async () => {
      const term = setup(20, 5);
      let baseLayerKey = "";

      cel.viewport(() => [
        VStack(
          {
            width: 20,
            height: 5,
            onKeyPress: (key) => {
              baseLayerKey = key;
            },
          },
          [Text("base")],
        ),
        VStack({ width: 20, height: 5 }, [Text("overlay")]),
      ]);
      await waitForRender();

      term.sendInput("z");
      await waitForRender();
      expect(baseLayerKey).toBe("");
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
      term.sendInput(TAB);
      await waitForRender();
      expect(value).toBe("hello\t");
    });

    test("Shift+Enter inserts newline in TextInput", async () => {
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

      // Shift+Enter should insert a newline at cursor position
      term.sendInput(kittyEncode("shift+enter"));
      await waitForRender();
      expect(value).toBe("hello\n");
    });

    test("Shift+Enter inserts newline at cursor, not just at end", async () => {
      const term = setup(20, 5);
      let value = "hello";
      // Stable onChange ref so cursor state persists across re-renders
      const onChange = (v: string) => {
        value = v;
      };
      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          TextInput({
            value,
            focused: true,
            onChange,
          }),
        ]),
      );
      await waitForRender();

      // Move cursor left 3 times (to position 2: "he|llo")
      term.sendInput(kittyEncode("left"));
      await waitForRender();
      term.sendInput(kittyEncode("left"));
      await waitForRender();
      term.sendInput(kittyEncode("left"));
      await waitForRender();

      // Shift+Enter should insert newline at cursor
      term.sendInput(kittyEncode("shift+enter"));
      await waitForRender();
      expect(value).toBe("he\nllo");
    });

    test("Shift+Enter inserts newline even when onKeyPress intercepts Enter", async () => {
      const term = setup(20, 5);
      let value = "hello";
      let submitted = false;
      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
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

      // Shift+Enter is a different key — should insert newline, not trigger onKeyPress for "enter"
      term.sendInput(kittyEncode("shift+enter"));
      await waitForRender();
      expect(submitted).toBe(false);
      expect(value).toBe("hello\n");
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
      term.sendInput(SHIFT_TAB);
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
      term.sendInput(TAB);
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
      term.sendInput(ESCAPE);
      await waitForRender();
      expect(tiFocused).toBe(false);

      // Tab should now traverse to the button
      term.sendInput(TAB);
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
      term.sendInput(ESCAPE);
      await waitForRender();
      expect(focused as string | null).toBe(null);

      // Tab should go FORWARD to the button (next after TextInput),
      // not back to the TextInput
      term.sendInput(TAB);
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
      term.sendInput(TAB); // → A
      await waitForRender();
      term.sendInput(TAB); // → B
      await waitForRender();
      expect(focused as string | null).toBe("b");

      // Escape, then Shift+Tab should go backward to A
      term.sendInput(ESCAPE);
      await waitForRender();
      expect(focused as string | null).toBe(null);

      term.sendInput(SHIFT_TAB); // Shift+Tab
      await waitForRender();
      expect(focused as string | null).toBe("a");
    });
  });

  describe("TextInput mouse wheel scroll", () => {
    test("mouse wheel scrolls TextInput content", async () => {
      const term = setup(20, 12);
      let value = Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join(
        "\n",
      );
      // Stable onChange ref so TextInput scroll state persists across re-renders
      const onChange = (v: string) => {
        value = v;
      };

      cel.viewport(() =>
        VStack({ width: 20, height: 12 }, [
          TextInput({
            value,
            height: 12,
            onChange,
          }),
        ]),
      );
      await waitForRender();

      // Initially line1 should be visible
      const buf1 = currentBuffer();
      let row0 = "";
      for (let x = 0; x < 5; x++) row0 += buf1.get(x, 0).char;
      expect(row0).toBe("line1");

      // 12-row viewport → adaptive wheel step = 4
      term.sendInput("\x1b[<65;6;2M");
      await waitForRender();

      const buf2 = currentBuffer();
      let row0After = "";
      for (let x = 0; x < 5; x++) row0After += buf2.get(x, 0).char;
      expect(row0After).toBe("line5");
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
      const buf = currentBuffer();
      let row0 = "";
      for (let x = 0; x < 5; x++) row0 += buf.get(x, 0).char;
      expect(row0).toBe("line1");
    });

    test("mouse wheel prefers innermost TextInput over outer scrollable", async () => {
      const term = setup(20, 12);
      let outerScrolled = false;
      let value = Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join(
        "\n",
      );
      const onChange = (v: string) => {
        value = v;
      };

      cel.viewport(() =>
        VStack(
          {
            width: 20,
            height: 12,
            overflow: "scroll",
            scrollOffset: 0,
            onScroll: () => {
              outerScrolled = true;
            },
          },
          [
            TextInput({
              value,
              height: 12,
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

      // Verify TextInput scrolled by the adaptive step (4)
      const buf = currentBuffer();
      let row0 = "";
      for (let x = 0; x < 5; x++) row0 += buf.get(x, 0).char;
      expect(row0).toBe("line5");
    });
  });

  describe("uncontrolled focus", () => {
    test("Tab focuses first clickable element and Enter activates it", async () => {
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
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();

      // Tab to focus the button
      term.sendInput(TAB);
      await waitForRender();

      // Enter to activate
      term.sendInput(ENTER);
      await waitForRender();

      expect(clicked).toBe(true);
    });

    test("Tab cycles through focusable elements in order", async () => {
      const term = setup(20, 5);
      const clicks: string[] = [];

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack({ onClick: () => clicks.push("btn1") }, [Text("Btn1")]),
          HStack({ onClick: () => clicks.push("btn2") }, [Text("Btn2")]),
        ]),
      );
      await waitForRender();

      // Tab to first, activate
      term.sendInput(TAB);
      await waitForRender();
      term.sendInput(ENTER);
      await waitForRender();
      expect(clicks).toEqual(["btn1"]);

      // Tab to second, activate
      term.sendInput(TAB);
      await waitForRender();
      term.sendInput(ENTER);
      await waitForRender();
      expect(clicks).toEqual(["btn1", "btn2"]);
    });

    test("Shift+Tab moves focus backwards", async () => {
      const term = setup(20, 5);
      const clicks: string[] = [];

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack({ onClick: () => clicks.push("btn1") }, [Text("Btn1")]),
          HStack({ onClick: () => clicks.push("btn2") }, [Text("Btn2")]),
        ]),
      );
      await waitForRender();

      // Shift+Tab to focus last element
      term.sendInput(SHIFT_TAB);
      await waitForRender();
      term.sendInput(ENTER);
      await waitForRender();
      expect(clicks).toEqual(["btn2"]);

      // Shift+Tab to go backward to first
      term.sendInput(SHIFT_TAB);
      await waitForRender();
      term.sendInput(ENTER);
      await waitForRender();
      expect(clicks).toEqual(["btn2", "btn1"]);
    });

    test("Escape unfocuses and Enter does nothing", async () => {
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
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();

      // Tab to focus, then Escape to unfocus
      term.sendInput(TAB);
      await waitForRender();
      term.sendInput(ESCAPE);
      await waitForRender();

      // Enter should do nothing — no element is focused
      term.sendInput(ENTER);
      await waitForRender();
      expect(clicked).toBe(false);
    });

    test("mouse click focuses element and Enter activates it", async () => {
      const term = setup(20, 5);
      let clicked = false;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack({}, [Text("not clickable")]),
          HStack(
            {
              onClick: () => {
                clicked = true;
              },
            },
            [Text("Clickable")],
          ),
        ]),
      );
      await waitForRender();

      // Click on the second element (row 1)
      term.sendInput("\x1b[<0;2;2m");
      await waitForRender();

      // Enter should activate the clicked element
      term.sendInput(ENTER);
      await waitForRender();
      expect(clicked).toBe(true);
    });

    test("onFocus fires as notification in uncontrolled mode", async () => {
      const term = setup(20, 5);
      const events: string[] = [];

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              onFocus: () => events.push("focus"),
            },
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();

      term.sendInput(TAB);
      await waitForRender();
      expect(events).toEqual(["focus"]);
    });

    test("onBlur fires as notification in uncontrolled mode", async () => {
      const term = setup(20, 5);
      const events: string[] = [];

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => {},
              onFocus: () => events.push("focus1"),
              onBlur: () => events.push("blur1"),
            },
            [Text("Btn1")],
          ),
          HStack(
            {
              onClick: () => {},
              onFocus: () => events.push("focus2"),
            },
            [Text("Btn2")],
          ),
        ]),
      );
      await waitForRender();

      // Tab to first
      term.sendInput(TAB);
      await waitForRender();
      expect(events).toEqual(["focus1"]);

      // Tab to second — first should get onBlur
      term.sendInput(TAB);
      await waitForRender();
      expect(events).toEqual(["focus1", "blur1", "focus2"]);
    });

    test("Tab focuses uncontrolled TextInput and typing works", async () => {
      const term = setup(20, 5);
      let value = "";

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          TextInput({
            value,
            onChange: (v) => {
              value = v;
            },
          }),
        ]),
      );
      await waitForRender();

      // Tab to focus the TextInput
      term.sendInput(TAB);
      await waitForRender();

      // Type a character
      term.sendInput("x");
      await waitForRender();
      expect(value).toBe("x");
    });

    test("Tab focusing an uncontrolled TextInput shows the native cursor", async () => {
      const term = setup(20, 5);
      let value = "";

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          TextInput({
            value,
            onChange: (v) => {
              value = v;
            },
          }),
        ]),
      );
      await waitForRender();

      term.clearOutput();
      term.sendInput(TAB);
      await waitForRender();

      expect(term.output).toContain("\x1b[?25h");
    });

    test("Tab wraps from last to first element", async () => {
      const term = setup(20, 5);
      const clicks: string[] = [];

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack({ onClick: () => clicks.push("btn1") }, [Text("Btn1")]),
          HStack({ onClick: () => clicks.push("btn2") }, [Text("Btn2")]),
        ]),
      );
      await waitForRender();

      // Tab to first, Tab to second, Tab wraps to first
      term.sendInput(TAB);
      await waitForRender();
      term.sendInput(TAB);
      await waitForRender();
      term.sendInput(TAB);
      await waitForRender();
      term.sendInput(ENTER);
      await waitForRender();
      expect(clicks).toEqual(["btn1"]);
    });

    test("mixed controlled and uncontrolled elements", async () => {
      const term = setup(20, 5);
      const clicks: string[] = [];
      let controlledFocused = false;

      cel.viewport(() =>
        VStack({ width: 20, height: 5 }, [
          HStack(
            {
              onClick: () => clicks.push("controlled"),
              focused: controlledFocused,
              onFocus: () => {
                controlledFocused = true;
              },
              onBlur: () => {
                controlledFocused = false;
              },
            },
            [Text("Controlled")],
          ),
          HStack({ onClick: () => clicks.push("uncontrolled") }, [
            Text("Uncontrolled"),
          ]),
        ]),
      );
      await waitForRender();

      // Tab to first (controlled)
      term.sendInput(TAB);
      await waitForRender();
      expect(controlledFocused).toBe(true);

      // Tab to second (uncontrolled), Enter to activate
      term.sendInput(TAB);
      await waitForRender();
      expect(controlledFocused).toBe(false);
      term.sendInput(ENTER);
      await waitForRender();
      expect(clicks).toEqual(["uncontrolled"]);
    });

    test("controlled TextInput as only focusable: Escape+Tab re-focuses it", async () => {
      const term = setup(40, 5);
      let value = "";
      let inputFocused = false;

      cel.viewport(() =>
        VStack({ width: 40, height: 5 }, [
          TextInput({
            value,
            onChange: (v) => {
              value = v;
              cel.render();
            },
            focused: inputFocused,
            onFocus: () => {
              inputFocused = true;
              cel.render();
            },
            onBlur: () => {
              inputFocused = false;
              cel.render();
            },
          }),
        ]),
      );
      await waitForRender();

      // Tab → TextInput focused
      term.sendInput(TAB);
      await waitForRender();
      expect(inputFocused).toBe(true);

      // Escape → unfocused
      term.sendInput(ESCAPE);
      await waitForRender();
      expect(inputFocused).toBe(false);

      // Tab → only one focusable, wraps to it again
      term.sendInput(TAB);
      await waitForRender();
      expect(inputFocused).toBe(true);
    });

    test("controlled TextInput: Escape then Tab advances past it", async () => {
      const term = setup(40, 5);
      let value = "";
      let inputFocused = false;
      const clicks: string[] = [];

      cel.viewport(() =>
        VStack({ width: 40, height: 5 }, [
          TextInput({
            value,
            onChange: (v) => {
              value = v;
              cel.render();
            },
            focused: inputFocused,
            onFocus: () => {
              inputFocused = true;
              cel.render();
            },
            onBlur: () => {
              inputFocused = false;
              cel.render();
            },
          }),
          HStack({ onClick: () => clicks.push("btn") }, [Text("Button")]),
        ]),
      );
      await waitForRender();

      // Tab focuses the TextInput
      term.sendInput(TAB);
      await waitForRender();
      expect(inputFocused).toBe(true);

      // Tab inserts \t (editing key) while TextInput is focused
      term.sendInput(TAB);
      await waitForRender();
      expect(value).toBe("\t");

      // Escape unfocuses
      term.sendInput(ESCAPE);
      await waitForRender();
      expect(inputFocused).toBe(false);

      // Tab should advance PAST the TextInput to the Button
      term.sendInput(TAB);
      await waitForRender();

      // Enter activates the button
      term.sendInput(ENTER);
      await waitForRender();
      expect(clicks).toEqual(["btn"]);
    });

    test("controlled TextInput blur from re-render preserves Tab continuity", async () => {
      const term = setup(40, 5);
      let value = "";
      let inputFocused = false;
      let buttonFocused = false;

      cel.viewport(() =>
        VStack({ width: 40, height: 5 }, [
          TextInput({
            value,
            onChange: (v) => {
              value = v;
              cel.render();
            },
            focused: inputFocused,
            onFocus: () => {
              inputFocused = true;
              buttonFocused = false;
              cel.render();
            },
            onBlur: () => {
              inputFocused = false;
              cel.render();
            },
            onKeyPress: (key) => {
              if (key === "enter") {
                inputFocused = false;
                cel.render();
                return false;
              }
            },
          }),
          HStack(
            {
              onClick: () => {},
              focused: buttonFocused,
              onFocus: () => {
                buttonFocused = true;
                inputFocused = false;
                cel.render();
              },
              onBlur: () => {
                buttonFocused = false;
                cel.render();
              },
            },
            [Text("Button")],
          ),
        ]),
      );
      await waitForRender();

      term.sendInput(TAB);
      await waitForRender();
      expect(inputFocused).toBe(true);

      term.sendInput(ENTER);
      await waitForRender();
      expect(inputFocused).toBe(false);

      term.sendInput(TAB);
      await waitForRender();
      expect(buttonFocused).toBe(true);
    });
  });

  describe("focusStyle rendering", () => {
    test("focusStyle bgColor applied when element is focused via Tab", async () => {
      const term = setup(20, 3);

      cel.viewport(() =>
        VStack({ width: 20, height: 3 }, [
          HStack(
            {
              onClick: () => {},
              bgColor: "color00",
              focusStyle: { bgColor: "color06" },
            },
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();

      // Before focus — normal bgColor
      let buf = currentBuffer();
      expect(buf.get(0, 0).bgColor).toBe("color00");

      // Tab to focus
      term.sendInput(TAB);
      await waitForRender();

      // After focus — focusStyle bgColor
      buf = currentBuffer();
      expect(buf.get(0, 0).bgColor).toBe("color06");
    });

    test("focusStyle removed when focus moves to another element", async () => {
      const term = setup(20, 3);

      cel.viewport(() =>
        VStack({ width: 20, height: 3 }, [
          HStack(
            {
              onClick: () => {},
              bgColor: "color00",
              focusStyle: { bgColor: "color06" },
            },
            [Text("Btn1")],
          ),
          HStack(
            {
              onClick: () => {},
              bgColor: "color00",
              focusStyle: { bgColor: "color03" },
            },
            [Text("Btn2")],
          ),
        ]),
      );
      await waitForRender();

      // Tab to first
      term.sendInput(TAB);
      await waitForRender();
      let buf = currentBuffer();
      expect(buf.get(0, 0).bgColor).toBe("color06");
      expect(buf.get(0, 1).bgColor).toBe("color00");

      // Tab to second — first loses focusStyle, second gains it
      term.sendInput(TAB);
      await waitForRender();
      buf = currentBuffer();
      expect(buf.get(0, 0).bgColor).toBe("color00");
      expect(buf.get(0, 1).bgColor).toBe("color03");
    });

    test("focusStyle fgColor inherited by child Text when focused", async () => {
      const term = setup(20, 3);

      cel.viewport(() =>
        VStack({ width: 20, height: 3 }, [
          HStack(
            {
              onClick: () => {},
              fgColor: "color07",
              focusStyle: { fgColor: "color00", bgColor: "color06" },
            },
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();

      // Before focus — Text inherits white
      let buf = currentBuffer();
      expect(buf.get(0, 0).fgColor).toBe("color07");

      // Tab to focus
      term.sendInput(TAB);
      await waitForRender();

      // After focus — Text inherits black from focusStyle
      buf = currentBuffer();
      expect(buf.get(0, 0).fgColor).toBe("color00");
    });

    test("focusStyle with controlled focus", async () => {
      const term = setup(20, 3);
      let isFocused = true;

      cel.viewport(() =>
        VStack({ width: 20, height: 3 }, [
          HStack(
            {
              onClick: () => {},
              focused: isFocused,
              bgColor: "color00",
              focusStyle: { bgColor: "color06" },
              onBlur: () => {
                isFocused = false;
              },
            },
            [Text("Btn")],
          ),
        ]),
      );
      await waitForRender();

      // Controlled focused=true — focusStyle applies
      let buf = currentBuffer();
      expect(buf.get(0, 0).bgColor).toBe("color06");

      // Escape to blur
      term.sendInput(ESCAPE);
      await waitForRender();

      // focused=false — normal style
      buf = currentBuffer();
      expect(buf.get(0, 0).bgColor).toBe("color00");
    });
  });
});
