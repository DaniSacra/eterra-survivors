import { describe, expect, it } from 'vitest';
import { Rng, angleDiff, clamp, normalizeInto } from '../../src/core/math';

describe('math', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it('normalizes and keeps zero vectors at zero', () => {
    const v = { x: 0, y: 0 };
    expect(normalizeInto(v, 3, 4)).toBe(5);
    expect(v).toEqual({ x: 0.6, y: 0.8 });
    normalizeInto(v, 0, 0);
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it('computes the shortest angle difference', () => {
    expect(angleDiff(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(angleDiff(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2);
  });

  it('is deterministic per seed and stays in range', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) {
      const v = a.next();
      expect(v).toBe(b.next());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('respects weights', () => {
    const rng = new Rng(1);
    const items = [
      { id: 'a', weight: 0 },
      { id: 'b', weight: 1 },
    ];
    for (let i = 0; i < 50; i++) expect(rng.weighted(items).id).toBe('b');
  });

  it('shuffles without losing items', () => {
    const arr = [1, 2, 3, 4, 5];
    new Rng(3).shuffle(arr);
    expect([...arr].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
