import * as ts from "typescript";
import type { ClewOutput } from "../model.js";
import type { ClewLanguageSupport } from "../registry.js";
import {
  createToken,
  requiredAt,
  splitLines,
  stableLineBoundary,
} from "../shared.js";

const classifier = ts.createClassifier();

interface TokenTypeInfo {
  scopes?: readonly string[];
  type: string;
}

function tokenInfoFromClassification(classification: number): TokenTypeInfo {
  switch (classification) {
    case ts.ClassificationType.comment:
      return { type: "comment" };
    case ts.ClassificationType.identifier:
      return { type: "identifier", scopes: ["identifier", "variable"] };
    case ts.ClassificationType.keyword:
      return { type: "keyword" };
    case ts.ClassificationType.numericLiteral:
      return { type: "number" };
    case ts.ClassificationType.bigintLiteral:
      return { type: "number", scopes: ["number", "number.bigint"] };
    case ts.ClassificationType.operator:
      return { type: "operator" };
    case ts.ClassificationType.stringLiteral:
      return { type: "string" };
    case ts.ClassificationType.regularExpressionLiteral:
      return { type: "regexp" };
    case ts.ClassificationType.whiteSpace:
      return { type: "whitespace" };
    case ts.ClassificationType.punctuation:
      return { type: "punctuation" };
    case ts.ClassificationType.text:
      return { type: "text" };
    default:
      return { type: "identifier", scopes: ["identifier", "variable"] };
  }
}

function gapTokenType(text: string): TokenTypeInfo {
  return /^\s+$/.test(text) ? { type: "whitespace" } : { type: "text" };
}

function tokenizeTypescript(content: string): ClewOutput {
  const tokens = [];
  const lines = splitLines(content);
  let lineState = ts.EndOfLineState.None;

  for (const line of lines) {
    const classifications = classifier.getEncodedLexicalClassifications(
      line.text,
      lineState,
      true,
    );

    let position = 0;
    for (let i = 0; i < classifications.spans.length; i += 3) {
      const start = requiredAt(
        classifications.spans,
        i,
        "classification start",
      );
      const length = requiredAt(
        classifications.spans,
        i + 1,
        "classification length",
      );
      const classification = requiredAt(
        classifications.spans,
        i + 2,
        "classification kind",
      );

      if (start > position) {
        const text = line.text.slice(position, start);
        const info = gapTokenType(text);
        tokens.push(
          createToken(
            text,
            line.start + position,
            line.start + start,
            info.type,
            info.scopes,
          ),
        );
      }

      const tokenText = line.text.slice(start, start + length);
      const info = tokenInfoFromClassification(classification);
      tokens.push(
        createToken(
          tokenText,
          line.start + start,
          line.start + start + length,
          info.type,
          info.scopes,
        ),
      );
      position = start + length;
    }

    if (position < line.text.length) {
      const text = line.text.slice(position);
      const info = gapTokenType(text);
      tokens.push(
        createToken(
          text,
          line.start + position,
          line.start + line.text.length,
          info.type,
          info.scopes,
        ),
      );
    }

    if (line.delimiter.length > 0) {
      tokens.push(
        createToken(
          line.delimiter,
          line.start + line.text.length,
          line.start + line.text.length + line.delimiter.length,
          "whitespace",
        ),
      );
    }

    lineState = classifications.endOfLineState;
  }

  return { tokens };
}

export const typescriptLanguageSupport: ClewLanguageSupport = {
  ids: [
    "typescript",
    "ts",
    "tsx",
    "mts",
    "cts",
    "javascript",
    "js",
    "jsx",
    "mjs",
    "cjs",
  ],
  stableBoundary: stableLineBoundary,
  tokenize: tokenizeTypescript,
};
