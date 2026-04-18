import { describe, expect, test } from "bun:test";
import { ProcessTerminal } from "./terminal.js";

type Restorer = () => void;

function replaceMethod<T extends object, K extends keyof T>(
  object: T,
  key: K,
  value: T[K],
): Restorer {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  Object.defineProperty(object, key, {
    configurable: true,
    writable: true,
    value,
  });

  return () => {
    if (descriptor) {
      Object.defineProperty(object, key, descriptor);
    }
  };
}

function patchProcessIo(): Restorer {
  const restoreStdoutWrite = replaceMethod(
    process.stdout,
    "write",
    (() => true) as typeof process.stdout.write,
  );
  const restoreResume = replaceMethod(
    process.stdin,
    "resume",
    (() => process.stdin) as typeof process.stdin.resume,
  );
  const restorePause = replaceMethod(
    process.stdin,
    "pause",
    (() => process.stdin) as typeof process.stdin.pause,
  );
  const restoreSetEncoding = replaceMethod(
    process.stdin,
    "setEncoding",
    (() => process.stdin) as typeof process.stdin.setEncoding,
  );
  const restoreSetRawMode = replaceMethod(
    process.stdin,
    "setRawMode",
    (() => process.stdin) as typeof process.stdin.setRawMode,
  );

  return () => {
    restoreSetRawMode();
    restoreSetEncoding();
    restorePause();
    restoreResume();
    restoreStdoutWrite();
  };
}

describe("ProcessTerminal", () => {
  test("start and stop clean up crash listeners across repeated cycles", () => {
    const restoreIo = patchProcessIo();
    const term = new ProcessTerminal();
    const beforeUncaught = process.listenerCount("uncaughtException");
    const beforeUnhandled = process.listenerCount("unhandledRejection");

    try {
      term.start(
        () => {},
        () => {},
      );
      expect(process.listenerCount("uncaughtException")).toBe(
        beforeUncaught + 1,
      );
      expect(process.listenerCount("unhandledRejection")).toBe(
        beforeUnhandled + 1,
      );

      term.stop();
      expect(process.listenerCount("uncaughtException")).toBe(beforeUncaught);
      expect(process.listenerCount("unhandledRejection")).toBe(beforeUnhandled);

      term.start(
        () => {},
        () => {},
      );
      expect(process.listenerCount("uncaughtException")).toBe(
        beforeUncaught + 1,
      );
      expect(process.listenerCount("unhandledRejection")).toBe(
        beforeUnhandled + 1,
      );

      term.stop();
      expect(process.listenerCount("uncaughtException")).toBe(beforeUncaught);
      expect(process.listenerCount("unhandledRejection")).toBe(beforeUnhandled);
    } finally {
      term.stop();
      restoreIo();
    }
  });
});
