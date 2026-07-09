import { eastAsianWidth } from "get-east-asian-width";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

// --- ANSI escape extraction ---

/**
 * Extract an ANSI escape sequence starting at `pos` in `str`.
 * Handles CSI (ESC [), OSC (ESC ]), and APC (ESC _) sequences.
 * Returns null if no escape sequence starts at `pos`.
 */
export function extractAnsiCode(
  str: string,
  pos: number,
): { code: string; length: number } | null {
  if (pos >= str.length || str[pos] !== "\x1b") return null;

  const next = str[pos + 1];

  // CSI: ESC [ ... <terminal byte>
  if (next === "[") {
    let j = pos + 2;
    while (j < str.length) {
      const char = str[j];
      if (char === undefined) break;
      const code = char.charCodeAt(0);
      if (code >= 0x40 && code <= 0x7e) break;
      j++;
    }
    if (j < str.length)
      return { code: str.substring(pos, j + 1), length: j + 1 - pos };
    return null;
  }

  // OSC: ESC ] ... BEL or ESC ] ... ST
  if (next === "]") {
    let j = pos + 2;
    while (j < str.length) {
      if (str[j] === "\x07")
        return { code: str.substring(pos, j + 1), length: j + 1 - pos };
      if (str[j] === "\x1b" && str[j + 1] === "\\")
        return { code: str.substring(pos, j + 2), length: j + 2 - pos };
      j++;
    }
    return null;
  }

  // APC: ESC _ ... BEL or ESC _ ... ST
  if (next === "_") {
    let j = pos + 2;
    while (j < str.length) {
      if (str[j] === "\x07")
        return { code: str.substring(pos, j + 1), length: j + 1 - pos };
      if (str[j] === "\x1b" && str[j + 1] === "\\")
        return { code: str.substring(pos, j + 2), length: j + 2 - pos };
      j++;
    }
    return null;
  }

  return null;
}

// --- Grapheme width ---

const zeroWidthRegex =
  /^(?:\p{Default_Ignorable_Code_Point}|\p{Control}|\p{Mark}|\p{Surrogate})+$/v;
const leadingNonPrintingRegex =
  /^[\p{Default_Ignorable_Code_Point}\p{Control}\p{Format}\p{Mark}\p{Surrogate}]+/v;
const rgiEmojiRegex = /^\p{RGI_Emoji}$/v;

function couldBeEmoji(segment: string): boolean {
  const cp = segment.codePointAt(0);
  if (cp === undefined) return false;
  return (
    (cp >= 0x1f000 && cp <= 0x1fbff) ||
    (cp >= 0x2300 && cp <= 0x23ff) ||
    (cp >= 0x2600 && cp <= 0x27bf) ||
    (cp >= 0x2b50 && cp <= 0x2b55) ||
    segment.includes("\uFE0F") ||
    segment.length > 2
  );
}

/**
 * Calculate the terminal width of a single grapheme cluster.
 */
function graphemeWidth(segment: string): number {
  if (zeroWidthRegex.test(segment)) return 0;

  if (couldBeEmoji(segment) && rgiEmojiRegex.test(segment)) return 2;

  const base = segment.replace(leadingNonPrintingRegex, "");
  const cp = base.codePointAt(0);
  if (cp === undefined) return 0;

  // Regional indicator symbols
  if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return 2;

  let width = eastAsianWidth(cp);

  if (segment.length > 1) {
    for (const char of segment.slice(1)) {
      const c = char.codePointAt(0);
      if (c !== undefined && c >= 0xff00 && c <= 0xffef) {
        width += eastAsianWidth(c);
      }
    }
  }

  return width;
}

// --- ASCII fast path ---

function isPrintableAscii(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x20 || code > 0x7e) return false;
  }
  return true;
}

// --- Cache ---

const TAB_STOP = 4;
const WIDTH_CACHE_SIZE = 512;
const widthCache = new Map<string, number>();

/** Clear the visible-width cache. Useful for cold-cache benchmarks. */
export function clearVisibleWidthCache(): void {
  widthCache.clear();
}

function tabWidthAtColumn(column: number): number {
  return TAB_STOP - (column % TAB_STOP);
}

function stripAnsi(str: string): string {
  if (!str.includes("\x1b")) {
    return str;
  }

  let stripped = "";
  let i = 0;
  while (i < str.length) {
    const ansi = extractAnsiCode(str, i);
    if (ansi) {
      i += ansi.length;
      continue;
    }
    stripped += str[i];
    i++;
  }

  return stripped;
}

/**
 * Calculate the visible width of a string in terminal columns starting from a
 * specific visual column. This only changes behavior for tab expansion.
 */
export function visibleWidthFromColumn(
  str: string,
  startColumn: number,
): number {
  if (str.length === 0) return 0;

  if (startColumn === 0 && isPrintableAscii(str)) {
    return str.length;
  }

  if (startColumn === 0) {
    const cached = widthCache.get(str);
    if (cached !== undefined) return cached;
  }

  const clean = stripAnsi(str);
  let width = 0;

  for (const { segment } of segmenter.segment(clean)) {
    if (segment === "\t") {
      width += tabWidthAtColumn(startColumn + width);
      continue;
    }
    width += graphemeWidth(segment);
  }

  if (startColumn === 0) {
    if (widthCache.size >= WIDTH_CACHE_SIZE) {
      const firstKey = widthCache.keys().next().value;
      if (firstKey !== undefined) widthCache.delete(firstKey);
    }
    widthCache.set(str, width);
  }

  return width;
}

// --- Public API ---

/**
 * Calculate the visible width of a string in terminal columns.
 *
 * Handles ASCII (fast path), East Asian wide characters, emoji,
 * ANSI escape sequences, zero-width characters, and tab expansion.
 *
 * @param str - The string to measure.
 * @returns Width in terminal columns.
 */
export function visibleWidth(str: string): number {
  return visibleWidthFromColumn(str, 0);
}
