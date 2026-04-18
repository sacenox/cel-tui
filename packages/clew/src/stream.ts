import type {
  ClewChunk,
  ClewCorrection,
  ClewOutput,
  ClewStream,
  ClewStreamOptions,
  ClewUnsubscribe,
} from "./model.js";
import type { ClewLanguageSupport } from "./registry.js";
import {
  cloneOutput,
  commonPrefixLength,
  outputAtBoundary,
  stableLineBoundary,
  tokensFrom,
  tokensStartingAtOrAfter,
} from "./shared.js";

function emitPatch<T>(listeners: Set<(value: T) => void>, value: T): void {
  for (const listener of listeners) {
    listener(value);
  }
}

export function createStream(
  content: string,
  options: ClewStreamOptions,
  support: ClewLanguageSupport,
): ClewStream {
  const chunkListeners = new Set<(chunk: ClewChunk) => void>();
  const correctionListeners = new Set<(correction: ClewCorrection) => void>();
  const stability = options.stability ?? "eager";
  const boundaryOf = support.stableBoundary ?? stableLineBoundary;

  let ended = false;
  let currentContent = content;
  let currentOutput = support.tokenize(content);
  let emittedBoundary =
    stability === "stable"
      ? boundaryOf(currentContent, false)
      : currentContent.length;
  let emittedOutput =
    stability === "stable"
      ? outputAtBoundary(currentOutput, emittedBoundary)
      : cloneOutput(currentOutput);

  function publish(nextBoundary: number, nextOutput: ClewOutput): void {
    const prefix = commonPrefixLength(emittedOutput.tokens, nextOutput.tokens);
    const previousBoundary = emittedBoundary;

    if (
      prefix === emittedOutput.tokens.length &&
      prefix === nextOutput.tokens.length &&
      previousBoundary === nextBoundary
    ) {
      emittedBoundary = nextBoundary;
      emittedOutput = cloneOutput(nextOutput);
      return;
    }

    if (prefix === emittedOutput.tokens.length) {
      if (nextBoundary > previousBoundary) {
        emitPatch(chunkListeners, {
          from: previousBoundary,
          to: previousBoundary,
          tokens: tokensStartingAtOrAfter(nextOutput.tokens, previousBoundary),
        });
      }
    } else {
      const previousChanged = emittedOutput.tokens[prefix];
      const nextChanged = nextOutput.tokens[prefix];
      const from = Math.min(
        previousChanged?.start ?? previousBoundary,
        nextChanged?.start ?? nextBoundary,
      );

      emitPatch(correctionListeners, {
        from,
        to: previousBoundary,
        tokens: tokensFrom(nextOutput.tokens, from),
      });
    }

    emittedBoundary = nextBoundary;
    emittedOutput = cloneOutput(nextOutput);
  }

  function register<T>(
    listeners: Set<(value: T) => void>,
    listener: (value: T) => void,
  ): ClewUnsubscribe {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    onChunk(listener) {
      return register(chunkListeners, listener);
    },
    onCorrection(listener) {
      return register(correctionListeners, listener);
    },
    write(chunk) {
      if (ended) {
        throw new Error("Cannot write to a clew stream after end().");
      }
      if (chunk.length === 0) {
        return;
      }

      currentContent += chunk;
      currentOutput = support.tokenize(currentContent);

      const nextBoundary =
        stability === "stable"
          ? boundaryOf(currentContent, false)
          : currentContent.length;
      const nextOutput =
        stability === "stable"
          ? outputAtBoundary(currentOutput, nextBoundary)
          : currentOutput;

      publish(nextBoundary, nextOutput);
    },
    snapshot() {
      return cloneOutput(currentOutput);
    },
    end() {
      if (!ended) {
        ended = true;
        publish(currentContent.length, currentOutput);
      }
      return cloneOutput(currentOutput);
    },
  };
}
