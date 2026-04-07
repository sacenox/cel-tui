/**
 * cel-tui: Live Markdown Editor
 *
 * A split-pane markdown editor with live preview, showcasing:
 * - Custom color theme (Catppuccin Mocha via true color)
 * - Large multi-line TextInput editor
 * - Live Markdown rendering (source ↔ preview)
 * - Split-pane layout with VDivider
 * - Scrollable preview pane
 * - Focus management between editor and UI
 *
 * Run: bun run examples/markdown-editor.ts
 */

import {
  cel,
  VStack,
  HStack,
  Text,
  TextInput,
  ProcessTerminal,
  type Theme,
} from "@cel-tui/core";
import {
  Divider,
  Spacer,
  VDivider,
  Markdown,
  type MarkdownTheme,
} from "@cel-tui/components";

// ─── Theme: Catppuccin Mocha ────────────────────────────────────

const mocha: Theme = {
  color00: "#1e1e2e", // base (dark bg)
  color01: "#f38ba8", // red
  color02: "#a6e3a1", // green
  color03: "#f9e2af", // yellow
  color04: "#89b4fa", // blue
  color05: "#cba6f7", // mauve
  color06: "#94e2d5", // teal
  color07: "#cdd6f4", // text
  color08: "#45475a", // surface1 (muted)
  color09: "#f38ba8", // bright red
  color10: "#a6e3a1", // bright green
  color11: "#f9e2af", // bright yellow
  color12: "#89b4fa", // bright blue
  color13: "#cba6f7", // bright mauve
  color14: "#94e2d5", // bright teal
  color15: "#bac2de", // subtext1
};

const mdTheme: MarkdownTheme = {
  heading1: { bold: true, fgColor: "color05" },
  heading2: { bold: true, fgColor: "color04" },
  heading3: { bold: true, fgColor: "color06" },
  codeBlock: { bgColor: "color08", fgColor: "color07" },
  codeContent: { fgColor: "color07" },
  listMarker: { fgColor: "color05", bold: true },
  blockquoteBar: { fgColor: "color06" },
  blockquoteText: { italic: true, fgColor: "color15" },
  hr: { fgColor: "color08" },
  bold: { bold: true, fgColor: "color03" },
  italic: { italic: true },
  inlineCode: { fgColor: "color02" },
  link: { fgColor: "color04", underline: true },
};

// ─── Sample Documents ───────────────────────────────────────────

const DOCUMENTS: { name: string; content: string }[] = [
  {
    name: "README.md",
    content: `# Project Aurora

A next-generation toolkit for building **terminal user interfaces** with style.

## Features

- **Declarative API** — describe your UI as a tree of components
- **Flexbox layout** — stack, align, and distribute with familiar primitives
- **True color themes** — go beyond the ANSI 16 palette
- **Reactive rendering** — only re-render what changed

## Getting Started

Install the package:

\`\`\`bash
bun add @cel-tui/core @cel-tui/components
\`\`\`

Create your first app:

\`\`\`ts
import { cel, VStack, Text, ProcessTerminal } from "@cel-tui/core";

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack({ height: "100%" }, [
    Text("Hello, world!", { bold: true }),
  ])
);
\`\`\`

## Architecture

The framework is built around **four primitives**:

1. **VStack** — vertical layout container
2. **HStack** — horizontal layout container
3. **Text** — styled text leaf node
4. **TextInput** — editable text container

> All state is external. The framework just renders whatever tree you return.

---

*Built with love for the terminal.*`,
  },
  {
    name: "CHANGELOG.md",
    content: `# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] — 2026-04-05

### Added

- **True color theme support** — custom themes can now map color slots to 24-bit hex values
- **Autogrowing TextInput** — \`maxHeight\` constraint works on the cross axis
- **Native blinking cursor** — terminal cursor positioned at the focused TextInput

### Fixed

- Cursor position preserved correctly when value is cleared externally
- Grapheme-aware editing — emoji and ZWJ sequences treated as single units

### Changed

- \`text-edit.ts\` now uses \`Intl.Segmenter\` for all cursor movement

---

## [0.2.0] — 2026-03-15

### Added

- **Markdown component** with streaming support
- **flexWrap** for HStack — children wrap to next row when they exceed width
- **Select component** with fuzzy filtering

### Fixed

- Scroll offset clamping for \`Infinity\` (sticky-bottom pattern)

> See the full history on [GitHub](https://github.com/example/aurora).

---

## [0.1.0] — 2026-02-01

### Added

- Initial release
- VStack, HStack, Text, TextInput primitives
- Flexbox layout engine
- Cell buffer rendering with differential updates
- Kitty keyboard protocol support

*First public release — here we go!*`,
  },
  {
    name: "DESIGN.md",
    content: `# Design Notes

## Color Philosophy

The framework uses **16 numbered color slots** (\`color00\`–\`color15\`) rather than named colors like "red" or "white". This is intentional:

> Named colors are deceptive. "white" on a dark theme is bright, but on a light theme it's the background color. Numbered slots make the abstraction explicit.

### Slot Conventions

| Range | Purpose |
|-------|---------|
| \`color00\`–\`color07\` | Base palette (dark to light) |
| \`color08\`–\`color15\` | Bright variants |

### Theme Example

A **Catppuccin Mocha** theme maps slots to true color:

\`\`\`ts
const mocha: Theme = {
  color00: "#1e1e2e",  // base
  color01: "#f38ba8",  // red
  color02: "#a6e3a1",  // green
  // ...
};
\`\`\`

## Layout Model

The layout engine is inspired by **CSS Flexbox** but simplified for terminal constraints:

- All coordinates are integer cells (no subpixel)
- The **Largest Remainder Method** distributes fractional space fairly
- **Intrinsic sizing** measures content before flex distribution

### Key Differences from CSS

1. No \`flex-shrink\` — children never shrink below intrinsic size
2. No \`flex-basis\` — use \`width\`/\`height\` or \`minWidth\`/\`minHeight\`
3. **Gap** is cell-based, not relative
4. **Percentage** sizes resolve against the parent, not the viewport

---

*These notes are living documentation — they evolve with the codebase.*`,
  },
];

// ─── State ──────────────────────────────────────────────────────

let activeDocIndex = 0;
let editorFocused = true;
let source = DOCUMENTS[0]!.content;
let previewScroll = 0;
let previewStickToBottom = false;

// ─── Helpers ────────────────────────────────────────────────────

function activeDoc() {
  return DOCUMENTS[activeDocIndex]!;
}

function switchDoc(index: number) {
  // Save current edits
  DOCUMENTS[activeDocIndex]!.content = source;
  activeDocIndex = index;
  source = DOCUMENTS[index]!.content;
  previewScroll = 0;
  previewStickToBottom = false;
  cel.render();
}

function handleChange(value: string) {
  source = value;
  cel.render();
}

function quit() {
  cel.stop();
  process.exit(0);
}

// ─── UI ─────────────────────────────────────────────────────────

cel.init(new ProcessTerminal(), { theme: mocha });

cel.viewport(() =>
  VStack(
    {
      height: "100%",
      bgColor: "color00",
      fgColor: "color07",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        if (key === "ctrl+n") {
          switchDoc((activeDocIndex + 1) % DOCUMENTS.length);
          return;
        }
        if (key === "ctrl+p") {
          switchDoc((activeDocIndex - 1 + DOCUMENTS.length) % DOCUMENTS.length);
          return;
        }
        return false;
      },
    },
    [
      // ── Title bar ──
      HStack(
        {
          height: 1,
          padding: { x: 1 },
          bgColor: "color05",
          fgColor: "color00",
        },
        [
          Text(" ✎ Markdown Editor ", { bold: true }),
          Spacer(),
          Text(activeDoc().name, { italic: true }),
        ],
      ),

      // ── Tab bar ──
      HStack({ height: 1, bgColor: "color08", fgColor: "color07" }, [
        ...DOCUMENTS.map((doc, i) => {
          const isActive = i === activeDocIndex;
          return HStack(
            {
              onClick: () => switchDoc(i),
              focusable: false,
              bgColor: isActive ? "color00" : "color08",
              fgColor: isActive ? "color07" : "color15",
              padding: { x: 1 },
            },
            [Text(doc.name, isActive ? { bold: true } : {})],
          );
        }),
        Spacer(),
        Text(" ctrl+n/p: switch ", { fgColor: "color15" }),
      ]),

      // ── Main content: split pane ──
      HStack({ flex: 1 }, [
        // Left: source editor
        VStack({ flex: 1 }, [
          HStack(
            {
              height: 1,
              padding: { x: 1 },
              bgColor: "color08",
              fgColor: "color06",
            },
            [
              Text("SOURCE", { bold: true }),
              Spacer(),
              Text(`${source.split("\n").length} lines`, {
                fgColor: "color15",
              }),
            ],
          ),
          TextInput({
            flex: 1,
            value: source,
            onChange: handleChange,
            padding: { x: 1 },
            focused: editorFocused,
            onFocus: () => {
              editorFocused = true;
              cel.render();
            },
            onBlur: () => {
              editorFocused = false;
              cel.render();
            },
            bgColor: "color00",
            fgColor: "color07",
            focusStyle: { bgColor: "color00" },
          }),
        ]),

        // Divider
        VDivider({ fgColor: "color08" }),

        // Right: live preview
        VStack({ flex: 1 }, [
          HStack(
            {
              height: 1,
              padding: { x: 1 },
              bgColor: "color08",
              fgColor: "color05",
            },
            [Text("PREVIEW", { bold: true }), Spacer(), Text("live")],
          ),
          VStack(
            {
              flex: 1,
              overflow: "scroll",
              scrollbar: true,
              padding: { x: 1, y: 1 },
              scrollOffset: previewStickToBottom ? Infinity : previewScroll,
              onScroll: (offset, maxOffset) => {
                previewScroll = offset;
                previewStickToBottom = offset >= maxOffset;
                cel.render();
              },
            },
            Markdown(source, { theme: mdTheme }),
          ),
        ]),
      ]),

      // ── Status bar ──
      HStack(
        {
          height: 1,
          padding: { x: 1 },
          bgColor: "color08",
          fgColor: "color15",
        },
        [
          Text(editorFocused ? " EDIT " : " VIEW ", {
            bgColor: editorFocused ? "color02" : "color04",
            fgColor: "color00",
            bold: true,
          }),
          Text(` ${activeDoc().name} `, { fgColor: "color07" }),
          Text(`${source.length} chars`, { fgColor: "color15" }),
          Spacer(),
          Text("esc: blur  ", { fgColor: "color15" }),
          Text("ctrl+q: quit", { fgColor: "color15" }),
        ],
      ),
    ],
  ),
);
