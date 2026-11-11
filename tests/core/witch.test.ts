import { describe, expect, it } from 'vitest';
import { spawnEnemy, sweepDeadEnemies } from '../../src/core/enemies';
import { BossAct } from '../../src/core/bosses';
import { ENEMIES, type GroundPool } from '../../src/data/enemies';
import { config } from '../../src/data/config';
import { bareWorld, still } from './helpers';

function run(w: ReturnType<typeof bareWorld>, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) w.step(1 / 60, still);
}

const kinds = (w: ReturnType<typeof bareWorld>) =>
  w.marks.active.filter((m) => m.kind === 'poison' || m.kind === 'tar').map((m) => m.kind);

describe('Bruxa do Caldeirão (FT-11)', () => {
  it('lobs a potion that lands where the hero stood, marked all the way, and the pools alternate', () => {
    const w = bareWorld();
    w.player.hp = w.player.stats.maxHp = 1e9;
    const witch = spawnEnemy(w, 'witch', 220, 0);
    witch.hp = witch.maxHp = 1e9;
    witch.brewT = 1e9;
    witch.act = BossAct.Windup;
    witch.actT = 0.01;
    run(w, 0.1);
    const first = w.marks.active.find((m) => m.kind === 'poison');
    expect(first).toBeTruthy();
    // Marked from the start, at the hero's spot, and still a warning (not yet a patch).
    expect(first?.x).toBeCloseTo(0, 0);
    expect(first?.ttl).toBeGreaterThan(0);
    // Hero walks off: it still lands where they stood.
    for (let i = 0; i < 90; i++) w.step(1 / 60, { x: 0, y: 1 });
    expect(first?.ttl).toBe(0);
    expect(w.player.y).toBeGreaterThan(100);
    // Next potion is tar.
    witch.act = BossAct.Windup;
    witch.actT = 0.01;
    run(w, 0.1);
    expect(kinds(w)).toContain('tar');
  });

  it('poison hurts inside on its tick, tar only slows, and both dry up', () => {
    const w = bareWorld();
    const [poison, tar] = ENEMIES.witch.shoot.lob.pools as [GroundPool, GroundPool];
    const hp = w.player.hp;
    // A poison patch and a tar patch under the hero, already landed.
    const witch = spawnEnemy(w, 'witch', 3000, 0);
    witch.brewT = 1e9;
    witch.hp = witch.maxHp = 1e9;
    witch.actT = 1e9;
    const base = ENEMIES.witch.damage * w.stage.mult.damage;
    const add = (kind: 'poison' | 'tar', r: number, slow: number, dmg: number) => {
      const m = w.marks.acquire();
      m.kind = kind;
      m.x = 0;
      m.y = 0;
      m.radius = r;
      m.ttl = 0;
      m.total = 1;
      m.life = 4;
      m.slow = slow;
      m.damage = dmg;
      m.tick = config.marks.poolTick;
    };
    add('poison', poison.radius, 1, base * (poison.hit ?? 0));
    run(w, 1.2);
    expect(w.player.hp).toBeLessThan(hp);
    expect(w.hurtBy.ground).toBeGreaterThan(0);
    w.marks.clear();
    const hp2 = w.player.hp;
    add('tar', tar.radius, tar.slow ?? 1, 0);
    w.step(1 / 60, { x: 1, y: 0 });
    const x1 = w.player.x;
    expect(x1).toBeGreaterThan(0);
    expect(x1).toBeLessThan((config.player.stats.moveSpeed / 60) * 0.7);
    run(w, 4.5);
    expect(w.marks.size).toBe(0);
    expect(w.player.hp).toBe(hp2);
  });

  it('brew heals and rallies only the ones within its reach', () => {
    const w = bareWorld();
    w.player.hp = w.player.stats.maxHp = 1e9;
    const witch = spawnEnemy(w, 'witch', 0, 300);
    witch.hp = witch.maxHp = 1e9;
    witch.actT = 1e9;
    const near = spawnEnemy(w, 'skeleton', 60, 300);
    const far = spawnEnemy(w, 'skeleton', 0, 300 + ENEMIES.witch.brew.radius + 80);
    near.hp = near.maxHp / 2;
    far.hp = far.maxHp / 2;
    witch.brewT = 0.01;
    run(w, 0.1);
    expect(witch.stir).toBeGreaterThan(0);
    run(w, ENEMIES.witch.brew.windup + 0.1);
    expect(near.hp).toBeCloseTo(near.maxHp * (0.5 + ENEMIES.witch.brew.heal), 5);
    expect(near.rally).toBeGreaterThan(0);
    expect(far.hp).toBeCloseTo(far.maxHp / 2, 5);
    expect(far.rally).toBe(0);
  });

  it('leaves a chest and an Elixir, and the Elixir heals half and speeds the weapons up', () => {
    const w = bareWorld();
    const witch = spawnEnemy(w, 'witch', 5, 0);
    witch.dead = true;
    sweepDeadEnemies(w);
    const types = w.pickups.active.map((p) => p.type);
    expect(types).toContain('chest');
    expect(types).toContain('elixir');
    w.player.hp = 10;
    w.step(1 / 60, still);
    expect(w.player.hp).toBeGreaterThanOrEqual(10 + w.player.stats.maxHp * config.pickups.elixirHeal - 1);
    expect(w.haste).toBeGreaterThan(config.pickups.elixirTime - 1);
  });
});
