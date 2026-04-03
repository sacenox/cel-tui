import type { ContainerNode } from "@cel-tui/types";
import { VStack } from "@cel-tui/core";

/**
 * Flexible spacer that fills available space along the parent's main axis.
 *
 * Equivalent to an empty `VStack({ flex: 1 }, [])`. Use inside an HStack
 * to push siblings apart, or inside a VStack for vertical spacing.
 *
 * @returns A flex container node that expands to fill remaining space.
 *
 * @example
 * // Push items to opposite ends of a row
 * HStack({ height: 1 }, [
 *   Text("left"),
 *   Spacer(),
 *   Text("right"),
 * ])
 */
export function Spacer(): ContainerNode {
  return VStack({ flex: 1 }, []);
}
