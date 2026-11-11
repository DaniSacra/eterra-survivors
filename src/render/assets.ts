import type Phaser from 'phaser';
import { ENEMY_ART } from './art/enemies';
import { HERO_ART } from './art/heroes';
import { ICON_ART } from './art/icons';
import { ITEM_ART } from './art/items';
import { ART_RES, Pen } from './art/pen';
import { DECAL_ART, OBSTACLE_ART, TILE_ART } from './art/tiles';
import type { ArtDef } from './art/types';

/**
 * The single asset map. Every visual is referenced by key; today they are drawn from code in the cartoon
 * vector style (render/art). To use real art, change an entry to `{ kind: 'image', url: 'sprites/foo.png' }`
 * (files in /public), drawn at ART_RES times its world size like the generated ones.
 */
export type AssetDef =
  /** `res`: texture pixels per world pixel (sprites ART_RES for sharpness; tiles 1). */
  | { kind: 'art'; art: ArtDef; res: number }
  | { kind: 'image'; url: string }
  /** A horizontal strip of animation frames of w x h px (pixel art at ART_RES px per world px). */
  | { kind: 'sheet'; url: string; w: number; h: number; fps: number };

/** Phaser.Textures.FilterMode.NEAREST (a type-only import keeps this module loadable in Node tests). */
const NEAREST = 1 as Phaser.Textures.FilterMode;

/** Transparent margin (world px) around every sprite texture. */
const PAD = 6;

const art = (defs: Record<string, ArtDef>, res: number): Record<string, AssetDef> =>
  Object.fromEntries(Object.entries(defs).map(([k, d]) => [k, { kind: 'art', art: d, res }]));

/** A hero frame in the strips: PixelLab's 48 x 64 canvas at ART_RES. */
const HERO_FRAME = { w: 96, h: 128 };

export const ASSETS: Record<string, AssetDef> = {
  ...art(TILE_ART, 1),
  ...art(HERO_ART, ART_RES),
  ...art(ENEMY_ART, ART_RES),
  ...art(ITEM_ART, ART_RES),
  ...art(DECAL_ART, ART_RES),
  ...art(OBSTACLE_ART, ART_RES),
  ...art(ICON_ART, ART_RES),
  ...pixelHero('aldo', 8, 4),
};

/** Menus size heroes for the code-drawn chibi's texture (38 + 2 x PAD world px tall): a pixel hero shrinks to it. */
const HERO_FIT = ((38 + PAD * 2) * ART_RES) / HERO_FRAME.h;

/** Scale factor that shows hero `key` at the size the menus were laid out for. */
export function heroFit(key: string): number {
  return ASSETS[key]?.kind === 'image' ? HERO_FIT : 1;
}

/**
 * A pixel-art hero (PixelLab, AR-05): a still frame facing right that replaces the code-drawn one everywhere, and
 * walk and idle strips for the run (`<key>.walk`, `<key>.idle`). Files in public/sprites/, upscaled to ART_RES.
 */
function pixelHero(id: string, walk: number, idle: number): Record<string, AssetDef> {
  const frame = { w: HERO_FRAME.w, h: HERO_FRAME.h };
  return {
    [`player.${id}`]: { kind: 'image', url: `sprites/${id}.png` },
    [`player.${id}.walk`]: { kind: 'sheet', url: `sprites/${id}-walk.png`, ...frame, fps: walk },
    [`player.${id}.idle`]: { kind: 'sheet', url: `sprites/${id}-idle.png`, ...frame, fps: idle },
  };
}

export function preloadAssets(scene: Phaser.Scene): void {
  for (const [key, def] of Object.entries(ASSETS)) {
    if (def.kind === 'image') scene.load.image(key, def.url);
    else if (def.kind === 'sheet')
      scene.load.spritesheet(key, def.url, { frameWidth: def.w, frameHeight: def.h });
  }
}

/** Generates the code-drawn textures. Call in `create()` after `preloadAssets`. */
export function generateAssets(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  for (const [key, def] of Object.entries(ASSETS)) {
    if (def.kind !== 'art') {
      // Pixel art stays crisp (no smoothing); strips become looping animations of the same key.
      if (!scene.textures.exists(key)) continue;
      scene.textures.get(key).setFilter(NEAREST);
      if (def.kind === 'sheet' && !scene.anims.exists(key))
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(key),
          frameRate: def.fps,
          repeat: -1,
        });
      continue;
    }
    if (scene.textures.exists(key)) continue;
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
