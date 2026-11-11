import { describe, expect, it } from 'vitest';
import { spawnEnemy, spawnOnRing, updateEnemies } from '../../src/core/enemies';
import { addGold } from '../../src/core/pickups';
import { blockCircle, obstacleAt, scatterOf, spawnPoint, type Obstacle } from '../../src/core/terrain';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { ENEMIES } from '../../src/data/enemies';
import { STAGES, type StageLayout } from '../../src/data/stages';

type Obstacles = Extract<StageLayout, { kind: 'obstacles' }>;
const crypt = STAGES.crypt.layout as Obstacles;
const road = STAGES.southRoad.layout as Extract<StageLayout, { kind: 'corridor' }>;

function stageWorld(stage: 'valmor' | 'crypt' | 'southRoad', seed = 3): World {
  const w = new World(seed, { stage });
  w.spawner.update = () => {};
  w.weapons.length = 0;
  w.player.stats.maxHp = w.player.hp = 1e6;
  return w;
}

/** The first obstacle found outside the clear area, scanning cells to the right. */
function firstObstacle(seed: number): Obstacle {
  const ob: Obstacle = { x: 0, y: 0, r: 0, kind: 0 };
  for (let cx = 0; cx < 50; cx++)
    for (let cy = -3; cy <= 3; cy++) if (obstacleAt(seed, crypt, cx, cy, ob)) return ob;
  throw new Error('no obstacle');
}

describe('Cripta: obstacles', () => {
  it('the same seed builds the same crypt; another seed, another one', () => {
    const a: Obstacle = { x: 0, y: 0, r: 0, kind: 0 };
    const b: Obstacle = { x: 0, y: 0, r: 0, kind: 0 };
    let same = 0;
    let differ = 0;
    for (let cx = -20; cx < 20; cx++)
      for (let cy = -20; cy < 20; cy++) {
        expect(obstacleAt(5, crypt, cx, cy, a)).toBe(obstacleAt(5, crypt, cx, cy, b));
        if (obstacleAt(5, crypt, cx, cy, a) && obstacleAt(5, crypt, cx, cy, b)) {
          expect(a).toEqual(b);
          same++;
        }
        if (obstacleAt(5, crypt, cx, cy, a) !== obstacleAt(6, crypt, cx, cy, b)) differ++;
      }
    expect(same).toBeGreaterThan(100);
    expect(differ).toBeGreaterThan(50);
  });

  it('moderate density, nothing near the start, each one inside its cell', () => {
    const ob: Obstacle = { x: 0, y: 0, r: 0, kind: 0 };
    let n = 0;
    const cells = 60 * 60;
    for (let cx = -30; cx < 30; cx++)
      for (let cy = -30; cy < 30; cy++) {
        if (!obstacleAt(9, crypt, cx, cy, ob)) continue;
        n++;
        expect(Math.hypot(ob.x, ob.y)).toBeGreaterThan(crypt.clear);
        expect(ob.x - ob.r).toBeGreaterThanOrEqual(cx * crypt.cell);
        expect(ob.x + ob.r).toBeLessThanOrEqual((cx + 1) * crypt.cell);
      }
    expect(n / cells).toBeGreaterThan(crypt.chance * 0.85);
    expect(n / cells).toBeLessThan(crypt.chance * 1.1);
  });

  it('blocks the hero, who slides along the edge instead of stopping', () => {
    const w = stageWorld('crypt');
    const ob = firstObstacle(w.seed);
    const r = config.player.radius;
    // Walking right into it, a little above its centre.
    w.player.x = ob.x - ob.r - r - 30;
    w.player.y = ob.y - 4;
    for (let i = 0; i < 60; i++) {
      w.step(1 / 60, { x: 1, y: 0 });
      expect(Math.hypot(w.player.x - ob.x, w.player.y - ob.y)).toBeGreaterThanOrEqual(ob.r + r - 0.01);
    }
    // It got around (went up past the obstacle), not stuck at its left side.
    expect(w.player.x).toBeGreaterThan(ob.x);
  });

  it('blocks the enemies too, but not the shots', () => {
    const w = stageWorld('crypt');
    const ob = firstObstacle(w.seed);
    w.player.x = ob.x + 200;
    w.player.y = ob.y;
    const e = spawnEnemy(w, 'skeleton', ob.x - ob.r - 20, ob.y + 2);
    for (let i = 0; i < 120; i++) {
      updateEnemies(w, 1 / 60);
      expect(Math.hypot(e.x - ob.x, e.y - ob.y)).toBeGreaterThanOrEqual(ob.r + e.def.radius - 0.01);
    }
    expect(e.x).toBeGreaterThan(ob.x); // walked around it
    w.addWeapon('daggers');
    w.player.x = ob.x - 120;
    w.player.y = ob.y;
    w.player.facing.x = 1;
    w.player.facing.y = 0;
    w.step(1 / 60, { x: 0, y: 0 });
    const shot = w.projectiles.active[0]!;
    for (let i = 0; i < 20 && !shot.dead; i++) w.step(1 / 60, { x: 0, y: 0 });
    expect(shot.x).toBeGreaterThan(ob.x); // flew over it
  });

  it('Valmor has no obstacles', () => {
    const w = stageWorld('valmor');
    const p = { x: 123, y: 456 };
    blockCircle(w, p, 10);
    expect(p).toEqual({ x: 123, y: 456 });
  });
});

describe('Estrada do Sul: the road between the forests', () => {
  it('nobody leaves the road', () => {
    const w = stageWorld('southRoad');
    for (let i = 0; i < 300; i++) w.step(1 / 60, { x: 1, y: 0 });
    expect(w.player.x).toBeCloseTo(road.width / 2 - config.player.radius);
    const e = spawnEnemy(w, 'skeleton', -road.width, 0);
    updateEnemies(w, 1 / 60);
    expect(e.x).toBeGreaterThanOrEqual(-road.width / 2 + e.def.radius - 0.01);
  });

  it('enemies come from both ends, and some out of the forest at the sides', () => {
    const w = stageWorld('southRoad');
    let ends = 0;
    let up = 0;
    let sides = 0;
    for (let i = 0; i < 2000; i++) {
      const e = spawnOnRing(w, 'skeleton');
      expect(Math.abs(e.x)).toBeLessThanOrEqual(road.width / 2);
      if (Math.abs(e.y - w.player.y) > w.view.h / 2) {
        ends++;
        if (e.y < w.player.y) up++;
      } else sides++;
      e.dead = true;
      w.enemies.releaseWhere((x) => x.dead);
    }
    expect(sides / 2000).toBeGreaterThan(road.sides * 0.75);
    expect(sides / 2000).toBeLessThan(road.sides * 1.25);
    expect(up / ends).toBeGreaterThan(0.4);
    expect(up / ends).toBeLessThan(0.6);
  });

  it('an enemy left far behind comes back at the end ahead', () => {
    const w = stageWorld('southRoad');
    const out = { x: 0, y: 0 };
    spawnPoint(w, -Math.PI / 2, out); // heading north (up)
    expect(out.y).toBeLessThan(w.player.y - w.view.h / 2);
  });
});

describe('stage multipliers', () => {
  it('scale enemy HP, contact damage and speed, and the gold picked up', () => {
    const v = stageWorld('valmor');
    const c = stageWorld('crypt');
    const m = STAGES.crypt.mult;
    const b = STAGES.valmor.mult;
    const ev = spawnEnemy(v, 'skeleton', 300, 0, 2);
    const ec = spawnEnemy(c, 'skeleton', 300, 0, 2);
    expect(ec.maxHp).toBeCloseTo((ev.maxHp * m.hp) / b.hp);
    expect(ev.maxHp).toBeCloseTo(ENEMIES.skeleton.hp * 2 * b.hp);
    // Speed: the same walk for one frame, farther in the crypt.
    v.player.x = c.player.x = 0;
    updateEnemies(v, 1 / 60);
    updateEnemies(c, 1 / 60);
    expect(300 - ec.x).toBeCloseTo(((300 - ev.x) * m.speed) / b.speed);
    // Contact damage.
    for (const w of [v, c]) {
      const e = spawnEnemy(w, 'skeleton', w.player.x, w.player.y);
      e.def = { ...e.def, damage: 40 };
      w.player.stats.armor = 0;
      w.player.hp = 1000;
      updateEnemies(w, 1 / 60);
    }
    expect(1000 - c.player.hp).toBeCloseTo(((1000 - v.player.hp) * m.damage) / STAGES.valmor.mult.damage);
    // Gold.
    addGold(v, 100);
    addGold(c, 100);
    expect(c.gold).toBe(Math.round((v.gold * m.gold) / b.gold));
  });

  it('spawn density: more enemies per batch on average', () => {
    const count = (stage: 'valmor' | 'southRoad') => {
      const w = new World(4, { stage });
      w.player.stats.maxHp = w.player.hp = 1e9;
      w.weapons.length = 0;
      let n = 0;
      for (let i = 0; i < 60 * 40; i++) {
        w.step(1 / 60, { x: 0, y: 0 });
        n = Math.max(n, w.nextUid);
      }
      return n;
    };
    const ratio = count('southRoad') / count('valmor');
    expect(ratio).toBeGreaterThan(STAGES.southRoad.mult.spawn * 0.85);
    expect(ratio).toBeLessThan(STAGES.southRoad.mult.spawn * 1.15);
  });
});

describe('obstacles never wall the hero in', () => {
  it.each(['valmor', 'crypt', 'southRoad'] as const)(
    '%s: neighbours leave a gap the hero fits through',
    (stage) => {
      const layout = STAGES[stage].layout;
      const scatter = scatterOf(layout);
      expect(scatter).toBeDefined();
      const found: Obstacle[] = [];
      for (let cx = -12; cx <= 12; cx++)
        for (let cy = -12; cy <= 12; cy++) {
          const o: Obstacle = { x: 0, y: 0, r: 0, kind: 0 };
          if (obstacleAt(9, scatter!, cx, cy, o)) found.push(o);
        }
      expect(found.length).toBeGreaterThan(0);
      for (let i = 0; i < found.length; i++)
        for (let j = i + 1; j < found.length; j++) {
          const a = found[i]!;
          const b = found[j]!;
          const gap = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
          expect(gap).toBeGreaterThan(2 * config.player.radius);
        }
    },
  );
});
