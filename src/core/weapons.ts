import { config } from '../data/config';
import { MAX_ENEMY_RADIUS } from '../data/enemies';
import {
  WEAPONS,
  WEAPON_IDS,
  type ArcLevel,
  type AuraLevel,
  type HomingLevel,
  type LevelsByKind,
  type OrbitLevel,
  type StrikeLevel,
  type ThrownLevel,
  type WeaponId,
  type WeaponKind,
  type ZoneLevel,
} from '../data/weapons';
import { addBolt } from './effects';
import { damageEnemy, type Enemy } from './enemies';
import { TAU, angleDiff } from './math';
import { nearestEnemy, randomEnemyNear, type Projectile } from './projectiles';
import { addZone } from './zones';
import type { World } from './world';

export interface OwnedWeapon {
  id: WeaponId;
  /** 1-based. */
  level: number;
  timer: number;
  /** Total damage dealt this run (kept through evolution). */
  damage: number;
  /** Match time when it was picked up. */
  since: number;
}

export const maxLevel = (id: WeaponId): number => WEAPONS[id].levels.length;

export function weaponStats(w: OwnedWeapon): LevelsByKind[WeaponKind] {
  return WEAPONS[w.id].levels[w.level - 1] as LevelsByKind[WeaponKind];
}

/** Asset key of each weapon's projectile (render/assets.ts), precomputed so firing never builds strings. */
export const PROJECTILE_SPRITE = Object.fromEntries(WEAPON_IDS.map((id) => [id, `proj.${id}`])) as Record<
  WeaponId,
  string
>;

type Fire<K extends WeaponKind> = (world: World, s: LevelsByKind[K], w: OwnedWeapon) => boolean;

/** Each kind's attack. Returns false when there was nothing to attack (retry soon instead of a full cooldown). */
const FIRE: { [K in WeaponKind]: Fire<K> } = {
  arc: fireArc,
  homing: fireHoming,
  aura: fireAura,
  thrown: fireThrown,
  orbit: fireOrbit,
  zone: fireZone,
  strike: fireStrike,
};

export function updateWeapons(world: World, dt: number): void {
  for (const w of world.weapons) {
    w.timer -= dt;
    if (w.timer > 0) continue;
    const s = weaponStats(w);
    const fire = FIRE[WEAPONS[w.id].kind] as Fire<WeaponKind>;
    w.timer = fire(world, s, w) ? s.cooldown * world.player.stats.cooldown : config.weapons.idleRetry;
  }
}

const dmg = (world: World, base: number): number => base * world.player.stats.might;
/** Shots, blades, patches or bolts: the level's count plus the Mãos Ligeiras bonus. */
const amount = (world: World, base: number): number => base + world.player.stats.amount;

/** Angle of blade `i` of `count` of an orbit weapon at time `t` (shared with the renderer). */
export const orbitAngle = (t: number, spin: number, i: number, count: number): number =>
  t * spin + (i * TAU) / count;

function launch(world: World, w: OwnedWeapon, angle: number): Projectile {
  const p = world.player;
  const shot = world.projectiles.acquire();
  shot.x = p.x;
  shot.y = p.y;
  shot.angle = angle;
  shot.sprite = PROJECTILE_SPRITE[w.id];
  shot.source = w;
  shot.target = null;
  shot.targetUid = 0;
  shot.turnRate = 0;
  shot.hits.length = 0;
  shot.dead = false;
  return shot;
}

function fireArc(world: World, s: ArcLevel, w: OwnedWeapon): boolean {
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
      damageEnemy(world, e, dmg(world, s.damage), dx / (d || 1), dy / (d || 1), s.knockback, w);
    }
  }
  return true;
}

function fireHoming(world: World, s: HomingLevel, w: OwnedWeapon): boolean {
  const p = world.player;
  const targets = world.targetsScratch;
  targets.length = 0;
  let first: Enemy | null = null;
  const count = amount(world, s.count);
  for (let i = 0; i < count; i++) {
    // Distinct targets first; with fewer enemies than shots, the extras go to the nearest one.
    const t: Enemy | null = nearestEnemy(world, p.x, p.y, config.weapons.seekRange, targets) ?? first;
    if (!t) break;
    first ??= t;
    targets.push(t.uid);
    const shot = launch(world, w, Math.atan2(t.y - p.y, t.x - p.x) + (i - (count - 1) / 2) * 0.35);
    shot.speed = s.speed;
    shot.turnRate = s.turnRate;
    shot.damage = dmg(world, s.damage);
    shot.knockback = s.knockback;
    shot.radius = s.radius * p.stats.area;
    shot.pierce = s.pierce;
    shot.ttl = s.lifetime;
    shot.target = t;
    shot.targetUid = t.uid;
  }
  return targets.length > 0;
}

function fireThrown(world: World, s: ThrownLevel, w: OwnedWeapon): boolean {
  const p = world.player;
  const facing = Math.atan2(p.facing.y, p.facing.x);
  const count = amount(world, s.count);
  for (let i = 0; i < count; i++) {
    const shot = launch(world, w, facing + (i - (count - 1) / 2) * s.spread);
    shot.speed = s.speed;
    shot.damage = dmg(world, s.damage);
    shot.knockback = s.knockback;
    shot.radius = s.radius * p.stats.area;
    shot.pierce = s.pierce;
    shot.ttl = s.lifetime;
  }
  return true;
}

function fireOrbit(world: World, s: OrbitLevel, w: OwnedWeapon): boolean {
  const p = world.player;
  const list = world.enemies.active;
  const count = amount(world, s.count);
  const orbitR = s.orbitRadius * p.stats.area;
  const hitR = s.radius * p.stats.area;
  for (let i = 0; i < count; i++) {
    const a = orbitAngle(world.time, s.spin, i, count);
    const bx = p.x + Math.cos(a) * orbitR;
    const by = p.y + Math.sin(a) * orbitR;
    const ids = world.enemyHash.query(bx, by, hitR + MAX_ENEMY_RADIUS, world.scratch);
    for (let n = 0; n < ids.length; n++) {
      const e = list[ids[n] as number] as Enemy;
      if (e.dead) continue;
      const r = hitR + e.def.radius;
      const dx = e.x - bx;
      const dy = e.y - by;
      if (dx * dx + dy * dy > r * r) continue;
      const ox = e.x - p.x;
      const oy = e.y - p.y;
      const d = Math.hypot(ox, oy) || 1;
      damageEnemy(world, e, dmg(world, s.damage), ox / d, oy / d, s.knockback, w);
    }
  }
  return true;
}

function fireZone(world: World, s: ZoneLevel, w: OwnedWeapon): boolean {
  const targets = world.targetsScratch;
  targets.length = 0;
  const count = amount(world, s.count);
  const radius = s.radius * world.player.stats.area;
  for (let i = 0; i < count; i++) {
    const e = randomEnemyNear(world, viewReach(world), targets);
    if (!e) break;
    targets.push(e.uid);
    addZone(world, e.x, e.y, radius, s.duration, dmg(world, s.damage), w);
  }
  return targets.length > 0;
}

function fireStrike(world: World, s: StrikeLevel, w: OwnedWeapon): boolean {
  const list = world.enemies.active;
  const targets = world.targetsScratch;
  targets.length = 0;
  const count = amount(world, s.count);
  const radius = s.radius * world.player.stats.area;
  for (let i = 0; i < count; i++) {
    const t = randomEnemyNear(world, viewReach(world), targets);
    if (!t) break;
    targets.push(t.uid);
    const x = t.x;
    const y = t.y;
    addBolt(world, x, y, radius);
    const ids = world.enemyHash.query(x, y, radius + MAX_ENEMY_RADIUS, world.scratch);
    for (let n = 0; n < ids.length; n++) {
      const e = list[ids[n] as number] as Enemy;
      const r = radius + e.def.radius;
      if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= r * r)
        damageEnemy(world, e, dmg(world, s.damage), 0, 0, 0, w);
    }
  }
  return targets.length > 0;
}

/** Random-target weapons only pick enemies roughly on screen. */
const viewReach = (world: World): number => Math.max(world.view.w, world.view.h) / 2;

function fireAura(world: World, s: AuraLevel, w: OwnedWeapon): boolean {
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
    if (dx * dx + dy * dy <= r * r) damageEnemy(world, e, dmg(world, s.damage), 0, 0, 0, w);
  }
  return true;
}
