import { visibleWidthFromColumn } from "./width.js";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const whitespaceRegex = /^\s+$/u;
const TEXT_LINE_COUNT_CACHE_SIZE = 2048;

type WrapMode = "none" | "word";

export interface VisualLine {
  text: string;
  startOffset: number;
  endOffset: number;
  width: number;
}

export interface VisualPosition {
  line: number;
  col: number;
}

export interface TextLayoutResult {
  lines: VisualLine[];
  lineCount: number;
  offsetToPosition(offset: number): VisualPosition;
  positionToOffset(line: number, col: number): number;
}

interface GraphemeInfo {
  text: string;
  startOffset: number;
  endOffset: number;
  width: number;
  isWhitespace: boolean;
}

interface VisualLineData {
  line: VisualLine;
  graphemes: GraphemeInfo[];
}

interface Range {
  start: number;
  end: number;
}

interface LineCountCacheEntry {
  none?: number;
  wordByWidth?: Map<number, number>;
}

const lineCountCache = new Map<string, LineCountCacheEntry>();

/** Clear text measurement caches. Useful for cold-cache benchmarks. */
export function clearTextMeasurementCaches(): void {
  lineCountCache.clear();
}

function requiredAt<T>(
  items: readonly T[],
  index: number,
  description: string,
): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Missing ${description} at index ${index}`);
  }
  return item;
}

/**
 * Measure the number of visual lines a string occupies for the given width and
 * wrap mode. This avoids constructing the full `TextLayoutResult` when callers
 * only need line count.
 */
export function measureTextLineCount(
  value: string,
  width: number,
  wrap: WrapMode,
): number {
  const normalizedWidth = Math.max(1, width);
  const cached = getCachedLineCount(value, normalizedWidth, wrap);
  if (cached !== undefined) return cached;

  const lineCount =
    wrap === "word"
      ? measureWrappedLineCount(value, normalizedWidth)
      : countHardLines(value);

  cacheLineCount(value, normalizedWidth, wrap, lineCount);
  return lineCount;
}

export function layoutText(
  value: string,
  width: number,
  wrap: WrapMode,
): TextLayoutResult {
  const hardLines = splitHardLines(value);
  const lines: VisualLineData[] = [];

  for (const hardLine of hardLines) {
    const graphemes = segmentLine(value, hardLine.start, hardLine.end);
    if (wrap === "word") {
      lines.push(
        ...wrapGraphemes(value, graphemes, Math.max(1, width), hardLine),
      );
    } else {
      lines.push(
        ...buildVisualLines(
          value,
          graphemes,
          [[0, graphemes.length]],
          hardLine,
        ),
      );
    }
  }

  if (lines.length === 0) {
    const empty: VisualLineData = {
      line: { text: "", startOffset: 0, endOffset: 0, width: 0 },
      graphemes: [],
    };
    lines.push(empty);
  }

  return {
    lines: lines.map((entry) => entry.line),
    lineCount: lines.length,
    offsetToPosition(offset: number): VisualPosition {
      return offsetToPosition(lines, clamp(offset, 0, value.length));
    },
    positionToOffset(line: number, col: number): number {
      return positionToOffset(lines, line, col);
    },
  };
}

function countHardLines(value: string): number {
  let lineCount = 1;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "\n") {
      lineCount++;
    }
  }
  return lineCount;
}

function getCachedLineCount(
  value: string,
  width: number,
  wrap: WrapMode,
): number | undefined {
  const entry = lineCountCache.get(value);
  if (entry === undefined) return undefined;
  if (wrap === "none") return entry.none;
  return entry.wordByWidth?.get(width);
}

function cacheLineCount(
  value: string,
  width: number,
  wrap: WrapMode,
  lineCount: number,
): void {
  let entry = lineCountCache.get(value);
  if (entry === undefined) {
    if (lineCountCache.size >= TEXT_LINE_COUNT_CACHE_SIZE) {
      const firstKey = lineCountCache.keys().next().value;
      if (firstKey !== undefined) {
        lineCountCache.delete(firstKey);
      }
    }
    entry = {};
    lineCountCache.set(value, entry);
  }

  if (wrap === "none") {
    entry.none = lineCount;
    return;
  }

  if (entry.wordByWidth === undefined) {
    entry.wordByWidth = new Map();
  }
  entry.wordByWidth.set(width, lineCount);
}

function measureWrappedLineCount(value: string, width: number): number {
  let lineCount = 0;
  for (const hardLine of splitHardLines(value)) {
    lineCount += measureWrappedHardLine(
      value,
      hardLine.start,
      hardLine.end,
      width,
    );
  }
  return lineCount;
}

function measureWrappedHardLine(
  value: string,
  start: number,
  end: number,
  width: number,
): number {
  if (start === end) {
    return 1;
  }

  const widths: number[] = [];
  const whitespace: boolean[] = [];
  const text = value.slice(start, end);
  let col = 0;

  for (const { segment } of segmenter.segment(text)) {
    const segmentWidth = visibleWidthFromColumn(segment, col);
    widths.push(segmentWidth);
    whitespace.push(whitespaceRegex.test(segment));
    col += segmentWidth;
  }

  if (col <= width) {
    return 1;
  }

  let lineCount = 0;
  let lineStart = 0;

  while (lineStart < widths.length) {
    let lineEnd = lineStart;
    let lineWidth = 0;
    let lastBreak = -1;

    while (lineEnd < widths.length) {
      const segmentWidth = widths[lineEnd];
      if (segmentWidth === undefined) {
        break;
      }
      const nextWidth = lineWidth + segmentWidth;
      if (nextWidth > width) break;
      lineWidth = nextWidth;
      lineEnd++;
      if (whitespace[lineEnd - 1]) {
        lastBreak = lineEnd;
      }
    }

    lineCount++;

    if (lineEnd >= widths.length) {
      break;
    }

    if (lineEnd === lineStart) {
      lineStart++;
      continue;
    }

    lineStart = lastBreak > lineStart ? lastBreak : lineEnd;
  }

  return lineCount;
}

function splitHardLines(value: string): Range[] {
  const lines: Range[] = [];
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "\n") {
      lines.push({ start, end: i });
      start = i + 1;
    }
  }
  lines.push({ start, end: value.length });
  return lines;
}

function segmentLine(
  value: string,
  start: number,
  end: number,
): GraphemeInfo[] {
  const graphemes: GraphemeInfo[] = [];
  const text = value.slice(start, end);
  let offset = start;
  let col = 0;

  for (const { segment } of segmenter.segment(text)) {
    const width = visibleWidthFromColumn(segment, col);
    graphemes.push({
      text: segment,
      startOffset: offset,
      endOffset: offset + segment.length,
      width,
      isWhitespace: whitespaceRegex.test(segment),
    });
    offset += segment.length;
    col += width;
  }

  return graphemes;
}

function wrapGraphemes(
  value: string,
  graphemes: GraphemeInfo[],
  width: number,
  hardLine: Range,
): VisualLineData[] {
  if (graphemes.length === 0) {
    return [makeVisualLine(value, graphemes, 0, 0, hardLine.start)];
  }

  const prefixWidths = [0];
  for (const grapheme of graphemes) {
    const previousWidth = requiredAt(
      prefixWidths,
      prefixWidths.length - 1,
      "prefix width",
    );
    prefixWidths.push(previousWidth + grapheme.width);
  }

  const ranges: Array<[number, number]> = [];
  let lineStart = 0;

  while (lineStart < graphemes.length) {
    let lineEnd = lineStart;
    let lastBreak = -1;

    while (lineEnd < graphemes.length) {
      const nextWidth =
        requiredAt(prefixWidths, lineEnd + 1, "prefix width") -
        requiredAt(prefixWidths, lineStart, "prefix width");
      if (nextWidth > width) break;
      lineEnd++;
      if (requiredAt(graphemes, lineEnd - 1, "grapheme").isWhitespace) {
        lastBreak = lineEnd;
      }
    }

    if (lineEnd >= graphemes.length) {
      ranges.push([lineStart, graphemes.length]);
      break;
    }

    if (lineEnd === lineStart) {
      ranges.push([lineStart, lineStart + 1]);
      lineStart++;
      continue;
    }

    if (lastBreak > lineStart) {
      ranges.push([lineStart, lastBreak]);
      lineStart = lastBreak;
      continue;
    }

    ranges.push([lineStart, lineEnd]);
    lineStart = lineEnd;
  }

  return buildVisualLines(value, graphemes, ranges, hardLine);
}

function buildVisualLines(
  value: string,
  graphemes: GraphemeInfo[],
  ranges: Array<[number, number]>,
  hardLine: Range,
): VisualLineData[] {
  return ranges.map(([startIndex, endIndex]) =>
    makeVisualLine(value, graphemes, startIndex, endIndex, hardLine.start),
  );
}

function makeVisualLine(
  value: string,
  graphemes: GraphemeInfo[],
  startIndex: number,
  endIndex: number,
  hardLineStart: number,
): VisualLineData {
  if (startIndex === endIndex) {
    return {
      line: {
        text: "",
        startOffset: hardLineStart,
        endOffset: hardLineStart,
        width: 0,
      },
      graphemes: [],
    };
  }

  const lineGraphemes = graphemes.slice(startIndex, endIndex);
  const startOffset = requiredAt(lineGraphemes, 0, "line grapheme").startOffset;
  const endOffset = requiredAt(
    lineGraphemes,
    lineGraphemes.length - 1,
    "line grapheme",
  ).endOffset;

  return {
    line: {
      text: value.slice(startOffset, endOffset),
      startOffset,
      endOffset,
      width: lineGraphemes.reduce((sum, grapheme) => sum + grapheme.width, 0),
    },
    graphemes: lineGraphemes,
  };
}

function offsetToPosition(
  lines: VisualLineData[],
  offset: number,
): VisualPosition {
  for (let i = 1; i < lines.length; i++) {
    if (offset === requiredAt(lines, i, "visual line").line.startOffset) {
      return { line: i, col: 0 };
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const entry = requiredAt(lines, i, "visual line");
    const { line, graphemes } = entry;
    if (offset < line.startOffset || offset > line.endOffset) continue;

    let col = 0;
    for (const grapheme of graphemes) {
      if (offset <= grapheme.startOffset) break;
      if (offset < grapheme.endOffset) break;
      col += grapheme.width;
    }
    return { line: i, col };
  }

  const last = requiredAt(lines, lines.length - 1, "visual line");
  return { line: lines.length - 1, col: last.line.width };
}

function positionToOffset(
  lines: VisualLineData[],
  line: number,
  col: number,
): number {
  const lineIndex = clamp(line, 0, lines.length - 1);
  const entry = requiredAt(lines, lineIndex, "visual line");
  const targetCol = Math.max(0, col);

  if (targetCol === 0 || entry.graphemes.length === 0) {
    return entry.line.startOffset;
  }

  let currentCol = 0;
  for (const grapheme of entry.graphemes) {
    const nextCol = currentCol + grapheme.width;
    if (targetCol < nextCol) {
      return targetCol - currentCol < nextCol - targetCol
        ? grapheme.startOffset
        : grapheme.endOffset;
    }
    if (targetCol === nextCol) {
      return grapheme.endOffset;
    }
    currentCol = nextCol;
  }

  return entry.line.endOffset;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
