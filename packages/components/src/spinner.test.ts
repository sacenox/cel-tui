import { afterEach, describe, expect, jest, test } from "bun:test";
import { visibleWidth } from "@cel-tui/core";
import { Spinner } from "./spinner.js";

describe("Spinner", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("renders the first frame with Text styling", () => {
    const spinner = Spinner({
      frames: ["a", "b"],
      fgColor: "color06",
      bold: true,
    });

    expect(spinner()).toEqual({
      type: "text",
      content: "a",
      props: { fgColor: "color06", bold: true },
    });
    spinner.dispose();
  });

  test("supports per-render style overrides and exposes current content", () => {
    const spinner = Spinner({ frames: ["x"], fgColor: "color06" });

    expect(spinner.current).toBe("x");
    expect(spinner({ fgColor: "color02", italic: true }).props).toEqual({
      fgColor: "color02",
      italic: true,
    });
    spinner.dispose();
  });

  test("advances only while running", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    const spinner = Spinner({
      frames: ["a", "b", "c"],
      maxFps: 10,
      requestRender: () => {},
    });

    jest.advanceTimersByTime(500);
    expect(spinner().content).toBe("a");

    spinner.start();
    jest.advanceTimersByTime(100);
    expect(spinner().content).toBe("b");
    expect(spinner.frame).toBe(1);

    spinner.stop();
    jest.advanceTimersByTime(500);
    expect(spinner().content).toBe("b");
    spinner.dispose();
  });

  test("supports explicitly requested auto-start and reset", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    let renders = 0;
    const spinner = Spinner({
      frames: ["0", "1", "2"],
      maxFps: 5,
      autoStart: true,
      requestRender: () => renders++,
    });

    expect(spinner.running).toBe(true);
    jest.advanceTimersByTime(400);
    expect(spinner().content).toBe("2");

    spinner.reset();
    expect(spinner().content).toBe("0");
    expect(renders).toBe(3);
    spinner.dispose();
  });

  test("dispose cancels animation permanently", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    const spinner = Spinner({
      frames: ["a", "b"],
      maxFps: 10,
      requestRender: () => {},
    });
    spinner.start();

    spinner.dispose();

    expect(spinner.disposed).toBe(true);
    expect(spinner.running).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    expect(() => spinner.start()).toThrow("disposed");
  });

  test("pads frames to a stable terminal width by default", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    const spinner = Spinner({
      frames: ["·", "界", "go"],
      maxFps: 10,
      requestRender: () => {},
    });

    const widths = [visibleWidth(spinner().content)];
    spinner.start();
    jest.advanceTimersByTime(100);
    widths.push(visibleWidth(spinner().content));
    jest.advanceTimersByTime(100);
    widths.push(visibleWidth(spinner().content));

    expect(widths).toEqual([2, 2, 2]);
    spinner.dispose();
  });

  test("can preserve frames verbatim when padding is disabled", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    const spinner = Spinner({
      frames: [".", "wide"],
      maxFps: 10,
      padFrames: false,
      requestRender: () => {},
    });

    expect(spinner().content).toBe(".");
    spinner.start();
    jest.advanceTimersByTime(100);
    expect(spinner().content).toBe("wide");
    spinner.dispose();
  });

  test("validates custom frames", () => {
    expect(() => Spinner({ frames: [] })).toThrow("frame");
    expect(() => Spinner({ frames: [""] })).toThrow("frame");
  });
});
