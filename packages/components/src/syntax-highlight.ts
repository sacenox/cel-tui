import {
  type ClewOutput,
  type ClewStream,
  type ClewToken,
  clew,
  clewSupportsLanguage,
} from "@cel-tui/clew";
import { HStack, Text, VStack } from "@cel-tui/core";
import type { Color, ContainerNode, Node, StyleProps } from "@cel-tui/types";

const DEFAULT_THEME_NAME = "cel-ansi16";
const MAX_STATES_PER_KEY = 4;

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

/** A best-effort token color override entry. */
export interface SyntaxHighlightThemeTokenColor {
  /** Target canonical `clew` scopes emitted by this component. */
  scope?: string | readonly string[];
  /** Style settings for the matched scopes. */
  settings: {
    foreground?: string;
    background?: string;
    fontStyle?: string;
  };
}

/** Theme registration shape accepted by {@link SyntaxHighlight}. */
export interface SyntaxHighlightThemeRegistration {
  /** Optional theme name. */
  name?: string;
  /** Optional light/dark hint. */
  type?: "light" | "dark";
  /** Optional base foreground color. */
  fg?: string;
  /** Optional base background color. */
  bg?: string;
  /** Token color overrides. */
  tokenColors?: readonly SyntaxHighlightThemeTokenColor[];
}

/**
 * SyntaxHighlight theme.
 *
 * String presets are intentionally small and stable. Unknown preset names fall
 * back to the default terminal-friendly theme.
 */
export type SyntaxHighlightTheme = string | SyntaxHighlightThemeRegistration;

/** Props for the {@link SyntaxHighlight} component. */
export interface SyntaxHighlightProps {
  /**
   * Optional theme override.
   *
   * Built-in presets currently include `"default"` and `"dark-plus"`.
   * Theme registration objects are applied as best-effort overrides onto the
   * canonical `clew` scopes emitted by this component.
   */
  theme?: SyntaxHighlightTheme;
}

interface HighlightRun {
  content: string;
  style: StyleProps;
}

interface ResolvedScopeStyle {
  style: StyleProps;
}

interface ResolvedSyntaxHighlightTheme {
  baseStyle: StyleProps;
  cacheKey: string;
  scopeStyles: ReadonlyMap<string, ResolvedScopeStyle>;
}

interface ClewSyntaxHighlightState {
  lastContent: string;
  lastNode: ContainerNode | null;
  output: ClewOutput;
  stream: ClewStream;
  theme: ResolvedSyntaxHighlightTheme;
}

const rgbCache = new Map<string, readonly [number, number, number]>();
const colorSlotCache = new Map<string, Color>();
const statesByKey = new Map<string, ClewSyntaxHighlightState[]>();

type ScopeStyleRecord = Readonly<Record<string, ResolvedScopeStyle>>;

const DEFAULT_SCOPE_STYLES: ScopeStyleRecord = {
  builtin: { style: { fgColor: "color06" } },
  command: { style: { fgColor: "color04" } },
  comment: { style: { fgColor: "color08", italic: true } },
  escape: { style: { fgColor: "color03" } },
  function: { style: { fgColor: "color04" } },
  keyword: { style: { fgColor: "color05" } },
  link: { style: { fgColor: "color04", underline: true } },
  meta: { style: { fgColor: "color06" } },
  "markup.code": { style: { fgColor: "color02" } },
  "markup.heading": { style: { fgColor: "color06", bold: true } },
  "markup.list": { style: { fgColor: "color03", bold: true } },
  "markup.quote": { style: { fgColor: "color02", italic: true } },
  number: { style: { fgColor: "color03" } },
  operator: { style: { fgColor: "color05" } },
  property: { style: { fgColor: "color06" } },
  regexp: { style: { fgColor: "color01" } },
  string: { style: { fgColor: "color02" } },
  type: { style: { fgColor: "color06" } },
  variable: { style: {} },
};

const DARK_PLUS_SCOPE_STYLE_OVERRIDES: Readonly<Record<string, StyleProps>> = {
  builtin: { fgColor: "color06" },
  command: { fgColor: "color11" },
  comment: { fgColor: "color08", italic: true },
  function: { fgColor: "color11" },
  keyword: { fgColor: "color12" },
  link: { fgColor: "color14", underline: true },
  meta: { fgColor: "color08" },
  "markup.code": { fgColor: "color09" },
  "markup.heading": { fgColor: "color12", bold: true },
  "markup.list": { fgColor: "color10", bold: true },
  "markup.quote": { fgColor: "color08", italic: true },
  number: { fgColor: "color10" },
  property: { fgColor: "color07" },
  regexp: { fgColor: "color09" },
  string: { fgColor: "color09" },
  type: { fgColor: "color06" },
  variable: { fgColor: "color07" },
};

const DEFAULT_RESOLVED_THEME = buildResolvedTheme(DEFAULT_THEME_NAME, {});

function requiredAt<T>(
  items: readonly T[],
  index: number,
  description: string,
): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Missing ${description} at index ${index}`);
  }
  return item;
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  }
  return (hash >>> 0).toString(36);
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
  let best = requiredAt(ANSI_SLOT_HEX, 0, "ANSI color slot")[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [slot, hex] of ANSI_SLOT_HEX) {
    const distance = colorDistance(rgb, parseHex(hex));
    if (distance < bestDistance) {
      best = slot;
      bestDistance = distance;
    }
  }

  colorSlotCache.set(normalized, best);
  return best;
}

function mergeStyles(base: StyleProps, overrides: StyleProps): StyleProps {
  return {
    fgColor: overrides.fgColor ?? base.fgColor,
    bgColor: overrides.bgColor ?? base.bgColor,
    bold: overrides.bold ?? base.bold,
    italic: overrides.italic ?? base.italic,
    underline: overrides.underline ?? base.underline,
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

function themeSettingsToStyle(settings: {
  background?: string;
  fontStyle?: string;
  foreground?: string;
}): StyleProps {
  const fontStyle = settings.fontStyle?.trim().toLowerCase();
  const fontTokens = fontStyle ? fontStyle.split(/\s+/) : [];

  return {
    fgColor: colorToSlot(settings.foreground),
    bgColor: colorToSlot(settings.background),
    bold: fontTokens.includes("bold") || undefined,
    italic: fontTokens.includes("italic") || undefined,
    underline: fontTokens.includes("underline") || undefined,
  };
}

function cloneScopeStyles(
  source: ScopeStyleRecord,
): Map<string, ResolvedScopeStyle> {
  const scopeStyles = new Map<string, ResolvedScopeStyle>();

  for (const [scope, resolved] of Object.entries(source)) {
    scopeStyles.set(scope, {
      style: { ...resolved.style },
    });
  }

  return scopeStyles;
}

function applyScopeStyleOverride(
  scopeStyles: Map<string, ResolvedScopeStyle>,
  scope: string,
  style: StyleProps,
): void {
  const current = scopeStyles.get(scope);

  scopeStyles.set(scope, {
    style: mergeStyles(current?.style ?? {}, style),
  });
}

function applyThemeTokenColors(
  scopeStyles: Map<string, ResolvedScopeStyle>,
  tokenColors: readonly SyntaxHighlightThemeTokenColor[] | undefined,
  baseStyle: StyleProps,
): void {
  for (const tokenColor of tokenColors ?? []) {
    const style = themeSettingsToStyle(tokenColor.settings);
    const scopes = tokenColor.scope
      ? Array.isArray(tokenColor.scope)
        ? tokenColor.scope
        : [tokenColor.scope]
      : [];

    if (scopes.length === 0) {
      Object.assign(baseStyle, mergeStyles(baseStyle, style));
      continue;
    }

    for (const scope of scopes) {
      applyScopeStyleOverride(scopeStyles, scope, style);
    }
  }
}

function buildResolvedTheme(
  cacheKey: string,
  baseStyle: StyleProps,
  scopeStyleOverrides?: Readonly<Record<string, StyleProps>>,
): ResolvedSyntaxHighlightTheme {
  const scopeStyles = cloneScopeStyles(DEFAULT_SCOPE_STYLES);

  for (const [scope, style] of Object.entries(scopeStyleOverrides ?? {})) {
    applyScopeStyleOverride(scopeStyles, scope, style);
  }

  return {
    baseStyle,
    cacheKey,
    scopeStyles,
  };
}

function resolveTheme(
  theme?: SyntaxHighlightTheme,
): ResolvedSyntaxHighlightTheme {
  if (!theme || theme === "default") {
    return DEFAULT_RESOLVED_THEME;
  }

  if (typeof theme === "string") {
    if (theme !== "dark-plus") {
      return DEFAULT_RESOLVED_THEME;
    }

    return buildResolvedTheme(
      "preset:dark-plus",
      { fgColor: "color07" },
      DARK_PLUS_SCOPE_STYLE_OVERRIDES,
    );
  }

  const serialized = JSON.stringify(theme);
  const cacheHash = hashString(serialized);
  const baseStyle = themeSettingsToStyle({
    background: theme.bg,
    foreground: theme.fg,
  });
  const scopeStyles = cloneScopeStyles(DEFAULT_SCOPE_STYLES);

  applyThemeTokenColors(scopeStyles, theme.tokenColors, baseStyle);

  return {
    baseStyle,
    cacheKey: `custom:${cacheHash}`,
    scopeStyles,
  };
}

function stateKey(
  language: string,
  theme: ResolvedSyntaxHighlightTheme,
): string {
  return `${language}\u0000${theme.cacheKey}`;
}

function getStateBucket<T>(map: Map<string, T[]>, key: string): T[] {
  let states = map.get(key);
  if (!states) {
    states = [];
    map.set(key, states);
  }
  return states;
}

function touchCachedState<T>(
  map: Map<string, T[]>,
  key: string,
  state: T,
): void {
  const states = getStateBucket(map, key);
  const index = states.indexOf(state);
  if (index !== -1) {
    states.splice(index, 1);
  }
  states.push(state);

  if (states.length > MAX_STATES_PER_KEY) {
    states.shift();
  }
}

function findClewState(
  key: string,
  content: string,
): ClewSyntaxHighlightState | undefined {
  const states = getStateBucket(statesByKey, key);
  let bestPrefix: ClewSyntaxHighlightState | undefined;

  for (let i = states.length - 1; i >= 0; i--) {
    const state = requiredAt(states, i, "syntax highlight state");
    if (state.lastContent === content) {
      return state;
    }
    if (
      content.startsWith(state.lastContent) &&
      (!bestPrefix || state.lastContent.length > bestPrefix.lastContent.length)
    ) {
      bestPrefix = state;
    }
  }

  return bestPrefix;
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

function resolveTokenStyle(
  token: ClewToken,
  theme: ResolvedSyntaxHighlightTheme,
): StyleProps {
  let style = theme.baseStyle;
  const scopes = token.scopes ?? [token.type];

  for (const scope of scopes) {
    const scopeStyle = theme.scopeStyles.get(scope);
    if (!scopeStyle) {
      continue;
    }
    style = mergeStyles(style, scopeStyle.style);
  }

  return style;
}

function pushText(
  lines: HighlightRun[][],
  content: string,
  style: StyleProps,
): void {
  const pieces = content.split("\n");

  for (let i = 0; i < pieces.length; i++) {
    pushRun(
      requiredAt(lines, lines.length - 1, "highlight line"),
      requiredAt(pieces, i, "text piece"),
      style,
    );
    if (i < pieces.length - 1) {
      lines.push([]);
    }
  }
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

function highlightOutputToLines(
  output: ClewOutput,
  theme: ResolvedSyntaxHighlightTheme,
): HighlightRun[][] {
  const lines: HighlightRun[][] = [[]];

  for (const token of output.tokens) {
    pushText(lines, token.text, resolveTokenStyle(token, theme));
  }

  return lines;
}

function createState(
  theme: ResolvedSyntaxHighlightTheme,
  language: string,
): ClewSyntaxHighlightState {
  const stream = clew("", { lang: language, stability: "eager" });
  return {
    lastContent: "",
    lastNode: null,
    output: stream.snapshot(),
    stream,
    theme,
  };
}

function updateState(
  state: ClewSyntaxHighlightState,
  language: string,
  content: string,
): void {
  if (content === state.lastContent) {
    return;
  }

  if (content.startsWith(state.lastContent)) {
    const appended = content.slice(state.lastContent.length);
    if (appended.length > 0) {
      state.stream.write(appended);
    }
  } else {
    state.stream = clew("", { lang: language, stability: "eager" });
    if (content.length > 0) {
      state.stream.write(content);
    }
  }

  state.output = state.stream.snapshot();
  state.lastContent = content;
  state.lastNode = null;
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

function renderHighlightedState(
  state: ClewSyntaxHighlightState,
): ContainerNode {
  if (state.lastNode) {
    return state.lastNode;
  }

  const lines = highlightOutputToLines(state.output, state.theme);
  state.lastNode = VStack({}, lines.map(lineToNode));
  return state.lastNode;
}

/**
 * Render syntax-highlighted code as cel-tui primitives.
 *
 * The component is synchronous to call, but append-only updates reuse a cached
 * `clew` stream so final output stays deterministic across chunk boundaries.
 * Non-append edits reset the stream and replay the full snippet.
 *
 * Unknown languages render as plain text. The default theme is terminal-friendly
 * and maps canonical `clew` scopes onto cel's ANSI palette slots while leaving
 * base text on terminal defaults.
 *
 * @param content - Source code to render.
 * @param language - Registered `clew` language id.
 * @param props - Optional theme override.
 * @returns A `VStack` containing one highlighted line per child.
 */
export function SyntaxHighlight(
  content: string,
  language: string,
  props?: SyntaxHighlightProps,
): ContainerNode {
  if (!clewSupportsLanguage(language)) {
    return renderPlainContent(content);
  }

  const theme = resolveTheme(props?.theme);
  const key = stateKey(language, theme);
  const state = findClewState(key, content) ?? createState(theme, language);
  updateState(state, language, content);
  touchCachedState(statesByKey, key, state);
  return renderHighlightedState(state);
}
