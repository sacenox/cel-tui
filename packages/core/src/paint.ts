import type {
  Color,
  ScrollbarPartStyle,
  StateKey,
  StyleProps,
  TextInputProps,
} from "@cel-tui/types";
import type { Cell, CellBuffer } from "./cell-buffer.js";
import type { LayoutNode, Rect } from "./layout.js";
import { getMaxScrollOffset } from "./scroll.js";
import { clampCursorToGraphemeBoundary } from "./text-edit.js";
import { layoutText } from "./text-layout.js";
import { visibleWidth, visibleWidthFromColumn } from "./width.js";

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
  paintLayoutNode(root, buf, root.rect, EMPTY_STYLE, 0, 0);
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
  buf.fill(fill.x, fill.y, fill.width, fill.height, {
    char: " ",
    fgColor: null,
    bgColor,
    bold: false,
    italic: false,
    underline: false,
  });
}

function paintLayoutNode(
  ln: LayoutNode,
  buf: CellBuffer,
  clipRect: Rect,
  inherited: StyleProps,
  offsetX: number,
  offsetY: number,
): void {
  const { node } = ln;
  const rect =
    offsetX === 0 && offsetY === 0
      ? ln.rect
      : {
          x: ln.rect.x + offsetX,
          y: ln.rect.y + offsetY,
          width: ln.rect.width,
          height: ln.rect.height,
        };

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
        ...tiEffective,
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
    const childOffsetX =
      offsetX + (isScrollable && !isVertical ? -scrollOffset : 0);
    const childOffsetY =
      offsetY + (isScrollable && isVertical ? -scrollOffset : 0);
    paintLayoutNode(
      child,
      buf,
      clipped,
      childInherited,
      childOffsetX,
      childOffsetY,
    );
  }

  // Paint scrollbar if enabled
  if (isScrollable && containerProps.scrollbar) {
    paintScrollbar(ln, rect, scrollOffset, buf, clipped);
  }
}

/**
 * Paint a scrollbar indicator for a scrollable container.
 */
function paintScrollbar(
  ln: LayoutNode,
  rect: Rect,
  scrollOffset: number,
  buf: CellBuffer,
  clipRect: Rect,
): void {
  const { children } = ln;
  const layoutRect = ln.rect;
  const isVertical = ln.node.type === "vstack";
  const props =
    ln.node.type === "vstack" || ln.node.type === "hstack"
      ? ln.node.props
      : null;
  if (!props) return;
  const thumbStyle = props.scrollbarStyle?.thumb;
  const trackStyle = props.scrollbarStyle?.track;

  if (isVertical) {
    // Compute total scrollable height from children plus bottom padding.
    // Child positions already include top padding, so add only the trailing pad.
    let contentHeight = 0;
    for (const child of children) {
      const childBottom = child.rect.y + child.rect.height - layoutRect.y;
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
      buf.set(
        barX,
        absY,
        scrollbarCell(
          isThumb ? thumbStyle : trackStyle,
          isThumb ? "┃" : "│",
          isThumb ? null : "color08",
        ),
      );
    }
  } else {
    // Horizontal scrollbar
    let contentWidth = 0;
    for (const child of children) {
      const childRight = child.rect.x + child.rect.width - layoutRect.x;
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
      buf.set(
        absX,
        barY,
        scrollbarCell(
          isThumb ? thumbStyle : trackStyle,
          isThumb ? "━" : "─",
          isThumb ? null : "color08",
        ),
      );
    }
  }
}

function scrollbarCell(
  style: ScrollbarPartStyle | undefined,
  defaultChar: string,
  defaultFgColor: Color | null,
): Cell {
  const char = style?.char ?? defaultChar;
  if (visibleWidth(char) !== 1) {
    throw new Error(
      "Scrollbar characters must occupy exactly one terminal column",
    );
  }
  return {
    char,
    fgColor: style?.fgColor ?? defaultFgColor,
    bgColor: style?.bgColor ?? null,
    bold: style?.bold ?? false,
    italic: style?.italic ?? false,
    underline: style?.underline ?? false,
  };
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
 * Correctly handles wide characters (CJK, emoji) and tab expansion by
 * advancing the column by each segment's visible width. Respects the clip rect.
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

  // Printable ASCII is overwhelmingly the common terminal path. It maps
  // one-to-one to cells, so avoid Intl.Segmenter and width lookups entirely.
  let isPrintableAscii = true;
  for (let i = 0; i < line.length; i++) {
    const code = line.charCodeAt(i);
    if (code < 0x20 || code > 0x7e) {
      isPrintableAscii = false;
      break;
    }
  }
  if (isPrintableAscii) {
    const start = Math.max(0, clipLeft - x);
    const end = Math.min(line.length, maxWidth, clipRight - x);
    for (let col = start; col < end; col++) {
      const char = line[col];
      if (char !== undefined) buf.set(x + col, y, makeCell(char, props));
    }
    return;
  }

  let col = 0;
  for (const { segment } of segmenter.segment(line)) {
    const gw = visibleWidthFromColumn(segment, col);
    if (gw === 0) continue;

    const absX = x + col;
    if (absX >= clipRight) break;

    if (segment === "\t") {
      const visibleColumns = Math.min(gw, Math.max(0, maxWidth - col));
      for (let w = 0; w < visibleColumns; w++) {
        const cx = absX + w;
        if (cx >= clipLeft && cx < clipRight) {
          buf.set(cx, y, makeCell(" ", props));
        }
      }
      col += gw;
      if (col >= maxWidth) break;
      continue;
    }

    if (col + gw > maxWidth) break;
    // Wide graphemes are atomic. If either their lead or a continuation would
    // fall outside the active clip, omit the whole glyph rather than creating
    // an orphaned half that shifts subsequent terminal output.
    if (absX < clipLeft) {
      col += gw;
      continue;
    }
    if (absX + gw > clipRight) break;

    buf.set(absX, y, makeCell(segment, props));
    for (let w = 1; w < gw; w++) {
      buf.set(absX + w, y, makeCell("", props));
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
      if (content.includes("\t")) {
        text = "";
        while (visibleWidth(text) < w) {
          text += content;
        }
      } else {
        text = content.repeat(Math.ceil(w / contentW));
      }
    }
  } else if (typeof props.repeat === "number" && props.repeat > 0) {
    text = content.repeat(props.repeat);
  }

  // No-wrap text without ANSI only needs hard-line splitting. The full text
  // layout is reserved for wrapping and ANSI stripping.
  if ((props.wrap ?? "none") === "none" && !text.includes("\x1b")) {
    const lines = text.split("\n");
    for (let row = 0; row < lines.length && row < h; row++) {
      const line = lines[row];
      if (line === undefined) break;
      paintLineGraphemes(line, x, y + row, w, clipRect, props, buf);
    }
    return;
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

function resolveTextInputScrollOffset(
  props: TextInputProps,
  lineCount: number,
  viewportHeight: number,
  cursorLine: number,
): number {
  const maxOffset = Math.max(0, lineCount - viewportHeight);
  let scrollOffset = Math.max(
    0,
    Math.min(getTextInputScroll(props), maxOffset),
  );

  if (props.focused) {
    if (cursorLine >= scrollOffset + viewportHeight) {
      scrollOffset = cursorLine - viewportHeight + 1;
    }
    if (cursorLine < scrollOffset) {
      scrollOffset = cursorLine;
    }
  }

  setTextInputScroll(props, scrollOffset);
  return scrollOffset;
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
  const cursorOffset = getTextInputCursor(props);
  const cursorPos = textLayout.offsetToPosition(cursorOffset);
  const scrollOffset = resolveTextInputScrollOffset(
    props,
    textLayout.lineCount,
    ch,
    cursorPos.line,
  );

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
    const screenRow = cursorPos.line - scrollOffset;
    if (screenRow >= 0 && screenRow < ch && cursorPos.col < cw) {
      const absX = cx + cursorPos.col;
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
        switch (props.cursorStyle ?? "block") {
          case "block":
            buf.set(absX, absY, {
              char: existing.char,
              fgColor: resolvedBg,
              bgColor: resolvedFg,
              bold: existing.bold,
              italic: existing.italic,
              underline: existing.underline,
            });
            break;
          case "bar":
            buf.set(absX, absY, {
              char: "│",
              fgColor: resolvedFg,
              bgColor: existing.bgColor,
              bold: existing.bold,
              italic: existing.italic,
              underline: existing.underline,
            });
            break;
          case "underline":
            buf.set(absX, absY, {
              ...existing,
              underline: true,
            });
            break;
        }
      }
    }
  }
}

// --- Framework-managed state ---

/** Explicit stateKey storage plus the legacy onChange-reference fallback. */
type OnChangeFn = (value: string) => void;
type TextInputState = { value: string; cursor: number };
let textInputStates = new WeakMap<OnChangeFn, TextInputState>();
let textInputScrolls = new WeakMap<OnChangeFn, number>();
const keyedTextInputStates = new Map<StateKey, TextInputState>();
const keyedTextInputScrolls = new Map<StateKey, number>();

function getStoredTextInputState(
  props: TextInputProps,
): TextInputState | undefined {
  return props.stateKey === undefined
    ? textInputStates.get(props.onChange)
    : keyedTextInputStates.get(props.stateKey);
}

function storeTextInputState(
  props: TextInputProps,
  state: TextInputState,
): void {
  if (props.stateKey === undefined) {
    textInputStates.set(props.onChange, state);
  } else {
    keyedTextInputStates.set(props.stateKey, state);
  }
}

/** Retain keyed TextInput state only for keys mounted in the current frame. */
export function retainTextInputStateKeys(keys: ReadonlySet<StateKey>): void {
  for (const key of keyedTextInputStates.keys()) {
    if (!keys.has(key)) keyedTextInputStates.delete(key);
  }
  for (const key of keyedTextInputScrolls.keys()) {
    if (!keys.has(key)) keyedTextInputScrolls.delete(key);
  }
}

/** Clear framework-managed TextInput state between runtime lifecycles. */
export function resetTextInputState(): void {
  textInputStates = new WeakMap();
  textInputScrolls = new WeakMap();
  keyedTextInputStates.clear();
  keyedTextInputScrolls.clear();
}

function clampCursor(cursor: number, value: string): number {
  return clampCursorToGraphemeBoundary(value, cursor);
}

/**
 * Remap a stored cursor through an external value change by anchoring it to the
 * unchanged prefix/suffix around the edit. Insertions at the cursor land after
 * the inserted text; edits strictly after the cursor leave it untouched.
 */
function remapCursorOffset(
  previousValue: string,
  previousCursor: number,
  nextValue: string,
): number {
  const cursor = clampCursor(previousCursor, previousValue);
  if (previousValue === nextValue) return clampCursor(cursor, nextValue);

  let prefix = 0;
  const maxPrefix = Math.min(previousValue.length, nextValue.length);
  while (
    prefix < maxPrefix &&
    previousValue.charCodeAt(prefix) === nextValue.charCodeAt(prefix)
  ) {
    prefix++;
  }

  let previousEnd = previousValue.length;
  let nextEnd = nextValue.length;
  while (
    previousEnd > prefix &&
    nextEnd > prefix &&
    previousValue.charCodeAt(previousEnd - 1) ===
      nextValue.charCodeAt(nextEnd - 1)
  ) {
    previousEnd--;
    nextEnd--;
  }

  if (cursor < prefix) return cursor;
  if (cursor > previousEnd) {
    return clampCursor(cursor + (nextEnd - previousEnd), nextValue);
  }
  return nextEnd;
}

function getTextInputState(props: TextInputProps): TextInputState {
  const stored = getStoredTextInputState(props);
  if (stored === undefined) {
    const initial = { value: props.value, cursor: props.value.length };
    storeTextInputState(props, initial);
    return initial;
  }

  if (stored.value === props.value) {
    const clampedCursor = clampCursor(stored.cursor, props.value);
    if (clampedCursor === stored.cursor) return stored;

    const clampedState = { value: props.value, cursor: clampedCursor };
    storeTextInputState(props, clampedState);
    return clampedState;
  }

  const syncedState = {
    value: props.value,
    cursor: clampCursor(
      remapCursorOffset(stored.value, stored.cursor, props.value),
      props.value,
    ),
  };
  storeTextInputState(props, syncedState);
  return syncedState;
}

/**
 * Compute the screen position of the cursor for a focused TextInput.
 * Returns `{ x, y }` in 0-indexed screen coordinates, or `null` if
 * the cursor is not visible (clipped or not focused).
 */
export function getTextInputCursorScreenPos(
  props: TextInputProps,
  rect: Rect,
): { x: number; y: number } | null {
  if (!props.focused) return null;

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
  const scrollOffset = resolveTextInputScrollOffset(
    props,
    textLayout.lineCount,
    ch,
    pos.line,
  );
  const screenRow = pos.line - scrollOffset;

  if (screenRow >= 0 && screenRow < ch && pos.col < cw) {
    return { x: cx + pos.col, y: cy + screenRow };
  }
  return null;
}

/** Get the cursor offset for a TextInput (framework-managed). */
export function getTextInputCursor(props: TextInputProps): number {
  if (props.cursor !== undefined) {
    const controlled = clampCursor(props.cursor, props.value);
    storeTextInputState(props, { value: props.value, cursor: controlled });
    return controlled;
  }
  return getTextInputState(props).cursor;
}

/** Set the cursor offset for a TextInput. */
export function setTextInputCursor(
  props: TextInputProps,
  cursor: number,
  value = props.value,
): void {
  storeTextInputState(props, {
    value,
    cursor: clampCursor(cursor, value),
  });
}

/** Get the scroll offset for a TextInput (framework-managed). */
export function getTextInputScroll(props: TextInputProps): number {
  return props.stateKey === undefined
    ? (textInputScrolls.get(props.onChange) ?? 0)
    : (keyedTextInputScrolls.get(props.stateKey) ?? 0);
}

/** Set the scroll offset for a TextInput. */
export function setTextInputScroll(
  props: TextInputProps,
  scroll: number,
): void {
  if (props.stateKey === undefined) {
    textInputScrolls.set(props.onChange, scroll);
  } else {
    keyedTextInputScrolls.set(props.stateKey, scroll);
  }
}
