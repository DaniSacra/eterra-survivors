import { config } from '../data/config';
import { MAX_ENEMY_RADIUS } from '../data/enemies';
import {
  WEAPONS,
  type ArcLevel,
  type AuraLevel,
  type HomingLevel,
  type LevelsByKind,
  type WeaponId,
  type WeaponKind,
} from '../data/weapons';
import { damageEnemy, type Enemy } from './enemies';
import { angleDiff } from './math';
import { nearestEnemy } from './projectiles';
import type { World } from './world';

export interface OwnedWeapon {
  id: WeaponId;
  /** 1-based. */
  level: number;
  timer: number;
}

export const maxLevel = (id: WeaponId): number => WEAPONS[id].levels.length;

export function weaponStats(w: OwnedWeapon): LevelsByKind[WeaponKind] {
  return WEAPONS[w.id].levels[w.level - 1] as LevelsByKind[WeaponKind];
}

/** Each kind's attack. Returns false when there was nothing to attack (retry soon instead of a full cooldown). */
const FIRE: { [K in WeaponKind]: (world: World, s: LevelsByKind[K]) => boolean } = {
  arc: fireArc,
  homing: fireHoming,
  aura: fireAura,
};

export function updateWeapons(world: World, dt: number): void {
  for (const w of world.weapons) {
    w.timer -= dt;
    if (w.timer > 0) continue;
    const s = weaponStats(w);
    const fire = FIRE[WEAPONS[w.id].kind] as (world: World, s: LevelsByKind[WeaponKind]) => boolean;
    w.timer = fire(world, s) ? s.cooldown * world.player.stats.cooldown : config.weapons.idleRetry;
  }
}

const dmg = (world: World, base: number): number => base * world.player.stats.might;

function fireArc(world: World, s: ArcLevel): boolean {
  const p = world.player;
  const range = s.range * p.stats.area;
  const facing = Math.atan2(p.facing.y, p.facing.x);
  const list = world.enemies.active;
  const ids = world.enemyHash.query(p.x, p.y, range + MAX_ENEMY_RADIUS, world.scratch);
  for (let k = 0; k < s.swings; k++) {
    const angle = facing + k * Math.PI;
    const slash = world.slashes.acquire();
    slash.angle = angle;
    slash.arc = s.arc;
    slash.range = range;
    slash.ttl = config.effects.slashTtl;
    for (let i = 0; i < ids.length; i++) {
      const e = list[ids[i] as number] as Enemy;
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > range + e.def.radius) continue;
      // Inside the cone, or touching Aldo (so enemies hugging him don't slip through).
      if (d > e.def.radius && Math.abs(angleDiff(angle, Math.atan2(dy, dx))) > s.arc / 2) continue;
      damageEnemy(world, e, dmg(world, s.damage), dx / (d || 1), dy / (d || 1), s.knockback);
    }
  }
  return true;
}

function fireHoming(world: World, s: HomingLevel): boolean {
  const p = world.player;
  const targets = world.targetsScratch;
  targets.length = 0;
  let first: Enemy | null = null;
  for (let i = 0; i < s.count; i++) {
    // Distinct targets first; with fewer enemies than shots, the extras go to the nearest one.
    const t: Enemy | null = nearestEnemy(world, p.x, p.y, config.weapons.seekRange, targets) ?? first;
    if (!t) break;
    first ??= t;
    targets.push(t.uid);
    const shot = world.projectiles.acquire();
    shot.x = p.x;
    shot.y = p.y;
    shot.angle = Math.atan2(t.y - p.y, t.x - p.x) + (i - (s.count - 1) / 2) * 0.35;
    shot.speed = s.speed;
    shot.turnRate = s.turnRate;
    shot.damage = dmg(world, s.damage);
    shot.knockback = s.knockback;
    shot.radius = s.radius * p.stats.area;
    shot.pierce = s.pierce;
    shot.ttl = s.lifetime;
    shot.target = t;
    shot.targetUid = t.uid;
    shot.hits.length = 0;
    shot.dead = false;
  }
  return targets.length > 0;
}

function fireAura(world: World, s: AuraLevel): boolean {
  const p = world.player;
  const radius = s.radius * p.stats.area;
  const list = world.enemies.active;
  const ids = world.enemyHash.query(p.x, p.y, radius + MAX_ENEMY_RADIUS, world.scratch);
  for (let i = 0; i < ids.length; i++) {
    const e = list[ids[i] as number] as Enemy;
    if (e.dead) continue;
    const r = radius + e.def.radius * 0.5;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    if (dx * dx + dy * dy <= r * r) damageEnemy(world, e, dmg(world, s.damage));
  }
  return true;
}
