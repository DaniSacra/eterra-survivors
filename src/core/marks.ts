import { config } from '../data/config';
import { ENEMIES, type EnemyDef, type EnemyId } from '../data/enemies';
import { hurtHero } from './elos';
import { damageEnemy, spawnEnemy, type Enemy } from './enemies';
import type { Poolable } from './pool';
import type { World } from './world';

/**
 * A mark on the ground (its own pool, capped at config.marks.max). `spawn`: an enemy rising here when it runs out
 * (FT-02: nothing appears inside the view without warning). `ice`: a patch of the Lobo Velho's ice, forming while
 * `ttl` runs out, then slowing the hero to `slow` until the fight ends (core/arena.ts, FT-08).
 */
export type MarkKind = 'spawn' | 'ice' | 'poison' | 'tar' | 'web' | 'burst';
/** The marks that are patches of ground the hero can stand in. */
export const isPatch = (k: MarkKind): boolean => k !== 'spawn' && k !== 'burst';

export interface Mark extends Poolable {
  kind: MarkKind;
  x: number;
  y: number;
  radius: number;
  /** Seconds left, and its whole span (the render grows the crack from one to the other). */
  ttl: number;
  total: number;
  /** spawn: who rises, and their HP multiplier. */
  enemy: EnemyId;
  hpMult: number;
  /** ice: the hero's speed on it, and when it formed (match time; the oldest melts first). */
  slow: number;
  born: number;
  /**
   * poison / tar / web (FT-11, FT-12): `ttl` is the warning (a potion in flight, a web forming), then the patch
   * lasts `life` s; `damage` every config.marks.poolTick s (poison) while the hero is inside; `slow` as for ice.
   * `fromX`/`fromY`: where a potion was thrown from (the render draws its arc).
   */
  life: number;
  damage: number;
  tick: number;
  fromX: number;
  fromY: number;
  /** burst (FT-14): damage to each other enemy within `radius` when it goes off. */
  foe: number;
}

export const createMark = (): Mark => ({
  poolIndex: -1,
  kind: 'spawn',
  x: 0,
  y: 0,
  radius: 0,
  ttl: 0,
  total: 0,
  enemy: 'bones',
  hpMult: 1,
  slow: 1,
  born: 0,
  life: 0,
  damage: 0,
  tick: 0,
  fromX: 0,
  fromY: 0,
  foe: 0,
});

/** A patch of ground (poison, tar, web) warning for `arm` s, then lasting `life` s (see Mark). */
export function addPatch(
  world: World,
  kind: 'poison' | 'tar' | 'web',
  x: number,
  y: number,
  radius: number,
  arm: number,
  life: number,
  slow: number,
  damage: number,
  fromX = x,
  fromY = y,
): boolean {
  if (world.marks.size >= config.marks.max) return false;
  const m = world.marks.acquire();
  m.kind = kind;
  m.x = x;
  m.y = y;
  m.radius = radius;
  m.ttl = m.total = arm;
  m.life = life;
  m.slow = slow;
  m.damage = damage;
  m.tick = config.marks.poolTick;
  m.fromX = fromX;
  m.fromY = fromY;
  m.born = world.time;
  return true;
}

/**
 * A burst (FT-14): the mark of a fallen Ossada em Brasa, going off in `delay` s. `hero` damage to the hero inside
 * `radius`, `foe` to every other enemy there.
 */
export function addBurst(
  world: World,
  x: number,
  y: number,
  radius: number,
  delay: number,
  hero: number,
  foe: number,
): boolean {
  if (world.marks.size >= config.marks.max) return false;
  const m = world.marks.acquire();
  m.kind = 'burst';
  m.x = x;
  m.y = y;
  m.radius = radius;
  m.ttl = m.total = delay;
  m.damage = hero;
  m.foe = foe;
  m.born = world.time;
  return true;
}

/** Whether (x, y) is inside the hero's view (plus a margin, px). */
export function inView(world: World, x: number, y: number, margin = 0): boolean {
  const p = world.player;
  return Math.abs(x - p.x) <= world.view.w / 2 + margin && Math.abs(y - p.y) <= world.view.h / 2 + margin;
}

/**
 * An enemy rising at (x, y): straight away out of view; inside it, after a spawn mark of config.marks.spawnTime s,
 * and never closer than config.marks.spawnMinDist px to the hero (the spot is pushed out). Returns whether it
 * rose (or will): false when the marks are full.
 */
export function riseAt(world: World, id: EnemyId, x: number, y: number, hpMult = 1): boolean {
  if (!inView(world, x, y, 20)) {
    spawnEnemy(world, id, x, y, hpMult);
    return true;
  }
  if (world.marks.size >= config.marks.max) return false;
  const p = world.player;
  const dx = x - p.x;
  const dy = y - p.y;
  const d = Math.hypot(dx, dy);
  const min = config.marks.spawnMinDist;
  if (d < min) {
    // Pushed straight out from the hero (any way out if it sits right on them).
    const k = d > 1e-3 ? min / d : 0;
    x = d > 1e-3 ? p.x + dx * k : p.x + min;
    y = d > 1e-3 ? p.y + dy * k : p.y;
  }
  const m = world.marks.acquire();
  m.kind = 'spawn';
  m.x = x;
  m.y = y;
  m.enemy = id;
  m.hpMult = hpMult;
  m.radius = (ENEMIES[id] as EnemyDef).radius;
  m.ttl = m.total = config.marks.spawnTime;
  return true;
}

/** A burst goes off: the hero inside is hurt, and so is every enemy there. Kills are swept with the step. */
function explode(world: World, m: Mark): void {
  const p = world.player;
  const rr = m.radius * m.radius;
  if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 < (m.radius + config.player.radius) ** 2)
    if (hurtHero(world, null, m.damage, 'ground')) world.events.push({ type: 'playerHit' });
  const list = world.enemies.active;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.dead || e.def.boss || (e.x - m.x) ** 2 + (e.y - m.y) ** 2 > rr) continue;
    damageEnemy(world, e, m.foe, 0, 0, 0, null);
  }
  world.events.push({ type: 'burst', x: m.x, y: m.y, radius: m.radius });
}

/** Counts the marks down; a spawn mark that runs out lets its enemy rise. */
export function updateMarks(world: World, dt: number): void {
  const list = world.marks.active;
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i] as Mark;
    if (world.freeze > 0 && m.kind !== 'spawn') continue;
    m.ttl -= dt;
    if (m.ttl > 0) continue;
    if (m.kind === 'ice') {
      m.ttl = 0; // formed: stays until the fight ends
      continue;
    }
    if (m.kind === 'burst') {
      explode(world, m);
      world.marks.release(m);
      continue;
    }
    if (m.kind !== 'spawn') {
      m.ttl = 0;
      m.life -= dt;
      if (m.life <= 0) {
        world.marks.release(m);
        continue;
      }
      // Poison burns whoever stands in it, every tick.
      m.tick -= dt;
      if (m.tick <= 0) {
        m.tick += config.marks.poolTick;
        const p = world.player;
        if (m.damage > 0 && (p.x - m.x) ** 2 + (p.y - m.y) ** 2 < m.radius * m.radius)
          if (hurtHero(world, null, m.damage, 'ground')) world.events.push({ type: 'playerHit' });
      }
      continue;
    }
    if (world.enemies.size < config.enemies.maxActive) spawnEnemy(world, m.enemy, m.x, m.y, m.hpMult);
    world.marks.release(m);
  }
}
