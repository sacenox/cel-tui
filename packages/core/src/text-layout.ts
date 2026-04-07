import { visibleWidth } from "./width.js";

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

  for (const { segment } of segmenter.segment(text)) {
    graphemes.push({
      text: segment,
      startOffset: offset,
      endOffset: offset + segment.length,
      width: visibleWidth(segment),
      isWhitespace: /^\s+$/u.test(segment),
    });
    offset += segment.length;
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
    prefixWidths.push(prefixWidths[prefixWidths.length - 1]! + grapheme.width);
  }

  const ranges: Array<[number, number]> = [];
  let lineStart = 0;

  while (lineStart < graphemes.length) {
    let lineEnd = lineStart;
    let lastBreak = -1;

    while (lineEnd < graphemes.length) {
      const nextWidth = prefixWidths[lineEnd + 1]! - prefixWidths[lineStart]!;
      if (nextWidth > width) break;
      lineEnd++;
      if (graphemes[lineEnd - 1]!.isWhitespace) {
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
  const startOffset = lineGraphemes[0]!.startOffset;
  const endOffset = lineGraphemes[lineGraphemes.length - 1]!.endOffset;

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
    if (offset === lines[i]!.line.startOffset) {
      return { line: i, col: 0 };
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const entry = lines[i]!;
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

  const last = lines[lines.length - 1]!;
  return { line: lines.length - 1, col: last.line.width };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
