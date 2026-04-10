import type { Color, ContainerNode, Node, StyleProps } from "@cel-tui/types";
import { cel, HStack, Text, VStack } from "@cel-tui/core";
import type { BuiltinLanguage, Highlighter, ThemedToken } from "shiki";
import type {
  ShikiStreamTokenizer,
  ShikiStreamTokenizerEnqueueResult,
} from "shiki-stream";

const INTERNAL_THEME = "min-dark";
const MAX_STATES_PER_LANGUAGE = 4;

const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;
const FONT_STYLE_UNDERLINE = 4;

const ANSI_SLOT_HEX: ReadonlyArray<readonly [Color, string]> = [
  ["color00", "#000000"],
  ["color01", "#cd3131"],
  ["color02", "#0dbc79"],
  ["color03", "#e5e510"],
  ["color04", "#2472c8"],
  ["color05", "#bc3fbc"],
  ["color06", "#11a8cd"],
  ["color07", "#e5e5e5"],
  ["color08", "#666666"],
  ["color09", "#f14c4c"],
  ["color10", "#23d18b"],
  ["color11", "#f5f543"],
  ["color12", "#3b8eea"],
  ["color13", "#d670d6"],
  ["color14", "#29b8db"],
  ["color15", "#ffffff"],
];

type SyntaxHighlightStatus = "ready" | "loading" | "error" | "unsupported";

interface SyntaxHighlightRuntime {
  bundledLanguages: Record<string, unknown>;
  createHighlighter: (typeof import("shiki"))["createHighlighter"];
  ShikiStreamTokenizer: (typeof import("shiki-stream"))["ShikiStreamTokenizer"];
}

const rgbCache = new Map<string, readonly [number, number, number]>();
const colorSlotCache = new Map<string, Color>();
const loadedLanguages = new Set<string>();
const loadingLanguages = new Map<string, Promise<void>>();
const languageErrors = new Map<string, Error>();
const statesByLanguage = new Map<string, SyntaxHighlightState[]>();

let runtimePromise: Promise<SyntaxHighlightRuntime> | null = null;
let runtimeInstance: SyntaxHighlightRuntime | null = null;
let runtimeError: Error | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;
let highlighterInstance: Highlighter | null = null;
let highlighterError: Error | null = null;

interface SyntaxHighlightState {
  lastContent: string;
  tokenizer: ShikiStreamTokenizer;
  lastNode: ContainerNode | null;
}

interface HighlightRun {
  content: string;
  style: StyleProps;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function getRuntimePromise(): Promise<SyntaxHighlightRuntime> {
  if (runtimeError) {
    return Promise.reject(runtimeError);
  }

  if (!runtimePromise) {
    runtimePromise = Promise.all([import("shiki"), import("shiki-stream")])
      .then(([shiki, shikiStream]) => {
        runtimeInstance = {
          bundledLanguages: shiki.bundledLanguages as Record<string, unknown>,
          createHighlighter: shiki.createHighlighter,
          ShikiStreamTokenizer: shikiStream.ShikiStreamTokenizer,
        };
        return runtimeInstance;
      })
      .catch((error) => {
        runtimeError = normalizeError(error);
        throw runtimeError;
      })
      .finally(() => {
        cel.render();
      });
  }

  return runtimePromise;
}

function getHighlighterPromise(): Promise<Highlighter> {
  if (highlighterError) {
    return Promise.reject(highlighterError);
  }

  if (!highlighterPromise) {
    highlighterPromise = getRuntimePromise()
      .then((runtime) =>
        runtime.createHighlighter({
          themes: [INTERNAL_THEME],
          langs: [],
        }),
      )
      .then((highlighter) => {
        highlighterInstance = highlighter;
        return highlighter;
      })
      .catch((error) => {
        highlighterError = normalizeError(error);
        throw highlighterError;
      })
      .finally(() => {
        cel.render();
      });
  }

  return highlighterPromise;
}

function hasBundledLanguage(
  language: string,
  runtime: SyntaxHighlightRuntime,
): boolean {
  return Object.hasOwn(runtime.bundledLanguages, language);
}

function ensureLanguageReady(language: string): SyntaxHighlightStatus {
  if (runtimeError || highlighterError || languageErrors.has(language)) {
    return "error";
  }

  if (!runtimeInstance) {
    void getRuntimePromise();
    return "loading";
  }

  if (!hasBundledLanguage(language, runtimeInstance)) {
    return "unsupported";
  }

  if (loadedLanguages.has(language) && highlighterInstance) {
    return "ready";
  }

  if (!loadingLanguages.has(language)) {
    const promise = getHighlighterPromise()
      .then((highlighter) =>
        highlighter.loadLanguage(language as BuiltinLanguage),
      )
      .then(() => {
        loadedLanguages.add(language);
      })
      .catch((error) => {
        languageErrors.set(language, normalizeError(error));
      })
      .finally(() => {
        loadingLanguages.delete(language);
        cel.render();
      });

    loadingLanguages.set(language, promise);
  }

  return "loading";
}

function getStates(language: string): SyntaxHighlightState[] {
  let states = statesByLanguage.get(language);
  if (!states) {
    states = [];
    statesByLanguage.set(language, states);
  }
  return states;
}

function touchState(language: string, state: SyntaxHighlightState): void {
  const states = getStates(language);
  const index = states.indexOf(state);
  if (index !== -1) {
    states.splice(index, 1);
  }
  states.push(state);
  if (states.length > MAX_STATES_PER_LANGUAGE) {
    states.shift();
  }
}

function findState(
  language: string,
  content: string,
): SyntaxHighlightState | undefined {
  const states = getStates(language);

  for (let i = states.length - 1; i >= 0; i--) {
    const state = states[i]!;
    if (state.lastContent === content) {
      return state;
    }
  }

  let best: SyntaxHighlightState | undefined;
  let bestLength = -1;

  for (let i = states.length - 1; i >= 0; i--) {
    const state = states[i]!;
    if (!content.startsWith(state.lastContent)) {
      continue;
    }
    if (state.lastContent.length > bestLength) {
      best = state;
      bestLength = state.lastContent.length;
    }
  }

  return best;
}

function createState(
  language: string,
  highlighter: Highlighter,
  runtime: SyntaxHighlightRuntime,
): SyntaxHighlightState {
  return {
    lastContent: "",
    tokenizer: new runtime.ShikiStreamTokenizer({
      highlighter,
      lang: language,
      theme: INTERNAL_THEME,
    }),
    lastNode: null,
  };
}

function updateState(state: SyntaxHighlightState, content: string): void {
  if (content === state.lastContent) {
    return;
  }

  if (!content.startsWith(state.lastContent)) {
    state.tokenizer.clear();
    state.lastContent = "";
  }

  const appended = content.slice(state.lastContent.length);
  enqueueSync(state.tokenizer, appended);
  state.lastContent = content;
  state.lastNode = null;
}

function enqueueSync(
  tokenizer: ShikiStreamTokenizer,
  chunk: string,
): ShikiStreamTokenizerEnqueueResult {
  const chunkLines = (tokenizer.lastUnstableCodeChunk + chunk).split("\n");

  const stable: ThemedToken[] = [];
  let unstable: ThemedToken[] = [];
  const recall = tokenizer.tokensUnstable.length;

  chunkLines.forEach((line, index) => {
    const isLastLine = index === chunkLines.length - 1;

    const result = tokenizer.options.highlighter.codeToTokens(line, {
      ...tokenizer.options,
      grammarState: tokenizer.lastStableGrammarState,
    });

    const tokens = [...(result.tokens[0] ?? [])];
    if (!isLastLine) {
      tokens.push({ content: "\n", offset: 0 });
    }

    if (!isLastLine) {
      tokenizer.lastStableGrammarState = result.grammarState;
      stable.push(...tokens);
    } else {
      unstable = tokens;
      tokenizer.lastUnstableCodeChunk = line;
    }
  });

  tokenizer.tokensStable.push(...stable);
  tokenizer.tokensUnstable = unstable;

  return {
    recall,
    stable,
    unstable,
  };
}

function parseHex(color: string): readonly [number, number, number] {
  const cached = rgbCache.get(color);
  if (cached) {
    return cached;
  }

  const normalized = normalizeHex(color);
  const rgb: readonly [number, number, number] = [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
  rgbCache.set(color, rgb);
  return rgb;
}

function normalizeHex(color: string): string {
  const lower = color.toLowerCase();
  if (lower.length === 4) {
    return `#${lower[1]}${lower[1]}${lower[2]}${lower[2]}${lower[3]}${lower[3]}`;
  }
  if (lower.length === 9) {
    return lower.slice(0, 7);
  }
  return lower;
}

function colorDistance(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function colorToSlot(color: string | undefined): Color | undefined {
  if (!color) {
    return undefined;
  }

  const normalized = normalizeHex(color);
  const cached = colorSlotCache.get(normalized);
  if (cached) {
    return cached;
  }

  const rgb = parseHex(normalized);
  let best = ANSI_SLOT_HEX[0]![0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [slot, hex] of ANSI_SLOT_HEX) {
    const distance = colorDistance(rgb, parseHex(hex));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = slot;
    }
  }

  colorSlotCache.set(normalized, best);
  return best;
}

function tokenToStyle(token: ThemedToken): StyleProps {
  const fontStyle =
    typeof token.fontStyle === "number" && token.fontStyle > 0
      ? token.fontStyle
      : 0;

  return {
    fgColor: colorToSlot(token.color),
    bgColor: colorToSlot(token.bgColor),
    italic: (fontStyle & FONT_STYLE_ITALIC) !== 0 || undefined,
    bold: (fontStyle & FONT_STYLE_BOLD) !== 0 || undefined,
    underline: (fontStyle & FONT_STYLE_UNDERLINE) !== 0 || undefined,
  };
}

function sameStyle(a: StyleProps, b: StyleProps): boolean {
  return (
    a.fgColor === b.fgColor &&
    a.bgColor === b.bgColor &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline
  );
}

function pushRun(
  line: HighlightRun[],
  content: string,
  style: StyleProps,
): void {
  if (content.length === 0) {
    return;
  }

  const last = line[line.length - 1];
  if (last && sameStyle(last.style, style)) {
    last.content += content;
    return;
  }

  line.push({ content, style });
}

function tokensToLines(tokens: readonly ThemedToken[]): HighlightRun[][] {
  const lines: HighlightRun[][] = [[]];

  for (const token of tokens) {
    const style = tokenToStyle(token);
    const pieces = token.content.split("\n");

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i]!;
      pushRun(lines[lines.length - 1]!, piece, style);
      if (i < pieces.length - 1) {
        lines.push([]);
      }
    }
  }

  return lines;
}

function lineToNode(line: HighlightRun[]): Node {
  if (line.length === 0) {
    return HStack({}, [Text("")]);
  }

  return HStack(
    {},
    line.map((run) => Text(run.content, run.style)),
  );
}

function renderPlainContent(content: string): ContainerNode {
  const lines = content.split("\n");
  return VStack(
    {},
    lines.map((line) => HStack({}, [Text(line)])),
  );
}

function renderHighlightedState(state: SyntaxHighlightState): ContainerNode {
  if (state.lastNode) {
    return state.lastNode;
  }

  const lines = tokensToLines([
    ...state.tokenizer.tokensStable,
    ...state.tokenizer.tokensUnstable,
  ]);

  state.lastNode = VStack({}, lines.map(lineToNode));
  return state.lastNode;
}

/**
 * Render syntax-highlighted code as cel-tui primitives.
 *
 * Uses a long-lived Shiki highlighter internally and keeps a small
 * per-language streaming cache. When the same content grows by appending
 * more text across renders, only the new suffix is tokenized. Non-append
 * edits fall back to a full re-highlight of that snippet.
 *
 * Shiki runtime code loads lazily on first use. Until the requested
 * language is ready, or if loading fails, the component renders plain
 * text and schedules a re-render. Unknown language ids also render plain
 * text.
 *
 * @param content - Source code to render.
 * @param language - Shiki bundled language id or alias.
 * @returns A `VStack` containing one highlighted line per child.
 *
 * @example
 * let code = "const answer = 42";
 *
 * VStack({ overflow: "scroll" }, [
 *   SyntaxHighlight(code, "javascript"),
 * ])
 *
 * @example
 * let code = "";
 * onChunk((chunk) => {
 *   code += chunk;
 *   cel.render();
 * });
 *
 * VStack({ overflow: "scroll" }, [
 *   SyntaxHighlight(code, "typescript"),
 * ])
 */
export function SyntaxHighlight(
  content: string,
  language: string,
): ContainerNode {
  const status = ensureLanguageReady(language);
  if (status !== "ready" || !highlighterInstance || !runtimeInstance) {
    return renderPlainContent(content);
  }

  const state =
    findState(language, content) ??
    createState(language, highlighterInstance, runtimeInstance);
  updateState(state, content);
  touchState(language, state);
  return renderHighlightedState(state);
}
