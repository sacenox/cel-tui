import { bashLanguageSupport } from "./languages/bash.js";
import { diffLanguageSupport } from "./languages/diff.js";
import { jsonLanguageSupport } from "./languages/json.js";
import { markdownLanguageSupport } from "./languages/markdown.js";
import { pythonLanguageSupport } from "./languages/python.js";
import { typescriptLanguageSupport } from "./languages/typescript.js";
import type { ClewOutput } from "./model.js";

export interface ClewLanguageSupport {
  ids: readonly string[];
  tokenize(content: string): ClewOutput;
  stableBoundary?(content: string, ended: boolean): number;
}

const languageSupports = [
  typescriptLanguageSupport,
  pythonLanguageSupport,
  bashLanguageSupport,
  jsonLanguageSupport,
  markdownLanguageSupport,
  diffLanguageSupport,
] satisfies readonly ClewLanguageSupport[];

const supportById = new Map<string, ClewLanguageSupport>();

for (const support of languageSupports) {
  for (const id of support.ids) {
    supportById.set(id.toLowerCase(), support);
  }
}

function supportedLanguageList(): string {
  return Array.from(supportById.keys()).sort().join(", ");
}

export function clewSupportsLanguage(language: string): boolean {
  return supportById.has(language.toLowerCase());
}

export function getLanguageSupport(language: string): ClewLanguageSupport {
  const support = supportById.get(language.toLowerCase());
  if (!support) {
    throw new Error(
      `Unsupported clew language: ${language}. Supported ids: ${supportedLanguageList()}.`,
    );
  }
  return support;
}
