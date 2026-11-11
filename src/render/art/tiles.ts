import type { ArtDef } from './types';
import { PIXEL_TILES } from './pixelTiles';

/** Repeating ground tiles: pixel art, one seamless 128x128 pixel grid each (pixelTiles.ts). */
export const TILE_ART: Record<string, ArtDef> = PIXEL_TILES;

/**
 * Obstacles of the Cripta (core/terrain.ts), by kind: a stone column, a sarcophagus, a gravestone. Each is drawn
 * so its foot fills the hit circle (OBSTACLE_RADIUS 20, 24, 15) at the image's centre.
 */
export const OBSTACLE_ART: Record<string, ArtDef> = {
  'obstacle.0': {
    w: 44,
    h: 70,
    draw(p) {
      p.shadow(22, 58, 42, 12);
      p.outline = 2;
      p.inkColor = 0x14131f;
      p.rrect(4, 46, 36, 14, 4, 0x4a4866); // plinth
      p.rrect(8, 6, 28, 44, 3, 0x5c5a7c); // shaft
      p.rrect(3, 2, 38, 9, 3, 0x6a6890); // capital
      p.ink();
      for (let i = 0; i < 3; i++) p.fill(0x3e3c58, 0.8).fillRect(13 + i * 7, 13, 2.5, 32); // flutes
      p.fill(0x3a9a8a, 0.35).fillEllipse(30, 44, 12, 5); // moss
      p.shine(10, 8, 4, 36, 0.25);
    },
  },
  /** A column with a torch in a sconce (render-side variant of kind 0; the flame lights the dark, AR-02). */
  'obstacle.0t': {
    w: 44,
    h: 70,
    draw(p) {
      (OBSTACLE_ART['obstacle.0'] as ArtDef).draw(p);
      p.outline = 1.5;
      p.rrect(19, 22, 6, 9, 2, 0x3a2a1c); // sconce
      p.rrect(18.5, 18, 7, 5, 2, 0x5a4028);
      p.ink();
      p.fill(0xff8a30).fillEllipse(22, 13, 7, 11);
      p.fill(0xffd870).fillEllipse(22, 15, 4, 7);
      p.fill(0xffffff, 0.9).fillEllipse(22, 16.5, 1.6, 3);
    },
  },
  'obstacle.1': {
    w: 54,
    h: 50,
    draw(p) {
      p.shadow(27, 40, 52, 14);
      p.outline = 2;
      p.inkColor = 0x14131f;
      p.rrect(3, 12, 48, 30, 6, 0x4c4a68); // body
      p.rrect(1, 6, 52, 14, 6, 0x605e82); // lid
      p.ink();
      p.fill(0x8a88a8, 0.8).fillRect(25, 8, 4, 10).fillRect(20, 11, 14, 3); // cross on the lid
      p.fill(0x3e3c58).fillRect(8, 26, 38, 3);
      p.fill(0xcbd8ec, 0.5).fillCircle(9, 34, 2).fillCircle(45, 34, 2);
      p.shine(6, 8, 18, 4, 0.25);
    },
  },
  'obstacle.2': {
    w: 34,
    h: 44,
    draw(p) {
      p.shadow(17, 38, 32, 9);
      p.outline = 2;
      p.inkColor = 0x14131f;
      p.rrect(5, 6, 24, 32, 11, 0x56546f);
      p.rrect(2, 34, 30, 7, 3, 0x45435c);
      p.ink();
      p.fill(0x2e2c44).fillRect(16, 12, 3, 15).fillRect(11, 16, 13, 3);
      p.fill(0x3a9a8a, 0.35).fillEllipse(10, 35, 10, 4);
      p.shine(9, 9, 4, 12, 0.25);
    },
  },
};

/**
 * Ground decals scattered over the tiles by world position (render/decals.ts), so the repetition disappears.
 * Soft, low contrast and cute: scenery never competes with the characters.
 */
export const DECAL_ART: Record<string, ArtDef> = {
  // ---- Arredores de Valmor ----
  'decal.grave': {
    w: 22,
    h: 26,
    draw(p) {
      p.shadow(11, 24, 20, 4);
      p.outline = 1.5;
      p.inkColor = 0x262e44;
      p.rrect(3, 4, 16, 20, 7, 0x5a6480);
      p.ink();
      p.fill(0xe8eff8, 0.85).fillEllipse(11, 5, 15, 5); // snow cap
      p.fill(0x3e4660).fillRect(10, 9, 2, 9).fillRect(7, 12, 8, 2); // a little cross
    },
  },
  'decal.snowMound': {
    w: 34,
    h: 14,
    draw(p) {
      p.fill(0x4a5778, 0.8).fillEllipse(17, 8, 32, 11);
      p.fill(0x5e6c90, 0.8).fillEllipse(14, 6, 20, 6);
      p.fill(0xe8eff8, 0.25).fillEllipse(12, 5, 10, 3);
    },
  },
  'decal.twigs': {
    w: 26,
    h: 14,
    draw(p) {
      p.line(2, 10, 22, 4, 2, 0x5a4632, 0.8).line(10, 8, 14, 1, 1.5, 0x5a4632, 0.8);
      p.line(16, 5, 24, 9, 1.5, 0x5a4632, 0.8);
      p.fill(0xe8eff8, 0.5).fillCircle(14, 1.5, 1.4).fillCircle(22, 4, 1.2);
    },
  },
  'decal.iceFlower': {
    w: 16,
    h: 16,
    draw(p) {
      for (let k = 0; k < 5; k++) {
        const a = (k * Math.PI * 2) / 5;
        p.fill(0xe8e2f4, 0.35).fillEllipse(8 + Math.cos(a) * 3.5, 8 + Math.sin(a) * 3.5, 5, 5);
      }
      p.fill(0xf4f2fa, 0.5).fillCircle(8, 8, 2);
    },
  },
  // ---- Cripta da Igreja Velha ----
  'decal.candle': {
    w: 12,
    h: 22,
    draw(p) {
      p.fill(0xf0d860, 0.12).fillCircle(6, 7, 6);
      p.outline = 1.5;
      p.rrect(3, 9, 6, 12, 2, 0xe8e0c8);
      p.ink();
      p.fill(0xffd870).fillEllipse(6, 5.5, 3.5, 6);
      p.fill(0xffffff).fillEllipse(6, 6.5, 1.4, 2.5);
    },
  },
  /** A slab of another stone tone, so the floor never repeats (AR-02). */
  'decal.slab': {
    w: 36,
    h: 18,
    draw(p) {
      p.fill(0x34324e, 0.9).fillRoundedRect(1, 1, 34, 16, 3);
      p.fill(0x1c1b2c, 0.8).fillRect(1, 15, 34, 2);
      p.fill(0xffffff, 0.04).fillRect(3, 3, 30, 2);
      p.fill(0x1c1b2c, 0.6).fillRect(14, 4, 1.5, 9);
    },
  },
  'decal.moss': {
    w: 28,
    h: 12,
    draw(p) {
      p.fill(0x2a6a5a, 0.35).fillEllipse(14, 6, 26, 9);
      p.fill(0x3a9a8a, 0.35).fillEllipse(10, 5, 10, 5).fillEllipse(19, 7, 8, 4);
    },
  },
  'decal.bonePile': {
    w: 24,
    h: 12,
    draw(p) {
      p.fill(0x8a94a8, 0.6).fillEllipse(12, 8, 20, 6);
      p.line(4, 8, 14, 5, 2.5, 0xc8d0dc, 0.75).line(10, 9, 21, 7, 2.5, 0xc8d0dc, 0.75);
      p.fill(0xc8d0dc, 0.8).fillCircle(17, 4.5, 3);
      p.fill(0x2c2b44).fillCircle(16, 4.5, 0.8).fillCircle(18.2, 4.5, 0.8);
    },
  },
  'decal.crack': {
    w: 30,
    h: 18,
    draw(p) {
      p.line(2, 9, 10, 7, 1.5, 0x1c1b2e, 0.7).line(10, 7, 16, 11, 1.5, 0x1c1b2e, 0.7);
      p.line(16, 11, 27, 6, 1.5, 0x1c1b2e, 0.7).line(10, 7, 12, 1, 1.2, 0x1c1b2e, 0.7);
    },
  },
  'decal.web': {
    w: 22,
    h: 22,
    draw(p) {
      for (let k = 0; k < 5; k++) {
        const a = (k * Math.PI) / 8;
        p.line(1, 1, 1 + Math.cos(a) * 20, 1 + Math.sin(a) * 20, 1, 0xcbd8ec, 0.35);
      }
      for (let r = 6; r <= 18; r += 6)
        p.g
          .lineStyle(1, 0xcbd8ec, 0.3)
          .beginPath()
          .arc(1, 1, r, 0, Math.PI / 2)
          .strokePath();
    },
  },
  // ---- Estrada do Sul ----
  'decal.puddle': {
    w: 32,
    h: 14,
    draw(p) {
      // Neutral grey-blue, like the road's own drifts: water never reads as a gem.
      p.fill(0x4a5470, 0.8).fillEllipse(16, 7, 30, 11);
      p.fill(0x8a94a8, 0.3).fillEllipse(12, 5, 12, 3);
    },
  },
  'decal.bush': {
    w: 26,
    h: 20,
    draw(p) {
      p.shadow(13, 18, 22, 4);
      p.outline = 1.5;
      p.inkColor = 0x1e2a24;
      p.circle(8, 12, 6, 0x3a6a54).circle(16, 10, 7, 0x3a6a54).circle(20, 14, 5, 0x3a6a54);
      p.ink();
      p.fill(0xe8eff8, 0.85).fillEllipse(15, 5, 10, 3.5).fillEllipse(7, 7.5, 6, 2.5);
    },
  },
  /** Valmor: a lantern on a short post, a warm light in the snow (AR-02). */
  'decal.lantern': {
    w: 16,
    h: 34,
    draw(p) {
      p.shadow(8, 32, 12, 4);
      p.outline = 1.5;
      p.rrect(6.5, 12, 3, 20, 1, 0x3a2a1c); // post
      p.rrect(3, 3, 10, 11, 2, 0x2e2a30); // cage
      p.ink();
      p.fill(0xffc860).fillRect(5, 5.5, 6, 6.5);
      p.fill(0xfff0c0).fillRect(6.5, 7, 3, 3.5);
      p.fill(0x2e2a30).fillRect(7.5, 5, 1, 7);
    },
  },
  /** Estrada do Sul: the embers of a travellers' fire (AR-02). */
  'decal.campfire': {
    w: 30,
    h: 22,
    draw(p) {
      p.fill(0x1a1610, 0.5).fillEllipse(15, 17, 28, 9);
      p.outline = 1.5;
      p.rrect(4, 14, 22, 4, 2, 0x5a4028);
      p.rrect(8, 12, 14, 4, 2, 0x4a3420);
      p.ink();
      p.fill(0xff7a28).fillEllipse(15, 10, 10, 12);
      p.fill(0xffc850).fillEllipse(15, 12, 6, 7);
      p.fill(0xfff0c0, 0.9).fillEllipse(15, 13, 2.5, 3);
    },
  },
  'decal.fence': {
    w: 34,
    h: 20,
    draw(p) {
      p.shadow(17, 18, 32, 4);
      p.outline = 1.5;
      p.inkColor = 0x2a1e14;
      p.rrect(3, 4, 4, 14, 1.5, 0x7a5a3a).rrect(27, 6, 4, 12, 1.5, 0x7a5a3a);
      p.rrect(1, 8, 32, 3, 1, 0x8a6a48);
      p.ink();
      p.fill(0xe8eff8, 0.85).fillEllipse(5, 4, 6, 2).fillEllipse(29, 6, 6, 2);
    },
  },
  'decal.ruts': {
    // A short stretch of wheel ruts, gently curved (the tile has none, so they never line up).
    w: 56,
    h: 22,
    draw(p) {
      for (const y of [6, 16])
        p.g
          .lineStyle(4, 0x2e3548, 0.7)
          .beginPath()
          .arc(28, y + 60, 62, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42)
          .strokePath();
    },
  },
  'decal.stones': {
    w: 22,
    h: 12,
    draw(p) {
      p.fill(0x5a5a66, 0.8).fillEllipse(7, 7, 11, 7).fillEllipse(16, 8, 8, 5);
      p.fill(0x8a8a96, 0.6).fillEllipse(6, 5.5, 5, 2.5).fillEllipse(15, 7, 3.5, 2);
    },
  },
};
