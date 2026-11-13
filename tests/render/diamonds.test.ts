import { describe, expect, it } from 'vitest';
import { diamondGap, diamondSize } from '../../src/render/ui';

describe('diamondSize', () => {
  it('uses the spec sizes on a phone counter', () => {
    expect(diamondSize(1, 300)).toBe(18);
    expect(diamondSize(3, 300)).toBe(18);
    expect(diamondSize(5, 300)).toBe(16);
    expect(diamondSize(10, 300)).toBe(14);
  });
  it('shrinks to fit and falls back under 10 px', () => {
    expect(diamondSize(10, 136)).toBe(10);
    expect(diamondSize(10, 120)).toBe(0);
    expect(diamondSize(5, 40)).toBe(0);
  });
  it('gaps by level count', () => {
    expect([diamondGap(2), diamondGap(5), diamondGap(10)]).toEqual([6, 5, 4]);
  });
});
