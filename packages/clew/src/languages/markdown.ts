import type { ClewOutput, ClewToken } from "../model.js";
import type { ClewLanguageSupport } from "../registry.js";
import { pushTokenRange, splitLines, stableLineBoundary } from "../shared.js";

interface FenceState {
  char: "`" | "~";
  length: number;
}

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

function parseFence(text: string): FenceState | undefined {
  const match = text.match(/^[ ]{0,3}([`~]{3,})(.*)$/);
  const marker = match?.[1];
  if (!marker) {
    return undefined;
  }

  const char = marker[0];
  if (char !== "`" && char !== "~") {
    return undefined;
  }

  return {
    char,
    length: marker.length,
  };
}

function isFenceClose(text: string, fence: FenceState): boolean {
  const match = text.match(/^[ ]{0,3}([`~]{3,})([ \t]*)$/);
  const marker = match?.[1];
  if (!marker) {
    return false;
  }

  return marker[0] === fence.char && marker.length >= fence.length;
}

function isHorizontalRule(text: string): boolean {
  return /^ {0,3}(?:(?:-\s*){3,}|(?:_\s*){3,}|(?:\*\s*){3,})$/.test(text);
}

function parseHeading(text: string):
  | {
      bodyStart: number;
      markerStart: number;
    }
  | undefined {
  let index = 0;
  while (index < text.length && index < 3 && text[index] === " ") {
    index += 1;
  }

  const markerStart = index;
  while (
    index < text.length &&
    index - markerStart < 6 &&
    text[index] === "#"
  ) {
    index += 1;
  }

  if (index === markerStart) {
    return undefined;
  }

  const separator = text[index];
  if (separator !== undefined && separator !== " " && separator !== "\t") {
    return undefined;
  }

  let bodyStart = index;
  while (text[bodyStart] === " " || text[bodyStart] === "\t") {
    bodyStart += 1;
  }

  return {
    bodyStart,
    markerStart,
  };
}

function readBlockquotePrefixLength(text: string): number {
  const match = text.match(/^[ ]{0,3}(?:> ?)+/);
  return match?.[0].length ?? 0;
}

function readListPrefixLength(text: string): number {
  const match = text.match(/^[ ]{0,3}(?:[-+*]|\d+[.)])\s+/);
  return match?.[0].length ?? 0;
}

function findCodeSpanEnd(text: string, start: number, count: number): number {
  const marker = "`".repeat(count);
  const close = text.indexOf(marker, start + count);
  return close === -1 ? text.length : close + count;
}

function findLinkEnd(text: string, start: number): number {
  const divider = text.indexOf("](", start + 1);
  if (divider === -1) {
    return -1;
  }

  const close = text.indexOf(")", divider + 2);
  return close === -1 ? -1 : close + 1;
}

function tokenizeInline(
  tokens: ClewToken[],
  content: string,
  startOffset: number,
  text: string,
): void {
  let index = 0;
  let textStart = 0;

  function flush(until: number): void {
    if (until <= textStart) {
      return;
    }

    pushToken(
      tokens,
      content,
      startOffset + textStart,
      startOffset + until,
      "text",
    );
    textStart = until;
  }

  while (index < text.length) {
    const char = text[index];

    if (char === "\\") {
      flush(index);
      const end = Math.min(index + 2, text.length);
      pushToken(
        tokens,
        content,
        startOffset + index,
        startOffset + end,
        "escape",
      );
      index = end;
      textStart = end;
      continue;
    }

    if (char === "`") {
      let count = 1;
      while (text[index + count] === "`") {
        count += 1;
      }

      flush(index);
      const end = findCodeSpanEnd(text, index, count);
      pushToken(
        tokens,
        content,
        startOffset + index,
        startOffset + end,
        "string",
        ["string", "markup.code"],
      );
      index = end;
      textStart = end;
      continue;
    }

    if (char === "[") {
      const end = findLinkEnd(text, index);
      if (end !== -1) {
        flush(index);
        pushToken(
          tokens,
          content,
          startOffset + index,
          startOffset + end,
          "link",
          ["link", "markup.link"],
        );
        index = end;
        textStart = end;
        continue;
      }
    }

    index += 1;
  }

  flush(text.length);
}

function tokenizeMarkdown(content: string): ClewOutput {
  const tokens: ClewToken[] = [];
  const lines = splitLines(content);
  let fence: FenceState | undefined;

  for (const line of lines) {
    const lineStart = line.start;
    const lineEnd = line.start + line.text.length;

    if (fence) {
      if (isFenceClose(line.text, fence)) {
        pushToken(tokens, content, lineStart, lineEnd, "meta", [
          "meta",
          "markup.code.fence",
        ]);
        fence = undefined;
      } else {
        pushToken(tokens, content, lineStart, lineEnd, "string", [
          "string",
          "markup.code",
        ]);
      }
    } else {
      const nextFence = parseFence(line.text);
      if (nextFence) {
        pushToken(tokens, content, lineStart, lineEnd, "meta", [
          "meta",
          "markup.code.fence",
        ]);
        fence = nextFence;
      } else if (isHorizontalRule(line.text)) {
        pushToken(tokens, content, lineStart, lineEnd, "meta", [
          "meta",
          "markup.hr",
        ]);
      } else {
        const heading = parseHeading(line.text);
        if (heading) {
          if (heading.markerStart > 0) {
            pushToken(
              tokens,
              content,
              lineStart,
              lineStart + heading.markerStart,
              "whitespace",
            );
          }

          pushToken(
            tokens,
            content,
            lineStart + heading.markerStart,
            lineStart + heading.bodyStart,
            "meta",
            ["meta", "markup.heading.marker"],
          );
          pushToken(
            tokens,
            content,
            lineStart + heading.bodyStart,
            lineEnd,
            "meta",
            ["meta", "markup.heading"],
          );
        } else {
          let inlineStart = lineStart;
          let inlineText = line.text;

          const blockquotePrefixLength = readBlockquotePrefixLength(line.text);
          if (blockquotePrefixLength > 0) {
            pushToken(
              tokens,
              content,
              lineStart,
              lineStart + blockquotePrefixLength,
              "meta",
              ["meta", "markup.quote"],
            );
            inlineStart += blockquotePrefixLength;
            inlineText = inlineText.slice(blockquotePrefixLength);
          } else {
            const listPrefixLength = readListPrefixLength(line.text);
            if (listPrefixLength > 0) {
              pushToken(
                tokens,
                content,
                lineStart,
                lineStart + listPrefixLength,
                "meta",
                ["meta", "markup.list"],
              );
              inlineStart += listPrefixLength;
              inlineText = inlineText.slice(listPrefixLength);
            }
          }

          tokenizeInline(tokens, content, inlineStart, inlineText);
        }
      }
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

export const markdownLanguageSupport: ClewLanguageSupport = {
  ids: ["markdown"],
  stableBoundary: stableLineBoundary,
  tokenize: tokenizeMarkdown,
};
