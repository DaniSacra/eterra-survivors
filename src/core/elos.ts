import { MAX_ENEMY_RADIUS } from '../data/enemies';
import { WEAPONS, type WeaponDef } from '../data/weapons';
import { addBolt } from './effects';
import { damageEnemy, type Enemy } from './enemies';
import { heal, hurtPlayer } from './player';
import type { OwnedWeapon } from './weapons';
import type { World } from './world';
import type { Zone } from './zones';

/**
 * Elo effects that hang on kills and on the hero being hit (the rest live with their weapon kind in weapons.ts and
 * projectiles.ts). Nothing here queries the enemy hash mid-step: Nevasca's shatters are queued and burst in
 * `updateShatters`, after every weapon has fired.
 */

/** Pending shatters: x, y, radius, damage per entry, and who gets the credit. Reused, never shrunk. */
const SHATTER_STRIDE = 4;
/** At most this many shatters burst per step, so a chain reaction in a packed blizzard can't stall a frame. */
const MAX_SHATTERS = 48;

/** An enemy just died (`source`: the weapon that dealt the last blow, if any). */
export function onKill(world: World, e: Enemy, source: OwnedWeapon | null): void {
  if (source) {
    const def = WEAPONS[source.id] as WeaponDef;
    // Luz Sagrada: the light that kills heals, a few times a second at most.
    if (def.mend) {
      if (world.time - source.stackTime >= 1) {
        source.stackTime = world.time;
        source.stacks = 0;
      }
      if (source.stacks < def.mend.perSecond) {
        source.stacks++;
        const p = world.player;
        heal(p, def.mend.heal);
      }
    }
    // Procissão: one more soul walks along for a while.
    if (def.swell) {
      source.stacks = Math.min(def.swell.cap, source.stacks + 1);
      source.stackTime = world.time + def.swell.duration;
    }
  }
  // Nevasca: whoever dies inside its frost shatters.
  const zones = world.zones.active;
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i] as Zone;
    const shatter = z.source ? (WEAPONS[z.source.id] as WeaponDef).shatter : undefined;
    if (!shatter || (e.x - z.x) ** 2 + (e.y - z.y) ** 2 > z.radius * z.radius) continue;
    const q = world.shatters;
    q.push(e.x, e.y, shatter.radius * world.player.stats.area, z.damage * shatter.damage);
    world.shatterBy.push(z.source as OwnedWeapon);
    break;
  }
}

/** Bursts the queued shatters (each may kill and queue more, up to MAX_SHATTERS a step). */
export function updateShatters(world: World): void {
  const q = world.shatters;
  const list = world.enemies.active;
  let done = 0;
  for (let k = 0; k < q.length && done < MAX_SHATTERS; k += SHATTER_STRIDE, done++) {
    const x = q[k] as number;
    const y = q[k + 1] as number;
    const r = q[k + 2] as number;
    const damage = q[k + 3] as number;
    const by = world.shatterBy[k / SHATTER_STRIDE] as OwnedWeapon;
    addBolt(world, x, y, r, 'blizzard');
    const ids = world.enemyHash.query(x, y, r + MAX_ENEMY_RADIUS, world.scratch);
    for (let i = 0; i < ids.length; i++) {
      const e = list[ids[i] as number] as Enemy;
      if (e.dead) continue;
      const reach = r + e.def.radius;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy > reach * reach) continue;
      const d = Math.hypot(dx, dy) || 1;
      damageEnemy(world, e, damage, dx / d, dy / d, 60, by);
    }
  }
  q.length = 0;
  world.shatterBy.length = 0;
}

/**
 * The hero is hit by `attacker` for `amount`. Muralha de Valmor's guard, when ready, takes the hit and throws the
 * blow back at the attacker. Returns whether the hero took damage (as `hurtPlayer`).
 */
export function hurtHero(world: World, attacker: Enemy, amount: number): boolean {
  const p = world.player;
  if (p.iframes > 0 || p.hp <= 0) return false;
  const guard = wardReady(world);
  if (guard) {
    const def = WEAPONS[guard.id] as WeaponDef;
    const ward = def.ward as { every: number; damage: number };
    guard.stackTime = world.time + ward.every;
    p.iframes = Math.max(p.iframes, 0.3);
    const level = def.levels[guard.level - 1] as { damage: number; knockback?: number };
    const dx = attacker.x - p.x;
    const dy = attacker.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    damageEnemy(
      world,
      attacker,
      level.damage * ward.damage * p.stats.might,
      dx / d,
      dy / d,
      level.knockback ?? 0,
      guard,
    );
    world.events.push({ type: 'ward' });
    return false;
  }
  return hurtPlayer(p, amount);
}

/** The owned weapon whose guard is up right now (Muralha de Valmor), or null. */
export function wardReady(world: World): OwnedWeapon | null {
  for (let iW = 0; iW < world.weapons.length; iW++) {
    const w = world.weapons[iW] as (typeof world.weapons)[number];
    if ((WEAPONS[w.id] as WeaponDef).ward && w.stackTime <= world.time) return w;
  }
  return null;
}
