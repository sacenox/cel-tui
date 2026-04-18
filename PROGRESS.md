# PROGRESS

## Context

We are unhappy with the current state of syntax highlighting in our stack.

The problem does **not** appear to be a `cel-tui` limitation. The real issue is the syntax-highlighting ecosystem underneath it: most libraries are either renderer-first, HTML-first, theme-first, editor-specific, or not designed well for streamed / incremental tokenization.

That matters for us because we want highlighting that is:

- modern
- fast
- correct
- stream-friendly
- renderer-agnostic
- usable from Bun
- suitable for TUIs, editors, markdown renderers, and other apps

## Why this came up

We already tried `shiki-stream` in the past and did not get good results with Bun. That might have been integration pain, but it also exposed a bigger issue: the ecosystem does not have a clear, boring, low-level library that treats **streamed tokenization** as the primary job.

So the idea is to make a new library in this workspace that solves that problem directly.

## What we looked at

We did a quick comparison of the current options that are adjacent to this problem.

### TextMate / Shiki side

#### `shiki-stream`

Pros:

- closest existing library to the exact streamed-highlighting problem
- models the fact that future input can change earlier highlighting
- supports recall tokens for unstable output

Cons:

- still shaped around the Shiki stack
- themed-token oriented instead of being a clean base tokenizer
- feels more like a stream renderer helper than a foundational token engine
- Bun compatibility / ergonomics were not great for us in practice

#### `shiki`

Pros:

- high quality highlighting
- mature ecosystem
- has `GrammarState`, `getLastGrammarState`, and token APIs
- portable in principle and documented as Bun-compatible

Cons:

- API is still strongly renderer / theme oriented
- not ideal if what we really want is raw tokenization and stream state
- high-level abstraction is great for output, less great as a base engine

#### `vscode-textmate`

Pros:

- probably the best low-level TextMate baseline
- already exposes the right mental model for streaming:
  - tokenize a line
  - keep the state stack
  - continue from there
- cleaner tokenizer primitive than Shiki for this use case

Cons:

- low-level and raw
- manual grammar loading is annoying
- Oniguruma / WASM setup adds friction
- not a modern, batteries-included stream-token API

#### `starry-night`

Pros:

- high quality GitHub-style output
- good reference point for output quality
- AST/HAST-first instead of HTML-string-only

Cons:

- not really a streaming token engine
- more output-oriented than tokenizer-oriented

### Regex / classic highlighters

#### `highlight.js`, `lowlight`, `Prism`, `refractor`

Pros:

- easy to adopt
- portable
- some provide AST/token structures instead of raw HTML

Cons:

- correctness ceiling is lower
- not compelling if the core complaint is poor highlighting quality
- generally not built around streamed, stateful tokenization

These are useful libraries, but they do not look like the right foundation for a new "fast and correct streamed highlighting" core.

### Parser / incremental side

#### `web-tree-sitter`

Pros:

- real incremental parsing
- much better long-term story for editable documents
- can produce structured ranges from syntax queries
- strongest architecture for true incremental correctness

Cons:

- more plumbing
- more assets and setup
- grammar/query quality varies by language
- less turnkey as a standalone highlighting engine in JS/Bun apps

#### `CodeMirror` / `Lezer`

Pros:

- clean incremental design
- strong API ideas around syntax tags and highlighting
- useful reference for architecture

Cons:

- smaller grammar ecosystem than TextMate
- not the obvious drop-in base for broad language coverage

#### `Monaco`

Pros:

- good reference API for line tokenization with carry-forward state
- proves the usefulness of a tokenizer interface shaped around `line -> tokens + endState`

Cons:

- not the base library we want to depend on
- editor-focused rather than tokenizer-first

## Ecosystem problem summary

Right now the ecosystem feels broken in a very specific way:

- **High-quality stacks** are usually tied to heavy theming / HTML / editor assumptions.
- **Simple stacks** are usually easier to use but weaker in correctness.
- **Incremental stacks** exist, but often require much more setup and language-specific plumbing.
- **Streaming support** is usually an add-on, not the core abstraction.
- **Renderer-agnostic token streams** are surprisingly rare.
- **Bun-friendly, low-friction APIs** are not the norm.

There is no obvious library that is simultaneously:

- token-first
- stream-aware
- renderer-agnostic
- Bun-friendly
- high-quality across many languages
- suitable for both append-only streams and more general document workflows

## Why we want a new base library

The goal is **not** to build another syntax highlighter that only outputs HTML or only serves `cel-tui`.

The goal is to build a base library that covers the wider use case:

- TUIs
- editors
- markdown renderers
- streaming LLM/code output
- static renderers
- diff viewers
- any app that needs syntax-aware token ranges without being forced into one renderer

That base layer should:

- expose a clean token/range API
- make tokenizer state explicit
- handle unstable streaming output in an explicit way
  - for example: stable chunks, recalls, invalidations, or similar
- avoid HTML assumptions
- avoid hard-wiring theme concerns into tokenization
- work well in Bun
- be useful even outside this repo

## Direction

The current thinking is:

1. `vscode-textmate` is the strongest baseline if we want to stay in the TextMate world initially.
2. `shiki-stream` is useful as a comparison point for stream semantics, especially recalls.
3. `web-tree-sitter` is the strongest long-term alternative if we want true incremental parsing instead of line/state tokenization.

That suggests a practical plan:

- start with a clean, low-level, stream-aware tokenizer core
- keep rendering and theming as separate layers
- design the API so the backend can be TextMate-first
- keep room for other backends later if needed

## Name

The new library is called **`clew`** and the workspace package name is **`@cel-tui/clew`**.

The name comes from the maze metaphor: parsing input is like solving a maze, and a **clew** is the guiding thread used to find the path through a labyrinth.

## API decisions so far

We decided to keep the public API intentionally simple.

Primary entrypoint:

```ts
clew(content, options) => ClewStream | ClewOutput
```

Current direction:

- **streaming is the default**
- sync mode is opt-in via `stream: false`
- sync mode should return final structured tokens
- stream mode should support very fine-grained input, including per-character writes
- stream mode should expose:
  - `onChunk`
  - `onCorrection`
  - `write`
  - `snapshot`
  - `end`

Default behavior:

- `stream: true`
- `stability: "eager"`

We explicitly chose **`eager` as the default** because this library is stream-first.

## Correction model

One important API decision is that corrections should be **range-based**, not token-count-based.

In other words, corrections should say:

> replace source range `from..to` with these tokens

This is a better fit for a base library than a renderer-specific recall model, and it keeps the API general enough for:

- TUIs
- editors
- HTML renderers
- markdown renderers
- diff tools
- per-character streaming consumers

## Initial scope

To get moving, `clew` started with **TypeScript only**.

That initial goal is complete.

We now have a real stream-first tokenizer package, a real consumer in
`SyntaxHighlight`, and several non-TypeScript languages integrated.

## Desired properties for v0

A first version should aim for:

- append-only streaming done well
- explicit tokenizer state
- renderer-agnostic token events or token ranges
- eager streaming by default, with corrections when needed
- Bun-first developer experience
- enough generality that `cel-tui` is just the first consumer, not the whole point

## Architecture now

The current shape is intentionally simple:

- `packages/clew/` is a real workspace package
- `clew(content, options)` is still the single public entrypoint
- the stream layer is generic and shared across languages
- language support lives behind a small internal registry
- each language module owns:
  - `tokenize(content)`
  - optional `stableBoundary(content, ended)`
- `SyntaxHighlight` is now a **`clew` renderer only**
- old `lowlight` / `lextide` fallback logic has been removed from `SyntaxHighlight`
- the TypeScript / JavaScript path now starts with the TypeScript lexical classifier and layers AST-based semantic overlays on top

Current `clew` source layout:

- `src/model.ts`
- `src/shared.ts`
- `src/registry.ts`
- `src/stream.ts`
- `src/languages/typescript.ts`
- `src/languages/python.ts`
- `src/languages/bash.ts`
- `src/languages/json.ts`
- `src/languages/markdown.ts`

This is the structure new languages should follow.

## Scope model

We also cleaned up the theme contract.

`SyntaxHighlight` themes no longer target backend-specific class names.
They now target canonical `clew` scopes directly.

Examples:

- `keyword`
- `string`
- `property`
- `link`
- `variable`
- `command`
- `builtin`
- `markup.heading`
- `meta.substitution.command`
- `meta.substitution.arithmetic`
- `string.heredoc`

That is a much better long-term contract than `hljs-*` or other backend-shaped names.

## Supported languages today

`clew` currently supports:

### TypeScript / JavaScript ids

- `typescript`
- `ts`
- `tsx`
- `mts`
- `cts`
- `javascript`
- `js`
- `jsx`
- `mjs`
- `cjs`

### Python

- `python`
- `py`

### Bash

- `bash`

This is intentionally **Bash only**.

Not supported:

- `sh`
- `zsh`
- `fish`
- `shell`

### JSON

- `json`

### Markdown

- `markdown`

## Testing direction

We now have a clearer testing split.

### 1. Tokenizer correctness tests (`packages/clew/src/index.test.ts`)

These verify:

- token text joins back to the original source exactly
- tokens fully cover the source with no gaps or overlaps
- normalized token types/scopes for supported constructs
- supported-language registry behavior

### 2. Streaming correctness tests (`packages/clew/src/index.test.ts`)

These verify:

- eager append-only chunk emission
- correction behavior when later input changes earlier tokenization
- stable mode boundary behavior
- final output equality across different chunk boundaries
- JSON correction behavior for late-closing strings
- Markdown final-output stability across streamed chunk boundaries

### 3. Rendering correctness tests (`packages/components/src/syntax-highlight.test.ts`)

These verify:

- unknown-language plain-text fallback
- theme-to-scope mapping
- line preservation and wrapping behavior
- append-only stability through the component
- TypeScript semantic scope rendering
- Python decorator / builtin / property rendering
- Bash rendering cases like heredocs and substitutions
- JSON property/value styling
- Markdown heading, list, code, and link styling

This is the testing model we should keep extending as new languages land.

## Current status

We are well past the planning-only phase.

What exists now:

- `PROGRESS.md` documents the problem, decisions, and current direction
- `packages/clew/` exists as a real workspace package
- `packages/clew/README.md` documents the current architecture and supported languages
- `packages/clew/src/index.ts` exposes the public API
- `packages/clew/src/registry.ts` provides language lookup
- `packages/clew/src/stream.ts` implements the shared streaming / diff / correction layer
- `packages/clew/src/languages/typescript.ts` implements the TypeScript / JavaScript tokenizer path with AST-based semantic overlays
- `packages/clew/src/languages/python.ts` implements the Python tokenizer path
- `packages/clew/src/languages/bash.ts` implements the Bash tokenizer path
- `packages/clew/src/languages/json.ts` implements the JSON tokenizer path
- `packages/clew/src/languages/markdown.ts` implements the Markdown tokenizer path
- `SyntaxHighlight` in `packages/components/src/syntax-highlight.ts` now uses **only `clew`**
- `@cel-tui/components` no longer depends on `lextide`
- `examples/syntax-highlight.ts` is now a component-focused demo built around the real public API
- the example currently cycles real TypeScript, JavaScript, Python, Bash, JSON, and Markdown samples through `SyntaxHighlight`

TypeScript / JavaScript support currently covers a richer semantic slice:

- type aliases, interfaces, classes, enums, and type parameters
- primitive type keywords and type references
- function declarations, methods, and arrow-function bindings
- object properties and property access
- decorators
- parameters
- booleans and null
- bigint literals

Python support currently covers a meaningful first slice:

- decorators
- class and def declarations
- builtin calls
- property access
- booleans
- type-ish names like builtins and class names

Bash support currently covers a meaningful first slice:

- keywords / control flow
- builtins vs command words
- assignments
- single and double quoted strings
- variable expansion
- command substitution
- arithmetic substitution
- heredocs

JSON support currently covers:

- object keys vs string values
- booleans and null
- numbers
- arrays and objects
- punctuation / structural tokens

Markdown support currently covers:

- headings
- list markers
- blockquote markers
- inline code spans
- fenced code blocks
- links
- horizontal rules
- escapes

Verified in this session:

- `bun test`
- `bun run typecheck`
- `bun run check`
- `bun run format`

## Example status

The current `examples/syntax-highlight.ts` is intentionally a **component usage example**.

It does **not** use tokenizer internals directly.
It simply streams append-only content into:

```ts
SyntaxHighlight(content, language, { theme });
```

The demo now includes real samples for:

- TypeScript
- JavaScript
- Python
- Bash
- JSON
- Markdown

It also lets you switch themes and rotate through those samples without reaching
into tokenizer internals.

That makes it a much better verification target for real users of the component.

## What is still missing

Important remaining work:

- broader language coverage beyond TypeScript / JavaScript, Python, Bash, JSON, and Markdown
- stronger corpus / fixture coverage against real language manuals and specs
- deeper Bash coverage for more edge cases
- a clearer long-term decision on which future backends should be tokenizer-only, parser-backed, TextMate-backed, or mixed

## Next session plan

The next session should focus on preparing the language pipeline for more backends without regressing correctness.

Recommended next steps:

1. add richer per-language corpus / fixture suites
   - especially for Bash constructs from the Bash manual
   - and for TypeScript / JavaScript edge cases
2. deepen Bash coverage before adding aliases or adjacent shells
   - Bash is Bash; keep it precise
3. improve normalized scope semantics where the current output is too shallow
4. choose the next language and add it through the same registry pattern
5. keep using `SyntaxHighlight` as the primary end-to-end consumer while `clew` grows

The workflow still looks like this:

- change `clew`
- observe the result through `SyntaxHighlight`
- verify tokenizer tests
- verify rendering tests
- verify the example

That keeps the work grounded in a real consumer and makes regressions obvious early.
