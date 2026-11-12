import { describe, expect, it } from 'vitest';
import { levelStep, rampVolume } from '../../src/render/musicRamp';

describe('music ramps', () => {
  it('a track fades in over its whole fade once unlocked', () => {
    let v = 0;
    v = rampVolume(v, 1, 0.75, 1.5, true);
    expect(v).toBeCloseTo(0.5);
    v = rampVolume(v, 1, 0.75, 1.5, true);
    expect(v).toBe(1);
  });

  it('does not advance while the sound is locked, then starts from 0', () => {
    let v = 0;
    for (let i = 0; i < 600; i++) v = rampVolume(v, 1, 1 / 60, 1.5, false);
    expect(v).toBe(0);
    v = rampVolume(v, 1, 0.75, 1.5, true);
    expect(v).toBeCloseTo(0.5);
  });

  it('fades out toward 0 and never below', () => {
    expect(rampVolume(0.2, 0, 1, 1.5, true)).toBe(0);
  });

  it('the pause ducks the level to 0.3 and the level returns to 1', () => {
    let l = 1;
    for (let i = 0; i < 300; i++) l = levelStep(l, 0.3, 1 / 60);
    expect(l).toBeCloseTo(0.3, 2);
    for (let i = 0; i < 300; i++) l = levelStep(l, 1, 1 / 60);
    expect(l).toBeCloseTo(1, 2);
  });

  it('silence takes the level to 0', () => {
    let l = 1;
    for (let i = 0; i < 300; i++) l = levelStep(l, 0, 1 / 60);
    expect(l).toBeLessThan(0.001);
  });
});
