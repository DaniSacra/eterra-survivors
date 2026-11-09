import { INK } from './pen';
import type { ArtDef } from './types';

/** Projectiles (drawn pointing right, rotated to their heading), gems and things on the ground. */

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

const wisp = (core: number, halo: number, s: number): ArtDef => ({
  w: 22 * s,
  h: 14 * s,
  draw(p) {
    p.g.save();
    p.g.scaleCanvas(s, s);
    // A flame lying down: tail to the left, head to the right.
    p.fill(halo, 0.35).fillEllipse(14, 7, 14, 12);
    p.fill(halo, 0.8).fillPoints(
      [
        { x: 1, y: 7 },
        { x: 9, y: 3 },
        { x: 16, y: 2.5 },
        { x: 20, y: 7 },
        { x: 16, y: 11.5 },
        { x: 9, y: 11 },
      ],
      true,
    );
    p.fill(core).fillCircle(15, 7, 3.4);
    p.fill(0xffffff, 0.9).fillCircle(14, 6, 1.4);
    p.g.restore();
  },
});

/**
 * Fúria's cutting wave: a crescent bulging forward (to the right), drawn pale so the element's red tint shows
 * true; a white edge on the front reads as the cut.
 */
const crescent = (r: number): ArtDef => ({
  w: r * 2,
  h: r * 2,
  draw(p) {
    const c = r;
    const pts: { x: number; y: number }[] = [];
    const span = 1.25;
    for (let k = 0; k <= 10; k++) {
      const a = -span + (k / 10) * span * 2;
      pts.push({ x: c + Math.cos(a) * r * 0.95, y: c + Math.sin(a) * r * 0.95 });
    }
    for (let k = 10; k >= 0; k--) {
      const a = -span + (k / 10) * span * 2;
      pts.push({ x: c - r * 0.35 + Math.cos(a) * r * 0.95, y: c + Math.sin(a) * r * 0.8 });
    }
    p.fill(0xffffff, 0.3).fillCircle(c + r * 0.2, c, r * 0.9);
    p.fill(0xffe8e0).fillPoints(pts, true);
    p.g.lineStyle(1.5, 0xffffff, 0.95).strokePoints(pts.slice(0, 11), false);
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

/**
 * XP gems: the only saturated, twinkling cyan on screen (the ice family is white and white-lilac, never this), a
 * light blue that stands out on the dark ground of every stage; size and twinkle tell the value.
 */
const GEM_BODY = 0x3ed4ff;
const GEM_LIGHT = 0xd4f8ff;
const gem = (s: number): ArtDef => ({
  w: Math.round(12 * s),
  h: Math.round(14 * s),
  draw(p) {
    const body = GEM_BODY;
    const light = GEM_LIGHT;
    p.g.save();
    p.g.scaleCanvas(s, s);
    p.fill(light, 0.22).fillCircle(6, 7, 6.5); // soft glow
    p.outline = 1.5;
    p.poly([6, 1, 11, 6, 6, 13, 1, 6], body);
    p.ink();
    p.fill(light, 0.9).fillTriangle(6, 2, 9.5, 6, 6, 6);
    p.fill(0xffffff, 0.8).fillCircle(4.5, 5, 1);
    p.g.restore();
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
  'proj.fury': crescent(18),
  'proj.fan': blade(0xffd8e0, 0xa8323e, 18),
  'proj.hammer': hammer(0xc4cede, false),
  'proj.forgeFury': hammer(0xffa040, true),
  'proj.wisps': wisp(0xe8ffff, 0x40e0d8, 1),
  'proj.soulProcession': wisp(0xffffff, 0x8ac0f0, 1.3),

  // ---- XP gems ----
  'gem.small': gem(0.9),
  'gem.medium': gem(1.25),
  'gem.large': gem(1.6),

  // ---- On the ground ----
  'pickup.chest': {
    w: 28,
    h: 26,
    draw(p) {
      p.shadow(14, 23.5, 24, 5);
      p.rrect(3, 11, 22, 12, 2, 0x9a6232);
      p.rrect(2, 5, 24, 8, 4, 0xb07c58);
      p.ink();
      p.fill(0xe8b840).fillRect(3, 11, 22, 2.2).fillRect(6, 5.5, 2.2, 17).fillRect(20, 5.5, 2.2, 17);
      p.fill(0xf0d860).fillRoundedRect(11.5, 10, 5, 6, 1.5);
      p.fill(INK).fillCircle(14, 13, 0.9);
      p.shine(8, 7, 6, 2, 0.4);
    },
  },
  'pickup.gold': {
    w: 16,
    h: 16,
    draw(p) {
      p.outline = 1.5;
      p.circle(8, 8, 6, 0xe8b840);
      p.ink();
      p.fill(0xc89c38).fillCircle(8.6, 8.6, 3.8);
      p.fill(0xf0d860).fillCircle(7.6, 7.6, 3.6);
      p.fill(0xffffff, 0.85).fillCircle(5.8, 5.6, 1.3);
    },
  },
  'pickup.food': {
    w: 26,
    h: 18,
    draw(p) {
      p.shadow(13, 15.5, 22, 4);
      p.ellipse(13, 9, 22, 12, 0xd8a478);
      p.ink();
      p.fill(0xb07c58).fillEllipse(13, 11, 20, 7);
      p.fill(0xf4cca0).fillEllipse(11, 6.5, 14, 4);
      p.line(8, 5, 10, 9, 1.2, 0x9a6232)
        .line(13, 4.5, 15, 8.5, 1.2, 0x9a6232)
        .line(18, 5, 20, 9, 1.2, 0x9a6232);
    },
  },
  'pickup.magnet': {
    // Pedra-Ímã: a horseshoe magnet (red with silver tips), the shape everyone reads as "pull".
    w: 24,
    h: 26,
    draw(p) {
      p.shadow(12, 23.5, 16, 4);
      p.poly([3, 4, 9, 4, 9, 13, 12, 16, 15, 13, 15, 4, 21, 4, 21, 14, 12, 22, 3, 14], 0xd84a4a);
      p.rrect(3, 2, 6, 5, 1, 0xd8e0ec).rrect(15, 2, 6, 5, 1, 0xd8e0ec);
      p.ink();
      p.fill(0xffffff, 0.45).fillRect(4.5, 8, 2, 5);
      p.fill(0xffffff).fillCircle(6, 0.5, 1.2).fillCircle(18, 0.5, 1.2);
    },
  },
  'pickup.bomb': {
    w: 24,
    h: 26,
    draw(p) {
      p.shadow(12, 23.5, 18, 4);
      // Badalada: the ring of a toll, a bright burst behind a small bell (unlike the Sinos de Bronze).
      const burst: { x: number; y: number }[] = [];
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8;
        const r = k % 2 ? 6 : 12;
        burst.push({ x: 12 + Math.cos(a) * r, y: 12 + Math.sin(a) * r });
      }
      p.fill(0xff8a4a, 0.85).fillPoints(burst, true);
      p.poly([4, 21, 6, 8, 12, 3, 18, 8, 20, 21], 0xc89c38); // the bell
      p.rrect(2, 19, 20, 4, 2, 0x8a5418);
      p.circle(12, 23, 2.5, 0x8a5418); // clapper
      p.ink();
      p.fill(0xf0d860, 0.8).fillEllipse(10, 10, 4, 8);
      p.fill(0xfff6c0).fillRect(10.8, 1.5, 2.4, 3);
    },
  },
  'pickup.freeze': {
    w: 24,
    h: 24,
    draw(p) {
      p.fill(0xd8d2f0, 0.3).fillCircle(12, 12, 11); // white-lilac: the ice family
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        const dx = Math.cos(a) * 9;
        const dy = Math.sin(a) * 9;
        p.line(12 - dx, 12 - dy, 12 + dx, 12 + dy, 5, INK).line(
          12 - dx,
          12 - dy,
          12 + dx,
          12 + dy,
          2.2,
          0xe8eff8,
        );
      }
      p.fill(0xffffff).fillCircle(12, 12, 2.6);
    },
  },
};
