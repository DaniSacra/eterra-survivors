import { describe, expect, it } from 'vitest';
import { closeArena, groundSlow, markIce } from '../../src/core/arena';
import { BossAct, bossAbility } from '../../src/core/bosses';
import { spawnEnemy } from '../../src/core/enemies';
import { resetMark, type Mark } from '../../src/core/marks';
import { config } from '../../src/data/config';
import { World } from '../../src/core/world';
import { ENEMIES, type BossAbility } from '../../src/data/enemies';
import { STAGES } from '../../src/data/stages';
import { bareWorld, still } from './helpers';

const STEP = 1 / 60;
const FROST = ENEMIES.oldWolf.abilities[2] as BossAbility;

/** A quiet world on the Estrada with the Lobo Velho, its arena closed around the hero. */
function onRoad(seed = 1) {
  const w = bareWorld(seed);
  (w as { stage: typeof STAGES.southRoad }).stage = STAGES.southRoad;
  const wolf = spawnEnemy(w, 'oldWolf', 0, -300);
  w.boss = wolf;
  closeArena(w, ENEMIES.oldWolf.arena);
  return { w, wolf };
}

const ice = (w: World) => w.marks.active.filter((m) => m.kind === 'ice') as Mark[];

describe('the Lobo Velho arena (FT-08)', () => {
  it('uses its abilities in turn: two bites, then the howl', () => {
    const { wolf } = onRoad();
    const kinds = [0, 1, 2, 3].map((i) => {
      wolf.abilityIdx = i;
      return bossAbility(wolf)?.kind;
    });
    expect(kinds).toEqual(['lunge', 'lunge', 'frost', 'lunge']);
  });

  it('ice never forms under or near the hero, nor two in the same band, and stays inside the arena', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { w, wolf } = onRoad(seed);
      // Anywhere in the arena, also right against its walls.
      w.player.y = w.arena.y0 + 12 + ((seed * 97) % (w.arena.y1 - w.arena.y0 - 24));
      markIce(w, wolf, FROST);
      const list = ice(w);
      expect(list.length).toBe(FROST.count);
      for (const m of list) {
        expect(Math.hypot(m.x - w.player.x, m.y - w.player.y)).toBeGreaterThanOrEqual(FROST.near as number);
        expect(m.y).toBeGreaterThan(w.arena.y0);
        expect(m.y).toBeLessThan(w.arena.y1);
      }
      const [a, b] = list as [Mark, Mark];
      expect(Math.abs(a.y - b.y)).toBeGreaterThanOrEqual(2 * (FROST.radius as number));
    }
  });

  it('stops at config.marks.max like every other mark', () => {
    const { w, wolf } = onRoad();
    for (let i = 0; i < config.marks.max; i++) resetMark(w.marks.acquire()).kind = 'tar';
    const before = w.marks.size;
    markIce(w, wolf, FROST);
    expect(w.marks.size).toBe(before);
  });

  it('never more than its cap: the oldest melts', () => {
    const { w, wolf } = onRoad();
    for (let i = 0; i < 6; i++) {
      w.time += 1;
      markIce(w, wolf, FROST);
    }
    expect(ice(w).length).toBe(FROST.cap);
  });

  it('slows the hero only once formed, and only on it', () => {
    const { w, wolf } = onRoad();
    markIce(w, wolf, FROST);
    const m = ice(w)[0] as Mark;
    w.player.x = m.x;
    w.player.y = m.y;
    expect(groundSlow(w)).toBe(1); // still forming
    m.ttl = 0;
    expect(groundSlow(w)).toBe(FROST.slow);
    w.player.x = m.x + m.radius + 5;
    expect(groundSlow(w)).toBe(1);
  });

  it('a howl in the fight: the patches form at the end of the windup', () => {
    const { w, wolf } = onRoad();
    w.player.stats.maxHp = w.player.hp = 1e6;
    wolf.abilityIdx = 2;
    wolf.actT = 0;
    w.step(STEP, still);
    expect(wolf.act).toBe(BossAct.Windup);
    expect(ice(w).every((m) => m.ttl > 0)).toBe(true);
    for (let t = 0; t < FROST.windup + 0.05; t += STEP) w.step(STEP, still);
    expect(ice(w).length).toBe(FROST.count);
    expect(ice(w).every((m) => m.ttl === 0)).toBe(true);
    expect(wolf.abilityIdx).toBe(3);
  });

  it('holds only the hero, and opens with the ice when the boss falls', () => {
    const { w, wolf } = onRoad();
    w.player.stats.maxHp = w.player.hp = 1e9;
    markIce(w, wolf, FROST);
    // A crowd enemy beyond the wall walks in: only the hero is held.
    const foe = spawnEnemy(w, 'hooded', 0, w.arena.y1 + 100);
    for (let i = 0; i < 300; i++) w.step(STEP, still);
    expect(foe.y).toBeLessThan(w.arena.y1);
    const down = { x: 0, y: 1 };
    for (let i = 0; i < 600; i++) w.step(STEP, down);
    expect(w.player.y).toBeCloseTo(w.arena.y1 - 12, 5);
    wolf.dead = true;
    w.step(STEP, down);
    expect(w.state).toBe('won');
    expect(w.arena.on).toBe(false);
    expect(ice(w).length).toBe(0);
  });

  it('closes when the Lobo Velho arrives on the Estrada, and only for it', () => {
    const w = new World(5, { stage: 'southRoad' });
    w.player.stats.maxHp = w.player.hp = 1e9;
    w.weapons.length = 0;
    w.time = STAGES.southRoad.boss.at - 0.01;
    w.step(STEP, still);
    expect(w.boss?.type).toBe('oldWolf');
    expect(w.arena.on).toBe(true);
    expect(w.arena.y1 - w.arena.y0).toBe(2 * ENEMIES.oldWolf.arena);
    expect(ENEMIES.blackKnight).not.toHaveProperty('arena');
  });
});

describe('Teia with the marks full (CB-05)', () => {
  it('touches no existing mark when no web can be made', async () => {
    const { addPatch } = await import('../../src/core/marks');
    const { markWeb } = await import('../../src/core/arena');
    const { config } = await import('../../src/data/config');
    const { quietWorld } = await import('./helpers');
    const w = quietWorld();
    for (let i = 0; i < config.marks.max; i++) addPatch(w, 'poison', i, 0, 10, 1, 5, 1, 0);
    const boss = spawnEnemy(w, 'spiderMother', 200, 0);
    const born = w.marks.active.map((m) => m.born);
    const web = ENEMIES.spiderMother.abilities?.find((a) => a.kind === 'web');
    if (!web) throw new Error('the mother has her web');
    markWeb(w, boss, web);
    expect(w.marks.active.map((m) => m.born)).toEqual(born);
  });
});
