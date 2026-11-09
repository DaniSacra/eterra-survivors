import type { Vec2 } from './math';

/** Analog joystick: offset from base -> vector with length <= 1, with a dead zone. */
export function joystickVector(out: Vec2, dx: number, dy: number, radius: number, deadZone: number): Vec2 {
  const len = Math.hypot(dx, dy);
  const mag = len / radius;
  if (mag < deadZone || len === 0) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const scale = Math.min(mag, 1) / len;
  out.x = dx * scale;
  out.y = dy * scale;
  return out;
}

/** Digital keys -> normalized direction (diagonals are not faster). */
export function keysVector(out: Vec2, left: boolean, right: boolean, up: boolean, down: boolean): Vec2 {
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (down ? 1 : 0) - (up ? 1 : 0);
  const inv = x !== 0 && y !== 0 ? Math.SQRT1_2 : 1;
  out.x = x * inv;
  out.y = y * inv;
  return out;
}

/** The virtual joystick's radius for a screen: a share of its shorter side, clamped (bigger on tablets). */
export function joystickRadius(
  width: number,
  height: number,
  share: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, Math.min(width, height) * share));
}
