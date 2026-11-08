import { describe, expect, it } from 'vitest';
import { SpatialHash } from '../../src/core/spatialHash';

describe('SpatialHash', () => {
  it('finds nearby ids and skips far ones', () => {
    const h = new SpatialHash(32);
    h.insert(1, 10, 10);
    h.insert(2, 40, 10);
    h.insert(3, 500, 500);
    const out = h.query(20, 10, 30, []);
    expect(out.sort()).toEqual([1, 2]);
  });

  it('handles negative coordinates', () => {
    const h = new SpatialHash(32);
    h.insert(7, -100, -100);
    expect(h.query(-90, -90, 20, [])).toEqual([7]);
    expect(h.query(90, 90, 20, [])).toEqual([]);
  });

  it('clears between frames and reuses the out array', () => {
    const h = new SpatialHash(32);
    h.insert(1, 0, 0);
    h.clear();
    const out = [99];
    expect(h.query(0, 0, 10, out)).toBe(out);
    expect(out).toEqual([]);
  });
});
