import type { Node, ContainerProps, SizeValue } from "@cel-tui/types";

/**
 * A rectangle in absolute screen coordinates.
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A node in the layout tree with computed position and size.
 */
export interface LayoutNode {
  /** The original UI node. */
  node: Node;
  /** Computed absolute screen rect. */
  rect: Rect;
  /** Laid-out children (empty for leaf nodes). */
  children: LayoutNode[];
}

// --- Helpers ---

function resolveSizeValue(
  value: SizeValue | undefined,
  parentSize: number,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return value;
  const match = value.match(/^(\d+(?:\.\d+)?)%$/);
  if (match) return Math.floor((parentSize * parseFloat(match[1]!)) / 100);
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getProps(node: Node): ContainerProps | null {
  if (node.type === "text") return null;
  return node.props;
}

// --- Intrinsic size computation ---

/**
 * Compute intrinsic main-axis size for a node (before layout).
 * Used by the parent to determine how much space to allocate.
 */
function intrinsicMainSize(
  node: Node,
  isVertical: boolean,
  crossSize: number,
): number {
  if (node.type === "text") {
    if (isVertical) {
      // Height = number of lines
      if (node.content.length === 0) return 1;
      const lines = node.content.split("\n");
      if (node.props.wrap === "word") {
        let total = 0;
        for (const line of lines) {
          total += Math.max(1, Math.ceil(line.length / Math.max(1, crossSize)));
        }
        return total;
      }
      return lines.length;
    }
    // Width (intrinsic)
    if (node.props.repeat === "fill") return 0;
    const lines = node.content.split("\n");
    let maxW = 0;
    for (const line of lines) {
      if (line.length > maxW) maxW = line.length;
    }
    if (typeof node.props.repeat === "number") maxW *= node.props.repeat;
    return maxW;
  }

  if (node.type === "textinput") {
    if (isVertical) {
      const val = node.props.value || "";
      if (val.length === 0) return 1;
      const lines = val.split("\n");
      let total = 0;
      for (const line of lines) {
        total += Math.max(1, Math.ceil(line.length / Math.max(1, crossSize)));
      }
      return total;
    }
    return 0;
  }

  // Container: compute intrinsic size along the requested axis.
  // If the requested axis matches the container's main axis, sum children + gaps.
  // If it's the cross axis, take the max of children on that axis.
  const props = node.props;
  const gap = props.gap ?? 0;
  const containerIsVertical = node.type === "vstack";
  const axisMatchesMain = isVertical === containerIsVertical;

  const padMain = isVertical
    ? (props.padding?.y ?? 0) * 2
    : (props.padding?.x ?? 0) * 2;
  const padCross = isVertical
    ? (props.padding?.x ?? 0) * 2
    : (props.padding?.y ?? 0) * 2;
  const innerCross = Math.max(0, crossSize - padCross);

  if (axisMatchesMain) {
    // Sum children along the main axis + gaps
    let total = 0;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]!;
      const cProps = getProps(child);

      let childMain: number;
      if (isVertical) {
        childMain =
          resolveSizeValue(cProps?.height, 0) ??
          intrinsicMainSize(child, true, innerCross);
      } else {
        childMain =
          resolveSizeValue(cProps?.width, 0) ??
          intrinsicMainSize(child, false, innerCross);
      }
      total += childMain;
      if (i < node.children.length - 1) total += gap;
    }
    return total + padMain;
  }

  // Cross axis: max of children on the requested axis
  let maxSize = 0;
  for (const child of node.children) {
    const cProps = getProps(child);

    let childSize: number;
    if (isVertical) {
      childSize =
        resolveSizeValue(cProps?.height, 0) ??
        intrinsicMainSize(child, true, innerCross);
    } else {
      childSize =
        resolveSizeValue(cProps?.width, 0) ??
        intrinsicMainSize(child, false, innerCross);
    }
    if (childSize > maxSize) maxSize = childSize;
  }
  return maxSize + padMain;
}

// --- Largest remainder rounding ---

function largestRemainder(fractions: number[], total: number): number[] {
  const floored = fractions.map(Math.floor);
  let remainder = total - floored.reduce((a, b) => a + b, 0);

  const indices = fractions
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  for (const { i } of indices) {
    if (remainder <= 0) break;
    floored[i]!++;
    remainder--;
  }

  return floored;
}

// --- Main layout ---

/**
 * Compute the layout for a UI tree.
 *
 * @param root - The root UI node.
 * @param availWidth - Available width (typically terminal columns).
 * @param availHeight - Available height (typically terminal rows).
 * @returns Layout tree with computed rects.
 */
export function layout(
  root: Node,
  availWidth: number,
  availHeight: number,
): LayoutNode {
  // Resolve root's own size against the viewport
  const rootProps = getProps(root);
  const rootW = resolveSizeValue(rootProps?.width, availWidth) ?? availWidth;
  const rootH = resolveSizeValue(rootProps?.height, availHeight) ?? availHeight;
  return layoutNode(root, 0, 0, rootW, rootH);
}

/**
 * Layout a node within the given available space.
 * Resolves the node's own explicit size (if any) against available space,
 * then lays out children within that.
 */
function layoutNode(
  node: Node,
  x: number,
  y: number,
  availWidth: number,
  availHeight: number,
): LayoutNode {
  // Resolve own dimensions: explicit size wins, otherwise fill available.
  // Note: for children, the parent has already resolved sizing and passes
  // the result as availWidth/availHeight. We only re-resolve for the root
  // node (where available space = viewport, not pre-resolved).
  const width = availWidth;
  const height = availHeight;
  const rect: Rect = { x, y, width, height };

  // Leaf nodes
  if (node.type === "text" || node.type === "textinput") {
    return { node, rect, children: [] };
  }

  // Container nodes
  const props = node.props;
  const isVertical = node.type === "vstack";
  const children = node.children;

  if (children.length === 0) {
    return { node, rect, children: [] };
  }

  // Padding
  const padX = props.padding?.x ?? 0;
  const padY = props.padding?.y ?? 0;
  const innerX = x + padX;
  const innerY = y + padY;
  const innerW = Math.max(0, width - padX * 2);
  const innerH = Math.max(0, height - padY * 2);

  // Gap
  const gap = props.gap ?? 0;
  const totalGap = gap * (children.length - 1);
  const mainAvail = (isVertical ? innerH : innerW) - totalGap;

  // --- Measure phase: compute each child's main-axis and cross-axis size ---
  type ChildInfo = {
    node: Node;
    mainSize: number;
    crossSize: number;
    flex: number;
  };
  const infos: ChildInfo[] = [];
  let fixedMain = 0;
  let totalFlex = 0;

  for (const child of children) {
    const cProps = getProps(child);
    const flex = cProps?.flex ?? 0;

    if (flex > 0) {
      totalFlex += flex;
      // Cross-axis
      const cross = isVertical
        ? (resolveSizeValue(cProps?.width, innerW) ?? innerW)
        : (resolveSizeValue(cProps?.height, innerH) ?? innerH);
      infos.push({ node: child, mainSize: 0, crossSize: cross, flex });
    } else {
      // Main-axis: explicit → percentage → intrinsic
      let main: number;
      let cross: number;
      if (isVertical) {
        main =
          resolveSizeValue(cProps?.height, innerH) ??
          intrinsicMainSize(child, true, innerW);
        cross = resolveSizeValue(cProps?.width, innerW) ?? innerW;
      } else {
        main =
          resolveSizeValue(cProps?.width, innerW) ??
          intrinsicMainSize(child, false, innerH);
        cross = resolveSizeValue(cProps?.height, innerH) ?? innerH;
      }

      // Apply constraints
      if (cProps) {
        const minMain = isVertical
          ? (cProps.minHeight ?? 0)
          : (cProps.minWidth ?? 0);
        const maxMain = isVertical
          ? (cProps.maxHeight ?? Infinity)
          : (cProps.maxWidth ?? Infinity);
        main = clamp(main, minMain, maxMain);
      }

      fixedMain += main;
      infos.push({ node: child, mainSize: main, crossSize: cross, flex });
    }
  }

  // --- Flex distribution ---
  const flexSpace = Math.max(0, mainAvail - fixedMain);

  if (totalFlex > 0) {
    const flexInfos = infos.filter((c) => c.flex > 0);
    const rawSizes = flexInfos.map((c) => (c.flex / totalFlex) * flexSpace);
    const rounded = largestRemainder(rawSizes, flexSpace);

    for (let i = 0; i < flexInfos.length; i++) {
      let size = rounded[i]!;
      const cProps = getProps(flexInfos[i]!.node);
      if (cProps) {
        const minMain = isVertical
          ? (cProps.minHeight ?? 0)
          : (cProps.minWidth ?? 0);
        const maxMain = isVertical
          ? (cProps.maxHeight ?? Infinity)
          : (cProps.maxWidth ?? Infinity);
        size = clamp(size, minMain, maxMain);
      }
      flexInfos[i]!.mainSize = size;
    }
  }

  // --- Position phase ---
  const layoutChildren: LayoutNode[] = [];
  let mainOffset = 0;

  for (let i = 0; i < infos.length; i++) {
    const info = infos[i]!;
    const childX = isVertical ? innerX : innerX + mainOffset;
    const childY = isVertical ? innerY + mainOffset : innerY;
    const childW = isVertical ? info.crossSize : info.mainSize;
    const childH = isVertical ? info.mainSize : info.crossSize;

    layoutChildren.push(layoutNode(info.node, childX, childY, childW, childH));

    mainOffset += info.mainSize;
    if (i < infos.length - 1) mainOffset += gap;
  }

  // --- Intrinsic container sizing ---
  // If no explicit main-axis size, shrink to fit children
  const hasExplicitMain = isVertical
    ? props.height !== undefined || props.flex !== undefined
    : props.width !== undefined || props.flex !== undefined;

  if (!hasExplicitMain) {
    const contentMain = mainOffset + (isVertical ? padY * 2 : padX * 2);
    if (isVertical) {
      rect.height = contentMain;
    } else {
      rect.width = contentMain;
    }
  }

  return { node, rect, children: layoutChildren };
}
