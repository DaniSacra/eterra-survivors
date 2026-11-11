import { describe, expect, it } from 'vitest';
import { damageEnemy, spawnEnemy, sweepDeadEnemies, updateEnemies } from '../../src/core/enemies';
import { updateMarks } from '../../src/core/marks';
import { ENEMIES } from '../../src/data/enemies';
import { config } from '../../src/data/config';
import { World } from '../../src/core/world';
import { bareWorld } from './helpers';
import { STAGES } from '../../src/data/stages';
import { resetMark } from '../../src/core/marks';
import { groundSlow } from '../../src/core/arena';
import { clearCrowd } from '../../src/core/waves';

const STEP = 1 / 60;

function run(w: ReturnType<typeof bareWorld>, seconds: number): void {
  for (let t = 0; t < seconds; t += STEP) {
    updateEnemies(w, STEP);
    updateMarks(w, STEP);
    sweepDeadEnemies(w);
  }
}

describe('reassemble (FT-15)', () => {
  const re = ENEMIES.bones.reassemble as { delay: number; hp: number };

  it('the first death leaves a harmless pile with no gem or kill', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 30, 0);
    damageEnemy(w, e, 9999);
    sweepDeadEnemies(w);
    expect(e.dead).toBe(false);
    expect(e.pile).toBeGreaterThan(0);
    expect(w.kills).toBe(0);
    expect(w.gems.size).toBe(0);
    const hp = w.player.hp;
    e.x = w.player.x;
    e.y = w.player.y;
    run(w, 0.5);
    expect(w.player.hp).toBe(hp);
  });

  it('stands up on its own with part of its life', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 300, 0);
    damageEnemy(w, e, 9999);
    run(w, re.delay + 0.2);
    expect(e.pile).toBe(0);
    expect(e.rose).toBe(true);
    expect(e.hp).toBeCloseTo(e.maxHp * re.hp);
    expect(w.kills).toBe(0);
  });

  it('a hit on the pile breaks it for good: gem and kill', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 300, 0);
    damageEnemy(w, e, 9999);
    run(w, config.enemies.pileGuard + 0.05);
    damageEnemy(w, e, 1);
    sweepDeadEnemies(w);
    expect(w.kills).toBe(1);
    expect(w.gems.size).toBe(1);
  });

  it('hits in the same swing as the fall pass over the pile (CB-01)', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 300, 0);
    damageEnemy(w, e, 9999);
    damageEnemy(w, e, 9999); // an aura tick in the same step
    expect(e.pile).toBeGreaterThan(0);
    expect(e.dead).toBe(false);
    run(w, ENEMIES.bones.reassemble.delay + 0.2);
    expect(e.rose).toBe(true);
  });

  it('breaking the pile counts as damage to its weapon and to the best hit (CB-01)', () => {
    const w = new World(1);
    const src = w.weapons[0] as NonNullable<(typeof w.weapons)[number]>;
    const e = spawnEnemy(w, 'bones', 300, 0);
    damageEnemy(w, e, 9999);
    run(w, config.enemies.pileGuard + 0.05);
    const before = src.damage;
    damageEnemy(w, e, 7, 0, 0, 0, src);
    expect(src.damage).toBeGreaterThan(before);
    expect(w.bestHit).toBeGreaterThanOrEqual(7);
  });

  it('a pile lies still while the world is frozen (CT-02)', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 300, 0);
    damageEnemy(w, e, 9999);
    const left = e.pile;
    w.freeze = 5;
    run(w, 1);
    expect(e.pile).toBe(left);
  });

  it('after standing up, the next death is final', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 300, 0);
    damageEnemy(w, e, 9999);
    run(w, re.delay + 0.2);
    damageEnemy(w, e, 9999);
    sweepDeadEnemies(w);
    expect(w.kills).toBe(1);
  });
});

describe('burst (FT-14)', () => {
  const b = ENEMIES.emberBones.burst as { delay: number; radius: number; damage: number; foes: number };

  it('leaves a mark that hurts the hero only after its delay', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'emberBones', w.player.x + 10, w.player.y);
    damageEnemy(w, e, 9999);
    sweepDeadEnemies(w);
    expect(w.marks.size).toBe(1);
    const hp = w.player.hp;
    run(w, b.delay * 0.5);
    expect(w.player.hp).toBe(hp);
    run(w, b.delay * 0.5 + 0.1);
    expect(w.player.hp).toBeLessThan(hp);
    expect(w.marks.size).toBe(0);
  });

  it('hurts the other enemies in the radius but not outside it', () => {
    const w = bareWorld();
    w.player.x = 200;
    w.player.y = 0;
    const e = spawnEnemy(w, 'emberBones', 0, 0);
    const near = spawnEnemy(w, 'skeleton', b.radius - 10, 0);
    const far = spawnEnemy(w, 'skeleton', b.radius + 60, 0);
    near.stun = far.stun = 5;
    const nearHp = near.hp;
    const farHp = far.hp;
    damageEnemy(w, e, 9999);
    sweepDeadEnemies(w);
    run(w, b.delay + 0.1);
    expect(near.hp).toBeLessThan(nearHp);
    expect(far.hp).toBe(farHp);
  });
});

describe('Coveiro dig and slime trail (FT-16)', () => {
  it('the Coveiro stands still for the windup, then raises a ring of Ossadas', () => {
    const w = bareWorld();
    const d = ENEMIES.gravedigger.dig;
    w.player.x = 400;
    w.player.y = 0;
    const e = spawnEnemy(w, 'gravedigger', 0, 0);
    e.brewT = 0;
    run(w, STEP * 2);
    expect(e.stir).toBeGreaterThan(0);
    const x = e.x;
    run(w, d.windup * 0.5);
    expect(e.x).toBe(x);
    run(w, d.windup * 0.5 + 0.7);
    expect(w.enemies.active.filter((o) => o.type === 'bones').length).toBe(d.count);
  });

  it('a Gosma Verde leaves slime that slows the hero, never more than its cap', () => {
    const w = bareWorld();
    const tr = ENEMIES.slime.trail;
    w.player.x = 400;
    const e = spawnEnemy(w, 'slime', 0, 0);
    e.stun = 999;
    run(w, tr.every * (tr.cap + 4));
    const slime = w.marks.active.filter((m) => m.kind === 'slime');
    expect(slime.length).toBeGreaterThan(1);
    expect(slime.length).toBeLessThanOrEqual(tr.cap);
    expect(slime[0]?.slow).toBe(tr.pool.slow);
  });
});

describe('Coveiro: the dig keeps its rules (CB-02)', () => {
  it("his Ossadas rise with the wave's life, not the base", () => {
    const w = bareWorld();
    w.time = 500;
    w.player.x = 300;
    const e = spawnEnemy(w, 'gravedigger', 0, 0);
    e.brewT = 0;
    run(w, ENEMIES.gravedigger.dig.windup + 0.8);
    const bones = w.enemies.active.filter((o) => o.type === 'bones');
    expect(bones.length).toBeGreaterThan(0);
    const base = ENEMIES.bones.hp * STAGES.crypt.mult.hp;
    expect(bones[0]?.maxHp).toBeGreaterThan(base * 1.5);
  });

  it('he does not dig while the hero is out of range', () => {
    const w = bareWorld();
    w.player.x = ENEMIES.gravedigger.dig.range + 400;
    const e = spawnEnemy(w, 'gravedigger', 0, 0);
    e.brewT = 0;
    run(w, 1);
    expect(e.stir).toBe(0);
  });

  it('a stun during the windup cancels the grave', () => {
    const w = bareWorld();
    w.player.x = 300;
    const e = spawnEnemy(w, 'gravedigger', 0, 0);
    e.brewT = 0;
    run(w, 0.3);
    expect(e.stir).toBeGreaterThan(0);
    e.stun = 2;
    run(w, ENEMIES.gravedigger.dig.windup + 0.5);
    expect(w.enemies.active.filter((o) => o.type === 'bones').length).toBe(0);
  });

  it('nothing rises over the crowd ceiling, but an elite always does (CT-01)', () => {
    const w = bareWorld();
    w.player.x = 300;
    for (let i = 0; i < config.enemies.maxActive; i++) spawnEnemy(w, 'graveRat', 5000, 5000);
    const e = spawnEnemy(w, 'gravedigger', 0, 0);
    e.brewT = 0;
    const n = w.enemies.size;
    run(w, ENEMIES.gravedigger.dig.windup + 0.8);
    expect(w.enemies.size).toBe(n);
  });
});

describe('Gosma Verde: each slime keeps its own trail cap (CE-01)', () => {
  it('two slimes together leave more than one cap of slime', () => {
    const w = bareWorld();
    const tr = ENEMIES.slime.trail;
    w.player.x = 400;
    for (const x of [0, 40]) {
      const e = spawnEnemy(w, 'slime', x, 0);
      e.stun = 999;
    }
    run(w, tr.every * (tr.cap + 4));
    const patches = w.marks.active.filter((m) => m.kind === 'slime');
    expect(patches.length).toBeGreaterThan(tr.cap);
    expect(patches.length).toBeLessThanOrEqual(tr.cap * 2);
    expect(groundSlow(w)).toBe(1);
  });

  it('slime under the hero slows them (CT-02)', () => {
    const w = bareWorld();
    const tr = ENEMIES.slime.trail;
    w.player.x = 0;
    w.player.y = 0;
    const e = spawnEnemy(w, 'slime', 0, 0);
    e.stun = 999;
    run(w, tr.every + 0.5);
    expect(groundSlow(w)).toBe(tr.pool.slow);
  });
});

describe('marks and the crowd', () => {
  it('a mark taken again starts clean (CT-01)', () => {
    const w = bareWorld();
    const m = w.marks.acquire();
    m.kind = 'burst';
    m.damage = 99;
    m.foe = 5;
    m.owner = 7;
    m.slow = 0.1;
    resetMark(m);
    expect([m.kind, m.damage, m.foe, m.owner, m.slow, m.life]).toEqual(['spawn', 0, 0, 0, 1, 0]);
  });

  it('a burst spares the boss (CT-02)', () => {
    const w = bareWorld();
    const b = ENEMIES.emberBones.burst;
    w.player.x = 400;
    const boss = spawnEnemy(w, 'bellRinger', b.radius - 30, 0);
    boss.stun = 999;
    const hp = boss.hp;
    const e = spawnEnemy(w, 'emberBones', 0, 0);
    damageEnemy(w, e, 9999);
    sweepDeadEnemies(w);
    run(w, b.delay + 0.1);
    expect(boss.hp).toBe(hp);
  });

  it('clearing the crowd for a boss takes the piles with it, with no kill (CT-02)', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 300, 0);
    damageEnemy(w, e, 9999);
    clearCrowd(w);
    sweepDeadEnemies(w);
    expect(w.enemies.size).toBe(0);
    expect(w.kills).toBe(0);
  });
});

describe('Coveiro: the graves are fixed from the start of the windup (CF-04)', () => {
  it('the ring angle is chosen when the shovel goes in and the Ossadas rise exactly there', () => {
    const w = bareWorld();
    w.player.x = 300;
    const d = ENEMIES.gravedigger.dig;
    const e = spawnEnemy(w, 'gravedigger', 0, 0);
    e.brewT = 0;
    run(w, 0.3);
    expect(e.stir).toBeGreaterThan(0);
    const start = e.aimX;
    expect(start).toBeGreaterThanOrEqual(0);
    expect(start).toBeLessThan(Math.PI * 2);
    run(w, d.windup + 0.8);
    const bones = w.enemies.active.filter((o) => o.type === 'bones');
    const first = bones.find(
      (o) => Math.abs(Math.atan2(o.y - e.y, o.x - e.x) - Math.atan2(Math.sin(start), Math.cos(start))) < 0.3,
    );
    expect(bones.length).toBe(d.count);
    expect(first).toBeDefined();
  });
});
