/**
 * cel-tui: Tag Cloud
 *
 * Demonstrates `flexWrap: "wrap"` on HStack — tags flow
 * left-to-right and wrap to the next line when they exceed
 * the terminal width. Resize the terminal to see tags reflow.
 *
 * Click or press Enter to toggle tags. Tab/Shift+Tab to
 * navigate. Ctrl+Q to quit.
 *
 * Run: bun run examples/tags.ts
 */

import { cel, VStack, HStack, Text, ProcessTerminal } from "@cel-tui/core";
import { Button, Divider, Spacer } from "@cel-tui/components";

// ─── Data ───────────────────────────────────────────────────────

interface Tag {
  label: string;
  color: "cyan" | "magenta" | "yellow" | "green" | "blue" | "red";
}

const TAGS: Tag[] = [
  { label: "TypeScript", color: "blue" },
  { label: "Rust", color: "red" },
  { label: "Go", color: "cyan" },
  { label: "Python", color: "yellow" },
  { label: "JavaScript", color: "yellow" },
  { label: "C++", color: "blue" },
  { label: "Zig", color: "magenta" },
  { label: "Haskell", color: "magenta" },
  { label: "Elixir", color: "magenta" },
  { label: "Ruby", color: "red" },
  { label: "Kotlin", color: "green" },
  { label: "Swift", color: "red" },
  { label: "Lua", color: "blue" },
  { label: "OCaml", color: "yellow" },
  { label: "Clojure", color: "green" },
  { label: "Scala", color: "red" },
  { label: "Nim", color: "yellow" },
  { label: "Julia", color: "green" },
  { label: "Erlang", color: "red" },
  { label: "Dart", color: "cyan" },
  { label: "C#", color: "green" },
  { label: "F#", color: "cyan" },
  { label: "Gleam", color: "magenta" },
  { label: "Odin", color: "blue" },
];

// ─── State ──────────────────────────────────────────────────────

const selected = new Set<string>();

function toggle(label: string) {
  if (selected.has(label)) selected.delete(label);
  else selected.add(label);
  cel.render();
}

function clearAll() {
  selected.clear();
  cel.render();
}

function quit() {
  cel.stop();
  process.exit();
}

// ─── UI ─────────────────────────────────────────────────────────

function tagChip(tag: Tag) {
  const on = selected.has(tag.label);
  const check = on ? "✓ " : "  ";
  return Button(` ${check}${tag.label} `, {
    onClick: () => toggle(tag.label),
    fgColor: on ? "black" : tag.color,
    bgColor: on ? tag.color : undefined,
    bold: on,
    focusStyle: {
      fgColor: "black",
      bgColor: tag.color,
      bold: true,
    },
  });
}

cel.init(new ProcessTerminal());

cel.viewport(() => {
  const cols = process.stdout.columns || 80;
  const selTags = TAGS.filter((t) => selected.has(t.label));

  return VStack(
    {
      height: "100%",
      padding: { x: 2, y: 1 },
      fgColor: "white",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        if (key === "ctrl+r") clearAll();
      },
    },
    [
      // Header
      HStack({ gap: 1 }, [
        Text("◆", { fgColor: "cyan", bold: true }),
        Text("Pick your languages", { bold: true, fgColor: "white" }),
        Text(`(${selected.size}/${TAGS.length})`, {
          fgColor: "brightBlack",
        }),
      ]),
      Text("Tab navigate · Enter toggle · resize to reflow", {
        fgColor: "brightBlack",
        italic: true,
      }),
      Divider({ fgColor: "brightBlack" }),

      // Tag cloud — the flexWrap showcase
      HStack(
        { flexWrap: "wrap", gap: 1, padding: { y: 1 } },
        TAGS.map(tagChip),
      ),

      Divider({ fgColor: "brightBlack" }),

      // Selection summary
      ...(selTags.length > 0
        ? [
            Text("Selected:", { bold: true, fgColor: "brightBlack" }),
            HStack(
              { flexWrap: "wrap", gap: 1 },
              selTags.map((t) =>
                Text(` ${t.label} `, {
                  fgColor: "black",
                  bgColor: t.color,
                  bold: true,
                }),
              ),
            ),
          ]
        : [
            Text("No languages selected yet.", {
              fgColor: "brightBlack",
              italic: true,
            }),
          ]),

      Spacer(),

      // Footer hints — also wrapping
      HStack({ flexWrap: "wrap", gap: 1 }, [
        HStack({ gap: 0 }, [
          Text(" Tab ", {
            bgColor: "brightBlack",
            fgColor: "black",
            bold: true,
          }),
          Text(" navigate", { fgColor: "brightBlack" }),
        ]),
        HStack({ gap: 0 }, [
          Text(" Enter ", {
            bgColor: "brightBlack",
            fgColor: "black",
            bold: true,
          }),
          Text(" toggle", { fgColor: "brightBlack" }),
        ]),
        HStack({ gap: 0 }, [
          Text(" Ctrl+R ", {
            bgColor: "brightBlack",
            fgColor: "black",
            bold: true,
          }),
          Text(" clear", { fgColor: "brightBlack" }),
        ]),
        HStack({ gap: 0 }, [
          Text(" Ctrl+Q ", {
            bgColor: "brightBlack",
            fgColor: "black",
            bold: true,
          }),
          Text(" quit", { fgColor: "brightBlack" }),
        ]),
      ]),
    ],
  );
});
