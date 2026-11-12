import { describe, expect, it } from 'vitest';
import { ENEMIES, ENEMY_IDS } from '../../src/data/enemies';
import { ENEMY_ANIMS } from '../../src/render/enemyAnims';
import { showScale, showSize } from '../../src/render/showScale';

const BOX = { w: 300, h: 200 };

/** Frame size in art px, from the animation table (enemies without one are skipped). */
const sized = ENEMY_IDS.flatMap((id) => {
  const a = ENEMY_ANIMS[ENEMIES[id].sprite];
  return a ? [{ id, w: a.w / 2, h: a.h / 2 }] : [];
});

describe('Bestiário showcase scale', () => {
  it('shows a larger enemy larger than a smaller one, never out of order', () => {
    const shown = sized
      .map((e) => ({
        ...e,
        size: showSize(e.w, e.h),
        shown: showScale(e.w, e.h, BOX.w, BOX.h) * showSize(e.w, e.h),
      }))
      .sort((a, b) => a.size - b.size);
    for (let i = 1; i < shown.length; i++) {
      const a = shown[i - 1]!;
      const b = shown[i]!;
      // Same size may show alike; a larger one never shows smaller by more than a half step of the smaller scale.
      if (b.size > a.size + 8) expect(b.shown, `${b.id} vs ${a.id}`).toBeGreaterThanOrEqual(a.shown);
    }
  });

  it('keeps every enemy inside the box and at least at the field scale', () => {
    for (const e of sized) {
      const k = showScale(e.w, e.h, BOX.w, BOX.h);
      expect(k).toBeGreaterThanOrEqual(1);
      expect(e.h * k).toBeLessThanOrEqual(BOX.h * 0.78 + e.h); // never a whole extra frame over
    }
  });
});
