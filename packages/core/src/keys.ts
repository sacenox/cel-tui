/**
 * Key parsing for Kitty-first terminal input with legacy compatibility.
 *
 * The decoder accepts a mixed keyboard stream containing:
 * - **CSI u** (`ESC [ key:alternates ; modifiers:event ; text u`) for the
 *   baseline protocol and every Kitty progressive enhancement
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
 * Modifier bitmask (wire value = bitmask + 1): shift=1, alt=2, ctrl=4,
 * super=8, hyper=16, meta=32, caps-lock=64, num-lock=128.
 *
 * @module
 */

import type { KeyEvent, KeyEventType, KeyModifiers } from "@cel-tui/types";

/** A decoded keyboard event from the terminal input stream. */
export type KeyInput = KeyEvent;

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

/** Kitty private-use functional key names that are not formulaic ranges. */
const FUNCTIONAL_CODEPOINT_NAMES: Record<number, string> = {
  57358: "caps-lock",
  57359: "scroll-lock",
  57360: "num-lock",
  57361: "print-screen",
  57362: "pause",
  57363: "menu",
  57409: "kp-decimal",
  57410: "kp-divide",
  57411: "kp-multiply",
  57412: "kp-subtract",
  57413: "kp-add",
  57414: "kp-enter",
  57415: "kp-equal",
  57416: "kp-separator",
  57417: "kp-left",
  57418: "kp-right",
  57419: "kp-up",
  57420: "kp-down",
  57421: "kp-pageup",
  57422: "kp-pagedown",
  57423: "kp-home",
  57424: "kp-end",
  57425: "kp-insert",
  57426: "kp-delete",
  57427: "kp-begin",
  57428: "media-play",
  57429: "media-pause",
  57430: "media-play-pause",
  57431: "media-reverse",
  57432: "media-stop",
  57433: "media-fast-forward",
  57434: "media-rewind",
  57435: "media-track-next",
  57436: "media-track-previous",
  57437: "media-record",
  57438: "lower-volume",
  57439: "raise-volume",
  57440: "mute-volume",
  57441: "left-shift",
  57442: "left-control",
  57443: "left-alt",
  57444: "left-super",
  57445: "left-hyper",
  57446: "left-meta",
  57447: "right-shift",
  57448: "right-control",
  57449: "right-alt",
  57450: "right-super",
  57451: "right-hyper",
  57452: "right-meta",
  57453: "iso-level3-shift",
  57454: "iso-level5-shift",
};

/** Named key lookup from CSI letter suffix (arrows, Home, End). */
const LETTER_NAMES: Record<string, string> = {
  A: "up",
  B: "down",
  C: "right",
  D: "left",
  H: "home",
  F: "end",
  P: "f1",
  Q: "f2",
  S: "f4",
};

/** Named key lookup from CSI tilde number (Delete, PageUp/Down, F-keys). */
const TILDE_NAMES: Record<number, string> = {
  2: "insert",
  3: "delete",
  5: "pageup",
  6: "pagedown",
  7: "home",
  8: "end",
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
 * With Kitty's baseline disambiguation flag, unmodified special keys that
 * have well-known legacy encodings retain those encodings. Only modified
 * variants (e.g., Shift+Tab, Ctrl+Enter) get the CSI-u treatment unless
 * all-key reporting is requested. These mappings handle the legacy bytes.
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

const EDITING_KEYS = new Set([
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

// --- Modifier decoding ---

const NO_MODIFIERS: KeyModifiers = Object.freeze({
  shift: false,
  alt: false,
  ctrl: false,
  super: false,
  hyper: false,
  meta: false,
  capsLock: false,
  numLock: false,
});

/** Decode Kitty's `1 + bitmask` modifier parameter. */
function decodeModifiers(param: number): KeyModifiers {
  const bits = Math.max(0, param - 1);
  if (bits === 0) return NO_MODIFIERS;
  return {
    shift: (bits & 1) !== 0,
    alt: (bits & 2) !== 0,
    ctrl: (bits & 4) !== 0,
    super: (bits & 8) !== 0,
    hyper: (bits & 16) !== 0,
    meta: (bits & 32) !== 0,
    capsLock: (bits & 64) !== 0,
    numLock: (bits & 128) !== 0,
  };
}

function modifierPrefix(modifiers: KeyModifiers): string {
  const parts: string[] = [];
  if (modifiers.ctrl) parts.push("ctrl");
  if (modifiers.alt) parts.push("alt");
  if (modifiers.shift) parts.push("shift");
  if (modifiers.super) parts.push("super");
  if (modifiers.hyper) parts.push("hyper");
  if (modifiers.meta) parts.push("meta");
  return parts.length > 0 ? `${parts.join("+")}+` : "";
}

/** Build a key string from a modifier prefix and base key name. */
function withModifiers(modifiers: KeyModifiers, base: string): string {
  return modifierPrefix(modifiers) + base;
}

// --- CSI sequence parsing ---

/** Match CSI letter format: ESC [ <default> ; <modifiers> <letter> */
const CSI_LETTER_RE = /^(?:1;(\d+)(?::([123]))?)?([A-HPSQ])$/;

/** Match CSI tilde format: ESC [ <number> ; <modifiers> ~ */
const CSI_TILDE_RE = /^(\d+)(?:;(\d+)(?::([123]))?)?~$/;

function parseDecimal(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseCodePoint(value: string | undefined): number | null {
  const parsed = parseDecimal(value);
  return parsed !== null &&
    parsed >= 0 &&
    parsed <= 0x10ffff &&
    !(parsed >= 0xd800 && parsed <= 0xdfff)
    ? parsed
    : null;
}

function parseEventType(value: string | undefined): KeyEventType | null {
  switch (value ?? "1") {
    case "1":
      return "press";
    case "2":
      return "repeat";
    case "3":
      return "release";
    default:
      return null;
  }
}

function functionalCodepointName(codePoint: number): string | undefined {
  const direct = FUNCTIONAL_CODEPOINT_NAMES[codePoint];
  if (direct) return direct;
  if (codePoint >= 57376 && codePoint <= 57398) {
    return `f${codePoint - 57363}`;
  }
  if (codePoint >= 57399 && codePoint <= 57408) {
    return `kp${codePoint - 57399}`;
  }
  return undefined;
}

function codePointText(codePoint: number): string | null {
  if (codePoint === 0 || codePoint > 0x10ffff) return null;
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return null;
  }
}

function semanticCodePointName(
  codePoint: number,
  associatedText?: string,
): string {
  const named =
    CODEPOINT_NAMES[codePoint] ?? functionalCodepointName(codePoint);
  if (named) return named;
  if (codePoint === 0 && associatedText) {
    return CHAR_NAMES[associatedText] ?? associatedText.toLowerCase();
  }
  if (codePoint >= 57344 && codePoint <= 63743) {
    return `unknown-codepoint:${codePoint}`;
  }
  const char = codePointText(codePoint);
  return char === null
    ? `unknown-codepoint:${codePoint}`
    : (CHAR_NAMES[char] ?? char.toLowerCase());
}

function alternateKeyName(codePoint: number | null): string | undefined {
  if (codePoint === null) return undefined;
  return (
    CODEPOINT_NAMES[codePoint] ??
    functionalCodepointName(codePoint) ??
    codePointText(codePoint) ??
    undefined
  );
}

function isAssociatedTextCodePoint(codePoint: number): boolean {
  return !(codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f));
}

function parseAssociatedText(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) return undefined;
  const codePoints = value.split(":").map(parseCodePoint);
  if (
    codePoints.some(
      (codePoint) =>
        codePoint === null || !isAssociatedTextCodePoint(codePoint),
    )
  ) {
    return undefined;
  }
  return codePoints
    .map((codePoint) => String.fromCodePoint(codePoint as number))
    .join("");
}

function makeKeyInput(
  key: string,
  options: {
    text?: string;
    eventType?: KeyEventType;
    codePoint?: number;
    shiftedKey?: string;
    baseLayoutKey?: string;
    modifiers?: KeyModifiers;
  } = {},
): KeyInput {
  return {
    key,
    text: options.text,
    eventType: options.eventType ?? "press",
    codePoint: options.codePoint,
    shiftedKey: options.shiftedKey,
    baseLayoutKey: options.baseLayoutKey,
    modifiers: options.modifiers ?? NO_MODIFIERS,
  };
}

function parseCsiUSequence(seq: string): KeyInput | null {
  if (!seq.endsWith("u")) return null;
  const fields = seq.slice(0, -1).split(";");
  if (fields.length > 3) return null;

  const keyParts = (fields[0] ?? "").split(":");
  if (keyParts.length > 3) return null;
  const codePoint = parseCodePoint(keyParts[0]);
  if (codePoint === null) return null;

  const shiftedCodePoint =
    keyParts[1] === undefined || keyParts[1] === ""
      ? null
      : parseCodePoint(keyParts[1]);
  const baseLayoutCodePoint =
    keyParts[2] === undefined || keyParts[2] === ""
      ? null
      : parseCodePoint(keyParts[2]);
  if (
    (keyParts[1] !== undefined &&
      keyParts[1] !== "" &&
      shiftedCodePoint === null) ||
    (keyParts[2] !== undefined &&
      keyParts[2] !== "" &&
      baseLayoutCodePoint === null)
  ) {
    return null;
  }

  const modifierParts = (fields[1] ?? "").split(":");
  if (modifierParts.length > 2) return null;
  const modifierParam =
    modifierParts[0] === "" ? 1 : parseDecimal(modifierParts[0]);
  const eventType = parseEventType(modifierParts[1]);
  // Kitty encodes modifiers as `1 + bitmask`; zero is never a valid wire
  // value. Unknown future high bits are ignored while all currently defined
  // modifier and lock bits remain observable.
  if (modifierParam === null || modifierParam < 1 || eventType === null) {
    return null;
  }

  const modifiers = decodeModifiers(modifierParam);
  const text = parseAssociatedText(fields[2]);
  const base = semanticCodePointName(codePoint, text);
  return makeKeyInput(withModifiers(modifiers, base), {
    text,
    eventType,
    codePoint,
    shiftedKey: alternateKeyName(shiftedCodePoint),
    baseLayoutKey: alternateKeyName(baseLayoutCodePoint),
    modifiers,
  });
}

function parseCsiSequence(seq: string): KeyInput {
  // Legacy Shift+Tab (CSI Z) — sent by tmux and some terminals
  if (seq === "Z") {
    return makeKeyInput("shift+tab", {
      modifiers: { ...NO_MODIFIERS, shift: true },
    });
  }

  const csiU = parseCsiUSequence(seq);
  if (csiU) return csiU;

  // CSI letter format: [1 ; modifiers] <letter>
  let match = CSI_LETTER_RE.exec(seq);
  if (match) {
    const modParam = match[1] ? parseDecimal(match[1]) : 1;
    const eventType = parseEventType(match[2]);
    const letter = match[3];
    if (
      modParam === null ||
      modParam < 1 ||
      eventType === null ||
      letter === undefined
    ) {
      return makeKeyInput(`unknown:${seq}`);
    }
    const name = LETTER_NAMES[letter];
    const modifiers = decodeModifiers(modParam);
    if (name) {
      return makeKeyInput(withModifiers(modifiers, name), {
        eventType,
        modifiers,
      });
    }
  }

  // CSI tilde format: number [; modifiers] ~
  match = CSI_TILDE_RE.exec(seq);
  if (match) {
    const num = parseDecimal(match[1]);
    const modParam = match[2] ? parseDecimal(match[2]) : 1;
    const eventType = parseEventType(match[3]);
    if (
      num === null ||
      modParam === null ||
      modParam < 1 ||
      eventType === null
    ) {
      return makeKeyInput(`unknown:${seq}`);
    }
    const name = TILDE_NAMES[num];
    const modifiers = decodeModifiers(modParam);
    if (name) {
      return makeKeyInput(withModifiers(modifiers, name), {
        eventType,
        modifiers,
      });
    }
  }

  return makeKeyInput(`unknown:${seq}`);
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
  if (legacy) return makeKeyInput(legacy, { codePoint: code });

  const ctrl = decodeLegacyControlByte(code);
  if (ctrl) {
    return makeKeyInput(ctrl, {
      codePoint: code,
      modifiers: { ...NO_MODIFIERS, ctrl: true },
    });
  }

  const named = CHAR_NAMES[data];
  const codePoint = data.codePointAt(0);
  if (named) return makeKeyInput(named, { text: data, codePoint });

  return makeKeyInput(data.toLowerCase(), { text: data, codePoint });
}

function parseAltKeyInput(data: string): KeyInput {
  const base = parseRawKeyInput(data);
  return makeKeyInput(normalizeKey(`alt+${base.key}`), {
    codePoint: base.codePoint,
    modifiers: { ...base.modifiers, alt: true },
  });
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
        events.push(makeKeyInput("escape", { codePoint: 27 }));
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
 * order: `ctrl+alt+shift+super+hyper+meta+<key>`.
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
  if (mods.includes("super")) ordered.push("super");
  if (mods.includes("hyper")) ordered.push("hyper");
  if (mods.includes("meta")) ordered.push("meta");

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
  return EDITING_KEYS.has(key);
}
