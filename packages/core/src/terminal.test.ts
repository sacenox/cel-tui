import { describe, expect, test } from "bun:test";
import { ProcessTerminal } from "./terminal.js";

type Restorer = () => void;
type TerminationSignal = "SIGINT" | "SIGTERM";

const CLEANUP_SEQUENCE =
  "\x1b[?1006l\x1b[?1000l\x1b[?2004l\x1b[<u\x1b[0 q\x1b[?25h\x1b[?1049l";

async function runSignalChild(
  signal: TerminationSignal,
  withApplicationListener = false,
) {
  const terminalModuleUrl = new URL("./terminal.ts", import.meta.url).href;
  const source = `
    import { ProcessTerminal } from ${JSON.stringify(terminalModuleUrl)};

    if (${JSON.stringify(withApplicationListener)}) {
      process.on(${JSON.stringify(signal)}, () => {});
    }
    const terminal = new ProcessTerminal();
    terminal.start(() => {}, () => {});
    setTimeout(() => process.exit(99), 100);
    process.kill(process.pid, ${JSON.stringify(signal)});
  `;
  const child = Bun.spawn([process.execPath, "-e", source], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new Response(child.stdout).text();
  const stderr = new Response(child.stderr).text();
  const status = await child.exited;

  return {
    status,
    signalCode: child.signalCode,
    stderr: await stderr,
    stdout: await stdout,
  };
}

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

class CapturingProcessTerminal extends ProcessTerminal {
  output = "";

  override write(data: string): void {
    this.output += data;
  }
}

describe("ProcessTerminal", () => {
  test("keeps the default Kitty disambiguation flag", () => {
    const restoreIo = patchProcessIo();
    const term = new CapturingProcessTerminal();

    try {
      term.start(
        () => {},
        () => {},
      );
      expect(term.output).toContain("\x1b[>1u");
    } finally {
      term.stop();
      restoreIo();
    }
  });

  test("pushes the requested Kitty progressive-enhancement flags", () => {
    const restoreIo = patchProcessIo();
    const term = new CapturingProcessTerminal();

    try {
      term.start(
        () => {},
        () => {},
        {
          kittyKeyboard: {
            reportEventTypes: true,
            reportAlternateKeys: true,
            reportAllKeys: true,
            reportAssociatedText: true,
          },
        },
      );
      expect(term.output).toContain("\x1b[>31u");
      term.stop();
      expect(term.output.indexOf("\x1b[>31u")).toBeLessThan(
        term.output.indexOf("\x1b[<u"),
      );
      expect(term.output.split("\x1b[<u")).toHaveLength(2);
    } finally {
      term.stop();
      restoreIo();
    }
  });

  test("associated text automatically enables all-keys reporting", () => {
    const restoreIo = patchProcessIo();
    const term = new CapturingProcessTerminal();

    try {
      term.start(
        () => {},
        () => {},
        { kittyKeyboard: { reportAssociatedText: true } },
      );
      expect(term.output).toContain("\x1b[>25u");
    } finally {
      term.stop();
      restoreIo();
    }
  });

  for (const [signal, expectedStatus] of [
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const) {
    test(`${signal} restores terminal state and preserves signal termination`, async () => {
      const result = await runSignalChild(signal);

      expect(result.stderr).toBe("");
      expect(result.stdout.endsWith(CLEANUP_SEQUENCE)).toBe(true);
      expect(result.status).toBe(expectedStatus);
      expect(result.signalCode).toBe(signal);
    });

    test(`${signal} still terminates when the application registered a listener`, async () => {
      const result = await runSignalChild(signal, true);

      expect(result.stderr).toBe("");
      expect(result.stdout.endsWith(CLEANUP_SEQUENCE)).toBe(true);
      expect(result.status).toBe(expectedStatus);
      expect(result.signalCode).toBe(signal);
    });
  }

  test("start and stop clean up crash listeners across repeated cycles", () => {
    const restoreIo = patchProcessIo();
    const term = new ProcessTerminal();
    const beforeSigint = process.listenerCount("SIGINT");
    const beforeSigterm = process.listenerCount("SIGTERM");
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
      expect(process.listenerCount("SIGINT")).toBe(beforeSigint + 1);
      expect(process.listenerCount("SIGTERM")).toBe(beforeSigterm + 1);

      term.stop();
      expect(process.listenerCount("SIGINT")).toBe(beforeSigint);
      expect(process.listenerCount("SIGTERM")).toBe(beforeSigterm);
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
      expect(process.listenerCount("SIGINT")).toBe(beforeSigint + 1);
      expect(process.listenerCount("SIGTERM")).toBe(beforeSigterm + 1);

      term.stop();
      expect(process.listenerCount("SIGINT")).toBe(beforeSigint);
      expect(process.listenerCount("SIGTERM")).toBe(beforeSigterm);
      expect(process.listenerCount("uncaughtException")).toBe(beforeUncaught);
      expect(process.listenerCount("unhandledRejection")).toBe(beforeUnhandled);
    } finally {
      term.stop();
      restoreIo();
    }
  });
});
