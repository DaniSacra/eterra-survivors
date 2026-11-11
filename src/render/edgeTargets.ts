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

/** A reusable list of targets (nothing allocates per frame). */
export const createTargets = (): ArrowTarget[] =>
  Array.from({ length: MAX_ARROWS }, () => ({ kind: 'chest', x: 0, y: 0 }));

/**
 * Fills `out` with the things off screen that deserve an arrow, chests first, the thief rat before any elite (it runs
 * off with the gems and is the one to catch), and returns how many. `onScreen` says whether a point is in view: a
 * target in view gets no arrow.
 */
export function arrowTargets(
  world: World,
  onScreen: (x: number, y: number) => boolean,
  out: ArrowTarget[],
): number {
  let n = 0;
  const put = (kind: ArrowKind, x: number, y: number): void => {
    const t = out[n++] as ArrowTarget;
    t.kind = kind;
    t.x = x;
    t.y = y;
  };
  const items = world.pickups.active;
  for (let i = 0; i < items.length && n < MAX_ARROWS; i++) {
    const it = items[i] as (typeof items)[number];
    if (it.type === 'chest' && !onScreen(it.x, it.y)) put('chest', it.x, it.y);
  }
  const foes = world.enemies.active;
  for (let i = 0; i < foes.length && n < MAX_ARROWS; i++) {
    const e = foes[i] as (typeof foes)[number];
    if (e.def.flee && !e.dead && !onScreen(e.x, e.y)) put('thief', e.x, e.y);
  }
  for (let i = 0; i < foes.length && n < MAX_ARROWS; i++) {
    const e = foes[i] as (typeof foes)[number];
    if (e.def.elite && !e.dead && !onScreen(e.x, e.y)) put('elite', e.x, e.y);
  }
  return n;
}
