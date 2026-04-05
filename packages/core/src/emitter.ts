import type { Color, Theme, ThemeValue } from "@cel-tui/types";
import type { Cell } from "./cell-buffer.js";
import { CellBuffer, EMPTY_CELL } from "./cell-buffer.js";

// --- Default ANSI 16 theme ---

/**
 * The default theme — maps each color slot to its matching ANSI palette
 * index. With this theme, colors inherit the terminal's configured
 * color scheme automatically.
 */
export const defaultTheme: Theme = {
  color00: 0,
  color01: 1,
  color02: 2,
  color03: 3,
  color04: 4,
  color05: 5,
  color06: 6,
  color07: 7,
  color08: 8,
  color09: 9,
  color10: 10,
  color11: 11,
  color12: 12,
  color13: 13,
  color14: 14,
  color15: 15,
};

// --- Color resolution ---

/** Parse a hex color string "#rrggbb" into [r, g, b]. */
function parseHex(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/** Resolve a color slot to an SGR code fragment for foreground. */
function fgSgr(color: Color, theme: Theme): string {
  const val: ThemeValue = theme[color];
  if (typeof val === "number") {
    // ANSI palette index 0-15
    return String(val < 8 ? 30 + val : 82 + val);
  }
  // Hex true color
  const [r, g, b] = parseHex(val);
  return `38;2;${r};${g};${b}`;
}

/** Resolve a color slot to an SGR code fragment for background. */
function bgSgr(color: Color, theme: Theme): string {
  const val: ThemeValue = theme[color];
  if (typeof val === "number") {
    // ANSI palette index 0-15
    return String(val < 8 ? 40 + val : 92 + val);
  }
  // Hex true color
  const [r, g, b] = parseHex(val);
  return `48;2;${r};${g};${b}`;
}

// --- SGR generation ---

function sgrForCell(cell: Cell, theme: Theme): string {
  const codes: string[] = [];
  if (cell.bold) codes.push("1");
  if (cell.italic) codes.push("3");
  if (cell.underline) codes.push("4");
  if (cell.fgColor) codes.push(fgSgr(cell.fgColor, theme));
  if (cell.bgColor) codes.push(bgSgr(cell.bgColor, theme));
  if (codes.length === 0) return "";
  return `\x1b[${codes.join(";")}m`;
}

function styleEquals(a: Cell, b: Cell): boolean {
  return (
    a.fgColor === b.fgColor &&
    a.bgColor === b.bgColor &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline
  );
}

function hasStyle(cell: Cell): boolean {
  return (
    cell.bold ||
    cell.italic ||
    cell.underline ||
    cell.fgColor !== null ||
    cell.bgColor !== null
  );
}

// --- Synchronized output markers ---

const SYNC_START = "\x1b[?2026h";
const SYNC_END = "\x1b[?2026l";
const CURSOR_HOME = "\x1b[H";
const RESET = "\x1b[0m";

/**
 * Emit a full cell buffer as an ANSI string for terminal output.
 *
 * Generates cursor positioning, SGR styling codes, and character content
 * for every cell. Output is wrapped in synchronized output markers
 * (CSI 2026) for flicker-free rendering.
 *
 * Optimizes by batching consecutive cells with the same style and
 * only emitting SGR codes when the style changes.
 *
 * @param buf - The cell buffer to render.
 * @param theme - Color theme mapping. Defaults to the ANSI 16 theme.
 * @returns A complete ANSI string ready to write to the terminal.
 */
export function emitBuffer(
  buf: CellBuffer,
  theme: Theme = defaultTheme,
): string {
  let out = SYNC_START + CURSOR_HOME;

  let lastStyle: Cell | null = null;

  for (let y = 0; y < buf.height; y++) {
    if (y > 0) out += "\r\n";

    for (let x = 0; x < buf.width; x++) {
      const cell = buf.get(x, y);

      // Skip continuation cells (trailing half of wide characters)
      if (cell.char === "") continue;

      // Emit style change if needed
      if (lastStyle === null || !styleEquals(cell, lastStyle)) {
        // Reset before applying new style
        if (lastStyle !== null && hasStyle(lastStyle)) {
          out += RESET;
        }
        const sgr = sgrForCell(cell, theme);
        if (sgr) out += sgr;
        lastStyle = cell;
      }

      out += cell.char;
    }
  }

  // Final reset if any style was active
  if (lastStyle !== null && hasStyle(lastStyle)) {
    out += RESET;
  }

  out += SYNC_END;
  return out;
}

/**
 * Emit only the cells that differ between two buffers.
 *
 * Uses cursor positioning (CSI row;col H) to jump to changed cells,
 * batching consecutive changes on the same row into a single run.
 * Output is wrapped in synchronized output markers for flicker-free updates.
 *
 * @param prev - The previous buffer.
 * @param next - The new buffer.
 * @param theme - Color theme mapping. Defaults to the ANSI 16 theme.
 * @returns An ANSI string with only the changed cells.
 */
export function emitDiff(
  prev: CellBuffer,
  next: CellBuffer,
  theme: Theme = defaultTheme,
): string {
  let out = SYNC_START;

  const changes = prev.diff(next);
  if (changes.length === 0) {
    return out + SYNC_END;
  }

  let lastStyle: Cell | null = null;
  let lastX = -1;
  let lastY = -1;

  for (const { x, y } of changes) {
    const cell = next.get(x, y);

    // Skip continuation cells (trailing half of wide characters)
    if (cell.char === "") continue;

    // Position cursor if not consecutive
    if (y !== lastY || x !== lastX + 1) {
      // Reset style before repositioning
      if (lastStyle !== null && hasStyle(lastStyle)) {
        out += RESET;
        lastStyle = null;
      }
      // CSI row;col H (1-indexed)
      out += `\x1b[${y + 1};${x + 1}H`;
    }

    // Emit style change if needed
    if (lastStyle === null || !styleEquals(cell, lastStyle)) {
      if (lastStyle !== null && hasStyle(lastStyle)) {
        out += RESET;
      }
      const sgr = sgrForCell(cell, theme);
      if (sgr) out += sgr;
      lastStyle = cell;
    }

    out += cell.char;
    lastX = x;
    lastY = y;
  }

  // Final reset
  if (lastStyle !== null && hasStyle(lastStyle)) {
    out += RESET;
  }

  out += SYNC_END;
  return out;
}
