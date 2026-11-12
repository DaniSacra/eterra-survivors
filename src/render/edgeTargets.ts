import type { World } from '../core/world';

/** What an edge arrow points at, in priority order: a chest, then the thief rat, then living elites. */
export type ArrowKind = 'chest' | 'thief' | 'elite';

export interface ArrowTarget {
  kind: ArrowKind;
  x: number;
  y: number;
}

/** At most this many arrows. */
export const MAX_ARROWS = 3;

const setTarget = (t: ArrowTarget, kind: ArrowKind, x: number, y: number): void => {
  t.kind = kind;
  t.x = x;
  t.y = y;
};

/** A reusable list of targets (nothing allocates per frame). */
export const createTargets = (): ArrowTarget[] =>
  Array.from({ length: MAX_ARROWS }, () => ({ kind: 'chest', x: 0, y: 0 }));

/**
 * Fills `out` with the things off screen that deserve an arrow, chests first, the thief rat before any elite (it runs
 * off with the gems and is the one to catch), and returns how many. the view is the rectangle (`vx`, `vy`, `vw`, `vh`): a
 * target in view gets no arrow.
 */
export function arrowTargets(
  world: World,
  vx: number,
  vy: number,
  vw: number,
  vh: number,
  out: ArrowTarget[],
): number {
  let n = 0;
  const items = world.pickups.active;
  for (let i = 0; i < items.length && n < MAX_ARROWS; i++) {
    const it = items[i] as (typeof items)[number];
    if (it.type !== 'chest' || (it.x >= vx && it.x <= vx + vw && it.y >= vy && it.y <= vy + vh)) continue;
    setTarget(out[n++] as ArrowTarget, 'chest', it.x, it.y);
  }
  const foes = world.enemies.active;
  for (let i = 0; i < foes.length && n < MAX_ARROWS; i++) {
    const e = foes[i] as (typeof foes)[number];
    if (!e.def.flee || e.dead || (e.x >= vx && e.x <= vx + vw && e.y >= vy && e.y <= vy + vh)) continue;
    setTarget(out[n++] as ArrowTarget, 'thief', e.x, e.y);
  }
  for (let i = 0; i < foes.length && n < MAX_ARROWS; i++) {
    const e = foes[i] as (typeof foes)[number];
    if (!e.def.elite || e.dead || (e.x >= vx && e.x <= vx + vw && e.y >= vy && e.y <= vy + vh)) continue;
    setTarget(out[n++] as ArrowTarget, 'elite', e.x, e.y);
  }
  return n;
}
