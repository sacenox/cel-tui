/**
 * A normalized syntax token produced by `clew`.
 *
 * Offsets are zero-based UTF-16 code-unit offsets into the source content,
 * matching JavaScript string indexing.
 * `start` is inclusive and `end` is exclusive.
 */
export interface ClewToken {
  /** Token text exactly as it appears in the source. */
  text: string;
  /** Inclusive start offset in the source content. */
  start: number;
  /** Exclusive end offset in the source content. */
  end: number;
  /** Best-effort normalized token kind, such as `keyword` or `string`. */
  type: string;
  /** Optional more specific semantic path. */
  path?: readonly string[];
  /** Ordered canonical scopes from generic to more specific. */
  scopes?: readonly string[];
}

/**
 * The final structured token output for a completed tokenization pass.
 */
export interface ClewOutput {
  tokens: ClewToken[];
}

/**
 * A token patch emitted during streaming.
 *
 * It describes the tokenization for the source range `from..to`.
 * Consumers can use this to append newly stable output or replace a previously
 * emitted range with corrected tokens.
 */
export interface ClewPatch {
  /** Inclusive start offset in the source content. */
  from: number;
  /** Exclusive end offset in the previously emitted source content. */
  to: number;
  /** Replacement tokens for the range. */
  tokens: ClewToken[];
}

/**
 * Newly emitted tokenization from the stream.
 */
export type ClewChunk = ClewPatch;

/**
 * A correction for earlier streamed output.
 */
export type ClewCorrection = ClewPatch;

/**
 * Removes a previously registered listener.
 */
export type ClewUnsubscribe = () => void;

/**
 * Controls how aggressively the stream emits tokenization before later input
 * can confirm it.
 *
 * - `eager` — emit as early as possible and correct later if needed.
 * - `stable` — hold back output until it is less likely to change.
 */
export type ClewStability = "eager" | "stable";

/**
 * Common tokenizer options shared by sync and stream modes.
 */
export interface ClewBaseOptions {
  /** Language identifier used to choose a tokenizer backend or grammar. */
  lang: string;
}

/**
 * Options for sync tokenization.
 *
 * Sync mode is opt-in. `clew` defaults to streaming.
 */
export interface ClewSyncOptions extends ClewBaseOptions {
  stream: false;
}

/**
 * Options for streaming tokenization.
 */
export interface ClewStreamOptions extends ClewBaseOptions {
  /** Streaming is the default mode. */
  stream?: true;
  /**
   * Streaming-first default: emit tokenization eagerly and correct it later if
   * later input changes the parse.
   */
  stability?: ClewStability;
}

/**
 * Full options accepted by `clew`.
 */
export type ClewOptions = ClewSyncOptions | ClewStreamOptions;

/**
 * A stream-first tokenizer interface.
 *
 * `write()` accepts additional content, including per-character input.
 * `onChunk()` emits newly available tokenization.
 * `onCorrection()` emits range-based corrections when later input changes
 * earlier tokenization.
 */
export interface ClewStream {
  /** Register a listener for newly emitted tokenization. */
  onChunk(listener: (chunk: ClewChunk) => void): ClewUnsubscribe;
  /** Register a listener for corrections to earlier tokenization. */
  onCorrection(listener: (correction: ClewCorrection) => void): ClewUnsubscribe;
  /** Write more source content into the stream. */
  write(chunk: string): void;
  /** Return the current token snapshot without ending the stream. */
  snapshot(): ClewOutput;
  /** Finalize the stream and return the final structured output. */
  end(): ClewOutput;
}
