import { visibleWidthFromColumn } from "./width.js";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

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

export function layoutText(
  value: string,
  width: number,
  wrap: "none" | "word",
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
      isWhitespace: /^\s+$/u.test(segment),
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
