import type { Node, Color } from "@cel-tui/types";
import type { Cell } from "./cell-buffer.js";
import { CellBuffer } from "./cell-buffer.js";

/**
 * Paint a node into the cell buffer within the given rect.
 *
 * This is a minimal implementation for phase 2 — handles Text nodes
 * with basic styling. Layout engine will replace the hardcoded rect
 * passing in phase 3.
 *
 * @param node - The node to paint.
 * @param buf - Target cell buffer.
 * @param x - Left edge of the rect.
 * @param y - Top edge of the rect.
 * @param w - Width of the rect.
 * @param h - Height of the rect.
 */
export function paintNode(
  node: Node,
  buf: CellBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  switch (node.type) {
    case "text":
      paintText(node.content, node.props, buf, x, y, w, h);
      break;
    case "vstack":
      paintVStack(node, buf, x, y, w, h);
      break;
    case "hstack":
      paintHStack(node, buf, x, y, w, h);
      break;
    case "textinput":
      // TODO: implement in phase 7
      break;
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
  props: Node extends { type: "text"; props: infer P } ? P : never,
  buf: CellBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // Handle repeat: "fill"
  let text = content;
  if (props.repeat === "fill" && content.length > 0) {
    text = content.repeat(Math.ceil(w / content.length)).slice(0, w);
  } else if (typeof props.repeat === "number" && props.repeat > 0) {
    text = content.repeat(props.repeat);
  }

  // Split into lines (preserve \n)
  const lines = text.split("\n");

  for (let row = 0; row < lines.length && row < h; row++) {
    const line = lines[row]!;
    for (let col = 0; col < line.length && col < w; col++) {
      buf.set(x + col, y + row, makeCell(line[col]!, props));
    }
  }
}

/**
 * Minimal VStack painter — divides height equally among children.
 * Will be replaced by the proper layout engine in phase 3.
 */
function paintVStack(
  node: Extract<Node, { type: "vstack" }>,
  buf: CellBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (node.children.length === 0) return;

  // Simple equal distribution for now
  const childHeight = Math.floor(h / node.children.length);
  let currentY = y;

  for (let i = 0; i < node.children.length; i++) {
    const ch = i === node.children.length - 1 ? y + h - currentY : childHeight;
    paintNode(node.children[i]!, buf, x, currentY, w, ch);
    currentY += ch;
  }
}

/**
 * Minimal HStack painter — divides width equally among children.
 * Will be replaced by the proper layout engine in phase 3.
 */
function paintHStack(
  node: Extract<Node, { type: "hstack" }>,
  buf: CellBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (node.children.length === 0) return;

  const childWidth = Math.floor(w / node.children.length);
  let currentX = x;

  for (let i = 0; i < node.children.length; i++) {
    const cw = i === node.children.length - 1 ? x + w - currentX : childWidth;
    paintNode(node.children[i]!, buf, currentX, y, cw, h);
    currentX += cw;
  }
}
