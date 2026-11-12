import { spawnEnemy } from '../../src/core/enemies';
import { Rng } from '../../src/core/math';
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

/**
 * `live`: a living crowd instead of frozen dummies. `LIVE_COUNT` immortal basic enemies (`bones`) walk at the hero at
 * their own speed and take knockback (and come back); one that reaches the hero is put back on the ring
 * `LIVE_RING` px out, like a kill replaced by the spawner. So weapons that push, or that only hit what comes close,
 * are measured against a steady stream, and `reach` counts the enemies a swing really finds.
 */
export const LIVE_COUNT = 160;
export const LIVE_RING = 420;
export const LIVE_CONTACT = 26;

export function measureDps(
  id: WeaponId,
  level: number,
  solo = false,
  secs = 20,
  dt = 1 / 60,
  live = false,
): number {
  const w = new World(1, { character: 'aldo' });
  w.spawner.update = () => {};
  w.weapons.length = 0;
  w.addWeapon(id);
  w.weapons[0]!.level = level;
  const rng = new Rng(7);
  Object.assign(w.player.stats, { might: 1, area: 1, cooldown: 1, amount: 0 });
  w.player.stats.maxHp = w.player.hp = 1e9;
  const step = CROWD_SPACING;
  const span = 256;
  const ring = (e: { x: number; y: number }, near: number) => {
    const a = rng.next() * Math.PI * 2;
    const d = near + rng.next() * (LIVE_RING - near);
    e.x = Math.cos(a) * d;
    e.y = Math.sin(a) * d;
  };
  for (let x = -span; x <= span; x += step)
    for (let y = -span; y <= span; y += step) {
      if (live) break;
      if (Math.hypot(x, y) < 30) continue;
      if (solo && !(x === 64 && y === 0)) continue;
      // A fixed jitter, so a radius doesn't jump from one ring of the grid to the next.
      const j = solo ? 0 : step * 0.3;
      const e = spawnEnemy(
        w,
        live ? 'bones' : 'skeleton',
        x + (rng.next() - 0.5) * j,
        y + (rng.next() - 0.5) * j,
      );
      e.hp = e.maxHp = 1e9;
      if (!live) e.def = { ...e.def, knockbackResist: 1 };
    }
  if (live)
    for (let n = 0; n < LIVE_COUNT; n++) {
      const e = spawnEnemy(w, 'bones', 0, 0);
      e.hp = e.maxHp = 1e9;
      ring(e, 60);
    }
  const lv = WEAPONS[id].levels[level - 1] as { orbitRadius?: number };
  const pin = w.enemies.active[0]!;
  const steps = Math.round(secs / dt);
  for (let i = 0; i < steps; i++) {
    if (!live) w.freeze = 1e9;
    if (solo) {
      pin.x = lv.orbitRadius ?? 60;
      pin.y = 0;
    }
    w.step(dt, { x: 0, y: 0 });
    if (live)
      for (const e of w.enemies.active) if (Math.hypot(e.x, e.y) < LIVE_CONTACT) ring(e, LIVE_RING - 20);
    w.events.length = 0;
  }
  return w.weapons[0]!.damage / secs;
}
