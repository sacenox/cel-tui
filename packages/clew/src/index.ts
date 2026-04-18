import type {
  ClewOptions,
  ClewOutput,
  ClewStream,
  ClewStreamOptions,
  ClewSyncOptions,
} from "./model.js";
import { getLanguageSupport } from "./registry.js";
import { createStream } from "./stream.js";

export type {
  ClewBaseOptions,
  ClewChunk,
  ClewCorrection,
  ClewOptions,
  ClewOutput,
  ClewPatch,
  ClewStability,
  ClewStream,
  ClewStreamOptions,
  ClewSyncOptions,
  ClewToken,
  ClewUnsubscribe,
} from "./model.js";
export { clewSupportsLanguage } from "./registry.js";

/**
 * Tokenize full content synchronously.
 */
export function clew(content: string, options: ClewSyncOptions): ClewOutput;
/**
 * Create a streaming tokenizer.
 *
 * Streaming is the default mode, and `stability` defaults to `"eager"`.
 *
 * The current implementation supports TypeScript / JavaScript ids, Python,
 * Bash, JSON, and Markdown.
 */
export function clew(content: string, options: ClewStreamOptions): ClewStream;
export function clew(
  content: string,
  options: ClewOptions,
): ClewOutput | ClewStream {
  const support = getLanguageSupport(options.lang);

  if (options.stream === false) {
    return support.tokenize(content);
  }

  return createStream(content, options, support);
}
