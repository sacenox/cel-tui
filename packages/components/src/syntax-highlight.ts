import {
  type ClewOutput,
  type ClewStream,
  type ClewToken,
  clew,
  clewSupportsLanguage,
} from "@cel-tui/clew";
import { HStack, Text, VStack, visibleWidth } from "@cel-tui/core";
import type { Color, ContainerNode, Node, StyleProps } from "@cel-tui/types";

const DEFAULT_THEME_NAME = "cel-ansi16";
const MAX_CACHED_COLORS = 256;
const MAX_CACHED_DIRECT_RENDERS = 128;
const MAX_CACHED_THEMES = 64;
const TAB_STOP = 4;
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

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
  readonly scope?: string | readonly string[];
  /** Style settings for the matched scopes. */
  readonly settings: {
    readonly foreground?: string;
    readonly background?: string;
    readonly fontStyle?: string;
  };
}

/**
 * Native cel-tui syntax theme fields.
 *
 * Palette slots are preserved as `color00`–`color15` references. Changing the
 * runtime color theme therefore changes the rendered colors without rebuilding
 * or re-quantizing syntax-highlight nodes.
 */
export interface SyntaxHighlightNativeTheme {
  /** Style inherited by every highlighted token. */
  readonly baseStyle?: Readonly<StyleProps>;
  /** Style overrides keyed by canonical `clew` scope. */
  readonly scopeStyles?: Readonly<Record<string, Readonly<StyleProps>>>;
}

/**
 * Theme registration shape accepted by {@link SyntaxHighlight}.
 * Registrations are immutable values and are cached by object identity and
 * serialized value. Compatible TextMate fields are applied first; native
 * {@link SyntaxHighlightNativeTheme} fields take precedence when both target
 * the same property.
 */
export interface SyntaxHighlightThemeRegistration extends SyntaxHighlightNativeTheme {
  /** Optional theme name. */
  readonly name?: string;
  /** Optional light/dark hint. */
  readonly type?: "light" | "dark";
  /** Optional base foreground color. */
  readonly fg?: string;
  /** Optional base background color. */
  readonly bg?: string;
  /** Token color overrides. */
  readonly tokenColors?: readonly SyntaxHighlightThemeTokenColor[];
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
   * Theme registration objects accept compatible TextMate token colors and/or
   * native cel-tui `baseStyle` and `scopeStyles` fields. Native fields are
   * applied last and preserve palette-slot references directly.
   */
  theme?: SyntaxHighlightTheme;
}

/**
 * A stateful syntax highlighter created by {@link createSyntaxHighlight}.
 *
 * Create one instance per independently updating snippet. Calls with appended
 * content reuse that instance's `clew` stream without sharing parser state
 * with any other snippet.
 */
export interface SyntaxHighlightInstance {
  /** Render the instance's current source. */
  (
    content: string,
    language: string,
    props?: SyntaxHighlightProps,
  ): ContainerNode;
  /**
   * Release the cached parser and rendered node.
   * A later call starts a fresh stream, so the instance remains reusable.
   */
  dispose(): void;
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
  language: string;
  lastContent: string;
  lastNode: ContainerNode | null;
  output: ClewOutput;
  stream: ClewStream;
  theme: ResolvedSyntaxHighlightTheme;
}

const rgbCache = new Map<string, readonly [number, number, number]>();
const colorSlotCache = new Map<string, Color>();
const customThemeIdentityCache = new WeakMap<
  SyntaxHighlightThemeRegistration,
  ResolvedSyntaxHighlightTheme
>();
const customThemeCache = new Map<string, ResolvedSyntaxHighlightTheme>();
const directRenderCache = new Map<string, ContainerNode>();

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
const DARK_PLUS_RESOLVED_THEME = buildResolvedTheme(
  "preset:dark-plus",
  { fgColor: "color07" },
  DARK_PLUS_SCOPE_STYLE_OVERRIDES,
);

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

function readLru<K, V>(map: Map<K, V>, key: K): V | undefined {
  const value = map.get(key);
  if (value === undefined) {
    return undefined;
  }

  map.delete(key);
  map.set(key, value);
  return value;
}

function writeLru<K, V>(
  map: Map<K, V>,
  key: K,
  value: V,
  maxEntries: number,
): void {
  map.delete(key);
  map.set(key, value);

  while (map.size > maxEntries) {
    const oldest = map.keys().next();
    if (oldest.done) {
      return;
    }
    map.delete(oldest.value);
  }
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
  const cached = readLru(rgbCache, color);
  if (cached) {
    return cached;
  }

  const normalized = normalizeHex(color);
  const rgb: readonly [number, number, number] = [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
  writeLru(rgbCache, color, rgb, MAX_CACHED_COLORS);
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
  const cached = readLru(colorSlotCache, normalized);
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

  writeLru(colorSlotCache, normalized, best, MAX_CACHED_COLORS);
  return best;
}

function mergeStyles(
  base: Readonly<StyleProps>,
  overrides: Readonly<StyleProps>,
): StyleProps {
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
  style: Readonly<StyleProps>,
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
  scopeStyleOverrides?: Readonly<Record<string, Readonly<StyleProps>>>,
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

    return DARK_PLUS_RESOLVED_THEME;
  }

  const identityCached = customThemeIdentityCache.get(theme);
  if (identityCached) {
    return identityCached;
  }

  const serialized = JSON.stringify(theme);
  const cached = readLru(customThemeCache, serialized);
  if (cached) {
    customThemeIdentityCache.set(theme, cached);
    return cached;
  }

  const baseStyle = themeSettingsToStyle({
    background: theme.bg,
    foreground: theme.fg,
  });
  const scopeStyles = cloneScopeStyles(DEFAULT_SCOPE_STYLES);

  applyThemeTokenColors(scopeStyles, theme.tokenColors, baseStyle);

  Object.assign(baseStyle, mergeStyles(baseStyle, theme.baseStyle ?? {}));
  for (const [scope, style] of Object.entries(theme.scopeStyles ?? {})) {
    applyScopeStyleOverride(scopeStyles, scope, style);
  }

  const resolved = {
    baseStyle,
    cacheKey: `custom:${serialized}`,
    scopeStyles,
  };
  writeLru(customThemeCache, serialized, resolved, MAX_CACHED_THEMES);
  customThemeIdentityCache.set(theme, resolved);
  return resolved;
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

function tabWidthAtColumn(column: number): number {
  return TAB_STOP - (column % TAB_STOP);
}

// Tabs need to be expanded before splitting a line into separate Text nodes,
// otherwise each HStack child would measure tab width from column zero.
function expandTabs(
  text: string,
  startColumn: number,
): { text: string; endColumn: number } {
  if (!text.includes("\t")) {
    return { text, endColumn: startColumn + visibleWidth(text) };
  }

  let expanded = "";
  let column = startColumn;

  for (const { segment } of segmenter.segment(text)) {
    if (segment === "\t") {
      const spaces = tabWidthAtColumn(column);
      expanded += " ".repeat(spaces);
      column += spaces;
      continue;
    }

    expanded += segment;
    column += visibleWidth(segment);
  }

  return { text: expanded, endColumn: column };
}

function runToNodes(
  run: HighlightRun,
  startColumn: number,
): { nodes: Node[]; endColumn: number } {
  const pieces = run.content.match(/\S+|\s+/g);
  if (!pieces) {
    return { nodes: [], endColumn: startColumn };
  }

  const nodes: Node[] = [];
  let column = startColumn;

  for (const piece of pieces) {
    const expanded = expandTabs(piece, column);
    if (expanded.text.length > 0) {
      nodes.push(Text(expanded.text, run.style));
    }
    column = expanded.endColumn;
  }

  return { nodes, endColumn: column };
}

function lineToNode(line: HighlightRun[]): Node {
  const children: Node[] = [];
  let column = 0;

  for (const run of line) {
    const result = runToNodes(run, column);
    children.push(...result.nodes);
    column = result.endColumn;
  }

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
    language,
    lastContent: "",
    lastNode: null,
    output: stream.snapshot(),
    stream,
    theme,
  };
}

function updateState(state: ClewSyntaxHighlightState, content: string): void {
  if (content === state.lastContent) {
    return;
  }

  if (content.startsWith(state.lastContent)) {
    const appended = content.slice(state.lastContent.length);
    if (appended.length > 0) {
      state.stream.write(appended);
    }
  } else {
    state.stream = clew("", { lang: state.language, stability: "eager" });
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

function directRenderKey(
  content: string,
  language: string,
  theme: ResolvedSyntaxHighlightTheme,
): string {
  // Length prefixes make the concatenation unambiguous even when source text
  // contains NULs or other separator-like characters.
  return `${language.length}:${language}${theme.cacheKey.length}:${theme.cacheKey}${content}`;
}

function renderDirect(
  content: string,
  language: string,
  theme: ResolvedSyntaxHighlightTheme,
): ContainerNode {
  const key = directRenderKey(content, language, theme);
  const cached = readLru(directRenderCache, key);
  if (cached) {
    return cached;
  }

  const state = createState(theme, language);
  updateState(state, content);
  const node = renderHighlightedState(state);
  writeLru(directRenderCache, key, node, MAX_CACHED_DIRECT_RENDERS);
  return node;
}

/**
 * Create an independently stateful syntax highlighter.
 *
 * Use one instance per snippet whose source grows over time. The instance owns
 * exactly one parser stream, so snippets cannot evict or accidentally reuse
 * one another's state. Dropping the callable releases it to garbage collection;
 * call {@link SyntaxHighlightInstance.dispose | dispose} to release it eagerly.
 *
 * @returns A callable highlighter with an explicit disposal method.
 *
 * @example
 * ```ts
 * const highlightLog = createSyntaxHighlight();
 *
 * cel.viewport(() =>
 *   VStack({}, [highlightLog(streamedSource, "typescript")]),
 * );
 *
 * // When the snippet is permanently removed:
 * highlightLog.dispose();
 * ```
 */
export function createSyntaxHighlight(): SyntaxHighlightInstance {
  let state: ClewSyntaxHighlightState | undefined;

  function render(
    content: string,
    language: string,
    props?: SyntaxHighlightProps,
  ): ContainerNode {
    if (!clewSupportsLanguage(language)) {
      state = undefined;
      return renderPlainContent(content);
    }

    const theme = resolveTheme(props?.theme);
    if (
      !state ||
      state.language !== language ||
      state.theme.cacheKey !== theme.cacheKey
    ) {
      state = createState(theme, language);
    }

    updateState(state, content);
    return renderHighlightedState(state);
  }

  render.dispose = () => {
    state = undefined;
  };

  return render as SyntaxHighlightInstance;
}

/**
 * Render syntax-highlighted code as cel-tui primitives.
 *
 * The component is synchronous and caches exact direct-call renders. Use
 * {@link createSyntaxHighlight} when a snippet grows over time: the returned
 * callable owns an isolated `clew` stream and reuses it for appended content.
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
  return renderDirect(content, language, theme);
}
