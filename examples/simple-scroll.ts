/**
 * Scroll test — a large list inside a scrollable VStack.
 * Mouse wheel should scroll the list up/down.
 *
 * Run: bun run examples/scroll-test.ts
 */
import { cel, VStack, HStack, Text, ProcessTerminal } from "@cel-tui/core";

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

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") {
          cel.stop();
          process.exit();
        }
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
  ),
);
