import { config, type Stats } from '../data/config';
import type { Vec2 } from './math';

export interface Player {
  x: number;
  y: number;
  hp: number;
  /** Last non-zero movement direction (unit vector); weapons aim with it. */
  facing: Vec2;
  moving: boolean;
  iframes: number;
  /** Hits taken this run (for the "untouched" record). */
  hitsTaken: number;
  stats: Stats;
}

export function createPlayer(): Player {
  const stats = { ...config.player.stats };
  return {
    x: 0,
    y: 0,
    hp: stats.maxHp,
    facing: { x: 1, y: 0 },
    moving: false,
    iframes: 0,
    hitsTaken: 0,
    stats,
  };
}

export function updatePlayer(p: Player, input: Vec2, dt: number): void {
  p.moving = input.x !== 0 || input.y !== 0;
  if (p.moving) {
    p.x += input.x * p.stats.moveSpeed * dt;
    p.y += input.y * p.stats.moveSpeed * dt;
    const len = Math.hypot(input.x, input.y);
    p.facing.x = input.x / len;
    p.facing.y = input.y / len;
  }
  if (p.iframes > 0) p.iframes = Math.max(0, p.iframes - dt);
  if (p.stats.regen > 0) heal(p, p.stats.regen * dt);
}

/** Heals up to max HP. A hero already at 0 HP is down: no heal brings them back (only Segunda Chance does). */
export function heal(p: Player, amount: number): void {
  if (p.hp <= 0) return;
  p.hp = Math.min(p.stats.maxHp, p.hp + amount);
}

/** Applies damage (less armor, at least minDamage) unless invulnerable. Returns true if the hit landed. */
export function hurtPlayer(p: Player, amount: number): boolean {
  if (p.iframes > 0 || p.hp <= 0) return false;
  p.hp = Math.max(0, p.hp - Math.max(config.player.minDamage, amount - p.stats.armor));
  p.iframes = config.player.iframes;
  p.hitsTaken++;
  return true;
}
