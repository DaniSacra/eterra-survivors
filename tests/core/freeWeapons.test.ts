import { describe, expect, it } from 'vitest';
import { candidates } from '../../src/core/upgrades';
import { World } from '../../src/core/world';
import { CHARACTERS, CHARACTER_IDS } from '../../src/data/characters';
import { EVOLUTIONS, EVOLVED_IDS, weaponCategory } from '../../src/data/evolutions';
import { PASSIVE_IDS } from '../../src/data/upgrades';
import { WEAPON_IDS } from '../../src/data/weapons';

const offeredWeapons = (w: World) => candidates(w).flatMap((o) => (o.kind === 'weapon' ? [o.id] : []));

describe('weapons are free for every hero', () => {
  it('every hero starts with a different base weapon', () => {
    const starts = CHARACTER_IDS.map((id) => CHARACTERS[id].weapon);
    expect(new Set(starts).size).toBe(starts.length);
    for (const s of starts) expect(EVOLVED_IDS).not.toContain(s);
  });

  it.each(CHARACTER_IDS)('%s is offered every base weapon', (hero) => {
    const offered = offeredWeapons(new World(1, { character: hero }));
    expect(offered.sort()).toEqual(WEAPON_IDS.filter((id) => !EVOLUTIONS[id]).sort());
  });

  it('every weapon has a category, and an Elo shares its base’s', () => {
    for (const id of WEAPON_IDS) expect(['aimed', 'auto', 'area']).toContain(weaponCategory(id));
    for (const id of EVOLVED_IDS) expect(weaponCategory(id)).toBe(weaponCategory(EVOLUTIONS[id]!.from));
  });

  it('every passive is part of an Elo, and of two at most (recipes stay easy to remember)', () => {
    const used = EVOLVED_IDS.map((id) => EVOLUTIONS[id]?.passive);
    for (const p of PASSIVE_IDS) {
      const n = used.filter((u) => u === p).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(2);
    }
  });
});
