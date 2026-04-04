/**
 * ANSI base 16 terminal color.
 *
 * The 8 standard colors and their bright variants. These map directly
 * to the terminal's configured color palette.
 */
export type Color =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "brightBlack"
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite";

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
   * Content overflow behavior.
   * - `"hidden"` (default) — clip content at the container edge.
   * - `"scroll"` — enable scrolling along the main axis.
   */
  overflow?: "hidden" | "scroll";

  /** Show a scrollbar indicator when `overflow` is `"scroll"`. */
  scrollbar?: boolean;

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
   */
  onScroll?: (offset: number) => void;

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
   * Called when this container receives focus (Tab, Shift+Tab, or mouse click).
   * In uncontrolled mode, this is a notification callback.
   * In controlled mode, update {@link focused} here.
   */
  onFocus?: () => void;

  /**
   * Called when this container loses focus.
   * In uncontrolled mode, this is a notification callback.
   * In controlled mode, update {@link focused} here.
   */
  onBlur?: () => void;

  /**
   * Style overrides applied when this element is focused.
   * Accepts any {@link StyleProps} — overridden values replace the
   * element's normal styles and participate in inheritance.
   *
   * Works in both uncontrolled and controlled focus modes.
   *
   * @example
   * { bgColor: "cyan", fgColor: "black" }  // reverse-video effect
   */
  focusStyle?: StyleProps;

  /**
   * Called on key events that bubble up to this container.
   * Keys are first handled by the focused element; unconsumed keys
   * (e.g., modifier combos like `"ctrl+s"`) bubble up through ancestors.
   * The root container's `onKeyPress` acts as the global key handler.
   *
   * Key format: all lowercase, modifiers joined by `+` in canonical
   * order `ctrl+alt+shift+<key>` (e.g., `"ctrl+s"`, `"alt+up"`, `"escape"`).
   *
   * @param key - Normalized key string.
   */
  onKeyPress?: (key: string) => void;
}

/**
 * Props for the {@link Text} primitive.
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
 * Props for the {@link TextInput} primitive.
 *
 * TextInput is a multi-line editable text container. It accepts container
 * sizing props but has no children — its content is the {@link value} prop.
 * Scroll is always framework-managed (follows cursor and responds to mouse wheel).
 * Word-wrap is always on.
 */
export interface TextInputProps extends ContainerProps {
  /** Current text content. Controlled — the app owns this value. */
  value: string;

  /**
   * Called when the user edits text. Update {@link value} with the new
   * string and call `cel.render()` to reflect the change.
   *
   * @param value - The new text content.
   */
  onChange: (value: string) => void;

  /**
   * Called when the user presses the submit key.
   * @see {@link submitKey}
   */
  onSubmit?: () => void;

  /**
   * Key combo that fires {@link onSubmit}.
   * @default "enter"
   *
   * @example
   * submitKey: "ctrl+enter"  // Enter inserts newline, Ctrl+Enter submits
   */
  submitKey?: string;

  /**
   * A {@link TextNode} displayed when {@link value} is empty.
   * Fully stylable — pass a `Text()` call with any styling props.
   *
   * @example
   * placeholder: Text("type a message...", { fgColor: "brightBlack" })
   */
  placeholder?: TextNode;
}

/**
 * A text leaf node in the UI tree.
 *
 * Created by the {@link Text} function. Has no children — the parent
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
 * Created by the {@link TextInput} function. Accepts container sizing
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
 * Created by {@link VStack} (vertical) or {@link HStack} (horizontal).
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
