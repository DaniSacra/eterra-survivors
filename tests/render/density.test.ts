import { describe, expect, it } from 'vitest';
import { ASSETS, SPRITE_SCALE } from '../../src/render/assets';
import { ENEMY_ANIMS } from '../../src/render/enemyAnims';

describe('pixel density', () => {
  it('no pixel sprite has a fractional display scale (1 art px = ART_RES texture px, shown 1:1)', () => {
    for (const [key, k] of Object.entries(SPRITE_SCALE)) expect(Number.isInteger(k), key).toBe(true);
  });

  it('every animated enemy has its still and one strip per pose in the asset map', () => {
    for (const [sprite, a] of Object.entries(ENEMY_ANIMS)) {
      expect(ASSETS[sprite], sprite).toBeDefined();
      expect(ASSETS[`${sprite}.walk`], `${sprite}.walk`).toBeDefined();
      for (const pose of Object.keys(a.frames))
        expect(ASSETS[`${sprite}.${pose}`], `${sprite}.${pose}`).toBeDefined();
    }
  });
});
