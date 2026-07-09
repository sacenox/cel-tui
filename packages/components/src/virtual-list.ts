import { cel, measureContentHeight, VStack } from "@cel-tui/core";
import type {
  ContainerNode,
  ContainerProps,
  Node,
  StateKey,
} from "@cel-tui/types";

/** Why a {@link VirtualListScrollHandler} was invoked. */
export type VirtualListScrollReason = "input" | "anchor";

/**
 * Scroll changes requested by a {@link VirtualList}.
 *
 * Returning exactly `false` for an `"input"` event lets the wheel event
 * continue to a scrollable ancestor. Anchor notifications are informational:
 * the list has already compensated its viewport to keep the same row stable.
 */
export type VirtualListScrollHandler =
  | ((
      offset: number,
      maxOffset: number,
      reason: VirtualListScrollReason,
    ) => void)
  | ((
      offset: number,
      maxOffset: number,
      reason: VirtualListScrollReason,
    ) => boolean);

/** Construction options for a callable {@link VirtualListInstance}. */
export interface VirtualListOptions<T> {
  /** Return an identity unique within this list's current items. */
  itemKey: (item: T, index: number) => StateKey;
  /**
   * Build an item's node tree. Only the active window is rendered. Rows should
   * have intrinsic or fixed height rather than viewport-relative main sizing.
   */
  renderItem: (item: T, index: number) => Node;
  /**
   * Estimated row height used until a row has been measured.
   * Must resolve to a positive integer cell count.
   * @default 1
   */
  estimatedItemHeight?:
    number | ((item: T, index: number, width: number) => number);
  /**
   * Version used to invalidate a keyed row's measured height.
   * Defaults to the item value/reference. Supply this for mutable items.
   */
  itemVersion?: (item: T, index: number) => unknown;
  /** Vertical gap between rows, in cells. @default 0 */
  gap?: number;
  /** Extra cells rendered before and after the viewport. @default 4 */
  overscan?: number;
  /** Maximum retained measured-height entries. @default 2048 */
  maxCachedItems?: number;
  /**
   * Hard cap on rows in the returned node tree. This prevents degenerate
   * zero-height content or extreme overscan from defeating virtualization.
   * @default 512
   */
  maxRenderedItems?: number;
  /** Initial offset for uncontrolled scrolling. @default 0 */
  defaultScrollOffset?: number;
  /** Start an uncontrolled list pinned to its end. @default false */
  defaultStickToBottom?: boolean;
}

type ForwardedContainerProps = Pick<
  ContainerProps,
  | "stateKey"
  | "scrollbar"
  | "scrollbarStyle"
  | "scrollStep"
  | "onClick"
  | "focusable"
  | "focused"
  | "autoFocus"
  | "onFocus"
  | "onBlur"
  | "focusStyle"
  | "onKeyPress"
  | "bold"
  | "italic"
  | "underline"
  | "fgColor"
  | "bgColor"
>;

/** Props supplied whenever a {@link VirtualListInstance} is rendered. */
export type VirtualListProps<T> = ForwardedContainerProps & {
  /** Current ordered collection. Keys must be unique within this list. */
  items: readonly T[];
  /** Exact viewport width in terminal cells, used for row measurement. */
  width: number;
  /** Exact viewport height in terminal cells. */
  height: number;
  /** Override the instance's vertical row gap. */
  gap?: number;
  /** Override the instance's overscan, measured in cells. */
  overscan?: number;
  /** Controlled scroll offset. Omit for instance-managed scrolling. */
  scrollOffset?: number;
  /**
   * Controlled sticky-bottom state. Omit to use the instance-managed state.
   * While true, appends and height changes remain pinned to the end.
   */
  stickToBottom?: boolean;
  /** Called when wheel input or anchor compensation changes the offset. */
  onScroll?: VirtualListScrollHandler;
  /** Called when wheel input changes whether the viewport is at the end. */
  onStickToBottomChange?: (stuck: boolean) => void;
};

/** Observable snapshot of a {@link VirtualListInstance}. */
export interface VirtualListState {
  /** Effective cell offset used by the most recent render. */
  scrollOffset: number;
  /** Maximum offset in the most recent render. */
  maxScrollOffset: number;
  /** Total estimated/measured content height, including row gaps. */
  totalHeight: number;
  /** Whether the most recent render was pinned to the bottom. */
  stickToBottom: boolean;
  /** Inclusive first rendered item index. */
  visibleStart: number;
  /** Exclusive final rendered item index. */
  visibleEnd: number;
  /** Number of item nodes present in the most recent returned tree. */
  renderedItems: number;
  /** Number of rows measured during the most recent render call. */
  measuredItems: number;
  /** Number of retained height-cache entries. */
  cachedItems: number;
  /** First viewport anchor key, when the list is non-empty. */
  anchorKey?: StateKey;
}

/** A callable variable-height virtual list with an explicit cache lifecycle. */
export interface VirtualListInstance<T> {
  /** Build the current virtualized node tree. Call inside `cel.viewport()`. */
  (props: VirtualListProps<T>): ContainerNode;
  /** Reset state to defaults and request a render. */
  reset(): void;
  /** Clear all retained state eagerly. The callable may be reused afterward. */
  dispose(): void;
  /** Invalidate one measured row (or all rows) and request a render. */
  invalidate(key?: StateKey): void;
  /** Set an uncontrolled offset, leave sticky mode, and request a render. */
  scrollTo(offset: number): void;
  /** Pin uncontrolled renders to the current end and request a render. */
  scrollToEnd(): void;
  /** Inspect the last committed render state. */
  getState(): Readonly<VirtualListState>;
}

interface HeightEntry {
  height: number;
  revision: unknown;
  width: number;
}

interface Metrics {
  starts: number[];
  ends: number[];
  totalHeight: number;
}

interface WindowRange {
  start: number;
  end: number;
}

interface PreviousFrame {
  keys: StateKey[];
  revisions: unknown[];
  starts: number[];
  offset: number;
  sourceOffset: number;
  controlled: boolean;
  anchorIndex: number;
}

const DEFAULT_OVERSCAN = 4;
const DEFAULT_CACHE_LIMIT = 2_048;
const DEFAULT_RENDER_LIMIT = 512;
const MAX_MEASUREMENT_PASSES = 3;

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function normalizeOffset(value: number, name: string): number {
  if (value === Infinity) return value;
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number or Infinity`);
  }
  return Math.max(0, value);
}

function clampOffset(value: number, maxOffset: number): number {
  return value === Infinity
    ? maxOffset
    : Math.min(Math.max(0, value), maxOffset);
}

function formatKey(key: StateKey): string {
  return `${typeof key} ${JSON.stringify(key)}`;
}

function lowerBound(values: readonly number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const value = values[middle];
    if (value === undefined || value >= target) high = middle;
    else low = middle + 1;
  }
  return low;
}

function firstEndAfter(values: readonly number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const value = values[middle];
    if (value === undefined || value > target) high = middle;
    else low = middle + 1;
  }
  return low;
}

/**
 * Calculate the bounded item window intersecting a cell viewport.
 * Exported for deterministic testing; application code normally uses
 * {@link VirtualList} instead.
 */
export function calculateVirtualWindow(
  metrics: Pick<Metrics, "starts" | "ends">,
  offset: number,
  viewportHeight: number,
  overscan: number,
  maxRenderedItems: number,
): WindowRange {
  const count = metrics.starts.length;
  if (count === 0) return { start: 0, end: 0 };

  const visibleStart = Math.min(firstEndAfter(metrics.ends, offset), count - 1);
  const visibleTarget = offset + viewportHeight;
  const visibleEnd = Math.max(
    visibleStart + 1,
    Math.min(count, lowerBound(metrics.starts, visibleTarget)),
  );

  const boundedVisibleEnd = Math.min(
    count,
    visibleStart + maxRenderedItems,
    visibleEnd,
  );
  let start = visibleStart;
  let end = boundedVisibleEnd;
  let remaining = maxRenderedItems - (end - start);
  if (remaining <= 0) return { start, end };

  const wantedStart = Math.min(
    firstEndAfter(metrics.ends, Math.max(0, offset - overscan)),
    start,
  );
  const wantedEnd = Math.max(
    end,
    Math.min(count, lowerBound(metrics.starts, visibleTarget + overscan)),
  );
  const wantedBefore = start - wantedStart;
  const wantedAfter = wantedEnd - end;

  const before = Math.min(wantedBefore, Math.floor(remaining / 2));
  start -= before;
  remaining -= before;

  const after = Math.min(wantedAfter, remaining);
  end += after;
  remaining -= after;

  if (remaining > 0) {
    const extraBefore = Math.min(start - wantedStart, remaining);
    start -= extraBefore;
    remaining -= extraBefore;
  }
  if (remaining > 0) {
    end += Math.min(wantedEnd - end, remaining);
  }

  return { start, end };
}

function rangeEquals(left: WindowRange, right: WindowRange): boolean {
  return left.start === right.start && left.end === right.end;
}

function offsetEquals(left: number, right: number): boolean {
  return Object.is(left, right) || Math.abs(left - right) < 1e-9;
}

/**
 * Create a measured variable-height virtual list.
 *
 * The returned callable owns only scroll/measurement metadata. It renders
 * nodes for the visible cell window plus overscan, measures those rows at the
 * supplied width, and represents cold rows with exact/estimated spacer
 * heights. Height retention is bounded and prioritizes recently measured
 * (normally visible) rows; entries are invalidated when an item version or
 * viewport width changes.
 *
 * Structural edits preserve the first visible keyed row and its screen
 * position. In controlled mode an anchor correction is applied immediately
 * and reported through `onScroll(..., "anchor")`, allowing the caller to
 * commit the compensated offset.
 *
 * @example
 * ```ts
 * const messages = VirtualList<Message>({
 *   itemKey: (message) => message.id,
 *   renderItem: (message) => Text(message.body, { wrap: "word" }),
 *   estimatedItemHeight: 3,
 *   defaultStickToBottom: true,
 * });
 *
 * cel.viewport(() =>
 *   messages({ items, width: columns, height: rows, scrollbar: true }),
 * );
 *
 * // When this view is permanently removed:
 * messages.dispose();
 * ```
 */
export function VirtualList<T>(
  options: VirtualListOptions<T>,
): VirtualListInstance<T> {
  const {
    itemKey,
    renderItem,
    itemVersion = (item: T) => item,
    estimatedItemHeight = 1,
    gap: defaultGap = 0,
    overscan: defaultOverscan = DEFAULT_OVERSCAN,
    maxCachedItems = DEFAULT_CACHE_LIMIT,
    maxRenderedItems = DEFAULT_RENDER_LIMIT,
    defaultScrollOffset = 0,
    defaultStickToBottom = false,
  } = options;

  assertNonNegativeInteger(defaultGap, "VirtualList gap");
  assertNonNegativeInteger(defaultOverscan, "VirtualList overscan");
  assertPositiveInteger(maxCachedItems, "VirtualList maxCachedItems");
  assertPositiveInteger(maxRenderedItems, "VirtualList maxRenderedItems");
  normalizeOffset(defaultScrollOffset, "VirtualList defaultScrollOffset");
  if (typeof estimatedItemHeight === "number") {
    assertPositiveInteger(
      estimatedItemHeight,
      "VirtualList estimatedItemHeight",
    );
  }

  const heightCache = new Map<StateKey, HeightEntry>();
  const explicitlyInvalidatedKeys = new Set<StateKey>();
  let explicitlyInvalidatedAll = false;
  let cacheWidth: number | undefined;
  let uncontrolledOffset = defaultScrollOffset;
  let uncontrolledSticky = defaultStickToBottom;
  let previousFrame: PreviousFrame | undefined;
  let lastAnchorNotice:
    | {
        baseOffset: number;
        effectiveOffset: number;
        maxOffset: number;
      }
    | undefined;
  let state: VirtualListState = {
    scrollOffset: 0,
    maxScrollOffset: 0,
    totalHeight: 0,
    stickToBottom: defaultStickToBottom,
    visibleStart: 0,
    visibleEnd: 0,
    renderedItems: 0,
    measuredItems: 0,
    cachedItems: 0,
  };

  function estimate(item: T, index: number, width: number): number {
    const value =
      typeof estimatedItemHeight === "number"
        ? estimatedItemHeight
        : estimatedItemHeight(item, index, width);
    assertPositiveInteger(value, `VirtualList estimate for item ${index}`);
    return value;
  }

  function retainHeight(key: StateKey, entry: HeightEntry): void {
    heightCache.delete(key);
    heightCache.set(key, entry);
    while (heightCache.size > maxCachedItems) {
      const oldest = heightCache.keys().next().value as StateKey | undefined;
      if (oldest === undefined) break;
      heightCache.delete(oldest);
    }
  }

  function resolveHeight(
    item: T,
    index: number,
    key: StateKey,
    revision: unknown,
    width: number,
    frameHeights: ReadonlyMap<StateKey, number>,
  ): number {
    const measured = frameHeights.get(key);
    if (measured !== undefined) return measured;
    const entry = heightCache.get(key);
    if (entry && entry.width === width && Object.is(entry.revision, revision)) {
      return entry.height;
    }
    return estimate(item, index, width);
  }

  function buildMetrics(
    items: readonly T[],
    keys: readonly StateKey[],
    revisions: readonly unknown[],
    width: number,
    gap: number,
    frameHeights: ReadonlyMap<StateKey, number>,
  ): Metrics {
    const starts: number[] = [];
    const ends: number[] = [];
    let position = 0;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const key = keys[index];
      if (item === undefined || key === undefined) {
        throw new Error(`VirtualList lost item metadata at index ${index}`);
      }
      const height = resolveHeight(
        item,
        index,
        key,
        revisions[index],
        width,
        frameHeights,
      );
      starts.push(position);
      ends.push(position + height);
      position += height;
      if (index < items.length - 1) position += gap;
      if (!Number.isSafeInteger(position)) {
        throw new RangeError("VirtualList total height exceeds safe integers");
      }
    }
    return { starts, ends, totalHeight: position };
  }

  function anchoredOffset(
    frame: PreviousFrame,
    currentIndices: ReadonlyMap<StateKey, number>,
    metrics: Metrics,
    maxOffset: number,
  ): number {
    if (currentIndices.size === 0 || frame.keys.length === 0) return 0;

    const resolveCandidate = (oldIndex: number): number | undefined => {
      const key = frame.keys[oldIndex];
      if (key === undefined) return undefined;
      const newIndex = currentIndices.get(key);
      if (newIndex === undefined) return undefined;
      const oldStart = frame.starts[oldIndex];
      const newStart = metrics.starts[newIndex];
      if (oldStart === undefined || newStart === undefined) return undefined;
      const screenPosition = oldStart - frame.offset;
      return clampOffset(newStart - screenPosition, maxOffset);
    };

    for (let index = frame.anchorIndex; index < frame.keys.length; index++) {
      const offset = resolveCandidate(index);
      if (offset !== undefined) return offset;
    }
    for (let index = frame.anchorIndex - 1; index >= 0; index--) {
      const offset = resolveCandidate(index);
      if (offset !== undefined) return offset;
    }
    return clampOffset(frame.offset, maxOffset);
  }

  function resetState(): void {
    heightCache.clear();
    explicitlyInvalidatedKeys.clear();
    explicitlyInvalidatedAll = false;
    cacheWidth = undefined;
    uncontrolledOffset = defaultScrollOffset;
    uncontrolledSticky = defaultStickToBottom;
    previousFrame = undefined;
    lastAnchorNotice = undefined;
    state = {
      scrollOffset: 0,
      maxScrollOffset: 0,
      totalHeight: 0,
      stickToBottom: defaultStickToBottom,
      visibleStart: 0,
      visibleEnd: 0,
      renderedItems: 0,
      measuredItems: 0,
      cachedItems: 0,
    };
  }

  function render(props: VirtualListProps<T>): ContainerNode {
    const {
      items,
      width,
      height,
      gap = defaultGap,
      overscan = defaultOverscan,
      scrollOffset,
      stickToBottom,
      onScroll,
      onStickToBottomChange,
      ...containerProps
    } = props;

    assertPositiveInteger(width, "VirtualList width");
    assertPositiveInteger(height, "VirtualList height");
    assertNonNegativeInteger(gap, "VirtualList gap");
    assertNonNegativeInteger(overscan, "VirtualList overscan");
    if (scrollOffset !== undefined) {
      normalizeOffset(scrollOffset, "VirtualList scrollOffset");
    }

    const keys: StateKey[] = [];
    const revisions: unknown[] = [];
    const keyIndices = new Map<StateKey, number>();
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (item === undefined) {
        throw new Error(`VirtualList item ${index} is unexpectedly undefined`);
      }
      const key = itemKey(item, index);
      if (keyIndices.has(key)) {
        throw new Error(`Duplicate VirtualList item key: ${formatKey(key)}`);
      }
      keyIndices.set(key, index);
      keys.push(key);
      revisions.push(itemVersion(item, index));
    }

    if (cacheWidth !== undefined && cacheWidth !== width) {
      heightCache.clear();
    }
    cacheWidth = width;
    for (const key of heightCache.keys()) {
      if (!keyIndices.has(key)) heightCache.delete(key);
    }
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (key === undefined) continue;
      const entry = heightCache.get(key);
      if (entry && !Object.is(entry.revision, revisions[index])) {
        heightCache.delete(key);
      }
    }

    const controlled = scrollOffset !== undefined;
    const sourceOffset = normalizeOffset(
      controlled ? scrollOffset : uncontrolledOffset,
      "VirtualList scroll offset",
    );
    const sticky = stickToBottom ?? uncontrolledSticky;
    const pinnedToBottom = sticky || sourceOffset === Infinity;
    const modelChanged =
      previousFrame === undefined ||
      previousFrame.keys.length !== keys.length ||
      keys.some(
        (key, index) =>
          key !== previousFrame?.keys[index] ||
          !Object.is(revisions[index], previousFrame.revisions[index]),
      );
    const sourceChanged =
      previousFrame !== undefined &&
      (controlled !== previousFrame.controlled ||
        (!offsetEquals(sourceOffset, previousFrame.sourceOffset) &&
          !offsetEquals(sourceOffset, previousFrame.offset)));
    const frameHeights = new Map<StateKey, number>();
    const renderedNodes = new Map<StateKey, Node>();

    let metrics = buildMetrics(
      items,
      keys,
      revisions,
      width,
      gap,
      frameHeights,
    );
    let maxOffset = Math.max(0, metrics.totalHeight - height);

    const resolveEffectiveOffset = (): number => {
      if (pinnedToBottom) return maxOffset;
      const baseOffset = clampOffset(sourceOffset, maxOffset);
      if (!previousFrame || sourceChanged) return baseOffset;
      return anchoredOffset(previousFrame, keyIndices, metrics, maxOffset);
    };

    let effectiveOffset = resolveEffectiveOffset();
    let range = calculateVirtualWindow(
      metrics,
      effectiveOffset,
      height,
      overscan,
      maxRenderedItems,
    );
    let metricsDirty = false;

    const materialize = (window: WindowRange): void => {
      for (let index = window.start; index < window.end; index++) {
        const item = items[index];
        const key = keys[index];
        if (item === undefined || key === undefined) continue;
        if (renderedNodes.has(key)) continue;
        const node = renderItem(item, index);
        const expectedHeight = resolveHeight(
          item,
          index,
          key,
          revisions[index],
          width,
          frameHeights,
        );
        const measuredHeight = measureContentHeight(VStack({}, [node]), {
          width,
        });
        assertNonNegativeInteger(
          measuredHeight,
          `VirtualList measured height for item ${index}`,
        );
        if (measuredHeight !== expectedHeight) metricsDirty = true;
        renderedNodes.set(key, node);
        frameHeights.set(key, measuredHeight);
        retainHeight(key, {
          height: measuredHeight,
          revision: revisions[index],
          width,
        });
      }
    };

    const refreshMetricsAndOffset = (): void => {
      metrics = buildMetrics(items, keys, revisions, width, gap, frameHeights);
      maxOffset = Math.max(0, metrics.totalHeight - height);
      effectiveOffset = resolveEffectiveOffset();
      metricsDirty = false;
    };

    // Newly prepended rows affect the preserved anchor even though they are
    // outside the visible window. Measure a bounded batch immediately so a
    // typical history-page prepend is compensated with exact heights instead
    // of estimates. Very large prepends remain bounded and converge as their
    // rows enter the measured window.
    if (
      previousFrame &&
      !sourceChanged &&
      !pinnedToBottom &&
      previousFrame.anchorIndex >= 0 &&
      (modelChanged ||
        explicitlyInvalidatedAll ||
        explicitlyInvalidatedKeys.size > 0)
    ) {
      const oldAnchorKey = previousFrame.keys[previousFrame.anchorIndex];
      const newAnchorIndex =
        oldAnchorKey === undefined ? -1 : (keyIndices.get(oldAnchorKey) ?? -1);
      if (newAnchorIndex > 0) {
        const previousKeys = new Set(previousFrame.keys);
        const previousRevisions = new Map<StateKey, unknown>();
        for (let index = 0; index < previousFrame.keys.length; index++) {
          const key = previousFrame.keys[index];
          if (key !== undefined) {
            previousRevisions.set(key, previousFrame.revisions[index]);
          }
        }
        let measuredPrepends = 0;
        for (
          let index = 0;
          index < newAnchorIndex && measuredPrepends < maxRenderedItems;
          index++
        ) {
          const key = keys[index];
          if (key === undefined) continue;
          const isNew = !previousKeys.has(key);
          const versionChanged =
            previousRevisions.has(key) &&
            !Object.is(previousRevisions.get(key), revisions[index]);
          const explicitlyInvalidated =
            explicitlyInvalidatedAll || explicitlyInvalidatedKeys.has(key);
          if (!isNew && !versionChanged && !explicitlyInvalidated) continue;
          materialize({ start: index, end: index + 1 });
          measuredPrepends++;
        }
        if (measuredPrepends > 0 && metricsDirty) {
          refreshMetricsAndOffset();
          range = calculateVirtualWindow(
            metrics,
            effectiveOffset,
            height,
            overscan,
            maxRenderedItems,
          );
        }
      }
    }

    for (let pass = 0; pass < MAX_MEASUREMENT_PASSES; pass++) {
      materialize(range);
      if (!metricsDirty) break;
      refreshMetricsAndOffset();
      const nextRange = calculateVirtualWindow(
        metrics,
        effectiveOffset,
        height,
        overscan,
        maxRenderedItems,
      );
      const settled = rangeEquals(range, nextRange);
      range = nextRange;
      if (settled) break;
    }
    materialize(range);

    // A moving window can expose one final set of estimated rows at its edge.
    // Commit those measurements so spacer and scrollbar extents are exact for
    // every node included in this frame. A pathological non-converging model
    // naturally settles on the next render while the returned row cap holds.
    if (metricsDirty) refreshMetricsAndOffset();

    const baseOffset = clampOffset(sourceOffset, maxOffset);
    if (
      !pinnedToBottom &&
      onScroll &&
      !offsetEquals(effectiveOffset, baseOffset)
    ) {
      const duplicateNotice =
        lastAnchorNotice !== undefined &&
        offsetEquals(lastAnchorNotice.baseOffset, baseOffset) &&
        offsetEquals(lastAnchorNotice.effectiveOffset, effectiveOffset) &&
        offsetEquals(lastAnchorNotice.maxOffset, maxOffset);
      if (!duplicateNotice) {
        lastAnchorNotice = {
          baseOffset,
          effectiveOffset,
          maxOffset,
        };
        onScroll(effectiveOffset, maxOffset, "anchor");
      }
    } else {
      lastAnchorNotice = undefined;
    }

    if (!controlled && sourceOffset !== Infinity) {
      uncontrolledOffset = effectiveOffset;
    }

    const anchorIndex =
      keys.length === 0
        ? -1
        : Math.min(
            firstEndAfter(metrics.ends, effectiveOffset),
            keys.length - 1,
          );
    const anchorKey = anchorIndex >= 0 ? keys[anchorIndex] : undefined;
    previousFrame = {
      keys: [...keys],
      revisions: [...revisions],
      starts: [...metrics.starts],
      offset: effectiveOffset,
      sourceOffset: controlled ? sourceOffset : effectiveOffset,
      controlled,
      anchorIndex,
    };
    explicitlyInvalidatedKeys.clear();
    explicitlyInvalidatedAll = false;

    state = {
      scrollOffset: effectiveOffset,
      maxScrollOffset: maxOffset,
      totalHeight: metrics.totalHeight,
      stickToBottom: pinnedToBottom,
      visibleStart: range.start,
      visibleEnd: range.end,
      renderedItems: range.end - range.start,
      measuredItems: frameHeights.size,
      cachedItems: heightCache.size,
      ...(anchorKey === undefined ? {} : { anchorKey }),
    };

    const visibleItems: Node[] = [];
    for (let index = range.start; index < range.end; index++) {
      const key = keys[index];
      if (key === undefined) continue;
      const node = renderedNodes.get(key);
      if (node) visibleItems.push(node);
    }

    const children: Node[] = [];
    const topHeight = metrics.starts[range.start] ?? 0;
    if (topHeight > 0) children.push(VStack({ height: topHeight }, []));
    if (visibleItems.length > 0) {
      children.push(VStack({ gap }, visibleItems));
    }
    const visibleHeight =
      range.end > range.start
        ? (metrics.ends[range.end - 1] ?? topHeight) - topHeight
        : 0;
    const bottomHeight = Math.max(
      0,
      metrics.totalHeight - topHeight - visibleHeight,
    );
    if (bottomHeight > 0) children.push(VStack({ height: bottomHeight }, []));

    const handleScroll: NonNullable<ContainerProps["onScroll"]> = (
      nextOffset,
      reportedMaxOffset,
    ) => {
      const clamped = clampOffset(nextOffset, reportedMaxOffset);
      const result = onScroll?.(clamped, reportedMaxOffset, "input");
      if (result === false) return false;

      if (!controlled) uncontrolledOffset = clamped;
      const nextSticky = clamped >= reportedMaxOffset;
      if (stickToBottom === undefined && nextSticky !== uncontrolledSticky) {
        uncontrolledSticky = nextSticky;
      }
      if (nextSticky !== pinnedToBottom) {
        onStickToBottomChange?.(nextSticky);
      }
      cel.render();
      return result;
    };

    return VStack(
      {
        ...containerProps,
        width,
        height,
        overflow: "scroll",
        scrollOffset: effectiveOffset,
        onScroll: handleScroll,
      },
      children,
    );
  }

  render.reset = () => {
    resetState();
    cel.render();
  };
  render.dispose = resetState;
  render.invalidate = (key?: StateKey) => {
    if (key === undefined) {
      heightCache.clear();
      explicitlyInvalidatedAll = true;
      explicitlyInvalidatedKeys.clear();
    } else {
      heightCache.delete(key);
      explicitlyInvalidatedKeys.add(key);
    }
    lastAnchorNotice = undefined;
    cel.render();
  };
  render.scrollTo = (offset: number) => {
    uncontrolledOffset = normalizeOffset(offset, "VirtualList scrollTo offset");
    uncontrolledSticky = false;
    cel.render();
  };
  render.scrollToEnd = () => {
    uncontrolledSticky = true;
    cel.render();
  };
  render.getState = () => ({ ...state });

  return render as VirtualListInstance<T>;
}
