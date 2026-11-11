import { describe, expect, it } from 'vitest';
import { ZONE_FILL_MAX } from '../../src/render/fx';
import fxSource from '../../src/render/fx.ts?raw';
import assetsSource from '../../src/render/assets.ts?raw';

describe('effects keep the pixel look', () => {
  it('no ground disc is filled more opaque than ZONE_FILL_MAX', () => {
    expect(ZONE_FILL_MAX).toBeLessThanOrEqual(0.35);
    // A fill with a literal alpha, straight into a disc on the ground layers.
    const re = /(?:under|ground)\.fillStyle\([^,]+,\s*(0?\.\d+)[^)]*\);\s*disc\((?:under|ground)/g;
    for (const m of fxSource.matchAll(re)) expect(Number(m[1])).toBeLessThanOrEqual(ZONE_FILL_MAX);
  });

  it('every effect sprite is a PixelLab image drawn through the asset map', () => {
    for (const key of [
      'proj.hammer',
      'proj.daggers',
      'proj.staff',
      'proj.elunLight',
      'proj.starlet',
      'proj.lyraStar',
      'fx.shield',
      'fx.maceHead',
    ])
      expect(assetsSource).toContain(`'${key}': { kind: 'image'`);
  });
});
