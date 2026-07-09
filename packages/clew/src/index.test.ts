import { describe, expect, test } from "bun:test";
import {
  type ClewPatch,
  type ClewToken,
  clew,
  clewSupportsLanguage,
} from "./index.js";

function joinedText(tokens: readonly { text: string }[]): string {
  return tokens.map((token) => token.text).join("");
}

function applyPatch(
  current: readonly ClewToken[],
  patch: ClewPatch,
): ClewToken[] {
  return [
    ...current.filter((token) => token.end <= patch.from),
    ...patch.tokens,
    ...current.filter((token) => token.start >= patch.to),
  ];
}

function chunkBySize(content: string, size: number): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < content.length; start += size) {
    chunks.push(content.slice(start, start + size));
  }
  return chunks;
}

function expectStreamPatchesReplay(
  content: string,
  language: string,
  chunks: readonly string[],
): void {
  const stream = clew("", { lang: language, stability: "stable" });
  let replayed: ClewToken[] = [];

  stream.onChunk((patch) => {
    replayed = applyPatch(replayed, patch);
  });
  stream.onCorrection((patch) => {
    replayed = applyPatch(replayed, patch);
  });

  for (const chunk of chunks) {
    stream.write(chunk);
  }

  const final = stream.end();
  expect(replayed).toEqual(final.tokens);
  expect(joinedText(replayed)).toBe(content);
  expect(final).toEqual(clew(content, { lang: language, stream: false }));
}

function expectFullCoverage(content: string, language: string): void {
  const output = clew(content, { lang: language, stream: false });

  expect(joinedText(output.tokens)).toBe(content);

  if (content.length === 0) {
    expect(output.tokens).toEqual([]);
    return;
  }

  expect(output.tokens[0]?.start).toBe(0);
  expect(output.tokens.at(-1)?.end).toBe(content.length);

  for (let i = 0; i < output.tokens.length; i++) {
    const token = output.tokens[i];
    expect(token).toBeDefined();
    if (!token) {
      throw new Error(`Missing token at index ${i}`);
    }

    expect(token.start).toBeLessThan(token.end);
    expect(token.text).toBe(content.slice(token.start, token.end));

    if (i > 0) {
      const previous = output.tokens[i - 1];
      expect(previous).toBeDefined();
      if (!previous) {
        throw new Error(`Missing token at index ${i - 1}`);
      }
      expect(previous.end).toBe(token.start);
    }
  }
}

function expectTokenType(
  language: string,
  content: string,
  tokenText: string,
  type: string,
): void {
  const output = clew(content, { lang: language, stream: false });
  expect(output.tokens.find((token) => token.text === tokenText)?.type).toBe(
    type,
  );
}

function expectTokenScopes(
  language: string,
  content: string,
  tokenText: string,
  scopes: readonly string[],
): void {
  const output = clew(content, { lang: language, stream: false });
  expect(
    output.tokens.find((token) => token.text === tokenText)?.scopes,
  ).toEqual(scopes);
}

describe("clew", () => {
  test("reports supported languages through the registry", () => {
    expect(clewSupportsLanguage("typescript")).toBe(true);
    expect(clewSupportsLanguage("javascript")).toBe(true);
    expect(clewSupportsLanguage("python")).toBe(true);
    expect(clewSupportsLanguage("py")).toBe(true);
    expect(clewSupportsLanguage("bash")).toBe(true);
    expect(clewSupportsLanguage("json")).toBe(true);
    expect(clewSupportsLanguage("markdown")).toBe(true);
    expect(clewSupportsLanguage("diff")).toBe(true);
    expect(clewSupportsLanguage("patch")).toBe(true);
    expect(clewSupportsLanguage("tsx")).toBe(false);
    expect(clewSupportsLanguage("jsx")).toBe(false);
    expect(clewSupportsLanguage("shell")).toBe(false);
    expect(clewSupportsLanguage("zsh")).toBe(false);
    expect(clewSupportsLanguage("md")).toBe(false);
  });

  test("tokenizes supported languages with full coverage", () => {
    expectFullCoverage('type Phase = "idle"\n// done', "typescript");
    expectFullCoverage("const value = 1n", "javascript");
    expectFullCoverage(
      '@dataclass\nclass Job:\n    def render(self):\n        print("hi")\n',
      "python",
    );
    expectFullCoverage(
      'if true; then echo "$HOME"; fi\ncat <<EOF\nhello\nEOF\n',
      "bash",
    );
    expectFullCoverage('{"name":"cel","ok":true,"items":[1,null]}', "json");
    expectFullCoverage(
      "# Title\n- item with `code`\n> quote [link](https://example.com)\n",
      "markdown",
    );
    expectFullCoverage(
      "diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n",
      "diff",
    );
    expectFullCoverage(
      "Index: a.txt\n===================================================================\n--- a.txt\n+++ a.txt\n@@ -1,1 +1,1 @@\n-old\n+new\n",
      "patch",
    );
  });

  test("tokenizes richer TypeScript declaration, property, function, and literal scopes", () => {
    const source = [
      "@sealed",
      'type Phase = "idle" | "running";',
      "interface Job {",
      "  status: Phase;",
      "  execute(input: string): Promise<void>;",
      "}",
      "class Runner<T> {",
      "  constructor(private value: T) {}",
      "  get current(): T { return this.value; }",
      "}",
      "const render = (job: Job) => console.log(job.status, config.port);",
      'const config = { port: 3000, "display-name": "cel", ok: true };',
      "const count = 1n;",
      "const empty = null;",
      'enum Mode { Idle = "idle" }',
    ].join("\n");

    expectTokenType("typescript", source, "type", "keyword");
    expectTokenType("typescript", source, '"idle"', "string");
    expectTokenScopes("typescript", source, "sealed", [
      "meta",
      "meta.decorator",
    ]);
    expectTokenScopes("typescript", source, "Phase", ["type", "type.alias"]);
    expectTokenScopes("typescript", source, "Job", ["type", "type.interface"]);
    expectTokenScopes("typescript", source, "status", ["property"]);
    expectTokenScopes("typescript", source, "execute", ["function"]);
    expectTokenScopes("typescript", source, "input", [
      "variable",
      "variable.parameter",
    ]);
    expectTokenScopes("typescript", source, "string", [
      "type",
      "type.primitive",
    ]);
    expectTokenScopes("typescript", source, "Promise", ["type"]);
    expectTokenScopes("typescript", source, "void", ["type", "type.primitive"]);
    expectTokenScopes("typescript", source, "Runner", ["type", "type.class"]);
    expectTokenScopes("typescript", source, "T", ["type", "type.parameter"]);
    expectTokenScopes("typescript", source, "value", ["property"]);
    expectTokenScopes("typescript", source, "current", ["property"]);
    expectTokenType("typescript", source, "render", "function");
    expectTokenType("typescript", source, "console", "builtin");
    expectTokenType("typescript", source, "log", "function");
    expectTokenScopes("typescript", source, "port", ["property"]);
    expectTokenScopes("typescript", source, '"display-name"', [
      "string",
      "property",
    ]);
    expectTokenScopes("typescript", source, "true", [
      "keyword",
      "constant.boolean",
    ]);
    expectTokenScopes("typescript", source, "1n", ["number", "number.bigint"]);
    expectTokenScopes("typescript", source, "null", [
      "keyword",
      "constant.null",
    ]);
    expectTokenScopes("typescript", source, "Mode", ["type", "type.enum"]);
    expectTokenScopes("typescript", source, "Idle", [
      "property",
      "constant.enum",
    ]);
  });

  test("tokenizes python decorators, definitions, builtins, and properties", () => {
    const source = [
      "@dataclass",
      "class Job:",
      "    retries: int = 0",
      "    def render(self, item):",
      '        print(item.value, f"{self.retries}")',
      "        return True",
    ].join("\n");

    expectTokenScopes("python", source, "@dataclass", [
      "meta",
      "meta.decorator",
    ]);
    expectTokenType("python", source, "class", "keyword");
    expectTokenType("python", source, "Job", "type");
    expectTokenType("python", source, "int", "type");
    expectTokenType("python", source, "def", "keyword");
    expectTokenType("python", source, "render", "function");
    expectTokenType("python", source, "print", "builtin");
    expectTokenScopes("python", source, "value", ["property"]);
    expectTokenScopes("python", source, "True", [
      "keyword",
      "constant.boolean",
    ]);
  });

  test("tokenizes bash control flow, substitutions, and heredocs", () => {
    const parameterExpansion = "$" + "{name:-guest}";
    const source = [
      'if true; then echo "$HOME"; fi',
      'name="world"',
      `echo $(pwd) $((count + 1)) ${parameterExpansion}`,
      "cat <<EOF",
      "hello",
      "EOF",
    ].join("\n");

    expectTokenType("bash", source, "if", "keyword");
    expectTokenType("bash", source, "then", "keyword");
    expectTokenType("bash", source, "fi", "keyword");
    expectTokenType("bash", source, "echo", "builtin");
    expectTokenScopes("bash", source, "$HOME", ["variable"]);
    expectTokenScopes("bash", source, "name", ["variable"]);
    expectTokenScopes("bash", source, "$(pwd)", [
      "meta",
      "meta.substitution.command",
    ]);
    expectTokenScopes("bash", source, "$((count + 1))", [
      "meta",
      "meta.substitution.arithmetic",
    ]);
    expectTokenScopes("bash", source, parameterExpansion, [
      "variable",
      "variable.expansion",
    ]);
    expect(
      clew(source, { lang: "bash", stream: false }).tokens.filter(
        (token) => token.text === "EOF",
      ),
    ).toHaveLength(2);
  });

  test("treats a hash inside a bash word as literal text", () => {
    const content = "echo foo#bar";
    const output = clew(content, { lang: "bash", stream: false });
    const commentOutput = clew("echo foo #bar", {
      lang: "bash",
      stream: false,
    });

    expect(joinedText(output.tokens)).toBe(content);
    expect(output.tokens.some((token) => token.type === "comment")).toBe(false);
    expect(output.tokens.find((token) => token.text === "foo#bar")?.type).toBe(
      "text",
    );
    expect(
      commentOutput.tokens.find((token) => token.text === "#bar")?.type,
    ).toBe("comment");
  });

  test("always terminates with full coverage for deterministic bash fuzz inputs", () => {
    const alphabet = [
      "a",
      "b",
      "c",
      "X",
      "Y",
      "Z",
      "0",
      "9",
      "#",
      " ",
      "$",
      "'",
      '"',
      ";",
      "|",
      "&",
      "(",
      ")",
      "{",
      "}",
      "<",
      ">",
      "\n",
      "\t",
    ];
    let seed = 0x9e3779b9;

    const next = (): number => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return seed >>> 0;
    };

    const samples = ["echo foo#bar", "printf %s foo#bar#baz"];
    for (let sampleIndex = 0; sampleIndex < 128; sampleIndex++) {
      let sample = "";
      for (let index = 0; index < 64; index++) {
        sample += alphabet[next() % alphabet.length] ?? "";
      }
      samples.push(sample);
    }

    for (const sample of samples) {
      expectFullCoverage(sample, "bash");
    }
  });

  test("tokenizes json properties, literals, and numbers", () => {
    const source = '{"name":"cel","ok":true,"count":2,"items":[null]}';

    expectTokenType("json", source, '"name"', "string");
    expectTokenScopes("json", source, '"name"', ["string", "property"]);
    expectTokenType("json", source, '"cel"', "string");
    expectTokenType("json", source, "true", "keyword");
    expectTokenScopes("json", source, "true", ["keyword", "constant.boolean"]);
    expectTokenType("json", source, "2", "number");
    expectTokenScopes("json", source, "null", ["keyword", "constant.null"]);
  });

  test("tokenizes markdown headings, markers, links, and code", () => {
    const source = [
      "# Title",
      "- item with `code`",
      "> quote [link](https://example.com)",
      "```ts",
      "const value = 1",
      "```",
    ].join("\n");

    expectTokenScopes("markdown", source, "# ", [
      "meta",
      "markup.heading.marker",
    ]);
    expectTokenScopes("markdown", source, "Title", ["meta", "markup.heading"]);
    expectTokenScopes("markdown", source, "- ", ["meta", "markup.list"]);
    expectTokenScopes("markdown", source, "`code`", ["string", "markup.code"]);
    expectTokenScopes("markdown", source, "> ", ["meta", "markup.quote"]);
    expectTokenScopes("markdown", source, "[link](https://example.com)", [
      "link",
      "markup.link",
    ]);
    expectTokenScopes("markdown", source, "```ts", [
      "meta",
      "markup.code.fence",
    ]);
    expectTokenScopes("markdown", source, "const value = 1", [
      "string",
      "markup.code",
    ]);
  });

  test("tokenizes unified and git diff line classes", () => {
    const source = [
      "diff --git a/src/file.ts b/src/file.ts",
      "index 83db48f..f735c2d 100644",
      "old mode 100644",
      "new mode 100755",
      "deleted file mode 100644",
      "new file mode 100644",
      "similarity index 96%",
      "dissimilarity index 12%",
      "rename from src/old.ts",
      "rename to src/new.ts",
      "copy from src/source.ts",
      "copy to src/copy.ts",
      "--- /dev/null",
      "+++ b/src/file.ts",
      "@@ -0,0 +1,3 @@ optional section",
      "+added line",
      "-removed line",
      " context line",
      "\\ No newline at end of file",
      "plain fallback",
      "",
    ].join("\n");

    expectTokenScopes(
      "diff",
      source,
      "diff --git a/src/file.ts b/src/file.ts",
      ["meta", "diff.header"],
    );
    expectTokenScopes("diff", source, "index 83db48f..f735c2d 100644", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "old mode 100644", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "new mode 100755", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "deleted file mode 100644", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "new file mode 100644", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "similarity index 96%", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "dissimilarity index 12%", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "rename from src/old.ts", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "rename to src/new.ts", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "copy from src/source.ts", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "copy to src/copy.ts", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes("diff", source, "--- /dev/null", [
      "meta",
      "diff.file.old",
    ]);
    expectTokenScopes("diff", source, "+++ b/src/file.ts", [
      "meta",
      "diff.file.new",
    ]);
    expectTokenScopes("diff", source, "@@ -0,0 +1,3 @@ optional section", [
      "meta",
      "diff.hunk",
    ]);
    expectTokenScopes("diff", source, "added line", [
      "string",
      "diff.inserted",
    ]);
    expectTokenScopes("diff", source, "removed line", [
      "comment",
      "diff.deleted",
    ]);
    expectTokenScopes("diff", source, "context line", ["text", "diff.context"]);
    expectTokenScopes("diff", source, "\\ No newline at end of file", [
      "comment",
      "diff.no-newline",
    ]);
    expectTokenType("diff", source, "plain fallback", "text");
  });

  test("tokenizes npm diff createPatch-style headers", () => {
    const source = [
      "Index: file.txt",
      "===================================================================",
      "--- file.txt",
      "+++ file.txt",
      "@@ -1,2 +1,2 @@",
      " line",
      "-before",
      "+after",
      "",
    ].join("\n");

    expectTokenScopes("patch", source, "Index: file.txt", [
      "meta",
      "diff.header",
    ]);
    expectTokenScopes(
      "patch",
      source,
      "===================================================================",
      ["meta", "diff.header"],
    );
    expectTokenScopes("patch", source, "--- file.txt", [
      "meta",
      "diff.file.old",
    ]);
    expectTokenScopes("patch", source, "+++ file.txt", [
      "meta",
      "diff.file.new",
    ]);
    expectTokenScopes("patch", source, "before", ["comment", "diff.deleted"]);
    expectTokenScopes("patch", source, "after", ["string", "diff.inserted"]);
  });

  test("streams diff final output consistently across chunk boundaries", () => {
    const content =
      "diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n";
    const direct = clew(content, { lang: "diff", stream: false });
    const stream = clew("", { lang: "diff" });

    for (const chunk of [
      "diff --git a/a",
      ".txt b/a.txt\n--- a/a.txt\n+",
      "++ b/a.txt\n@@ -1 +1 @@\n-o",
      "ld\n+new\n",
    ]) {
      stream.write(chunk);
    }

    expect(stream.end()).toEqual(direct);
  });

  test("streams append-only chunks eagerly by default", () => {
    const stream = clew("", { lang: "ts" });
    const chunks: Array<{ from: number; to: number; text: string }> = [];
    const corrections: Array<{ from: number; to: number; text: string }> = [];

    stream.onChunk((chunk) => {
      chunks.push({
        from: chunk.from,
        to: chunk.to,
        text: joinedText(chunk.tokens),
      });
    });
    stream.onCorrection((correction) => {
      corrections.push({
        from: correction.from,
        to: correction.to,
        text: joinedText(correction.tokens),
      });
    });

    stream.write("const");
    stream.write(" value = 1");

    expect(corrections).toEqual([]);
    expect(chunks).toEqual([
      { from: 0, to: 0, text: "const" },
      { from: 5, to: 5, text: " value = 1" },
    ]);
    expect(joinedText(stream.snapshot().tokens)).toBe("const value = 1");
  });

  test("emits corrections when later TypeScript input changes an earlier token", () => {
    const stream = clew("", { lang: "typescript" });
    const corrections: Array<{ from: number; to: number; text: string }> = [];

    stream.onCorrection((correction) => {
      corrections.push({
        from: correction.from,
        to: correction.to,
        text: joinedText(correction.tokens),
      });
    });

    stream.write('const message = "hel');
    stream.write('lo"');

    expect(corrections).toHaveLength(1);
    expect(corrections[0]).toEqual({
      from: "const message = ".length,
      to: 'const message = "hel'.length,
      text: '"hello"',
    });
    expect(joinedText(stream.end().tokens)).toBe('const message = "hello"');
  });

  test("emits corrections when later python input closes a string", () => {
    const stream = clew("", { lang: "python" });
    const corrections: Array<{ from: number; to: number; text: string }> = [];

    stream.onCorrection((correction) => {
      corrections.push({
        from: correction.from,
        to: correction.to,
        text: joinedText(correction.tokens),
      });
    });

    stream.write('print("hel');
    stream.write('lo")');

    expect(corrections).toEqual([
      {
        from: "print(".length,
        to: 'print("hel'.length,
        text: '"hello")',
      },
    ]);
    expect(joinedText(stream.end().tokens)).toBe('print("hello")');
  });

  test("emits corrections when later bash input extends a variable expansion", () => {
    const stream = clew("", { lang: "bash" });
    const corrections: Array<{ from: number; to: number; text: string }> = [];

    stream.onCorrection((correction) => {
      corrections.push({
        from: correction.from,
        to: correction.to,
        text: joinedText(correction.tokens),
      });
    });

    stream.write('echo "$HO');
    stream.write('ME"');

    expect(corrections).toEqual([
      {
        from: 'echo "'.length,
        to: 'echo "$HO'.length,
        text: '$HOME"',
      },
    ]);
    expect(joinedText(stream.end().tokens)).toBe('echo "$HOME"');
  });

  test("emits corrections when later json input closes a string value", () => {
    const stream = clew("", { lang: "json" });
    const corrections: Array<{ from: number; to: number; text: string }> = [];

    stream.onCorrection((correction) => {
      corrections.push({
        from: correction.from,
        to: correction.to,
        text: joinedText(correction.tokens),
      });
    });

    stream.write('{"message":"hel');
    stream.write('lo"}');

    expect(corrections).toEqual([
      {
        from: '{"message":'.length,
        to: '{"message":"hel'.length,
        text: '"hello"}',
      },
    ]);
    expect(joinedText(stream.end().tokens)).toBe('{"message":"hello"}');
  });

  test("holds back unterminated trailing lines in stable mode and flushes on end", () => {
    const stream = clew("", { lang: "bash", stability: "stable" });
    const chunks: Array<{ from: number; to: number; text: string }> = [];

    stream.onChunk((chunk) => {
      chunks.push({
        from: chunk.from,
        to: chunk.to,
        text: joinedText(chunk.tokens),
      });
    });

    stream.write("echo hi");
    expect(chunks).toEqual([]);

    stream.write("\ncat <<EOF\nhello");
    expect(chunks).toEqual([{ from: 0, to: 0, text: "echo hi\ncat <<EOF\n" }]);

    stream.end();
    expect(chunks).toEqual([
      { from: 0, to: 0, text: "echo hi\ncat <<EOF\n" },
      {
        from: "echo hi\ncat <<EOF\n".length,
        to: "echo hi\ncat <<EOF\n".length,
        text: "hello",
      },
    ]);
  });

  test("replays stable patches for tokens spanning line boundaries", () => {
    const cases = [
      {
        content: 'value = """alpha\nbeta\ngamma"""',
        language: "python",
      },
      {
        content: "printf '%s' 'alpha\nbeta\ngamma'",
        language: "bash",
      },
      {
        content: '{"value":"alpha\nbeta\ngamma"}',
        language: "json",
      },
    ];

    for (const { content, language } of cases) {
      expectStreamPatchesReplay(content, language, [content]);

      for (let split = 1; split < content.length; split++) {
        expectStreamPatchesReplay(content, language, [
          content.slice(0, split),
          content.slice(split),
        ]);
      }

      for (const size of [1, 2, 3, 5, 8]) {
        expectStreamPatchesReplay(
          content,
          language,
          chunkBySize(content, size),
        );
      }
    }
  });

  test("produces the same final output regardless of bash chunk boundaries", () => {
    const content = 'if true; then echo "$HOME"; fi\ncat <<EOF\nhello\nEOF\n';
    const direct = clew(content, { lang: "bash", stream: false });
    const stream = clew("", { lang: "bash" });

    for (const chunk of [
      "if true",
      "; then ",
      'echo "$H',
      'OME"; fi\n',
      "cat <<EOF\nhe",
      "llo\nEOF\n",
    ]) {
      stream.write(chunk);
    }

    expect(stream.end()).toEqual(direct);
  });

  test("produces the same final output regardless of markdown chunk boundaries", () => {
    const content = [
      "# Title",
      "- item with `code`",
      "> quote [link](https://example.com)",
      "```ts",
      "const value = 1",
      "```",
      "",
    ].join("\n");
    const direct = clew(content, { lang: "markdown", stream: false });
    const stream = clew("", { lang: "markdown" });

    for (const chunk of [
      "# Tit",
      "le\n- item ",
      "with `co",
      "de`\n> quote ",
      "[link](https://example.com)\n```ts\nconst",
      " value = 1\n```\n",
    ]) {
      stream.write(chunk);
    }

    expect(stream.end()).toEqual(direct);
  });
});
