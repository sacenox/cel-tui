import * as ts from "typescript";
import type { ClewOutput, ClewToken } from "../model.js";
import type { ClewLanguageSupport } from "../registry.js";
import {
  createToken,
  requiredAt,
  splitLines,
  stableLineBoundary,
} from "../shared.js";

const classifier = ts.createClassifier();

const GLOBAL_BUILTINS = new Set([
  "console",
  "globalThis",
  "Intl",
  "JSON",
  "Math",
  "Promise",
  "Reflect",
]);

const PARAMETER_PROPERTY_MODIFIERS = new Set([
  ts.SyntaxKind.PrivateKeyword,
  ts.SyntaxKind.ProtectedKeyword,
  ts.SyntaxKind.PublicKeyword,
  ts.SyntaxKind.ReadonlyKeyword,
  ts.SyntaxKind.OverrideKeyword,
]);

interface TokenTypeInfo {
  path?: readonly string[];
  scopes?: readonly string[];
  type: string;
}

interface SemanticInfo extends TokenTypeInfo {
  priority: number;
}

const BOOLEAN_INFO = {
  priority: 30,
  scopes: ["keyword", "constant.boolean"],
  type: "keyword",
} satisfies SemanticInfo;

const BUILTIN_INFO = {
  priority: 20,
  scopes: ["builtin"],
  type: "builtin",
} satisfies SemanticInfo;

const CLASS_INFO = {
  priority: 50,
  scopes: ["type", "type.class"],
  type: "type",
} satisfies SemanticInfo;

const DECORATOR_INFO = {
  priority: 60,
  scopes: ["meta", "meta.decorator"],
  type: "meta",
} satisfies SemanticInfo;

const ENUM_INFO = {
  priority: 50,
  scopes: ["type", "type.enum"],
  type: "type",
} satisfies SemanticInfo;

const ENUM_MEMBER_INFO = {
  priority: 30,
  scopes: ["property", "constant.enum"],
  type: "property",
} satisfies SemanticInfo;

const FUNCTION_INFO = {
  priority: 40,
  scopes: ["function"],
  type: "function",
} satisfies SemanticInfo;

const INTERFACE_INFO = {
  priority: 50,
  scopes: ["type", "type.interface"],
  type: "type",
} satisfies SemanticInfo;

const NULL_INFO = {
  priority: 30,
  scopes: ["keyword", "constant.null"],
  type: "keyword",
} satisfies SemanticInfo;

const NUMBER_PROPERTY_INFO = {
  priority: 30,
  scopes: ["number", "property"],
  type: "number",
} satisfies SemanticInfo;

const PARAMETER_INFO = {
  priority: 25,
  scopes: ["variable", "variable.parameter"],
  type: "variable",
} satisfies SemanticInfo;

const PRIMITIVE_TYPE_INFO = {
  priority: 45,
  scopes: ["type", "type.primitive"],
  type: "type",
} satisfies SemanticInfo;

const PROPERTY_INFO = {
  priority: 30,
  scopes: ["property"],
  type: "property",
} satisfies SemanticInfo;

const STRING_PROPERTY_INFO = {
  priority: 30,
  scopes: ["string", "property"],
  type: "string",
} satisfies SemanticInfo;

const TYPE_ALIAS_INFO = {
  priority: 50,
  scopes: ["type", "type.alias"],
  type: "type",
} satisfies SemanticInfo;

const TYPE_INFO = {
  priority: 45,
  scopes: ["type"],
  type: "type",
} satisfies SemanticInfo;

const TYPE_PARAMETER_INFO = {
  priority: 50,
  scopes: ["type", "type.parameter"],
  type: "type",
} satisfies SemanticInfo;

const TYPE_KEYWORD_KINDS = new Set([
  ts.SyntaxKind.AnyKeyword,
  ts.SyntaxKind.BigIntKeyword,
  ts.SyntaxKind.BooleanKeyword,
  ts.SyntaxKind.NeverKeyword,
  ts.SyntaxKind.NumberKeyword,
  ts.SyntaxKind.ObjectKeyword,
  ts.SyntaxKind.StringKeyword,
  ts.SyntaxKind.SymbolKeyword,
  ts.SyntaxKind.UndefinedKeyword,
  ts.SyntaxKind.UnknownKeyword,
  ts.SyntaxKind.VoidKeyword,
]);

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

function baseTokensFromTypescript(content: string): ClewToken[] {
  const tokens: ClewToken[] = [];
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
            info.path,
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
          info.path,
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
          info.path,
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

  return tokens;
}

function semanticKey(start: number, end: number): string {
  return `${start}:${end}`;
}

function setSemantic(
  semantics: Map<string, SemanticInfo>,
  start: number,
  end: number,
  info: SemanticInfo,
): void {
  if (end <= start) {
    return;
  }

  const key = semanticKey(start, end);
  const existing = semantics.get(key);
  if (!existing || info.priority >= existing.priority) {
    semantics.set(key, info);
  }
}

function setSemanticForNode(
  semantics: Map<string, SemanticInfo>,
  sourceFile: ts.SourceFile,
  node: ts.Node | undefined,
  info: SemanticInfo,
): void {
  if (!node) {
    return;
  }

  setSemantic(semantics, node.getStart(sourceFile), node.getEnd(), info);
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;

  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isNonNullExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isAsExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isSatisfiesExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isPartiallyEmittedExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

function hasParameterPropertyModifier(
  parameter: ts.ParameterDeclaration,
): boolean {
  return (
    parameter.modifiers?.some((modifier) =>
      PARAMETER_PROPERTY_MODIFIERS.has(modifier.kind),
    ) ?? false
  );
}

function semanticForPropertyName(
  name: ts.PropertyName | ts.PrivateIdentifier,
  info: SemanticInfo,
): SemanticInfo {
  if (ts.isStringLiteral(name)) {
    return info === ENUM_MEMBER_INFO ? ENUM_MEMBER_INFO : STRING_PROPERTY_INFO;
  }

  if (ts.isNumericLiteral(name)) {
    return info === ENUM_MEMBER_INFO ? ENUM_MEMBER_INFO : NUMBER_PROPERTY_INFO;
  }

  return info;
}

function markBindingName(
  semantics: Map<string, SemanticInfo>,
  sourceFile: ts.SourceFile,
  name: ts.BindingName,
  info: SemanticInfo,
): void {
  if (ts.isIdentifier(name)) {
    setSemanticForNode(semantics, sourceFile, name, info);
    return;
  }

  for (const element of name.elements) {
    if (!ts.isBindingElement(element)) {
      continue;
    }
    markBindingName(semantics, sourceFile, element.name, info);
  }
}

function markPropertyName(
  semantics: Map<string, SemanticInfo>,
  sourceFile: ts.SourceFile,
  name: ts.PropertyName | ts.PrivateIdentifier | undefined,
  info = PROPERTY_INFO,
): void {
  if (!name || ts.isComputedPropertyName(name)) {
    return;
  }

  setSemanticForNode(
    semantics,
    sourceFile,
    name,
    semanticForPropertyName(name, info),
  );
}

function markTypeName(
  semantics: Map<string, SemanticInfo>,
  sourceFile: ts.SourceFile,
  node: ts.Node | undefined,
  info = TYPE_INFO,
): void {
  if (!node) {
    return;
  }

  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
    setSemanticForNode(semantics, sourceFile, node, info);
    return;
  }

  if (ts.isQualifiedName(node)) {
    markTypeName(semantics, sourceFile, node.left, info);
    markTypeName(semantics, sourceFile, node.right, info);
    return;
  }

  if (ts.isPropertyAccessExpression(node)) {
    markTypeName(semantics, sourceFile, node.expression, info);
    setSemanticForNode(semantics, sourceFile, node.name, info);
    return;
  }

  if (ts.isImportTypeNode(node) && node.qualifier) {
    markTypeName(semantics, sourceFile, node.qualifier, info);
    return;
  }

  if (ts.isThisTypeNode(node)) {
    setSemanticForNode(semantics, sourceFile, node, info);
  }
}

function markDecoratorTarget(
  semantics: Map<string, SemanticInfo>,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): void {
  const unwrapped = unwrapExpression(expression);

  if (ts.isIdentifier(unwrapped)) {
    setSemanticForNode(semantics, sourceFile, unwrapped, DECORATOR_INFO);
    return;
  }

  if (ts.isPropertyAccessExpression(unwrapped)) {
    setSemanticForNode(semantics, sourceFile, unwrapped.name, DECORATOR_INFO);
    return;
  }

  if (ts.isCallExpression(unwrapped)) {
    markDecoratorTarget(semantics, sourceFile, unwrapped.expression);
  }
}

function markCallTarget(
  semantics: Map<string, SemanticInfo>,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): void {
  const unwrapped = unwrapExpression(expression);

  if (ts.isIdentifier(unwrapped)) {
    setSemanticForNode(
      semantics,
      sourceFile,
      unwrapped,
      GLOBAL_BUILTINS.has(unwrapped.text) ? BUILTIN_INFO : FUNCTION_INFO,
    );
    return;
  }

  if (ts.isPropertyAccessExpression(unwrapped)) {
    if (
      ts.isIdentifier(unwrapped.expression) &&
      GLOBAL_BUILTINS.has(unwrapped.expression.text)
    ) {
      setSemanticForNode(
        semantics,
        sourceFile,
        unwrapped.expression,
        BUILTIN_INFO,
      );
    }

    setSemanticForNode(semantics, sourceFile, unwrapped.name, FUNCTION_INFO);
  }
}

function markNewTarget(
  semantics: Map<string, SemanticInfo>,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): void {
  const unwrapped = unwrapExpression(expression);

  if (ts.isIdentifier(unwrapped)) {
    setSemanticForNode(semantics, sourceFile, unwrapped, TYPE_INFO);
    return;
  }

  if (ts.isPropertyAccessExpression(unwrapped)) {
    setSemanticForNode(semantics, sourceFile, unwrapped.name, TYPE_INFO);
  }
}

function collectTypescriptSemantics(
  content: string,
): Map<string, SemanticInfo> {
  const semantics = new Map<string, SemanticInfo>();
  const sourceFile = ts.createSourceFile(
    "clew.ts",
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  function visit(node: ts.Node): void {
    if (TYPE_KEYWORD_KINDS.has(node.kind)) {
      setSemanticForNode(semantics, sourceFile, node, PRIMITIVE_TYPE_INFO);
    }

    switch (node.kind) {
      case ts.SyntaxKind.FalseKeyword:
      case ts.SyntaxKind.TrueKeyword:
        setSemanticForNode(semantics, sourceFile, node, BOOLEAN_INFO);
        break;
      case ts.SyntaxKind.NullKeyword:
        setSemanticForNode(semantics, sourceFile, node, NULL_INFO);
        break;
    }

    if (ts.isDecorator(node)) {
      markDecoratorTarget(semantics, sourceFile, node.expression);
    } else if (ts.isTypeAliasDeclaration(node)) {
      setSemanticForNode(semantics, sourceFile, node.name, TYPE_ALIAS_INFO);
    } else if (ts.isInterfaceDeclaration(node)) {
      setSemanticForNode(semantics, sourceFile, node.name, INTERFACE_INFO);
    } else if (ts.isClassDeclaration(node)) {
      setSemanticForNode(semantics, sourceFile, node.name, CLASS_INFO);
    } else if (ts.isEnumDeclaration(node)) {
      setSemanticForNode(semantics, sourceFile, node.name, ENUM_INFO);
    } else if (ts.isModuleDeclaration(node)) {
      setSemanticForNode(semantics, sourceFile, node.name, TYPE_INFO);
    } else if (ts.isTypeParameterDeclaration(node)) {
      setSemanticForNode(semantics, sourceFile, node.name, TYPE_PARAMETER_INFO);
    } else if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node)
    ) {
      setSemanticForNode(semantics, sourceFile, node.name, FUNCTION_INFO);
    } else if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) {
      markPropertyName(semantics, sourceFile, node.name, FUNCTION_INFO);
    } else if (
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      markPropertyName(semantics, sourceFile, node.name, PROPERTY_INFO);
    } else if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
      markPropertyName(semantics, sourceFile, node.name, PROPERTY_INFO);
    } else if (ts.isConstructorDeclaration(node)) {
      setSemanticForNode(
        semantics,
        sourceFile,
        node.getFirstToken(sourceFile),
        FUNCTION_INFO,
      );
    } else if (ts.isParameter(node)) {
      if (hasParameterPropertyModifier(node)) {
        markBindingName(semantics, sourceFile, node.name, PROPERTY_INFO);
      } else {
        markBindingName(semantics, sourceFile, node.name, PARAMETER_INFO);
      }
    } else if (ts.isVariableDeclaration(node)) {
      if (
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer))
      ) {
        setSemanticForNode(semantics, sourceFile, node.name, FUNCTION_INFO);
      }
    } else if (ts.isPropertyAssignment(node)) {
      markPropertyName(semantics, sourceFile, node.name, PROPERTY_INFO);
    } else if (ts.isEnumMember(node)) {
      markPropertyName(semantics, sourceFile, node.name, ENUM_MEMBER_INFO);
    } else if (ts.isPropertyAccessExpression(node)) {
      markPropertyName(semantics, sourceFile, node.name, PROPERTY_INFO);
    } else if (ts.isCallExpression(node)) {
      markCallTarget(semantics, sourceFile, node.expression);
    } else if (ts.isTaggedTemplateExpression(node)) {
      markCallTarget(semantics, sourceFile, node.tag);
    } else if (ts.isNewExpression(node)) {
      markNewTarget(semantics, sourceFile, node.expression);
    } else if (ts.isTypeReferenceNode(node)) {
      markTypeName(semantics, sourceFile, node.typeName);
    } else if (ts.isExpressionWithTypeArguments(node)) {
      markTypeName(semantics, sourceFile, node.expression);
    } else if (ts.isImportTypeNode(node) && node.qualifier) {
      markTypeName(semantics, sourceFile, node.qualifier);
    } else if (ts.isImportClause(node) && node.isTypeOnly && node.name) {
      setSemanticForNode(semantics, sourceFile, node.name, TYPE_INFO);
    } else if (ts.isImportSpecifier(node) && node.isTypeOnly) {
      setSemanticForNode(
        semantics,
        sourceFile,
        node.propertyName ?? node.name,
        TYPE_INFO,
      );
      setSemanticForNode(semantics, sourceFile, node.name, TYPE_INFO);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return semantics;
}

function applySemantics(
  tokens: readonly ClewToken[],
  semantics: Map<string, SemanticInfo>,
): ClewToken[] {
  if (semantics.size === 0) {
    return [...tokens];
  }

  return tokens.map((token) => {
    const semantic = semantics.get(semanticKey(token.start, token.end));
    if (!semantic) {
      return token;
    }

    return createToken(
      token.text,
      token.start,
      token.end,
      semantic.type,
      semantic.scopes,
      semantic.path,
    );
  });
}

function tokenizeTypescript(content: string): ClewOutput {
  const baseTokens = baseTokensFromTypescript(content);
  const semantics = collectTypescriptSemantics(content);
  return { tokens: applySemantics(baseTokens, semantics) };
}

export const typescriptLanguageSupport: ClewLanguageSupport = {
  ids: ["typescript", "ts", "mts", "cts", "javascript", "js", "mjs", "cjs"],
  stableBoundary: stableLineBoundary,
  tokenize: tokenizeTypescript,
};
