import type { ClewOutput, ClewToken } from "../model.js";
import type { ClewLanguageSupport } from "../registry.js";
import { pushTokenRange, stableLineBoundary } from "../shared.js";

const BASH_KEYWORDS = new Set([
  "if",
  "then",
  "elif",
  "else",
  "fi",
  "for",
  "while",
  "until",
  "do",
  "done",
  "case",
  "esac",
  "select",
  "function",
  "in",
  "time",
  "coproc",
]);

const COMMAND_FOLLOWING_KEYWORDS = new Set([
  "if",
  "then",
  "elif",
  "else",
  "while",
  "until",
  "do",
  "time",
  "coproc",
]);

const BASH_BUILTINS = new Set([
  ".",
  ":",
  "alias",
  "bg",
  "bind",
  "break",
  "builtin",
  "caller",
  "cd",
  "command",
  "compgen",
  "complete",
  "compopt",
  "continue",
  "declare",
  "dirs",
  "disown",
  "echo",
  "enable",
  "eval",
  "exec",
  "exit",
  "export",
  "false",
  "fc",
  "fg",
  "getopts",
  "hash",
  "help",
  "history",
  "jobs",
  "kill",
  "let",
  "local",
  "logout",
  "mapfile",
  "popd",
  "printf",
  "pushd",
  "pwd",
  "read",
  "readarray",
  "readonly",
  "return",
  "set",
  "shift",
  "shopt",
  "source",
  "suspend",
  "test",
  "times",
  "trap",
  "true",
  "type",
  "typeset",
  "ulimit",
  "umask",
  "unalias",
  "unset",
  "wait",
]);

const COMMAND_BOUNDARY_OPERATORS = new Set([
  "&",
  "&&",
  "(",
  ";",
  ";;",
  ";&",
  ";;&",
  "|",
  "|&",
  "||",
  "{",
]);

const OPERATORS = [
  "<<-",
  "<<<",
  "<<",
  ">>",
  "||",
  "&&",
  "|&",
  "&>>",
  "&>",
  ">&",
  "<&",
  "<>",
  ">|",
  ";;&",
  ";&",
  ";;",
  "[[",
  "]]",
  "|",
  "&",
  ";",
  "(",
  ")",
  "{",
  "}",
  "<",
  ">",
] as const;

interface PendingHeredoc {
  allowIndent: boolean;
}

interface HeredocSpec {
  allowIndent: boolean;
  delimiter: string;
}

interface BashTokenizerState {
  assignmentPending: boolean;
  canStartComment: boolean;
  commandWordPending: boolean;
  content: string;
  expectCaseIn: boolean;
  expectCaseSubject: boolean;
  expectForIn: boolean;
  expectForName: boolean;
  expectFunctionName: boolean;
  heredocQueue: HeredocSpec[];
  index: number;
  pendingHeredoc: PendingHeredoc | null;
  tokens: ClewToken[];
}

function isSpace(char: string | undefined): boolean {
  return char === " " || char === "\t";
}

function isNewlineStart(content: string, index: number): boolean {
  return content[index] === "\n" || content[index] === "\r";
}

function isWordBoundaryStart(content: string, index: number): boolean {
  const char = content[index];
  if (char === undefined) {
    return true;
  }

  return (
    char === "#" ||
    char === "$" ||
    char === '"' ||
    char === "'" ||
    char === "`" ||
    char === "\\" ||
    isSpace(char) ||
    isNewlineStart(content, index) ||
    OPERATORS.some((operator) => content.startsWith(operator, index))
  );
}

function pushToken(
  state: BashTokenizerState,
  start: number,
  end: number,
  type: string,
  scopes?: readonly string[],
): void {
  pushTokenRange(state.tokens, state.content, start, end, type, scopes);
}

function readWhile(
  state: BashTokenizerState,
  predicate: (char: string | undefined, index: number) => boolean,
): number {
  const start = state.index;
  while (predicate(state.content[state.index], state.index)) {
    state.index += 1;
  }
  return start;
}

function readLineEnd(content: string, index: number): number {
  if (content[index] === "\r" && content[index + 1] === "\n") {
    return index + 2;
  }
  return index + 1;
}

function matchOperator(content: string, index: number): string | undefined {
  return OPERATORS.find((operator) => content.startsWith(operator, index));
}

function readPlainSegmentEnd(content: string, index: number): number {
  let end = index;
  while (!isWordBoundaryStart(content, end)) {
    end += 1;
  }
  return end;
}

function isAssignmentPrefix(text: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=$/.test(text);
}

function isNumber(text: string): boolean {
  return /^(?:\d+|0x[0-9a-fA-F]+)$/.test(text);
}

function registerHeredoc(
  state: BashTokenizerState,
  rawDelimiter: string,
): void {
  if (!state.pendingHeredoc) {
    return;
  }

  state.heredocQueue.push({
    allowIndent: state.pendingHeredoc.allowIndent,
    delimiter: rawDelimiter,
  });
  state.pendingHeredoc = null;
}

function classifyKeywordState(state: BashTokenizerState, text: string): void {
  state.expectFunctionName = text === "function";
  state.expectForName = text === "for" || text === "select";
  state.expectCaseSubject = text === "case";

  if (text === "in") {
    state.expectForIn = false;
    state.expectCaseIn = false;
  } else if (!state.expectForName) {
    state.expectForIn = state.expectForIn && text !== "for";
  }

  if (text !== "case") {
    state.expectCaseIn = state.expectCaseIn && text !== "in";
  }

  state.assignmentPending = false;
  state.commandWordPending = COMMAND_FOLLOWING_KEYWORDS.has(text);
}

function pushKeyword(
  state: BashTokenizerState,
  start: number,
  end: number,
): void {
  pushToken(state, start, end, "keyword");
  classifyKeywordState(state, state.content.slice(start, end));
}

function pushCommandLike(
  state: BashTokenizerState,
  start: number,
  end: number,
  type: "builtin" | "command" | "function" | "number" | "text" | "variable",
  scopes?: readonly string[],
): void {
  pushToken(state, start, end, type, scopes);
  state.assignmentPending = false;
  state.commandWordPending = false;
}

function readComment(state: BashTokenizerState): void {
  const start = state.index;
  while (
    state.index < state.content.length &&
    !isNewlineStart(state.content, state.index)
  ) {
    state.index += 1;
  }
  pushToken(state, start, state.index, "comment");
  state.assignmentPending = false;
  state.canStartComment = false;
  state.commandWordPending = false;
}

function readSpaces(state: BashTokenizerState): void {
  const start = readWhile(state, (char) => isSpace(char));
  pushToken(state, start, state.index, "whitespace");
  state.assignmentPending = false;
  state.canStartComment = true;
}

function consumeHeredocBodies(state: BashTokenizerState): void {
  while (state.heredocQueue.length > 0 && state.index < state.content.length) {
    const heredoc = state.heredocQueue[0];
    if (!heredoc) {
      return;
    }

    const lineStart = state.index;
    while (
      state.index < state.content.length &&
      !isNewlineStart(state.content, state.index)
    ) {
      state.index += 1;
    }

    const lineEnd = state.index;
    const rawLine = state.content.slice(lineStart, lineEnd);
    const comparable = heredoc.allowIndent
      ? rawLine.replace(/^\t+/, "")
      : rawLine;
    const isDelimiter = comparable === heredoc.delimiter;

    if (lineEnd > lineStart) {
      pushToken(
        state,
        lineStart,
        lineEnd,
        "string",
        isDelimiter
          ? ["string", "string.heredoc", "string.heredoc.delimiter"]
          : ["string", "string.heredoc"],
      );
    }

    if (isDelimiter) {
      state.heredocQueue.shift();
    }

    if (state.index < state.content.length) {
      const newlineStart = state.index;
      state.index = readLineEnd(state.content, state.index);
      pushToken(state, newlineStart, state.index, "whitespace");
      state.assignmentPending = false;
      state.canStartComment = true;
      state.commandWordPending = true;
      continue;
    }

    state.assignmentPending = false;
    state.canStartComment = true;
    state.commandWordPending = true;
    return;
  }
}

function readNewline(state: BashTokenizerState): void {
  const start = state.index;
  state.index = readLineEnd(state.content, state.index);
  pushToken(state, start, state.index, "whitespace");
  state.assignmentPending = false;
  state.canStartComment = true;
  state.commandWordPending = true;

  if (state.heredocQueue.length > 0) {
    consumeHeredocBodies(state);
  }
}

function readSingleQuotedString(state: BashTokenizerState): void {
  const start = state.index;
  state.index += 1;
  while (
    state.index < state.content.length &&
    state.content[state.index] !== "'"
  ) {
    state.index += 1;
  }
  if (state.content[state.index] === "'") {
    state.index += 1;
  }

  pushToken(state, start, state.index, "string");
  if (state.pendingHeredoc) {
    registerHeredoc(
      state,
      state.content.slice(start + 1, Math.max(start + 1, state.index - 1)),
    );
  } else if (!state.assignmentPending && state.commandWordPending) {
    state.commandWordPending = false;
  }
  state.canStartComment = false;
}

function readCommandSubstitutionEnd(
  content: string,
  index: number,
  open: string,
  close: string,
): number {
  let depth = 1;
  let cursor = index;

  while (cursor < content.length) {
    const char = content[cursor];

    if (char === "'") {
      cursor += 1;
      while (cursor < content.length && content[cursor] !== "'") {
        cursor += 1;
      }
      cursor += Number(content[cursor] === "'");
      continue;
    }

    if (char === '"') {
      cursor += 1;
      while (cursor < content.length) {
        if (content[cursor] === "\\") {
          cursor += 2;
          continue;
        }
        if (content[cursor] === '"') {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      continue;
    }

    if (content.startsWith(open, cursor)) {
      depth += 1;
      cursor += open.length;
      continue;
    }

    if (content.startsWith(close, cursor)) {
      depth -= 1;
      cursor += close.length;
      if (depth === 0) {
        return cursor;
      }
      continue;
    }

    if (content[cursor] === "\\") {
      cursor += 2;
      continue;
    }

    cursor += 1;
  }

  return content.length;
}

function readParameterExpansionEnd(content: string, index: number): number {
  let depth = 1;
  let cursor = index;

  while (cursor < content.length) {
    if (content[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (content[cursor] === "{") {
      depth += 1;
      cursor += 1;
      continue;
    }
    if (content[cursor] === "}") {
      depth -= 1;
      cursor += 1;
      if (depth === 0) {
        return cursor;
      }
      continue;
    }
    cursor += 1;
  }

  return content.length;
}

function readBacktickSubstitution(state: BashTokenizerState): void {
  const start = state.index;
  state.index += 1;
  while (state.index < state.content.length) {
    if (state.content[state.index] === "\\") {
      state.index += 2;
      continue;
    }
    if (state.content[state.index] === "`") {
      state.index += 1;
      break;
    }
    state.index += 1;
  }

  pushToken(state, start, state.index, "meta", [
    "meta",
    "meta.substitution.command",
  ]);
  if (!state.assignmentPending && state.commandWordPending) {
    state.commandWordPending = false;
  }
  state.canStartComment = false;
}

function readExpansion(state: BashTokenizerState): void {
  const start = state.index;

  if (state.content.startsWith("$((", state.index)) {
    state.index = readCommandSubstitutionEnd(
      state.content,
      state.index + 3,
      "((",
      "))",
    );
    pushToken(state, start, state.index, "meta", [
      "meta",
      "meta.substitution.arithmetic",
    ]);
  } else if (state.content.startsWith("$(", state.index)) {
    state.index = readCommandSubstitutionEnd(
      state.content,
      state.index + 2,
      "(",
      ")",
    );
    pushToken(state, start, state.index, "meta", [
      "meta",
      "meta.substitution.command",
    ]);
  } else if (state.content.startsWith("${", state.index)) {
    state.index = readParameterExpansionEnd(state.content, state.index + 2);
    pushToken(state, start, state.index, "variable", [
      "variable",
      "variable.expansion",
    ]);
  } else {
    state.index += 1;
    const next = state.content[state.index];
    if (next && /[A-Za-z0-9_@*#?$!-]/.test(next)) {
      if (/[A-Za-z_]/.test(next)) {
        state.index += 1;
        while (/[A-Za-z0-9_]/.test(state.content[state.index] ?? "")) {
          state.index += 1;
        }
      } else {
        state.index += 1;
      }
      pushToken(state, start, state.index, "variable");
    } else {
      pushToken(state, start, state.index, "text");
    }
  }

  if (!state.assignmentPending && state.commandWordPending) {
    state.commandWordPending = false;
  }
  state.canStartComment = false;
}

function readEscape(state: BashTokenizerState): void {
  const start = state.index;
  state.index += 1;
  if (state.index < state.content.length) {
    state.index += 1;
  }
  pushToken(state, start, state.index, "escape");
  if (!state.assignmentPending && state.commandWordPending) {
    state.commandWordPending = false;
  }
  state.canStartComment = false;
}

function readDoubleQuotedString(state: BashTokenizerState): void {
  const start = state.index;
  let segmentStart = start;
  state.index += 1;

  while (state.index < state.content.length) {
    const char = state.content[state.index];

    if (char === "\\") {
      if (state.index > segmentStart) {
        pushToken(state, segmentStart, state.index, "string");
      }
      const escapeStart = state.index;
      state.index += 1;
      if (state.index < state.content.length) {
        state.index += 1;
      }
      pushToken(state, escapeStart, state.index, "escape");
      segmentStart = state.index;
      continue;
    }

    if (char === "$") {
      if (state.index > segmentStart) {
        pushToken(state, segmentStart, state.index, "string");
      }
      readExpansion(state);
      segmentStart = state.index;
      continue;
    }

    if (char === "`") {
      if (state.index > segmentStart) {
        pushToken(state, segmentStart, state.index, "string");
      }
      readBacktickSubstitution(state);
      segmentStart = state.index;
      continue;
    }

    if (char === '"') {
      state.index += 1;
      pushToken(state, segmentStart, state.index, "string");
      if (state.pendingHeredoc) {
        registerHeredoc(
          state,
          state.content.slice(start + 1, Math.max(start + 1, state.index - 1)),
        );
      } else if (!state.assignmentPending && state.commandWordPending) {
        state.commandWordPending = false;
      }
      state.canStartComment = false;
      return;
    }

    state.index += 1;
  }

  pushToken(state, segmentStart, state.index, "string");
  if (state.pendingHeredoc) {
    registerHeredoc(state, state.content.slice(start + 1, state.index));
  } else if (!state.assignmentPending && state.commandWordPending) {
    state.commandWordPending = false;
  }
  state.canStartComment = false;
}

function readOperator(state: BashTokenizerState, operator: string): void {
  const start = state.index;
  state.index += operator.length;
  pushToken(state, start, state.index, "operator");
  state.assignmentPending = false;
  state.canStartComment = true;

  if (operator === "<<" || operator === "<<-") {
    state.pendingHeredoc = { allowIndent: operator === "<<-" };
  }

  if (COMMAND_BOUNDARY_OPERATORS.has(operator)) {
    state.commandWordPending = true;
    state.expectForIn = false;
    state.expectCaseIn = false;
  }
}

function readPlainSegment(state: BashTokenizerState): void {
  const start = state.index;
  const end = readPlainSegmentEnd(state.content, state.index);
  const text = state.content.slice(start, end);
  state.index = end;

  if (state.pendingHeredoc) {
    pushToken(state, start, end, "string", [
      "string",
      "string.heredoc.delimiter",
    ]);
    registerHeredoc(state, text);
    state.canStartComment = false;
    return;
  }

  if (state.expectFunctionName) {
    pushToken(state, start, end, "function");
    state.expectFunctionName = false;
    state.commandWordPending = false;
    state.canStartComment = false;
    return;
  }

  if (state.expectForName) {
    pushToken(state, start, end, "variable");
    state.expectForName = false;
    state.expectForIn = true;
    state.commandWordPending = false;
    state.canStartComment = false;
    return;
  }

  if (state.expectCaseSubject) {
    pushToken(state, start, end, "text");
    state.expectCaseSubject = false;
    state.expectCaseIn = true;
    state.commandWordPending = false;
    state.canStartComment = false;
    return;
  }

  if ((state.expectForIn || state.expectCaseIn) && text === "in") {
    pushKeyword(state, start, end);
    state.canStartComment = false;
    return;
  }

  if (state.assignmentPending) {
    if (isNumber(text)) {
      pushToken(state, start, end, "number");
    } else {
      pushToken(state, start, end, "text");
    }
    state.canStartComment = false;
    return;
  }

  if (BASH_KEYWORDS.has(text) && (state.commandWordPending || text === "in")) {
    pushKeyword(state, start, end);
    state.canStartComment = false;
    return;
  }

  if (state.commandWordPending && isAssignmentPrefix(text)) {
    pushToken(state, start, end - 1, "variable");
    pushToken(state, end - 1, end, "operator");
    state.assignmentPending = true;
    state.canStartComment = false;
    return;
  }

  if (state.commandWordPending && state.content.startsWith("()", state.index)) {
    pushCommandLike(state, start, end, "function");
    state.canStartComment = false;
    return;
  }

  if (state.commandWordPending && BASH_BUILTINS.has(text)) {
    pushCommandLike(state, start, end, "builtin");
    state.canStartComment = false;
    return;
  }

  if (state.commandWordPending) {
    pushCommandLike(state, start, end, "command");
    state.canStartComment = false;
    return;
  }

  if (isNumber(text)) {
    pushToken(state, start, end, "number");
  } else {
    pushToken(state, start, end, "text");
  }
  state.canStartComment = false;
}

function tokenizeBash(content: string): ClewOutput {
  const state: BashTokenizerState = {
    assignmentPending: false,
    canStartComment: true,
    commandWordPending: true,
    content,
    expectCaseIn: false,
    expectCaseSubject: false,
    expectForIn: false,
    expectForName: false,
    expectFunctionName: false,
    heredocQueue: [],
    index: 0,
    pendingHeredoc: null,
    tokens: [],
  };

  while (state.index < content.length) {
    const char = state.content[state.index];
    if (isSpace(char)) {
      readSpaces(state);
      continue;
    }
    if (isNewlineStart(state.content, state.index)) {
      readNewline(state);
      continue;
    }
    if (char === "#" && state.canStartComment) {
      readComment(state);
      continue;
    }

    const operator = matchOperator(state.content, state.index);
    if (operator) {
      readOperator(state, operator);
      continue;
    }

    if (char === "'") {
      readSingleQuotedString(state);
      continue;
    }
    if (char === '"') {
      readDoubleQuotedString(state);
      continue;
    }
    if (char === "$") {
      readExpansion(state);
      continue;
    }
    if (char === "`") {
      readBacktickSubstitution(state);
      continue;
    }
    if (char === "\\") {
      readEscape(state);
      continue;
    }

    readPlainSegment(state);
  }

  return { tokens: state.tokens };
}

export const bashLanguageSupport: ClewLanguageSupport = {
  ids: ["bash"],
  stableBoundary: stableLineBoundary,
  tokenize: tokenizeBash,
};
