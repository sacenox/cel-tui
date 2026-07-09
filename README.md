# cel-tui

A TypeScript TUI framework built around a declarative functional API, ultra-fast rendering, and Kitty-first keyboard input that also works well in tmux.

<p align="center">
  <picture>
    <img src="assets/demo.gif" alt="cel-tui demo" width="539" style="border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);" />
  </picture>
</p>

## Why "cel"?

A **cel** is the smallest unit of a terminal display — a single character cell. Start from the smallest meaningful unit and build up, with nothing wasted.

## Quick Example

```ts
import { cel, VStack, Text, TextInput, ProcessTerminal } from "@cel-tui/core";

let input = "";

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q") {
          cel.stop();
          process.exit();
        }
      },
    },
    [
      Text("Hello, cel-tui!", { bold: true, fgColor: "color06" }),
      Text("─", { repeat: "fill", fgColor: "color08" }),
      TextInput({
        flex: 1,
        value: input,
        onChange: (v) => {
          input = v;
          cel.render();
        },
      }),
    ],
  ),
);
```

## Primitives

| Primitive                 | Description                        |
| ------------------------- | ---------------------------------- |
| `VStack(props, children)` | Vertical stack — top to bottom     |
| `HStack(props, children)` | Horizontal stack — left to right   |
| `Text(content, props?)`   | Styled text leaf                   |
| `TextInput(props)`        | Multi-line editable text container |

## Key Concepts

- **State is external** — the framework renders what you give it. Use any state approach.
- **`cel.viewport(() => tree)`** sets the render function, **`cel.render()`** triggers re-renders.
- **Explicit invalidation** — `cel.redraw()` repairs externally corrupted screens; `cel.setTheme(theme)` replaces the runtime palette and redraws automatically.
- **Flexbox layout** — fixed, flex, percentage, and intrinsic sizing with gap, padding, alignment.
- **Layers** — return an array for multi-layer compositing (modals, overlays).
- **Uncontrolled by default** — focus and scroll just work. Opt into controlled mode when needed.
- **Stable state identity** — `stateKey` keeps focus, scroll, and TextInput state attached through reordering; `autoFocus` seeds the active layer once.
- **Controlled caret when needed** — TextInput `cursor` / `onCursorChange` enables grapheme-safe completion and range-replacement workflows.
- **Cursor shape control** — TextInput `cursorStyle` keeps block, bar, or underline painted/native cursors aligned.
- **Adaptive wheel scrolling** — scrollables and TextInput use an adaptive mouse-wheel step by default; override it with `scrollStep` when needed.
- **Content measurement helper** — `measureContentHeight(node, { width })` lets apps preserve scroll anchors when prepending intrinsically sized content.
- **Bounded long lists** — callable `VirtualList()` instances measure variable-height keyed rows, window by cell offset with overscan, preserve scroll anchors, and support controlled or sticky-bottom scrolling.
- **Terminal title helper** — `cel.setTitle("My App")` updates the window/tab title when the host honors OSC titles.
- **Style inheritance** — containers propagate styles to descendants. `bgColor` fills the rect.
- **Custom scrollbars** — `scrollbarStyle` controls thumb/track characters and terminal styles.
- **16-color palette** — numbered slots (`"color00"`–`"color15"`) mapped to ANSI 16 by default. Custom themes can remap to different ANSI indices or 24-bit true color.
- **Cell buffer rendering** — styled cells, differential updates, synchronized output.
- **Opt-in managed animation** — `Spinner()` and `createTicker()` cap render cadence and expose explicit start/stop/dispose lifecycles; the default renderer remains timer-free.
- **Kitty-first keyboard input** — baseline disambiguation is enabled by default; optional `kittyKeyboard` flags expose repeat/release phases, alternate-layout keys, all-key events, and associated text. Mixed tmux/legacy input remains supported.
- **TextInput editing shortcuts** — focused inputs support familiar readline-style editing (`ctrl+a/e`, `alt+b/f`, `ctrl+left/right`, `ctrl+w`, `alt+d`), and `up` / `down` follow visual wrapped lines.
- **TextInput-backed Select** — filterable lists share exact text, grapheme-safe cursor editing, and bracketed paste behavior with TextInput, with optional controlled query/highlight models for async overlays.

## Terminal Compatibility

- **First-class:** Kitty-compatible terminals such as Kitty, WezTerm, Ghostty, foot, Alacritty, and Windows Terminal 1.25+
- **First-class:** `tmux` with `set -s extended-keys on`
- **Best effort:** legacy terminals or multiplexers that collapse some modifier distinctions

Some historical legacy collisions remain impossible to recover once a host has already collapsed them — for example `ctrl+i` vs `tab`, `ctrl+m` vs `enter`, and `ctrl+[` vs `escape`.

## Packages

| Package               | Description                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `@cel-tui/types`      | Shared type definitions                                                                                          |
| `@cel-tui/core`       | Framework engine and primitives                                                                                  |
| `@cel-tui/clew`       | Stream-first syntax tokenization library                                                                         |
| `@cel-tui/components` | Pre-made components (Button, Spacer, Divider, VDivider, Select, VirtualList, Spinner, Markdown, SyntaxHighlight) |

## Documentation

- **[API Reference](https://sacenox.github.io/cel-tui/)** — full TypeDoc-generated docs on GitHub Pages
- **[Specification](spec.md)** — complete design spec covering layout, rendering, input, and focus
- **[Agent Skill](docs/skill/cel-tui/SKILL.md)** — structured guide for AI coding agents to build apps with cel-tui

## Performance

cel-tui ships a benchmark suite covering every pipeline stage (layout, paint, cell buffer, ANSI emission, hit testing, key parsing). See [benchmarks/RESULTS.md](benchmarks/RESULTS.md) for historical measurements and the benchmark methodology. For before/after work, compare repeated runs on the same machine, Bun version, and power profile.

```bash
bun run bench            # detailed exploratory suite
bun run bench:regression # fixed-work JSON for before/after comparisons
```

## Development

```bash
bun install           # install dependencies
bun test              # run tests
bun run bench         # run benchmarks
bun run check         # biome lint
bun run format        # prettier check
bun run typecheck     # tsc --noEmit
bun run docs          # generate API docs
```

## License

MIT
