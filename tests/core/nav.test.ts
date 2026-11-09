import { describe, expect, it } from 'vitest';
import { isConfirm, navMove, navStep } from '../../src/render/ui';

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

  it('moves on the drawn grid, skipping disabled cards (Shop: A ok, B too dear, C and D ok)', () => {
    // A B / C D / Back (padded) — Back on a row of its own.
    const on = [true, false, true, true, true, false];
    expect(navMove(on, 2, 0, 2)).toBe(2); // A down -> C, not D
    expect(navMove(on, 2, 0, 1)).toBe(2); // A right skips B
    expect(navMove(on, 2, 3, 2)).toBe(4); // D down -> Back
    expect(navMove(on, 2, 4, -2)).toBe(2); // Back up -> C
    expect(navMove(on, 2, 4, 2)).toBe(0); // Back down wraps to A
    expect(navMove(on, 2, 0, -2)).toBe(4); // A up wraps to Back
    expect(navMove(on, 2, 3, -2)).toBe(0); // D up: B disabled -> nearest above (A)
    expect(navMove([true, true, true], 1, 2, 1)).toBe(0);
  });
});
