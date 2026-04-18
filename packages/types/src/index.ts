/**
 * A numbered color slot in the 16-color palette.
 *
 * Colors are abstract palette references — `"color00"` through `"color15"`.
 * The active {@link Theme} determines what each slot actually looks like.
 * With the default ANSI 16 theme, they map to the terminal's configured
 * color palette (matching standard ANSI indices 0–15).
 *
 * Omitting a color prop (`undefined`) means "use the terminal default",
 * which is separate from any palette slot.
 */
export type Color =
  | "color00"
  | "color01"
  | "color02"
  | "color03"
  | "color04"
  | "color05"
  | "color06"
  | "color07"
  | "color08"
  | "color09"
  | "color10"
  | "color11"
  | "color12"
  | "color13"
  | "color14"
  | "color15";

/**
 * A theme value for a single color slot.
 *
 * - `number` (0–15) — ANSI 16 palette index. Emitted as standard SGR codes
 *   (e.g., index 1 → fg 31, bg 41). Values outside 0–15 are not supported
 *   and will produce incorrect SGR codes.
 * - `string` — 24-bit hex color (e.g., `"#ff0000"`). Emitted as
 *   true-color SGR codes (`38;2;r;g;b` / `48;2;r;g;b`).
 */
export type ThemeValue = number | string;

/**
 * A mapping from the 16 color slots to rendering output.
 *
 * The default theme maps each slot to its matching ANSI palette index
 * (color00 → 0, color01 → 1, etc.), inheriting the terminal's configured
 * color scheme automatically.
 *
 * Custom themes can remap slots to different ANSI indices, 24-bit hex
 * colors, or a mix of both.
 *
 * @example
 * // Catppuccin Mocha (true color)
 * const mocha: Theme = {
 *   color00: "#1e1e2e",
 *   color01: "#f38ba8",
 *   color02: "#a6e3a1",
 *   // ... remaining slots
 * };
 */
export type Theme = Record<Color, ThemeValue>;

/**
 * Styling props shared by all node types.
 *
 * Maps directly to terminal SGR (Select Graphic Rendition) attributes.
 * Containers propagate their styles to descendants — child nodes inherit
 * the nearest ancestor's values unless they set a value explicitly.
 */
export interface StyleProps {
  /** Render text with bold weight. */
  bold?: boolean;
  /** Render text in italic style. */
  italic?: boolean;
  /** Render text with an underline. */
  underline?: boolean;
  /** Foreground (text) color. */
  fgColor?: Color;
  /** Background color. */
  bgColor?: Color;
}

/**
 * A size value expressed as a fixed cell count or a percentage string.
 *
 * @example
 * 30        // 30 cells
 * "50%"     // 50% of parent
 * "100%"    // fill parent
 */
export type SizeValue = number | `${number}%`;

/**
 * Props shared by all container nodes ({@link ContainerNode} and {@link TextInputNode}).
 *
 * Controls layout, sizing, scrolling, focus, click handling, key events,
 * and styling. Style props on containers are inherited by descendants —
 * child nodes use the nearest ancestor's values unless they set their own.
 * Container `bgColor` fills the container rect before painting children.
 */
// biome-ignore lint/suspicious/noConfusingVoidType: public callback contract intentionally accepts void-returning handlers.
export type KeyPressHandler = (key: string) => boolean | void;

/** Why a focus change callback fired. */
export type FocusChangeReason = "tab" | "shift+tab" | "click" | "escape";

/** Metadata for {@link ContainerProps.onFocus} / {@link ContainerProps.onBlur}. */
export interface FocusChangeEvent {
  /** What caused the focus transition. */
  reason: FocusChangeReason;
}

/** Focus change notification callback. */
export type FocusChangeHandler = (event: FocusChangeEvent) => void;

export interface ContainerProps extends StyleProps {
  /**
   * Fixed width in cells, or percentage of parent width.
   * When omitted, the container uses intrinsic sizing (fits content)
   * or flex/percentage if those are set.
   */
  width?: SizeValue;

  /**
   * Fixed height in cells, or percentage of parent height.
   * When omitted, the container uses intrinsic sizing (fits content)
   * or flex/percentage if those are set.
   */
  height?: SizeValue;

  /**
   * Flex grow factor. Space remaining after fixed and intrinsic children
   * is distributed proportionally among flex children.
   *
   * @example
   * flex: 1  // equal share
   * flex: 2  // double share
   */
  flex?: number;

  /** Minimum width constraint in cells. */
  minWidth?: number;
  /** Maximum width constraint in cells. */
  maxWidth?: number;
  /** Minimum height constraint in cells. */
  minHeight?: number;
  /** Maximum height constraint in cells. */
  maxHeight?: number;

  /**
   * Internal padding in cells.
   * `x` adds horizontal padding (left + right), `y` adds vertical (top + bottom).
   */
  padding?: { x?: number; y?: number };

  /** Spacing between children in cells. */
  gap?: number;

  /**
   * Distribute children along the main axis.
   * - VStack main axis = vertical
   * - HStack main axis = horizontal
   */
  justifyContent?: "start" | "end" | "center" | "space-between";

  /**
   * Align children along the cross axis.
   * - VStack cross axis = horizontal
   * - HStack cross axis = vertical
   */
  alignItems?: "start" | "end" | "center" | "stretch";

  /**
   * Whether children wrap to the next line when they exceed the
   * container's main-axis size. Only meaningful on HStack.
   *
   * - `"nowrap"` (default) — all children on one line, may overflow.
   * - `"wrap"` — children that exceed the width flow to the next row.
   *
   * When wrapping, each row is laid out independently: flex children
   * distribute remaining space within their row, `justifyContent`
   * applies per row, and `alignItems` applies per row. Rows are
   * stacked vertically with `gap` spacing between them.
   */
  flexWrap?: "nowrap" | "wrap";

  /**
   * Content overflow behavior.
   * - `"hidden"` (default) — clip content at the container edge.
   * - `"scroll"` — enable scrolling along the main axis.
   */
  overflow?: "hidden" | "scroll";

  /** Show a scrollbar indicator when `overflow` is `"scroll"`. */
  scrollbar?: boolean;

  /**
   * Mouse wheel step size in cells along the container's main axis.
   * When omitted, the framework uses an adaptive default based on the
   * scroll target's viewport size: `floor(viewportMainAxis / 3)`,
   * clamped to the range `3..8`.
   *
   * Affects mouse wheel input only — not programmatic {@link scrollOffset}
   * updates or TextInput cursor-follow behavior.
   */
  scrollStep?: number;

  /**
   * Controlled scroll position in cells. When provided, the app owns
   * scroll state and must update this value via {@link onScroll}.
   * When omitted, scroll is framework-managed (uncontrolled).
   */
  scrollOffset?: number;

  /**
   * Called when the user scrolls this container (mouse wheel).
   * In controlled mode, update {@link scrollOffset} with the new value
   * to move the scroll position.
   *
   * @param offset - The new scroll offset in cells.
   * @param maxOffset - The maximum scroll offset (content size minus viewport size).
   */
  onScroll?: (offset: number, maxOffset: number) => void;

  /**
   * Called on mouse click or Enter key when this container is focused.
   * Setting this prop makes the container focusable by default.
   */
  onClick?: () => void;

  /**
   * Whether this container participates in focus traversal.
   * Defaults to `true` when {@link onClick} is set. Set to `false`
   * to make a container clickable by mouse but not reachable via Tab.
   */
  focusable?: boolean;

  /**
   * Whether this container is currently focused.
   *
   * When provided, focus is **controlled** — the app owns the state and
   * must update this value via {@link onFocus}/{@link onBlur}.
   * When omitted, focus is **uncontrolled** — the framework manages
   * focus internally (Tab/Shift+Tab/Escape/click just work).
   */
  focused?: boolean;

  /**
   * Called when this container receives focus.
   * The event includes the transition reason (`tab`, `shift+tab`, `click`, or `escape`).
   * In uncontrolled mode, this is a notification callback.
   * In controlled mode, update {@link focused} here.
   */
  onFocus?: FocusChangeHandler;

  /**
   * Called when this container loses focus.
   * The event includes the transition reason (`tab`, `shift+tab`, `click`, or `escape`).
   * In uncontrolled mode, this is a notification callback.
   * In controlled mode, update {@link focused} here.
   */
  onBlur?: FocusChangeHandler;

  /**
   * Style overrides applied when this element is focused.
   * Accepts any {@link StyleProps} — overridden values replace the
   * element's normal styles and participate in inheritance.
   *
   * Works in both uncontrolled and controlled focus modes.
   *
   * @example
   * { bgColor: "color06", fgColor: "color00" }  // reverse-video effect
   */
  focusStyle?: StyleProps;

  /**
   * Called on key events that bubble up to this container.
   * Keys are first handled by the focused element; unconsumed keys
   * (e.g., non-editing shortcuts like `"ctrl+s"`) bubble up through ancestors.
   * The root container's `onKeyPress` acts as the global key handler.
   *
   * Return `false` to indicate the key was **not consumed** — it will
   * continue bubbling to the next ancestor handler. Any other return
   * value (`undefined`, `true`, or no return) means the key was consumed
   * and bubbling stops. This is backward-compatible: existing `void`
   * handlers consume by default.
   *
   * Key format: all lowercase, modifiers joined by `+` in canonical
   * order `ctrl+alt+shift+<key>` (e.g., `"ctrl+s"`, `"alt+up"`, `"escape"`).
   * The key string is a **semantic identifier**, not necessarily the exact
   * inserted text — for example, uppercase `A` is reported as key `"a"`.
   *
   * @param key - Normalized semantic key string.
   * @returns `false` to keep bubbling, anything else to consume.
   */
  onKeyPress?: KeyPressHandler;
}

/**
 * Props for the `Text` primitive.
 *
 * Text is a styled leaf node with no children and no sizing props —
 * the parent container controls the box. Height is intrinsic, computed
 * from content, newlines, and word-wrapping at the given width.
 */
export interface TextProps extends StyleProps {
  /**
   * Repeat the text content a fixed number of times or to fill the
   * available width. When set, wrapping is ignored.
   *
   * @example
   * repeat: "fill"  // fills parent width (e.g., dividers)
   * repeat: 20      // repeats exactly 20 times
   */
  repeat?: number | "fill";

  /**
   * Text wrapping mode.
   * - `"none"` (default) — no wrapping, content is hard-clipped at the box edge.
   * - `"word"` — word-wrap to fit available width. Affects computed height.
   *
   * Whitespace is always preserved. `\n` produces explicit line breaks.
   */
  wrap?: "none" | "word";
}

/**
 * Props for the `TextInput` primitive.
 *
 * TextInput is a multi-line editable text container. It accepts container
 * sizing props but has no children — its content is the `value` prop.
 * Scroll is always framework-managed: the stored offset is clamped every render,
 * mouse wheel input adjusts it, and focused inputs further adjust only as needed
 * to keep the cursor visible after edits, cursor movement, or reflow.
 * Word-wrap is always on.
 *
 * When focused, TextInput consumes insertable text plus editing/navigation
 * keys (arrows, backspace, delete, Enter, Tab), along with a small set of
 * readline-style shortcuts: `ctrl+a` / `ctrl+e`, `alt+b` / `alt+f`,
 * `ctrl+left` / `ctrl+right`, `ctrl+w`, and `alt+d`. Word movement and
 * deletion use whitespace-delimited boundaries, and `up` / `down` follow
 * visual wrapped lines. Other modifier combos and non-insertable control
 * keys bubble to ancestor {@link onKeyPress} handlers.
 */
export interface TextInputProps extends ContainerProps {
  /** Current text content. Controlled — the app owns this value. */
  value: string;

  /**
   * Called when the user edits text. Update the controlled `value` prop
   * with the new string and call `cel.render()` to reflect the change.
   *
   * @param value - The new text content.
   */
  onChange: (value: string) => void;

  /**
   * Key handler that fires **before** the built-in editing logic.
   * Return `false` to prevent the default editing action for that key
   * (no character insertion, no cursor movement, no deletion).
   * Any other return (or no return) lets the default action proceed.
   *
   * Receives the normalized **semantic** key string, not necessarily the
   * exact inserted text. For example, typing uppercase `A` reports key
   * `"a"` here while still inserting `"A"` into the input.
   *
   * @example
   * // Enter submits instead of inserting a newline
   * onKeyPress: (key) => {
   *   if (key === "enter") { handleSend(); return false; }
   * }
   */
  onKeyPress?: KeyPressHandler;

  /**
   * A {@link TextNode} displayed when {@link value} is empty.
   * Fully stylable — pass a `Text()` call with any styling props.
   *
   * @example
   * placeholder: Text("type a message...", { fgColor: "color08" })
   */
  placeholder?: TextNode;
}

/**
 * A text leaf node in the UI tree.
 *
 * Created by the `Text` function. Has no children — the parent
 * container controls the box, and height is intrinsic (computed from
 * content and wrapping).
 */
export interface TextNode {
  type: "text";
  /** The text content to display. */
  content: string;
  /** Text styling and behavior props. */
  props: TextProps;
}

/**
 * An editable text container node in the UI tree.
 *
 * Created by the `TextInput` function. Accepts container sizing
 * props but has no children — its content is the `value` prop.
 */
export interface TextInputNode {
  type: "textinput";
  /** TextInput configuration and styling props. */
  props: TextInputProps;
}

/**
 * A layout container node in the UI tree.
 *
 * Created by `VStack` (vertical) or `HStack` (horizontal).
 * Contains an ordered list of child nodes.
 */
export interface ContainerNode {
  /** `"vstack"` for vertical layout, `"hstack"` for horizontal. */
  type: "vstack" | "hstack";
  /** Container layout, sizing, and interaction props. */
  props: ContainerProps;
  /** Ordered child nodes. */
  children: Node[];
}

/**
 * Any node in the cel-tui UI tree.
 *
 * The tree is built from three node types:
 * - {@link ContainerNode} — layout containers (VStack, HStack)
 * - {@link TextNode} — styled text leaf
 * - {@link TextInputNode} — editable text container
 */
export type Node = TextNode | TextInputNode | ContainerNode;
