import { layoutText } from "./text-layout.js";

/**
 * Framework-managed editing state for TextInput.
 */
export interface EditState {
  /** Current text value. */
  value: string;
  /** Cursor offset in the string (0 = before first char). */
  cursor: number;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const WHITESPACE_RE = /^\s+$/u;

/**
 * Get the grapheme boundary before the given cursor position.
 * Returns the start offset of the grapheme that contains or precedes
 * the cursor, or 0 if at the beginning.
 */
function prevGraphemeBoundary(value: string, cursor: number): number {
  if (cursor <= 0) return 0;
  let lastStart = 0;
  for (const { index, segment } of segmenter.segment(value)) {
    const end = index + segment.length;
    if (end >= cursor) return index;
    lastStart = end;
  }
  return lastStart;
}

/**
 * Get the grapheme boundary after the given cursor position.
 * Returns the end offset of the grapheme that starts at or after
 * the cursor, or value.length if at the end.
 */
function nextGraphemeBoundary(value: string, cursor: number): number {
  for (const { index, segment } of segmenter.segment(value)) {
    const end = index + segment.length;
    if (index >= cursor) return end;
  }
  return value.length;
}

function isWhitespaceGrapheme(segment: string): boolean {
  return WHITESPACE_RE.test(segment);
}

function findWordBoundaryBackward(value: string, cursor: number): number {
  let boundary = cursor;

  while (boundary > 0) {
    const prev = prevGraphemeBoundary(value, boundary);
    if (!isWhitespaceGrapheme(value.slice(prev, boundary))) break;
    boundary = prev;
  }

  while (boundary > 0) {
    const prev = prevGraphemeBoundary(value, boundary);
    if (isWhitespaceGrapheme(value.slice(prev, boundary))) break;
    boundary = prev;
  }

  return boundary;
}

function findWordBoundaryForward(value: string, cursor: number): number {
  let boundary = cursor;

  while (boundary < value.length) {
    const next = nextGraphemeBoundary(value, boundary);
    if (!isWhitespaceGrapheme(value.slice(boundary, next))) break;
    boundary = next;
  }

  while (boundary < value.length) {
    const next = nextGraphemeBoundary(value, boundary);
    if (isWhitespaceGrapheme(value.slice(boundary, next))) break;
    boundary = next;
  }

  return boundary;
}

/**
 * Insert a character (or string) at the cursor position.
 */
export function insertChar(state: EditState, char: string): EditState {
  const { value, cursor } = state;
  return {
    value: value.slice(0, cursor) + char + value.slice(cursor),
    cursor: cursor + char.length,
  };
}

/**
 * Delete the grapheme before the cursor (Backspace).
 * Handles multi-codepoint characters (emoji, ZWJ sequences, combining marks).
 */
export function deleteBackward(state: EditState): EditState {
  const { value, cursor } = state;
  if (cursor === 0) return state;
  const boundary = prevGraphemeBoundary(value, cursor);
  return {
    value: value.slice(0, boundary) + value.slice(cursor),
    cursor: boundary,
  };
}

/**
 * Delete the grapheme after the cursor (Delete key).
 * Handles multi-codepoint characters (emoji, ZWJ sequences, combining marks).
 */
export function deleteForward(state: EditState): EditState {
  const { value, cursor } = state;
  if (cursor >= value.length) return state;
  const boundary = nextGraphemeBoundary(value, cursor);
  return {
    value: value.slice(0, cursor) + value.slice(boundary),
    cursor,
  };
}

/**
 * Delete the whitespace-delimited word before the cursor.
 */
export function deleteWordBackward(state: EditState): EditState {
  const { value, cursor } = state;
  const boundary = findWordBoundaryBackward(value, cursor);
  if (boundary === cursor) return state;
  return {
    value: value.slice(0, boundary) + value.slice(cursor),
    cursor: boundary,
  };
}

/**
 * Delete the whitespace-delimited word after the cursor.
 */
export function deleteWordForward(state: EditState): EditState {
  const { value, cursor } = state;
  const boundary = findWordBoundaryForward(value, cursor);
  if (boundary === cursor) return state;
  return {
    value: value.slice(0, cursor) + value.slice(boundary),
    cursor,
  };
}

/**
 * Move the cursor in the given direction.
 * Left/right movement respects grapheme boundaries.
 *
 * @param state - Current edit state.
 * @param direction - Movement direction.
 * @param width - Available width (for up/down line navigation).
 */
export function moveCursor(
  state: EditState,
  direction: "left" | "right" | "up" | "down" | "home" | "end",
  width?: number,
): EditState {
  const { value, cursor } = state;

  switch (direction) {
    case "left": {
      if (cursor <= 0) return state;
      const boundary = prevGraphemeBoundary(value, cursor);
      return { value, cursor: boundary };
    }
    case "right": {
      if (cursor >= value.length) return state;
      const boundary = nextGraphemeBoundary(value, cursor);
      return { value, cursor: boundary };
    }
    case "home":
      return { value, cursor: 0 };
    case "end":
      return { value, cursor: value.length };
    case "up":
    case "down":
      return moveVertical(state, direction, width ?? 80);
  }
}

/**
 * Move the cursor by one whitespace-delimited word.
 */
export function moveCursorByWord(
  state: EditState,
  direction: "backward" | "forward",
): EditState {
  const { value, cursor } = state;
  const nextCursor =
    direction === "backward"
      ? findWordBoundaryBackward(value, cursor)
      : findWordBoundaryForward(value, cursor);

  if (nextCursor === cursor) return state;
  return { value, cursor: nextCursor };
}

/**
 * Vertical cursor movement follows the visual wrapped lines used for painting.
 */
function moveVertical(
  state: EditState,
  direction: "up" | "down",
  width: number,
): EditState {
  const { value, cursor } = state;
  const textLayout = layoutText(value, width, "word");
  const pos = textLayout.offsetToPosition(cursor);
  const targetLine =
    direction === "up"
      ? Math.max(0, pos.line - 1)
      : Math.min(textLayout.lineCount - 1, pos.line + 1);

  if (targetLine === pos.line) {
    return {
      value,
      cursor: direction === "up" ? 0 : value.length,
    };
  }

  return {
    value,
    cursor: textLayout.positionToOffset(targetLine, pos.col),
  };
}
