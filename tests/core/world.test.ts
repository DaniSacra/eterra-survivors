import { describe, expect, it } from 'vitest';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';

describe('World', () => {
  it('advances time and clamps long frames', () => {
    const w = new World(1);
    w.step(5, { x: 0, y: 0 });
    expect(w.time).toBeCloseTo(config.maxDt);
  });

  it('does not advance when not playing', () => {
    const w = new World(1);
    w.state = 'levelup';
    w.step(0.016, { x: 1, y: 0 });
    expect(w.time).toBe(0);
    expect(w.player.x).toBe(0);
  });
});
