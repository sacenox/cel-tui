import { cel } from "@cel-tui/core";

/** Timing information passed to a managed animation tick. */
export interface TickerTick {
  /** One-based tick number. This continues across stop/start cycles. */
  readonly frame: number;
  /** Milliseconds since the previous tick (or the latest {@link Ticker.start}). */
  readonly deltaMs: number;
  /** Milliseconds since the latest {@link Ticker.start}. */
  readonly elapsedMs: number;
}

/** Configuration for {@link createTicker}. */
export interface TickerOptions {
  /**
   * Hard upper bound on callback and render frequency.
   *
   * Delayed ticks are skipped instead of replayed, so a stalled event loop
   * cannot trigger a burst of catch-up renders.
   *
   * @default 30
   */
  maxFps?: number;
  /** Update external animation state before the render is requested. */
  onTick?: (tick: TickerTick) => void;
  /**
   * Render request invoked once after every tick.
   *
   * Defaults to {@link cel.render}. Supplying this is useful when adapting the
   * ticker to another render owner or when testing it with a deterministic
   * clock.
   */
  requestRender?: () => void;
}

/** Explicit lifecycle for an opt-in animation ticker. */
export interface Ticker {
  /** Whether the ticker currently has scheduled work. */
  readonly running: boolean;
  /** Whether this ticker has permanently released its callbacks. */
  readonly disposed: boolean;
  /** Start ticking. Repeated calls while running are ignored. */
  start(): void;
  /** Pause and cancel the pending tick. Safe to call repeatedly. */
  stop(): void;
  /** Stop permanently and release captured callbacks. Safe to call repeatedly. */
  dispose(): void;
}

const DEFAULT_MAX_FPS = 30;

/**
 * Create an opt-in, rate-limited render ticker.
 *
 * cel-tui remains fully reactive by default: constructing a ticker schedules
 * nothing. Call {@link Ticker.start} only while animation is needed, then
 * {@link Ticker.stop} or {@link Ticker.dispose} it. The scheduler uses one
 * drift-corrected timeout and skips missed frames rather than replaying them.
 *
 * @example
 * ```ts
 * let phase = 0;
 * const ticker = createTicker({
 *   maxFps: 12,
 *   onTick: () => phase++,
 * });
 *
 * ticker.start();
 * // ...later
 * ticker.dispose();
 * ```
 */
export function createTicker(options: TickerOptions = {}): Ticker {
  const maxFps = options.maxFps ?? DEFAULT_MAX_FPS;
  if (!Number.isFinite(maxFps) || maxFps <= 0) {
    throw new RangeError(
      "Ticker maxFps must be a finite number greater than 0",
    );
  }

  const intervalMs = 1_000 / maxFps;
  let onTick = options.onTick;
  let requestRender = options.requestRender ?? cel.render;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let disposed = false;
  let frame = 0;
  let startedAt = 0;
  let previousTickAt = 0;
  let nextTickAt = 0;

  function clearTimer(): void {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  }

  function schedule(now: number): void {
    // Rounding upward preserves maxFps even though host timers use integer
    // millisecond delays.
    const delay = Math.max(0, Math.ceil(nextTickAt - now));
    timer = setTimeout(runTick, delay);
  }

  function runTick(): void {
    timer = null;
    if (!running || disposed) return;

    const now = Date.now();
    frame++;
    try {
      onTick?.({
        frame,
        deltaMs: now - previousTickAt,
        elapsedMs: now - startedAt,
      });
      if (!disposed) requestRender();
    } catch (error) {
      // A failed callback must not leave a ticker that reports `running` while
      // no timer is actually scheduled. Surface the original error after
      // bringing the lifecycle to a consistent stopped state.
      ticker.stop();
      throw error;
    }
    if (!running || disposed) return;

    previousTickAt = now;
    // Never catch up missed frames in a burst. Preserve the original cadence
    // when possible, but move at least one full interval past a late callback.
    nextTickAt = Math.max(nextTickAt + intervalMs, now + intervalMs);
    schedule(now);
  }

  const ticker: Ticker = {
    get running() {
      return running;
    },
    get disposed() {
      return disposed;
    },
    start() {
      if (disposed) throw new Error("Cannot start a disposed ticker");
      if (running) return;

      running = true;
      const now = Date.now();
      startedAt = now;
      previousTickAt = now;
      nextTickAt = now + intervalMs;
      schedule(now);
    },
    stop() {
      running = false;
      clearTimer();
    },
    dispose() {
      if (disposed) return;
      ticker.stop();
      disposed = true;
      onTick = undefined;
      requestRender = () => {};
    },
  };

  return ticker;
}
