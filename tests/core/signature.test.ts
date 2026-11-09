import { describe, expect, it } from 'vitest';
import { candidates, chestReward, rollUpgrades } from '../../src/core/upgrades';
import { World } from '../../src/core/world';
import { CHARACTERS, CHARACTER_IDS, SIGNATURE_OWNER } from '../../src/data/characters';
import { EVOLUTIONS, EVOLVED_IDS } from '../../src/data/evolutions';
import { PASSIVE_IDS } from '../../src/data/upgrades';
import { WEAPON_IDS } from '../../src/data/weapons';

const offeredWeapons = (w: World) => candidates(w).flatMap((o) => (o.kind === 'weapon' ? [o.id] : []));

describe('signature weapons', () => {
  it('every hero has a different signature weapon that is not an evolved form', () => {
    const sigs = CHARACTER_IDS.map((id) => CHARACTERS[id].weapon);
    expect(new Set(sigs).size).toBe(sigs.length);
    for (const s of sigs) expect(EVOLVED_IDS).not.toContain(s);
  });

  it.each(CHARACTER_IDS)('%s is never offered another hero’s signature weapon', (hero) => {
    const w = new World(1, { character: hero });
    const offered = offeredWeapons(w);
    for (const id of offered) {
      const owner = SIGNATURE_OWNER[id];
      expect(owner === undefined || owner === hero).toBe(true);
    }
    // ...but still gets levels of its own.
    expect(offered).toContain(CHARACTERS[hero].weapon);
  });

  it('rolls and chests respect it too', () => {
    const w = new World(7, { character: 'lyra' });
    for (let i = 0; i < 200; i++)
      for (const o of rollUpgrades(w))
        if (o.kind === 'weapon') expect(SIGNATURE_OWNER[o.id] ?? 'lyra').toBe('lyra');
    for (let i = 0; i < 50; i++) {
      const r = chestReward(w);
      if (r.kind === 'weapon') expect(SIGNATURE_OWNER[r.id] ?? 'lyra').toBe('lyra');
    }
  });

  it('the shared pool is big enough to fill the weapon slots', () => {
    const shared = WEAPON_IDS.filter((id) => !EVOLUTIONS[id] && !SIGNATURE_OWNER[id]);
    expect(shared.length).toBeGreaterThanOrEqual(5);
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
