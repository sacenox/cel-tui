/**
 * Scroll test — a large list inside a scrollable VStack.
 * Mouse wheel should scroll the list up/down.
 *
 * Run: bun run examples/scroll-test.ts
 */
import { cel, VStack, HStack, Text, ProcessTerminal } from "@cel-tui/core";

const MIN_COLS = 30;
const MIN_ROWS = 8;

const items = Array.from({ length: 50 }, (_, i) => `Item ${i + 1} — ${fake()}`);

function fake(): string {
  const words = [
    "apple",
    "banana",
    "cherry",
    "dragonfruit",
    "elderberry",
    "fig",
    "grape",
    "honeydew",
    "kiwi",
    "lemon",
    "mango",
    "nectarine",
    "orange",
    "papaya",
    "quince",
    "raspberry",
    "strawberry",
    "tangerine",
  ];
  const n = 2 + Math.floor(Math.random() * 4);
  return Array.from(
    { length: n },
    () => words[Math.floor(Math.random() * words.length)],
  ).join(" ");
}

let scrollOffset = 0;

function quit() {
  cel.stop();
  process.exit();
}

cel.init(new ProcessTerminal());
cel.viewport(() => {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  if (cols < MIN_COLS || rows < MIN_ROWS) {
    return VStack(
      {
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        onKeyPress: (key) => {
          if (key === "ctrl+q" || key === "ctrl+c") quit();
        },
      },
      [
        Text("┌─────────────────────────┐", { fgColor: "yellow" }),
        Text("│  Terminal too small :(  │", { fgColor: "yellow" }),
        Text("│                         │", { fgColor: "yellow" }),
        Text("│  Please resize to at    │", { fgColor: "yellow" }),
        Text(
          `│  least ${String(MIN_COLS).padStart(3)}×${String(MIN_ROWS).padStart(2)} chars.   │`,
          { fgColor: "yellow" },
        ),
        Text("│                         │", { fgColor: "yellow" }),
        Text("│  Ctrl+Q to quit         │", { fgColor: "yellow" }),
        Text("└─────────────────────────┘", { fgColor: "yellow" }),
      ],
    );
  }

  return VStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
      },
    },
    [
      HStack({ padding: { x: 1 } }, [
        Text("Scroll Test", { bold: true, fgColor: "cyan" }),
        VStack({ flex: 1 }, []),
        Text(`offset: ${scrollOffset}`, { fgColor: "brightBlack" }),
      ]),
      Text("─", { repeat: "fill", fgColor: "brightBlack" }),

      VStack(
        {
          flex: 1,
          overflow: "scroll",
          scrollbar: true,
          scrollOffset,
          onScroll: (off) => {
            scrollOffset = off;
            cel.render();
          },
        },
        items.map((item, i) =>
          HStack({ padding: { x: 1 } }, [
            Text(`${String(i + 1).padStart(3)}.`, { fgColor: "yellow" }),
            Text(` ${item}`),
          ]),
        ),
      ),

      Text("─", { repeat: "fill", fgColor: "brightBlack" }),
      HStack({ padding: { x: 1 } }, [
        Text("Mouse wheel to scroll · Ctrl+Q quit", { fgColor: "brightBlack" }),
      ]),
    ],
  );
});
