import { config } from '../data/config';
import { EVOLUTIONS } from '../data/evolutions';
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
  type WeaponDef,
  type WeaponId,
  type WeaponKind,
  type ZoneLevel,
} from '../data/weapons';
import { isFaded } from './behaviours';
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

/** Evolved weapons (Elos), which the renderer draws in their own colors. */
export const isElo = (id: WeaponId): boolean => EVOLUTIONS[id] !== undefined;

export function weaponStats(w: OwnedWeapon): LevelsByKind[WeaponKind] {
  return WEAPONS[w.id].levels[w.level - 1] as LevelsByKind[WeaponKind];
}

/** Asset key of each weapon's projectile (render/assets.ts), precomputed so firing never builds strings. */
export const PROJECTILE_SPRITE = Object.fromEntries(WEAPON_IDS.map((id) => [id, `proj.${id}`])) as Record<
  WeaponId,
  string
>;

type Fire<K extends WeaponKind> = (world: World, s: LevelsByKind[K], w: OwnedWeapon) => boolean;

/**
 * Each kind's attack. Returns false when there was nothing to attack (retry soon instead of a full cooldown).
 * Orbit has none: its blades are always out (`sweepOrbit`).
 */
const FIRE: { [K in Exclude<WeaponKind, 'orbit'>]: Fire<K> } = {
  arc: fireArc,
  homing: fireHoming,
  aura: fireAura,
  thrown: fireThrown,
  zone: fireZone,
  strike: fireStrike,
};

export function updateWeapons(world: World, dt: number): void {
  const list = world.weapons;
  for (let slot = 0; slot < list.length; slot++) {
    const w = list[slot] as OwnedWeapon;
    const kind = WEAPONS[w.id].kind;
    // Orbit blades are always out: they test contact every frame, and the cooldown is the re-hit delay.
    if (kind === 'orbit') {
      sweepOrbit(world, weaponStats(w) as OrbitLevel, w, slot);
      continue;
    }
    w.timer -= dt;
    if (w.timer > 0) continue;
    const s = weaponStats(w);
    const fire = FIRE[kind] as Fire<WeaponKind>;
    const fired = fire(world, s, w);
    if (fired && kind !== 'aura') world.tally.attacks++;
    w.timer = fired ? s.cooldown * world.player.stats.cooldown : config.weapons.idleRetry;
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
    slash.weapon = w.id;
    slash.ttl = config.effects.slashTtl;
    for (let i = 0; i < ids.length; i++) {
      const e = list[ids[i] as number] as Enemy;
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > range + e.def.radius) continue;
      // Inside the cone, or touching Aldo (so enemies hugging him don't slip through). Only the first swing
      // counts the touch, so a front-and-back slash hits a hugging enemy once.
      const touching = k === 0 && d <= e.def.radius;
      if (!touching && Math.abs(angleDiff(angle, Math.atan2(dy, dx))) > s.arc / 2) continue;
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
  // Aimed weapons throw at the boss when it is on screen, else at the nearest enemy on screen; with nobody
  // around, where the hero faces.
  const t =
    (WEAPONS[w.id] as WeaponDef).aim === 'nearest'
      ? (bossOnScreen(world) ?? nearestEnemy(world, p.x, p.y, onScreen(world)))
      : null;
  const facing = t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.atan2(p.facing.y, p.facing.x);
  const count = amount(world, s.count);
  // A fan that covers the whole circle spreads evenly from the facing, so one knife always flies straight
  // ahead (an even count centred on the facing would leave a blind spot right in front).
  const ring = count * s.spread >= TAU - 1e-6;
  for (let i = 0; i < count; i++) {
    const offset = ring ? (i * TAU) / count : (i - (count - 1) / 2) * s.spread;
    const shot = launch(world, w, facing + offset);
    shot.speed = s.speed;
    shot.damage = dmg(world, s.damage);
    shot.knockback = s.knockback;
    shot.radius = s.radius * p.stats.area;
    shot.pierce = s.pierce;
    shot.ttl = s.lifetime;
  }
  return true;
}

function sweepOrbit(world: World, s: OrbitLevel, w: OwnedWeapon, slot: number): void {
  const p = world.player;
  const list = world.enemies.active;
  const count = amount(world, s.count);
  const orbitR = s.orbitRadius * p.stats.area;
  const hitR = s.radius * p.stats.area;
  const rehit = s.cooldown * p.stats.cooldown;
  for (let i = 0; i < count; i++) {
    const a = orbitAngle(world.time, s.spin, i, count);
    const bx = p.x + Math.cos(a) * orbitR;
    const by = p.y + Math.sin(a) * orbitR;
    const ids = world.enemyHash.query(bx, by, hitR + MAX_ENEMY_RADIUS, world.scratch);
    for (let n = 0; n < ids.length; n++) {
      const e = list[ids[n] as number] as Enemy;
      if (e.dead || isFaded(e) || (e.orbitReady[slot] as number) > world.time) continue;
      const r = hitR + e.def.radius;
      const dx = e.x - bx;
      const dy = e.y - by;
      if (dx * dx + dy * dy > r * r) continue;
      const ox = e.x - p.x;
      const oy = e.y - p.y;
      const d = Math.hypot(ox, oy) || 1;
      e.orbitReady[slot] = world.time + rehit;
      damageEnemy(world, e, dmg(world, s.damage), ox / d, oy / d, s.knockback, w);
    }
  }
}

function fireZone(world: World, s: ZoneLevel, w: OwnedWeapon): boolean {
  const targets = world.targetsScratch;
  targets.length = 0;
  const count = amount(world, s.count);
  const radius = s.radius * world.player.stats.area;
  for (let i = 0; i < count; i++) {
    // The first patch of each cast goes on the boss when it is on screen; the rest fall at random.
    const e =
      (i === 0 ? bossOnScreen(world) : null) ??
      randomEnemyNear(world, world.view.w / 2, world.view.h / 2, targets);
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
    // The first bolt of each volley strikes the boss when it is on screen, otherwise the nearest enemy (the one
    // that matters); the rest fall at random.
    const t =
      (i === 0
        ? (bossOnScreen(world) ?? nearestEnemy(world, world.player.x, world.player.y, onScreen(world)))
        : null) ?? randomEnemyNear(world, world.view.w / 2, world.view.h / 2, targets);
    if (!t) break;
    targets.push(t.uid);
    const x = t.x;
    const y = t.y;
    addBolt(world, x, y, radius, w.id);
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

/** A distance that always stays inside the visible area. */
const onScreen = (world: World): number => Math.min(world.view.w, world.view.h) / 2;

/** The boss while it is alive and inside the visible rectangle, else null. */
function bossOnScreen(world: World): Enemy | null {
  const b = world.boss;
  const p = world.player;
  if (!b || b.dead) return null;
  return Math.abs(b.x - p.x) <= world.view.w / 2 && Math.abs(b.y - p.y) <= world.view.h / 2 ? b : null;
}

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
