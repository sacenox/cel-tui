/**
 * Minimal terminal interface.
 *
 * Abstracts terminal I/O for both real usage (ProcessTerminal)
 * and testing (MockTerminal).
 */
export interface Terminal {
  /** Write a string to the terminal output. */
  write(data: string): void;
  /** Terminal width in columns. */
  get columns(): number;
  /** Terminal height in rows. */
  get rows(): number;
  /** Enter raw mode, enable mouse tracking, hide cursor. */
  start(onInput: (data: string) => void, onResize: () => void): void;
  /** Restore terminal state. */
  stop(): void;
  /** Hide the terminal cursor. */
  hideCursor(): void;
  /** Show the terminal cursor. */
  showCursor(): void;
}

/**
 * Real terminal using process.stdin/stdout.
 */
export class ProcessTerminal implements Terminal {
  private wasRaw = false;
  private resizeHandler?: () => void;
  private inputHandler?: (data: string) => void;
  private cleanupBound?: () => void;
  private stopped = false;

  get columns(): number {
    return process.stdout.columns || 80;
  }

  get rows(): number {
    return process.stdout.rows || 24;
  }

  write(data: string): void {
    process.stdout.write(data);
  }

  start(onInput: (data: string) => void, onResize: () => void): void {
    this.stopped = false;
    this.inputHandler = onInput;
    this.resizeHandler = () => {
      // Clear screen on resize to avoid scrollback artifacts
      this.write("\x1b[2J\x1b[H");
      onResize();
    };
    this.wasRaw = process.stdin.isRaw || false;

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    process.stdin.on("data", onInput);
    process.stdout.on("resize", this.resizeHandler);

    // Enable mouse SGR mode
    this.write("\x1b[?1006h");
    this.hideCursor();

    // Register cleanup handlers for crash/exit scenarios
    this.cleanupBound = () => this.cleanup();
    process.on("exit", this.cleanupBound);
    process.on("SIGINT", this.cleanupBound);
    process.on("SIGTERM", this.cleanupBound);
    process.on("uncaughtException", (err) => {
      this.cleanup();
      console.error(err);
      process.exit(1);
    });
    process.on("unhandledRejection", (err) => {
      this.cleanup();
      console.error(err);
      process.exit(1);
    });
  }

  stop(): void {
    this.cleanup();
  }

  /**
   * Restore terminal state. Safe to call multiple times.
   */
  private cleanup(): void {
    if (this.stopped) return;
    this.stopped = true;

    // Disable mouse mode
    this.write("\x1b[?1006l");
    this.showCursor();

    if (this.resizeHandler) {
      process.stdout.removeListener("resize", this.resizeHandler);
    }
    if (this.inputHandler) {
      process.stdin.removeListener("data", this.inputHandler);
    }

    process.stdin.pause();
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(this.wasRaw);
    }

    // Remove process handlers
    if (this.cleanupBound) {
      process.removeListener("exit", this.cleanupBound);
      process.removeListener("SIGINT", this.cleanupBound);
      process.removeListener("SIGTERM", this.cleanupBound);
    }
  }

  hideCursor(): void {
    this.write("\x1b[?25l");
  }

  showCursor(): void {
    this.write("\x1b[?25h");
  }
}

/**
 * In-memory terminal for testing.
 *
 * Captures all written output into a buffer and allows setting
 * fixed dimensions. No real I/O.
 */
export class MockTerminal implements Terminal {
  /** All output written to the terminal. */
  output = "";
  private _columns: number;
  private _rows: number;
  private inputHandler?: (data: string) => void;
  private resizeHandler?: () => void;

  constructor(columns = 80, rows = 24) {
    this._columns = columns;
    this._rows = rows;
  }

  get columns(): number {
    return this._columns;
  }

  get rows(): number {
    return this._rows;
  }

  write(data: string): void {
    this.output += data;
  }

  start(onInput: (data: string) => void, onResize: () => void): void {
    this.inputHandler = onInput;
    this.resizeHandler = onResize;
  }

  stop(): void {
    this.inputHandler = undefined;
    this.resizeHandler = undefined;
  }

  hideCursor(): void {
    this.write("\x1b[?25l");
  }

  showCursor(): void {
    this.write("\x1b[?25h");
  }

  /** Simulate keyboard input. */
  sendInput(data: string): void {
    this.inputHandler?.(data);
  }

  /** Simulate terminal resize. */
  setSize(columns: number, rows: number): void {
    this._columns = columns;
    this._rows = rows;
    this.resizeHandler?.();
  }

  /** Clear captured output. */
  clearOutput(): void {
    this.output = "";
  }
}
