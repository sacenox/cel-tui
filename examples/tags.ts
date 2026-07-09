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

import { Button, Divider, Spacer } from "@cel-tui/components";
import { cel, HStack, ProcessTerminal, Text, VStack } from "@cel-tui/core";

// ─── Data ───────────────────────────────────────────────────────

interface Tag {
  label: string;
  color: "color06" | "color05" | "color03" | "color02" | "color04" | "color01";
}

const TAGS: Tag[] = [
  { label: "TypeScript", color: "color04" },
  { label: "Rust", color: "color01" },
  { label: "Go", color: "color06" },
  { label: "Python", color: "color03" },
  { label: "JavaScript", color: "color03" },
  { label: "C++", color: "color04" },
  { label: "Zig", color: "color05" },
  { label: "Haskell", color: "color05" },
  { label: "Elixir", color: "color05" },
  { label: "Ruby", color: "color01" },
  { label: "Kotlin", color: "color02" },
  { label: "Swift", color: "color01" },
  { label: "Lua", color: "color04" },
  { label: "OCaml", color: "color03" },
  { label: "Clojure", color: "color02" },
  { label: "Scala", color: "color01" },
  { label: "Nim", color: "color03" },
  { label: "Julia", color: "color02" },
  { label: "Erlang", color: "color01" },
  { label: "Dart", color: "color06" },
  { label: "C#", color: "color02" },
  { label: "F#", color: "color06" },
  { label: "Gleam", color: "color05" },
  { label: "Odin", color: "color04" },
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
    fgColor: on ? "color00" : tag.color,
    bgColor: on ? tag.color : undefined,
    bold: on,
    focusStyle: {
      fgColor: "color00",
      bgColor: tag.color,
      bold: true,
    },
  });
}

cel.init(new ProcessTerminal());

cel.viewport(() => {
  const selTags = TAGS.filter((t) => selected.has(t.label));

  return VStack(
    {
      height: "100%",
      padding: { x: 2, y: 1 },
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        if (key === "ctrl+r") clearAll();
      },
    },
    [
      // Header
      HStack({ gap: 1 }, [
        Text("◆", { fgColor: "color06", bold: true }),
        Text("Pick your languages", { bold: true }),
        Text(`(${selected.size}/${TAGS.length})`, {
          fgColor: "color08",
        }),
      ]),
      Text("Tab navigate · Enter toggle · resize to reflow", {
        fgColor: "color08",
        italic: true,
      }),
      Divider({ fgColor: "color08" }),

      // Tag cloud — the flexWrap showcase
      HStack(
        { flexWrap: "wrap", gap: 1, padding: { y: 1 } },
        TAGS.map(tagChip),
      ),

      Divider({ fgColor: "color08" }),

      // Selection summary
      ...(selTags.length > 0
        ? [
            Text("Selected:", { bold: true, fgColor: "color08" }),
            HStack(
              { flexWrap: "wrap", gap: 1 },
              selTags.map((t) =>
                Text(` ${t.label} `, {
                  fgColor: "color00",
                  bgColor: t.color,
                  bold: true,
                }),
              ),
            ),
          ]
        : [
            Text("No languages selected yet.", {
              fgColor: "color08",
              italic: true,
            }),
          ]),

      Spacer(),

      // Footer hints — also wrapping
      HStack({ flexWrap: "wrap", gap: 1 }, [
        HStack({ gap: 0 }, [
          Text(" Tab ", {
            bgColor: "color08",
            fgColor: "color00",
            bold: true,
          }),
          Text(" navigate", { fgColor: "color08" }),
        ]),
        HStack({ gap: 0 }, [
          Text(" Enter ", {
            bgColor: "color08",
            fgColor: "color00",
            bold: true,
          }),
          Text(" toggle", { fgColor: "color08" }),
        ]),
        HStack({ gap: 0 }, [
          Text(" Ctrl+R ", {
            bgColor: "color08",
            fgColor: "color00",
            bold: true,
          }),
          Text(" clear", { fgColor: "color08" }),
        ]),
        HStack({ gap: 0 }, [
          Text(" Ctrl+Q ", {
            bgColor: "color08",
            fgColor: "color00",
            bold: true,
          }),
          Text(" quit", { fgColor: "color08" }),
        ]),
      ]),
    ],
  );
});
