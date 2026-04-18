# cel-tui — Agent Guide

## What is this?

cel-tui is a TypeScript TUI framework built around a declarative functional API, ultra-fast rendering, and a concise developer experience. Read `spec.md` for the full specification.

## Project Structure

Bun monorepo with four packages:

```
packages/
  types/        — Shared type definitions (Color, ContainerProps, TextProps, Node, etc.)
  core/         — Framework engine (primitives, layout, rendering, input handling)
  clew/         — Stream-first syntax tokenization library
  components/   — Pre-made components built with core + clew (Button, Spacer, Divider, etc.)
```

Dependency graph: `core → types`, `components → core`, `components → types`, `components → @cel-tui/clew`

## Key Design Decisions

- **4 primitives only:** VStack, HStack (layout), Text (content leaf), TextInput (editable container)
- **State is external:** The framework has no state management. `cel.viewport(() => tree)` sets a render function, `cel.render()` requests re-evaluation. Apps use whatever state approach they want.
- **Uncontrolled by default, controlled opt-in:** Focus and scroll are framework-managed by default. Providing `focused` or `scrollOffset` explicitly switches to controlled mode (app owns the state). Value (`value`/`onChange`) on TextInput is always controlled.
- **Style inheritance:** Containers propagate style props (fgColor, bgColor, bold, italic, underline) to descendants. Explicit props on a node always override inherited values. Container `bgColor` fills the rect with opaque background before painting children.
- **focusStyle:** Containers accept `focusStyle: StyleProps` — style overrides applied when focused, participating in inheritance.
- **TextInput is a container:** Accepts sizing props (flex, width, height, padding, min/max constraints) but has no children — its content is the `value` prop. Scroll is always framework-managed (follows cursor + responds to mouse wheel).
- **Text is a pure leaf:** No sizing props, no children. Parent controls the box. Height is intrinsic (from content + wrapping).
- **Cell buffer rendering:** Layout writes to a 2D grid of styled cells, not raw strings. Clipping and layer compositing are cell writes. Diff against previous buffer for minimal terminal output.
- **Reactive rendering:** `cel.render()` batches via `process.nextTick()`. No fixed FPS.
- **Layers:** `cel.viewport(() => [layer1, layer2])` — array of independent viewport-sized trees, composited bottom-to-top. Conditional inclusion = show/hide.
- **Key bubbling:** Unconsumed keys bubble up from focused element through ancestors. Root `onKeyPress` = global handler. Escape blur is a fallback default action after bubbling — consuming `escape` prevents blur.
- **Hit detection:** Topmost layer first, deepest node at (x,y), walk up to find handler. Innermost wins for scroll, click, keys.

## Implementation Status

All core systems from the spec are implemented and tested:

- **Layout engine** — flexbox sizing (fixed, intrinsic, flex, percentage), constraints (including cross-axis min/max), gap, padding, justifyContent, alignItems, flexWrap, largest-remainder rounding
- **Rendering** — cell buffer, ANSI emitter with SGR styling, synchronized output (CSI 2026), differential rendering (emitDiff), full clear on resize
- **Painting** — grapheme-aware text rendering (CJK/emoji via visibleWidth), overflow clipping via clip rect propagation, scroll content offsetting, scrollbar indicators, container bgColor fill, style inheritance, focusStyle overrides
- **Input** — Kitty-first keyboard input (Kitty level 1 enable), mixed-stream decoding for CSI u / CSI letter / CSI tilde / recoverable legacy control bytes / ESC-prefixed Alt combos, batched SGR mouse handling, hit detection, click/scroll routing, focus traversal (Tab/Shift+Tab/Escape/Enter) with uncontrolled and controlled modes, onKeyPress bubbling from focused element through ancestors
- **TextInput** — grapheme-aware text editing (Intl.Segmenter for emoji/ZWJ), cursor movement, cursor persistence across re-renders (keyed on onChange, clamped on external value changes), batched key handling with preserved edit state across stdin chunks, auto-scroll to keep cursor visible, inverted-cell cursor with native terminal cursor positioning (blinking), background fill, placeholder rendering
- **Layering** — multi-layer compositing, transparency, topmost-layer input priority
- **Terminal** — Kitty level 1 enable/disable, mixed keyboard stream compatibility in tmux, crash cleanup (SIGINT/SIGTERM/uncaughtException), resize clear

See `TODO.md` for remaining spec violations and future work.

## Runtime

- **Bun** for package management and running TypeScript
- **TypeScript** with strict mode, ESNext target, bundler module resolution

## Commands

```bash
bun install              # install workspace dependencies
bun run <file.ts>        # run any TypeScript file directly
bun run check            # biome lint + import sorting
bun run check:fix        # biome auto-fix
bun run format           # prettier format check
bun run format:fix       # prettier auto-fix
bun run typecheck        # tsc --noEmit type checking
bun run bench            # run benchmark suite (benchmarks/)
bun run docs             # generate HTML + Markdown docs into docs/
```

## Visual Testing with tmux

Use a tmux session to run examples and visually inspect rendered output.

### tmux Configuration

cel-tui is **Kitty-first**, but `tmux` is a supported environment. tmux 3.2+ should have `extended-keys` enabled so it preserves as much modifier information as possible:

```
set -s extended-keys on
```

With that setting enabled, common keyboard-driven checks work well through `tmux send-keys`. Without it, cel-tui still accepts many recoverable legacy encodings, but historically ambiguous collisions remain collapsed by the host (`ctrl+i`/`tab`, `ctrl+m`/`enter`, `ctrl+[`/`escape`).

### Usage

```bash
# Create a session (set size to simulate a terminal window)
tmux new-session -d -s cel -x 80 -y 24

# Run an example
tmux send-keys -t cel "cd /home/xonecas/src/cel-tui && bun run examples/hello.ts" Enter

# Wait for render, then capture the screen contents
sleep 1; tmux capture-pane -t cel -p

# Send common keystrokes directly
# (printable chars, Tab/BTab, Enter, Escape, arrows, many Ctrl+letter combos)
tmux send-keys -t cel C-q

# Resize the window to test different terminal sizes
tmux resize-window -t cel -x 60 -y 20

# Kill the session when done
tmux kill-session -t cel
```

This lets you see exactly what the user sees — rendered cells, alignment, clipping, and, via `capture-pane -e -p`, style escape sequences — without needing a real interactive terminal.

### Sending Keys in tmux

For most keyboard-driven manual checks, plain `tmux send-keys` is now sufficient:

```bash
# Common cases that work well in tmux with extended-keys on
tmux send-keys -t cel a
tmux send-keys -t cel Enter
tmux send-keys -t cel Escape
tmux send-keys -t cel Tab
tmux send-keys -t cel BTab
tmux send-keys -t cel Up
tmux send-keys -t cel C-q
tmux send-keys -t cel C-r
```

Use exact Kitty-style injection only when you need to test protocol-specific sequences or combos that tmux named keys do not express reliably (for example `shift+enter`, `ctrl+plus`, or a precise CSI-u path):

```bash
# Helper: convert a key name to hex bytes via kittyEncode
send_key() {
  local hex=$(cd /home/xonecas/src/cel-tui && bun -e "
    const {kittyEncode} = require('./packages/core/src/test-helpers.ts');
    const bytes = kittyEncode('$1');
    const hex = Array.from(bytes).map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join(' ');
    process.stdout.write(hex);
  ")
  tmux send-keys -t cel -H $hex
}

# Usage:
send_key "ctrl+q"
send_key "shift+enter"
send_key "ctrl+plus"
send_key "shift+tab"
```

**Limitations:** the helper lowercases printable input, so uppercase-text insertion is still better tested with plain `tmux send-keys` or in a real terminal.

**Caveat:** `tmux send-keys -H` injects raw bytes one event at a time, while real terminals may batch multiple keyboard or mouse events into a single stdin chunk. Use hex injection to target exact encodings, not to simulate full terminal behavior.

### Mouse Events Don't Work in tmux

SGR mouse events (click, scroll) sent through tmux remain **unreliable** and should not be used for verification. Even with correctly formatted SGR sequences and `mouse off` in tmux config, the injected bytes may not reach the application's stdin in a form the parser recognizes. This is a tmux limitation around raw mouse protocol injection.

**Do not treat tmux as authoritative for mouse interactions (click, scroll).** Use tmux for:

- Keyboard-driven testing via plain `tmux send-keys` for common keys
- Exact keyboard-sequence injection via `send_key` when you need protocol precision
- Visual inspection via `tmux capture-pane -p` / `tmux capture-pane -e -p`
- Verifying layout, alignment, text content, and many keyboard flows

Mouse and scroll behavior still need verification in a real interactive terminal.

### tmux capture-pane Limitations

`tmux capture-pane -p` captures **plain text only** — no colors or style attributes. This means:

- You can verify text content, alignment, and layout structure
- You **cannot** verify `fgColor`, `bgColor`, `bold`, or `focusStyle` changes from plain-text capture alone

To inspect styling, use `tmux capture-pane -e -p` (includes escape sequences) or verify style output through unit tests against the cell buffer.

## Spec

The `spec.md` file is the source of truth for all API design decisions. Always read it before making changes to core framework behavior.

## Testing Strategy

Use `bun test` (built-in test runner, no extra deps). Test files live next to source as `*.test.ts`.

**TDD for pure logic** — write tests first for:

- Character width (`visibleWidth`, grapheme segmentation, ANSI stripping)
- Cell buffer (write, read, diff)
- Layout engine (input tree + available space → output rects)
- Painting/clipping (node + rect → cell buffer contents)
- Hit detection (position → node lookup)
- Focus/key routing (key events → correct handler)

**Integration tests with mock terminal** for:

- Terminal I/O (assert emitted ANSI sequences against an in-memory buffer)
- End-to-end pipeline (`cel.viewport` → rendered output)

## Commit Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `style`

**Scopes:** `types`, `core`, `components`, `spec`, or omit for repo-wide changes.

**Examples:**

```
feat(core): implement visibleWidth with grapheme segmentation
test(core): add character width tests for CJK, emoji, ANSI
docs(spec): define Text primitive styling and wrapping
chore: scaffold monorepo with types, core, components packages
```

## Runtime

**Always use `bun` and `bunx` instead of `node`, `npm`, `npx`, or `yarn`.** This is a Bun monorepo — all scripts, package management, and execution should go through Bun.

## Architecture Notes

- `cel.ts` — Framework entrypoint. Owns render loop, input dispatch, focus management. `cel.init(terminal, options?)` starts (accepts optional `{ theme }` for custom color themes), `cel.viewport(fn)` sets render function, `cel.render()` requests re-render, `cel.stop()` restores terminal. Input handling treats stdin as a mixed stream: keyboard chunks may contain multiple decoded key events, mouse input handles batched SGR events, and TextInput batching preserves the latest value/cursor across multiple keys in one chunk. TextInput `onKeyPress` fires before built-in editing logic — returning `false` prevents the default TextInput action for that key (for example, intercept Enter instead of inserting a newline, or intercept Escape instead of blurring). The TextInput's `onKeyPress` is excluded from ancestor bubbling to avoid double-calling. Escape blur itself runs only after `onKeyPress` bubbling leaves the key unconsumed.
- `layout.ts` — Flexbox engine. `layout(root, width, height)` → `LayoutNode` tree with absolute screen rects.
- `paint.ts` — Paints `LayoutNode` tree into `CellBuffer`. Handles clip rects, scroll offsets (clamped to max — apps can pass `Infinity` to mean "scroll to end"), scrollbars, grapheme-aware text rendering, TextInput cursor/scroll state (with cursor screen position export for native cursor), TextInput background fill, container bgColor fill, style inheritance threading, focusStyle resolution.
- `emitter.ts` — `emitBuffer()` for full renders, `emitDiff()` for differential. Both accept an optional `Theme` for color resolution and wrap in CSI 2026 synchronized output. Exports `defaultTheme` (ANSI 16 mapping).
- `hit-test.ts` — `hitTest(root, x, y, getScrollOffset?)` → path from root to deepest node at `(x,y)`, accounting for scroll offsets. `findClickHandler`, `findScrollTarget`, `collectKeyPressHandlers`, `collectFocusable` walk paths.
- `keys.ts` — Kitty-first input decoder. `decodeKeyEvents(data)` splits a raw chunk into ordered key events, accepting CSI u / CSI letter / CSI tilde sequences, recoverable legacy ASCII control bytes, ESC-prefixed Alt combos, and raw printable text. Key events carry a normalized semantic `key` plus optional original insertable `text`. `parseKey(data)` remains as a convenience wrapper for single-event cases. `isEditingKey()` identifies non-text editing/navigation keys consumed by TextInput, and `normalizeKey()` reorders modifiers to canonical `ctrl+alt+shift+<key>` order.
- `text-edit.ts` — Pure text editing functions (`insertChar`, `deleteBackward`, `deleteForward`, `moveCursor`). Operates on `EditState` (value + cursor position). Uses `Intl.Segmenter` with grapheme granularity for cursor movement and deletion (handles emoji, ZWJ sequences, combining marks). Used by `cel.ts` to handle TextInput key events.
- `width.ts` — `visibleWidth(str)` measures terminal column width. Fast ASCII path, grapheme segmentation, East Asian width, ANSI stripping, LRU cache.
- `terminal.ts` — `ProcessTerminal` (real I/O, raw mode, Kitty keyboard protocol level 1 enable, SGR mouse, crash cleanup) and `MockTerminal` (testing). The runtime prefers Kitty semantics but the parser still accepts mixed tmux/legacy keyboard encodings.

## Updating gh-pages

The `gh-pages` branch tracks generated API docs (`docs/html/`, `docs/md/`) and an `index.html` for GitHub Pages. To update it after changes land on `main`:

```bash
git checkout gh-pages
git merge main              # resolve any conflicts, keeping docs tracked
bun run docs                # regenerate API docs
git add -A
git commit -m "docs: regenerate API docs from latest main"
git push
git checkout main
```

**Key differences on gh-pages:**

- `.gitignore` does **not** exclude `docs/html/` or `docs/md/` (they're committed)
- `.prettierignore` includes `docs/html` and `docs/md` (generated files fail format checks otherwise)

## Publishing to npm

Packages are published to the `@cel-tui` npm org (owner: `xonecas`). They ship TypeScript source directly — no build step.

### Version bump

All four packages share the same version. Bump all together:

```bash
# In packages/types/package.json, packages/core/package.json, packages/clew/package.json, packages/components/package.json
# Update "version" to the new value
```

Follow [semver](https://semver.org/): patch for fixes, minor for features, major for breaking changes. While `0.x`, minor = breaking is acceptable.

**⚠️ Critical: After bumping versions, regenerate the lockfile:**

```bash
rm bun.lock && bun install
```

`bun publish` resolves `workspace:*` from `bun.lock`, **not** from `package.json`. If you skip this step, the published packages will depend on the old version. `bun install` alone does NOT update workspace versions in an existing lockfile — you must delete and regenerate it.

### Publish order

Must publish in dependency order — types first, then core, then `@cel-tui/clew`, then components:

```bash
cd packages/types && bun publish --access public
cd ../core && bun publish --access public
cd ../clew && bun publish --access public
cd ../components && bun publish --access public
```

If 2FA is enabled, add `--otp <code>` to each command.

### Pre-release documentation audit

Before every release, run a full alignment audit across all documentation surfaces. The goal is to catch stale versions, false capability claims, signature mismatches, and terminology drift between the spec, code, JSDocs, agent docs, and skill files.

**What to read** (in this order — each layer should agree with the ones before it):

1. `packages/types/src/index.ts` — the canonical type definitions and their JSDocs
2. `packages/core/src/*.ts` — implementation (public function signatures, behavior, exports)
3. `packages/core/src/index.ts` — what's actually exported to consumers
4. `packages/clew/src/*.ts` — tokenizer implementation, streaming behavior, exports, and JSDocs
5. `packages/clew/src/index.ts` — what's actually exported from `@cel-tui/clew`
6. `packages/components/src/*.ts` — component implementations and JSDocs
7. `spec.md` — design spec (API tables, prop types, behavior descriptions)
8. `AGENTS.md` — architecture notes, module descriptions, conventions
9. `README.md` — user-facing overview and feature claims
10. `docs/skill/cel-tui/SKILL.md` — agent skill (version, compatibility, patterns, gotchas)
11. `docs/skill/cel-tui/references/*.md` — API reference and composing guide
12. `TODO.md` — verify listed bugs/violations are still present or mark resolved
13. `package.json` files — versions, descriptions, dependency declarations

**What to check at each layer:**

- **Versions** — skill metadata, package.json files, and any version references all match
- **Capability claims** — if docs say "supports X", verify the code actually implements X (e.g., color spaces, protocol levels, sizing strategies)
- **Function signatures** — parameter names, types, optional params, return types match between code and docs
- **Prop tables** — every prop in the type definition appears in the spec table with the correct type and description
- **Terminology** — consistent naming across all surfaces (e.g., `TextNode` vs `Text`, "uncontrolled" vs "framework-managed")
- **Behavior descriptions** — bubbling semantics, controlled/uncontrolled modes, default values all match the implementation
- **Exports** — what `index.ts` exports matches what docs say is available
- **Compatibility/requirements** — terminal requirements, runtime requirements are stated accurately
- **TODO.md currency** — bugs listed as open are still present in code; any that were fixed should be removed

**After making fixes**, always verify nothing broke:

```bash
bun run typecheck && bun test && bun run check && bun run format
```

### Pre-publish checklist

1. **Documentation audit passes** (see above)
2. All tests pass: `bun test`
3. Types clean: `bun run typecheck`
4. Lint/format clean: `bun run check && bun run format`
5. Version bumped in all four `package.json` files
6. Lockfile regenerated: `rm bun.lock && bun install`
7. **Pre-publish check passes: `bun run prepublish-check`** (verifies lockfile versions match package.json)
8. Changes committed and pushed
9. After publishing, **verify on npm**: `npm view @cel-tui/clew@<version> dependencies --json` and `npm view @cel-tui/components@<version> dependencies --json`

### How it works

- `"files"` in each `package.json` whitelists what ships (source only, no tests)
- `"exports"` map provides proper module resolution for Bun and bundlers
- `workspace:*` dependencies are resolved to actual versions by `bun publish` **using versions from `bun.lock`** (not package.json — the lockfile must be regenerated after version bumps)
- `get-east-asian-width` is a real dependency of `@cel-tui/core` (installs for consumers)
- `typescript` is a peer dependency (consumers bring their own)

## Non-interactive Commands

Avoid commands that open an interactive editor or prompt from the agent shell. They can hang the tool.

- Always pass messages explicitly for git commands that might invoke `$EDITOR`.
- Use `git commit -m "..."` and `git tag -a <tag> -m "..."`.
- Do not run bare `git tag <tag>` during release work.

## Destructive Actions

**Never use `git checkout` or `git restore` on files you have modified.** A single `git checkout <file>` will silently discard all uncommitted changes in that file — including unrelated work. If you need to revert a specific edit, use `edit` to undo just that change. If you must use git to undo something, `git stash` first so the work can be recovered.

More generally: before running any command that could destroy uncommitted work (`git checkout`, `git reset --hard`, `git clean`, `rm` on source files), stop and consider whether there are unsaved changes at risk. If in doubt, `git stash` or `git diff --stat` first.

## Conventions

- All code is TypeScript with strict mode
- Primitives are functions that return typed Node objects (not classes)
- Components in `packages/components/` are plain functions using core primitives
- Key format: all lowercase, modifiers joined by `+` (e.g., `"ctrl+shift+s"`)
- Colors: 16 numbered palette slots (`"color00"`–`"color15"`), mapped to ANSI 16 by default via `defaultTheme`. Custom themes can remap slots to different ANSI indices or 24-bit true color. Omit `fgColor`/`bgColor` for terminal defaults. Always pair `bgColor` with `fgColor` for contrast.
