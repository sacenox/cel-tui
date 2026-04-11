import { afterEach, describe, expect, test } from "bun:test";
import { cel } from "./cel.js";
import { HStack, VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { MockTerminal } from "./terminal.js";

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
});
