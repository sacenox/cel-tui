/**
 * cel-tui: Hello World
 *
 * A stylish first impression — centered ASCII art logo with a
 * reactive clock and keyboard hints. Press any key to cycle
 * colors, Ctrl+Q to quit.
 *
 * Run: bun run examples/hello.ts
 */

import { cel, VStack, HStack, Text, ProcessTerminal } from "@cel-tui/core";
import { Spacer } from "@cel-tui/components";

const logo = [
  "╭─────────────────────╮",
  "│  ██████╗███████╗██╗ │",
  "│ ██╔════╝██╔════╝██║ │",
  "│ ██║     █████╗  ██║ │",
  "│ ██║     ██╔══╝  ██║ │",
  "│ ╚██████╗███████╗██║ │",
  "│  ╚═════╝╚══════╝╚═╝ │",
  "╰─────────────────────╯",
];

const palette: Array<
  "color06" | "color05" | "color03" | "color02" | "color04" | "color01"
> = ["color06", "color05", "color03", "color02", "color04", "color01"];

let colorIndex = 0;
let tick = 0;

const MIN_COLS = 38;
const MIN_ROWS = 14;

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function clock(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { hour12: false });
}

// Animate spinner
setInterval(() => {
  tick++;
  cel.render();
}, 80);

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
        Text("┌─────────────────────────┐", { fgColor: "color03" }),
        Text("│  Terminal too small :(  │", { fgColor: "color03" }),
        Text("│                         │", { fgColor: "color03" }),
        Text("│  Please resize to at    │", { fgColor: "color03" }),
        Text(
          `│  least ${String(MIN_COLS).padStart(3)}×${String(MIN_ROWS).padStart(2)} chars.   │`,
          { fgColor: "color03" },
        ),
        Text("│                         │", { fgColor: "color03" }),
        Text("│  Ctrl+Q to quit         │", { fgColor: "color03" }),
        Text("└─────────────────────────┘", { fgColor: "color03" }),
      ],
    );
  }

  const color = palette[colorIndex % palette.length]!;
  const spinner = spinnerFrames[tick % spinnerFrames.length]!;

  return VStack(
    {
      height: "100%",
      alignItems: "center",
      overflow: "scroll",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        colorIndex++;
        cel.render();
      },
    },
    [
      Spacer(),
      // Logo
      ...logo.map((line) => Text(line, { fgColor: color, bold: true })),

      // Tagline
      Text(""),
      Text("terminal UIs, cell by cell", {
        italic: true,
        fgColor: "color08",
      }),

      // Divider
      Text(""),
      HStack({}, [
        Text("  "),
        Text("─", { repeat: 34, fgColor: color }),
        Text("  "),
      ]),
      Text(""),

      // Live info row
      HStack({ gap: 2 }, [
        Text(`${spinner}`, { fgColor: color, bold: true }),
        Text(clock()),
        Text("│", { fgColor: "color08" }),
        Text("press any key to change color", { fgColor: "color08" }),
      ]),

      // Quit hint
      Text(""),
      HStack({ gap: 1 }, [
        Text(" ctrl+q ", { bgColor: color, fgColor: "color00", bold: true }),
        Text("quit", { fgColor: "color08" }),
      ]),
      Spacer(),
    ],
  );
});
