import { config } from '../data/config';
import { ENEMIES, MAX_ENEMY_RADIUS, type EnemyDef, type EnemyId } from '../data/enemies';
import { updateBoss } from './bosses';
import { behaviourStep, isAirborne, isFaded, rallyDamage } from './behaviours';
import { hurtHero, onKill } from './elos';
import { addPatch } from './marks';
import { BLOCKED, blockCircle, spawnPoint } from './terrain';
import type { Poolable } from './pool';
import type { OwnedWeapon } from './weapons';
import type { WeaponId } from '../data/weapons';
import type { World } from './world';

export interface Enemy extends Poolable {
  /** Unique per spawn, so references held by projectiles survive pool reuse. */
  uid: number;
  type: EnemyId;
  def: EnemyDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  kbx: number;
  kby: number;
  flash: number;
  /** The weapon that hit it last (null: none, or not a weapon), so the render can draw that weapon's spark. */
  hitBy: WeaponId | null;
  /** Damage of that last hit, and whether it was a critical one (NF-06: the spark says how hard it was). */
  hitAmount: number;
  hitCrit: boolean;
  /** Seconds left slowed by frost. */
  slow: number;
  /** Seconds left stunned (a slam): it can't move or bite. */
  stun: number;
  /** Damage over time (Leque de Facas bleeding, Espada de Fogo burning): seconds left, damage per second, kind. */
  dot: number;
  dotDps: number;
  dotTick: number;
  dotKind: DotKind;
  /** The weapon credited with that damage. */
  dotBy: OwnedWeapon | null;
  /** Per weapon slot: match time when an orbit weapon may hit this enemy again. */
  orbitReady: number[];
  /** Seconds left rallied by a banner (FT-06): faster and harder-hitting (config.rally). */
  rally: number;
  /** Nests: how many it has raised so far; a witch: potions thrown. */
  spawned: number;
  /** A brewing witch: seconds to the next stir, and seconds of stirring left. */
  brewT: number;
  stir: number;
  /** Thieves: XP worth of gems carried (given back, in one gem, when it falls). */
  carry: number;
  /** Bosses: which of `abilities` comes next (round and round). */
  abilityIdx: number;
  /** Bosses only (core/bosses.ts): ability phase, seconds left in it, and the direction it aimed. */
  act: number;
  actT: number;
  aimX: number;
  aimY: number;
  /** trail: seconds to the next patch it leaves. */
  trailT: number;
  /** reassemble: seconds left as a pile (0: standing), and whether it has already stood up once. */
  pile: number;
  rose: boolean;
  /** A phasing ghost that has vanished once: it stays in its dark form until it dies. */
  dark: boolean;
  dead: boolean;
  /** Swept without a kill: no XP, no drop, not counted (the crowd leaving when the boss arrives). */
  vanished: boolean;
}

export const createEnemy = (): Enemy => ({
  poolIndex: -1,
  uid: 0,
  type: 'skeleton',
  def: ENEMIES.skeleton,
  x: 0,
  y: 0,
  hp: 0,
  maxHp: 0,
  kbx: 0,
  kby: 0,
  flash: 0,
  hitBy: null,
  hitAmount: 0,
  hitCrit: false,
  slow: 0,
  stun: 0,
  dot: 0,
  dotDps: 0,
  dotTick: 0,
  dotKind: 'bleed',
  dotBy: null,
  orbitReady: new Array<number>(config.weapons.maxOwned).fill(0),
  act: 0,
  actT: 0,
  aimX: 1,
  rally: 0,
  spawned: 0,
  brewT: 0,
  stir: 0,
  carry: 0,
  abilityIdx: 0,
  vanished: false,
  aimY: 0,
  trailT: 0,
  pile: 0,
  rose: false,
  dark: false,
  dead: false,
});

/** The sprite key `e` shows: its dark form's once it has turned dark. */
export const spriteOf = (e: Enemy): string => (e.dark && e.def.darkSprite ? e.def.darkSprite : e.def.sprite);

export type DotKind = 'bleed' | 'burn';

/**
 * Puts damage over time on an enemy (`dps` for `duration` s). The stronger one stays, for its own time: a weaker
 * one only refreshes the time if it lasts longer.
 */
export function applyDot(
  e: Enemy,
  kind: DotKind,
  dps: number,
  duration: number,
  by: OwnedWeapon | null,
): void {
  if (dps >= e.dotDps || e.dot <= 0) {
    if (e.dot <= 0) e.dotTick = config.dotTick;
    // A stronger kind takes over with its own duration (it doesn't inherit a weaker one's longer time).
    e.dot = kind === e.dotKind || e.dot <= 0 ? Math.max(e.dot, duration) : duration;
    e.dotDps = dps;
    e.dotKind = kind;
    e.dotBy = by;
  } else e.dot = Math.max(e.dot, duration);
}

/** Ticks an enemy's damage over time. */
function tickDot(world: World, e: Enemy, dt: number): void {
  e.dot -= dt;
  e.dotTick -= dt;
  if (e.dotTick <= 0) {
    e.dotTick += config.dotTick;
    damageEnemy(world, e, e.dotDps * config.dotTick, 0, 0, 0, e.dotBy);
  }
  if (e.dot <= 0) e.dotDps = 0;
}

/** Reused output of behaviourStep. */
const STEP = { x: 0, y: 0 };

export function spawnEnemy(world: World, type: EnemyId, x: number, y: number, hpMult = 1): Enemy {
  const e = world.enemies.acquire();
  const def: EnemyDef = ENEMIES[type];
  e.uid = world.nextUid++;
  e.type = type;
  e.def = def;
  e.x = x;
  e.y = y;
  e.maxHp = e.hp = def.hp * hpMult * world.stage.mult.hp;
  e.kbx = e.kby = e.flash = e.slow = e.stun = e.dot = e.dotDps = e.dotTick = 0;
  e.dotBy = null;
  e.hitBy = null;
  e.hitAmount = 0;
  e.hitCrit = false;
  e.orbitReady.fill(0);
  e.act = 0;
  // A banner rallies at once; the others wait a little before their first move.
  e.actT = def.ability ? def.ability.every / 2 : def.nest ? def.nest.every : def.move && !def.banner ? 2 : 0;
  e.aimX = 1;
  e.aimY = 0;
  e.rally = 0;
  e.spawned = 0;
  e.brewT = def.brew?.every ?? def.dig?.every ?? 0;
  e.stir = 0;
  e.carry = 0;
  e.abilityIdx = 0;
  e.pile = 0;
  e.rose = false;
  e.dark = false;
  e.trailT = def.trail?.every ?? 0;
  e.dead = e.vanished = false;
  world.seen[type] = true;
  world.alive[type] = (world.alive[type] ?? 0) + 1;
  if (def.flee) world.events.push({ type: 'thiefSpawned' });
  return e;
}

/** Radius of the ring just outside the visible area. */
export const spawnRadius = (world: World): number =>
  Math.hypot(world.view.w, world.view.h) / 2 + config.enemies.spawnMargin;

/** Spawns just outside the view, where the stage's ground lets enemies come in (core/terrain.ts). */
export function spawnOnRing(world: World, type: EnemyId, hpMult = 1): Enemy {
  const e = spawnEnemy(world, type, 0, 0, hpMult);
  spawnPoint(world, null, e);
  return e;
}

export function rebuildEnemyHash(world: World): void {
  const h = world.enemyHash;
  h.clear();
  const list = world.enemies.active;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (!e.dead) h.insert(i, e.x, e.y);
  }
}

/**
 * Whether a hit passes over `e` without touching it: dead, a faded ghost, or a pile that has just fallen (the same
 * swing's other hits, an aura, an orbit or a piercing shot, must not break it: CB-01). Anything tied to a hit, like a
 * stun, must check this too.
 */
export function isUntouchable(e: Enemy): boolean {
  if (e.dead || isFaded(e)) return true;
  if (e.pile <= 0) return false;
  const re = e.def.reassemble as NonNullable<EnemyDef['reassemble']>;
  return e.pile > re.delay - config.enemies.pileGuard;
}

/**
 * Damages an enemy; death is deferred to `sweepDeadEnemies`. Knockback direction (kx, ky) is a unit-ish vector.
 * `source` is credited with the damage actually dealt (for the end-of-run report).
 */
export function damageEnemy(
  world: World,
  e: Enemy,
  amount: number,
  kx = 0,
  ky = 0,
  knockback = 0,
  source: OwnedWeapon | null = null,
): void {
  if (isUntouchable(e)) return;
  if (e.pile > 0) {
    const re = e.def.reassemble as NonNullable<EnemyDef['reassemble']>;
    // After that, any hit breaks it for good, and counts like the hit it is.
    const dealt = Math.min(amount, e.maxHp * re.hp);
    if (source) {
      source.damage += dealt;
      if (amount > world.bestHit) world.bestHit = amount;
    }
    e.pile = 0;
    e.hp = 0;
    e.dead = true;
    e.hitBy = source ? source.id : null;
    e.hitAmount = amount;
    e.hitCrit = false;
    world.tally.hits++;
    world.onEnemyDamaged(e, amount, source);
    onKill(world, e, source);
    return;
  }
  if (source) {
    source.damage += Math.min(amount, e.hp);
    if (amount > world.bestHit) world.bestHit = amount;
  }
  world.tally.hits++;
  e.hp -= amount;
  e.flash = config.enemies.hitFlash;
  e.hitBy = source ? source.id : null;
  e.hitAmount = amount;
  e.hitCrit = false;
  const kb = knockback * (1 - e.def.knockbackResist);
  e.kbx += kx * kb;
  e.kby += ky * kb;
  world.onEnemyDamaged(e, amount, source);
  if (e.hp <= 0) {
    const re = e.def.reassemble;
    if (re && !e.rose) {
      // Not dead yet: a pile that stands up again unless something hits it (FT-15).
      e.pile = re.delay;
      e.hp = 0;
      e.dot = e.dotDps = 0;
      e.kbx = e.kby = 0;
      return;
    }
    e.dead = true;
    onKill(world, e, source);
  }
}

export function updateEnemies(world: World, dt: number): void {
  const list = world.enemies.active;
  const p = world.player;
  const { separation, knockbackDecay, recycleFactor } = config.enemies;
  const recycleSq = (spawnRadius(world) * recycleFactor) ** 2;
  const near = world.scratch;
  const decay = Math.max(0, 1 - knockbackDecay * dt);
  // Sopro de Geada: nobody moves or bites while the world is frozen (knockback still applies).
  const frozen = world.freeze > 0;
  const speedMult = world.stage.mult.speed;

  rebuildEnemyHash(world);
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.pile > 0) {
      // A pile lies still; it stands up when its time is out (the frozen world waits).
      if (!frozen) {
        e.pile -= dt;
        if (e.pile <= 0) {
          e.pile = 0;
          e.rose = true;
          e.hp = e.maxHp * (e.def.reassemble as { hp: number }).hp;
        }
      }
      continue;
    }

    // Seek: straight vector to the player.
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > recycleSq && !e.def.boss) {
      // Something rooted (a banner) left far behind just goes, with no drop.
      if (e.def.move === 'still') {
        e.dead = e.vanished = true;
        continue;
      }
      // Too far behind: reappear ahead, in the direction the player is heading.
      spawnPoint(world, Math.atan2(p.facing.y, p.facing.x) + (world.rng.next() - 0.5) * 1.5, e);
      continue;
    }
    const dist = Math.sqrt(distSq) || 1;
    // A boss using its ability moves on its own (or stands still) instead of walking to the hero.
    const acting = e.def.boss && updateBoss(world, e, dt);
    let speed = frozen || acting ? 0 : e.def.speed * speedMult * (e.dark ? config.darkGhost.speed : 1) * dt;
    if (e.stun > 0) {
      e.stun -= dt;
      speed = 0;
    }
    if (e.dot > 0) tickDot(world, e, dt);
    if (e.def.trail && !frozen) leaveTrail(world, e, dt);
    if (e.slow > 0) {
      e.slow -= dt;
      speed *= config.zones.slowFactor;
    }
    if (e.rally > 0) {
      e.rally -= dt;
      speed *= config.rally.speed;
    }
    let mx: number;
    let my: number;
    if (e.def.move && !frozen) {
      behaviourStep(world, e, dt, dx / dist, dy / dist, dist, speed, STEP);
      mx = STEP.x;
      my = STEP.y;
      if (e.def.move === 'phase' || isAirborne(e)) {
        // Passes through the crowd (or over it): no separation.
        e.x += mx + e.kbx * dt;
        e.y += my + e.kby * dt;
        e.kbx *= decay;
        e.kby *= decay;
        blockCircle(world, e, e.def.radius);
        continue;
      }
    } else {
      mx = (dx / dist) * speed;
      my = (dy / dist) * speed;
    }

    // Separation from overlapping neighbours, weighted by size so the big ones shove the small.
    const r = e.def.radius;
    world.enemyHash.query(e.x, e.y, r + MAX_ENEMY_RADIUS, near);
    for (let n = 0; n < near.length; n++) {
      const j = near[n] as number;
      if (j === i) continue;
      const o = list[j] as Enemy;
      const ox = e.x - o.x;
      const oy = e.y - o.y;
      const minD = r + o.def.radius;
      const dSq = ox * ox + oy * oy;
      if (dSq >= minD * minD) continue;
      const d = Math.sqrt(dSq);
      const r2 = o.def.radius * o.def.radius;
      const push = ((minD - d) * separation * r2) / (r * r + r2);
      if (d > 0.0001) {
        mx += (ox / d) * push;
        my += (oy / d) * push;
      } else {
        mx += (j < i ? 1 : -1) * push; // exact overlap: split deterministically
      }
    }

    e.x += mx + e.kbx * dt;
    e.y += my + e.kby * dt;
    e.kbx *= decay;
    e.kby *= decay;
    if (blockCircle(world, e, e.def.radius)) {
      // Walked into an obstacle: go around it along its edge, on the side the walk leans to.
      const tx = -BLOCKED.y;
      const ty = BLOCKED.x;
      const lean = mx * tx + my * ty;
      const side = Math.abs(lean) > 1e-3 ? Math.sign(lean) : e.uid & 1 ? 1 : -1;
      const step = speed * 0.9;
      e.x += tx * side * step;
      e.y += ty * side * step;
      blockCircle(world, e, e.def.radius);
    }
  }
  rebuildEnemyHash(world);

  // Contact damage (player i-frames make only one hit land at a time).
  if (frozen) return;
  const damageMult = world.enemyDamage * world.stage.mult.damage;
  const reach = config.player.radius + MAX_ENEMY_RADIUS;
  world.enemyHash.query(p.x, p.y, reach, near);
  for (let n = 0; n < near.length; n++) {
    const e = list[near[n] as number] as Enemy;
    const minD = config.player.radius + e.def.radius;
    const cx = p.x - e.x;
    const cy = p.y - e.y;
    if (
      cx * cx + cy * cy < minD * minD &&
      !isFaded(e) &&
      !isAirborne(e) &&
      e.pile <= 0 &&
      e.def.damage > 0 &&
      e.stun <= 0 &&
      // A boss bites as hard all fight long: the wave curve's damage ramp is for the crowd (NE-05).
      hurtHero(world, e, e.def.damage * (e.def.boss ? world.stage.mult.damage : damageMult) * rallyDamage(e))
    ) {
      world.events.push({ type: 'playerHit' });
      break;
    }
  }
}

/** A trail (FT-16): every `every` s a patch under it, unless its own `cap` of patches is already on the ground. */
function leaveTrail(world: World, e: Enemy, dt: number): void {
  const tr = e.def.trail as NonNullable<EnemyDef['trail']>;
  e.trailT -= dt;
  if (e.trailT > 0) return;
  e.trailT = tr.every;
  let n = 0;
  const marks = world.marks.active;
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i] as (typeof marks)[number];
    if (m.kind === tr.pool.kind && m.owner === e.uid) n++;
  }
  if (n >= tr.cap) return;
  if (addPatch(world, tr.pool.kind, e.x, e.y, tr.pool.radius, 0.01, tr.pool.ttl, tr.pool.slow ?? 1, 0)) {
    const m = world.marks.active[world.marks.size - 1];
    if (m) m.owner = e.uid;
  }
}

/** Removes dead enemies (backwards, so swap-remove is safe) and reports each death to the world. */
export function sweepDeadEnemies(world: World): void {
  const list = world.enemies.active;
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i] as Enemy;
    if (!e.dead) continue;
    world.alive[e.type] = (world.alive[e.type] ?? 1) - 1;
    world.onEnemyKilled(e);
    world.enemies.release(e);
  }
}
