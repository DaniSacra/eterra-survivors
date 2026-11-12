import { it } from 'vitest';
import { maxLevel } from '../../src/core/weapons';
import { EVOLUTIONS, evolutionOf, weaponCategory } from '../../src/data/evolutions';
import { CATEGORY_BANDS, WEAPON_IDS, type WeaponId } from '../../src/data/weapons';
import { measureDps } from './measure';

/**
 * Weapon lab (balance tool, skipped by `npm test`): `npm run lab` prints each weapon's category and DPS at level 1,
 * max level and as its Elo, against one pinned dummy ("solo", a boss) and a dense frozen field ("crowd"), with the
 * crowd DPS at max level as a share of the best aimed weapon (and each Elo against the best aimed Elo).
 */
it.skipIf(!import.meta.env.LAB)('weapon lab', { timeout: 300_000 }, () => {
  const bases = WEAPON_IDS.filter((id) => !EVOLUTIONS[id]);
  type Row = {
    id: WeaponId;
    elo: WeaponId;
    l1: number;
    max: number;
    soloMax: number;
    eloCrowd: number;
    eloSolo: number;
    live: number;
    eloLive: number;
  };
  const rows: Row[] = bases.map((id) => {
    const elo = evolutionOf(id)?.id ?? id;
    return {
      id,
      elo,
      l1: measureDps(id, 1),
      max: measureDps(id, maxLevel(id)),
      soloMax: measureDps(id, maxLevel(id), true),
      eloCrowd: measureDps(elo, 1),
      eloSolo: measureDps(elo, 1, true),
      live: measureDps(id, maxLevel(id), false, 20, 1 / 60, true),
      eloLive: measureDps(elo, 1, false, 20, 1 / 60, true),
    };
  });
  const best = Math.max(...rows.filter((r) => weaponCategory(r.id) === 'aimed').map((r) => r.max));
  const bestElo = Math.max(...rows.filter((r) => weaponCategory(r.id) === 'aimed').map((r) => r.eloCrowd));
  const f = (x: number, n = 7) => x.toFixed(0).padStart(n);
  const out = [
    'cat    weapon          crowd L1   Lmax  solo Lmax   %best  band     | Elo            crowd  solo  %best  x base | live Lmax  live Elo  x base',
  ];
  for (const r of [...rows].sort(
    (a, b) => weaponCategory(a.id).localeCompare(weaponCategory(b.id)) || b.max - a.max,
  )) {
    const cat = weaponCategory(r.id);
    const [lo, hi] = CATEGORY_BANDS[cat];
    const share = r.max / best;
    const ok = share >= lo - 1e-9 && share <= hi + 1e-9 ? ' ' : '!';
    out.push(
      `${cat.padEnd(7)}${r.id.padEnd(16)}${f(r.l1, 8)}${f(r.max)}${f(r.soloMax, 11)}  ${f(share * 100, 5)}%${ok} ${Math.round(lo * 100)}-${Math.round(hi * 100)}%` +
        `  | ${r.elo.padEnd(15)}${f(r.eloCrowd, 6)}${f(r.eloSolo, 6)}${f((r.eloCrowd / bestElo) * 100, 6)}%  ${(r.eloCrowd / r.max).toFixed(1)}x` +
        ` | ${f(r.live, 9)}${f(r.eloLive, 9)}  ${(r.eloLive / r.live).toFixed(1)}x`,
    );
  }
  console.log('\nLAB\n' + out.join('\n'));
});
