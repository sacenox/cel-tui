import type { Node, ContainerProps, SizeValue } from "@cel-tui/types";
import { layoutText } from "./text-layout.js";
import { visibleWidth } from "./width.js";

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
      return layoutText(
        node.content,
        Math.max(1, crossSize),
        node.props.wrap ?? "none",
      ).lineCount;
    }
    // Width (intrinsic)
    if (node.props.repeat === "fill") return 0;
    const lines = node.content.split("\n");
    let maxW = 0;
    for (const line of lines) {
      const w = visibleWidth(line);
      if (w > maxW) maxW = w;
    }
    if (typeof node.props.repeat === "number") maxW *= node.props.repeat;
    return maxW;
  }

  if (node.type === "textinput") {
    const tiPadX = (node.props.padding?.x ?? 0) * 2;
    const tiPadY = (node.props.padding?.y ?? 0) * 2;
    if (isVertical) {
      const val = node.props.value || "";
      const innerCrossForTI = Math.max(1, crossSize - tiPadX);
      return layoutText(val, innerCrossForTI, "word").lineCount + tiPadY;
    }
    return 0 + tiPadX;
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
      if (cProps) {
        const minMain = isVertical
          ? (cProps.minHeight ?? 0)
          : (cProps.minWidth ?? 0);
        const maxMain = isVertical
          ? (cProps.maxHeight ?? Infinity)
          : (cProps.maxWidth ?? Infinity);
        childMain = clamp(childMain, minMain, maxMain);
      }
      total += childMain;
      if (i < node.children.length - 1) total += gap;
    }
    return total + padMain;
  }

  // Special case: wrapping HStack computing intrinsic height.
  // Instead of max-of-children, simulate the row layout and sum row heights.
  if (
    node.type === "hstack" &&
    (node.props as ContainerProps).flexWrap === "wrap"
  ) {
    const wrapWidths: number[] = [];
    const wrapHeights: number[] = [];
    for (const child of node.children) {
      const cProps = getProps(child);
      const flex = cProps?.flex ?? 0;
      let w: number;
      if (flex > 0) {
        w = cProps?.minWidth ?? 0;
      } else {
        w =
          resolveSizeValue(cProps?.width, innerCross) ??
          intrinsicMainSize(child, false, innerCross);
        if (cProps) {
          w = clamp(w, cProps.minWidth ?? 0, cProps.maxWidth ?? Infinity);
        }
      }
      wrapWidths.push(w);
      let h =
        resolveSizeValue(cProps?.height, 0) ??
        intrinsicMainSize(child, true, innerCross);
      if (cProps) {
        h = clamp(h, cProps.minHeight ?? 0, cProps.maxHeight ?? Infinity);
      }
      wrapHeights.push(h);
    }
    const wrapRows = assignWrapRows(wrapWidths, innerCross, gap);
    let total = 0;
    for (let ri = 0; ri < wrapRows.length; ri++) {
      let maxH = 0;
      for (const idx of wrapRows[ri]!) {
        if (wrapHeights[idx]! > maxH) maxH = wrapHeights[idx]!;
      }
      total += maxH;
      if (ri < wrapRows.length - 1) total += gap;
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
    // Apply child's cross-axis constraints (e.g. maxHeight on a TextInput
    // inside an HStack) so the container's intrinsic size respects them.
    if (cProps) {
      const minCross = isVertical
        ? (cProps.minHeight ?? 0)
        : (cProps.minWidth ?? 0);
      const maxCross = isVertical
        ? (cProps.maxHeight ?? Infinity)
        : (cProps.maxWidth ?? Infinity);
      childSize = clamp(childSize, minCross, maxCross);
    }
    if (childSize > maxSize) maxSize = childSize;
  }
  return maxSize + padMain;
}

// --- Wrap row assignment ---

/**
 * Assign children to rows for a wrapping HStack.
 * Children are placed left-to-right; when adding the next child (plus gap)
 * would exceed availWidth, a new row begins. A child wider than the
 * container still gets its own row.
 */
function assignWrapRows(
  widths: number[],
  availWidth: number,
  gap: number,
): number[][] {
  if (widths.length === 0) return [];
  const rows: number[][] = [];
  let currentRow: number[] = [];
  let rowWidth = 0;

  for (let i = 0; i < widths.length; i++) {
    const w = widths[i]!;
    if (currentRow.length === 0) {
      currentRow.push(i);
      rowWidth = w;
    } else {
      const needed = rowWidth + gap + w;
      if (needed > availWidth) {
        rows.push(currentRow);
        currentRow = [i];
        rowWidth = w;
      } else {
        currentRow.push(i);
        rowWidth = needed;
      }
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);
  return rows;
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
 * Measure a node tree's intrinsic content height at the provided width.
 *
 * This is a content-measurement helper, not a viewport/clipping helper.
 * The caller-provided `width` is the authoritative wrapping width for the
 * measured subtree. Measurement starts at the given node, ignores that
 * node's own main-axis height constraints, and walks downward through its
 * descendants. Descendant sizing rules still apply normally.
 *
 * Use this for intrinsically sized content such as scrollback/message
 * history chunks. If a wrapper's visible height is controlled by `height`,
 * `flex`, or percentage sizing, measure the content subtree inside that
 * wrapper instead.
 *
 * @example
 * ```ts
 * const addedHeight = measureContentHeight(
 *   VStack({}, olderMessages.map(renderMessage)),
 *   { width: historyContentWidth },
 * );
 *
 * scrollOffset += addedHeight;
 * ```
 */
export function measureContentHeight(
  node: Node,
  options: { width: number },
): number {
  return intrinsicMainSize(node, true, options.width);
}

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
 * Layout a wrapping HStack. Children are assigned to rows based on their
 * base widths, then each row is laid out as an independent flex context.
 */
function layoutWrapHStack(
  node: Node,
  rect: Rect,
  props: ContainerProps,
  children: Node[],
  x: number,
  y: number,
  width: number,
  height: number,
): LayoutNode {
  const gap = props.gap ?? 0;
  const align = props.alignItems ?? "stretch";
  const justify = props.justifyContent ?? "start";

  // Padding
  const padX = props.padding?.x ?? 0;
  const padY = props.padding?.y ?? 0;
  const innerX = x + padX;
  const innerY = y + padY;
  const innerW = Math.max(0, width - padX * 2);
  const innerH = Math.max(0, height - padY * 2);

  // Phase 1: Measure each child's base width and cross (height) size
  const baseWidths: number[] = [];
  const crossSizes: number[] = [];
  const flexValues: number[] = [];

  for (const child of children) {
    const cProps = getProps(child);
    const flex = cProps?.flex ?? 0;
    flexValues.push(flex);

    let baseW: number;
    if (flex > 0) {
      // Flex children use minWidth for row assignment (like CSS flex-basis)
      baseW = cProps?.minWidth ?? 0;
    } else {
      baseW =
        resolveSizeValue(cProps?.width, innerW) ??
        intrinsicMainSize(child, false, innerH);
      if (cProps) {
        baseW = clamp(baseW, cProps.minWidth ?? 0, cProps.maxWidth ?? Infinity);
      }
    }
    baseWidths.push(baseW);

    // Always compute real cross size (explicit or intrinsic) for row height
    let cross =
      resolveSizeValue(cProps?.height, innerH) ??
      intrinsicMainSize(child, true, innerW);
    // Apply cross-axis constraints (e.g. maxHeight)
    if (cProps) {
      cross = clamp(cross, cProps.minHeight ?? 0, cProps.maxHeight ?? Infinity);
    }
    crossSizes.push(cross);
  }

  // Phase 2: Assign children to rows
  const rows = assignWrapRows(baseWidths, innerW, gap);

  // Phase 3: Layout each row independently
  const layoutChildren: LayoutNode[] = [];
  let rowY = 0;

  for (let ri = 0; ri < rows.length; ri++) {
    const rowIdx = rows[ri]!;
    const rowGapTotal = gap * (rowIdx.length - 1);
    const rowAvail = innerW - rowGapTotal;

    // Compute fixed and flex totals for this row
    let fixedMain = 0;
    let totalFlex = 0;
    for (const idx of rowIdx) {
      if (flexValues[idx]! > 0) {
        totalFlex += flexValues[idx]!;
      } else {
        fixedMain += baseWidths[idx]!;
      }
    }

    // Distribute flex space within this row
    const flexSpace = Math.max(0, rowAvail - fixedMain);
    const childWidths: number[] = new Array(rowIdx.length);

    if (totalFlex > 0) {
      const flexPositions: number[] = [];
      for (let ci = 0; ci < rowIdx.length; ci++) {
        if (flexValues[rowIdx[ci]!]! > 0) flexPositions.push(ci);
      }
      const rawSizes = flexPositions.map(
        (ci) => (flexValues[rowIdx[ci]!]! / totalFlex) * flexSpace,
      );
      const rounded = largestRemainder(rawSizes, flexSpace);

      for (let fi = 0; fi < flexPositions.length; fi++) {
        const ci = flexPositions[fi]!;
        let size = rounded[fi]!;
        const cProps = getProps(children[rowIdx[ci]!]!);
        if (cProps) {
          size = clamp(size, cProps.minWidth ?? 0, cProps.maxWidth ?? Infinity);
        }
        childWidths[ci] = size;
      }
    }

    // Non-flex children keep their base width
    for (let ci = 0; ci < rowIdx.length; ci++) {
      if (childWidths[ci] === undefined) {
        childWidths[ci] = baseWidths[rowIdx[ci]!]!;
      }
    }

    // Row height = max cross size of children in this row
    let rowHeight = 0;
    for (const idx of rowIdx) {
      if (crossSizes[idx]! > rowHeight) rowHeight = crossSizes[idx]!;
    }

    // justifyContent: compute main-axis starting offset
    let totalUsedWidth = rowGapTotal;
    for (let ci = 0; ci < rowIdx.length; ci++) {
      totalUsedWidth += childWidths[ci]!;
    }
    const remainingMain = Math.max(0, innerW - totalUsedWidth);

    let mainStart = 0;
    let betweenGaps: number[] | null = null;

    if (justify === "end") {
      mainStart = remainingMain;
    } else if (justify === "center") {
      mainStart = Math.floor(remainingMain / 2);
    } else if (justify === "space-between" && rowIdx.length > 1) {
      const gapCount = rowIdx.length - 1;
      const rawGaps = Array.from(
        { length: gapCount },
        () => remainingMain / gapCount,
      );
      betweenGaps = largestRemainder(rawGaps, remainingMain);
    }

    // Position children in this row
    let xOffset = mainStart;
    for (let ci = 0; ci < rowIdx.length; ci++) {
      const idx = rowIdx[ci]!;
      const childW = childWidths[ci]!;

      // Cross-axis sizing: stretch fills row height, others keep their size
      let childH: number;
      if (align === "stretch") {
        const cProps = getProps(children[idx]!);
        const explicitH = resolveSizeValue(cProps?.height, innerH);
        childH = explicitH ?? rowHeight;
      } else {
        childH = crossSizes[idx]!;
      }

      // Cross-axis alignment within the row
      let crossOffset = 0;
      if (align === "center") {
        crossOffset = Math.floor((rowHeight - childH) / 2);
      } else if (align === "end") {
        crossOffset = rowHeight - childH;
      }

      const childX = innerX + xOffset;
      const childY = innerY + rowY + crossOffset;

      layoutChildren.push(
        layoutNode(children[idx]!, childX, childY, childW, childH),
      );

      xOffset += childW;
      if (ci < rowIdx.length - 1) {
        xOffset += gap;
        if (betweenGaps) {
          xOffset += betweenGaps[ci]!;
        }
      }
    }

    rowY += rowHeight;
    if (ri < rows.length - 1) {
      rowY += gap;
    }
  }

  // Intrinsic height: if no explicit height, shrink to fit all rows
  const hasExplicitHeight =
    props.height !== undefined || props.flex !== undefined;
  if (!hasExplicitHeight) {
    rect.height = rowY + padY * 2;
  }

  return { node, rect, children: layoutChildren };
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

  // Wrapping HStack: separate layout path
  if (node.type === "hstack" && props.flexWrap === "wrap") {
    return layoutWrapHStack(node, rect, props, children, x, y, width, height);
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
  const align = props.alignItems ?? "stretch";
  const useIntrinsicCross = align !== "stretch";

  for (const child of children) {
    const cProps = getProps(child);
    const flex = cProps?.flex ?? 0;

    if (flex > 0) {
      totalFlex += flex;
      // Cross-axis: explicit size, or intrinsic if not stretch, or fill
      let cross: number;
      if (isVertical) {
        cross =
          resolveSizeValue(cProps?.width, innerW) ??
          (useIntrinsicCross
            ? intrinsicMainSize(child, false, innerH)
            : innerW);
      } else {
        cross =
          resolveSizeValue(cProps?.height, innerH) ??
          (useIntrinsicCross ? intrinsicMainSize(child, true, innerW) : innerH);
      }
      // Apply cross-axis constraints
      if (cProps) {
        const minCross = isVertical
          ? (cProps.minWidth ?? 0)
          : (cProps.minHeight ?? 0);
        const maxCross = isVertical
          ? (cProps.maxWidth ?? Infinity)
          : (cProps.maxHeight ?? Infinity);
        cross = clamp(cross, minCross, maxCross);
      }
      infos.push({ node: child, mainSize: 0, crossSize: cross, flex });
    } else {
      // Main-axis: explicit → percentage → intrinsic
      let main: number;
      let cross: number;
      if (isVertical) {
        main =
          resolveSizeValue(cProps?.height, innerH) ??
          intrinsicMainSize(child, true, innerW);
        cross =
          resolveSizeValue(cProps?.width, innerW) ??
          (useIntrinsicCross
            ? intrinsicMainSize(child, false, innerH)
            : innerW);
      } else {
        main =
          resolveSizeValue(cProps?.width, innerW) ??
          intrinsicMainSize(child, false, innerH);
        cross =
          resolveSizeValue(cProps?.height, innerH) ??
          (useIntrinsicCross ? intrinsicMainSize(child, true, innerW) : innerH);
      }

      // Apply main-axis constraints
      if (cProps) {
        const minMain = isVertical
          ? (cProps.minHeight ?? 0)
          : (cProps.minWidth ?? 0);
        const maxMain = isVertical
          ? (cProps.maxHeight ?? Infinity)
          : (cProps.maxWidth ?? Infinity);
        main = clamp(main, minMain, maxMain);
      }
      // Apply cross-axis constraints
      if (cProps) {
        const minCross = isVertical
          ? (cProps.minWidth ?? 0)
          : (cProps.minHeight ?? 0);
        const maxCross = isVertical
          ? (cProps.maxWidth ?? Infinity)
          : (cProps.maxHeight ?? Infinity);
        cross = clamp(cross, minCross, maxCross);
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

  // Compute total main-axis content size (children + gaps)
  const totalChildMain = infos.reduce((sum, c) => sum + c.mainSize, 0);
  const totalContent = totalChildMain + totalGap;
  const mainInner = isVertical ? innerH : innerW;
  const crossInner = isVertical ? innerW : innerH;
  const remainingMain = Math.max(0, mainInner - totalContent);

  // justifyContent: compute main-axis starting offset and per-gap extra space
  const justify = props.justifyContent ?? "start";
  let mainStart = 0;
  let betweenGaps: number[] | null = null;

  if (justify === "end") {
    mainStart = remainingMain;
  } else if (justify === "center") {
    mainStart = Math.floor(remainingMain / 2);
  } else if (justify === "space-between" && infos.length > 1) {
    // Distribute remaining space into gaps between children
    const gapCount = infos.length - 1;
    const rawGaps = Array.from(
      { length: gapCount },
      () => remainingMain / gapCount,
    );
    betweenGaps = largestRemainder(rawGaps, remainingMain);
  }

  const layoutChildren: LayoutNode[] = [];
  let mainOffset = mainStart;

  for (let i = 0; i < infos.length; i++) {
    const info = infos[i]!;

    // Cross-axis alignment
    let crossOffset = 0;
    if (align === "center") {
      crossOffset = Math.floor((crossInner - info.crossSize) / 2);
    } else if (align === "end") {
      crossOffset = crossInner - info.crossSize;
    }
    // "start" and "stretch" keep crossOffset = 0

    const childX = isVertical ? innerX + crossOffset : innerX + mainOffset;
    const childY = isVertical ? innerY + mainOffset : innerY + crossOffset;
    const childW = isVertical ? info.crossSize : info.mainSize;
    const childH = isVertical ? info.mainSize : info.crossSize;

    layoutChildren.push(layoutNode(info.node, childX, childY, childW, childH));

    mainOffset += info.mainSize;
    if (i < infos.length - 1) {
      mainOffset += gap;
      if (betweenGaps) {
        mainOffset += betweenGaps[i]!;
      }
    }
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
