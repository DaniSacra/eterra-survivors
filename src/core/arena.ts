import type { BossAbility } from '../data/enemies';
import type { Enemy } from './enemies';
import { addPatch, type Mark } from './marks';
import type { World } from './world';

/**
 * The Lobo Velho's arena (FT-08): on arrival the ground closes `half` px ahead of and behind the hero (only the
 * hero is held; the crowd leaps the ice), and the Uivo da Geada leaves patches of ice that slow the hero. All of it
 * goes when the boss falls.
 */
export function closeArena(world: World, half: number): void {
  const a = world.arena;
  a.on = true;
  a.y0 = world.player.y - half;
  a.y1 = world.player.y + half;
}

/** The boss fell: the walls and the ice melt. */
export function openArena(world: World): void {
  world.arena.on = false;
  const list = world.marks.active;
  for (let i = list.length - 1; i >= 0; i--)
    if ((list[i] as Mark).kind === 'ice') world.marks.release(list[i] as Mark);
}

/** Keeps the hero (radius r) inside the arena while it stands. */
export function holdInArena(world: World, r: number): void {
  const a = world.arena;
  if (!a.on) return;
  const p = world.player;
  if (p.y < a.y0 + r) p.y = a.y0 + r;
  else if (p.y > a.y1 - r) p.y = a.y1 - r;
}

/** The hero's speed factor on the ground they stand on: the slowest formed patch (ice, tar, web) under them, or 1. */
export function groundSlow(world: World): number {
  const p = world.player;
  const list = world.marks.active;
  let k = 1;
  for (let i = 0; i < list.length; i++) {
    const m = list[i] as Mark;
    if (m.kind === 'spawn' || m.ttl > 0) continue;
    if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 < m.radius * m.radius && m.slow < k) k = m.slow;
  }
  return k;
}

/**
 * Uivo da Geada: marks where its ice will form (during the windup). Each patch goes `near`..`far` px ahead of or
 * behind the hero, alternating, on alternating halves of the road, so there is always a way through: never under
 * the hero, never two side by side in the same band, inside the arena. Over `cap`, the oldest melts.
 */
export function markIce(world: World, boss: Enemy, ab: BossAbility): void {
  const p = world.player;
  const a = world.arena;
  const r = ab.radius ?? 64;
  const near = ab.near ?? 120;
  const far = ab.far ?? 220;
  const layout = world.stage.layout;
  const quarter = layout.kind === 'corridor' ? layout.width / 4 : 80;
  const s = world.rng.next() < 0.5 ? 1 : -1;
  const side = world.rng.next() < 0.5 ? 1 : -1;
  // The furthest patch so far ahead (+) and behind (-): the next one on that side goes a whole band past it.
  let usedPos = 0;
  let usedNeg = 0;
  for (let i = 0; i < (ab.count ?? 2); i++) {
    let dir = i % 2 === 0 ? s : -s;
    const pick = (d: number): number => {
      const used = d > 0 ? usedPos : usedNeg;
      const off = world.rng.range(near, far);
      return used > 0 ? Math.max(off, used + 2 * r + 4) : off;
    };
    let off = pick(dir);
    // No room on that side of the arena: the other way.
    if (a.on && off + r > (dir > 0 ? a.y1 - p.y : p.y - a.y0)) {
      dir = -dir;
      off = pick(dir);
    }
    if (dir > 0) usedPos = off;
    else usedNeg = off;
    const m = world.marks.acquire();
    m.kind = 'ice';
    m.x = (layout.kind === 'corridor' ? 0 : p.x) + quarter * (i % 2 === 0 ? side : -side);
    m.y = p.y + dir * off;
    m.radius = r;
    m.slow = ab.slow ?? 0.6;
    m.ttl = m.total = ab.windup;
    m.born = world.time + i * 1e-3;
    m.enemy = boss.type;
  }
  meltOldest(world, ab.cap ?? 6);
}

/**
 * Teia (FT-12): marks `count` webs during the windup, one right on the hero (they are warned, so it is fair) and the
 * rest `near`..`far` px around; each forms when the windup ends and slows the hero for `life` s. Over `cap`, the
 * oldest goes.
 */
export function markWeb(world: World, boss: Enemy, ab: BossAbility): void {
  const p = world.player;
  const r = ab.radius ?? 60;
  for (let i = 0; i < (ab.count ?? 3); i++) {
    let x = p.x;
    let y = p.y;
    if (i > 0) {
      const a = world.rng.next() * Math.PI * 2;
      const d = world.rng.range(ab.near ?? 60, ab.far ?? 200);
      x += Math.cos(a) * d;
      y += Math.sin(a) * d;
    }
    addPatch(world, 'web', x, y, r, ab.windup, ab.life ?? 8, ab.slow ?? 0.55, 0, boss.x, boss.y);
    const m = world.marks.active[world.marks.size - 1];
    if (m) m.born = world.time + i * 1e-3;
  }
  meltOldest(world, ab.cap ?? 6, 'web');
}

function meltOldest(world: World, cap: number, kind: Mark['kind'] = 'ice'): void {
  const list = world.marks.active;
  for (;;) {
    let n = 0;
    let oldest: Mark | null = null;
    for (let i = 0; i < list.length; i++) {
      const m = list[i] as Mark;
      if (m.kind !== kind) continue;
      n++;
      if (!oldest || m.born < oldest.born) oldest = m;
    }
    if (n <= cap || !oldest) return;
    world.marks.release(oldest);
  }
}
