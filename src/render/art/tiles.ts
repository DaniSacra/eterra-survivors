import type { ArtDef } from './types';

/** Repeating ground tiles (no outline: scenery stays soft so characters read on top). */

/** Deterministic scatter, so a tile looks the same every time. */
function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const SIZE = 128;

export const TILE_ART: Record<string, ArtDef> = {
  /** Arredores de Valmor: snow over the graveyard, frozen tufts and pebbles. */
  tile: {
    w: SIZE,
    h: SIZE,
    draw(p) {
      const r = rng(11);
      // Night snow: soft wide drifts rather than stones, so the dead read on top.
      p.fill(0x34405e).fillRect(0, 0, SIZE, SIZE);
      for (let i = 0; i < 6; i++)
        p.fill(0x3e4b6c, 0.6).fillEllipse(r() * SIZE, r() * SIZE, 50 + r() * 40, 18 + r() * 10);
      for (let i = 0; i < 4; i++)
        p.fill(0x2c3550, 0.5).fillEllipse(r() * SIZE, r() * SIZE, 30 + r() * 20, 6 + r() * 4);
      for (let i = 0; i < 5; i++) {
        const x = r() * SIZE;
        const y = r() * SIZE;
        p.fill(0x3a9a6a, 0.55)
          .fillTriangle(x, y, x + 2, y - 6, x + 4, y)
          .fillTriangle(x + 3, y, x + 6, y - 4, x + 7, y);
      }
      for (let i = 0; i < 4; i++)
        p.fill(0x55555e, 0.7).fillEllipse(r() * SIZE, r() * SIZE, 6 + r() * 4, 4 + r() * 2);
      for (let i = 0; i < 30; i++)
        p.fill(0xcbd8ec, 0.25 + r() * 0.3).fillCircle(r() * SIZE, r() * SIZE, 0.8 + r());
    },
  },
  /** Cripta: blue stone slabs, dark mortar, teal moss. */
  'tile.crypt': {
    w: SIZE,
    h: SIZE,
    draw(p) {
      const r = rng(7);
      // Low contrast: mortar close to the slabs, so bats, bones and the hero read on top.
      p.fill(0x252438).fillRect(0, 0, SIZE, SIZE);
      const rows = 4;
      const h = SIZE / rows;
      for (let row = 0; row < rows; row++) {
        const off = row % 2 ? h : 0;
        for (let x = -off; x < SIZE; x += h * 2) {
          const tone = [0x2c2b44, 0x302e4a, 0x2a2942][Math.floor(r() * 3)] as number;
          p.fill(tone).fillRoundedRect(x + 1.5, row * h + 1.5, h * 2 - 3, h - 3, 4);
          p.fill(0xffffff, 0.03).fillRect(x + 4, row * h + 4, h * 2 - 8, 3);
        }
      }
      for (let i = 0; i < 3; i++)
        p.fill(0x3a9a8a, 0.15).fillEllipse(r() * SIZE, r() * SIZE, 10 + r() * 14, 4 + r() * 4);
    },
  },
  /**
   * Estrada do Sul: packed snow with flat pebbles close to the ground's tone (no full-width ruts, no bright stones:
   * they lined up in a grid; ruts and stones with volume are decals).
   */
  'tile.road': {
    w: SIZE,
    h: SIZE,
    draw(p) {
      const r = rng(23);
      p.fill(0x3a4258).fillRect(0, 0, SIZE, SIZE);
      for (let i = 0; i < 8; i++)
        p.fill(0x4a5470, 0.45).fillEllipse(r() * SIZE, r() * SIZE, 26 + r() * 26, 10 + r() * 10);
      for (let i = 0; i < 6; i++) {
        const x = r() * SIZE;
        const y = r() * SIZE;
        p.fill(0x4e566e, 0.8).fillEllipse(x, y, 7 + r() * 4, 4 + r() * 2);
      }
      for (let i = 0; i < 24; i++)
        p.fill(0xe8eff8, 0.2 + r() * 0.3).fillCircle(r() * SIZE, r() * SIZE, 0.8 + r());
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
