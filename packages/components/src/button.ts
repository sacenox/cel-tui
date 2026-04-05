import type { ContainerNode, StyleProps } from "@cel-tui/types";
import { HStack, Text } from "@cel-tui/core";

/**
 * Props for the {@link Button} component.
 *
 * Extends {@link StyleProps} — all style props (`fgColor`, `bgColor`,
 * `bold`, `italic`, `underline`) are set on the container and inherited
 * by the label text. This enables `focusStyle` to override them when
 * the button is focused.
 */
export interface ButtonProps extends StyleProps {
  /** Called on mouse click or Enter when focused. */
  onClick: () => void;
  /**
   * Whether the button participates in focus traversal.
   * @default true
   */
  focusable?: boolean;
  /**
   * Whether this button is currently focused (controlled mode).
   * When provided, the app owns focus state and must update it
   * via {@link onFocus}/{@link onBlur}.
   */
  focused?: boolean;
  /** Called when the button receives focus. */
  onFocus?: () => void;
  /** Called when the button loses focus. */
  onBlur?: () => void;
  /**
   * Style overrides applied when focused. Overridden values
   * participate in inheritance — the label text sees the
   * focused styles as its defaults.
   */
  focusStyle?: StyleProps;
  /**
   * Key event handler. Receives keys that bubble up to this button.
   * Return `false` to keep bubbling.
   */
  onKeyPress?: (key: string) => boolean | void;
  /** Internal padding in cells. */
  padding?: { x?: number; y?: number };
}

/**
 * Clickable button with a styled text label.
 *
 * A convenience wrapper around an `HStack` with `onClick` containing
 * a styled `Text` node. Focusable by default — reachable via Tab and
 * activated with Enter.
 *
 * Style props are set on the container, not the text — this means
 * `bgColor` fills the button rect and `focusStyle` can override
 * any style when focused.
 *
 * @param label - Button text.
 * @param props - Click handler, styling, and focus configuration.
 * @returns A clickable container node.
 *
 * @example
 * // Basic styled button
 * Button("[Send]", { onClick: handleSend, bold: true, fgColor: "color06" })
 *
 * @example
 * // Button with focus style (keyboard navigation)
 * Button("[OK]", {
 *   onClick: handleOk,
 *   bgColor: "color08",
 *   focusStyle: { bgColor: "color02", fgColor: "color00" },
 * })
 *
 * @example
 * // Mouse-only button (not in Tab order)
 * Button("✕", { onClick: handleClose, focusable: false })
 */
export function Button(label: string, props: ButtonProps): ContainerNode {
  return HStack(props, [Text(label)]);
}
