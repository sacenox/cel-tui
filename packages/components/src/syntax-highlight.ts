import { HStack, Text, VStack } from "@cel-tui/core";
import type { Color, ContainerNode, Node, StyleProps } from "@cel-tui/types";
import {
  all,
  createLowlight,
  type Element,
  type ElementContent,
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

/** A best-effort token color override entry. */
export interface SyntaxHighlightThemeTokenColor {
  /** Target lextide / highlight.js classes, with or without the `hljs-` prefix. */
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
   * lextide / highlight.js classes emitted by this component.
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
  theme: ResolvedSyntaxHighlightTheme;
}

type HighlightElementNode = Element;
type HighlightNode = ElementContent;

const rgbCache = new Map<string, readonly [number, number, number]>();
const colorSlotCache = new Map<string, Color>();
const statesByKey = new Map<string, SyntaxHighlightState[]>();

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

type ClassStyleRecord = Readonly<Record<string, ResolvedClassStyle>>;

const DEFAULT_CLASS_STYLES: ClassStyleRecord = {
  addition: { style: { fgColor: "color02" } },
  attr: { style: { fgColor: "color06" } },
  attribute: { style: { fgColor: "color06" } },
  bullet: { style: { fgColor: "color03" } },
  built_in: { style: { fgColor: "color06" } },
  class_: { style: { fgColor: "color06" } },
  code: { style: { fgColor: "color02" } },
  comment: { style: { fgColor: "color08", italic: true } },
  deletion: { style: { fgColor: "color01" } },
  doctag: { style: { fgColor: "color08", italic: true } },
  emphasis: { style: { italic: true } },
  escape: { style: { fgColor: "color03" } },
  function_: { style: { fgColor: "color04" } },
  inherited__: { style: { fgColor: "color06" } },
  keyword: { style: { fgColor: "color05" } },
  link: { style: { fgColor: "color04", underline: true } },
  literal: { style: { fgColor: "color03" } },
  meta: { style: { fgColor: "color09", bold: true } },
  name: { style: { fgColor: "color01" } },
  number: { style: { fgColor: "color03" } },
  operator: { style: { fgColor: "color05" } },
  params: { style: { fgColor: "color11" } },
  property: { style: { fgColor: "color06" } },
  quote: { style: { fgColor: "color08", italic: true } },
  regexp: { style: { fgColor: "color01" } },
  section: { style: { fgColor: "color09", bold: true } },
  "selector-attr": { style: { fgColor: "color06" } },
  "selector-class": { style: { fgColor: "color06" } },
  "selector-id": { style: { fgColor: "color06" } },
  "selector-pseudo": { style: { fgColor: "color05" } },
  "selector-tag": { style: { fgColor: "color01" } },
  string: { style: { fgColor: "color02" } },
  strong: { style: { bold: true } },
  subst: { resetToBase: true, style: {} },
  symbol: { style: { fgColor: "color03" } },
  tag: { style: { fgColor: "color01" } },
  title: { style: { fgColor: "color04" } },
  type: { style: { fgColor: "color06" } },
  variable: { style: {} },
};

const DARK_PLUS_CLASS_STYLE_OVERRIDES: Readonly<Record<string, StyleProps>> = {
  code: { fgColor: "color09" },
  comment: { fgColor: "color08", italic: true },
  function_: { fgColor: "color11" },
  keyword: { fgColor: "color12" },
  meta: { fgColor: "color08" },
  name: { fgColor: "color09" },
  number: { fgColor: "color10" },
  property: { fgColor: "color07" },
  regexp: { fgColor: "color09" },
  section: { fgColor: "color08" },
  string: { fgColor: "color09" },
  tag: { fgColor: "color09" },
  title: { fgColor: "color11" },
  type: { fgColor: "color06" },
};

const DEFAULT_RESOLVED_THEME = buildResolvedTheme(DEFAULT_THEME_NAME, {});

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

function normalizeClassName(className: string): string {
  return className.startsWith("hljs-") ? className.slice(5) : className;
}

function cloneClassStyles(
  source: ClassStyleRecord,
): Map<string, ResolvedClassStyle> {
  const classStyles = new Map<string, ResolvedClassStyle>();

  for (const [className, resolved] of Object.entries(source)) {
    classStyles.set(normalizeClassName(className), {
      resetToBase: resolved.resetToBase,
      style: { ...resolved.style },
    });
  }

  return classStyles;
}

function applyClassStyleOverride(
  classStyles: Map<string, ResolvedClassStyle>,
  className: string,
  style: StyleProps,
): void {
  const normalized = normalizeClassName(className);
  const current = classStyles.get(normalized);

  classStyles.set(normalized, {
    resetToBase: current?.resetToBase,
    style: mergeStyles(current?.style ?? {}, style),
  });
}

function applyThemeTokenColors(
  classStyles: Map<string, ResolvedClassStyle>,
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
      applyClassStyleOverride(classStyles, scope, style);
    }
  }
}

function buildResolvedTheme(
  cacheKey: string,
  baseStyle: StyleProps,
  classStyleOverrides?: Readonly<Record<string, StyleProps>>,
): ResolvedSyntaxHighlightTheme {
  const classStyles = cloneClassStyles(DEFAULT_CLASS_STYLES);

  for (const [className, style] of Object.entries(classStyleOverrides ?? {})) {
    applyClassStyleOverride(classStyles, className, style);
  }

  return {
    baseStyle,
    cacheKey,
    classStyles,
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
      DARK_PLUS_CLASS_STYLE_OVERRIDES,
    );
  }

  const serialized = JSON.stringify(theme);
  const cacheHash = hashString(serialized);
  const baseStyle = themeSettingsToStyle({
    background: theme.bg,
    foreground: theme.fg,
  });
  const classStyles = cloneClassStyles(DEFAULT_CLASS_STYLES);

  applyThemeTokenColors(classStyles, theme.tokenColors, baseStyle);

  return {
    baseStyle,
    cacheKey: `custom:${cacheHash}`,
    classStyles,
  };
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
    const state = requiredAt(states, i, "syntax highlight state");
    if (state.lastContent === content) {
      return state;
    }
  }

  return undefined;
}

function createState(
  theme: ResolvedSyntaxHighlightTheme,
): SyntaxHighlightState {
  return {
    children: [],
    lastContent: "",
    lastNode: null,
    theme,
  };
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
    const classStyle = theme.classStyles.get(normalizeClassName(className));
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

  state.children = lowlight.highlight(language, content).children;
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
 * Re-highlights the full snippet whenever the content changes so the final
 * output stays deterministic regardless of how streamed chunks were split.
 * Repeated renders with identical content reuse the cached rendered tree.
 *
 * Unknown languages render as plain text. The default theme is terminal-friendly
 * and maps lextide's emitted highlight.js classes onto cel's ANSI palette slots
 * while leaving base text on terminal defaults.
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
  const state = findState(key, content) ?? createState(theme);
  updateState(state, language, content);
  touchState(key, state);
  return renderHighlightedState(state);
}
