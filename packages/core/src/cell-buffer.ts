import type { Color } from "@cel-tui/types";

/**
 * A single terminal cell with character content and styling.
 *
 * Each cell represents one column in the terminal grid.
 * Wide characters (CJK, emoji) occupy two cells — the first cell
 * holds the character, the second is a continuation marker.
 */
export interface Cell {
  /** The grapheme cluster displayed in this cell. */
  char: string;
  /** Foreground color, or null for terminal default. */
  fgColor: Color | null;
  /** Background color, or null for terminal default. */
  bgColor: Color | null;
  /** Bold weight. */
  bold: boolean;
  /** Italic style. */
  italic: boolean;
  /** Underline decoration. */
  underline: boolean;
}

/**
 * The default empty cell — a space with no styling.
 * Used for cleared/uninitialized cells and transparency detection.
 */
export const EMPTY_CELL: Readonly<Cell> = {
  char: " ",
  fgColor: null,
  bgColor: null,
  bold: false,
  italic: false,
  underline: false,
};

function cellsEqual(a: Cell, b: Cell): boolean {
  return (
    a.char === b.char &&
    a.fgColor === b.fgColor &&
    a.bgColor === b.bgColor &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline
  );
}

/**
 * A 2D grid of styled terminal cells.
 *
 * The cell buffer is the core rendering target. The layout engine
 * computes rects, painting writes styled cells into those rects,
 * and the diff algorithm compares the current buffer against the
 * previous one to produce minimal terminal updates.
 *
 * Empty cells (matching {@link EMPTY_CELL}) are considered transparent
 * for layer compositing — higher layers overwrite lower layers only
 * where they have non-empty content.
 */
export class CellBuffer {
  private cells: Cell[];
  private _width: number;
  private _height: number;

  /**
   * Create a new cell buffer filled with empty cells.
   *
   * @param width - Buffer width in columns.
   * @param height - Buffer height in rows.
   */
  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this.cells = new Array(width * height);
    this.clearCells(0, this.cells.length);
  }

  /** Buffer width in columns. */
  get width(): number {
    return this._width;
  }

  /** Buffer height in rows. */
  get height(): number {
    return this._height;
  }

  /**
   * Get the cell at `(x, y)`.
   * Returns {@link EMPTY_CELL} for out-of-bounds coordinates.
   */
  get(x: number, y: number): Cell {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) {
      return EMPTY_CELL;
    }

    const cell = this.cells[y * this._width + x];
    if (cell === undefined) {
      throw new Error(`Missing cell at (${x}, ${y})`);
    }
    return cell;
  }

  /**
   * Set the cell at `(x, y)`.
   * Out-of-bounds writes are silently ignored.
   */
  set(x: number, y: number, cell: Cell): void {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return;
    this.cells[y * this._width + x] = cell;
  }

  /**
   * Check if the cell at `(x, y)` is empty (transparent).
   * A cell is empty if it matches {@link EMPTY_CELL} exactly.
   */
  isEmpty(x: number, y: number): boolean {
    return cellsEqual(this.get(x, y), EMPTY_CELL);
  }

  /** Reset all cells to {@link EMPTY_CELL}. */
  clear(): void {
    this.clearCells(0, this.cells.length);
  }

  /**
   * Fill a rectangular region with a cell value.
   * Coordinates are clipped to buffer bounds.
   *
   * @param x - Left column (inclusive).
   * @param y - Top row (inclusive).
   * @param w - Width in columns.
   * @param h - Height in rows.
   * @param cell - Cell value to fill with.
   */
  fill(x: number, y: number, w: number, h: number, cell: Cell): void {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this._width, x + w);
    const y1 = Math.min(this._height, y + h);
    for (let row = y0; row < y1; row++) {
      for (let col = x0; col < x1; col++) {
        this.cells[row * this._width + col] = cell;
      }
    }
  }

  /**
   * Resize the buffer. Existing content within the new bounds is preserved.
   * New cells are initialized to {@link EMPTY_CELL}.
   *
   * @param width - New width in columns.
   * @param height - New height in rows.
   */
  resize(width: number, height: number): void {
    const newCells = new Array<Cell>(width * height);
    // Fill with empty
    for (let i = 0; i < newCells.length; i++) {
      newCells[i] = { ...EMPTY_CELL };
    }
    // Copy existing content
    const copyW = Math.min(this._width, width);
    const copyH = Math.min(this._height, height);
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        newCells[y * width + x] = this.get(x, y);
      }
    }
    this.cells = newCells;
    this._width = width;
    this._height = height;
  }

  /**
   * Compare this buffer against another and return positions that differ.
   * Used for differential rendering — only changed cells need terminal updates.
   *
   * @param other - The buffer to compare against.
   * @returns Array of `{ x, y }` positions where cells differ.
   */
  diff(other: CellBuffer): { x: number; y: number }[] {
    const changes: { x: number; y: number }[] = [];
    const w = Math.min(this._width, other._width);
    const h = Math.min(this._height, other._height);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!cellsEqual(this.get(x, y), other.get(x, y))) {
          changes.push({ x, y });
        }
      }
    }
    return changes;
  }

  private clearCells(start: number, end: number): void {
    for (let i = start; i < end; i++) {
      this.cells[i] = { ...EMPTY_CELL };
    }
  }
}
