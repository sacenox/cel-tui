import { afterEach, describe, expect, test } from "bun:test";
import { HStack, VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";
import { MockTerminal } from "./terminal.js";
import { testCel as cel } from "./test-helpers.js";

describe("layer compositing", () => {
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

  test("single layer renders normally", async () => {
    const term = setup(20, 3);
    cel.viewport(() => VStack({}, [Text("Hello")]));
    await waitForRender();
    expect(term.output).toContain("Hello");
  });

  test("second layer paints over first", async () => {
    setup(20, 3);
    cel.viewport(() => [
      VStack({}, [Text("AAAAAAAAAA")]),
      VStack({}, [Text("BB")]),
    ]);
    await waitForRender();

    // "BB" should overwrite the first two A's, rest of A's visible
    const buf = currentBuffer();
    expect(buf.get(0, 0).char).toBe("B");
    expect(buf.get(1, 0).char).toBe("B");
    expect(buf.get(2, 0).char).toBe("A");
  });

  test("transparent cells in upper layer show lower layer", async () => {
    setup(10, 3);
    cel.viewport(() => [
      // Base layer: fill row 0 with A's
      VStack({}, [Text("AAAAAAAAAA")]),
      // Overlay layer: only paint at position (5,0)
      VStack({}, [
        HStack({}, [
          VStack({ width: 5 }, []),
          VStack({ width: 5 }, [Text("BB")]),
        ]),
      ]),
    ]);
    await waitForRender();

    const buf = currentBuffer();
    // First 5 chars: A from base layer (overlay is empty/transparent)
    expect(buf.get(0, 0).char).toBe("A");
    expect(buf.get(4, 0).char).toBe("A");
    // Chars 5-6: B from overlay
    expect(buf.get(5, 0).char).toBe("B");
    expect(buf.get(6, 0).char).toBe("B");
  });

  test("narrow overlay text replaces a wide lower-layer glyph atomically", async () => {
    setup(3, 1);
    cel.viewport(() => [Text("😀A"), Text("B")]);
    await waitForRender();

    const buf = currentBuffer();
    expect(buf.get(0, 0).char).toBe("B");
    expect(buf.get(1, 0).char).toBe(" ");
    expect(buf.get(2, 0).char).toBe("A");
  });

  test("overlay text on a continuation cell clears the wide lower glyph", async () => {
    setup(3, 1);
    cel.viewport(() => [
      Text("😀A"),
      HStack({}, [VStack({ width: 1 }, []), Text("B")]),
    ]);
    await waitForRender();

    const buf = currentBuffer();
    expect(buf.get(0, 0).char).toBe(" ");
    expect(buf.get(1, 0).char).toBe("B");
    expect(buf.get(2, 0).char).toBe("A");
  });

  test("an identical wide overlay preserves its lead and continuation", async () => {
    setup(3, 1);
    cel.viewport(() => [Text("界A"), Text("界")]);
    await waitForRender();

    const buf = currentBuffer();
    expect(buf.get(0, 0).char).toBe("界");
    expect(buf.get(1, 0).char).toBe("");
    expect(buf.get(2, 0).char).toBe("A");
  });

  test("click targets topmost layer", async () => {
    const term = setup(20, 3);
    let baseClicked = false;
    let overlayClicked = false;

    cel.viewport(() => [
      VStack(
        {
          onClick: () => {
            baseClicked = true;
          },
        },
        [Text("base")],
      ),
      VStack(
        {
          onClick: () => {
            overlayClicked = true;
          },
        },
        [Text("overlay")],
      ),
    ]);
    await waitForRender();

    // Click at (3, 0) — should hit overlay, not base
    term.sendInput("\x1b[<0;4;1m");
    await waitForRender();

    expect(overlayClicked).toBe(true);
    expect(baseClicked).toBe(false);
  });

  test("conditional layer (modal show/hide)", async () => {
    const term = setup(20, 3);
    let showModal = false;

    cel.viewport(() => {
      const layers = [VStack({}, [Text("main")])];
      if (showModal) {
        layers.push(VStack({}, [Text("modal")]));
      }
      return layers;
    });
    await waitForRender();

    expect(term.output).toContain("main");
    expect(term.output).not.toContain("modal");

    showModal = true;
    cel.render();
    await waitForRender();

    // Check buffer contents — diff rendering may not emit "modal" as a
    // contiguous string since unchanged chars (like 'm') are skipped
    const buf = currentBuffer();
    const row = Array.from({ length: 5 }, (_, i) => buf.get(i, 0).char).join(
      "",
    );
    expect(row).toBe("modal");
  });

  test("layer focus is suspended by a modal and restored afterward", async () => {
    const term = setup(20, 3);
    const clicks: string[] = [];
    let showModal = false;

    cel.viewport(() => {
      const base = VStack({ stateKey: "base-layer", width: 20, height: 3 }, [
        HStack({ stateKey: "base", onClick: () => clicks.push("base") }, [
          Text("base"),
        ]),
      ]);
      if (!showModal) return base;
      return [
        base,
        VStack({ stateKey: "modal-layer", width: 20, height: 3 }, [
          HStack({ stateKey: "modal", onClick: () => clicks.push("modal") }, [
            Text("modal"),
          ]),
        ]),
      ];
    });
    await waitForRender();

    term.sendInput("\t");
    await waitForRender();
    showModal = true;
    cel.render();
    await waitForRender();
    term.sendInput("\r");
    await waitForRender();
    expect(clicks).toEqual([]);

    term.sendInput("\t");
    await waitForRender();
    term.sendInput("\r");
    await waitForRender();
    expect(clicks).toEqual(["modal"]);

    showModal = false;
    cel.render();
    await waitForRender();
    term.sendInput("\r");
    await waitForRender();
    expect(clicks).toEqual(["modal", "base"]);
  });

  test("a controlled TextInput in a covered layer receives no keys", async () => {
    const term = setup(20, 3);
    let value = "";

    cel.viewport(() => [
      TextInput({
        stateKey: "covered-input",
        value,
        focused: true,
        onChange: (next) => {
          value = next;
        },
      }),
      VStack({ stateKey: "overlay", width: 20, height: 3 }, [Text("modal")]),
    ]);
    await waitForRender();

    term.sendInput("x");
    await waitForRender();

    expect(value).toBe("");
  });

  test("autoFocus prefers the modal and restores underlying focus", async () => {
    const term = setup(20, 3);
    const events: string[] = [];
    let showModal = false;

    cel.viewport(() => {
      const base = VStack({ stateKey: "base-layer", width: 20, height: 3 }, [
        HStack(
          {
            stateKey: "base-auto",
            autoFocus: true,
            onFocus: ({ reason }) => events.push(`base:${reason}`),
            onClick: () => events.push("base:click"),
          },
          [Text("base")],
        ),
      ]);
      if (!showModal) return base;
      return [
        base,
        VStack({ stateKey: "modal-layer", width: 20, height: 3 }, [
          HStack(
            {
              stateKey: "modal-auto",
              autoFocus: true,
              onFocus: ({ reason }) => events.push(`modal:${reason}`),
              onClick: () => events.push("modal:click"),
            },
            [Text("modal")],
          ),
        ]),
      ];
    });
    await waitForRender();
    expect(events).toEqual(["base:auto"]);

    showModal = true;
    cel.render();
    await waitForRender();
    term.sendInput("\r");
    await waitForRender();
    expect(events).toEqual(["base:auto", "modal:auto", "modal:click"]);

    showModal = false;
    cel.render();
    await waitForRender();
    term.sendInput("\r");
    await waitForRender();
    expect(events).toEqual([
      "base:auto",
      "modal:auto",
      "modal:click",
      "base:click",
    ]);
  });
});
