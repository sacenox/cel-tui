import { cel, HStack, Text, TextInput, VStack } from "@cel-tui/core";
import type {
  Color,
  ContainerNode,
  ContainerProps,
  Node,
  SizeValue,
  StateKey,
  StyleProps,
} from "@cel-tui/types";

/**
 * An item in a Select list.
 *
 * Strings use the same text for their label, value, and filtering. Object
 * items can separate the value returned to the app from visible/filter text.
 */
export type SelectItem =
  | string
  | {
      /** Displayed text. */
      label: string;
      /** Value returned on selection. */
      value: string;
      /** Text matched against the search query. Defaults to `label`. */
      filterText?: string;
    };

/** Normalized form of a {@link SelectItem}. */
export interface NormalizedItem {
  label: string;
  value: string;
  filterText: string;
}

/** Filter and optionally rank normalized items for a query. */
export type SelectFilter = (
  items: readonly NormalizedItem[],
  query: string,
) => readonly NormalizedItem[];

/** Context passed to {@link SelectProps.renderRow}. */
export interface SelectRowContext {
  /** Zero-based index in the filtered list. */
  index: number;
  /** Current exact query text. */
  query: string;
  /** Whether this row is the keyboard highlight. */
  highlighted: boolean;
  /** Configured indicator string. */
  indicator: string;
  /** Configured highlight color. */
  highlightColor: Color;
  /** Select this row programmatically. */
  select: () => void;
}

/** Render one filtered Select row. Click handling is supplied by Select. */
export type SelectRowRenderer = (
  item: NormalizedItem,
  context: SelectRowContext,
) => Node;

/**
 * Dynamic values accepted by a Select instance at render time or through
 * {@link SelectInstance.update}. Render-time values are controlled for that
 * render; `update()` changes the instance's uncontrolled fallback state.
 */
export interface SelectModel {
  items?: readonly SelectItem[];
  query?: string;
  cursor?: number;
  highlightIndex?: number;
}

/** Snapshot of the model used by the most recent Select render. */
export interface SelectState {
  readonly query: string;
  /** UTF-16 query cursor offset, matching TextInput. */
  readonly cursor: number;
  readonly highlightIndex: number;
  readonly items: readonly NormalizedItem[];
  readonly filteredItems: readonly NormalizedItem[];
  readonly highlightedItem: NormalizedItem | undefined;
}

type SelectKeyPressHandler = NonNullable<ContainerProps["onKeyPress"]>;

/** Configuration for the {@link Select} component. */
export interface SelectProps {
  /** Items to choose from. May be replaced with `select.update()` or `select({ items })`. */
  items: readonly SelectItem[];
  /** Called when the user selects an item with Enter or a click. */
  onSelect: (value: string, item: NormalizedItem) => void;

  /** Initial query for uncontrolled use. Ignored while `query` is provided. */
  initialQuery?: string;
  /** Controlled exact query text. */
  query?: string;
  /** Called with the exact TextInput value after an edit or paste. */
  onQueryChange?: (query: string) => void;

  /** Initial filtered-list highlight for uncontrolled use. @default 0 */
  initialHighlightIndex?: number;
  /** Controlled index in the filtered item list. */
  highlightIndex?: number;
  /** Called when keyboard navigation requests a highlight change. */
  onHighlightChange?: (
    highlightIndex: number,
    item: NormalizedItem | undefined,
  ) => void;

  /** Controlled UTF-16 query cursor offset. */
  cursor?: number;
  /** Called when TextInput editing/navigation requests a cursor change. */
  onCursorChange?: (cursor: number) => void;

  /** Called when Escape cancels the Select. Supplying it consumes Escape. */
  onCancel?: (state: SelectState) => void;
  /** Custom filtering/ranking function. Defaults to {@link prefixFilter}. */
  filter?: SelectFilter;
  /** Custom row content. Select still supplies click handling and highlight style. */
  renderRow?: SelectRowRenderer;

  /** Placeholder shown in the query TextInput. @default "type to filter..." */
  placeholder?: string;
  /** Label before the query TextInput. @default "search: " */
  searchLabel?: string;
  /** Text shown when no items match. @default "no matches" */
  emptyLabel?: string;
  /** Maximum number of visible rows. Values below one are clamped to one. @default 10 */
  maxVisible?: number;
  /** Character used for the highlight indicator. @default "›" */
  indicator?: string;
  /** Color inherited by the highlighted row. @default "color06" */
  highlightColor?: Color;

  /** Non-editing keys bubble from the query TextInput to this handler. */
  onKeyPress?: SelectKeyPressHandler;
  /** Stable identity used by the query TextInput's cursor/focus state. */
  stateKey?: StateKey;
  /** Fixed width in cells or percentage. */
  width?: SizeValue;
  /** Fixed height in cells or percentage. */
  height?: SizeValue;
  /** Flex grow factor. */
  flex?: number;
  /** Foreground text color. */
  fgColor?: Color;
  /** Background color (fills the component rect). */
  bgColor?: Color;
  /** Controlled focus for the query TextInput. */
  focused?: boolean;
  /** Whether the query TextInput participates in focus traversal. @default true */
  focusable?: boolean;
  /** Seed uncontrolled focus when this Select first mounts. */
  autoFocus?: boolean;
  /** Called when the query TextInput receives focus. */
  onFocus?: ContainerProps["onFocus"];
  /** Called when the query TextInput loses focus. */
  onBlur?: ContainerProps["onBlur"];
  /** Query TextInput style overrides while focused. */
  focusStyle?: StyleProps;
}

/** A callable Select component instance returned by {@link Select}. */
export interface SelectInstance {
  /**
   * Produce the current node tree. Optional values override the instance for
   * this render, which supports ordinary external/controlled app state.
   */
  (model?: SelectModel): ContainerNode;
  /** Clear the query, cursor, highlight, and list scroll. */
  reset(): void;
  /** Imperatively update the uncontrolled fallback model and schedule a render. */
  update(model: SelectModel): void;
  /** Read the model snapshot used by the latest render. */
  getState(): SelectState;
}

/** Normalize Select inputs into a consistent shape. */
export function normalizeItems(items: readonly SelectItem[]): NormalizedItem[] {
  return items.map((item) => {
    if (typeof item === "string") {
      return { label: item, value: item, filterText: item };
    }
    return {
      label: item.label,
      value: item.value,
      filterText: item.filterText ?? item.label,
    };
  });
}

/**
 * Case-insensitive prefix matching against the full filter text or any
 * whitespace/slash-separated word.
 */
export function prefixFilter(
  items: readonly NormalizedItem[],
  query: string,
): NormalizedItem[] {
  if (!query) return [...items];
  const normalizedQuery = query.toLowerCase();
  return items.filter((item) => {
    const text = item.filterText.toLowerCase();
    if (text.startsWith(normalizedQuery)) return true;
    return text
      .split(/[\s/]+/)
      .some((word) => word.startsWith(normalizedQuery));
  });
}

/** Move a highlight up one row, wrapping at the beginning. */
export function moveUp(highlight: number, total: number): number {
  if (total === 0) return 0;
  return highlight <= 0 ? total - 1 : highlight - 1;
}

/** Move a highlight down one row, wrapping at the end. */
export function moveDown(highlight: number, total: number): number {
  if (total === 0) return 0;
  return highlight >= total - 1 ? 0 : highlight + 1;
}

/** Adjust list scroll so the highlighted row remains visible. */
export function adjustScroll(
  highlight: number,
  scrollOffset: number,
  maxVisible: number,
): number {
  if (highlight < scrollOffset) return highlight;
  if (highlight >= scrollOffset + maxVisible) {
    return highlight - maxVisible + 1;
  }
  return scrollOffset;
}

let nextGeneratedStateKey = 1;
const querySegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

function generatedStateKey(): StateKey {
  const key = `@cel-tui/select/${nextGeneratedStateKey}`;
  nextGeneratedStateKey += 1;
  return key;
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return value === Number.POSITIVE_INFINITY ? maximum : minimum;
  }
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
}

function clampQueryCursor(query: string, cursor: number): number {
  const target = Number.isFinite(cursor) ? Math.trunc(cursor) : 0;
  if (target <= 0) return 0;
  if (target >= query.length) return query.length;

  for (const { index, segment } of querySegmenter.segment(query)) {
    const end = index + segment.length;
    if (target <= index) return index;
    if (target < end) return index;
    if (target === end) return end;
  }
  return query.length;
}

function clampHighlight(index: number, total: number): number {
  return total === 0 ? 0 : clampInteger(index, 0, total - 1);
}

function copyState(state: SelectState): SelectState {
  return {
    query: state.query,
    cursor: state.cursor,
    highlightIndex: state.highlightIndex,
    items: state.items,
    filteredItems: state.filteredItems,
    highlightedItem: state.highlightedItem,
  };
}

/**
 * Create a filterable Select/Combobox backed by a real TextInput.
 *
 * The returned function preserves the original small static-list API:
 * create it once and call `select()` inside `cel.viewport()`. For async or
 * controlled callers, pass current values to `select(model)` each render or
 * update its uncontrolled fallback with `select.update(model)`.
 *
 * Text editing is delegated to TextInput, so exact case, spaces, grapheme
 * deletion, cursor movement, readline shortcuts, and bracketed paste all use
 * the same behavior as a standalone input. Up/Down navigate results, Enter
 * selects, and Escape invokes `onCancel` when supplied. Home/End and
 * Left/Right remain query-cursor editing keys.
 */
export function Select(props: SelectProps): SelectInstance {
  const requestedMaxVisible = props.maxVisible ?? 10;
  const maxVisible = Number.isFinite(requestedMaxVisible)
    ? Math.max(1, Math.trunc(requestedMaxVisible))
    : 10;
  const indicator = props.indicator ?? "›";
  const highlightColor = props.highlightColor ?? "color06";
  const filter = props.filter ?? prefixFilter;
  const inputStateKey = props.stateKey ?? generatedStateKey();

  let updatedItems: readonly SelectItem[] | undefined;
  let internalQuery = props.initialQuery ?? props.query ?? "";
  let internalCursor = props.cursor ?? internalQuery.length;
  let internalHighlightIndex =
    props.initialHighlightIndex ?? props.highlightIndex ?? 0;
  let internalFocused = false;
  let scrollOffset = 0;
  let latestState: SelectState | undefined;

  function resolveState(model?: SelectModel): SelectState {
    const items = normalizeItems(model?.items ?? updatedItems ?? props.items);
    const query = model?.query ?? props.query ?? internalQuery;
    const filteredItems = [...filter(items, query)];
    const highlightIndex = clampHighlight(
      model?.highlightIndex ?? props.highlightIndex ?? internalHighlightIndex,
      filteredItems.length,
    );
    const cursor = clampQueryCursor(
      query,
      model?.cursor ?? props.cursor ?? internalCursor,
    );

    if (
      model?.highlightIndex === undefined &&
      props.highlightIndex === undefined
    ) {
      internalHighlightIndex = highlightIndex;
    }
    if (model?.cursor === undefined && props.cursor === undefined) {
      internalCursor = cursor;
    }

    const maximumScroll = Math.max(0, filteredItems.length - maxVisible);
    scrollOffset = clampInteger(scrollOffset, 0, maximumScroll);
    scrollOffset = adjustScroll(highlightIndex, scrollOffset, maxVisible);

    return {
      query,
      cursor,
      highlightIndex,
      items,
      filteredItems,
      highlightedItem: filteredItems[highlightIndex],
    };
  }

  function filteredFor(items: readonly NormalizedItem[], query: string) {
    return [...filter(items, query)];
  }

  function render(model?: SelectModel): ContainerNode {
    const state = resolveState(model);
    latestState = state;
    // Core can decode several edits/navigation keys from one stdin chunk
    // before the scheduled render runs. Keep the event model current so each
    // handler observes all preceding events in that same batch.
    let eventState = state;

    const queryControlled =
      model?.query !== undefined || props.query !== undefined;
    const cursorControlled =
      model?.cursor !== undefined || props.cursor !== undefined;
    const highlightControlled =
      model?.highlightIndex !== undefined || props.highlightIndex !== undefined;
    const inputFocused = props.focused ?? internalFocused;
    const inheritedFocusStyle = inputFocused ? props.focusStyle : undefined;

    function requestHighlight(
      nextIndex: number,
      filteredItems = eventState.filteredItems,
    ): void {
      const next = clampHighlight(nextIndex, filteredItems.length);
      if (!highlightControlled) internalHighlightIndex = next;
      scrollOffset = adjustScroll(next, scrollOffset, maxVisible);
      if (next !== eventState.highlightIndex) {
        props.onHighlightChange?.(next, filteredItems[next]);
      }
      eventState = {
        ...eventState,
        highlightIndex: next,
        filteredItems,
        highlightedItem: filteredItems[next],
      };
      cel.render();
    }

    function handleQueryChange(nextQuery: string): void {
      if (!queryControlled) internalQuery = nextQuery;
      scrollOffset = 0;
      props.onQueryChange?.(nextQuery);

      const nextFiltered = filteredFor(eventState.items, nextQuery);
      eventState = {
        ...eventState,
        query: nextQuery,
        cursor: clampQueryCursor(nextQuery, eventState.cursor),
        filteredItems: nextFiltered,
        highlightedItem: nextFiltered[eventState.highlightIndex],
      };
      requestHighlight(0, nextFiltered);
    }

    function handleCursorChange(nextCursor: number): void {
      const clamped = clampQueryCursor(eventState.query, nextCursor);
      if (!cursorControlled) internalCursor = clamped;
      eventState = { ...eventState, cursor: clamped };
      props.onCursorChange?.(clamped);
    }

    function selectItem(selected: NormalizedItem): void {
      props.onSelect(selected.value, selected);
    }

    function handleInputKey(key: string): ReturnType<SelectKeyPressHandler> {
      switch (key) {
        case "up":
          requestHighlight(
            moveUp(eventState.highlightIndex, eventState.filteredItems.length),
          );
          return false;
        case "down":
          requestHighlight(
            moveDown(
              eventState.highlightIndex,
              eventState.filteredItems.length,
            ),
          );
          return false;
        case "pageup":
          requestHighlight(eventState.highlightIndex - maxVisible);
          return false;
        case "pagedown":
          requestHighlight(eventState.highlightIndex + maxVisible);
          return false;
        case "enter":
        case "shift+enter":
          if (eventState.highlightedItem)
            selectItem(eventState.highlightedItem);
          return false;
        case "escape":
          if (props.onCancel) {
            props.onCancel(copyState(eventState));
            return false;
          }
          return;
        default:
          // Let TextInput edit printable text/navigation keys. Non-editing
          // keys then bubble to the Select root and its ancestors.
          return;
      }
    }

    const visible = state.filteredItems.slice(
      scrollOffset,
      scrollOffset + maxVisible,
    );
    const overflow = state.filteredItems.length - scrollOffset - visible.length;
    const children: Node[] = [
      HStack({}, [
        Text(props.searchLabel ?? "search: ", { fgColor: "color08" }),
        TextInput({
          stateKey: inputStateKey,
          flex: 1,
          height: 1,
          value: state.query,
          cursor: state.cursor,
          onChange: handleQueryChange,
          onCursorChange: handleCursorChange,
          onKeyPress: handleInputKey,
          placeholder: Text(props.placeholder ?? "type to filter...", {
            fgColor: "color08",
          }),
          focused: props.focused,
          focusable: props.focusable ?? true,
          autoFocus: props.autoFocus,
          onFocus: (event) => {
            internalFocused = true;
            props.onFocus?.(event);
          },
          onBlur: (event) => {
            internalFocused = false;
            props.onBlur?.(event);
          },
          focusStyle: props.focusStyle,
        }),
      ]),
    ];

    if (state.filteredItems.length === 0) {
      children.push(
        HStack({}, [
          Text(`  ${props.emptyLabel ?? "no matches"}`, {
            fgColor: "color08",
          }),
        ]),
      );
    } else {
      for (
        let visibleIndex = 0;
        visibleIndex < visible.length;
        visibleIndex++
      ) {
        const candidate = visible[visibleIndex];
        if (!candidate) continue;
        const index = scrollOffset + visibleIndex;
        const highlighted = index === state.highlightIndex;
        const select = () => selectItem(candidate);
        const row = props.renderRow?.(candidate, {
          index,
          query: state.query,
          highlighted,
          indicator,
          highlightColor,
          select,
        });

        children.push(
          HStack(
            {
              onClick: select,
              focusable: false,
              fgColor: highlighted ? highlightColor : undefined,
            },
            row
              ? [row]
              : [
                  Text(highlighted ? `${indicator} ` : "  "),
                  Text(candidate.label),
                ],
          ),
        );
      }
    }

    if (overflow > 0) {
      children.push(
        HStack({}, [Text(`  ${overflow} more`, { fgColor: "color08" })]),
      );
    }

    return VStack(
      {
        // The actual TextInput is the only focus target. Keeping the wrapper
        // non-focusable avoids a dead intermediate Tab stop.
        focusable: false,
        onKeyPress: props.onKeyPress,
        width: props.width,
        height: props.height,
        flex: props.flex,
        bold: inheritedFocusStyle?.bold,
        italic: inheritedFocusStyle?.italic,
        underline: inheritedFocusStyle?.underline,
        fgColor: inheritedFocusStyle?.fgColor ?? props.fgColor,
        bgColor: inheritedFocusStyle?.bgColor ?? props.bgColor,
      },
      children,
    );
  }

  render.reset = () => {
    const state = latestState ?? resolveState();
    internalQuery = "";
    internalCursor = 0;
    internalHighlightIndex = 0;
    scrollOffset = 0;

    if (state.query !== "") props.onQueryChange?.("");
    if (state.cursor !== 0) props.onCursorChange?.(0);
    if (state.highlightIndex !== 0) {
      const unfiltered = filteredFor(state.items, "");
      props.onHighlightChange?.(0, unfiltered[0]);
    }
    latestState = undefined;
    cel.render();
  };

  render.update = (model: SelectModel) => {
    if (model.items !== undefined) updatedItems = model.items;
    if (model.query !== undefined) {
      internalQuery = model.query;
      if (model.cursor === undefined) internalCursor = model.query.length;
      scrollOffset = 0;
    }
    if (model.cursor !== undefined) internalCursor = model.cursor;
    if (model.highlightIndex !== undefined) {
      internalHighlightIndex = model.highlightIndex;
    }
    latestState = undefined;
    cel.render();
  };

  render.getState = () => copyState(latestState ?? resolveState());

  return render as SelectInstance;
}
