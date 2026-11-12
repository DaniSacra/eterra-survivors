import type { ArtDef } from './types';

/** Projectiles still drawn from code (most have a PixelLab sprite in assets.ts). Pickups and gems are PNGs now. */

const glowOrb = (core: number, halo: number, r: number): ArtDef => ({
  w: r * 4,
  h: r * 4,
  draw(p) {
    const c = r * 2;
    p.fill(halo, 0.25).fillCircle(c, c, r * 1.9);
    p.fill(halo, 0.5).fillCircle(c, c, r * 1.35);
    p.fill(core).fillCircle(c, c, r);
    p.fill(0xffffff, 0.9).fillCircle(c - r * 0.3, c - r * 0.3, r * 0.45);
  },
});

const blade = (steel: number, hilt: number, len: number): ArtDef => ({
  w: len + 4,
  h: 10,
  draw(p) {
    p.poly([4, 3.5, len - 2, 3.5, len + 2, 5, len - 2, 6.5, 4, 6.5], steel);
    p.rrect(1, 2, 4, 6, 1.5, hilt);
    p.ink();
    p.fill(0xffffff, 0.7).fillRect(6, 4, len - 9, 1);
  },
});

/** Drawn 1.2x, about the size of its hit area (radius 9), so it still reads on the ground. */
const HAMMER_SCALE = 1.2;
const hammer = (head: number, glow: boolean): ArtDef => ({
  w: Math.round(26 * HAMMER_SCALE),
  h: Math.round(22 * HAMMER_SCALE),
  draw(p) {
    p.g.save();
    p.g.scaleCanvas(HAMMER_SCALE, HAMMER_SCALE);
    if (glow) p.fill(0xffa040, 0.35).fillCircle(19, 11, 11);
    p.rrect(1, 9.5, 16, 3.5, 1.5, 0x9a6232);
    p.rrect(14, 3, 10, 16, 2.5, head);
    p.ink();
    p.fill(0xffffff, 0.5).fillRect(15.5, 4.5, 2, 13); // bright steel edge: reads on every ground
    p.shine(17, 6, 4, 3, glow ? 0.6 : 0.5);
    p.g.restore();
  },
});

/** Estrela de Lyra's small falling stars: a five-point star in the arcane pink, with a halo. */
const starlet = (r: number): ArtDef => ({
  w: r * 3,
  h: r * 3,
  draw(p) {
    const c = r * 1.5;
    p.fill(0xf0a0e8, 0.35).fillCircle(c, c, r * 1.4);
    const pts: { x: number; y: number }[] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const d = k % 2 === 0 ? r : r * 0.45;
      pts.push({ x: c + Math.cos(a) * d, y: c + Math.sin(a) * d });
    }
    p.fill(0xfff0fc).fillPoints(pts, true);
    p.fill(0xffffff, 0.9).fillCircle(c, c, r * 0.3);
  },
});

export const ITEM_ART: Record<string, ArtDef> = {
  // ---- Projectiles ----
  'proj.elunLight': glowOrb(0xfff6c0, 0xa8e060, 4), // Teo's green-gold
  'proj.holyLight': glowOrb(0xffffff, 0xffe070, 5),
  'proj.daggers': blade(0xe8eff8, 0x55555e, 16),
  'proj.staff': glowOrb(0xf4e8ff, 0xb070f0, 5), // Lyra's purple
  'proj.lyraStar': glowOrb(0xfff6c0, 0xd8a0ff, 7),
  'proj.starlet': starlet(6),
  'proj.hammer': hammer(0xc4cede, false),
  'proj.forgeFury': hammer(0xffa040, true),
};
