/**
 * Benchmark: visibleWidth — character width measurement.
 *
 * This is the hottest path in the framework. Every text node, every
 * word-wrap calculation, every cursor position calls visibleWidth().
 */

import { bench, group, run } from "mitata";
import { visibleWidth } from "@cel-tui/core";
import { ASCII_STRING, CJK_EMOJI_STRING, MIXED_STRING } from "./helpers.js";

// --- Benchmarks ---

group("visibleWidth", () => {
  bench("ASCII (64 chars)", () => {
    visibleWidth(ASCII_STRING);
  });

  bench("ASCII short (5 chars)", () => {
    visibleWidth("hello");
  });

  bench("CJK + emoji (26 graphemes)", () => {
    visibleWidth(CJK_EMOJI_STRING);
  });

  bench("mixed ASCII + CJK (60 chars)", () => {
    visibleWidth(MIXED_STRING);
  });

  const longAscii = ASCII_STRING.repeat(10);
  bench("ASCII long (640 chars)", () => {
    visibleWidth(longAscii);
  });

  const ansiString = "\x1b[31mRed\x1b[0m \x1b[1;32mBold Green\x1b[0m normal";
  bench("ANSI escape sequences", () => {
    visibleWidth(ansiString);
  });

  bench("empty string", () => {
    visibleWidth("");
  });
});

await run();
