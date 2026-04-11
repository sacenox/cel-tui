import type { Color, StyleProps, TextInputProps } from "@cel-tui/types";
import type { Cell, CellBuffer } from "./cell-buffer.js";
import type { LayoutNode, Rect } from "./layout.js";
import { getMaxScrollOffset } from "./scroll.js";
import { layoutText } from "./text-layout.js";
import { visibleWidth } from "./width.js";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Empty inherited style — no values set. */
const EMPTY_STYLE: StyleProps = {};

/**
 * Paint a laid-out tree into a cell buffer.
 *
 * Walks the {@link LayoutNode} tree and writes styled cells into the
 * buffer within each node's computed rect. Content is clipped at
 * rect boundaries. Container styles are inherited by descendants.
 *
 * @param root - The root of the laid-out tree (from {@link layout}).
 * @param buf - Target cell buffer.
 */
export function paint(root: LayoutNode, buf: CellBuffer): void {
  paintLayoutNode(root, buf, root.rect, EMPTY_STYLE);
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

/**
 * Resolve the effective style for a container, accounting for focusStyle.
 * When the container is focused and has focusStyle, those values override
 * the normal style props.
 */
function resolveContainerStyle(
  props: { focused?: boolean; focusStyle?: StyleProps } & StyleProps,
): StyleProps {
  const isFocused = props.focused === true;
  if (!isFocused || !props.focusStyle) {
    return props;
  }
  return {
    bold: props.focusStyle.bold ?? props.bold,
    italic: props.focusStyle.italic ?? props.italic,
    underline: props.focusStyle.underline ?? props.underline,
    fgColor: props.focusStyle.fgColor ?? props.fgColor,
    bgColor: props.focusStyle.bgColor ?? props.bgColor,
  };
}

/**
 * Merge a container's resolved style into the inherited style.
 * Only values explicitly set on the container override inherited ones.
 */
function mergeInherited(
  inherited: StyleProps,
  resolved: StyleProps,
): StyleProps {
  return {
    bold: resolved.bold ?? inherited.bold,
    italic: resolved.italic ?? inherited.italic,
    underline: resolved.underline ?? inherited.underline,
    fgColor: resolved.fgColor ?? inherited.fgColor,
    bgColor: resolved.bgColor ?? inherited.bgColor,
  };
}

/**
 * Fill a rectangle with opaque background cells, respecting the clip rect.
 * Writes space characters with the given bgColor, making the container
 * fully opaque. This ensures upper layers properly occlude lower layers.
 */
function fillBackground(
  rect: Rect,
  clipRect: Rect,
  bgColor: Color,
  buf: CellBuffer,
): void {
  const fill = intersectRect(rect, clipRect);
  if (fill.width <= 0 || fill.height <= 0) return;
  for (let y = fill.y; y < fill.y + fill.height; y++) {
    for (let x = fill.x; x < fill.x + fill.width; x++) {
      buf.set(x, y, {
        char: " ",
        fgColor: null,
        bgColor,
        bold: false,
        italic: false,
        underline: false,
      });
    }
  }
}

function paintLayoutNode(
  ln: LayoutNode,
  buf: CellBuffer,
  clipRect: Rect,
  inherited: StyleProps,
): void {
  const { node, rect } = ln;

  // Clip this node's rect against the parent clip rect
  const clipped = intersectRect(rect, clipRect);
  if (clipped.width <= 0 || clipped.height <= 0) return;

  // Compute inherited style for this subtree
  let childInherited = inherited;

  switch (node.type) {
    case "text": {
      // Resolve text styles: own props override inherited
      const effective = {
        fgColor: node.props.fgColor ?? inherited.fgColor,
        bgColor: node.props.bgColor ?? inherited.bgColor,
        bold: node.props.bold ?? inherited.bold,
        italic: node.props.italic ?? inherited.italic,
        underline: node.props.underline ?? inherited.underline,
      };
      paintText(
        node.content,
        { ...node.props, ...effective },
        rect,
        clipped,
        buf,
      );
      break;
    }
    case "textinput": {
      // TextInput: resolve own styles with inheritance
      const tiResolved = resolveContainerStyle(node.props);
      const tiEffective = mergeInherited(inherited, tiResolved);
      const tiProps = {
        ...node.props,
        fgColor: node.props.fgColor ?? tiEffective.fgColor,
        bgColor: node.props.bgColor ?? tiEffective.bgColor,
        bold: node.props.bold ?? tiEffective.bold,
        italic: node.props.italic ?? tiEffective.italic,
        underline: node.props.underline ?? tiEffective.underline,
      };
      paintTextInput(tiProps, rect, clipped, buf, tiEffective);
      break;
    }
    case "vstack":
    case "hstack": {
      // Resolve container style (applies focusStyle if focused)
      const resolved = resolveContainerStyle(node.props);
      childInherited = mergeInherited(inherited, resolved);

      // Fill container background
      const effectiveBg = childInherited.bgColor;
      if (effectiveBg) {
        fillBackground(rect, clipped, effectiveBg, buf);
      }
      break;
    }
  }

  // Determine scroll offset for scrollable containers
  const isContainer = node.type === "vstack" || node.type === "hstack";
  const containerProps = isContainer ? node.props : null;
  const isScrollable = containerProps?.overflow === "scroll";
  const isVertical = node.type === "vstack";
  let scrollOffset = 0;
  if (isScrollable) {
    const raw = containerProps.scrollOffset ?? 0;
    // Clamp to valid range so apps can pass large values to mean "scroll to end"
    const maxOffset = getMaxScrollOffset(ln);
    scrollOffset = Math.max(0, Math.min(raw, maxOffset));
  }

  // Recurse into children, using this node's clipped rect as the clip for children
  for (const child of ln.children) {
    if (isScrollable && scrollOffset !== 0) {
      // Paint child with shifted position
      const shifted = shiftLayoutNode(child, isVertical, -scrollOffset);
      paintLayoutNode(shifted, buf, clipped, childInherited);
    } else {
      paintLayoutNode(child, buf, clipped, childInherited);
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
  const props =
    ln.node.type === "vstack" || ln.node.type === "hstack"
      ? ln.node.props
      : null;
  if (!props) return;

  if (isVertical) {
    // Compute total scrollable height from children plus bottom padding.
    // Child positions already include top padding, so add only the trailing pad.
    let contentHeight = 0;
    for (const child of children) {
      const childBottom = child.rect.y + child.rect.height - rect.y;
      if (childBottom > contentHeight) contentHeight = childBottom;
    }
    const scrollHeight = contentHeight + (props.padding?.y ?? 0);
    const viewportH = rect.height;
    if (scrollHeight <= viewportH) return; // no scrollbar needed

    // Thumb size and position
    const thumbSize = Math.max(
      1,
      Math.round((viewportH / scrollHeight) * viewportH),
    );
    const maxOffset = scrollHeight - viewportH;
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
        fgColor: isThumb ? null : "color08",
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
    const scrollWidth = contentWidth + (props.padding?.x ?? 0);
    const viewportW = rect.width;
    if (scrollWidth <= viewportW) return;

    const thumbSize = Math.max(
      1,
      Math.round((viewportW / scrollWidth) * viewportW),
    );
    const maxOffset = scrollWidth - viewportW;
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
        fgColor: isThumb ? null : "color08",
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
      // Write continuation markers for wide characters (2+ columns)
      for (let w = 1; w < gw; w++) {
        const cx = absX + w;
        if (cx < clipRight) {
          buf.set(cx, y, {
            char: "",
            fgColor: props.fgColor ?? null,
            bgColor: props.bgColor ?? null,
            bold: props.bold ?? false,
            italic: props.italic ?? false,
            underline: props.underline ?? false,
          });
        }
      }
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

  const textLayout = layoutText(text, w, props.wrap ?? "none");

  // Paint lines, clipped to rect (grapheme-aware)
  for (let row = 0; row < textLayout.lineCount && row < h; row++) {
    const line = textLayout.lines[row];
    if (!line) {
      break;
    }
    paintLineGraphemes(line.text, x, y + row, w, clipRect, props, buf);
  }
}

function paintTextInput(
  props: TextInputProps,
  rect: Rect,
  clipRect: Rect,
  buf: CellBuffer,
  inherited: StyleProps = EMPTY_STYLE,
): void {
  const { x, y, width: w, height: h } = rect;
  if (w <= 0 || h <= 0) return;

  // Apply padding — content is inset from the rect edges
  const padX = props.padding?.x ?? 0;
  const padY = props.padding?.y ?? 0;
  const cx = x + padX;
  const cy = y + padY;
  const cw = Math.max(0, w - padX * 2);
  const ch = Math.max(0, h - padY * 2);
  if (cw <= 0 || ch <= 0) return;

  // Fill the TextInput rect with background color (like containers do)
  // so that cursor inversion and empty cells have correct colors.
  const effectiveBg = props.bgColor ?? inherited.bgColor;
  if (effectiveBg) {
    fillBackground(rect, clipRect, effectiveBg, buf);
  }

  const value = props.value;
  const showPlaceholder = value.length === 0 && props.placeholder;

  if (showPlaceholder && props.placeholder) {
    // Paint placeholder text in padded content area, inheriting
    // styles from the TextInput's resolved style chain
    const contentRect: Rect = { x: cx, y: cy, width: cw, height: ch };
    const phProps = props.placeholder.props;
    const effectivePh = {
      ...phProps,
      fgColor: phProps.fgColor ?? inherited.fgColor,
      bgColor: phProps.bgColor ?? inherited.bgColor,
      bold: phProps.bold ?? inherited.bold,
      italic: phProps.italic ?? inherited.italic,
      underline: phProps.underline ?? inherited.underline,
    };
    paintText(
      props.placeholder.content,
      effectivePh,
      contentRect,
      clipRect,
      buf,
    );
    return;
  }

  const textLayout = layoutText(value, cw, "word");

  // Framework-managed scroll: auto-scroll to keep cursor visible
  let scrollOffset = getTextInputScroll(props);

  if (props.focused) {
    const cursorOffset = getTextInputCursor(props);
    const cursorPos = textLayout.offsetToPosition(cursorOffset);
    // Scroll down if cursor is below viewport
    if (cursorPos.line >= scrollOffset + ch) {
      scrollOffset = cursorPos.line - ch + 1;
    }
    // Scroll up if cursor is above viewport
    if (cursorPos.line < scrollOffset) {
      scrollOffset = cursorPos.line;
    }
    setTextInputScroll(props, scrollOffset);
  }

  // Paint visible lines (grapheme-aware) in content area
  for (let row = 0; row < ch; row++) {
    const lineIdx = scrollOffset + row;
    if (lineIdx >= textLayout.lineCount) break;
    const line = textLayout.lines[lineIdx];
    if (!line) {
      break;
    }
    paintLineGraphemes(line.text, cx, cy + row, cw, clipRect, props, buf);
  }

  // Paint cursor if focused — invert colors at cursor position so it's
  // always visible regardless of terminal cursor configuration. The
  // framework also positions the native terminal cursor here (in cel.ts)
  // for blinking.
  if (props.focused) {
    const cursorOffset = getTextInputCursor(props);
    const pos = textLayout.offsetToPosition(cursorOffset);
    const screenRow = pos.line - scrollOffset;
    if (screenRow >= 0 && screenRow < ch && pos.col < cw) {
      const absX = cx + pos.col;
      const absY = cy + screenRow;
      if (
        absX >= clipRect.x &&
        absX < clipRect.x + clipRect.width &&
        absY >= clipRect.y &&
        absY < clipRect.y + clipRect.height
      ) {
        const existing = buf.get(absX, absY);
        // Resolve null colors against inherited style so the inversion
        // always produces visible contrast (e.g. on bg-filled empty cells
        // where fgColor is null).
        const resolvedFg = existing.fgColor ?? inherited.fgColor ?? "color07";
        const resolvedBg = existing.bgColor ?? inherited.bgColor ?? "color00";
        buf.set(absX, absY, {
          char: existing.char,
          fgColor: resolvedBg,
          bgColor: resolvedFg,
          bold: existing.bold,
          italic: existing.italic,
          underline: existing.underline,
        });
      }
    }
  }
}

// --- Framework-managed state ---

/**
 * TextInput state is keyed on the `onChange` function reference, which is
 * a stable identity across re-renders (the app provides the same closure).
 * This avoids losing cursor/scroll position when props objects are recreated
 * each frame.
 */
type OnChangeFn = (value: string) => void;
const textInputCursors = new WeakMap<OnChangeFn, number>();
const textInputScrolls = new WeakMap<OnChangeFn, number>();

/**
 * Compute the screen position of the cursor for a focused TextInput.
 * Returns `{ x, y }` in 0-indexed screen coordinates, or `null` if
 * the cursor is not visible (clipped or not focused).
 */
export function getTextInputCursorScreenPos(
  props: TextInputProps,
  rect: Rect,
): { x: number; y: number } | null {
  const { x, y, width: w, height: h } = rect;
  if (w <= 0 || h <= 0) return null;

  const padX = props.padding?.x ?? 0;
  const padY = props.padding?.y ?? 0;
  const cx = x + padX;
  const cy = y + padY;
  const cw = Math.max(0, w - padX * 2);
  const ch = Math.max(0, h - padY * 2);
  if (cw <= 0 || ch <= 0) return null;

  const cursorOffset = getTextInputCursor(props);
  const textLayout = layoutText(props.value, cw, "word");
  const pos = textLayout.offsetToPosition(cursorOffset);
  const scrollOffset = getTextInputScroll(props);
  const screenRow = pos.line - scrollOffset;

  if (screenRow >= 0 && screenRow < ch && pos.col < cw) {
    return { x: cx + pos.col, y: cy + screenRow };
  }
  return null;
}

/** Get the cursor offset for a TextInput (framework-managed). */
export function getTextInputCursor(props: TextInputProps): number {
  const stored = textInputCursors.get(props.onChange);
  if (stored === undefined) return props.value.length;
  // Clamp to value length — the app may have cleared or shortened the value
  // externally (e.g. after submit) while the WeakMap still holds the old cursor.
  return Math.min(stored, props.value.length);
}

/** Set the cursor offset for a TextInput. */
export function setTextInputCursor(
  props: TextInputProps,
  cursor: number,
): void {
  textInputCursors.set(props.onChange, cursor);
}

/** Get the scroll offset for a TextInput (framework-managed). */
export function getTextInputScroll(props: TextInputProps): number {
  return textInputScrolls.get(props.onChange) ?? 0;
}

/** Set the scroll offset for a TextInput. */
export function setTextInputScroll(
  props: TextInputProps,
  scroll: number,
): void {
  textInputScrolls.set(props.onChange, scroll);
}
