import type { ClewOutput, ClewToken } from "../model.js";
import type { ClewLanguageSupport } from "../registry.js";
import { pushTokenRange, splitLines, stableLineBoundary } from "../shared.js";

const GIT_FILE_HEADER_PREFIXES = [
  "diff --git ",
  "index ",
  "old mode ",
  "new mode ",
  "deleted file mode ",
  "new file mode ",
  "similarity index ",
  "dissimilarity index ",
  "rename from ",
  "rename to ",
  "copy from ",
  "copy to ",
] as const;

function pushToken(
  tokens: ClewToken[],
  content: string,
  start: number,
  end: number,
  type: string,
  scopes?: readonly string[],
): void {
  pushTokenRange(tokens, content, start, end, type, scopes);
}

function isGitFileHeader(text: string): boolean {
  return GIT_FILE_HEADER_PREFIXES.some((prefix) => text.startsWith(prefix));
}

function isDiffPackageIndexHeader(text: string): boolean {
  return text.startsWith("Index: ") || /^={3,}$/.test(text);
}

function tokenizePrefixedLine(
  tokens: ClewToken[],
  content: string,
  lineStart: number,
  lineEnd: number,
  bodyType: string,
  bodyScopes: readonly string[],
): void {
  pushToken(tokens, content, lineStart, lineStart + 1, "operator", [
    "operator",
    "diff.marker",
  ]);
  pushToken(tokens, content, lineStart + 1, lineEnd, bodyType, bodyScopes);
}

function tokenizeDiff(content: string): ClewOutput {
  const tokens: ClewToken[] = [];

  for (const line of splitLines(content)) {
    const lineStart = line.start;
    const lineEnd = line.start + line.text.length;
    const text = line.text;

    if (text.length === 0) {
      // Empty lines are represented by their delimiter below.
    } else if (isGitFileHeader(text) || isDiffPackageIndexHeader(text)) {
      pushToken(tokens, content, lineStart, lineEnd, "meta", [
        "meta",
        "diff.header",
      ]);
    } else if (text.startsWith("--- ")) {
      pushToken(tokens, content, lineStart, lineEnd, "meta", [
        "meta",
        "diff.file.old",
      ]);
    } else if (text.startsWith("+++ ")) {
      pushToken(tokens, content, lineStart, lineEnd, "meta", [
        "meta",
        "diff.file.new",
      ]);
    } else if (/^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/.test(text)) {
      pushToken(tokens, content, lineStart, lineEnd, "meta", [
        "meta",
        "diff.hunk",
      ]);
    } else if (text.startsWith("+")) {
      tokenizePrefixedLine(tokens, content, lineStart, lineEnd, "string", [
        "string",
        "diff.inserted",
      ]);
    } else if (text.startsWith("-")) {
      tokenizePrefixedLine(tokens, content, lineStart, lineEnd, "comment", [
        "comment",
        "diff.deleted",
      ]);
    } else if (text.startsWith(" ")) {
      tokenizePrefixedLine(tokens, content, lineStart, lineEnd, "text", [
        "text",
        "diff.context",
      ]);
    } else if (text === "\\ No newline at end of file") {
      pushToken(tokens, content, lineStart, lineEnd, "comment", [
        "comment",
        "diff.no-newline",
      ]);
    } else {
      pushToken(tokens, content, lineStart, lineEnd, "text");
    }

    if (line.delimiter.length > 0) {
      pushToken(
        tokens,
        content,
        lineEnd,
        lineEnd + line.delimiter.length,
        "whitespace",
      );
    }
  }

  return { tokens };
}

export const diffLanguageSupport: ClewLanguageSupport = {
  ids: ["diff", "patch"],
  stableBoundary: stableLineBoundary,
  tokenize: tokenizeDiff,
};
