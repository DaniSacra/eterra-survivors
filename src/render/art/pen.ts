import type Phaser from 'phaser';

/**
 * Cartoon vector style: chunky shapes with one thick dark outline around the whole silhouette,
 * a soft ground shadow, light from the top left. Textures are drawn at ART_RES times their world
 * size and displayed at 1 / ART_RES, so they stay sharp at any camera zoom.
 */
export const ART_RES = 2;
/** Display scale for an art texture. */
export const ART_SCALE = 1 / ART_RES;

export const INK = 0x1a1424;

type Part =
  | { t: 'circle'; x: number; y: number; r: number; c: number }
  | { t: 'ellipse'; x: number; y: number; w: number; h: number; c: number }
  | { t: 'rrect'; x: number; y: number; w: number; h: number; r: number; c: number }
  | { t: 'poly'; pts: number[]; c: number };

/**
 * Collects body parts, then `ink()` draws every outline first and every fill on top, so parts merge into
 * one outlined silhouette. Details (eyes, shines) are drawn straight on `g` afterwards, without outline.
 */
export class Pen {
  private parts: Part[] = [];

  constructor(
    readonly g: Phaser.GameObjects.Graphics,
    /** Outline thickness in sprite pixels. */
    public outline = 2,
    public inkColor = INK,
  ) {}

  circle(x: number, y: number, r: number, c: number): this {
    this.parts.push({ t: 'circle', x, y, r, c });
    return this;
  }
  ellipse(x: number, y: number, w: number, h: number, c: number): this {
    this.parts.push({ t: 'ellipse', x, y, w, h, c });
    return this;
  }
  /** Rounded rectangle by its top-left corner. */
  rrect(x: number, y: number, w: number, h: number, r: number, c: number): this {
    this.parts.push({ t: 'rrect', x, y, w, h, r, c });
    return this;
  }
  /** Polygon from a flat [x, y, x, y, ...] list. */
  poly(pts: number[], c: number): this {
    this.parts.push({ t: 'poly', pts, c });
    return this;
  }

  /** Outlines, then fills, of everything collected so far. */
  ink(): this {
    const g = this.g;
    const o = this.outline;
    g.fillStyle(this.inkColor, 1).lineStyle(o * 2, this.inkColor, 1);
    for (const p of this.parts) this.shape(p, o, true);
    for (const p of this.parts) {
      g.fillStyle(p.c, 1);
      this.shape(p, 0, false);
    }
    this.parts = [];
    return this;
  }

  private shape(p: Part, grow: number, stroke: boolean): void {
    const g = this.g;
    switch (p.t) {
      case 'circle':
        g.fillCircle(p.x, p.y, p.r + grow);
        break;
      case 'ellipse':
        g.fillEllipse(p.x, p.y, p.w + grow * 2, p.h + grow * 2);
        break;
      case 'rrect':
        g.fillRoundedRect(p.x - grow, p.y - grow, p.w + grow * 2, p.h + grow * 2, Math.max(0.1, p.r + grow));
        break;
      case 'poly': {
        const pts = toPoints(p.pts);
        g.fillPoints(pts, true);
        if (stroke) g.strokePoints(pts, true, true);
        break;
      }
    }
  }

  // ---- Details (no outline) ----

  /** Soft elliptic shadow on the ground. */
  shadow(x: number, y: number, w: number, h = w * 0.3): this {
    this.g.fillStyle(0x000000, 0.28).fillEllipse(x, y, w, h);
    return this;
  }
  /** An elite's ground mark instead of the shadow: a gold ring (it carries a chest) with two glints. */
  eliteRing(x: number, y: number, w: number, h = w * 0.3): this {
    this.g.fillStyle(0xe8b840, 0.3).fillEllipse(x, y, w, h);
    this.g.lineStyle(2, 0xffd870, 0.95).strokeEllipse(x, y, w, h);
    this.g
      .fillStyle(0xffffff, 0.9)
      .fillCircle(x - w * 0.42, y - h * 0.12, 1.3)
      .fillCircle(x + w * 0.4, y + h * 0.18, 1);
    return this;
  }
  /** A shine: lighter blob, top left of a body. */
  shine(x: number, y: number, w: number, h: number, alpha = 0.45): this {
    this.g.fillStyle(0xffffff, alpha).fillEllipse(x, y, w, h);
    return this;
  }
  /** Cartoon eye: white, pupil looking right, glint. */
  eye(x: number, y: number, r: number, pupil = INK, white = 0xffffff): this {
    const g = this.g;
    g.fillStyle(white, 1).fillEllipse(x, y, r * 2, r * 2.3);
    g.fillStyle(pupil, 1).fillEllipse(x + r * 0.35, y + r * 0.15, r * 1.1, r * 1.4);
    g.fillStyle(0xffffff, 1).fillCircle(x + r * 0.05, y - r * 0.35, r * 0.32);
    return this;
  }
  /** Glowing eye: a bright dot with a halo (undead, hooded ones, bosses). */
  glow(x: number, y: number, r: number, c: number): this {
    this.g.fillStyle(c, 0.35).fillCircle(x, y, r * 2);
    this.g.fillStyle(c, 1).fillCircle(x, y, r);
    this.g.fillStyle(0xffffff, 0.9).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.4);
    return this;
  }
  fill(c: number, alpha = 1): Phaser.GameObjects.Graphics {
    return this.g.fillStyle(c, alpha);
  }
  line(x1: number, y1: number, x2: number, y2: number, w: number, c: number, alpha = 1): this {
    this.g.lineStyle(w, c, alpha).lineBetween(x1, y1, x2, y2);
    return this;
  }
}

function toPoints(flat: number[]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ x: flat[i] as number, y: flat[i + 1] as number });
  return out;
}

/** Shade a 0xRRGGBB color: k < 1 darker, k > 1 lighter. */
export function shade(c: number, k: number): number {
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(k > 1 ? s + (255 - s) * (k - 1) : s * k)));
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255);
}
