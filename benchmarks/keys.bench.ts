/**
 * Benchmark: key parsing and normalization.
 *
 * Measures the cost of parsing raw terminal input into canonical
 * key strings. Called on every keystroke.
 */

import { bench, group, run } from "mitata";
import {
  isEditingKey,
  normalizeKey,
  parseKey,
} from "../packages/core/src/keys.js";

group("parseKey", () => {
  bench("printable char 'a'", () => {
    parseKey("a");
  });

  bench("ctrl+c (0x03)", () => {
    parseKey("\x03");
  });

  bench("escape", () => {
    parseKey("\x1b");
  });

  bench("arrow up (CSI A)", () => {
    parseKey("\x1b[A");
  });

  bench("shift+tab (CSI Z)", () => {
    parseKey("\x1b[Z");
  });

  bench("F5 (CSI 15~)", () => {
    parseKey("\x1b[15~");
  });

  bench("backspace (0x7F)", () => {
    parseKey("\x7f");
  });
});

group("normalizeKey", () => {
  bench("simple key 'a'", () => {
    normalizeKey("a");
  });

  bench("ctrl+s", () => {
    normalizeKey("ctrl+s");
  });

  bench("shift+ctrl+s (reorder)", () => {
    normalizeKey("shift+ctrl+s");
  });

  bench("ctrl+alt+shift+x", () => {
    normalizeKey("ctrl+alt+shift+x");
  });
});

group("isEditingKey", () => {
  bench("'a' (editing)", () => {
    isEditingKey("a");
  });

  bench("'enter' (editing)", () => {
    isEditingKey("enter");
  });

  bench("'ctrl+s' (not editing)", () => {
    isEditingKey("ctrl+s");
  });
});

await run();
