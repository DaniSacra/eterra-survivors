import { describe, expect, it } from 'vitest';
import { firstFit } from '../../src/core/layout';

describe('firstFit', () => {
  it('takes the roomiest level that fits', () => {
    const sizes = [900, 700, 600, 500];
    expect(firstFit(4, 1000, (l) => sizes[l]!)).toBe(0);
    expect(firstFit(4, 650, (l) => sizes[l]!)).toBe(2);
  });
  it('falls back to the tightest level when none fits, without measuring it', () => {
    const seen: number[] = [];
    expect(firstFit(4, 100, (l) => (seen.push(l), 900))).toBe(3);
    expect(seen).toEqual([0, 1, 2]);
  });
});
