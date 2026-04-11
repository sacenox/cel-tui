import type { Color, ContainerNode, Node, StyleProps } from "@cel-tui/types";
import { HStack, Text, VStack } from "@cel-tui/core";
import {
  all,
  createLowlight,
  type Element,
  type ElementContent,
  type HighlightStream,
  type StreamUpdate,
} from "lextide";

const lowlight = createLowlight(all);

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

type TokenCategory =
  | "addition"
  | "comment"
  | "deletion"
  | "emphasis"
  | "function"
  | "keyword"
  | "link"
  | "literal"
  | "meta"
  | "number"
  | "parameter"
  | "property"
  | "regexp"
  | "string"
  | "strong"
  | "tag"
  | "type"
  | "variable";

/** A best-effort token color override entry. */
export interface SyntaxHighlightThemeTokenColor {
  /** Target scopes or categories. */
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
   * lextide token categories used by this component.
   */
  theme?: SyntaxHighlightTheme;
}

interface HighlightRun {
  content: string;
  style: StyleProps;
}

interface ResolvedClassStyle {
  resetToBase?: boolean;
  style: StyleProps;
}

interface ResolvedSyntaxHighlightTheme {
  baseStyle: StyleProps;
  cacheKey: string;
  classStyles: ReadonlyMap<string, ResolvedClassStyle>;
}

interface SyntaxHighlightState {
  children: HighlightNode[];
  lastContent: string;
  lastNode: ContainerNode | null;
  stream: HighlightStream;
  theme: ResolvedSyntaxHighlightTheme;
}

type HighlightElementNode = Element;
type HighlightNode = ElementContent;

const rgbCache = new Map<string, readonly [number, number, number]>();
const colorSlotCache = new Map<string, Color>();
const statesByKey = new Map<string, SyntaxHighlightState[]>();

const DEFAULT_CATEGORY_STYLES: Readonly<Record<TokenCategory, StyleProps>> = {
  addition: { fgColor: "color02" },
  comment: { fgColor: "color08", italic: true },
  deletion: { fgColor: "color01" },
  emphasis: { italic: true },
  function: { fgColor: "color04" },
  keyword: { fgColor: "color05" },
  link: { fgColor: "color04", underline: true },
  literal: { fgColor: "color03" },
  meta: { fgColor: "color09", bold: true },
  number: { fgColor: "color03" },
  parameter: { fgColor: "color11" },
  property: { fgColor: "color06" },
  regexp: { fgColor: "color01" },
  string: { fgColor: "color02" },
  strong: { bold: true },
  tag: { fgColor: "color01" },
  type: { fgColor: "color06" },
  variable: {},
};

const DARK_PLUS_CATEGORY_STYLES: Readonly<
  Partial<Record<TokenCategory, StyleProps>>
> = {
  comment: { fgColor: "color08", italic: true },
  function: { fgColor: "color11" },
  keyword: { fgColor: "color12" },
  meta: { fgColor: "color08" },
  number: { fgColor: "color10" },
  property: { fgColor: "color07" },
  regexp: { fgColor: "color09" },
  string: { fgColor: "color09" },
  tag: { fgColor: "color09" },
  type: { fgColor: "color06" },
};

const CATEGORY_CLASSES: Readonly<Record<TokenCategory, readonly string[]>> = {
  addition: ["addition"],
  comment: ["comment", "doctag", "quote"],
  deletion: ["deletion"],
  emphasis: ["emphasis"],
  function: ["function_", "title"],
  keyword: ["keyword", "operator", "selector-pseudo"],
  link: ["link"],
  literal: ["bullet", "literal", "symbol"],
  meta: ["meta", "section"],
  number: ["number"],
  parameter: ["params"],
  property: [
    "attr",
    "attribute",
    "property",
    "selector-attr",
    "selector-class",
    "selector-id",
  ],
  regexp: ["regexp"],
  string: ["string"],
  strong: ["strong"],
  tag: ["name", "selector-tag", "tag"],
  type: ["built_in", "class_", "type"],
  variable: ["variable"],
};

const CATEGORY_SCOPE_HINTS: Readonly<Record<TokenCategory, readonly string[]>> =
  {
    addition: ["addition", "markup.inserted"],
    comment: ["comment", "quote"],
    deletion: ["deletion", "markup.deleted"],
    emphasis: ["emphasis", "markup.italic"],
    function: [
      "entity.name.function",
      "function",
      "meta.function-call",
      "support.function",
      "title",
    ],
    keyword: ["entity.name.operator", "keyword", "operator", "storage"],
    link: ["link", "meta.link"],
    literal: [
      "bullet",
      "constant.character",
      "constant.language",
      "literal",
      "symbol",
    ],
    meta: ["markup.heading", "meta", "section"],
    number: ["constant.numeric", "number"],
    parameter: ["params", "variable.parameter"],
    property: [
      "attr",
      "attribute",
      "entity.other.attribute-name",
      "meta.object-literal.key",
      "meta.property-name",
      "property",
      "support.type.property-name",
    ],
    regexp: ["regexp", "string.regexp"],
    string: ["markup.inline", "string"],
    strong: ["markup.bold", "markup.heading", "strong"],
    tag: ["entity.name.tag", "name", "selector-tag", "tag"],
    type: [
      "built_in",
      "class",
      "entity.name.type",
      "entity.other.inherited-class",
      "support.class",
      "support.type",
      "type",
    ],
    variable: ["variable"],
  };

const DEFAULT_RESOLVED_THEME = buildResolvedTheme(
  DEFAULT_THEME_NAME,
  {},
  DEFAULT_CATEGORY_STYLES,
);

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
  let best = ANSI_SLOT_HEX[0]![0];
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

function buildResolvedTheme(
  cacheKey: string,
  baseStyle: StyleProps,
  categoryStyles: Readonly<Record<TokenCategory, StyleProps>>,
): ResolvedSyntaxHighlightTheme {
  const classStyles = new Map<string, ResolvedClassStyle>();

  for (const [category, classes] of Object.entries(CATEGORY_CLASSES) as [
    TokenCategory,
    readonly string[],
  ][]) {
    const style = categoryStyles[category];
    for (const className of classes) {
      classStyles.set(className, { style });
    }
  }

  classStyles.set("subst", {
    resetToBase: true,
    style: baseStyle,
  });

  return {
    baseStyle,
    cacheKey,
    classStyles,
  };
}

function scopeMatchesHint(scope: string, hint: string): boolean {
  return scope === hint || scope.startsWith(`${hint}.`);
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
      {
        ...DEFAULT_CATEGORY_STYLES,
        ...DARK_PLUS_CATEGORY_STYLES,
      },
    );
  }

  const serialized = JSON.stringify(theme);
  const cacheHash = hashString(serialized);
  const baseStyle = themeSettingsToStyle({
    background: theme.bg,
    foreground: theme.fg,
  });
  const categoryStyles: Record<TokenCategory, StyleProps> = {
    ...DEFAULT_CATEGORY_STYLES,
  };

  for (const tokenColor of theme.tokenColors ?? []) {
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

    for (const [category, hints] of Object.entries(CATEGORY_SCOPE_HINTS) as [
      TokenCategory,
      readonly string[],
    ][]) {
      if (
        scopes.some((scope) =>
          hints.some((hint) => scopeMatchesHint(scope, hint)),
        )
      ) {
        categoryStyles[category] = mergeStyles(categoryStyles[category], style);
      }
    }
  }

  return buildResolvedTheme(`custom:${cacheHash}`, baseStyle, categoryStyles);
}

function stateKey(
  language: string,
  theme: ResolvedSyntaxHighlightTheme,
): string {
  return `${language}\u0000${theme.cacheKey}`;
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

function createStream(language: string): HighlightStream {
  return lowlight.stream(language, { allowRecalls: true });
}

function createState(
  language: string,
  theme: ResolvedSyntaxHighlightTheme,
): SyntaxHighlightState {
  return {
    children: [],
    lastContent: "",
    lastNode: null,
    stream: createStream(language),
    theme,
  };
}

function applyStreamUpdate(
  children: HighlightNode[],
  update: StreamUpdate,
): void {
  const nextLength = Math.max(0, children.length - update.recall);
  children.length = nextLength;
  children.push(...update.stable, ...update.unstable);
}

function resetState(
  state: SyntaxHighlightState,
  language: string,
  content: string,
): void {
  state.children = [];
  state.stream = createStream(language);

  if (content.length > 0) {
    applyStreamUpdate(state.children, state.stream.write(content));
  }
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

function getClassNames(node: HighlightElementNode): readonly string[] {
  return node.properties.className;
}

function resolveNodeStyle(
  inherited: StyleProps,
  classNames: readonly string[],
  theme: ResolvedSyntaxHighlightTheme,
): StyleProps {
  let style = inherited;

  for (const className of classNames) {
    const normalized = className.startsWith("hljs-")
      ? className.slice(5)
      : className;
    const classStyle = theme.classStyles.get(normalized);
    if (!classStyle) {
      continue;
    }

    style = classStyle.resetToBase
      ? mergeStyles(theme.baseStyle, classStyle.style)
      : mergeStyles(style, classStyle.style);
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
    pushRun(lines[lines.length - 1]!, pieces[i]!, style);
    if (i < pieces.length - 1) {
      lines.push([]);
    }
  }
}

function pushHighlightNode(
  lines: HighlightRun[][],
  node: HighlightNode,
  inheritedStyle: StyleProps,
  theme: ResolvedSyntaxHighlightTheme,
): void {
  if (node.type === "text") {
    pushText(lines, node.value, inheritedStyle);
    return;
  }

  const style = resolveNodeStyle(inheritedStyle, getClassNames(node), theme);
  for (const child of node.children) {
    pushHighlightNode(lines, child, style, theme);
  }
}

function highlightChildrenToLines(
  children: readonly HighlightNode[],
  theme: ResolvedSyntaxHighlightTheme,
): HighlightRun[][] {
  const lines: HighlightRun[][] = [[]];

  for (const child of children) {
    pushHighlightNode(lines, child, theme.baseStyle, theme);
  }

  return lines;
}

function updateState(
  state: SyntaxHighlightState,
  language: string,
  content: string,
): void {
  if (content === state.lastContent) {
    return;
  }

  if (!content.startsWith(state.lastContent)) {
    resetState(state, language, content);
  } else {
    const chunk = content.slice(state.lastContent.length);
    if (chunk.length > 0) {
      applyStreamUpdate(state.children, state.stream.write(chunk));
    }
  }

  state.lastContent = content;
  state.lastNode = null;
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

  const lines = highlightChildrenToLines(state.children, state.theme);
  state.lastNode = VStack({}, lines.map(lineToNode));
  return state.lastNode;
}

/**
 * Render syntax-highlighted code as cel-tui primitives.
 *
 * Uses lextide synchronously at the component boundary while keeping a
 * streaming parser state per language/theme cache entry. Append-only updates
 * apply lextide's recall/stable/unstable deltas, while non-append edits reset
 * the stream and replay the full snippet.
 *
 * Unknown languages render as plain text. The default theme is terminal-friendly
 * and maps lextide token classes onto cel's ANSI palette slots while leaving
 * base text on terminal defaults.
 *
 * @param content - Source code to render.
 * @param language - Registered lextide language id or alias.
 * @param props - Optional theme override.
 * @returns A `VStack` containing one highlighted line per child.
 */
export function SyntaxHighlight(
  content: string,
  language: string,
  props?: SyntaxHighlightProps,
): ContainerNode {
  const theme = resolveTheme(props?.theme);

  if (!lowlight.registered(language)) {
    return renderPlainContent(content);
  }

  const key = stateKey(language, theme);
  const state = findState(key, content) ?? createState(language, theme);
  updateState(state, language, content);
  touchState(key, state);
  return renderHighlightedState(state);
}
