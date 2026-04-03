import type { Color } from "@cel-tui/types";
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
      // TODO: implement in phase 7
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
