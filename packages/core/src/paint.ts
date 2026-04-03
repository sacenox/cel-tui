import type { Color, TextInputProps } from "@cel-tui/types";
import type { Cell } from "./cell-buffer.js";
import { CellBuffer } from "./cell-buffer.js";
import type { LayoutNode, Rect } from "./layout.js";

/**
 * Paint a laid-out tree into a cell buffer.
 *
 * Walks the {@link LayoutNode} tree and writes styled cells into the
 * buffer within each node's computed rect. Content is clipped at
 * rect boundaries.
 *
 * @param root - The root of the laid-out tree (from {@link layout}).
 * @param buf - Target cell buffer.
 */
export function paint(root: LayoutNode, buf: CellBuffer): void {
  paintLayoutNode(root, buf);
}

function paintLayoutNode(ln: LayoutNode, buf: CellBuffer): void {
  const { node, rect } = ln;

  switch (node.type) {
    case "text":
      paintText(node.content, node.props, rect, buf);
      break;
    case "textinput":
      paintTextInput(node.props, rect, buf);
      break;
    case "vstack":
    case "hstack":
      // Containers just paint their children
      break;
  }

  // Recurse into children
  for (const child of ln.children) {
    paintLayoutNode(child, buf);
  }
}

function makeCell(
  char: string,
  props: {
    fgColor?: Color;
    bgColor?: Color;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  },
): Cell {
  return {
    char,
    fgColor: props.fgColor ?? null,
    bgColor: props.bgColor ?? null,
    bold: props.bold ?? false,
    italic: props.italic ?? false,
    underline: props.underline ?? false,
  };
}

function paintText(
  content: string,
  props: {
    repeat?: number | "fill";
    wrap?: "none" | "word";
    fgColor?: Color;
    bgColor?: Color;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  },
  rect: Rect,
  buf: CellBuffer,
): void {
  const { x, y, width: w, height: h } = rect;
  if (w <= 0 || h <= 0) return;

  // Resolve repeat
  let text = content;
  if (props.repeat === "fill" && content.length > 0) {
    text = content.repeat(Math.ceil(w / content.length)).slice(0, w);
  } else if (typeof props.repeat === "number" && props.repeat > 0) {
    text = content.repeat(props.repeat);
  }

  // Split into lines
  const rawLines = text.split("\n");

  // Word-wrap if enabled
  const lines: string[] = [];
  if (props.wrap === "word") {
    for (const rawLine of rawLines) {
      if (rawLine.length <= w) {
        lines.push(rawLine);
      } else {
        wrapLine(rawLine, w, lines);
      }
    }
  } else {
    lines.push(...rawLines);
  }

  // Paint lines, clipped to rect
  for (let row = 0; row < lines.length && row < h; row++) {
    const line = lines[row]!;
    for (let col = 0; col < line.length && col < w; col++) {
      buf.set(x + col, y + row, makeCell(line[col]!, props));
    }
  }
}

function paintTextInput(
  props: TextInputProps,
  rect: Rect,
  buf: CellBuffer,
): void {
  const { x, y, width: w, height: h } = rect;
  if (w <= 0 || h <= 0) return;

  const value = props.value;
  const showPlaceholder = value.length === 0 && props.placeholder;

  if (showPlaceholder && props.placeholder) {
    // Paint placeholder text
    paintText(props.placeholder.content, props.placeholder.props, rect, buf);
    return;
  }

  // Word-wrap value (always on for TextInput)
  const lines: string[] = [];
  for (const rawLine of value.split("\n")) {
    if (rawLine.length <= w) {
      lines.push(rawLine);
    } else {
      wrapLine(rawLine, w, lines);
    }
  }

  // Framework-managed scroll: use stored scroll offset
  const scrollOffset = getTextInputScroll(props);

  // Paint visible lines
  for (let row = 0; row < h; row++) {
    const lineIdx = scrollOffset + row;
    if (lineIdx >= lines.length) break;
    const line = lines[lineIdx]!;
    for (let col = 0; col < line.length && col < w; col++) {
      buf.set(x + col, y + row, makeCell(line[col]!, props));
    }
  }

  // Paint cursor if focused
  if (props.focused) {
    const cursorOffset = getTextInputCursor(props);
    const pos = offsetToWrappedPos(value, cursorOffset, w);
    const screenRow = pos.line - scrollOffset;
    if (screenRow >= 0 && screenRow < h && pos.col < w) {
      const existing = buf.get(x + pos.col, y + screenRow);
      // Invert colors for cursor visibility
      buf.set(x + pos.col, y + screenRow, {
        char: existing.char === " " && !existing.bgColor ? " " : existing.char,
        fgColor: existing.bgColor ?? "black",
        bgColor: existing.fgColor ?? "white",
        bold: existing.bold,
        italic: existing.italic,
        underline: existing.underline,
      });
    }
  }
}

/**
 * Map a cursor offset in the raw value to a (line, col) position
 * in the word-wrapped output.
 */
function offsetToWrappedPos(
  value: string,
  cursor: number,
  width: number,
): { line: number; col: number } {
  const rawLines = value.split("\n");
  let offset = 0;
  let wrappedLine = 0;

  for (const rawLine of rawLines) {
    if (cursor <= offset + rawLine.length) {
      // Cursor is in this raw line
      const colInRaw = cursor - offset;
      if (width <= 0) return { line: wrappedLine, col: colInRaw };
      const extraLines = Math.floor(colInRaw / width);
      return { line: wrappedLine + extraLines, col: colInRaw % width };
    }
    // Count wrapped lines for this raw line
    if (rawLine.length <= width || width <= 0) {
      wrappedLine += 1;
    } else {
      wrappedLine += Math.ceil(rawLine.length / width);
    }
    offset += rawLine.length + 1; // +1 for \n
  }

  return { line: wrappedLine, col: 0 };
}

// --- TextInput framework-managed state ---

const textInputCursors = new WeakMap<TextInputProps, number>();
const textInputScrolls = new WeakMap<TextInputProps, number>();

/** Get the cursor offset for a TextInput (framework-managed). */
export function getTextInputCursor(props: TextInputProps): number {
  return textInputCursors.get(props) ?? props.value.length;
}

/** Set the cursor offset for a TextInput. */
export function setTextInputCursor(
  props: TextInputProps,
  cursor: number,
): void {
  textInputCursors.set(props, cursor);
}

/** Get the scroll offset for a TextInput (framework-managed). */
export function getTextInputScroll(props: TextInputProps): number {
  return textInputScrolls.get(props) ?? 0;
}

/** Set the scroll offset for a TextInput. */
export function setTextInputScroll(
  props: TextInputProps,
  scroll: number,
): void {
  textInputScrolls.set(props, scroll);
}

/**
 * Simple word-wrap: break a line into multiple lines at word boundaries.
 */
function wrapLine(line: string, width: number, out: string[]): void {
  if (width <= 0) return;

  let current = "";
  const words = line.split(" ");

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += " " + word;
    } else {
      out.push(current);
      current = word;
    }

    // Handle words longer than width (break by character)
    while (current.length > width) {
      out.push(current.slice(0, width));
      current = current.slice(width);
    }
  }

  if (current.length > 0) {
    out.push(current);
  }
}
