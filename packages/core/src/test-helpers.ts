/**
 * Test-only utilities for generating Kitty keyboard protocol byte sequences.
 * NOT exported from the package — excluded via package.json `files` field.
 */

import { type Cel, cel as publicCel } from "./cel.js";
import type { CellBuffer } from "./cell-buffer.js";

/** Test-only view of runtime synchronization and buffer inspection hooks. */
export const testCel = publicCel as Cel & {
  _getBuffer(): CellBuffer | null;
  _flush(): Promise<void>;
};

/**
 * Encode a human-readable key string into the byte sequence a Kitty-protocol
 * terminal would send with baseline escape-code disambiguation enabled.
 *
 * With baseline disambiguation only:
 * - Unmodified printable chars → raw byte
 * - Special/ambiguous keys (Escape, Enter, Tab, Backspace) → CSI u format
 * - Modified keys → CSI u (printable/special) or CSI with modifier param (arrows/tilde)
 * - Arrows/Home/End → legacy CSI letter format (modifier param added when modified)
 * - Delete/PageUp/PageDown/F-keys → legacy CSI tilde format (modifier param when modified)
 *
 * Kitty modifier bitmask: shift=1, alt=2, ctrl=4. Wire value = bitmask + 1.
 *
 * @example
 * kittyEncode("a")           // "a"           (raw byte)
 * kittyEncode("ctrl+s")      // "\x1b[115;5u" (CSI u, codepoint 115, modifier 5)
 * kittyEncode("escape")      // "\x1b[27u"    (CSI u, codepoint 27)
 * kittyEncode("ctrl+up")     // "\x1b[1;5A"   (CSI letter with modifier)
 * kittyEncode("shift+delete") // "\x1b[3;2~"  (CSI tilde with modifier)
 */
export function kittyEncode(key: string): string {
  const parts = key.toLowerCase().split("+");
  const base = parts.at(-1);
  if (!base) {
    throw new Error("kittyEncode: empty key");
  }
  const mods = parts.slice(0, -1);

  let modBits = 0;
  if (mods.includes("shift")) modBits |= 1;
  if (mods.includes("alt")) modBits |= 2;
  if (mods.includes("ctrl")) modBits |= 4;
  const modParam = modBits > 0 ? modBits + 1 : 0;

  // Named special keys → CSI u format (ambiguous in legacy encoding)
  const csiUKeys: Record<string, number> = {
    escape: 27,
    enter: 13,
    tab: 9,
    backspace: 127,
  };

  if (base in csiUKeys) {
    const cp = csiUKeys[base];
    if (cp === undefined) {
      throw new Error(`kittyEncode: missing CSI-u mapping for ${base}`);
    }
    if (modParam > 0) return `\x1b[${cp};${modParam}u`;
    return `\x1b[${cp}u`;
  }

  // Arrow keys and Home/End → CSI letter format
  const letterKeys: Record<string, string> = {
    up: "A",
    down: "B",
    right: "C",
    left: "D",
    home: "H",
    end: "F",
  };

  if (base in letterKeys) {
    const letter = letterKeys[base];
    if (letter === undefined) {
      throw new Error(`kittyEncode: missing CSI-letter mapping for ${base}`);
    }
    if (modParam > 0) return `\x1b[1;${modParam}${letter}`;
    return `\x1b[${letter}`;
  }

  // Tilde keys (unambiguous legacy format)
  const tildeKeys: Record<string, number> = {
    delete: 3,
    pageup: 5,
    pagedown: 6,
  };

  if (base in tildeKeys) {
    const num = tildeKeys[base];
    if (num === undefined) {
      throw new Error(`kittyEncode: missing CSI-tilde mapping for ${base}`);
    }
    if (modParam > 0) return `\x1b[${num};${modParam}~`;
    return `\x1b[${num}~`;
  }

  // Function keys (tilde format)
  const fnKeys: Record<string, number> = {
    f1: 11,
    f2: 12,
    f3: 13,
    f4: 14,
    f5: 15,
    f6: 17,
    f7: 18,
    f8: 19,
    f9: 20,
    f10: 21,
    f11: 23,
    f12: 24,
  };

  if (base in fnKeys) {
    const num = fnKeys[base];
    if (num === undefined) {
      throw new Error(`kittyEncode: missing function-key mapping for ${base}`);
    }
    if (modParam > 0) return `\x1b[${num};${modParam}~`;
    return `\x1b[${num}~`;
  }

  // Named keys that map to printable codepoints
  const namedPrintable: Record<string, [number, string]> = {
    space: [32, " "],
    plus: [43, "+"],
  };

  if (base in namedPrintable) {
    const named = namedPrintable[base];
    if (named === undefined) {
      throw new Error(`kittyEncode: missing printable mapping for ${base}`);
    }
    const [cp, raw] = named;
    if (modParam > 0) return `\x1b[${cp};${modParam}u`;
    return raw; // Unmodified → raw byte (not ambiguous)
  }

  // Single printable character
  if (base.length === 1) {
    const cp = base.charCodeAt(0);
    if (modParam > 0) return `\x1b[${cp};${modParam}u`;
    return base; // Raw byte for unmodified
  }

  throw new Error(`kittyEncode: unknown key "${key}"`);
}
