import type Phaser from 'phaser';
import { ENEMY_ART } from './art/enemies';
import { ENEMY_ANIMS, declaredPoses, poseKey } from './enemyAnims';
import { HERO_ART } from './art/heroes';
import { ICON_ART } from './art/icons';
import { OBSTACLE_FILES } from '../data/obstacles';
import { ITEM_ART } from './art/items';
import { ART_RES, Pen } from './art/pen';
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

/** PixelLab canvas sizes of the heroes (art px; files are at ART_RES). */
const FRAME_HIBIT = { w: 64, h: 80 };

const DECALS = [
  'grave',
  'snowMound',
  'twigs',
  'iceFlower',
  'candle',
  'slab',
  'moss',
  'bonePile',
  'crack',
  'web',
  'puddle',
  'bush',
  'lantern',
  'campfire',
  'fence',
  'ruts',
  'stones',
];

export const ASSETS: Record<string, AssetDef> = {
  // Ground tiles: PixelLab ground (2x2 mirrored so it repeats without a seam, at ART_RES), see docs/art/credits.md.
  tile: { kind: 'image', url: 'sprites/tiles/valmor.png' },
  'tile.crypt': { kind: 'image', url: 'sprites/tiles/crypt.png' },
  'tile.road': { kind: 'image', url: 'sprites/tiles/road.png' },
  'tile.forest': { kind: 'image', url: 'sprites/tiles/forest.png' },
  ...art(HERO_ART, ART_RES),
  ...art(ENEMY_ART, ART_RES),
  ...art(ITEM_ART, ART_RES),
  // Pixel projectiles and pieces of effects (PixelLab, files at ART_RES); they replace the code-drawn ones of the same key.
  'proj.shields': { kind: 'image', url: 'sprites/fx/shield.png' },
  'proj.valmorWall': { kind: 'image', url: 'sprites/fx/shield.png' },
  'proj.hammer': { kind: 'image', url: 'sprites/fx/hammer.png' },
  'proj.forgeFury': { kind: 'image', url: 'sprites/fx/forgeHammer.png' },
  'proj.daggers': { kind: 'image', url: 'sprites/fx/dagger.png' },
  'proj.staff': { kind: 'image', url: 'sprites/fx/staffOrb.png' },
  'proj.holyLight': { kind: 'image', url: 'sprites/fx/holyOrb.png' },
  'proj.elunLight': { kind: 'image', url: 'sprites/fx/elunOrb.png' },
  'proj.starlet': { kind: 'image', url: 'sprites/fx/starlet.png' },
  'proj.lyraStar': { kind: 'image', url: 'sprites/fx/lyraStar.png' },
  'fx.shield': { kind: 'image', url: 'sprites/fx/shield.png' },
  'fx.sword': { kind: 'image', url: 'sprites/fx/sword.png' },
  'fx.maceHead': { kind: 'image', url: 'sprites/fx/maceHead.png' },
  // Ground decals and the Cripta's obstacles: PixelLab pixel art (files already at ART_RES), see decals.ts / obstacles.ts.
  ...props('decals', DECALS),
  ...props('obstacles', [...OBSTACLE_FILES]),
  ...art(ICON_ART, ART_RES),
  ...pixelEnemies([
    'bones',
    'skeleton',
    'emberBones',
    'bonePile',
    'ghost',
    'coldSpirit',
    'slime',
    'vampireBat',
    'gravedigger',
    'bellRinger',
  ]),
  // Bosses and elites with state animations: a still (walk frame 0) and one strip per pose, see enemyAnims.ts.
  ...pixelEnemies(Object.keys(ENEMY_ANIMS).map((k) => k.replace('enemy.', ''))),
  ...enemySheets(),
  // The home's painted layers (PixelLab, 512 px wide, transparent sky), see scenes/MenuScene.ts.
  'home.mountains': { kind: 'image', url: 'home/mountains.png' },
  'home.village': { kind: 'image', url: 'home/village.png' },
  'home.foreground': { kind: 'image', url: 'home/foreground.png' },
  ...pixelHero('aldo', FRAME_HIBIT, 8, 4),
  ...pixelHero('lyra', FRAME_HIBIT, 8, 4),
  ...pixelHero('teo', FRAME_HIBIT, 8, 4),
  ...pixelHero('andilla', FRAME_HIBIT, 8, 4),
};

/** Pixel props by folder: key `decal.<name>` / `obstacle.<name>`, file `sprites/<folder>/<name>.png`. */
function props(folder: 'decals' | 'obstacles', names: string[]): Record<string, AssetDef> {
  const key = folder === 'decals' ? 'decal' : 'obstacle';
  return Object.fromEntries(
    names.map((n) => [`${key}.${n}`, { kind: 'image', url: `sprites/${folder}/${n}.png` } as AssetDef]),
  );
}

/** Menus size heroes for the code-drawn chibi's texture (38 + 2 x PAD world px tall): a pixel hero shrinks to it. */
const MENU_HERO_H = (38 + PAD * 2) * ART_RES;

/** Scale factor that shows hero `key` at the size the menus were laid out for. */
export function heroFit(key: string): number {
  const walk = ASSETS[`${key}.walk`];
  return walk?.kind === 'sheet' ? MENU_HERO_H / walk.h : 1;
}

/**
 * Extra display scale for pixel sprites, whole numbers only (empty today: every sprite is generated at its final size,
 * see tests/render/density.test.ts).
 */
export const SPRITE_SCALE: Record<string, number> = {};

/** Enemies that fly: they hover over the ground with a shadow under them (GameScene). */
export const FLYERS: Record<string, boolean> = { 'enemy.bat': true, 'enemy.vampireBat': true };

/** Pixel-art enemies (PixelLab): still frames facing right, already upscaled to ART_RES, in public/sprites/enemies/. */
function pixelEnemies(ids: string[]): Record<string, AssetDef> {
  return Object.fromEntries(
    ids.map((id) => [`enemy.${id}`, { kind: 'image', url: `sprites/enemies/${id}.png` } as AssetDef]),
  );
}

/** One strip per declared pose of every animated enemy (files `<id>-<pose>.png` next to the still, already at ART_RES). */
function enemySheets(): Record<string, AssetDef> {
  return Object.fromEntries(
    Object.entries(ENEMY_ANIMS).flatMap(([sprite, a]) =>
      declaredPoses(a).map((pose) => [
        poseKey(sprite, pose),
        {
          kind: 'sheet',
          url: `sprites/enemies/${sprite.replace('enemy.', '')}-${pose}.png`,
          w: a.w,
          h: a.h,
          fps: a.fps[pose],
        } as AssetDef,
      ]),
    ),
  );
}

/**
 * A pixel-art hero (PixelLab, AR-05): a still frame facing right that replaces the code-drawn one everywhere, and
 * walk and idle strips for the run (`<key>.walk`, `<key>.idle`). Files in public/sprites/, upscaled to ART_RES.
 */
function pixelHero(
  id: string,
  size: { w: number; h: number },
  walk: number,
  idle: number,
): Record<string, AssetDef> {
  const frame = { w: size.w * ART_RES, h: size.h * ART_RES };
  return {
    [`player.${id}`]: { kind: 'image', url: `sprites/${id}.png` },
    [`player.${id}.walk`]: { kind: 'sheet', url: `sprites/${id}-walk.png`, ...frame, fps: walk },
    [`player.${id}.idle`]: { kind: 'sheet', url: `sprites/${id}-idle.png`, ...frame, fps: idle },
    // The hero facing the viewer (PixelLab south view, native size), for the selection screen.
    [`player.${id}.front`]: { kind: 'image', url: `sprites/${id}-front.png` },
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
    const pad = PAD;
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
