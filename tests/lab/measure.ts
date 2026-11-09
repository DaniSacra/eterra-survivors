import { spawnEnemy } from '../../src/core/enemies';
import { World } from '../../src/core/world';
import { WEAPONS, type WeaponId } from '../../src/data/weapons';

/**
 * Weapon DPS against frozen, unkillable dummies around a still hero (the lab, and the strength-band test).
 * `solo`: one pinned dummy (a boss); otherwise a dense field ("crowd"). Dummies ignore knockback, so crowd numbers
 * are an upper bound for weapons that push enemies away. Aimed weapons fire where the hero faces: to the right.
 */
/**
 * Grid step of the crowd, px: about two enemy widths, a busy mid-run screen. A denser field would only measure how
 * many enemies a swing can cover, flattering wide weapons far beyond what they meet in a real run.
 */
export const CROWD_SPACING = 64;

export function measureDps(id: WeaponId, level: number, solo = false, secs = 20, dt = 1 / 60): number {
  const w = new World(1, { character: 'aldo' });
  w.spawner.update = () => {};
  w.weapons.length = 0;
  w.addWeapon(id);
  w.weapons[0]!.level = level;
  Object.assign(w.player.stats, { might: 1, area: 1, cooldown: 1, amount: 0 });
  w.player.stats.maxHp = w.player.hp = 1e9;
  for (let x = -256; x <= 256; x += CROWD_SPACING)
    for (let y = -256; y <= 256; y += CROWD_SPACING) {
      if (Math.hypot(x, y) < 30) continue;
      if (solo && !(x === 64 && y === 0)) continue;
      const e = spawnEnemy(w, 'skeleton', x, y);
      e.hp = e.maxHp = 1e9;
      e.def = { ...e.def, knockbackResist: 1 };
    }
  const lv = WEAPONS[id].levels[level - 1] as { orbitRadius?: number };
  const pin = w.enemies.active[0]!;
  const steps = Math.round(secs / dt);
  for (let i = 0; i < steps; i++) {
    w.freeze = 1e9;
    if (solo) {
      pin.x = lv.orbitRadius ?? 60;
      pin.y = 0;
    }
    w.step(dt, { x: 0, y: 0 });
    w.events.length = 0;
  }
  return w.weapons[0]!.damage / secs;
}
