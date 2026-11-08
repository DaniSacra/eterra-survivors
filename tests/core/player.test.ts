import { describe, expect, it } from 'vitest';
import { config } from '../../src/data/config';
import { createPlayer, hurtPlayer, updatePlayer } from '../../src/core/player';

describe('player', () => {
  it('moves by speed and remembers facing', () => {
    const p = createPlayer();
    updatePlayer(p, { x: 0, y: 1 }, 1);
    expect(p.y).toBeCloseTo(p.stats.moveSpeed);
    updatePlayer(p, { x: 0, y: 0 }, 1);
    expect(p.facing).toEqual({ x: 0, y: 1 });
    expect(p.moving).toBe(false);
  });

  it('has invulnerability frames after a hit', () => {
    const p = createPlayer();
    expect(hurtPlayer(p, 10)).toBe(true);
    expect(hurtPlayer(p, 10)).toBe(false);
    expect(p.hp).toBe(p.stats.maxHp - 10);
    updatePlayer(p, { x: 0, y: 0 }, config.player.iframes);
    expect(hurtPlayer(p, 10)).toBe(true);
  });

  it('regenerates up to max hp', () => {
    const p = createPlayer();
    p.hp = 50;
    p.stats.regen = 100;
    updatePlayer(p, { x: 0, y: 0 }, 1);
    expect(p.hp).toBe(p.stats.maxHp);
  });
});
