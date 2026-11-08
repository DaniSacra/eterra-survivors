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
      p.fill(0x1c1a30).fillRect(0, 0, SIZE, SIZE);
      const rows = 4;
      const h = SIZE / rows;
      for (let row = 0; row < rows; row++) {
        const off = row % 2 ? h : 0;
        for (let x = -off; x < SIZE; x += h * 2) {
          const tone = [0x2e2c4a, 0x34315a, 0x2a2844][Math.floor(r() * 3)] as number;
          p.fill(tone).fillRoundedRect(x + 2, row * h + 2, h * 2 - 4, h - 4, 4);
          p.fill(0xffffff, 0.05).fillRect(x + 4, row * h + 4, h * 2 - 8, 3);
        }
      }
      for (let i = 0; i < 6; i++)
        p.fill(0x3a9a8a, 0.35).fillEllipse(r() * SIZE, r() * SIZE, 10 + r() * 14, 4 + r() * 4);
    },
  },
  /** Estrada do Sul: packed snow with wheel ruts and grey stones. */
  'tile.road': {
    w: SIZE,
    h: SIZE,
    draw(p) {
      const r = rng(23);
      p.fill(0x3a4258).fillRect(0, 0, SIZE, SIZE);
      p.fill(0x2e3548).fillRect(0, 38, SIZE, 7).fillRect(0, 84, SIZE, 7);
      for (let i = 0; i < 8; i++)
        p.fill(0x4a5470, 0.7).fillEllipse(r() * SIZE, r() * SIZE, 26 + r() * 26, 10 + r() * 10);
      for (let i = 0; i < 6; i++) {
        const x = r() * SIZE;
        const y = r() * SIZE;
        p.fill(0x1e2230, 0.6).fillEllipse(x + 1, y + 2, 9, 5);
        p.fill(0x7a7a82).fillEllipse(x, y, 9, 6);
        p.fill(0xa2a2ac).fillEllipse(x - 1.5, y - 1.5, 4, 2.5);
      }
      for (let i = 0; i < 24; i++)
        p.fill(0xe8eff8, 0.2 + r() * 0.3).fillCircle(r() * SIZE, r() * SIZE, 0.8 + r());
    },
  },
};
