/**
 * Key parsing for Kitty-first terminal input with legacy compatibility.
 *
 * The decoder accepts a mixed keyboard stream containing:
 * - **CSI u** (`ESC [ codepoint ; modifiers u`) for modified special keys
 *   and modifier combos (Ctrl+letter, Alt+letter, Shift+Tab, Ctrl+Enter, etc.)
 * - **CSI letter** (`ESC [ A/B/C/D/H/F` or `ESC [ 1 ; modifiers letter`) for
 *   arrow keys and Home/End
 * - **CSI tilde** (`ESC [ number ~` or `ESC [ number ; modifiers ~`) for
 *   Delete, PageUp, PageDown, and function keys
 * - **Legacy bytes** for unmodified special keys (Tab=0x09, Enter=0x0D,
 *   Escape=0x1B, Backspace=0x7F)
 * - **Recoverable control bytes** for legacy `ctrl+letter` shortcuts
 * - **ESC-prefixed Alt combinations** such as `ESC x`
 * - **Raw printable text**
 *
 * Modifier bitmask (wire value = bitmask + 1):
 * shift=1, alt=2, ctrl=4 -> e.g., ctrl = bitmask 4, wire param = 5
 *
 * @module
 */

/** A decoded keyboard event from the terminal input stream. */
export interface KeyInput {
  /** Normalized semantic key string (e.g. `"ctrl+s"`, `"enter"`, `"a"`). */
  key: string;
  /** Original insertable text, when this key should insert text. */
  text?: string;
}

// --- Codepoint -> named key mappings ---

/** Named key lookup from Unicode codepoint (for CSI u sequences). */
const CODEPOINT_NAMES: Record<number, string> = {
  27: "escape",
  13: "enter",
  9: "tab",
  127: "backspace",
  32: "space",
  43: "plus",
};

/** Named key lookup from CSI letter suffix (arrows, Home, End). */
const LETTER_NAMES: Record<string, string> = {
  A: "up",
  B: "down",
  C: "right",
  D: "left",
  H: "home",
  F: "end",
};

/** Named key lookup from CSI tilde number (Delete, PageUp/Down, F-keys). */
const TILDE_NAMES: Record<number, string> = {
  3: "delete",
  5: "pageup",
  6: "pagedown",
  11: "f1",
  12: "f2",
  13: "f3",
  14: "f4",
  15: "f5",
  17: "f6",
  18: "f7",
  19: "f8",
  20: "f9",
  21: "f10",
  23: "f11",
  24: "f12",
};

/**
 * Legacy byte -> named key mapping for unmodified special keys.
 *
 * At Kitty level 1, unmodified special keys that have well-known legacy
 * encodings retain those encodings. Only modified variants (e.g., Shift+Tab,
 * Ctrl+Enter) get the CSI u treatment. These mappings handle the legacy
 * bytes that arrive for the unmodified case.
 */
const LEGACY_BYTE_NAMES: Record<number, string> = {
  9: "tab", // \t — also Ctrl+I in legacy, but collapsed to tab here
  13: "enter", // \r — also Ctrl+M in legacy, but collapsed to enter here
  27: "escape", // \x1b — bare ESC byte
  127: "backspace", // \x7f — DEL byte
};

/** Raw printable characters that map to named keys. */
const CHAR_NAMES: Record<string, string> = {
  " ": "space",
  "+": "plus",
};

// --- Modifier decoding ---

/**
 * Decode a Kitty modifier parameter to an ordered modifier prefix string.
 * Canonical order: ctrl+alt+shift. Returns empty string if no modifiers.
 *
 * @param param - The modifier parameter from the CSI sequence (bitmask + 1).
 *   Value 0 or 1 means no modifiers.
 */
function decodeModifiers(param: number): string {
  if (param <= 1) return "";
  const bits = param - 1;
  const parts: string[] = [];
  if (bits & 4) parts.push("ctrl");
  if (bits & 2) parts.push("alt");
  if (bits & 1) parts.push("shift");
  return parts.length > 0 ? `${parts.join("+")}+` : "";
}

/** Build a key string from a modifier prefix and base key name. */
function withModifiers(modParam: number, base: string): string {
  return decodeModifiers(modParam) + base;
}

// --- CSI sequence parsing ---

/** Match CSI u format: ESC [ <codepoint> ; <modifiers> u */
const CSI_U_RE = /^(\d+)(?:;(\d+))?u$/;

/** Match CSI letter format: ESC [ <default> ; <modifiers> <letter> */
const CSI_LETTER_RE = /^(?:1;(\d+))?([A-H])$/;

/** Match CSI tilde format: ESC [ <number> ; <modifiers> ~ */
const CSI_TILDE_RE = /^(\d+)(?:;(\d+))?~$/;

function parseDecimal(value: string | undefined, description: string): number {
  if (value === undefined) {
    throw new Error(`Missing ${description}`);
  }
  return parseInt(value, 10);
}

function parseCsiSequence(seq: string): KeyInput {
  // Legacy Shift+Tab (CSI Z) — sent by tmux and some terminals
  if (seq === "Z") return { key: "shift+tab" };

  // CSI u format: codepoint [; modifiers] u
  let match = CSI_U_RE.exec(seq);
  if (match) {
    const codepoint = parseDecimal(match[1], "CSI-u codepoint");
    const modParam = match[2] ? parseDecimal(match[2], "CSI-u modifier") : 0;

    const name = CODEPOINT_NAMES[codepoint];
    if (name) {
      return { key: withModifiers(modParam, name) };
    }

    const char = String.fromCodePoint(codepoint);
    const key = withModifiers(modParam, char.toLowerCase());
    if (modParam <= 1) {
      return { key, text: char };
    }
    return { key };
  }

  // CSI letter format: [1 ; modifiers] <letter>
  match = CSI_LETTER_RE.exec(seq);
  if (match) {
    const modParam = match[1]
      ? parseDecimal(match[1], "CSI-letter modifier")
      : 0;
    const letter = match[2];
    if (letter === undefined) {
      throw new Error("Missing CSI-letter key");
    }
    const name = LETTER_NAMES[letter];
    if (name) return { key: withModifiers(modParam, name) };
  }

  // CSI tilde format: number [; modifiers] ~
  match = CSI_TILDE_RE.exec(seq);
  if (match) {
    const num = parseDecimal(match[1], "CSI-tilde code");
    const modParam = match[2]
      ? parseDecimal(match[2], "CSI-tilde modifier")
      : 0;
    const name = TILDE_NAMES[num];
    if (name) return { key: withModifiers(modParam, name) };
  }

  return { key: `unknown:${seq}` };
}

function decodeLegacyControlByte(code: number): string | null {
  if (code >= 1 && code <= 26) {
    return `ctrl+${String.fromCharCode(code + 96)}`;
  }
  return null;
}

function parseRawKeyInput(data: string): KeyInput {
  const code = data.charCodeAt(0);

  const legacy = LEGACY_BYTE_NAMES[code];
  if (legacy) return { key: legacy };

  const ctrl = decodeLegacyControlByte(code);
  if (ctrl) return { key: ctrl };

  const named = CHAR_NAMES[data];
  if (named) return { key: named, text: data };

  return { key: data.toLowerCase(), text: data };
}

function parseAltKeyInput(data: string): KeyInput {
  const base = parseRawKeyInput(data);
  return { key: normalizeKey(`alt+${base.key}`) };
}

function readCodePoint(
  data: string,
  index: number,
): { value: string; nextIndex: number } | null {
  if (index >= data.length) return null;
  const codepoint = data.codePointAt(index);
  if (codepoint === undefined) return null;
  const value = String.fromCodePoint(codepoint);
  return { value, nextIndex: index + value.length };
}

function readCsiSequence(
  data: string,
  index: number,
): { value: string; nextIndex: number } | null {
  if (!data.startsWith("\x1b[", index)) return null;

  for (let i = index + 2; i < data.length; i++) {
    const code = data.charCodeAt(i);
    if (code >= 0x40 && code <= 0x7e) {
      return { value: data.slice(index + 2, i + 1), nextIndex: i + 1 };
    }
  }

  return null;
}

/**
 * Decode a raw keyboard data chunk into ordered key events.
 *
 * A single chunk may contain multiple key presses batched together.
 */
export function decodeKeyEvents(data: string): KeyInput[] {
  const events: KeyInput[] = [];
  let index = 0;

  while (index < data.length) {
    const csi = readCsiSequence(data, index);
    if (csi) {
      events.push(parseCsiSequence(csi.value));
      index = csi.nextIndex;
      continue;
    }

    const char = data[index];
    if (char === undefined) {
      break;
    }
    if (char === "\x1b") {
      const next = readCodePoint(data, index + 1);
      if (next && next.value !== "[") {
        events.push(parseAltKeyInput(next.value));
        index = next.nextIndex;
      } else {
        events.push({ key: "escape" });
        index += 1;
      }
      continue;
    }

    const codePoint = readCodePoint(data, index);
    if (!codePoint) break;
    events.push(parseRawKeyInput(codePoint.value));
    index = codePoint.nextIndex;
  }

  return events;
}

// --- Public API ---

/**
 * Parse a single raw key sequence into a normalized key string.
 *
 * This is a convenience wrapper around {@link decodeKeyEvents} for callers that
 * already know the input contains one logical key event.
 *
 * @param data - Raw terminal input string.
 * @returns Normalized key string (e.g., `"ctrl+s"`, `"escape"`, `"alt+up"`).
 */
export function parseKey(data: string): string {
  const events = decodeKeyEvents(data);
  return events[0]?.key ?? `unknown:${data}`;
}

/**
 * Normalize a key string to canonical format.
 *
 * Lowercases everything and reorders modifiers to the canonical
 * order: `ctrl+alt+shift+<key>`.
 *
 * @param key - Key string to normalize.
 * @returns Normalized key string.
 */
export function normalizeKey(key: string): string {
  const parts = key.toLowerCase().split("+");
  if (parts.length <= 1) return key.toLowerCase();

  const base = parts.at(-1);
  if (!base) {
    return key.toLowerCase();
  }
  const mods = parts.slice(0, -1);

  const ordered: string[] = [];
  if (mods.includes("ctrl")) ordered.push("ctrl");
  if (mods.includes("alt")) ordered.push("alt");
  if (mods.includes("shift")) ordered.push("shift");

  return [...ordered, base].join("+");
}

/**
 * Check whether a semantic key represents TextInput editing/navigation.
 *
 * Single-character semantic keys represent insertable text, while named keys
 * like `"enter"` and `"left"` represent editing/navigation actions. Most
 * modifier combos (`ctrl+s`, `alt+x`) are NOT editing keys and should bubble,
 * but TextInput consumes a small set of readline-style shortcuts for cursor
 * movement and word deletion.
 */
export function isEditingKey(key: string): boolean {
  if (key.length === 1) return true;

  const editingKeys = new Set([
    "enter",
    "backspace",
    "delete",
    "tab",
    "up",
    "down",
    "left",
    "right",
    "home",
    "end",
    "space",
    "plus",
    "shift+enter",
    "ctrl+a",
    "ctrl+e",
    "alt+b",
    "alt+f",
    "ctrl+left",
    "ctrl+right",
    "ctrl+w",
    "alt+d",
  ]);

  return editingKeys.has(key);
}
