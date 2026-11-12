import type Phaser from 'phaser';
import { INK } from '../art/pen';
import { UI } from '../ui';
import type { CharacterId } from '../../data/characters';

/** Identity color of each hero, for the light under their feet (so the eye finds them in a crowd). */
export const HERO_COLOR: Record<CharacterId, number> = {
  aldo: 0xe8b840,
  lyra: 0xa84ad8,
  teo: 0x4ad08a,
  andilla: 0xe86a7a,
};

/** How each orbit weapon's pieces look: cartoon swords pointing the way they spin, or round shields. */
export interface OrbitStyle {
  color: number;
  dark: number;
  blade: boolean;
}

/**
 * Enemy danger (boss attacks): coral pink with stripes and a glowing red edge, so it never reads as the
 * player's own fire (orange-gold). Same hue as the UI's danger color.
 */
export const WARN_COLOR = UI.dangerHex;

/** The glowing edge of every danger mark: a strong red, never white (Daniel, 2026-11-12). */
export const WARN_EDGE = 0xe0283a;

/** The ice family (white and white-lilac, never the gems' cyan): Sopro de Geada's wave and frosted screen edges. */
export const ICE = 0xe8e2f4;

/** Big moments the render keeps track of: match time when they happened (-Infinity = never). */
export interface Moments {
  /** A chest was opened; `elo` if it formed an Elo. */
  chest: number;
  elo: boolean;
  /** Badalada (bomb) and Sopro de Geada (freeze) were picked up. */
  bomb: number;
  frost: number;
  /** The hero's life went up (Luz Sagrada's kills, a chest, food). */
  heal: number;
  /** The moment a level-up ring started (after the choice, PF-06). */
  level: number;
  /** The last Ossada em Brasa blasts (CF-02), a ring of slots reused in turn. */
  bursts: { t: number; x: number; y: number; r: number }[];
  nextBurst: number;
}

export const BURST_SLOTS = 6;

/** How long a blast shows: the flash, rays and smoke are quick, the scorch on the ground stays for `BURST_SCORCH`. */
export const BURST_SCORCH = 2;

export const newMoments = (): Moments => ({
  bursts: Array.from({ length: BURST_SLOTS }, () => ({ t: -Infinity, x: 0, y: 0, r: 0 })),
  nextBurst: 0,
  chest: -Infinity,
  elo: false,
  bomb: -Infinity,
  frost: -Infinity,
  heal: -Infinity,
  level: -Infinity,
});

/** Regeneration is green, never the life bar's red (a red rise reads as losing life). */
/** No ground zone is filled more opaque than this: the ring says where it ends, the fill only tints. */
export const ZONE_FILL_MAX = 0.35;

/** Texture width of the shield sprite (art px). */
/** Width of the shield art and length of the sword art, in art px. */
export const SWORD_ART = 40;

export const HEAL_COLOR = 0x7ae890;

/** A cheap hash of a point in [0, 1): the same bolt keeps the same zigzag, and every bolt gets its own. */
export const hash = (x: number, y: number, k: number): number => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
  return v - Math.floor(v);
};

export const TAU_FX = Math.PI * 2;

/** A filled four-sided shape (no allocation). */
export function quad(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): void {
  g.fillTriangle(x0, y0, x1, y1, x2, y2);
  g.fillTriangle(x0, y0, x2, y2, x3, y3);
}

/** An ice shard: a small white-lilac diamond pointing along `a`. */
export function shard(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  a: number,
  r: number,
  alpha: number,
): void {
  const ux = Math.cos(a) * r;
  const uy = Math.sin(a) * r;
  const vx = -uy * 0.35;
  const vy = ux * 0.35;
  g.fillStyle(ICE, alpha).fillTriangle(x - ux, y - uy, x + vx, y + vy, x + ux, y + uy);
  g.fillStyle(0xffffff, alpha).fillTriangle(x - ux, y - uy, x - vx, y - vy, x + ux, y + uy);
}

/**
 * Strokes a path as a soft luminous edge: a wide faint halo, a narrower glow and a thin bright core, so a danger mark
 * on the ground glows instead of being drawn with a hard line. (Colour and alpha are explicit: Phaser's Graphics does
 * not remember the colour of `lineStyle`, which is why the old dashes were always white.)
 */
function glowStroke(g: Phaser.GameObjects.Graphics, color: number, alpha: number, stroke: () => void): void {
  g.lineStyle(12, color, alpha * 0.16);
  stroke();
  g.lineStyle(6, color, alpha * 0.34);
  stroke();
  g.lineStyle(2, color, alpha);
  stroke();
}

/** A glowing arc edge from `a0` to `a1` around (x, y). */
export function glowArc(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  a0: number,
  a1: number,
  color: number,
  alpha: number,
): void {
  glowStroke(g, color, alpha, () => {
    g.beginPath();
    g.arc(x, y, r, a0, a1);
    g.strokePath();
  });
}

/** A glowing straight edge. */
export function glowLine(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number,
  alpha: number,
): void {
  glowStroke(g, color, alpha, () => {
    g.lineBetween(x0, y0, x1, y1);
  });
}

/** A cartoon sword centred on (x, y), its tip toward angle `a`, about 2.6 x `r` long. */
export function drawSword(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  a: number,
  r: number,
  st: OrbitStyle,
): void {
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const vx = -uy;
  const vy = ux;
  const bx = x - ux * r * 0.5;
  const by = y - uy * r * 0.5;
  const hw = r * 0.3;
  // Grip, then the blade, then the guard on top, all with the ink outline.
  g.lineStyle(r * 0.5, INK).lineBetween(bx, by, bx - ux * r * 0.7, by - uy * r * 0.7);
  g.lineStyle(r * 0.25, 0x6a3a1a).lineBetween(bx, by, bx - ux * r * 0.6, by - uy * r * 0.6);
  g.fillStyle(st.color).lineStyle(2, INK);
  g.beginPath();
  g.moveTo(x + ux * r * 1.5, y + uy * r * 1.5);
  g.lineTo(bx + vx * hw, by + vy * hw);
  g.lineTo(bx - vx * hw, by - vy * hw);
  g.closePath();
  g.fillPath();
  g.strokePath();
  g.lineStyle(1.5, 0xffffff, 0.7).lineBetween(bx + vx * hw * 0.3, by + vy * hw * 0.3, x + ux * r, y + uy * r);
  const gw = r * 0.7;
  const gt = r * 0.14;
  g.fillStyle(st.dark).lineStyle(2, INK);
  g.beginPath();
  g.moveTo(bx + vx * gw + ux * gt, by + vy * gw + uy * gt);
  g.lineTo(bx - vx * gw + ux * gt, by - vy * gw + uy * gt);
  g.lineTo(bx - vx * gw - ux * gt, by - vy * gw - uy * gt);
  g.lineTo(bx + vx * gw - ux * gt, by + vy * gw - uy * gt);
  g.closePath();
  g.fillPath();
  g.strokePath();
}
