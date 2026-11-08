import type Phaser from 'phaser';
import { ENEMY_ART } from './art/enemies';
import { HERO_ART } from './art/heroes';
import { ITEM_ART } from './art/items';
import { ART_RES, Pen } from './art/pen';
import { TILE_ART } from './art/tiles';
import type { ArtDef } from './art/types';

/**
 * The single asset map. Every visual is referenced by key; today they are drawn from code in the cartoon
 * vector style (render/art). To use real art, change an entry to `{ kind: 'image', url: 'sprites/foo.png' }`
 * (files in /public), drawn at ART_RES times its world size like the generated ones.
 */
export type AssetDef =
  /** `res`: texture pixels per world pixel (sprites ART_RES for sharpness; tiles 1). */
  { kind: 'art'; art: ArtDef; res: number } | { kind: 'image'; url: string };

/** Transparent margin (world px) around every sprite texture. */
const PAD = 6;

const art = (defs: Record<string, ArtDef>, res: number): Record<string, AssetDef> =>
  Object.fromEntries(Object.entries(defs).map(([k, d]) => [k, { kind: 'art', art: d, res }]));

export const ASSETS: Record<string, AssetDef> = {
  ...art(TILE_ART, 1),
  ...art(HERO_ART, ART_RES),
  ...art(ENEMY_ART, ART_RES),
  ...art(ITEM_ART, ART_RES),
};

export function preloadAssets(scene: Phaser.Scene): void {
  for (const [key, def] of Object.entries(ASSETS)) {
    if (def.kind === 'image') scene.load.image(key, def.url);
  }
}

/** Generates the code-drawn textures. Call in `create()` after `preloadAssets`. */
export function generateAssets(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  for (const [key, def] of Object.entries(ASSETS)) {
    if (def.kind === 'image' || scene.textures.exists(key)) continue;
    // Sprites get a margin so outlines, hats and ears never get cut; images stay centred on their box.
    const pad = def.art === TILE_ART[key] ? 0 : PAD;
    g.clear();
    g.save();
    g.scaleCanvas(def.res, def.res);
    g.translateCanvas(pad, pad);
    def.art.draw(new Pen(g));
    g.restore();
    g.generateTexture(
      key,
      Math.ceil((def.art.w + pad * 2) * def.res),
      Math.ceil((def.art.h + pad * 2) * def.res),
    );
  }
  g.destroy();
}
