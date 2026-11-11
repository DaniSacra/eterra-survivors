import { describe, expect, it } from 'vitest';
import { TILE_PALETTES, TILE_TEXTURE, VARIANT } from '../../src/render/art/pixelTiles';
import { STAGES } from '../../src/data/stages';

const lum = (c: number): number => {
  const ch = [(c >> 16) & 255, (c >> 8) & 255, c & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (ch[0] as number) + 0.7152 * (ch[1] as number) + 0.0722 * (ch[2] as number);
};
const ratio = (a: number, b: number): number => {
  const [hi, lo] = [Math.max(lum(a), lum(b)), Math.min(lum(a), lum(b))];
  return (hi + 0.05) / (lo + 0.05);
};

describe('ground tiles', () => {
  it('are pixel grids drawn at the shared density', () => {
    expect(TILE_TEXTURE % VARIANT).toBe(0);
    expect(TILE_TEXTURE / VARIANT).toBe(2);
  });

  it('every stage ground and the forest have a palette', () => {
    for (const s of Object.values(STAGES)) expect(TILE_PALETTES).toHaveProperty([s.tile]);
    expect(TILE_PALETTES).toHaveProperty(['tile.forest']);
  });

  it('keep dark and low contrast so heroes, enemies and shots read on top', () => {
    for (const [key, pal] of Object.entries(TILE_PALETTES)) {
      for (const c of pal.base) expect(lum(c), key).toBeLessThan(0.1);
      expect(ratio(pal.base[0], pal.base[2]), key).toBeLessThan(1.6);
    }
  });
});
