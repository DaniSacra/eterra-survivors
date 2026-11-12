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
import { addBolt, addLink } from './effects';
import { damageEnemy, isUntouchable, type Enemy } from './enemies';
import { TAU, angleDiff } from './math';
import { nearestEnemy, nearestVisible, randomEnemyNear, type Projectile } from './projectiles';
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
  /**
   * Attacks made so far, for the verbs that come every n-th attack: a Fúria wave, a mace's shock wave, Chama de Yah's
   * pulse. Each weapon has at most one of them, so they never share the count.
   */
  swings: number;
  /** Seconds until a shock wave's aftershock (Quebra-Junta; 0 = none pending), and where. */
  after: number;
  afterX: number;
  afterY: number;
  /**
   * Elo counters: Procissão's extra wisps (until `stackTime`), Luz Sagrada's heals this second (since
   * `stackTime`), Muralha de Valmor's guard (ready at `stackTime`).
   */
  stacks: number;
  stackTime: number;
  /** Vigília: the direction of the nearest enemy, where the swords dart out, and how far past the circle. */
  aim: number;
  aimReach: number;
  /** Aura de Yah: seconds left of the active window (0 = off) and until its next tick. */
  burst: number;
  burstTick: number;
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
    if (w.after > 0) {
      w.after -= dt;
      if (w.after <= 0) {
        w.after = 0;
        const scale = (WEAPONS[w.id] as WeaponDef).aftershock?.scale ?? 1;
        shockWave(world, weaponStats(w) as SlamLevel, w, w.afterX, w.afterY, 0, scale);
      }
    }
    if (w.burst > 0) {
      if ((WEAPONS[w.id] as WeaponDef).burst) runBurst(world, w, dt);
      else w.burst = 0;
    }
    w.timer -= world.haste > 0 ? dt / config.pickups.elixirCooldown : dt;
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

/**
 * Distance from the hero of an orbit blade at angle `a` (shared with the renderer): the orbit radius, except
 * Vigília's swords, which dart out and back as they pass the direction of the nearest enemy (`w.aim`), furthest
 * right on it.
 */
export function bladeRadius(w: OwnedWeapon, a: number, orbitR: number): number {
  const def = WEAPONS[w.id] as WeaponDef;
  const dart = def.dart;
  if (!dart || w.aimReach <= 0) return orbitR;
  // How far from the aim the blade is, in turns (-0.5..0.5).
  let d = (a - w.aim) / TAU;
  d -= Math.round(d);
  const half = dart.window / 2;
  return d > -half && d < half ? orbitR + w.aimReach * Math.cos((Math.PI * d) / dart.window) : orbitR;
}

/** Angle of blade `i` of `count` of an orbit weapon at time `t` (shared with the renderer). */
export const orbitAngle = (t: number, spin: number, i: number, count: number): number =>
  t * spin + (i * TAU) / count;

function launch(world: World, w: OwnedWeapon, angle: number): Projectile {
  const p = world.player;
  const shot = world.projectiles.acquire();
  shot.x = p.x;
  shot.y = p.y;
  shot.fromX = p.x;
  shot.fromY = p.y;
  shot.turnAt = -1e9;
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
  shot.back = 0;
  shot.home = false;
  shot.curve = 0;
  shot.hits.length = 0;
  shot.dead = false;
  return shot;
}

function fireArc(world: World, s: ArcLevel, w: OwnedWeapon): boolean {
  const p = world.player;
  const def = WEAPONS[w.id] as WeaponDef;
  const facing = Math.atan2(p.facing.y, p.facing.x);
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

/**
 * A slam: the mace comes down in front of the hero. Everything within `radius` of the impact point is hit, pushed
 * out a little and stunned; every `wave.every`-th blow a shock wave also runs out to `waveRadius`, hitting and
 * throwing everything back. Quebra-Junta: the wave on every blow, an aftershock and the stunned crushed.
 */
function fireSlam(world: World, s: SlamLevel, w: OwnedWeapon): boolean {
  const p = world.player;
  const def = WEAPONS[w.id] as WeaponDef;
  const facing = Math.atan2(p.facing.y, p.facing.x);
  const area = p.stats.area;
  const r = s.radius * area;
  // The impact point: in front, so the blow covers the hero's front half and a little behind.
  const x = p.x + Math.cos(facing) * r * SMASH_AHEAD;
  const y = p.y + Math.sin(facing) * r * SMASH_AHEAD;
  // The wave goes first, so it (like the blow) only crushes what was stunned before this blow: the aftershock is
  // what crushes the enemies this blow stuns.
  const every = def.kind === 'slam' ? (def.waveEvery ?? 0) : 0;
  const wave = every > 0 && ++w.swings % every === 0;
  if (wave) shockWave(world, s, w, x, y, facing, 1);
  smash(world, s, w, x, y, facing, r, dmg(world, s.damage), 'smash', s.knockback, wave);
  return true;
}

/** How far ahead of the hero the impact lands, in radii. */
const SMASH_AHEAD = 0.55;

/**
 * The shock wave of a slam (x`scale` of its size and damage, for an aftershock). With an `aftershock`
 * (Quebra-Junta) the full wave wakes a smaller one `delay` s later.
 */
function shockWave(
  world: World,
  s: SlamLevel,
  w: OwnedWeapon,
  x: number,
  y: number,
  angle: number,
  scale: number,
): void {
  const after = (WEAPONS[w.id] as WeaponDef).aftershock;
  if (after && scale === 1) {
    w.after = after.delay;
    w.afterX = x;
    w.afterY = y;
  }
  const r = s.waveRadius * world.player.stats.area * scale;
  smash(
    world,
    s,
    w,
    x,
    y,
    angle,
    r,
    dmg(world, s.damage) * s.wave * scale,
    'shock',
    s.waveKnockback,
    false,
    scale < 1,
  );
}

/**
 * Hits and pushes out from (x, y) everything within `r`, and leaves the `form` mark on the ground. Only the blow
 * itself (`smash`) stuns: the waves hit and push, so a slam can't hold a whole crowd in place.
 */
function smash(
  world: World,
  s: SlamLevel,
  w: OwnedWeapon,
  x: number,
  y: number,
  angle: number,
  r: number,
  damage: number,
  form: 'smash' | 'shock',
  knockback: number,
  wave = false,
  echo = false,
): void {
  const slash = world.slashes.acquire();
  slash.form = form;
  slash.wave = wave;
  slash.echo = echo;
  slash.x = x;
  slash.y = y;
  slash.angle = angle;
  slash.range = 0;
  slash.width = 0;
  slash.arc = 0;
  slash.shock = r;
  slash.weapon = w.id;
  slash.ttl = form === 'smash' ? config.effects.smashTtl : config.effects.shockTtl;
  const list = world.enemies.active;
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
    slamHit(world, e, s, damage, dx / d, dy / d, knockback, w, form === 'smash');
  }
  world.numberBudget = Infinity;
}

/**
 * A slam's hit: damage, a push and, from the blow (`stuns`), a stun (short on bosses). A stun running is never
 * renewed, so an enemy always gets to move again between stuns. Quebra-Junta crushes the already stunned.
 */
function slamHit(
  world: World,
  e: Enemy,
  s: SlamLevel,
  amount: number,
  kx: number,
  ky: number,
  knockback: number,
  w: OwnedWeapon,
  stuns: boolean,
): void {
  const crush = (WEAPONS[w.id] as WeaponDef).crush;
  const hard = crush && e.stun > 0 ? amount * crush : amount;
  if (stuns && e.stun <= 0 && !isUntouchable(e))
    e.stun = e.def.boss ? Math.min(s.stun, config.weapons.bossStun) : s.stun;
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
  slash.wave = false;
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
  // Procissão: the souls of the last kills walk along for a while.
  const swell = (WEAPONS[w.id] as WeaponDef).swell;
  if (swell && w.stackTime <= world.time) w.stacks = 0;
  const count = amount(world, s.count) + (swell ? w.stacks : 0);
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
    (WEAPONS[w.id] as WeaponDef).aim === 'nearest' ? (bossOnScreen(world) ?? nearestVisible(world)) : null;
  const facing = t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.atan2(p.facing.y, p.facing.x);
  const count = amount(world, s.count);
  const loop = (WEAPONS[w.id] as WeaponDef).loop;
  if (loop) {
    fireLoop(world, s, w, loop, t ? Math.hypot(t.x - p.x, t.y - p.y) : 0, facing, count);
    return true;
  }
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
    if (def.boomerang) shot.back = s.lifetime / 2;
    if (crit) {
      shot.critChance = crit.chance;
      shot.critMult = crit.mult;
    }
  }
  return true;
}

/**
 * Escudos de Valmor: each shield flies a circle through the hero and the far point (the target), on a random side
 * and with a random size, so no two throws draw the same boomerang. A circle of radius R takes 2 PI R / speed.
 */
function fireLoop(
  world: World,
  s: ThrownLevel,
  w: OwnedWeapon,
  loop: { minRadius: number; maxRadius: number },
  distance: number,
  facing: number,
  count: number,
): void {
  const p = world.player;
  const area = p.stats.area;
  for (let i = 0; i < count; i++) {
    const side = world.rng.next() < 0.5 ? -1 : 1;
    const base = distance > 0 ? distance / 2 : (loop.minRadius + loop.maxRadius) / 2;
    const r =
      Math.min(loop.maxRadius, Math.max(loop.minRadius, base)) * (0.85 + world.rng.next() * 0.3) * area;
    // A volley fans out around the target; one that covers the circle (the Muralha) goes out on every side.
    const ring = count * s.spread >= TAU - 1e-6;
    const aim = facing + (ring ? (i * TAU) / count : (i - (count - 1) / 2) * s.spread);
    // The far point of the circle lies a quarter turn from the launch heading.
    const shot = launch(world, w, aim - side * (Math.PI / 2));
    shot.speed = s.speed;
    shot.curve = (side * s.speed) / r;
    shot.damage = dmg(world, s.damage);
    shot.knockback = s.knockback;
    shot.radius = s.radius * area;
    shot.pierce = s.pierce;
    shot.ttl = (TAU * r) / s.speed;
    shot.back = shot.ttl / 2;
  }
}

function sweepOrbit(world: World, s: OrbitLevel, w: OwnedWeapon, slot: number): void {
  const p = world.player;
  const list = world.enemies.active;
  const count = amount(world, s.count);
  const orbitR = s.orbitRadius * p.stats.area;
  const hitR = s.radius * p.stats.area;
  const rehit = s.cooldown * p.stats.cooldown;
  const dart = (WEAPONS[w.id] as WeaponDef).dart;
  if (dart) {
    // Out to the nearest enemy beyond the circle (those inside it, the swords already pass through).
    const reach = dart.reach * p.stats.area;
    const ids = world.enemyHash.query(p.x, p.y, orbitR + reach + MAX_ENEMY_RADIUS, world.scratch);
    let best = Infinity;
    let tx = 0;
    let ty = 0;
    for (let n = 0; n < ids.length; n++) {
      const e = list[ids[n] as number] as Enemy;
      if (e.dead || isFaded(e)) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > orbitR && d < best) {
        best = d;
        tx = e.x;
        ty = e.y;
      }
    }
    const found = best <= orbitR + reach + MAX_ENEMY_RADIUS;
    w.aim = found ? Math.atan2(ty - p.y, tx - p.x) : 0;
    w.aimReach = found ? Math.min(reach, best - orbitR) : 0;
  }
  for (let i = 0; i < count; i++) {
    const a = orbitAngle(world.time, s.spin, i, count);
    const br = bladeRadius(w, a, orbitR);
    const bx = p.x + Math.cos(a) * br;
    const by = p.y + Math.sin(a) * br;
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
      (i === 0 ? (bossOnScreen(world) ?? nearestVisible(world)) : null) ??
      randomEnemyNear(world, world.view.w / 2, world.view.h / 2, targets);
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
    const def = WEAPONS[w.id] as WeaponDef;
    if (def.chain) chainBolt(world, s, w, t, def.chain);
    // Espada de Fogo: the ground where it fell keeps burning.
    const gr = def.ground;
    if (gr) {
      const z = addZone(world, x, y, radius, gr.duration, dmg(world, s.damage) * gr.damage, w);
      z.slows = false;
      z.burnDps = dmg(world, s.damage) * gr.burn;
      z.burnFor = gr.for;
    }
  }
  world.numberBudget = Infinity;
  return targets.length > 0;
}

/** Tempestade: from the struck enemy the bolt jumps to the nearest ones it hasn't hit, one after another. */
function chainBolt(
  world: World,
  s: StrikeLevel,
  w: OwnedWeapon,
  from: Enemy,
  chain: { count: number; range: number; damage: number },
): void {
  const targets = world.targetsScratch;
  let x = from.x;
  let y = from.y;
  for (let c = 0; c < chain.count; c++) {
    const next = nearestEnemy(world, x, y, chain.range, targets);
    if (!next) break;
    targets.push(next.uid);
    addLink(world, x, y, next.x, next.y, w.id);
    damageEnemy(world, next, dmg(world, s.damage) * chain.damage, 0, 0, 0, w);
    x = next.x;
    y = next.y;
  }
}

/** The boss while it is alive and inside the visible rectangle, else null. */
function bossOnScreen(world: World): Enemy | null {
  const b = world.boss;
  const p = world.player;
  if (!b || b.dead) return null;
  return Math.abs(b.x - p.x) <= world.view.w / 2 && Math.abs(b.y - p.y) <= world.view.h / 2 ? b : null;
}

function fireAura(world: World, s: AuraLevel, w: OwnedWeapon): boolean {
  const burst = (WEAPONS[w.id] as WeaponDef).burst;
  if (burst) {
    // The ring appears: its window opens now and the first tick lands at once.
    w.burst = burst.window;
    w.burstTick = 0;
    runBurst(world, w, 0);
    return true;
  }
  auraTick(world, s, w, 1);
  const pulse = (WEAPONS[w.id] as WeaponDef).pulse;
  if (pulse && ++w.swings % pulse.every === 0)
    yahWave(world, s, w, s.radius * world.player.stats.area * pulse.radius, pulse);
  return true;
}

/** The active window of a bursting aura: a tick every `window / ticks` s until the window closes. */
function runBurst(world: World, w: OwnedWeapon, dt: number): void {
  const burst = (WEAPONS[w.id] as WeaponDef).burst as { window: number; ticks: number };
  const gap = burst.window / burst.ticks;
  w.burst -= dt;
  w.burstTick -= dt;
  while (w.burstTick <= 1e-9 && w.burst > 1e-9) {
    auraTick(world, weaponStats(w) as AuraLevel, w, 1 / burst.ticks);
    w.burstTick += gap;
  }
  if (w.burst <= 1e-9) w.burst = 0;
}

/** One hit on everything inside the aura, for `share` of the level's damage. */
function auraTick(world: World, s: AuraLevel, w: OwnedWeapon, share: number): void {
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
    if (dx * dx + dy * dy <= r * r) damageEnemy(world, e, dmg(world, s.damage * share), 0, 0, 0, w);
  }
}

/** Chama de Yah's wave: everything out to `radius` is hit harder and thrown back. */
function yahWave(
  world: World,
  s: AuraLevel,
  w: OwnedWeapon,
  radius: number,
  pulse: { damage: number; knockback: number },
): void {
  const p = world.player;
  const list = world.enemies.active;
  const slash = world.slashes.acquire();
  slash.form = 'pulse';
  slash.wave = false;
  slash.x = p.x;
  slash.y = p.y;
  slash.angle = 0;
  slash.range = 0;
  slash.width = 0;
  slash.arc = 0;
  slash.shock = radius;
  slash.weapon = w.id;
  slash.ttl = config.effects.pulseTtl;
  world.numberBudget = config.effects.arcNumbers;
  const ids = world.enemyHash.query(p.x, p.y, radius + MAX_ENEMY_RADIUS, world.scratch);
  for (let i = 0; i < ids.length; i++) {
    const e = list[ids[i] as number] as Enemy;
    if (e.dead) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const r = radius + e.def.radius * 0.5;
    if (dx * dx + dy * dy > r * r) continue;
    const d = Math.hypot(dx, dy) || 1;
    damageEnemy(world, e, dmg(world, s.damage) * pulse.damage, dx / d, dy / d, pulse.knockback, w);
  }
  world.numberBudget = Infinity;
}
