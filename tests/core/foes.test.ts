import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { fireEnemyShot } from '../../src/core/enemyShots';
import { riseAt } from '../../src/core/marks';
import { Spawner } from '../../src/core/waves';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { ENEMIES, type EnemyDef } from '../../src/data/enemies';
import { STAGES, type StageDef } from '../../src/data/stages';
import { bareWorld, still } from './helpers';

/** The base the new enemies stand on (FT-01, FT-02): shots, marks, caps, specials, loot and the damage metric. */
describe('enemy shots', () => {
  it('fly straight, hurt only the hero, and count as "shot"', () => {
    const w = bareWorld();
    w.setView(800, 600);
    expect(fireEnemyShot(w, 200, 0, 0, 0, 150, 5, 3, 7)).toBe(true);
    const hp = w.player.hp;
    for (let i = 0; i < 120 && w.enemyShots.size > 0; i++) w.step(1 / 60, still);
    expect(w.enemyShots.size).toBe(0);
    expect(w.player.hp).toBeLessThan(hp);
    expect(w.hurtBy.shot).toBeGreaterThan(0);
    expect(w.hurtBy.contact).toBe(0);
  });

  it('never go over their cap, and die at the end of their life', () => {
    const w = bareWorld();
    for (let i = 0; i < config.enemyShots.max + 10; i++) fireEnemyShot(w, 500, 500, 600, 600, 100, 4, 0.5, 1);
    expect(w.enemyShots.size).toBe(config.enemyShots.max);
    for (let i = 0; i < 40; i++) w.step(1 / 60, still);
    expect(w.enemyShots.size).toBe(0);
  });

  it('stand still while the world is frozen', () => {
    const w = bareWorld();
    fireEnemyShot(w, 300, 0, 0, 0, 150, 5, 3, 7);
    w.freeze = 1;
    w.step(1 / 60, still);
    expect(w.enemyShots.active[0]!.x).toBe(300);
  });
});

describe('spawn marks (FT-02)', () => {
  it('in view: a mark first, never within spawnMinDist of the hero, then the enemy', () => {
    const w = bareWorld();
    w.setView(800, 600);
    expect(riseAt(w, 'bones', 10, 0)).toBe(true);
    expect(w.enemies.size).toBe(0);
    const m = w.marks.active[0]!;
    expect(Math.hypot(m.x - w.player.x, m.y - w.player.y)).toBeGreaterThanOrEqual(
      config.marks.spawnMinDist - 1e-6,
    );
    for (let t = 0; t < config.marks.spawnTime - 0.05; t += 1 / 60) w.step(1 / 60, still);
    expect(w.enemies.size).toBe(0);
    for (let i = 0; i < 6; i++) w.step(1 / 60, still);
    expect(w.marks.size).toBe(0);
    expect(w.enemies.size).toBe(1);
  });

  it('out of view: straight away', () => {
    const w = bareWorld();
    w.setView(800, 600);
    riseAt(w, 'bones', 2000, 0);
    expect(w.enemies.size).toBe(1);
    expect(w.marks.size).toBe(0);
  });
});

describe('caps and specials', () => {
  it('counts the living per type', () => {
    const w = bareWorld();
    const a = spawnEnemy(w, 'bones', 300, 0);
    spawnEnemy(w, 'bones', 320, 0);
    expect(w.alive.bones).toBe(2);
    a.dead = true;
    w.step(1 / 60, still);
    expect(w.alive.bones).toBe(1);
  });

  it('a type at its max is replaced by the segment basic, and specials come on schedule under their max', () => {
    const def = ENEMIES.bat as EnemyDef;
    const stage: StageDef = {
      ...STAGES.valmor,
      waves: [
        {
          from: 0,
          interval: 0.1,
          batch: 1,
          hpMult: 1,
          damage: 1,
          enemies: [
            { id: 'bones', weight: 0 },
            { id: 'bat', weight: 1 },
          ],
        },
      ],
      elites: [],
      specials: [{ id: 'skeleton', from: 1, every: 2 }],
    };
    const w = new World(3);
    (w as { stage: StageDef }).stage = stage;
    w.player.stats.maxHp = w.player.hp = 1e9;
    w.weapons.length = 0;
    (def as { max?: number }).max = 3;
    try {
      for (let t = 0; t < 4.05; t += 1 / 60) w.step(1 / 60, still);
    } finally {
      delete (def as { max?: number }).max;
    }
    expect(w.alive.bat).toBe(3);
    expect(w.alive.bones ?? 0).toBeGreaterThan(10);
    // Specials at 1 and 3 s.
    expect(w.alive.skeleton).toBe(2);
  });

  it('a new spawner starts with no specials sent', () => {
    expect(new Spawner().bossSpawned).toBe(false);
  });
});

describe('loot', () => {
  it('an enemy with loot leaves its coins (and an item) where it falls', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 400, 0);
    e.def = { ...e.def, loot: { gold: 15, item: true } };
    e.dead = true;
    w.step(1 / 60, still);
    const coins = w.pickups.active.filter((p) => p.type === 'gold').length;
    expect(coins).toBe(Math.round(15 / config.gold.coin));
    expect(w.pickups.active.some((p) => p.type !== 'gold')).toBe(true);
  });
});

/** A crowd of 200 bones around (cx, cy), out of the way of the hero at the origin. */
function crowd(w: World, cx: number, cy: number): void {
  for (let i = 0; i < 200; i++) {
    const e = spawnEnemy(w, 'bones', cx + (i % 20) * 22, cy + Math.floor(i / 20) * 22);
    e.def = { ...e.def, speed: 0 };
  }
}

describe("the road's hunters (FT-03 to FT-06)", () => {
  it('a thrower holds its distance, throws on its rhythm, and not while stunned', () => {
    const w = bareWorld();
    w.setView(900, 700);
    w.player.stats.maxHp = w.player.hp = 1e6;
    crowd(w, -600, 300);
    const g = spawnEnemy(w, 'goblin', 400, 0);
    const sh = ENEMIES.goblin.shoot;
    let shots = 0;
    let before = 0;
    for (let t = 0; t < 12; t += 1 / 60) {
      w.step(1 / 60, still);
      if (w.enemyShots.size > before) shots++;
      before = w.enemyShots.size;
    }
    const d = Math.hypot(g.x - w.player.x, g.y - w.player.y);
    expect(d).toBeGreaterThan(sh.keep - 20);
    expect(d).toBeLessThan(sh.range + 40);
    expect(shots).toBeGreaterThanOrEqual(2);
    expect(shots).toBeLessThanOrEqual(5);
    // Stunned: no shot.
    w.enemyShots.clear();
    for (let t = 0; t < 8; t += 1 / 60) {
      g.stun = 1;
      w.step(1 / 60, still);
    }
    expect(w.enemyShots.size).toBe(0);
  });

  it('a leaper warns for windup + air, and its landing hurts only within its radius', () => {
    const leapIn = (heroDx: number) => {
      const w = bareWorld();
      w.setView(900, 700);
      crowd(w, -700, 300);
      const c = spawnEnemy(w, 'crow', 150, 0);
      const lp = ENEMIES.crow.leap;
      c.actT = 0;
      w.step(1 / 60, still); // marks the spot
      expect(c.act).toBe(1); // windup
      const hp = w.player.hp;
      w.player.x = heroDx;
      for (let t = 0; t < lp.windup + lp.air - 0.05; t += 1 / 60) w.step(1 / 60, still);
      expect(w.player.hp).toBe(hp); // nothing before it lands
      for (let i = 0; i < 8; i++) w.step(1 / 60, still);
      return { hit: w.player.hp < hp, leap: w.hurtBy.leap };
    };
    expect(leapIn(0).hit).toBe(true);
    expect(leapIn(0).leap).toBeGreaterThan(0);
    expect(leapIn(ENEMIES.crow.leap.radius + 40).hit).toBe(false);
  });

  it('two wolves of the pack come in from opposite sides', () => {
    const w = bareWorld();
    w.setView(900, 700);
    crowd(w, -700, 300);
    const a = spawnEnemy(w, 'frostWolf', 0, -500);
    const b = spawnEnemy(w, 'frostWolf', 0, -500);
    expect((a.uid & 1) !== (b.uid & 1)).toBe(true);
    for (let i = 0; i < 60; i++) w.step(1 / 60, still);
    expect(Math.sign(a.x)).toBe(-Math.sign(b.x));
  });

  it('a banner rallies those near it, not those far, and its fall ends it; it drops its loot', () => {
    const w = bareWorld();
    w.setView(900, 700);
    w.player.stats.maxHp = w.player.hp = 1e6;
    const banner = spawnEnemy(w, 'warBanner', 400, 0);
    const near = spawnEnemy(w, 'skeleton', 450, 0);
    const far = spawnEnemy(w, 'skeleton', -400, 0);
    for (const e of [near, far]) e.def = { ...e.def, speed: 0 };
    for (let i = 0; i < 30; i++) w.step(1 / 60, still);
    expect(near.rally).toBeGreaterThan(0);
    expect(far.rally).toBe(0);
    banner.dead = true;
    for (let i = 0; i < 30; i++) w.step(1 / 60, still);
    expect(near.rally).toBeLessThanOrEqual(0);
    expect(w.pickups.active.filter((p) => p.type === 'gold').length).toBeGreaterThan(0);
  });
});
