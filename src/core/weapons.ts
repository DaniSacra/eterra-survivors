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
  type SlamLevel,
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
  /** Seconds until a combo weapon's second blow or a slam's tremor (0 = none pending), and where it goes. */
  combo: number;
  comboAngle: number;
  comboX: number;
  comboY: number;
  /** Attacks made so far (a thrust or a Fúria wave comes every `every`). */
  swings: number;
  /** Seconds until a tremor's aftershock (Quebra-Junta; 0 = none pending), and where. */
  after: number;
  afterX: number;
  afterY: number;
  /** When the current level (or Elo) started, and `damage` at that moment: the damage per second at this level. */
  levelAt: number;
  levelDamage: number;
  /** Damage per second during the previous level (for an Elo: its base at max level). */
  prevDps: number;
}

/** Starts measuring a new level (call before changing `level` or `id`). */
export function markLevel(w: OwnedWeapon, time: number): void {
  w.prevDps = levelDps(w, time);
  w.levelAt = time;
  w.levelDamage = w.damage;
}

/** Damage per second since the current level started. */
export function levelDps(w: OwnedWeapon, time: number): number {
  const dt = time - w.levelAt;
  return dt > 0 ? (w.damage - w.levelDamage) / dt : 0;
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
  slam: fireSlam,
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
    if (w.combo > 0) {
      w.combo -= dt;
      if (w.combo <= 0) {
        w.combo = 0;
        tremor(world, weaponStats(w) as SlamLevel, w, w.comboX, w.comboY, 1);
      }
    }
    if (w.after > 0) {
      w.after -= dt;
      if (w.after <= 0) {
        w.after = 0;
        const scale = (WEAPONS[w.id] as WeaponDef).aftershock?.scale ?? 1;
        tremor(world, weaponStats(w) as SlamLevel, w, w.afterX, w.afterY, scale);
      }
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
  shot.blast = 0;
  shot.critChance = 0;
  shot.critMult = 1;
  shot.bounces = 0;
  shot.fuse = false;
  shot.hits.length = 0;
  shot.dead = false;
  return shot;
}

function fireArc(world: World, s: ArcLevel, w: OwnedWeapon): boolean {
  const p = world.player;
  const def = WEAPONS[w.id] as WeaponDef;
  const facing = Math.atan2(p.facing.y, p.facing.x);
  // Every few blows, a thrust instead: long, narrow and harder.
  const th = def.kind === 'arc' ? def.thrust : undefined;
  if (th && ++w.swings % th.every === 0) {
    THRUST.damage = s.damage * th.damage;
    THRUST.range = s.range * th.range;
    THRUST.arc = th.arc;
    THRUST.knockback = s.knockback;
    swingArc(world, THRUST, w, facing, true);
    return true;
  }
  for (let k = 0; k < s.swings; k++) swingArc(world, s, w, facing + k * Math.PI, k === 0);
  // Fúria: every few blows a cutting wave runs ahead, through everything in its way.
  const wave = def.kind === 'arc' ? def.wave : undefined;
  if (wave && ++w.swings % wave.every === 0) {
    const shot = launch(world, w, facing);
    shot.speed = wave.speed;
    shot.damage = dmg(world, s.damage) * wave.damage;
    shot.knockback = s.knockback;
    shot.radius = wave.radius * p.stats.area;
    shot.pierce = Number.MAX_SAFE_INTEGER;
    shot.ttl = wave.lifetime;
  }
  return true;
}

/** The level a thrust swings with (filled from the weapon's level and `thrust` on each one). */
const THRUST: ArcLevel = { damage: 0, cooldown: 0, range: 0, arc: 0, knockback: 0, swings: 1 };

/**
 * A slam: one fissure per `count`, fanned by `spread`, from the hero along where they face; the tremor follows
 * `combo` seconds later at the impact point (in front of the hero, where it stood).
 */
function fireSlam(world: World, s: SlamLevel, w: OwnedWeapon): boolean {
  const p = world.player;
  const def = WEAPONS[w.id] as WeaponDef;
  const facing = Math.atan2(p.facing.y, p.facing.x);
  const area = p.stats.area;
  const length = s.length * area;
  const half = (s.width * area) / 2;
  const hit = world.targetsScratch;
  hit.length = 0;
  // Fissures that cross (a fan, Quebra-Junta's branches) hit an enemy once.
  const once = s.count > 1 || !!def.branch;
  const damage = dmg(world, s.damage);
  world.numberBudget = config.effects.arcNumbers;
  for (let k = 0; k < s.count; k++) {
    const a = facing + (k - (s.count - 1) / 2) * s.spread;
    fissure(world, s, w, p.x, p.y, a, length, half, damage, once);
    // Quebra-Junta: at the tip the fissure branches out, a little shorter.
    const br = def.branch;
    if (!br) continue;
    const tx = p.x + Math.cos(a) * length;
    const ty = p.y + Math.sin(a) * length;
    for (let b = 0; b < br.count; b++) {
      const ba = a + (b - (br.count - 1) / 2) * br.angle * (br.count > 1 ? 2 / (br.count - 1) : 1);
      fissure(world, s, w, tx, ty, ba, length * br.length, half, damage, once);
    }
  }
  world.numberBudget = Infinity;
  if (def.combo) {
    const d = config.weapons.slamImpact * area;
    w.combo = def.combo;
    w.comboX = p.x + Math.cos(facing) * d;
    w.comboY = p.y + Math.sin(facing) * d;
    w.comboAngle = facing;
  }
  return true;
}

/** One fissure from (x, y) along `angle`: everything on it is hit, pushed along and stunned. */
function fissure(
  world: World,
  s: SlamLevel,
  w: OwnedWeapon,
  x: number,
  y: number,
  angle: number,
  length: number,
  half: number,
  damage: number,
  once: boolean,
): void {
  const list = world.enemies.active;
  const hit = world.targetsScratch;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const slash = world.slashes.acquire();
  slash.form = 'fissure';
  slash.x = x;
  slash.y = y;
  slash.angle = angle;
  slash.range = length;
  slash.width = half * 2;
  slash.arc = 0;
  slash.shock = 0;
  slash.weapon = w.id;
  slash.ttl = config.effects.fissureTtl;
  const mx = x + (ux * length) / 2;
  const my = y + (uy * length) / 2;
  const ids = world.enemyHash.query(mx, my, length / 2 + half + MAX_ENEMY_RADIUS, world.scratch);
  for (let i = 0; i < ids.length; i++) {
    const e = list[ids[i] as number] as Enemy;
    if (e.dead) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const along = dx * ux + dy * uy;
    const across = Math.abs(dx * -uy + dy * ux);
    const r = e.def.radius;
    if (along < -r || along > length + r || across > half + r) continue;
    if (once) {
      if (hit.includes(e.uid)) continue;
      hit.push(e.uid);
    }
    slamHit(world, e, s, damage, ux, uy, s.knockback, w);
  }
}

/**
 * The slam's tremor: a burst at the impact point, a fraction of the damage, stunning again. With an `aftershock`
 * (Quebra-Junta) the first tremor wakes one smaller tremor a moment later.
 */
function tremor(world: World, s: SlamLevel, w: OwnedWeapon, x: number, y: number, scale: number): void {
  const after = (WEAPONS[w.id] as WeaponDef).aftershock;
  if (after && scale === 1) {
    w.after = after.delay;
    w.afterX = x;
    w.afterY = y;
  }
  const r = s.tremorRadius * world.player.stats.area * scale;
  const slash = world.slashes.acquire();
  slash.form = 'tremor';
  slash.x = x;
  slash.y = y;
  slash.angle = w.comboAngle;
  slash.range = 0;
  slash.width = 0;
  slash.arc = 0;
  slash.shock = r;
  slash.weapon = w.id;
  slash.ttl = config.effects.tremorTtl;
  const list = world.enemies.active;
  const hit = dmg(world, s.damage) * s.tremor * scale;
  world.numberBudget = config.effects.arcNumbers;
  const ids = world.enemyHash.query(x, y, r + MAX_ENEMY_RADIUS, world.scratch);
  for (let i = 0; i < ids.length; i++) {
    const e = list[ids[i] as number] as Enemy;
    if (e.dead) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const reach = r + e.def.radius;
    if (dx * dx + dy * dy > reach * reach) continue;
    const d = Math.hypot(dx, dy) || 1;
    slamHit(world, e, s, hit, dx / d, dy / d, s.knockback * 0.5, w);
  }
  world.numberBudget = Infinity;
}

/** A slam's hit: damage, a push, and a stun (short on bosses). Quebra-Junta crushes the already stunned. */
function slamHit(
  world: World,
  e: Enemy,
  s: SlamLevel,
  amount: number,
  kx: number,
  ky: number,
  knockback: number,
  w: OwnedWeapon,
): void {
  const crush = (WEAPONS[w.id] as WeaponDef).crush;
  const hard = crush && e.stun > 0 ? amount * crush : amount;
  const stun = e.def.boss ? Math.min(s.stun, config.weapons.bossStun) : s.stun;
  if (e.stun < stun) e.stun = stun;
  damageEnemy(world, e, hard, kx, ky, knockback, w);
}

/**
 * One swing at `angle`. `touch`: enemies hugging the hero are hit even outside the cone (only on the first
 * swing, so a front-and-back slash hits a hugging enemy once).
 */
function swingArc(world: World, s: ArcLevel, w: OwnedWeapon, angle: number, touch: boolean): void {
  const p = world.player;
  const range = s.range * p.stats.area;
  const list = world.enemies.active;
  const slash = world.slashes.acquire();
  slash.form = 'swing';
  slash.angle = angle;
  slash.arc = s.arc;
  slash.range = range;
  slash.weapon = w.id;
  slash.shock = 0;
  slash.ttl = config.effects.slashTtl;
  world.numberBudget = config.effects.arcNumbers;
  const ids = world.enemyHash.query(p.x, p.y, range + MAX_ENEMY_RADIUS, world.scratch);
  for (let i = 0; i < ids.length; i++) {
    const e = list[ids[i] as number] as Enemy;
    if (e.dead || !inSwing(p.x, p.y, e, range, angle, s.arc, touch)) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
    damageEnemy(world, e, dmg(world, s.damage), (e.x - p.x) / d, (e.y - p.y) / d, s.knockback, w);
  }
  world.numberBudget = Infinity;
}

/** Whether enemy `e` is inside a swing from (x, y): within reach and inside the cone, or touching the hero. */
function inSwing(
  x: number,
  y: number,
  e: Enemy,
  range: number,
  angle: number,
  arc: number,
  touch: boolean,
): boolean {
  const dx = e.x - x;
  const dy = e.y - y;
  const d = Math.hypot(dx, dy);
  if (d > range + e.def.radius) return false;
  return (touch && d <= e.def.radius) || Math.abs(angleDiff(angle, Math.atan2(dy, dx))) <= arc / 2;
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
  const def = WEAPONS[w.id] as WeaponDef;
  const crit = def.kind === 'thrown' ? def.crit : undefined;
  const blast = (s.blast ?? 0) * p.stats.area;
  for (let i = 0; i < count; i++) {
    const offset = ring ? (i * TAU) / count : (i - (count - 1) / 2) * s.spread;
    const shot = launch(world, w, facing + offset);
    shot.speed = s.speed;
    shot.damage = dmg(world, s.damage);
    shot.knockback = s.knockback;
    shot.radius = s.radius * p.stats.area;
    shot.pierce = s.pierce;
    shot.ttl = s.lifetime;
    shot.blast = blast;
    shot.bounces = def.kind === 'thrown' ? (def.ricochet?.count ?? 0) : 0;
    if (crit) {
      shot.critChance = crit.chance;
      shot.critMult = crit.mult;
    }
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
    world.numberBudget = config.effects.strikeNumbers;
    for (let n = 0; n < ids.length; n++) {
      const e = list[ids[n] as number] as Enemy;
      const r = radius + e.def.radius;
      if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= r * r)
        damageEnemy(world, e, dmg(world, s.damage), 0, 0, 0, w);
    }
  }
  world.numberBudget = Infinity;
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
