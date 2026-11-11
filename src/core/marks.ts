import { config } from '../data/config';
import { ENEMIES, type EnemyDef, type EnemyId } from '../data/enemies';
import { spawnEnemy } from './enemies';
import type { Poolable } from './pool';
import type { World } from './world';

/**
 * A mark on the ground (its own pool, capped at config.marks.max). `spawn`: an enemy rising here when it runs out
 * (FT-02: nothing appears inside the view without warning).
 */
export interface Mark extends Poolable {
  kind: 'spawn';
  x: number;
  y: number;
  radius: number;
  /** Seconds left, and its whole span (the render grows the crack from one to the other). */
  ttl: number;
  total: number;
  /** spawn: who rises, and their HP multiplier. */
  enemy: EnemyId;
  hpMult: number;
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
});

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

/** Counts the marks down; a spawn mark that runs out lets its enemy rise. */
export function updateMarks(world: World, dt: number): void {
  const list = world.marks.active;
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i] as Mark;
    m.ttl -= dt;
    if (m.ttl > 0) continue;
    if (world.enemies.size < config.enemies.maxActive) spawnEnemy(world, m.enemy, m.x, m.y, m.hpMult);
    world.marks.release(m);
  }
}
