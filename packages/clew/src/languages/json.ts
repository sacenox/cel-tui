import type { ClewOutput, ClewToken } from "../model.js";
import type { ClewLanguageSupport } from "../registry.js";
import { pushTokenRange, stableLineBoundary } from "../shared.js";

type JsonContext =
  | {
      kind: "array";
      state: "valueOrEnd" | "commaOrEnd";
    }
  | {
      kind: "object";
      state: "keyOrEnd" | "colon" | "valueOrEnd" | "commaOrEnd";
    };

interface JsonTokenizerState {
  content: string;
  index: number;
  rootValueComplete: boolean;
  stack: JsonContext[];
  tokens: ClewToken[];
}

function currentContext(state: JsonTokenizerState): JsonContext | undefined {
  return state.stack.at(-1);
}

function pushToken(
  state: JsonTokenizerState,
  start: number,
  end: number,
  type: string,
  scopes?: readonly string[],
): void {
  pushTokenRange(state.tokens, state.content, start, end, type, scopes);
}

function completeValue(state: JsonTokenizerState): void {
  const context = currentContext(state);
  if (!context) {
    state.rootValueComplete = true;
    return;
  }

  context.state = "commaOrEnd";
}

function readStringEnd(content: string, start: number): number {
  let index = start + 1;

  while (index < content.length) {
    const char = content[index];

    if (char === "\\") {
      index += 2;
      continue;
    }

    if (char === '"') {
      return index + 1;
    }

    index += 1;
  }

  return content.length;
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= "0" && char <= "9";
}

function readNumberEnd(content: string, start: number): number {
  let index = start;

  if (content[index] === "-") {
    index += 1;
  }

  if (content[index] === "0") {
    index += 1;
  } else {
    while (isDigit(content[index])) {
      index += 1;
    }
  }

  if (content[index] === ".") {
    index += 1;
    while (isDigit(content[index])) {
      index += 1;
    }
  }

  const exponent = content[index];
  if (exponent === "e" || exponent === "E") {
    index += 1;
    const sign = content[index];
    if (sign === "+" || sign === "-") {
      index += 1;
    }
    while (isDigit(content[index])) {
      index += 1;
    }
  }

  return index;
}

function consumeKeyword(
  state: JsonTokenizerState,
  keyword: string,
  scopes?: readonly string[],
): boolean {
  if (!state.content.startsWith(keyword, state.index)) {
    return false;
  }

  const end = state.index + keyword.length;
  pushToken(state, state.index, end, "keyword", scopes ?? ["keyword"]);
  state.index = end;
  completeValue(state);
  return true;
}

function tokenizeJson(content: string): ClewOutput {
  const state: JsonTokenizerState = {
    content,
    index: 0,
    rootValueComplete: false,
    stack: [],
    tokens: [],
  };

  while (state.index < content.length) {
    const char = content[state.index];

    if (char === undefined) {
      break;
    }

    if (/\s/.test(char)) {
      const start = state.index;
      while (/\s/.test(content[state.index] ?? "")) {
        state.index += 1;
      }
      pushToken(state, start, state.index, "whitespace");
      continue;
    }

    const context = currentContext(state);

    if (char === "{") {
      pushToken(state, state.index, state.index + 1, "punctuation");
      state.index += 1;
      state.stack.push({ kind: "object", state: "keyOrEnd" });
      continue;
    }

    if (char === "[") {
      pushToken(state, state.index, state.index + 1, "punctuation");
      state.index += 1;
      state.stack.push({ kind: "array", state: "valueOrEnd" });
      continue;
    }

    if (char === "}") {
      pushToken(state, state.index, state.index + 1, "punctuation");
      state.index += 1;
      if (context?.kind === "object") {
        state.stack.pop();
        completeValue(state);
      }
      continue;
    }

    if (char === "]") {
      pushToken(state, state.index, state.index + 1, "punctuation");
      state.index += 1;
      if (context?.kind === "array") {
        state.stack.pop();
        completeValue(state);
      }
      continue;
    }

    if (char === ":") {
      pushToken(state, state.index, state.index + 1, "punctuation");
      state.index += 1;
      if (context?.kind === "object" && context.state === "colon") {
        context.state = "valueOrEnd";
      }
      continue;
    }

    if (char === ",") {
      pushToken(state, state.index, state.index + 1, "punctuation");
      state.index += 1;
      if (context?.kind === "object" && context.state === "commaOrEnd") {
        context.state = "keyOrEnd";
      } else if (context?.kind === "array" && context.state === "commaOrEnd") {
        context.state = "valueOrEnd";
      }
      continue;
    }

    if (char === '"') {
      const start = state.index;
      const end = readStringEnd(content, start);
      const isProperty =
        context?.kind === "object" && context.state === "keyOrEnd";
      pushToken(
        state,
        start,
        end,
        "string",
        isProperty ? ["string", "property"] : ["string"],
      );
      state.index = end;

      if (isProperty && context.kind === "object") {
        context.state = "colon";
      } else {
        completeValue(state);
      }
      continue;
    }

    if (char === "-" || isDigit(char)) {
      const end = readNumberEnd(content, state.index);
      if (end > state.index) {
        pushToken(state, state.index, end, "number");
        state.index = end;
        completeValue(state);
        continue;
      }
    }

    if (
      consumeKeyword(state, "true", ["keyword", "constant.boolean"]) ||
      consumeKeyword(state, "false", ["keyword", "constant.boolean"]) ||
      consumeKeyword(state, "null", ["keyword", "constant.null"])
    ) {
      continue;
    }

    pushToken(state, state.index, state.index + 1, "text");
    state.index += 1;
  }

  return { tokens: state.tokens };
}

export const jsonLanguageSupport: ClewLanguageSupport = {
  ids: ["json"],
  stableBoundary: stableLineBoundary,
  tokenize: tokenizeJson,
};
