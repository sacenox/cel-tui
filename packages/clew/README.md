# @cel-tui/clew

`clew` is a stream-first syntax tokenization library.

Parsing input is like solving a maze: you only know the right path once you have seen enough of it. That is the core idea behind `clew`.

Instead of pretending tokenization is always final on first sight, `clew` is designed to:

- emit tokens early
- correct earlier output when new input changes the parse
- stay renderer-agnostic
- work well for TUIs, editors, markdown renderers, and streaming output

## Goals

- fast
- correct
- stream-aware
- renderer-agnostic
- Bun-friendly

## API direction

`clew` keeps a single entrypoint:

```ts
clew(content, options) => ClewStream | ClewOutput
```

### Defaults

- `stream` defaults to `true`
- `stability` defaults to `"eager"`

That means `clew` is streaming-first by default.

## Streaming mode

```ts
import { clew } from "@cel-tui/clew";

const stream = clew("", { lang: "ts" });

stream.onChunk((chunk) => {
  console.log("chunk", chunk);
});

stream.onCorrection((correction) => {
  console.log("correction", correction);
});

stream.write("c");
stream.write("o");
stream.write("n");
stream.write("st x = 1");

const final = stream.end();
console.log(final.tokens);
```

### Why corrections exist

Some tokenization decisions are only valid once more input arrives.

For example, a partial token stream may need to be revised once a string closes, a comment continues, or a multi-line construct changes the meaning of earlier text.

Because of that, `clew` uses **range-based corrections** instead of only append-only token events.

A correction says, in effect:

> replace the tokenization for source range `from..to` with these tokens

That keeps the API general enough for:

- per-character streaming
- line streaming
- editor integrations
- TUI renderers
- HTML renderers
- diff tools

## Sync mode

If you already have the full content and do not want streaming behavior, turn it off explicitly:

```ts
import { clew } from "@cel-tui/clew";

const output = clew("const x = 1", {
  lang: "ts",
  stream: false,
});

console.log(output.tokens);
```

## Proposed surface

```ts
const stream = clew(content, {
  lang: "ts",
  stream: true,
  stability: "eager",
});

stream.onChunk((chunk) => {});
stream.onCorrection((correction) => {});
stream.write("more content");
stream.snapshot();
stream.end();
```

```ts
const output = clew(content, {
  lang: "ts",
  stream: false,
});
```

## Current implementation

The current implementation ships a small internal language registry with:

- **TypeScript / JavaScript ids**
  - `typescript`, `ts`, `mts`, `cts`
  - `javascript`, `js`, `mjs`, `cjs`
- **Python**
  - `python`, `py`
- **Bash**
  - `bash`
- **JSON**
  - `json`
- **Markdown**
  - `markdown`
- **Diff / patch**
  - `diff`, `patch`

`clew` emits normalized tokens with canonical scopes like `keyword`, `string`,
`property`, `link`, `markup.heading`, `meta.substitution.command`, and
`string.heredoc`.

## Notes

The stream layer is shared across languages. Each language module only owns its
own tokenization and stable-boundary rules, which is the structure new language
support should follow.
