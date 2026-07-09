import { describe, expect, test } from "bun:test";
import {
  type CursorStyle,
  type cel,
  type EmitOptions,
  type KeyEvent,
  type KeyPressHandler,
  type ScrollHandler,
  Text,
  type TextInputBaseProps,
  type TextInputProps,
} from "@cel-tui/core";

type AssertNever<T extends never> = T;
type ContainerOnlyTextInputKey = Extract<
  keyof TextInputProps,
  | "gap"
  | "justifyContent"
  | "alignItems"
  | "flexWrap"
  | "overflow"
  | "scrollbar"
  | "scrollbarStyle"
  | "scrollOffset"
  | "onScroll"
  | "onClick"
>;
type _TextInputExcludesContainerOnlyProps =
  AssertNever<ContainerOnlyTextInputKey>;
type _CelExcludesTestHooks = AssertNever<
  Extract<keyof typeof cel, "_getBuffer" | "_flush">
>;

describe("@cel-tui/core public barrel", () => {
  test("re-exports public callback contracts", () => {
    const keyHandler: KeyPressHandler = () => false;
    const scrollHandler: ScrollHandler = () => false;
    const cursorStyle: CursorStyle = "bar";
    const textInputBaseProps: TextInputBaseProps = {
      width: "100%",
      scrollStep: 4,
      focusable: true,
    };
    const emitOptions: EmitOptions = {
      cursor: { visible: true, x: 0, y: 0, style: "bar" },
      previousCursor: { visible: false },
    };
    const keyEvent: KeyEvent = {
      key: "a",
      text: "a",
      eventType: "press",
      codePoint: 97,
      modifiers: {
        shift: false,
        alt: false,
        ctrl: false,
        super: false,
        hyper: false,
        meta: false,
        capsLock: false,
        numLock: false,
      },
    };

    expect(keyHandler("escape", keyEvent)).toBe(false);
    expect(scrollHandler(1, 10)).toBe(false);
    expect(cursorStyle).toBe("bar");
    expect(textInputBaseProps.scrollStep).toBe(4);
    expect(emitOptions.cursor?.visible).toBe(true);
    expect(keyEvent.eventType).toBe("press");
    expect(Text("public entrypoint").content).toBe("public entrypoint");
  });
});
