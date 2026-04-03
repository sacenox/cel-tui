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

const logo = [
  "        ╭─────────────────────╮",
  "        │  ██████╗███████╗██╗ │",
  "        │ ██╔════╝██╔════╝██║ │",
  "        │ ██║     █████╗  ██║ │",
  "        │ ██║     ██╔══╝  ██║ │",
  "        │ ╚██████╗███████╗██║ │",
  "        │  ╚═════╝╚══════╝╚═╝ │",
  "        ╰─────────────────────╯",
];

const palette: Array<"cyan" | "magenta" | "yellow" | "green" | "blue" | "red"> =
  ["cyan", "magenta", "yellow", "green", "blue", "red"];

let colorIndex = 0;
let tick = 0;

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

cel.init(new ProcessTerminal());
cel.viewport(() => {
  const color = palette[colorIndex % palette.length]!;
  const spinner = spinnerFrames[tick % spinnerFrames.length]!;

  return VStack(
    {
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") {
          cel.stop();
          process.exit();
        }
        colorIndex++;
        cel.render();
      },
    },
    [
      // Logo
      ...logo.map((line) => Text(line, { fgColor: color, bold: true })),

      // Tagline
      Text(""),
      Text("  terminal UIs, cell by cell", {
        italic: true,
        fgColor: "brightBlack",
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
        Text(`  ${spinner}`, { fgColor: color, bold: true }),
        Text(clock(), { fgColor: "white" }),
        Text("│", { fgColor: "brightBlack" }),
        Text("press any key to change color", { fgColor: "brightBlack" }),
      ]),

      // Quit hint
      Text(""),
      HStack({ gap: 1 }, [
        Text("  "),
        Text(" ctrl+q ", { bgColor: color, fgColor: "black", bold: true }),
        Text("quit", { fgColor: "brightBlack" }),
      ]),
    ],
  );
});
