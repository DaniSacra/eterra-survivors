import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { bareWorld, still } from './helpers';

describe('World', () => {
  it('advances time and clamps long frames', () => {
    const w = new World(1);
    w.step(5, { x: 0, y: 0 });
    expect(w.time).toBeCloseTo(config.maxDt);
  });

  it('is lost when the player dies', () => {
    const w = new World(1);
    w.player.hp = 0;
    w.step(0.016, { x: 0, y: 0 });
    expect(w.state).toBe('lost');
    expect(w.events).toContainEqual({ type: 'lost' });
  });

  it('a boss killed in the same step the hero dies is a win, reported once', () => {
    const w = bareWorld();
    w.addWeapon('yahAura');
    w.player.hp = 1;
    spawnEnemy(w, 'skeleton', 5, 0);
    const boss = spawnEnemy(w, 'blackKnight', 0, 40);
    boss.hp = 1;
    w.boss = boss;
    w.step(1 / 60, still);
    expect(w.player.hp).toBeLessThanOrEqual(0);
    expect(w.state).toBe('won');
    const ends = w.events.filter((e) => e.type === 'won' || e.type === 'lost');
    expect(ends).toEqual([{ type: 'won' }]);
  });

  it('does not advance when not playing', () => {
    const w = new World(1);
    w.state = 'levelup';
    w.step(0.016, { x: 1, y: 0 });
    expect(w.time).toBe(0);
    expect(w.player.x).toBe(0);
  });
});

describe('tally', () => {
  it('counts attacks, hits, kills and gems for the renderer', () => {
    const w = bareWorld();
    w.addWeapon('blade');
    spawnEnemy(w, 'skeleton', 30, 0);
    w.step(1 / 60, still);
    expect(w.tally.attacks).toBe(1);
    expect(w.tally.hits).toBe(1);
    expect(w.tally.kills).toBe(1);
    for (let i = 0; i < 60; i++) w.step(1 / 60, still);
    expect(w.tally.gems).toBe(1);
  });
});
