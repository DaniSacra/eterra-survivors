/**
 * Uniform grid keyed by cell coordinates. Stores numeric ids (indices into a pool's active array).
 * Rebuild once per step: `clear()` then `insert()` everything. Cell arrays are reused between frames.
 */
export class SpatialHash {
  private readonly cells = new Map<number, number[]>();
  private readonly used: number[][] = [];
  private readonly inv: number;

  constructor(readonly cellSize: number) {
    this.inv = 1 / cellSize;
  }

  private static key(cx: number, cy: number): number {
    return ((cx + 32768) & 0xffff) * 65536 + ((cy + 32768) & 0xffff);
  }

  clear(): void {
    for (const c of this.used) c.length = 0;
    this.used.length = 0;
    // The world is infinite: drop stale empty cells now and then so the map doesn't grow forever.
    if (this.cells.size > 4096) this.cells.clear();
  }

  insert(id: number, x: number, y: number): void {
    const k = SpatialHash.key(Math.floor(x * this.inv), Math.floor(y * this.inv));
    let cell = this.cells.get(k);
    if (!cell) {
      cell = [];
      this.cells.set(k, cell);
    }
    if (cell.length === 0) this.used.push(cell);
    cell.push(id);
  }

  /** Fills `out` with ids in cells overlapping the square (x±r, y±r). Callers do the exact distance test. */
  query(x: number, y: number, r: number, out: number[]): number[] {
    out.length = 0;
    const x0 = Math.floor((x - r) * this.inv);
    const x1 = Math.floor((x + r) * this.inv);
    const y0 = Math.floor((y - r) * this.inv);
    const y1 = Math.floor((y + r) * this.inv);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const cell = this.cells.get(SpatialHash.key(cx, cy));
        if (cell) for (let i = 0; i < cell.length; i++) out.push(cell[i] as number);
      }
    }
    return out;
  }
}
