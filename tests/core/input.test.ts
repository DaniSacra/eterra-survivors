import { describe, expect, it } from 'vitest';
import { joystickRadius, joystickVector, keysVector } from '../../src/core/input';

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

  it('sizes the joystick to the screen: 13% of the shorter side, between 48 and 64 px', () => {
    expect(joystickRadius(360, 640, 0.13, 48, 64)).toBe(48);
    expect(joystickRadius(420, 820, 0.13, 48, 64)).toBeCloseTo(54.6);
    expect(joystickRadius(820, 1180, 0.13, 48, 64)).toBe(64);
    expect(joystickRadius(820, 420, 0.13, 48, 64)).toBeCloseTo(54.6);
  });
});
