import { describe, expect, it } from 'vitest';
import { maxLevel } from '../../src/core/weapons';
import { EVOLUTIONS, evolutionOf, weaponCategory } from '../../src/data/evolutions';
import { CATEGORY_BANDS, WEAPON_IDS, type WeaponId } from '../../src/data/weapons';
import { measureDps } from '../lab/measure';

/**
 * Strength bands (data/weapons.ts `CATEGORY_BANDS`): crowd DPS at max level against the best aimed weapon, and each
 * Elo against the best aimed Elo. The same measure as `npm run lab`.
 */
const crowd = (id: WeaponId, level: number) => measureDps(id, level);
const bases = WEAPON_IDS.filter((id) => !EVOLUTIONS[id]);
const base = new Map(bases.map((id) => [id, crowd(id, maxLevel(id))]));
const elo = new Map(bases.map((id) => [id, crowd(evolutionOf(id)!.id, 1)]));
const bestOf = (m: Map<WeaponId, number>) =>
  Math.max(...bases.filter((id) => weaponCategory(id) === 'aimed').map((id) => m.get(id)!));

describe('weapon strength bands', () => {
  it.each(bases)('%s at max level sits in its category band', (id) => {
    const [lo, hi] = CATEGORY_BANDS[weaponCategory(id)];
    const share = base.get(id)! / bestOf(base);
    expect(share).toBeGreaterThanOrEqual(lo - 0.005);
    expect(share).toBeLessThanOrEqual(hi + 0.005);
  });

  it.each(bases)('the Elo of %s sits in the band and beats its base 2.5x', (id) => {
    const [lo, hi] = CATEGORY_BANDS[weaponCategory(id)];
    const share = elo.get(id)! / bestOf(elo);
    expect(share).toBeGreaterThanOrEqual(lo - 0.005);
    expect(share).toBeLessThanOrEqual(hi + 0.005);
    expect(elo.get(id)! / base.get(id)!).toBeGreaterThanOrEqual(2.5);
  });
});
