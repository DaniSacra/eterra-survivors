import { describe, expect, it } from 'vitest';
import { joystickVector, keysVector } from '../../src/core/input';

describe('input', () => {
  const v = { x: 0, y: 0 };

  it('ignores the joystick dead zone', () => {
    expect(joystickVector(v, 2, 0, 50, 0.1)).toEqual({ x: 0, y: 0 });
  });

  it('is analog inside the radius and clamped outside', () => {
    joystickVector(v, 25, 0, 50, 0.1);
    expect(v.x).toBeCloseTo(0.5);
    joystickVector(v, 0, -500, 50, 0.1);
    expect(v.y).toBeCloseTo(-1);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });

  it('normalizes diagonal keys', () => {
    keysVector(v, false, true, true, false);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeLessThan(0);
    expect(keysVector(v, true, true, false, false)).toEqual({ x: 0, y: 0 });
  });
});
