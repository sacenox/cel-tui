import type { ContainerProps } from "@cel-tui/types";
import type { LayoutNode, Rect } from "./layout.js";
import { clampScrollOffset } from "./scroll.js";

/**
 * Test if a point is inside a rect.
 */
function pointInRect(x: number, y: number, rect: Rect): boolean {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
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
 * Callback to resolve the current scroll offset for a scrollable container.
 * Used to adjust hit coordinates when testing children of scrolled containers.
 */
type ScrollOffsetResolver = (ln: LayoutNode) => number;

/** Default resolver: reads scrollOffset from props, defaults to 0. */
function defaultScrollResolver(ln: LayoutNode): number {
  return getProps(ln)?.scrollOffset ?? 0;
}

/**
 * Find the path from root to the deepest node at `(x, y)`.
 *
 * Returns an array of {@link LayoutNode}s from root (index 0) to the
 * deepest hit node (last index). Returns empty array if the point is
 * outside the root.
 *
 * For scrollable containers, child coordinates are adjusted by the
 * scroll offset so clicks target the visually correct child.
 *
 * @param root - Root of the layout tree.
 * @param x - Column position.
 * @param y - Row position.
 * @param getScrollOffset - Optional resolver for scroll offsets.
 * @returns Path from root to deepest node at the position.
 */
export function hitTest(
  root: LayoutNode,
  x: number,
  y: number,
  getScrollOffset?: ScrollOffsetResolver,
): LayoutNode[] {
  const resolver = getScrollOffset ?? defaultScrollResolver;
  if (!pointInRect(x, y, root.rect)) return [];

  const path: LayoutNode[] = [root];

  // Track accumulated scroll adjustments as we descend.
  // When a scrollable container is encountered, subsequent child rect
  // checks use coordinates shifted by the scroll offset.
  let adjustX = 0;
  let adjustY = 0;
  let current = root;
  let found = true;

  while (found) {
    found = false;

    // Check if current node is scrollable — if so, adjust coordinates
    const props = getProps(current);
    if (props?.overflow === "scroll" || current.node.type === "textinput") {
      const offset = clampScrollOffset(current, resolver(current));
      if (offset !== 0) {
        const isVertical =
          current.node.type === "vstack" || current.node.type === "textinput";
        if (isVertical) {
          adjustY += offset;
        } else {
          adjustX += offset;
        }
      }
    }

    // Test children with scroll-adjusted coordinates
    const testX = x + adjustX;
    const testY = y + adjustY;
    for (let i = current.children.length - 1; i >= 0; i--) {
      const child = requiredAt(current.children, i, "layout child");
      if (pointInRect(testX, testY, child.rect)) {
        path.push(child);
        current = child;
        found = true;
        break;
      }
    }
  }

  return path;
}

// --- Handler lookups ---

function getProps(ln: LayoutNode): ContainerProps | null {
  const node = ln.node;
  if (node.type === "text") return null;
  return node.props;
}

/**
 * Find the nearest ancestor with an `onClick` handler (innermost wins).
 * Walks the path from deepest to root.
 *
 * @param path - Hit test path (root to deepest).
 * @returns The handler and its layout node, or null.
 */
export function findClickHandler(
  path: LayoutNode[],
): { layoutNode: LayoutNode; handler: () => void } | null {
  for (let i = path.length - 1; i >= 0; i--) {
    const layoutNode = requiredAt(path, i, "hit path node");
    const props = getProps(layoutNode);
    if (props?.onClick) {
      return { layoutNode, handler: props.onClick };
    }
  }
  return null;
}

/**
 * Collect scrollable ancestors in bubbling order (innermost first).
 * Matches containers with `overflow: "scroll"` or TextInput nodes.
 *
 * @param path - Hit test path (root to deepest).
 * @returns Scrollable layout nodes ordered deepest to root.
 */
export function collectScrollTargets(path: LayoutNode[]): LayoutNode[] {
  const targets: LayoutNode[] = [];
  for (let i = path.length - 1; i >= 0; i--) {
    const layoutNode = requiredAt(path, i, "hit path node");
    const node = layoutNode.node;
    if (node.type === "textinput") {
      targets.push(layoutNode);
      continue;
    }
    const props = getProps(layoutNode);
    if (props?.overflow === "scroll") targets.push(layoutNode);
  }
  return targets;
}

/**
 * Find the nearest scrollable ancestor.
 *
 * For full scroll dispatch, prefer {@link collectScrollTargets} so container
 * handlers can propagate by returning `false`. TextInput consumes directly.
 *
 * @param path - Hit test path (root to deepest).
 * @returns The innermost scrollable layout node, or null.
 */
export function findScrollTarget(path: LayoutNode[]): LayoutNode | null {
  return collectScrollTargets(path)[0] ?? null;
}

/**
 * Collect all `onKeyPress` handlers along a path, ordered innermost-first
 * (deepest to root) for bubbling dispatch.
 *
 * @param path - Path from root to current node.
 * @returns Array of handlers ordered from deepest to root.
 */
export function collectKeyPressHandlers(path: LayoutNode[]): {
  layoutNode: LayoutNode;
  handler: NonNullable<ContainerProps["onKeyPress"]>;
}[] {
  const handlers: {
    layoutNode: LayoutNode;
    handler: NonNullable<ContainerProps["onKeyPress"]>;
  }[] = [];
  for (let i = path.length - 1; i >= 0; i--) {
    const layoutNode = requiredAt(path, i, "hit path node");
    const props = getProps(layoutNode);
    if (props?.onKeyPress) {
      handlers.push({ layoutNode, handler: props.onKeyPress });
    }
  }
  return handlers;
}

/**
 * Collect all focusable nodes in document order (depth-first traversal).
 *
 * A node is focusable if:
 * - It's a TextInput whose `focusable` prop is not `false`, OR
 * - It's a container with `onClick` and `focusable` is not `false`, OR
 * - It's a container with explicit `focusable: true`
 *
 * @param root - Root of the layout tree.
 * @returns Focusable nodes in document order.
 */
export function collectFocusable(root: LayoutNode): LayoutNode[] {
  const result: LayoutNode[] = [];
  collectFocusableRecursive(root, result);
  return result;
}

function collectFocusableRecursive(ln: LayoutNode, result: LayoutNode[]): void {
  const node = ln.node;

  if (node.type === "textinput" && node.props.focusable !== false) {
    result.push(ln);
  } else if (node.type === "vstack" || node.type === "hstack") {
    const isFocusable =
      node.props.focusable === true ||
      (node.props.onClick != null && node.props.focusable !== false);
    if (isFocusable) {
      result.push(ln);
    }
  }

  for (const child of ln.children) {
    collectFocusableRecursive(child, result);
  }
}
