import { afterEach, describe, expect, jest, test } from "bun:test";
import { createTicker } from "./ticker.js";

describe("createTicker", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("does nothing until explicitly started", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    const ticks: number[] = [];
    let renders = 0;
    const ticker = createTicker({
      maxFps: 20,
      onTick: ({ frame }) => ticks.push(frame),
      requestRender: () => renders++,
    });

    jest.advanceTimersByTime(1_000);

    expect(ticks).toEqual([]);
    expect(renders).toBe(0);
    expect(ticker.running).toBe(false);
    ticker.dispose();
  });

  test("never schedules faster than maxFps and batches one render per tick", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    const ticks: Array<{ frame: number; deltaMs: number; elapsedMs: number }> =
      [];
    let renders = 0;
    const ticker = createTicker({
      maxFps: 20,
      onTick: (tick) => ticks.push(tick),
      requestRender: () => renders++,
    });

    ticker.start();
    jest.advanceTimersByTime(49);
    expect(ticks).toEqual([]);

    jest.advanceTimersByTime(1);
    expect(ticks).toEqual([{ frame: 1, deltaMs: 50, elapsedMs: 50 }]);
    expect(renders).toBe(1);

    jest.advanceTimersByTime(200);
    expect(ticks).toHaveLength(5);
    expect(renders).toBe(5);
    ticker.dispose();
  });

  test("start is idempotent and stop cancels pending work", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    let ticks = 0;
    const ticker = createTicker({
      maxFps: 10,
      onTick: () => ticks++,
      requestRender: () => {},
    });

    ticker.start();
    ticker.start();
    expect(jest.getTimerCount()).toBe(1);

    jest.advanceTimersByTime(100);
    expect(ticks).toBe(1);
    ticker.stop();
    expect(ticker.running).toBe(false);
    expect(jest.getTimerCount()).toBe(0);

    jest.advanceTimersByTime(1_000);
    expect(ticks).toBe(1);
    ticker.dispose();
  });

  test("a callback can stop the ticker without leaving another timer", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    let ticks = 0;
    const ticker = createTicker({
      maxFps: 30,
      onTick: () => {
        ticks++;
        ticker.stop();
      },
      requestRender: () => {},
    });

    ticker.start();
    jest.advanceTimersByTime(1_000);

    expect(ticks).toBe(1);
    expect(ticker.running).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    ticker.dispose();
  });

  test("dispose is idempotent and rejects later restarts", () => {
    jest.useFakeTimers();
    const ticker = createTicker({ maxFps: 12 });
    ticker.start();

    ticker.dispose();
    ticker.dispose();

    expect(ticker.disposed).toBe(true);
    expect(ticker.running).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    expect(() => ticker.start()).toThrow("disposed");
  });

  test("stops cleanly when a callback throws", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    const ticker = createTicker({
      maxFps: 10,
      onTick: () => {
        throw new Error("tick failed");
      },
      requestRender: () => {},
    });
    ticker.start();

    expect(() => jest.advanceTimersByTime(100)).toThrow("tick failed");
    expect(ticker.running).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    ticker.dispose();
  });

  test("validates the rate eagerly", () => {
    for (const maxFps of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => createTicker({ maxFps })).toThrow("maxFps");
    }
  });
});
