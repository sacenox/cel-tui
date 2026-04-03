/**
 * Parse raw terminal input data into a normalized key string.
 *
 * Handles:
 * - Printable ASCII characters
 * - Control characters (Ctrl+A through Ctrl+Z)
 * - Special keys (Enter, Escape, Tab, Backspace, Delete)
 * - Arrow keys, Home, End, Page Up/Down
 * - CSI sequences
 *
 * @param data - Raw terminal input string.
 * @returns Normalized key string (e.g., `"ctrl+s"`, `"escape"`, `"up"`).
 */
export function parseKey(data: string): string {
  // CSI sequences: ESC [ ...
  if (data.startsWith("\x1b[")) {
    return parseCsiSequence(data);
  }

  // Single escape
  if (data === "\x1b") return "escape";

  // Control characters
  if (data.length === 1) {
    const code = data.charCodeAt(0);

    // Ctrl+A (0x01) through Ctrl+Z (0x1a), excluding special ones
    if (code >= 1 && code <= 26) {
      const letter = String.fromCharCode(code + 96); // 1→a, 2→b, etc.
      // Special cases
      if (code === 9) return "tab"; // Ctrl+I = Tab
      if (code === 13) return "enter"; // Ctrl+M = Enter
      return `ctrl+${letter}`;
    }

    // Backspace
    if (code === 127) return "backspace";

    // Printable ASCII
    if (code >= 32 && code <= 126) return data.toLowerCase();
  }

  // Multi-byte (e.g., UTF-8) — return as-is lowercase
  return data.toLowerCase();
}

function parseCsiSequence(data: string): string {
  const seq = data.slice(2); // Remove ESC [

  switch (seq) {
    case "A":
      return "up";
    case "B":
      return "down";
    case "C":
      return "right";
    case "D":
      return "left";
    case "H":
      return "home";
    case "F":
      return "end";
    case "Z":
      return "shift+tab";
    case "3~":
      return "delete";
    case "5~":
      return "pageup";
    case "6~":
      return "pagedown";
  }

  // Function keys
  const fnMatch = seq.match(/^(\d+)~$/);
  if (fnMatch) {
    const num = parseInt(fnMatch[1]!, 10);
    const fnMap: Record<number, string> = {
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
    if (fnMap[num]) return fnMap[num]!;
  }

  // Unknown CSI sequence
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
  ]);

  return editingKeys.has(key);
}
