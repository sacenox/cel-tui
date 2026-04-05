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
 * Vertical cursor movement — maps cursor offset to line/column,
 * moves up or down a line, then maps back to offset.
 */
function moveVertical(
  state: EditState,
  direction: "up" | "down",
  width: number,
): EditState {
  const { value, cursor } = state;
  const lines = value.split("\n");

  // Find which line and column the cursor is on
  let offset = 0;
  let cursorLine = 0;
  let cursorCol = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i]!.length;
    if (cursor >= offset && cursor <= offset + lineLen) {
      cursorLine = i;
      cursorCol = cursor - offset;
      break;
    }
    offset += lineLen + 1; // +1 for \n
  }

  // Move line
  let targetLine = cursorLine;
  if (direction === "up") {
    targetLine = Math.max(0, cursorLine - 1);
  } else {
    targetLine = Math.min(lines.length - 1, cursorLine + 1);
  }

  if (targetLine === cursorLine) {
    // Can't move — go to start (up) or end (down)
    return {
      value,
      cursor: direction === "up" ? 0 : value.length,
    };
  }

  // Map column to new line, clamping to line length
  const targetLineLen = lines[targetLine]!.length;
  const targetCol = Math.min(cursorCol, targetLineLen);

  // Compute new offset
  let newOffset = 0;
  for (let i = 0; i < targetLine; i++) {
    newOffset += lines[i]!.length + 1;
  }
  newOffset += targetCol;

  return { value, cursor: newOffset };
}
