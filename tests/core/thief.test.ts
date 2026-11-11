import { describe, expect, it } from 'vitest';
import { spawnEnemy, sweepDeadEnemies } from '../../src/core/enemies';
import { dropGem } from '../../src/core/xp';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { ENEMIES } from '../../src/data/enemies';
import { STAGES, type StageDef } from '../../src/data/stages';
import { arrowTargets, createTargets } from '../../src/render/edgeTargets';
import { bareWorld, still } from './helpers';

function run(w: ReturnType<typeof bareWorld>, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) w.step(1 / 60, still);
}

describe('thief rat (FT-10)', () => {
  it('is slower than the hero, so it can be caught', () => {
    expect(ENEMIES.thiefRat.speed).toBeLessThan(150);
  });

  it('runs from the hero, takes the gems it crosses, and gives them back in one gem when it falls', () => {
    const w = bareWorld();
    w.player.hp = w.player.stats.maxHp = 1e9;
    const t = spawnEnemy(w, 'thiefRat', 150, 0);
    dropGem(w, 190, 40, 3);
    dropGem(w, 200, 60, 4);
    run(w, 4);
    expect(t.carry).toBe(7);
    expect(w.gems.size).toBe(0);
    // Far from the hero now.
    expect(Math.hypot(t.x, t.y)).toBeGreaterThan(150);
    t.dead = true;
    sweepDeadEnemies(w);
    expect(w.gems.size).toBe(1);
    expect((w.gems.active[0] as { value: number }).value).toBe(7);
    expect(w.pickups.active.some((p) => p.type === 'chest')).toBe(true);
    expect(w.kills).toBe(1);
  });

  it('after its time it runs off and is gone with what it took: no gem, no chest', () => {
    const w = bareWorld();
    w.player.hp = w.player.stats.maxHp = 1e9;
    const t = spawnEnemy(w, 'thiefRat', 150, 0);
    dropGem(w, 190, 40, 3);
    run(w, ENEMIES.thiefRat.flee.life + 8);
    expect(w.alive.thiefRat).toBe(0);
    expect(t.dead).toBe(true);
    expect(w.gems.size).toBe(0);
    expect(w.pickups.size).toBe(0);
    expect(w.kills).toBe(0);
    expect(w.events.some((e) => e.type === 'thiefEscaped')).toBe(true);
  });

  it('does no harm by touch', () => {
    const w = bareWorld();
    spawnEnemy(w, 'thiefRat', 0, 0);
    run(w, 0.2);
    expect(w.player.hp).toBe(w.player.stats.maxHp);
  });
});

describe('thief rat arrival (DD-02)', () => {
  /** A world whose only scheduled thing is a thief rat one second in. */
  function thiefWorld(stageId: 'valmor' | 'crypt' | 'southRoad' = 'valmor'): World {
    const stage: StageDef = {
      ...STAGES[stageId],
      waves: [
        { from: 0, interval: 1e6, batch: 0, hpMult: 1, damage: 1, enemies: [{ id: 'bones', weight: 1 }] },
      ],
      elites: [],
      specials: [{ id: 'thiefRat', from: 1, every: 1e6 }],
    };
    const w = new World(5);
    (w as { stage: StageDef }).stage = stage;
    w.setView(800, 600);
    w.player.stats.maxHp = w.player.hp = 1e9;
    w.weapons.length = 0;
    return w;
  }

  it('lays a mark about 200 px from the hero, with a sound event, a second before it appears', () => {
    for (const id of ['valmor', 'crypt', 'southRoad'] as const) {
      const w = thiefWorld(id);
      let marked = -1;
      for (let i = 0; i < 4 * 60 && w.alive.thiefRat !== 1; i++) {
        w.step(1 / 60, still);
        if (marked < 0 && w.marks.size > 0) {
          marked = w.time;
          const m = w.marks.active[0]!;
          const d = Math.hypot(m.x - w.player.x, m.y - w.player.y);
          expect(d, id).toBeGreaterThanOrEqual(config.thief.dist * 0.75);
          expect(d, id).toBeLessThanOrEqual(config.thief.dist + 1);
          expect(m.enemy).toBe('thiefRat');
          expect(w.events.some((e) => e.type === 'thiefMark')).toBe(true);
          expect(w.alive.thiefRat ?? 0).toBe(0);
        }
      }
      expect(marked, id).toBeGreaterThan(0);
      expect(w.alive.thiefRat, id).toBe(1);
      expect(w.time - marked, id).toBeGreaterThanOrEqual(config.thief.warn - 0.05);
    }
  });

  it('never appears inside the reach of a blow', () => {
    for (let seed = 1; seed < 20; seed++) {
      const w = thiefWorld();
      (w as { seed: number }).seed = seed;
      for (let i = 0; i < 3 * 60 && w.marks.size === 0; i++) w.step(1 / 60, still);
      const m = w.marks.active[0]!;
      expect(Math.hypot(m.x - w.player.x, m.y - w.player.y)).toBeGreaterThan(150);
    }
  });
});

describe('edge arrow targets (DD-02)', () => {
  const far = (): boolean => false;
  const near = (): boolean => true;

  it('point at a thief only while it is off screen', () => {
    const w = bareWorld();
    spawnEnemy(w, 'thiefRat', 900, 0);
    const out = createTargets();
    expect(arrowTargets(w, far, out)).toBe(1);
    expect(out[0]?.kind).toBe('thief');
    expect(arrowTargets(w, near, out)).toBe(0);
  });

  it('put the thief before any elite', () => {
    const w = bareWorld();
    spawnEnemy(w, 'witch', 800, 0);
    spawnEnemy(w, 'witch', 800, 50);
    spawnEnemy(w, 'witch', 800, 100);
    spawnEnemy(w, 'thiefRat', 900, 0);
    const out = createTargets();
    const n = arrowTargets(w, far, out);
    expect(n).toBe(3);
    expect(out[0]?.kind).toBe('thief');
    expect(out[1]?.kind).toBe('elite');
  });
});
