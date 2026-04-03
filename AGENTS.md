# cel-tui — Agent Guide

## What is this?

cel-tui is a TypeScript TUI framework built around a declarative functional API, ultra-fast rendering, and a concise developer experience. Read `spec.md` for the full specification.

## Project Structure

Bun monorepo with three packages:

```
packages/
  types/        — Shared type definitions (Color, ContainerProps, TextProps, Node, etc.)
  core/         — Framework engine (primitives, layout, rendering, input handling)
  components/   — Pre-made components built with core (Button, Spacer, Divider, etc.)
```

Dependency chain: `components → core → types`

## Key Design Decisions

- **4 primitives only:** VStack, HStack (layout), Text (content leaf), TextInput (editable container)
- **State is external:** The framework has no state management. `cel.viewport(() => tree)` sets a render function, `cel.render()` requests re-evaluation. Apps use whatever state approach they want.
- **Controlled props pattern:** Focus (`focused`/`onFocus`/`onBlur`), scroll (`scrollOffset`/`onScroll`), and value (`value`/`onChange`) are app-controlled. The app owns the state, the framework renders it.
- **Uncontrolled scroll default:** `overflow: "scroll"` without `scrollOffset` is framework-managed. Adding `scrollOffset` makes it controlled.
- **TextInput is a container:** Accepts sizing props (flex, width, height, padding, min/max constraints) but has no children — its content is the `value` prop. Scroll is always framework-managed (follows cursor + responds to mouse wheel).
- **Text is a pure leaf:** No sizing props, no children. Parent controls the box. Height is intrinsic (from content + wrapping).
- **No style inheritance:** Every Text/TextInput sets its own styles explicitly. No cascading. Verbose but predictable.
- **Cell buffer rendering:** Layout writes to a 2D grid of styled cells, not raw strings. Clipping and layer compositing are cell writes. Diff against previous buffer for minimal terminal output.
- **Reactive rendering:** `cel.render()` batches via `process.nextTick()`. No fixed FPS.
- **Layers:** `cel.viewport(() => [layer1, layer2])` — array of independent viewport-sized trees, composited bottom-to-top. Conditional inclusion = show/hide.
- **Key bubbling:** Unconsumed keys bubble up from focused element through ancestors. Root `onKeyPress` = global handler.
- **Hit detection:** Topmost layer first, deepest node at (x,y), walk up to find handler. Innermost wins for scroll, click, keys.

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
bun run docs             # generate HTML + Markdown docs into docs/
```

## Spec

The `spec.md` file is the source of truth for all API design decisions. Always read it before making changes to core framework behavior. The open questions at the bottom track what's been decided vs. still in progress.

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

## Conventions

- All code is TypeScript with strict mode
- Primitives are functions that return typed Node objects (not classes)
- Components in `packages/components/` are plain functions using core primitives
- Key format: all lowercase, modifiers joined by `+` (e.g., `"ctrl+shift+s"`)
- Colors: ANSI base 16 only (Color type in types package)
