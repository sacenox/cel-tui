import type { ContainerProps } from "@cel-tui/types";
import type { LayoutNode, Rect } from "./layout.js";

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

/**
 * Callback to resolve the current scroll offset for a scrollable container.
 * Used to adjust hit coordinates when testing children of scrolled containers.
 */
export type ScrollOffsetResolver = (ln: LayoutNode) => number;

/** Default resolver: reads scrollOffset from props, defaults to 0. */
function defaultScrollResolver(ln: LayoutNode): number {
  const props = getProps(ln);
  return (props as any)?.scrollOffset ?? 0;
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
      const offset = resolver(current);
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
      const child = current.children[i]!;
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
    const props = getProps(path[i]!);
    if (props?.onClick) {
      return { layoutNode: path[i]!, handler: props.onClick };
    }
  }
  return null;
}

/**
 * Find the nearest scrollable ancestor (innermost wins).
 * Matches containers with `overflow: "scroll"` or TextInput nodes.
 *
 * @param path - Hit test path (root to deepest).
 * @returns The scrollable layout node, or null.
 */
export function findScrollTarget(path: LayoutNode[]): LayoutNode | null {
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i]!.node;
    if (node.type === "textinput") return path[i]!;
    const props = getProps(path[i]!);
    if (props?.overflow === "scroll") return path[i]!;
  }
  return null;
}

/**
 * Collect all `onKeyPress` handlers along a path, ordered innermost-first
 * (deepest to root) for bubbling dispatch.
 *
 * @param path - Path from root to current node.
 * @returns Array of handlers ordered from deepest to root.
 */
export function collectKeyPressHandlers(
  path: LayoutNode[],
): { layoutNode: LayoutNode; handler: (key: string) => boolean | void }[] {
  const handlers: {
    layoutNode: LayoutNode;
    handler: (key: string) => boolean | void;
  }[] = [];
  for (let i = path.length - 1; i >= 0; i--) {
    const props = getProps(path[i]!);
    if (props?.onKeyPress) {
      handlers.push({ layoutNode: path[i]!, handler: props.onKeyPress });
    }
  }
  return handlers;
}

/**
 * Collect all focusable nodes in document order (depth-first traversal).
 *
 * A node is focusable if:
 * - It's a TextInput (always focusable), OR
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

  if (node.type === "textinput") {
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
