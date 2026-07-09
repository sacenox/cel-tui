import { cel, Text, visibleWidth } from "@cel-tui/core";
import type { TextNode, TextProps } from "@cel-tui/types";
import { createTicker } from "./ticker.js";

/** Common Braille spinner frames used when no custom sequence is provided. */
export const DEFAULT_SPINNER_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏",
] as const;

/** Configuration captured by a {@link Spinner} instance. */
export interface SpinnerProps extends TextProps {
  /** Animation frames. Every frame must contain at least one visible cell. */
  frames?: readonly string[];
  /**
   * Hard upper bound on animation and render frequency.
   * @default 12.5
   */
  maxFps?: number;
  /**
   * Start immediately when the instance is created.
   *
   * The default is `false`, keeping cel-tui reactive until animation is
   * explicitly requested with {@link SpinnerInstance.start}.
   * @default false
   */
  autoStart?: boolean;
  /**
   * Pad narrower frames so every rendered frame has the same terminal width.
   * @default true
   */
  padFrames?: boolean;
  /** Called after the active frame advances. */
  onFrame?: (frame: string, index: number) => void;
  /** Override the default `cel.render()` request made after each frame. */
  requestRender?: () => void;
}

/** Callable, explicitly managed spinner component. */
export interface SpinnerInstance {
  /** Render the current frame as a styled Text node. */
  (style?: TextProps): TextNode;
  /** Zero-based current frame number; wraps only when selecting frame content. */
  readonly frame: number;
  /** Current rendered frame content, including width-stabilizing padding. */
  readonly current: string;
  /** Whether animation is currently scheduled. */
  readonly running: boolean;
  /** Whether this instance has permanently released its ticker. */
  readonly disposed: boolean;
  /** Begin animation. Repeated calls while running are ignored. */
  start(): void;
  /** Pause animation without changing the current frame. */
  stop(): void;
  /** Reset to the first frame and request a render. */
  reset(): void;
  /** Stop permanently and release timer callbacks. */
  dispose(): void;
}

const DEFAULT_SPINNER_FPS = 12.5;

function normalizeFrames(
  source: readonly string[],
  padFrames: boolean,
): readonly string[] {
  if (source.length === 0) {
    throw new RangeError("Spinner requires at least one frame");
  }

  const widths = source.map((frame) => visibleWidth(frame));
  if (widths.some((width) => width === 0)) {
    throw new RangeError("Every Spinner frame must contain a visible cell");
  }
  if (!padFrames) return [...source];

  const width = Math.max(...widths);
  return source.map((frame, index) =>
    frame.padEnd(frame.length + width - (widths[index] ?? 0)),
  );
}

/**
 * Create a configurable Spinner with explicit animation lifecycle.
 *
 * Constructing an instance is inert by default. Call `.start()` while work is
 * active, `.stop()` when it pauses, and `.dispose()` when the owner unmounts.
 * The callable itself is cheap and simply returns the current frame as Text.
 *
 * @example
 * ```ts
 * const saving = Spinner({ fgColor: "color06", maxFps: 12 });
 *
 * saving.start();
 * cel.viewport(() => HStack({}, [saving(), Text(" Saving...")]));
 *
 * // Once saving finishes:
 * saving.dispose();
 * ```
 */
export function Spinner(props: SpinnerProps = {}): SpinnerInstance {
  const {
    frames: sourceFrames = DEFAULT_SPINNER_FRAMES,
    maxFps = DEFAULT_SPINNER_FPS,
    autoStart = false,
    padFrames = true,
    onFrame,
    requestRender,
    ...textProps
  } = props;
  const frames = normalizeFrames(sourceFrames, padFrames);
  const renderRequest = requestRender ?? cel.render;
  let frame = 0;

  const ticker = createTicker({
    maxFps,
    requestRender: renderRequest,
    onTick: () => {
      frame++;
      const content = frames[frame % frames.length];
      if (content !== undefined) onFrame?.(content, frame);
    },
  });

  function currentFrame(): string {
    const content = frames[frame % frames.length];
    if (content === undefined) {
      // normalizeFrames guarantees this; retain a local invariant for TS and
      // for defensive behavior if the captured array is mutated externally.
      throw new Error("Spinner has no frame to render");
    }
    return content;
  }

  const render = ((style?: TextProps) =>
    Text(currentFrame(), { ...textProps, ...style })) as SpinnerInstance;

  Object.defineProperties(render, {
    frame: { get: () => frame },
    current: { get: currentFrame },
    running: { get: () => ticker.running },
    disposed: { get: () => ticker.disposed },
  });
  render.start = () => ticker.start();
  render.stop = () => ticker.stop();
  render.reset = () => {
    frame = 0;
    renderRequest();
  };
  render.dispose = () => ticker.dispose();

  if (autoStart) ticker.start();
  return render;
}
