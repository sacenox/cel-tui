import type { Color, TextInputProps } from "@cel-tui/types";
import type { Cell } from "./cell-buffer.js";
import { CellBuffer } from "./cell-buffer.js";
import type { LayoutNode, Rect } from "./layout.js";
import { visibleWidth } from "./width.js";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

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
  paintLayoutNode(root, buf, root.rect);
}

/**
 * Intersect two rectangles. Returns a rect with zero area if they don't overlap.
 */
function intersectRect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
}

function paintLayoutNode(
  ln: LayoutNode,
  buf: CellBuffer,
  clipRect: Rect,
): void {
  const { node, rect } = ln;

  // Clip this node's rect against the parent clip rect
  const clipped = intersectRect(rect, clipRect);
  if (clipped.width <= 0 || clipped.height <= 0) return;

  switch (node.type) {
    case "text":
      paintText(node.content, node.props, rect, clipped, buf);
      break;
    case "textinput":
      paintTextInput(node.props, rect, clipped, buf);
      break;
    case "vstack":
    case "hstack":
      // Containers just paint their children
      break;
  }

  // Determine scroll offset for scrollable containers
  const isContainer = node.type === "vstack" || node.type === "hstack";
  const containerProps = isContainer ? node.props : null;
  const isScrollable = containerProps?.overflow === "scroll";
  const scrollOffset = isScrollable
    ? (containerProps.scrollOffset ?? getContainerScroll(containerProps))
    : 0;
  const isVertical = node.type === "vstack";

  // Recurse into children, using this node's clipped rect as the clip for children
  for (const child of ln.children) {
    if (isScrollable && scrollOffset !== 0) {
      // Paint child with shifted position
      const shifted = shiftLayoutNode(child, isVertical, -scrollOffset);
      paintLayoutNode(shifted, buf, clipped);
    } else {
      paintLayoutNode(child, buf, clipped);
    }
  }

  // Paint scrollbar if enabled
  if (isScrollable && containerProps.scrollbar) {
    paintScrollbar(ln, scrollOffset, buf, clipped);
  }
}

/**
 * Create a copy of a layout node (and all descendants) with positions
 * shifted along the given axis.
 */
function shiftLayoutNode(
  ln: LayoutNode,
  isVertical: boolean,
  offset: number,
): LayoutNode {
  const newRect: Rect = {
    x: ln.rect.x + (isVertical ? 0 : offset),
    y: ln.rect.y + (isVertical ? offset : 0),
    width: ln.rect.width,
    height: ln.rect.height,
  };
  return {
    node: ln.node,
    rect: newRect,
    children: ln.children.map((c) => shiftLayoutNode(c, isVertical, offset)),
  };
}

/**
 * Paint a scrollbar indicator for a scrollable container.
 */
function paintScrollbar(
  ln: LayoutNode,
  scrollOffset: number,
  buf: CellBuffer,
  clipRect: Rect,
): void {
  const { rect, children } = ln;
  const isVertical = ln.node.type === "vstack";

  if (isVertical) {
    // Compute total content height from children
    let contentHeight = 0;
    for (const child of children) {
      const childBottom = child.rect.y + child.rect.height - rect.y;
      if (childBottom > contentHeight) contentHeight = childBottom;
    }
    const viewportH = rect.height;
    if (contentHeight <= viewportH) return; // no scrollbar needed

    // Thumb size and position
    const thumbSize = Math.max(
      1,
      Math.round((viewportH / contentHeight) * viewportH),
    );
    const maxOffset = contentHeight - viewportH;
    const thumbPos =
      maxOffset > 0
        ? Math.round((scrollOffset / maxOffset) * (viewportH - thumbSize))
        : 0;

    const barX = rect.x + rect.width - 1;
    for (let row = 0; row < viewportH; row++) {
      const absY = rect.y + row;
      if (absY < clipRect.y || absY >= clipRect.y + clipRect.height) continue;
      if (barX < clipRect.x || barX >= clipRect.x + clipRect.width) continue;
      const isThumb = row >= thumbPos && row < thumbPos + thumbSize;
      buf.set(barX, absY, {
        char: isThumb ? "┃" : "│",
        fgColor: isThumb ? "white" : "brightBlack",
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
    }
  } else {
    // Horizontal scrollbar
    let contentWidth = 0;
    for (const child of children) {
      const childRight = child.rect.x + child.rect.width - rect.x;
      if (childRight > contentWidth) contentWidth = childRight;
    }
    const viewportW = rect.width;
    if (contentWidth <= viewportW) return;

    const thumbSize = Math.max(
      1,
      Math.round((viewportW / contentWidth) * viewportW),
    );
    const maxOffset = contentWidth - viewportW;
    const thumbPos =
      maxOffset > 0
        ? Math.round((scrollOffset / maxOffset) * (viewportW - thumbSize))
        : 0;

    const barY = rect.y + rect.height - 1;
    for (let col = 0; col < viewportW; col++) {
      const absX = rect.x + col;
      if (absX < clipRect.x || absX >= clipRect.x + clipRect.width) continue;
      if (barY < clipRect.y || barY >= clipRect.y + clipRect.height) continue;
      const isThumb = col >= thumbPos && col < thumbPos + thumbSize;
      buf.set(absX, barY, {
        char: isThumb ? "━" : "─",
        fgColor: isThumb ? "white" : "brightBlack",
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
      });
    }
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

/**
 * Paint a single line of text into the buffer using grapheme segmentation.
 * Correctly handles wide characters (CJK, emoji) by advancing the column
 * by the grapheme's visible width.
 */
/**
 * Paint a single line of text into the buffer using grapheme segmentation.
 * Correctly handles wide characters (CJK, emoji) by advancing the column
 * by the grapheme's visible width. Respects the clip rect.
 */
function paintLineGraphemes(
  line: string,
  x: number,
  y: number,
  maxWidth: number,
  clipRect: Rect,
  props: {
    fgColor?: Color;
    bgColor?: Color;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  },
  buf: CellBuffer,
): void {
  if (y < clipRect.y || y >= clipRect.y + clipRect.height) return;
  const clipLeft = clipRect.x;
  const clipRight = clipRect.x + clipRect.width;

  let col = 0;
  for (const { segment } of segmenter.segment(line)) {
    const gw = visibleWidth(segment);
    if (gw === 0) continue;
    if (col + gw > maxWidth) break; // clip: grapheme doesn't fit in rect
    const absX = x + col;
    if (absX >= clipRight) break; // past clip right edge
    if (absX + gw > clipLeft) {
      // At least partially visible in clip rect
      buf.set(absX, y, makeCell(segment, props));
    }
    col += gw;
  }
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
  clipRect: Rect,
  buf: CellBuffer,
): void {
  const { x, y, width: w, height: h } = rect;
  if (w <= 0 || h <= 0) return;

  // Resolve repeat
  let text = content;
  if (props.repeat === "fill" && content.length > 0) {
    const contentW = visibleWidth(content);
    if (contentW > 0) {
      text = content.repeat(Math.ceil(w / contentW));
    }
  } else if (typeof props.repeat === "number" && props.repeat > 0) {
    text = content.repeat(props.repeat);
  }

  // Split into lines
  const rawLines = text.split("\n");

  // Word-wrap if enabled
  const lines: string[] = [];
  if (props.wrap === "word") {
    for (const rawLine of rawLines) {
      if (visibleWidth(rawLine) <= w) {
        lines.push(rawLine);
      } else {
        wrapLine(rawLine, w, lines);
      }
    }
  } else {
    lines.push(...rawLines);
  }

  // Paint lines, clipped to rect (grapheme-aware)
  for (let row = 0; row < lines.length && row < h; row++) {
    const line = lines[row]!;
    paintLineGraphemes(line, x, y + row, w, clipRect, props, buf);
  }
}

function paintTextInput(
  props: TextInputProps,
  rect: Rect,
  clipRect: Rect,
  buf: CellBuffer,
): void {
  const { x, y, width: w, height: h } = rect;
  if (w <= 0 || h <= 0) return;

  const value = props.value;
  const showPlaceholder = value.length === 0 && props.placeholder;

  if (showPlaceholder && props.placeholder) {
    // Paint placeholder text
    paintText(
      props.placeholder.content,
      props.placeholder.props,
      rect,
      clipRect,
      buf,
    );
    return;
  }

  // Word-wrap value (always on for TextInput)
  const lines: string[] = [];
  for (const rawLine of value.split("\n")) {
    if (visibleWidth(rawLine) <= w) {
      lines.push(rawLine);
    } else {
      wrapLine(rawLine, w, lines);
    }
  }

  // Framework-managed scroll: use stored scroll offset
  const scrollOffset = getTextInputScroll(props);

  // Paint visible lines (grapheme-aware)
  for (let row = 0; row < h; row++) {
    const lineIdx = scrollOffset + row;
    if (lineIdx >= lines.length) break;
    const line = lines[lineIdx]!;
    paintLineGraphemes(line, x, y + row, w, clipRect, props, buf);
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
      // Compute visible width of text before cursor
      const textBeforeCursor = rawLine.slice(0, colInRaw);
      const vw = visibleWidth(textBeforeCursor);
      const extraLines = Math.floor(vw / width);
      return { line: wrappedLine + extraLines, col: vw % width };
    }
    // Count wrapped lines for this raw line
    const lineVW = visibleWidth(rawLine);
    if (lineVW <= width || width <= 0) {
      wrappedLine += 1;
    } else {
      wrappedLine += Math.ceil(lineVW / width);
    }
    offset += rawLine.length + 1; // +1 for \n
  }

  return { line: wrappedLine, col: 0 };
}

// --- Framework-managed state ---

import type { ContainerProps } from "@cel-tui/types";

const containerScrolls = new WeakMap<ContainerProps, number>();

/** Get the scroll offset for an uncontrolled scrollable container. */
export function getContainerScroll(props: ContainerProps): number {
  return containerScrolls.get(props) ?? 0;
}

/** Set the scroll offset for an uncontrolled scrollable container. */
export function setContainerScroll(
  props: ContainerProps,
  scroll: number,
): void {
  containerScrolls.set(props, scroll);
}

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
  let currentW = 0;
  const words = line.split(" ");

  for (const word of words) {
    const wordW = visibleWidth(word);
    if (currentW === 0) {
      current = word;
      currentW = wordW;
    } else if (currentW + 1 + wordW <= width) {
      current += " " + word;
      currentW += 1 + wordW;
    } else {
      out.push(current);
      current = word;
      currentW = wordW;
    }

    // Handle words longer than width (break by grapheme)
    while (currentW > width) {
      let taken = "";
      let takenW = 0;
      let rest = "";
      let inRest = false;
      for (const { segment } of segmenter.segment(current)) {
        if (inRest) {
          rest += segment;
          continue;
        }
        const gw = visibleWidth(segment);
        if (takenW + gw > width) {
          rest += segment;
          inRest = true;
        } else {
          taken += segment;
          takenW += gw;
        }
      }
      out.push(taken);
      current = rest;
      currentW = visibleWidth(rest);
    }
  }

  if (current.length > 0) {
    out.push(current);
  }
}
