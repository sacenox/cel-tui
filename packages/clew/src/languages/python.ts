import type { ClewOutput, ClewToken } from "../model.js";
import type { ClewLanguageSupport } from "../registry.js";
import { pushTokenRange, stableLineBoundary } from "../shared.js";

const PYTHON_KEYWORDS = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "case",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "match",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const PYTHON_BUILTINS = new Set([
  "abs",
  "aiter",
  "all",
  "anext",
  "any",
  "ascii",
  "bin",
  "breakpoint",
  "callable",
  "chr",
  "classmethod",
  "compile",
  "delattr",
  "dir",
  "divmod",
  "enumerate",
  "eval",
  "exec",
  "filter",
  "format",
  "getattr",
  "globals",
  "hasattr",
  "hash",
  "help",
  "hex",
  "id",
  "input",
  "isinstance",
  "issubclass",
  "iter",
  "len",
  "locals",
  "map",
  "max",
  "min",
  "next",
  "oct",
  "open",
  "ord",
  "pow",
  "print",
  "property",
  "repr",
  "reversed",
  "round",
  "setattr",
  "sorted",
  "staticmethod",
  "sum",
  "super",
  "vars",
  "zip",
  "__import__",
]);

const PYTHON_TYPE_NAMES = new Set([
  "BaseException",
  "Exception",
  "bool",
  "bytearray",
  "bytes",
  "complex",
  "dict",
  "float",
  "frozenset",
  "int",
  "list",
  "memoryview",
  "object",
  "range",
  "set",
  "slice",
  "str",
  "tuple",
  "type",
]);

const STRING_PREFIX_CHARS = new Set(["b", "f", "r", "u"]);

const OPERATORS = [
  "**=",
  "//=",
  "<<=",
  ">>=",
  "@=",
  ":=",
  "==",
  "!=",
  "<=",
  ">=",
  "->",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "**",
  "//",
  "<<",
  ">>",
  "=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "@",
  "&",
  "|",
  "^",
  "~",
  "<",
  ">",
] as const;

interface PythonStringStart {
  prefixEnd: number;
  quote: '"' | "'";
  raw: boolean;
  triple: boolean;
}

interface PythonTokenizerState {
  content: string;
  expectIdentifierType: "function" | "type" | null;
  index: number;
  lastSignificantToken: ClewToken | null;
  tokens: ClewToken[];
}

function pushToken(
  state: PythonTokenizerState,
  start: number,
  end: number,
  type: string,
  scopes?: readonly string[],
): void {
  pushTokenRange(state.tokens, state.content, start, end, type, scopes);

  const token = state.tokens.at(-1);
  if (!token) {
    return;
  }

  if (type !== "comment" && type !== "whitespace") {
    state.lastSignificantToken = token;
  }
}

function isWhitespace(char: string | undefined): boolean {
  return char !== undefined && /\s/.test(char);
}

function isIdentifierStart(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

function isStringPrefixChar(char: string | undefined): boolean {
  return char !== undefined && STRING_PREFIX_CHARS.has(char.toLowerCase());
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= "0" && char <= "9";
}

function isBinaryDigit(char: string | undefined): boolean {
  return char === "0" || char === "1";
}

function isOctalDigit(char: string | undefined): boolean {
  return char !== undefined && char >= "0" && char <= "7";
}

function isHexDigit(char: string | undefined): boolean {
  return char !== undefined && /[0-9a-fA-F]/.test(char);
}

function readDigitsWithUnderscores(
  content: string,
  start: number,
  predicate: (char: string | undefined) => boolean,
): number {
  let index = start;
  let sawDigit = false;

  while (true) {
    const char = content[index];
    if (predicate(char)) {
      sawDigit = true;
      index += 1;
      continue;
    }

    if (char === "_" && sawDigit && predicate(content[index + 1])) {
      index += 1;
      continue;
    }

    break;
  }

  return sawDigit ? index : -1;
}

function readExponentPart(content: string, start: number): number {
  const marker = content[start];
  if (marker !== "e" && marker !== "E") {
    return start;
  }

  let index = start + 1;
  if (content[index] === "+" || content[index] === "-") {
    index += 1;
  }

  const digitsEnd = readDigitsWithUnderscores(content, index, isDigit);
  return digitsEnd === -1 ? start : digitsEnd;
}

function readNumberEnd(content: string, start: number): number {
  if (content[start] === ".") {
    const fractionEnd = readDigitsWithUnderscores(content, start + 1, isDigit);
    if (fractionEnd === -1) {
      return start;
    }

    let index = readExponentPart(content, fractionEnd);
    if (content[index] === "j" || content[index] === "J") {
      index += 1;
    }
    return index;
  }

  if (content[start] === "0") {
    const marker = content[start + 1];
    if (marker === "b" || marker === "B") {
      const end = readDigitsWithUnderscores(content, start + 2, isBinaryDigit);
      return end === -1 ? Math.min(content.length, start + 2) : end;
    }
    if (marker === "o" || marker === "O") {
      const end = readDigitsWithUnderscores(content, start + 2, isOctalDigit);
      return end === -1 ? Math.min(content.length, start + 2) : end;
    }
    if (marker === "x" || marker === "X") {
      const end = readDigitsWithUnderscores(content, start + 2, isHexDigit);
      return end === -1 ? Math.min(content.length, start + 2) : end;
    }
  }

  let index = readDigitsWithUnderscores(content, start, isDigit);
  if (index === -1) {
    return start;
  }

  if (content[index] === "." && content[index + 1] !== ".") {
    index += 1;
    const fractionEnd = readDigitsWithUnderscores(content, index, isDigit);
    if (fractionEnd !== -1) {
      index = fractionEnd;
    }
  }

  index = readExponentPart(content, index);
  if (content[index] === "j" || content[index] === "J") {
    index += 1;
  }

  return index;
}

function readIdentifierEnd(content: string, start: number): number {
  let index = start + 1;
  while (isIdentifierPart(content[index])) {
    index += 1;
  }
  return index;
}

function readStringStart(
  content: string,
  start: number,
): PythonStringStart | undefined {
  const first = content[start];
  if (first === '"' || first === "'") {
    return {
      prefixEnd: start,
      quote: first,
      raw: false,
      triple: content.startsWith(first.repeat(3), start),
    };
  }

  if (!isStringPrefixChar(first)) {
    return undefined;
  }

  let prefixEnd = start;
  while (
    prefixEnd < content.length &&
    prefixEnd - start < 2 &&
    isStringPrefixChar(content[prefixEnd])
  ) {
    prefixEnd += 1;
  }

  const quote = content[prefixEnd];
  if (quote !== '"' && quote !== "'") {
    return undefined;
  }

  return {
    prefixEnd,
    quote,
    raw: /r/i.test(content.slice(start, prefixEnd)),
    triple: content.startsWith(quote.repeat(3), prefixEnd),
  };
}

function readStringEnd(
  content: string,
  _start: number,
  stringStart: PythonStringStart,
): number {
  const closing = stringStart.triple
    ? stringStart.quote.repeat(3)
    : stringStart.quote;
  let index = stringStart.prefixEnd + closing.length;

  while (index < content.length) {
    if (!stringStart.raw && content[index] === "\\") {
      index += 2;
      continue;
    }

    if (content.startsWith(closing, index)) {
      return index + closing.length;
    }

    index += 1;
  }

  return content.length;
}

function readCommentEnd(content: string, start: number): number {
  let index = start;
  while (
    index < content.length &&
    content[index] !== "\n" &&
    content[index] !== "\r"
  ) {
    index += 1;
  }
  return index;
}

function readWhitespaceEnd(content: string, start: number): number {
  let index = start;
  while (isWhitespace(content[index])) {
    index += 1;
  }
  return index;
}

function isDecoratorStart(content: string, start: number): boolean {
  if (content[start] !== "@" || !isIdentifierStart(content[start + 1])) {
    return false;
  }

  let index = start - 1;
  while (index >= 0 && (content[index] === " " || content[index] === "\t")) {
    index -= 1;
  }

  return index < 0 || content[index] === "\n" || content[index] === "\r";
}

function readDecoratorEnd(content: string, start: number): number {
  let index = start + 1;

  while (true) {
    if (!isIdentifierStart(content[index])) {
      return index;
    }

    index = readIdentifierEnd(content, index);
    if (content[index] !== "." || !isIdentifierStart(content[index + 1])) {
      return index;
    }

    index += 1;
  }
}

function matchOperator(content: string, start: number): string | undefined {
  return OPERATORS.find((operator) => content.startsWith(operator, start));
}

function readIdentifier(state: PythonTokenizerState): void {
  const start = state.index;
  const end = readIdentifierEnd(state.content, start);
  const text = state.content.slice(start, end);

  if (text === "True" || text === "False") {
    pushToken(state, start, end, "keyword", ["keyword", "constant.boolean"]);
    state.expectIdentifierType = null;
    state.index = end;
    return;
  }

  if (text === "None") {
    pushToken(state, start, end, "keyword", ["keyword", "constant.none"]);
    state.expectIdentifierType = null;
    state.index = end;
    return;
  }

  if (PYTHON_KEYWORDS.has(text)) {
    pushToken(state, start, end, "keyword");
    state.expectIdentifierType =
      text === "def" ? "function" : text === "class" ? "type" : null;
    state.index = end;
    return;
  }

  if (state.expectIdentifierType) {
    pushToken(state, start, end, state.expectIdentifierType);
    state.expectIdentifierType = null;
    state.index = end;
    return;
  }

  if (state.lastSignificantToken?.text === ".") {
    pushToken(state, start, end, "property");
    state.index = end;
    return;
  }

  if (PYTHON_TYPE_NAMES.has(text)) {
    pushToken(state, start, end, "type");
    state.index = end;
    return;
  }

  if (PYTHON_BUILTINS.has(text)) {
    pushToken(state, start, end, "builtin");
    state.index = end;
    return;
  }

  pushToken(state, start, end, "identifier", ["identifier", "variable"]);
  state.index = end;
}

function tokenizePython(content: string): ClewOutput {
  const state: PythonTokenizerState = {
    content,
    expectIdentifierType: null,
    index: 0,
    lastSignificantToken: null,
    tokens: [],
  };

  while (state.index < content.length) {
    const char = content[state.index];
    if (char === undefined) {
      break;
    }

    if (isWhitespace(char)) {
      const end = readWhitespaceEnd(content, state.index);
      const whitespace = content.slice(state.index, end);
      pushToken(state, state.index, end, "whitespace");
      if (whitespace.includes("\n") || whitespace.includes("\r")) {
        state.expectIdentifierType = null;
        state.lastSignificantToken = null;
      }
      state.index = end;
      continue;
    }

    if (char === "#") {
      const end = readCommentEnd(content, state.index);
      pushToken(state, state.index, end, "comment");
      state.index = end;
      continue;
    }

    if (isDecoratorStart(content, state.index)) {
      const end = readDecoratorEnd(content, state.index);
      pushToken(state, state.index, end, "meta", ["meta", "meta.decorator"]);
      state.expectIdentifierType = null;
      state.index = end;
      continue;
    }

    const stringStart = readStringStart(content, state.index);
    if (stringStart) {
      const end = readStringEnd(content, state.index, stringStart);
      pushToken(state, state.index, end, "string");
      state.expectIdentifierType = null;
      state.index = end;
      continue;
    }

    if (char === "." && isDigit(content[state.index + 1])) {
      const end = readNumberEnd(content, state.index);
      pushToken(state, state.index, end, "number");
      state.expectIdentifierType = null;
      state.index = end;
      continue;
    }

    if (isDigit(char)) {
      const end = readNumberEnd(content, state.index);
      pushToken(state, state.index, end, "number");
      state.expectIdentifierType = null;
      state.index = end;
      continue;
    }

    if (isIdentifierStart(char)) {
      readIdentifier(state);
      continue;
    }

    if (content.startsWith("...", state.index)) {
      pushToken(state, state.index, state.index + 3, "punctuation");
      state.expectIdentifierType = null;
      state.index += 3;
      continue;
    }

    const operator = matchOperator(content, state.index);
    if (operator) {
      pushToken(state, state.index, state.index + operator.length, "operator");
      state.expectIdentifierType = null;
      state.index += operator.length;
      continue;
    }

    if ("()[]{}.,:;".includes(char)) {
      pushToken(state, state.index, state.index + 1, "punctuation");
      state.expectIdentifierType = null;
      state.index += 1;
      continue;
    }

    pushToken(state, state.index, state.index + 1, "text");
    state.expectIdentifierType = null;
    state.index += 1;
  }

  return { tokens: state.tokens };
}

export const pythonLanguageSupport: ClewLanguageSupport = {
  ids: ["python", "py"],
  stableBoundary: stableLineBoundary,
  tokenize: tokenizePython,
};
