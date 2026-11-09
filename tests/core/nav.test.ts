import { describe, expect, it } from 'vitest';
import { gridCols, isConfirm, navMove, navNearest, navStep } from '../../src/render/ui';

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

  it('list screens add columns only when the rows would not fit and the cards stay wide enough', () => {
    expect(gridCols(14, 1000, 486, 44, 8, 2)).toBe(2); // desktop: 7 rows fit
    expect(gridCols(14, 820, 328, 44, 8, 2)).toBe(3); // phone lying down
    expect(gridCols(14, 420, 626, 44, 8, 1)).toBe(2); // phone standing: 14 rows don't fit
    expect(gridCols(12, 420, 300, 56, 8, 2)).toBe(2); // too narrow for a third column
  });

  it('free layouts move to the nearest button in the direction (Coleção: tabs, a grid, Back)', () => {
    // Two tabs on top, a 2 x 2 grid, Back centred at the bottom.
    const pts = [
      { x: 50, y: 0 },
      { x: 150, y: 0 },
      { x: 40, y: 100 },
      { x: 160, y: 100 },
      { x: 40, y: 200 },
      { x: 160, y: 200 },
      { x: 100, y: 300 },
    ];
    const on = pts.map(() => true);
    expect(navNearest(pts, on, 0, 1, 0)).toBe(1); // tab -> next tab
    expect(navNearest(pts, on, 1, 0, 1)).toBe(3); // right tab down -> right card
    expect(navNearest(pts, on, 4, 0, 1)).toBe(6); // card down -> Back
    expect(navNearest(pts, on, 6, 0, -1)).toBe(4); // Back up -> nearest card in the row above
    expect(navNearest(pts, on, 0, 0, -1)).toBe(0); // nothing above: stays
    on[3] = false;
    expect(navNearest(pts, on, 1, 0, 1)).toBe(5); // disabled skipped, keeping the column
  });
});
