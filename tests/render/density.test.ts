import { describe, expect, it } from 'vitest';
import { ASSETS, SPRITE_SCALE } from '../../src/render/assets';
import { ENEMY_ANIMS } from '../../src/render/enemyAnims';

/**
 * Pixel density: 1 art px = ART_RES texture px, shown at display scale 1. These Crypt crowd sprites were drawn
 * before the rule and still carry a fractional scale; the list may only shrink.
 */
const LEGACY_FRACTIONAL = [
  'enemy.skeleton',
  'enemy.emberBones',
  'enemy.ghost',
  'enemy.coldSpirit',
  'enemy.slime',
  'enemy.bonePile',
  'enemy.vampireBat',
];

describe('pixel density', () => {
  it('no pixel sprite has a fractional display scale, bar the legacy Crypt crowd', () => {
    for (const [key, k] of Object.entries(SPRITE_SCALE))
      if (!Number.isInteger(k)) expect(LEGACY_FRACTIONAL, key).toContain(key);
  });

  it('the legacy list only holds sprites that still have a fractional scale', () => {
    for (const key of LEGACY_FRACTIONAL) expect(SPRITE_SCALE[key], key).toBeDefined();
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
