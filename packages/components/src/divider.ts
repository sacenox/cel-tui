import type { Color, TextNode } from "@cel-tui/types";
import { Text } from "@cel-tui/core";

/** Props for the {@link Divider} component. */
export interface DividerProps {
  /**
   * Character to repeat across the width.
   * @default "─"
   */
  char?: string;
  /** Foreground color of the divider character. */
  fgColor?: Color;
}

/**
 * Horizontal divider that fills the available width.
 *
 * Renders a single character repeated to fill the parent's width
 * using `Text` with `repeat: "fill"`.
 *
 * @param props - Divider character and color.
 * @returns A text node that fills the available width.
 *
 * @example
 * // Default thin line
 * Divider()
 *
 * // Thick line with color
 * Divider({ char: "━", fgColor: "color08" })
 *
 * // Double line
 * Divider({ char: "═" })
 */
export function Divider(props: DividerProps = {}): TextNode {
  const { char = "─", fgColor } = props;
  return Text(char, { repeat: "fill", fgColor });
}
