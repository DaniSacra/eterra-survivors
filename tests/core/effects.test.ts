import { describe, expect, it } from 'vitest';
import { addPuff } from '../../src/core/effects';
import { config } from '../../src/data/config';
import { bareWorld } from './helpers';

describe('puffs', () => {
  it('keep room for pickup glints when deaths fill the cap', () => {
    const w = bareWorld();
    const { maxPuffs, pickupPuffs } = config.effects;
    for (let i = 0; i < maxPuffs * 2; i++) addPuff(w, 0, 0, 8, 'death');
    expect(w.puffs.size).toBe(maxPuffs - pickupPuffs);
    for (let i = 0; i < pickupPuffs * 2; i++) addPuff(w, 0, 0, 6, i % 2 ? 'gem' : 'item');
    expect(w.puffs.size).toBe(maxPuffs);
  });
});
