import type { ClewOutput, ClewToken } from "./model.js";

export function requiredAt<T>(
  items: readonly T[],
  index: number,
  description: string,
): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Missing ${description} at index ${index}`);
  }
  return item;
}

export function createToken(
  text: string,
  start: number,
  end: number,
  type: string,
  scopes?: readonly string[],
  path?: readonly string[],
): ClewToken {
  return {
    text,
    start,
    end,
    type,
    path,
    scopes: scopes ?? [type],
  };
}

export function pushTokenRange(
  tokens: ClewToken[],
  content: string,
  start: number,
  end: number,
  type: string,
  scopes?: readonly string[],
  path?: readonly string[],
): void {
  if (end <= start) {
    return;
  }

  tokens.push(
    createToken(content.slice(start, end), start, end, type, scopes, path),
  );
}

export function cloneToken(token: ClewToken): ClewToken {
  return {
    text: token.text,
    start: token.start,
    end: token.end,
    type: token.type,
    path: token.path ? [...token.path] : undefined,
    scopes: token.scopes ? [...token.scopes] : undefined,
  };
}

export function cloneTokens(tokens: readonly ClewToken[]): ClewToken[] {
  return tokens.map(cloneToken);
}

export function cloneOutput(output: ClewOutput): ClewOutput {
  return { tokens: cloneTokens(output.tokens) };
}

function sameStringArray(
  a: readonly string[] | undefined,
  b: readonly string[] | undefined,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export function sameToken(a: ClewToken, b: ClewToken): boolean {
  return (
    a.text === b.text &&
    a.start === b.start &&
    a.end === b.end &&
    a.type === b.type &&
    sameStringArray(a.path, b.path) &&
    sameStringArray(a.scopes, b.scopes)
  );
}

export function commonPrefixLength(
  previous: readonly ClewToken[],
  next: readonly ClewToken[],
): number {
  const max = Math.min(previous.length, next.length);
  let index = 0;
  while (index < max && sameToken(previous[index], next[index])) {
    index++;
  }
  return index;
}

export function tokensFrom(
  tokens: readonly ClewToken[],
  start: number,
): ClewToken[] {
  return tokens.filter((token) => token.end > start).map(cloneToken);
}

export function tokensStartingAtOrAfter(
  tokens: readonly ClewToken[],
  start: number,
): ClewToken[] {
  return tokens.filter((token) => token.start >= start).map(cloneToken);
}

export function splitLines(content: string): Array<{
  delimiter: string;
  start: number;
  text: string;
}> {
  const lines: Array<{ delimiter: string; start: number; text: string }> = [];
  let lineStart = 0;
  let index = 0;

  while (index < content.length) {
    while (
      index < content.length &&
      content[index] !== "\n" &&
      content[index] !== "\r"
    ) {
      index++;
    }

    const textEnd = index;
    let delimiter = "";

    if (index < content.length) {
      if (content[index] === "\r" && content[index + 1] === "\n") {
        delimiter = "\r\n";
        index += 2;
      } else {
        delimiter = content[index] ?? "";
        index += 1;
      }
    }

    lines.push({
      delimiter,
      start: lineStart,
      text: content.slice(lineStart, textEnd),
    });
    lineStart = index;
  }

  return lines;
}

export function stableLineBoundary(content: string, ended: boolean): number {
  if (ended) {
    return content.length;
  }

  const lf = content.lastIndexOf("\n");
  if (lf !== -1) {
    return lf + 1;
  }

  const cr = content.lastIndexOf("\r");
  if (cr !== -1) {
    return cr + 1;
  }

  return 0;
}

export function outputAtBoundary(
  output: ClewOutput,
  boundary: number,
): ClewOutput {
  return {
    tokens: output.tokens
      .filter((token) => token.end <= boundary)
      .map(cloneToken),
  };
}
