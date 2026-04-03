import type { ContainerNode, ContainerProps, Node } from "@cel-tui/types";

/**
 * Create a vertical stack container — children laid out top to bottom.
 *
 * Equivalent to CSS `flex-direction: column`. Main axis is vertical,
 * cross axis is horizontal.
 *
 * @param props - Layout, sizing, scrolling, focus, and interaction props.
 * @param children - Ordered child nodes.
 * @returns A container node for the UI tree.
 *
 * @example
 * VStack({ flex: 1, gap: 1 }, [
 *   Text("Hello"),
 *   Text("World"),
 * ])
 */
export function VStack(props: ContainerProps, children: Node[]): ContainerNode {
  return { type: "vstack", props, children };
}

/**
 * Create a horizontal stack container — children laid out left to right.
 *
 * Equivalent to CSS `flex-direction: row`. Main axis is horizontal,
 * cross axis is vertical.
 *
 * @param props - Layout, sizing, scrolling, focus, and interaction props.
 * @param children - Ordered child nodes.
 * @returns A container node for the UI tree.
 *
 * @example
 * HStack({ height: 1, gap: 1 }, [
 *   Text("Name", { bold: true }),
 *   VStack({ flex: 1 }, []),
 *   Text("value", { fgColor: "brightBlack" }),
 * ])
 */
export function HStack(props: ContainerProps, children: Node[]): ContainerNode {
  return { type: "hstack", props, children };
}
