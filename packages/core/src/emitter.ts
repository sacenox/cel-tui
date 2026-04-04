import type { Color } from "@cel-tui/types";
import type { Cell } from "./cell-buffer.js";
import { CellBuffer, EMPTY_CELL } from "./cell-buffer.js";

// --- Color mapping ---

const FG_CODES: Record<Color, number> = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  brightBlack: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
};

const BG_CODES: Record<Color, number> = {
  black: 40,
  red: 41,
  green: 42,
  yellow: 43,
  blue: 44,
  magenta: 45,
  cyan: 46,
  white: 47,
  brightBlack: 100,
  brightRed: 101,
  brightGreen: 102,
  brightYellow: 103,
  brightBlue: 104,
  brightMagenta: 105,
  brightCyan: 106,
  brightWhite: 107,
};

// --- SGR generation ---

function sgrForCell(cell: Cell): string {
  const codes: number[] = [];
  if (cell.bold) codes.push(1);
  if (cell.italic) codes.push(3);
  if (cell.underline) codes.push(4);
  if (cell.fgColor) codes.push(FG_CODES[cell.fgColor]);
  if (cell.bgColor) codes.push(BG_CODES[cell.bgColor]);
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
 * @returns A complete ANSI string ready to write to the terminal.
 */
export function emitBuffer(buf: CellBuffer): string {
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
        const sgr = sgrForCell(cell);
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
 * @returns An ANSI string with only the changed cells.
 */
export function emitDiff(prev: CellBuffer, next: CellBuffer): string {
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
      const sgr = sgrForCell(cell);
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
