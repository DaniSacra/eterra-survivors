import { config } from '../data/config';
import { OBSTACLE_SETS } from '../data/obstacles';
import type { Scatter, StageLayout } from '../data/stages';
import { TAU, type Vec2 } from './math';
import type { World } from './world';

/**
 * The stage's ground (data/stages.ts `layout`): obstacles in the Cripta, the forest walls of the Estrada do Sul.
 * Nothing is stored: an obstacle is computed from the run's seed and its cell whenever it is needed, so the map is
 * endless, the same seed always builds the same crypt, and asking costs a hash per nearby cell.
 */

export interface Obstacle {
  x: number;
  y: number;
  r: number;
  /** Index into the stage's obstacle set (data/obstacles.ts). */
  kind: number;
}

/** The obstacles a layout scatters, if any (Valmor and the Cripta, and the Estrada's road). */
export const scatterOf = (layout: StageLayout): Scatter | null =>
  layout.kind === 'obstacles' ? layout : layout.kind === 'corridor' ? (layout.scatter ?? null) : null;

/** A small integer hash of (seed, cell, k), stable across runs. */
function hash(seed: number, cx: number, cy: number, k: number): number {
  let h = Math.imul(cx, 0x27d4eb2d) ^ Math.imul(cy, 0x165667b1) ^ Math.imul(seed + k, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
const unit = (h: number): number => h / 4294967296;

/**
 * The obstacle of cell (cx, cy), written into `out`; false when the cell has none. Each obstacle sits wholly inside
 * its cell (so a circle can only touch obstacles of the cells it overlaps), and none near the start.
 */
export function obstacleAt(seed: number, layout: Scatter, cx: number, cy: number, out: Obstacle): boolean {
  if (unit(hash(seed, cx, cy, 0)) >= layout.chance) return false;
  const set = OBSTACLE_SETS[layout.set];
  const kind = hash(seed, cx, cy, 1) % set.length;
  const r = (set[kind] as { r: number }).r;
  const pad = r + 12;
  const span = layout.cell - pad * 2;
  out.x = cx * layout.cell + pad + unit(hash(seed, cx, cy, 2)) * span;
  out.y = cy * layout.cell + pad + unit(hash(seed, cx, cy, 3)) * span;
  if (out.x * out.x + out.y * out.y < (layout.clear + r) ** 2) return false;
  if (layout.limitX !== undefined && Math.abs(out.x) + r > layout.limitX) return false;
  out.r = r;
  out.kind = kind;
  return true;
}

const OB: Obstacle = { x: 0, y: 0, r: 0, kind: 0 };

/** After `blockCircle` returned true: the unit normal of the last obstacle it was pushed out of. */
export const BLOCKED: Vec2 = { x: 0, y: 0 };

/**
 * Keeps a circle of radius `r` at `p` out of the ground's walls: pushed out of any obstacle it overlaps (along the
 * line from the obstacle's centre, so whoever walks into one slides around it), and inside the road's edges.
 * Returns true when an obstacle pushed it (its normal in `BLOCKED`).
 */
export function blockCircle(world: World, p: Vec2, r: number): boolean {
  const layout = world.stage.layout;
  if (layout.kind === 'corridor') {
    const lim = layout.width / 2 - r;
    if (p.x > lim) p.x = lim;
    else if (p.x < -lim) p.x = -lim;
  }
  const scatter = scatterOf(layout);
  if (!scatter) return false;
  let hit = false;
  const c = scatter.cell;
  const x0 = Math.floor((p.x - r) / c);
  const x1 = Math.floor((p.x + r) / c);
  const y0 = Math.floor((p.y - r) / c);
  const y1 = Math.floor((p.y + r) / c);
  for (let cx = x0; cx <= x1; cx++)
    for (let cy = y0; cy <= y1; cy++) {
      if (!obstacleAt(world.seed, scatter, cx, cy, OB)) continue;
      const dx = p.x - OB.x;
      const dy = p.y - OB.y;
      const min = r + OB.r;
      const dSq = dx * dx + dy * dy;
      if (dSq >= min * min) continue;
      const d = Math.sqrt(dSq);
      hit = true;
      BLOCKED.x = d < 1e-6 ? 1 : dx / d;
      BLOCKED.y = d < 1e-6 ? 0 : dy / d;
      p.x = OB.x + BLOCKED.x * min;
      p.y = OB.y + BLOCKED.y * min;
    }
  return hit;
}

/**
 * Where a new (or recycled) enemy comes in, written into `out`: just outside the view. On the road, from the end
 * the angle `toward` points to (or either end), or now and then out of the forest at the sides; elsewhere, on the
 * ring around the view at that angle (a random one when `toward` is null).
 */
export function spawnPoint(world: World, toward: number | null, out: Vec2): void {
  const p = world.player;
  const layout = world.stage.layout;
  const rng = world.rng;
  if (layout.kind === 'corridor') {
    const half = layout.width / 2;
    if (toward === null && rng.next() < layout.sides) {
      out.x = (rng.next() < 0.5 ? -1 : 1) * (half - 14);
      out.y = p.y + (rng.next() - 0.5) * world.view.h * 0.8;
      return;
    }
    const dir = toward === null ? (rng.next() < 0.5 ? -1 : 1) : Math.sin(toward) < 0 ? -1 : 1;
    out.x = (rng.next() - 0.5) * (layout.width - 40);
    out.y = p.y + dir * (world.view.h / 2 + config.enemies.spawnMargin);
    return;
  }
  const a = toward ?? rng.next() * TAU;
  const r = Math.hypot(world.view.w, world.view.h) / 2 + config.enemies.spawnMargin;
  out.x = p.x + Math.cos(a) * r;
  out.y = p.y + Math.sin(a) * r;
}
