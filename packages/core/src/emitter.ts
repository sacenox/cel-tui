import type { Color, CursorStyle, Theme, ThemeValue } from "@cel-tui/types";
import type { Cell, CellBuffer } from "./cell-buffer.js";

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
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const SAVE_CURSOR = "\x1b7";
const RESTORE_CURSOR = "\x1b8";
const RESET = "\x1b[0m";

/** Native terminal cursor state emitted alongside a frame. */
export type TerminalCursorState =
  | { visible: false }
  | {
      visible: true;
      x: number;
      y: number;
      /** Omitted by legacy callers means the default block cursor. */
      style?: CursorStyle;
    };

/** Cursor state used when emitting a full or differential frame. */
export interface EmitOptions {
  /** Desired cursor state after the frame is applied. */
  cursor?: TerminalCursorState;
  /** Cursor state established by the previous frame, if known. */
  previousCursor?: TerminalCursorState | null;
}

function cursorStyle(cursor: { style?: CursorStyle }): CursorStyle {
  return cursor.style ?? "block";
}

function cursorShapeSequence(style: CursorStyle): string {
  switch (style) {
    case "block":
      return "\x1b[1 q";
    case "underline":
      return "\x1b[3 q";
    case "bar":
      return "\x1b[5 q";
  }
}

function sameVisibleCursor(
  a: TerminalCursorState | null | undefined,
  b: TerminalCursorState | null | undefined,
): boolean {
  return (
    a?.visible === true &&
    b?.visible === true &&
    a.x === b.x &&
    a.y === b.y &&
    cursorStyle(a) === cursorStyle(b)
  );
}

function sameVisibleCursorPosition(
  a: TerminalCursorState,
  b: TerminalCursorState | null,
): boolean {
  return (
    a.visible === true && b?.visible === true && a.x === b.x && a.y === b.y
  );
}

function getCursorControls(
  options: EmitOptions | undefined,
  hasPaintOutput: boolean,
  forceCursorState = false,
): { prefix: string; suffix: string } {
  const cursor = options?.cursor ?? { visible: false };
  const previous = options?.previousCursor ?? null;

  if (forceCursorState) {
    return cursor.visible
      ? {
          prefix: "",
          suffix:
            `\x1b[${cursor.y + 1};${cursor.x + 1}H` +
            cursorShapeSequence(cursorStyle(cursor)) +
            SHOW_CURSOR,
        }
      : { prefix: "", suffix: HIDE_CURSOR };
  }

  if (sameVisibleCursor(cursor, previous)) {
    return hasPaintOutput
      ? { prefix: SAVE_CURSOR, suffix: RESTORE_CURSOR }
      : { prefix: "", suffix: "" };
  }

  if (cursor.visible) {
    const positionUnchanged = sameVisibleCursorPosition(cursor, previous);
    const shapeChanged =
      previous?.visible !== true ||
      cursorStyle(cursor) !== cursorStyle(previous);
    return {
      prefix: "",
      suffix:
        (!positionUnchanged || hasPaintOutput
          ? `\x1b[${cursor.y + 1};${cursor.x + 1}H`
          : "") +
        (shapeChanged ? cursorShapeSequence(cursorStyle(cursor)) : "") +
        (previous?.visible === true ? "" : SHOW_CURSOR),
    };
  }

  return previous?.visible === true
    ? { prefix: "", suffix: HIDE_CURSOR }
    : { prefix: "", suffix: "" };
}

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
 * @param options - Optional terminal cursor state to apply before the synchronized output ends.
 * @returns A complete ANSI string ready to write to the terminal.
 */
export function emitBuffer(
  buf: CellBuffer,
  theme: Theme = defaultTheme,
  options?: EmitOptions,
): string {
  // A full frame is also the recovery path after external screen corruption,
  // so it must establish cursor position and visibility from scratch instead
  // of trusting a saved terminal cursor.
  const cursorControls = getCursorControls(options, true, true);
  // Reset SGR unconditionally: redraw() is allowed to recover from arbitrary
  // external terminal output, including colors or attributes left active.
  let out = SYNC_START + cursorControls.prefix + CURSOR_HOME + RESET;

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

  out += cursorControls.suffix + SYNC_END;
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
 * @param options - Optional terminal cursor state to apply before the synchronized output ends.
 * @returns An ANSI string with only the changed cells.
 */
export function emitDiff(
  prev: CellBuffer,
  next: CellBuffer,
  theme: Theme = defaultTheme,
  options?: EmitOptions,
): string {
  const changes = prev.diff(next);
  const cursorControls = getCursorControls(options, changes.length > 0);

  if (changes.length === 0) {
    if (cursorControls.prefix === "" && cursorControls.suffix === "") return "";
    return (
      SYNC_START + cursorControls.prefix + cursorControls.suffix + SYNC_END
    );
  }

  let out = SYNC_START + cursorControls.prefix;

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

  out += cursorControls.suffix + SYNC_END;
  return out;
}
