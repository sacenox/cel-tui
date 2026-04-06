import { describe, expect, test } from "bun:test";
import { layout } from "./layout.js";
import { VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { TextInput } from "./primitives/text-input.js";
import { getMaxScrollOffset } from "./scroll.js";

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

    expect(getMaxScrollOffset(root.children[0]!)).toBe(1);
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
});
