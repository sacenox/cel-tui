import type { Color, ContainerNode } from "@cel-tui/types";
import { HStack, Text } from "@cel-tui/core";

/** Props for the {@link Button} component. */
export interface ButtonProps {
  /** Called on mouse click or Enter when focused. */
  onClick: () => void;
  /** Render the label in bold. */
  bold?: boolean;
  /** Label text color. */
  fgColor?: Color;
  /** Label background color. */
  bgColor?: Color;
  /**
   * Whether the button participates in focus traversal.
   * @default true
   */
  focusable?: boolean;
}

/**
 * Clickable button with a styled text label.
 *
 * A convenience wrapper around an `HStack` with `onClick` containing
 * a styled `Text` node. Focusable by default — reachable via Tab and
 * activated with Enter.
 *
 * @param label - Button text.
 * @param props - Click handler and styling.
 * @returns A clickable container node.
 *
 * @example
 * Button("[Send]", { onClick: handleSend, bold: true, fgColor: "cyan" })
 *
 * @example
 * // Mouse-only button (not in Tab order)
 * Button("✕", { onClick: handleClose, focusable: false })
 */
export function Button(label: string, props: ButtonProps): ContainerNode {
  const { onClick, bold, fgColor, bgColor, focusable } = props;
  return HStack({ onClick, focusable }, [
    Text(label, { bold, fgColor, bgColor }),
  ]);
}
