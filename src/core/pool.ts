export interface Poolable {
  /** Index in `Pool.active`; maintained by the pool, -1 when free. */
  poolIndex: number;
}

/**
 * Generic object pool with a dense `active` array and O(1) swap-remove release.
 * Iterate `active` by index; never release while iterating forward (mark and sweep instead).
 */
export class Pool<T extends Poolable> {
  readonly active: T[] = [];
  private readonly free: T[] = [];

  constructor(
    private readonly create: () => T,
    preallocate = 0,
  ) {
    for (let i = 0; i < preallocate; i++) this.free.push(this.create());
  }

  get size(): number {
    return this.active.length;
  }

  /** Returns a free (or new) item; the caller must reset its fields. */
  acquire(): T {
    const item = this.free.pop() ?? this.create();
    item.poolIndex = this.active.length;
    this.active.push(item);
    return item;
  }

  release(item: T): void {
    const i = item.poolIndex;
    if (i < 0 || this.active[i] !== item) return;
    const last = this.active.pop() as T;
    if (last !== item) {
      this.active[i] = last;
      last.poolIndex = i;
    }
    item.poolIndex = -1;
    this.free.push(item);
  }

  /** Releases every active item matching `predicate`, iterating backwards so swaps are safe. */
  releaseWhere(predicate: (item: T) => boolean): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i] as T;
      if (predicate(item)) this.release(item);
    }
  }

  clear(): void {
    for (let i = this.active.length - 1; i >= 0; i--) this.release(this.active[i] as T);
  }
}
