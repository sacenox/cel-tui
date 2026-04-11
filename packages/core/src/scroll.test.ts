import { describe, expect, test } from "bun:test";
import { layout } from "./layout.js";
import { HStack, VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";
import { getMaxScrollOffset, getScrollStep } from "./scroll.js";

function item<T>(items: readonly T[], index: number): T {
  const value = items[index];
  expect(value).toBeDefined();
  if (value === undefined) {
    throw new Error(`Missing item at index ${index}`);
  }
  return value;
}

describe("scroll", () => {
  test("TextInput max scroll offset uses visual wrapping and padding", () => {
    const root = layout(
      VStack({ width: 8, height: 4 }, [
        TextInput({
          width: 8,
          height: 4,
          padding: { x: 1, y: 1 },
          value: "foo bar baz",
          onChange: () => {},
        }),
      ]),
      8,
      4,
    );

    expect(getMaxScrollOffset(item(root.children, 0))).toBe(1);
  });

  test("scrollable VStack max scroll offset matches content overflow", () => {
    const root = layout(
      VStack({ width: 10, height: 3, overflow: "scroll" }, [
        Text("line0"),
        Text("line1"),
        Text("line2"),
        Text("line3"),
      ]),
      10,
      3,
    );

    expect(getMaxScrollOffset(root)).toBe(1);
  });

  test("adaptive scroll step uses the scroll target viewport and clamps to 3..8", () => {
    const small = layout(
      VStack({ width: 10, height: 2, overflow: "scroll" }, [Text("x")]),
      10,
      2,
    );
    const medium = layout(
      VStack({ width: 10, height: 12, overflow: "scroll" }, [Text("x")]),
      10,
      12,
    );
    const large = layout(
      HStack({ width: 30, height: 3, overflow: "scroll" }, [Text("x")]),
      30,
      3,
    );

    expect(getScrollStep(small)).toBe(3);
    expect(getScrollStep(medium)).toBe(4);
    expect(getScrollStep(large)).toBe(8);
  });

  test("scrollStep prop overrides the adaptive default", () => {
    const scrollable = layout(
      VStack({ width: 10, height: 12, overflow: "scroll", scrollStep: 6 }, [
        Text("x"),
      ]),
      10,
      12,
    );
    const textInputRoot = layout(
      VStack({ width: 8, height: 4 }, [
        TextInput({
          width: 8,
          height: 4,
          scrollStep: 5,
          value: "line1\nline2\nline3\nline4\nline5\nline6",
          onChange: () => {},
        }),
      ]),
      8,
      4,
    );

    expect(getScrollStep(scrollable)).toBe(6);
    expect(getScrollStep(item(textInputRoot.children, 0))).toBe(5);
  });
});
