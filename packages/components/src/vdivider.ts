import { Text, VStack } from "@cel-tui/core";
import type { Color, ContainerNode } from "@cel-tui/types";

/** Props for the {@link VDivider} component. */
export interface VDividerProps {
  /**
   * Character to repeat down the height.
   * @default "│"
   */
  char?: string;
  /** Foreground color of the divider character. */
  fgColor?: Color;
}

// Pre-built content string: 500 lines is enough for any terminal.
// Paint clips to the container rect, so excess lines are free.
const MAX_LINES = 500;

/**
 * Vertical divider that fills the available height.
 *
 * Renders a single character on each row within a 1-cell-wide container.
 * Best used inside an `HStack` to separate columns.
 *
 * The container uses `height: "100%"` so it fills the parent's cross
 * axis. In an HStack with the default `alignItems: "stretch"`, it
 * automatically matches sibling heights.
 *
 * @param props - Divider character and color.
 * @returns A container node 1 cell wide, full parent height.
 *
 * @example
 * // Default thin vertical line
 * VDivider()
 *
 * // Double line with color
 * VDivider({ char: "║", fgColor: "color08" })
 *
 * // Separate sidebar from content
 * HStack({ height: "100%" }, [
 *   VStack({ width: 20 }, [Text("sidebar")]),
 *   VDivider({ fgColor: "color08" }),
 *   VStack({ flex: 1 }, [Text("content")]),
 * ])
 */
export function VDivider(props: VDividerProps = {}): ContainerNode {
  const { char = "│", fgColor } = props;
  const content = Array.from({ length: MAX_LINES }, () => char).join("\n");
  return VStack({ width: 1, height: "100%" }, [Text(content, { fgColor })]);
}
