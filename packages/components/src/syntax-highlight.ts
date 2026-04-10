import type { Color, ContainerNode, Node, StyleProps } from "@cel-tui/types";
import { cel, HStack, Text, VStack } from "@cel-tui/core";
import type {
  BuiltinLanguage,
  BuiltinTheme,
  Highlighter,
  ThemeRegistration,
  ThemedToken,
} from "shiki";
import type {
  ShikiStreamTokenizer,
  ShikiStreamTokenizerEnqueueResult,
} from "shiki-stream";

const DEFAULT_THEME_NAME = "cel-ansi16";
const MAX_STATES_PER_KEY = 4;

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
const ANSI_SLOT_HEX_BY_COLOR = new Map<Color, string>(ANSI_SLOT_HEX);

export type SyntaxHighlightTheme = BuiltinTheme | ThemeRegistration;

/** Props for the {@link SyntaxHighlight} component. */
export interface SyntaxHighlightProps {
  /**
   * Optional Shiki theme override.
   *
   * Pass either a bundled Shiki theme name (for example `"dark-plus"`)
   * or a custom Shiki theme registration object.
   */
  theme?: SyntaxHighlightTheme;
}

type SyntaxHighlightStatus = "ready" | "loading" | "error" | "unsupported";

interface SyntaxHighlightRuntime {
  bundledLanguages: Record<string, unknown>;
  createHighlighter: (typeof import("shiki"))["createHighlighter"];
  ShikiStreamTokenizer: (typeof import("shiki-stream"))["ShikiStreamTokenizer"];
}

interface ResolvedSyntaxHighlightTheme {
  cacheKey: string;
  loadableTheme: SyntaxHighlightTheme;
  themeName: string;
  defaultFg?: string;
  defaultBg?: string;
  useTerminalDefaults: boolean;
}

const DEFAULT_THEME: ThemeRegistration = {
  name: DEFAULT_THEME_NAME,
  displayName: "cel ANSI 16",
  type: "dark",
  fg: ansiHex("color07"),
  bg: ansiHex("color00"),
  colors: {
    foreground: ansiHex("color07"),
    "editor.foreground": ansiHex("color07"),
    "editor.background": ansiHex("color00"),
    "terminal.ansiBlack": ansiHex("color00"),
    "terminal.ansiRed": ansiHex("color01"),
    "terminal.ansiGreen": ansiHex("color02"),
    "terminal.ansiYellow": ansiHex("color03"),
    "terminal.ansiBlue": ansiHex("color04"),
    "terminal.ansiMagenta": ansiHex("color05"),
    "terminal.ansiCyan": ansiHex("color06"),
    "terminal.ansiWhite": ansiHex("color07"),
    "terminal.ansiBrightBlack": ansiHex("color08"),
    "terminal.ansiBrightRed": ansiHex("color09"),
    "terminal.ansiBrightGreen": ansiHex("color10"),
    "terminal.ansiBrightYellow": ansiHex("color11"),
    "terminal.ansiBrightBlue": ansiHex("color12"),
    "terminal.ansiBrightMagenta": ansiHex("color13"),
    "terminal.ansiBrightCyan": ansiHex("color14"),
    "terminal.ansiBrightWhite": ansiHex("color15"),
  },
  tokenColors: [
    { settings: { foreground: ansiHex("color07") } },
    {
      scope: ["comment", "string.quoted.docstring.multi"],
      settings: { foreground: ansiHex("color08"), fontStyle: "italic" },
    },
    {
      scope: ["string", "markup.inline"],
      settings: { foreground: ansiHex("color02") },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.character",
        "constant.other.placeholder",
      ],
      settings: { foreground: ansiHex("color03") },
    },
    {
      scope: ["keyword", "storage", "entity.name.operator"],
      settings: { foreground: ansiHex("color05") },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: { foreground: ansiHex("color04") },
    },
    {
      scope: [
        "entity.name.type",
        "support.type",
        "support.class",
        "entity.other.inherited-class",
      ],
      settings: { foreground: ansiHex("color06") },
    },
    {
      scope: ["variable.parameter"],
      settings: { foreground: ansiHex("color11") },
    },
    {
      scope: [
        "entity.other.attribute-name",
        "meta.object-literal.key",
        "meta.property-name",
        "support.type.property-name",
      ],
      settings: { foreground: ansiHex("color06") },
    },
    {
      scope: ["entity.name.tag", "string.regexp", "invalid"],
      settings: { foreground: ansiHex("color01") },
    },
    {
      scope: ["markup.bold", "strong", "markup.heading"],
      settings: { fontStyle: "bold", foreground: ansiHex("color09") },
    },
    {
      scope: ["markup.italic", "emphasis"],
      settings: { fontStyle: "italic" },
    },
    {
      scope: ["markup.underline", "meta.link.inline.markdown"],
      settings: { foreground: ansiHex("color04"), fontStyle: "underline" },
    },
  ],
};

const DEFAULT_RESOLVED_THEME: ResolvedSyntaxHighlightTheme = {
  cacheKey: DEFAULT_THEME_NAME,
  loadableTheme: DEFAULT_THEME,
  themeName: DEFAULT_THEME_NAME,
  defaultFg: normalizeHex(DEFAULT_THEME.fg ?? ansiHex("color07")),
  defaultBg: normalizeHex(DEFAULT_THEME.bg ?? ansiHex("color00")),
  useTerminalDefaults: true,
};

const rgbCache = new Map<string, readonly [number, number, number]>();
const colorSlotCache = new Map<string, Color>();
const loadedLanguages = new Set<string>();
const loadingLanguages = new Map<string, Promise<void>>();
const languageErrors = new Map<string, Error>();
const loadedThemes = new Set<string>();
const loadingThemes = new Map<string, Promise<void>>();
const themeErrors = new Map<string, Error>();
const statesByKey = new Map<string, SyntaxHighlightState[]>();

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
  theme: ResolvedSyntaxHighlightTheme;
}

interface HighlightRun {
  content: string;
  style: StyleProps;
}

function ansiHex(color: Color): string {
  const hex = ANSI_SLOT_HEX_BY_COLOR.get(color);
  if (!hex) {
    throw new Error(`Unknown ANSI slot: ${color}`);
  }
  return hex;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  }
  return (hash >>> 0).toString(36);
}

function resolveTheme(
  theme?: SyntaxHighlightTheme,
): ResolvedSyntaxHighlightTheme {
  if (!theme) {
    return DEFAULT_RESOLVED_THEME;
  }

  if (typeof theme === "string") {
    return {
      cacheKey: `builtin:${theme}`,
      loadableTheme: theme,
      themeName: theme,
      useTerminalDefaults: false,
    };
  }

  const serialized = JSON.stringify(theme);
  const cacheHash = hashString(serialized);
  const themeName =
    typeof theme.name === "string" && theme.name.length > 0
      ? theme.name
      : `cel-syntax-${cacheHash}`;
  const loadableTheme =
    themeName === theme.name ? theme : { ...theme, name: themeName };

  return {
    cacheKey: `custom:${cacheHash}`,
    loadableTheme,
    themeName,
    useTerminalDefaults: false,
  };
}

function stateKey(
  language: string,
  theme: ResolvedSyntaxHighlightTheme,
): string {
  return `${language}\u0000${theme.cacheKey}`;
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
          themes: [DEFAULT_THEME],
          langs: [],
        }),
      )
      .then((highlighter) => {
        highlighterInstance = highlighter;
        loadedThemes.add(DEFAULT_RESOLVED_THEME.cacheKey);
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

function ensureHighlightReady(
  language: string,
  theme: ResolvedSyntaxHighlightTheme,
): SyntaxHighlightStatus {
  if (
    runtimeError ||
    highlighterError ||
    languageErrors.has(language) ||
    themeErrors.has(theme.cacheKey)
  ) {
    return "error";
  }

  if (!runtimeInstance) {
    void getRuntimePromise();
    return "loading";
  }

  if (!hasBundledLanguage(language, runtimeInstance)) {
    return "unsupported";
  }

  if (!highlighterInstance) {
    void getHighlighterPromise();
    return "loading";
  }

  let pending = false;

  if (!loadedThemes.has(theme.cacheKey)) {
    pending = true;

    if (!loadingThemes.has(theme.cacheKey)) {
      const promise = getHighlighterPromise()
        .then((highlighter) => highlighter.loadTheme(theme.loadableTheme))
        .then(() => {
          loadedThemes.add(theme.cacheKey);
        })
        .catch((error) => {
          themeErrors.set(theme.cacheKey, normalizeError(error));
        })
        .finally(() => {
          loadingThemes.delete(theme.cacheKey);
          cel.render();
        });

      loadingThemes.set(theme.cacheKey, promise);
    }
  }

  if (!loadedLanguages.has(language)) {
    pending = true;

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
  }

  return pending ? "loading" : "ready";
}

function getStates(key: string): SyntaxHighlightState[] {
  let states = statesByKey.get(key);
  if (!states) {
    states = [];
    statesByKey.set(key, states);
  }
  return states;
}

function touchState(key: string, state: SyntaxHighlightState): void {
  const states = getStates(key);
  const index = states.indexOf(state);
  if (index !== -1) {
    states.splice(index, 1);
  }
  states.push(state);
  if (states.length > MAX_STATES_PER_KEY) {
    states.shift();
  }
}

function findState(
  key: string,
  content: string,
): SyntaxHighlightState | undefined {
  const states = getStates(key);

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
  theme: ResolvedSyntaxHighlightTheme,
  highlighter: Highlighter,
  runtime: SyntaxHighlightRuntime,
): SyntaxHighlightState {
  return {
    lastContent: "",
    tokenizer: new runtime.ShikiStreamTokenizer({
      highlighter,
      lang: language,
      theme: theme.themeName,
    }),
    lastNode: null,
    theme,
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

function tokenToStyle(
  token: ThemedToken,
  theme: ResolvedSyntaxHighlightTheme,
): StyleProps {
  const fontStyle =
    typeof token.fontStyle === "number" && token.fontStyle > 0
      ? token.fontStyle
      : 0;
  const tokenFg = token.color ? normalizeHex(token.color) : undefined;
  const tokenBg = token.bgColor ? normalizeHex(token.bgColor) : undefined;

  return {
    fgColor:
      theme.useTerminalDefaults && tokenFg === theme.defaultFg
        ? undefined
        : colorToSlot(tokenFg),
    bgColor:
      theme.useTerminalDefaults && tokenBg === theme.defaultBg
        ? undefined
        : colorToSlot(tokenBg),
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

function tokensToLines(
  tokens: readonly ThemedToken[],
  theme: ResolvedSyntaxHighlightTheme,
): HighlightRun[][] {
  const lines: HighlightRun[][] = [[]];

  for (const token of tokens) {
    const style = tokenToStyle(token, theme);
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

function runToNodes(run: HighlightRun): Node[] {
  const pieces = run.content.match(/\S+|\s+/g);
  if (!pieces) {
    return [];
  }

  return pieces.map((piece) => Text(piece, run.style));
}

function lineToNode(line: HighlightRun[]): Node {
  const children = line.flatMap(runToNodes);

  return HStack(
    { flexWrap: "wrap" },
    children.length > 0 ? children : [Text("")],
  );
}

function renderPlainContent(content: string): ContainerNode {
  const lines = content.split("\n");
  return VStack(
    {},
    lines.map((line) =>
      lineToNode(line.length > 0 ? [{ content: line, style: {} }] : []),
    ),
  );
}

function renderHighlightedState(state: SyntaxHighlightState): ContainerNode {
  if (state.lastNode) {
    return state.lastNode;
  }

  const lines = tokensToLines(
    [...state.tokenizer.tokensStable, ...state.tokenizer.tokensUnstable],
    state.theme,
  );

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
 * language and theme are ready, or if loading fails, the component
 * renders plain text and schedules a re-render. Unknown language ids
 * also render plain text.
 *
 * By default, the component uses a terminal-friendly ANSI 16 fallback
 * theme. Base foreground/background colors fall through to the terminal
 * defaults, while syntax scopes map onto the ANSI palette slots used by
 * cel-tui. Highlighted output also word-wraps by default.
 *
 * @param content - Source code to render.
 * @param language - Shiki bundled language id or alias.
 * @param props - Optional theme override.
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
 * SyntaxHighlight(code, "typescript", { theme: "dark-plus" })
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
  props?: SyntaxHighlightProps,
): ContainerNode {
  const theme = resolveTheme(props?.theme);
  const status = ensureHighlightReady(language, theme);
  if (status !== "ready" || !highlighterInstance || !runtimeInstance) {
    return renderPlainContent(content);
  }

  const key = stateKey(language, theme);
  const state =
    findState(key, content) ??
    createState(language, theme, highlighterInstance, runtimeInstance);
  updateState(state, content);
  touchState(key, state);
  return renderHighlightedState(state);
}
