import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { segmentAt } from '../../src/core/waves';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { ENEMIES, type EnemyDef } from '../../src/data/enemies';
import { STAGES, STAGE_IDS } from '../../src/data/stages';

const WAVES = STAGES.valmor.waves;

describe('stages', () => {
  it.each(STAGE_IDS)('%s: waves sorted from 0, known enemies, elites and a boss at the end', (id) => {
    const s = STAGES[id];
    expect(s.waves[0]!.from).toBe(0);
    for (let i = 1; i < s.waves.length; i++) expect(s.waves[i]!.from).toBeGreaterThan(s.waves[i - 1]!.from);
    for (const w of s.waves)
      for (const e of w.enemies) {
        const def: EnemyDef = ENEMIES[e.id];
        expect(def.boss || def.elite).toBeFalsy();
      }
    for (const el of s.elites) expect((ENEMIES[el.id] as EnemyDef).elite).toBe(true);
    expect((ENEMIES[s.boss.id] as EnemyDef).boss).toBe(true);
    expect(s.boss.at).toBe(config.matchDuration);
  });

  it('Valmor keeps the Cavaleiro Negro as its boss', () => {
    expect(STAGES.valmor.boss.id).toBe('blackKnight');
  });
});

describe('waves', () => {
  it('picks the segment that has started', () => {
    expect(segmentAt(0, WAVES)).toBe(WAVES[0]);
    expect(segmentAt(WAVES[1]!.from + 0.1, WAVES)).toBe(WAVES[1]);
    expect(segmentAt(99999, WAVES)).toBe(WAVES[WAVES.length - 1]);
  });

  it('spawns more enemies over time', () => {
    const count = (seconds: number) => {
      const w = new World(1);
      w.time = seconds;
      w.player.stats.maxHp = w.player.hp = 1e9;
      for (let i = 0; i < 60 * 5; i++) w.spawner.update(w, 1 / 60);
      return w.enemies.size;
    };
    expect(count(500)).toBeGreaterThan(count(0) * 3);
  });

  it('never exceeds the enemy cap', () => {
    const w = new World(1);
    w.time = 550;
    for (let i = 0; i < 60 * 60; i++) w.spawner.update(w, 1 / 60);
    expect(w.enemies.size).toBeLessThanOrEqual(config.enemies.maxActive + 1);
  });

  it.each(STAGE_IDS)('%s: spawns its own cast and boss, and killing the boss wins', (id) => {
    const w = new World(1, { stage: id });
    w.time = STAGES[id].boss.at - 30;
    w.player.stats.maxHp = w.player.hp = 1e9;
    w.weapons.length = 0;
    for (let i = 0; i < 60 * 31; i++) w.step(1 / 60, { x: 0, y: 0 });
    const cast = new Set(STAGES[id].waves.flatMap((s) => s.enemies.map((e) => e.id)));
    for (const e of w.enemies.active) if (!e.def.boss && !e.def.elite) expect(cast.has(e.type)).toBe(true);
    expect(w.boss?.type).toBe(STAGES[id].boss.id);
    expect(w.events).toContainEqual({ type: 'bossSpawned' });
    w.boss!.dead = true;
    w.step(1 / 60, { x: 0, y: 0 });
    expect(w.state).toBe('won');
  });
  it('the common crowd leaves when the boss arrives: no kills, no gems; elites stay', () => {
    const w = new World(1);
    w.player.stats.maxHp = w.player.hp = 1e9;
    w.weapons.length = 0;
    for (let i = 0; i < 20; i++) spawnEnemy(w, 'skeleton', 300 + i * 5, 0);
    spawnEnemy(w, STAGES.valmor.elites[0]!.id, -300, 0);
    w.time = STAGES.valmor.boss.at - 1 / 120;
    const kills = w.kills;
    w.step(1 / 60, { x: 0, y: 0 });
    expect(w.boss).not.toBeNull();
    expect(w.kills).toBe(kills);
    expect(w.gems.size).toBe(0);
    const left = w.enemies.active.filter((e) => !e.def.boss);
    expect(left.length).toBeGreaterThan(0);
    expect(left.every((e) => e.def.elite)).toBe(true);
  });

  it('a boss bites as hard late as early: the wave damage ramp skips it', () => {
    const bite = (enemyDamage: number) => {
      const w = new World(1);
      w.spawner.update = () => {};
      w.weapons.length = 0;
      w.player.stats.maxHp = w.player.hp = 1e4;
      w.player.stats.armor = 0;
      const b = spawnEnemy(w, 'blackKnight', w.player.x + 1, w.player.y);
      b.actT = 1e9;
      w.enemyDamage = enemyDamage;
      w.step(1 / 60, { x: 0, y: 0 });
      return 1e4 - w.player.hp;
    };
    expect(bite(1)).toBeGreaterThan(0);
    expect(bite(4.8)).toBeCloseTo(bite(1));
  });
});
