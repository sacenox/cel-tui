/**
 * Key parsing for the Kitty keyboard protocol (level 1 — disambiguate).
 *
 * At level 1, the terminal sends:
 * - **CSI u** (`ESC [ codepoint ; modifiers u`) for modified special keys
 *   and modifier combos (Ctrl+letter, Alt+letter, Shift+Tab, Ctrl+Enter, etc.)
 * - **CSI letter** (`ESC [ A/B/C/D/H/F` or `ESC [ 1 ; modifiers letter`) for
 *   arrow keys and Home/End
 * - **CSI tilde** (`ESC [ number ~` or `ESC [ number ; modifiers ~`) for
 *   Delete, PageUp, PageDown, and function keys
 * - **Legacy bytes** for unmodified special keys (Tab=0x09, Enter=0x0D,
 *   Escape=0x1B, Backspace=0x7F) — these retain their traditional encoding
 * - **Raw bytes** for unmodified printable characters
 *
 * Modifier bitmask (wire value = bitmask + 1):
 * shift=1, alt=2, ctrl=4 → e.g., ctrl = bitmask 4, wire param = 5
 *
 * @module
 */

// --- Codepoint → named key mappings ---

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
 * Legacy byte → named key mapping for unmodified special keys.
 *
 * At Kitty level 1, unmodified special keys that have well-known legacy
 * encodings retain those encodings. Only modified variants (e.g., Shift+Tab,
 * Ctrl+Enter) get the CSI u treatment. These mappings handle the legacy
 * bytes that arrive for the unmodified case.
 */
const LEGACY_BYTE_NAMES: Record<number, string> = {
  9: "tab", // \t — also Ctrl+I in legacy, but at level 1 Ctrl+I → CSI u
  13: "enter", // \r — also Ctrl+M in legacy, but at level 1 Ctrl+M → CSI u
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
  return parts.length > 0 ? parts.join("+") + "+" : "";
}

/**
 * Build a key string from a modifier prefix and base key name.
 */
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

function parseCsiSequence(seq: string): string {
  // Legacy Shift+Tab (CSI Z) — sent by tmux and some terminals
  if (seq === "Z") return "shift+tab";

  // CSI u format: codepoint [; modifiers] u
  let match = CSI_U_RE.exec(seq);
  if (match) {
    const codepoint = parseInt(match[1]!, 10);
    const modParam = match[2] ? parseInt(match[2], 10) : 0;

    // Check named keys first
    const name = CODEPOINT_NAMES[codepoint];
    if (name) return withModifiers(modParam, name);

    // Printable character — convert codepoint to char, lowercase
    const char = String.fromCodePoint(codepoint).toLowerCase();
    return withModifiers(modParam, char);
  }

  // CSI letter format: [1 ; modifiers] <letter>
  match = CSI_LETTER_RE.exec(seq);
  if (match) {
    const modParam = match[1] ? parseInt(match[1], 10) : 0;
    const letter = match[2]!;
    const name = LETTER_NAMES[letter];
    if (name) return withModifiers(modParam, name);
  }

  // CSI tilde format: number [; modifiers] ~
  match = CSI_TILDE_RE.exec(seq);
  if (match) {
    const num = parseInt(match[1]!, 10);
    const modParam = match[2] ? parseInt(match[2], 10) : 0;
    const name = TILDE_NAMES[num];
    if (name) return withModifiers(modParam, name);
  }

  return `unknown:${seq}`;
}

// --- Public API ---

/**
 * Parse raw terminal input data into a normalized key string.
 *
 * Handles the Kitty keyboard protocol level 1 (disambiguate) encoding:
 * - CSI u sequences for special keys and modifier combos
 * - CSI letter sequences for arrow keys and Home/End (with optional modifiers)
 * - CSI tilde sequences for Delete, PageUp/Down, and function keys
 * - Raw printable characters (unmodified, arrive as raw bytes at level 1)
 *
 * @param data - Raw terminal input string.
 * @returns Normalized key string (e.g., `"ctrl+s"`, `"escape"`, `"alt+up"`).
 */
export function parseKey(data: string): string {
  // CSI sequences: ESC [ ...
  if (data.startsWith("\x1b[")) {
    return parseCsiSequence(data.slice(2));
  }

  // Single-character input
  if (data.length === 1) {
    const code = data.charCodeAt(0);

    // Legacy bytes for unmodified special keys (Kitty level 1 retains these)
    const legacy = LEGACY_BYTE_NAMES[code];
    if (legacy) return legacy;

    // Named printable characters
    const named = CHAR_NAMES[data];
    if (named) return named;

    // Printable characters — return lowercase
    return data.toLowerCase();
  }

  // Multi-byte UTF-8 (e.g., emoji, CJK) — return as-is lowercase
  if (data.length > 1) {
    return data.toLowerCase();
  }

  return `unknown:${data}`;
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

  const base = parts[parts.length - 1]!;
  const mods = parts.slice(0, -1);

  // Canonical order: ctrl, alt, shift
  const ordered: string[] = [];
  if (mods.includes("ctrl")) ordered.push("ctrl");
  if (mods.includes("alt")) ordered.push("alt");
  if (mods.includes("shift")) ordered.push("shift");

  return [...ordered, base].join("+");
}

/**
 * Check if a parsed key is a text-editing key that TextInput should consume.
 * Modifier combos (ctrl+s, alt+x) are NOT editing keys and should bubble.
 */
export function isEditingKey(key: string): boolean {
  // Single printable characters
  if (key.length === 1) return true;

  // Navigation and editing keys consumed by TextInput
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
  ]);

  return editingKeys.has(key);
}
