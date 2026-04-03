import { afterEach, describe, expect, test } from "bun:test";
import { cel } from "./cel.js";
import { MockTerminal } from "./terminal.js";
import { Text } from "./primitives/text.js";
import { VStack } from "./primitives/stacks.js";
import { HStack } from "./primitives/stacks.js";

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
    expect(term.output).toContain("Count: 3");
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
          [Text("scrollable")],
        ),
      );
      await waitForRender();

      // SGR scroll down at (3, 2): ESC [ < 65 ; 4 ; 3 M
      term.sendInput("\x1b[<65;4;3M");
      await waitForRender();

      expect(scrollOffset).toBe(1);
    });
  });
});
