import { describe, expect, it } from 'vitest';
import { Pool } from '../../src/core/pool';

const make = () => ({ poolIndex: -1, v: 0 });

describe('Pool', () => {
  it('reuses released items', () => {
    const pool = new Pool(make);
    const a = pool.acquire();
    pool.release(a);
    expect(pool.acquire()).toBe(a);
  });

  it('keeps active dense and indices correct after swap-remove', () => {
    const pool = new Pool(make);
    const items = [pool.acquire(), pool.acquire(), pool.acquire()];
    pool.release(items[0]!);
    expect(pool.size).toBe(2);
    pool.active.forEach((it, i) => expect(it.poolIndex).toBe(i));
    expect(items[0]!.poolIndex).toBe(-1);
  });

  it('ignores double release', () => {
    const pool = new Pool(make);
    const a = pool.acquire();
    pool.acquire();
    pool.release(a);
    pool.release(a);
    expect(pool.size).toBe(1);
  });

  it('preallocates without activating', () => {
    let created = 0;
    const pool = new Pool(() => (created++, make()), 10);
    expect(created).toBe(10);
    expect(pool.size).toBe(0);
    pool.acquire();
    expect(created).toBe(10);
  });

  it('releases by predicate and clears', () => {
    const pool = new Pool(make);
    for (let i = 0; i < 6; i++) pool.acquire().v = i;
    pool.releaseWhere((it) => it.v % 2 === 0);
    expect(pool.active.map((it) => it.v).sort()).toEqual([1, 3, 5]);
    pool.clear();
    expect(pool.size).toBe(0);
  });
});
