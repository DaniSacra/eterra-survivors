import { describe, expect, it } from 'vitest';
import { isConfirm, navStep } from '../../src/render/ui';

const key = (k: string, repeat = false) => ({ key: k, repeat }) as KeyboardEvent;

describe('menu keyboard navigation', () => {
  it('arrows and WASD move; vertical moves jump a row in grids', () => {
    expect(navStep(key('ArrowDown'))).toBe(1);
    expect(navStep(key('w'))).toBe(-1);
    expect(navStep(key('S'), 2)).toBe(2);
    expect(navStep(key('a'), 2)).toBe(-1);
    expect(navStep(key('ArrowRight'))).toBe(1);
    expect(navStep(key('x'))).toBe(0);
  });

  it('ignores held keys (auto-repeat), so a key held when dying does not spin the focus', () => {
    expect(navStep(key('d', true))).toBe(0);
    expect(isConfirm(key('Enter', true))).toBe(false);
    expect(isConfirm(key('Enter'))).toBe(true);
    expect(isConfirm(key(' '))).toBe(true);
  });
});
