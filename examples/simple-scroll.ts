/**
 * Scroll test — a large list inside a scrollable VStack.
 * Mouse wheel should scroll the list up/down.
 *
 * Uses uncontrolled scroll — the framework manages scroll position
 * internally. No scrollOffset/onScroll state needed.
 *
 * Run: bun run examples/simple-scroll.ts
 */
import { cel, VStack, HStack, Text, ProcessTerminal } from "@cel-tui/core";
import { Divider, Spacer } from "@cel-tui/components";
import { warningBox } from "./warning-box";

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
        ...warningBox([
          "  Terminal too small :(",
          "",
          "  Please resize to at",
          `  least ${String(MIN_COLS).padStart(3)}×${String(MIN_ROWS).padStart(2)} chars.`,
          "",
          "  Ctrl+Q to quit",
        ]),
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
        Text("Scroll Test", { bold: true, fgColor: "color06" }),
        Spacer(),
        Text("uncontrolled", { fgColor: "color08" }),
      ]),
      Divider({ fgColor: "color08" }),

      VStack(
        { flex: 1, overflow: "scroll", scrollbar: true },
        items.map((item, i) =>
          HStack({ padding: { x: 1 } }, [
            Text(`${String(i + 1).padStart(3)}.`, { fgColor: "color03" }),
            Text(` ${item}`),
          ]),
        ),
      ),

      Divider({ fgColor: "color08" }),
      HStack({ padding: { x: 1 } }, [
        Text("Mouse wheel to scroll · Ctrl+Q quit", {
          fgColor: "color08",
        }),
      ]),
    ],
  );
});
