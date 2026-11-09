import { describe, expect, it } from 'vitest';
import { newSave, recordRun, recordVigil } from '../../src/core/meta';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { summarizeRun } from '../../src/core/records';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { quietWorld, still } from './helpers';

/** A world whose boss just fell. */
function wonWorld() {
  const w = quietWorld();
  w.time = config.matchDuration + 30;
  (w as unknown as { state: string }).state = 'won';
  return w;
}

describe('Noite Sem Fim', () => {
  it('goes on only after a victory, without a boss', () => {
    const w = quietWorld();
    w.continueVigil();
    expect(w.endless).toBe(false);
    const won = wonWorld();
    won.continueVigil();
    expect(won.endless).toBe(true);
    expect(won.state).toBe('playing');
    expect(won.boss).toBeNull();
    expect(won.vigilStart).toBe(config.matchDuration + 30);
  });

  it('the waves keep coming, ever bigger, with an elite each minute', () => {
    const w = new World(1); // with its spawner
    w.weapons.length = 0; // nothing kills them
    w.time = config.matchDuration + 30;
    (w as unknown as { state: string }).state = 'won';
    w.continueVigil();
    w.player.stats.maxHp = w.player.hp = 1e9; // survive to watch the waves
    const spawned = (seconds: number) => {
      const before = w.enemies.size;
      for (let i = 0; i < seconds * 60; i++) w.step(1 / 60, still);
      return w.enemies.size - before;
    };
    expect(spawned(5)).toBeGreaterThan(0);
    const elites = () => w.enemies.active.filter((e) => e.def.elite).length;
    const e0 = elites();
    for (let i = 0; i < config.vigil.eliteEvery * 60 + 5; i++) w.step(1 / 60, still);
    expect(elites()).toBeGreaterThan(e0);
    expect(w.vigilTime).toBeGreaterThan(config.vigil.eliteEvery);
    // Tougher enemies later: the newest one has more HP than the same kind had at the start.
    const hp = Math.max(...w.enemies.active.filter((e) => !e.def.elite).map((e) => e.maxHp / e.def.hp));
    expect(hp).toBeGreaterThan(1);
  });

  it('a run that ends in the vigil counts as a victory, and records only what the vigil added', () => {
    const save = newSave();
    const w = wonWorld();
    w.gold = 100;
    w.kills = 50;
    const before = summarizeRun(w);
    recordRun(save, before);
    const gold = save.gold;
    expect(save.totals.runs).toBe(1);
    w.continueVigil();
    w.time += 320;
    w.gold = 180;
    w.kills = 90;
    (w as unknown as { state: string }).state = 'lost';
    const after = summarizeRun(w);
    expect(after.won).toBe(true);
    expect(after.vigil).toBe(320);
    const out = recordVigil(save, after, before);
    const reward = out.achievements.reduce((n, id) => n + ACHIEVEMENTS[id].gold, 0);
    expect(save.gold).toBe(gold + 80 + reward);
    expect(save.totals.runs).toBe(1);
    expect(save.totals.wins).toBe(1);
    expect(save.totals.kills).toBe(90);
    expect(save.records.aldo!.vigil.valmor).toBe(320);
    expect(save.records.aldo!.wins.valmor).toBe(1);
    expect(out.achievements).toContain('vigil5');
  });
});
