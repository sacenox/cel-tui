import type { LayoutNode } from "./layout.js";
import { layoutText } from "./text-layout.js";

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
  const props = target.node.type !== "text" ? target.node.props : null;
  const padX = (props as any)?.padding?.x ?? 0;
  const padY = (props as any)?.padding?.y ?? 0;

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
