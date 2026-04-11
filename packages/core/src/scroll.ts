import type { ContainerProps } from "@cel-tui/types";
import type { LayoutNode } from "./layout.js";
import { layoutText } from "./text-layout.js";

function isVerticalScrollTarget(target: LayoutNode): boolean {
  return target.node.type === "vstack" || target.node.type === "textinput";
}

function getScrollTargetProps(target: LayoutNode): ContainerProps {
  if (target.node.type === "text") {
    throw new Error("Text nodes cannot be scroll targets");
  }
  return target.node.props;
}

function getScrollViewportMainAxisSize(target: LayoutNode): number {
  const props = getScrollTargetProps(target);
  const isVertical = isVerticalScrollTarget(target);
  const mainAxisSize = isVertical ? target.rect.height : target.rect.width;
  const mainAxisPadding = isVertical
    ? (props.padding?.y ?? 0) * 2
    : (props.padding?.x ?? 0) * 2;
  return Math.max(1, mainAxisSize - mainAxisPadding);
}

/**
 * Resolve the mouse wheel scroll step for a scrollable layout node.
 * Uses the explicit `scrollStep` prop when provided, otherwise an
 * adaptive default based on the visible main-axis viewport size.
 */
export function getScrollStep(target: LayoutNode): number {
  const rawStep = getScrollTargetProps(target).scrollStep;
  if (typeof rawStep === "number" && Number.isFinite(rawStep) && rawStep > 0) {
    return Math.max(1, Math.floor(rawStep));
  }

  const viewport = getScrollViewportMainAxisSize(target);
  return Math.max(3, Math.min(8, Math.floor(viewport / 3)));
}

/**
 * Compute the maximum scroll offset for a scrollable layout node.
 * Returns 0 if content fits within the viewport.
 */
export function getMaxScrollOffset(target: LayoutNode): number {
  const { rect, children } = target;

  if (target.node.type === "textinput") {
    const padX = (target.node.props.padding?.x ?? 0) * 2;
    const padY = (target.node.props.padding?.y ?? 0) * 2;
    const contentWidth = Math.max(1, rect.width - padX);
    const contentHeight = Math.max(0, rect.height - padY);
    const lineCount = layoutText(
      target.node.props.value,
      contentWidth,
      "word",
    ).lineCount;
    return Math.max(0, lineCount - contentHeight);
  }

  const isVertical = target.node.type === "vstack";
  const props = getScrollTargetProps(target);
  const padX = props.padding?.x ?? 0;
  const padY = props.padding?.y ?? 0;

  if (isVertical) {
    let contentHeight = 0;
    for (const child of children) {
      const childBottom = child.rect.y + child.rect.height - rect.y;
      if (childBottom > contentHeight) contentHeight = childBottom;
    }
    return Math.max(0, contentHeight + padY - rect.height);
  }

  let contentWidth = 0;
  for (const child of children) {
    const childRight = child.rect.x + child.rect.width - rect.x;
    if (childRight > contentWidth) contentWidth = childRight;
  }
  return Math.max(0, contentWidth + padX - rect.width);
}
