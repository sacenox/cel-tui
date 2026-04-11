import { Text } from "@cel-tui/core";

export function warningBox(lines: string[]) {
  const innerWidth = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const border = "─".repeat(innerWidth);

  return [
    Text(`┌${border}┐`, { fgColor: "color03" }),
    ...lines.map((line) =>
      Text(`│${line.padEnd(innerWidth)}│`, { fgColor: "color03" }),
    ),
    Text(`└${border}┘`, { fgColor: "color03" }),
  ];
}
