import { it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { maxLevel } from '../../src/core/weapons';
import { World } from '../../src/core/world';
import { EVOLUTIONS } from '../../src/data/evolutions';
import { SIGNATURE_OWNER } from '../../src/data/characters';
import { WEAPONS, WEAPON_IDS, type WeaponId } from '../../src/data/weapons';

/**
 * Weapon lab (balance tool, skipped by `npm test`): `npm run lab` prints each weapon's DPS at level 1, max
 * level and as its Elo, against one pinned dummy ("solo", a boss) and against a dense frozen field ("crowd").
 * Dummies ignore knockback, so crowd numbers are an upper bound for weapons that push enemies away.
 */
/** DPS of one weapon against a field of frozen, unkillable dummies around a still hero. */
function dps(id: WeaponId, level: number, solo = false, secs = 20): number {
  const w = new World(1, { character: SIGNATURE_OWNER[id] ?? 'aldo' });
  w.spawner.update = () => {};
  w.weapons.length = 0;
  w.addWeapon(id);
  w.weapons[0]!.level = level;
  Object.assign(w.player.stats, { might: 1, area: 1, cooldown: 1, amount: 0 });
  w.player.stats.maxHp = w.player.hp = 1e9;
  for (let x = -260; x <= 260; x += 32)
    for (let y = -260; y <= 260; y += 32) {
      if (Math.hypot(x, y) < 30) continue;
      if (solo && !(x === 60 && y === -4)) continue;
      const e = spawnEnemy(w, 'skeleton', x, y);
      e.hp = e.maxHp = 1e9;
      e.def = { ...e.def, knockbackResist: 1 };
    }
  const lv = WEAPONS[id].levels[level - 1] as { orbitRadius?: number };
  const pin = w.enemies.active[0]!;
  w.freeze = 1e9;
  for (let i = 0; i < secs * 60; i++) {
    w.freeze = 1e9;
    if (solo) {
      pin.x = lv.orbitRadius ?? 60;
      pin.y = 0;
    }
    w.step(1 / 60, { x: 0, y: 0 });
    w.events.length = 0;
  }
  return w.weapons[0]!.damage / secs;
}

it.skipIf(!import.meta.env.LAB)('weapon lab', () => {
  const rows: string[] = [];
  for (const id of WEAPON_IDS) {
    if (EVOLUTIONS[id]) continue;
    const evo1 = WEAPON_IDS.find((e) => EVOLUTIONS[e]?.from === id)!;
    rows.push(
      `  solo ${id.padEnd(14)} L1 ${dps(id, 1, true).toFixed(1).padStart(7)}  Lmax ${dps(id, maxLevel(id), true).toFixed(1).padStart(7)}  Elo ${dps(evo1, 1, true).toFixed(1).padStart(8)}`,
    );
    const evo = WEAPON_IDS.find((e) => EVOLUTIONS[e]?.from === id)!;
    rows.push(
      `${(WEAPONS[id].kind + ' ').padEnd(7)} ${id.padEnd(14)} L1 ${dps(id, 1, false).toFixed(1).padStart(7)}  Lmax ${dps(id, maxLevel(id), false).toFixed(1).padStart(7)}  Elo(${evo}) ${dps(evo, 1, false).toFixed(1).padStart(8)}`,
    );
  }
  console.log('\nLAB\n' + rows.join('\n'));
});
