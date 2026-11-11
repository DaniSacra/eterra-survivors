import type Phaser from 'phaser';
import { ENEMY_ART } from './art/enemies';
import { ENEMY_ANIMS, poseKey, type EnemyPose } from './enemyAnims';
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

/** PixelLab canvas sizes of the heroes (art px; files are at ART_RES). */
const FRAME_HIBIT = { w: 64, h: 80 };

export const ASSETS: Record<string, AssetDef> = {
  ...art(TILE_ART, 1),
  ...art(HERO_ART, ART_RES),
  ...art(ENEMY_ART, ART_RES),
  ...art(ITEM_ART, ART_RES),
  ...art(DECAL_ART, ART_RES),
  ...art(OBSTACLE_ART, ART_RES),
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

/** Menus size heroes for the code-drawn chibi's texture (38 + 2 x PAD world px tall): a pixel hero shrinks to it. */
const MENU_HERO_H = (38 + PAD * 2) * ART_RES;

/** Scale factor that shows hero `key` at the size the menus were laid out for. */
export function heroFit(key: string): number {
  const walk = ASSETS[`${key}.walk`];
  return walk?.kind === 'sheet' ? MENU_HERO_H / walk.h : 1;
}

/** `heroFit` for the front-facing pose, which is stored at native size (half of ART_RES). */
export function frontFit(key: string): number {
  return heroFit(key) * ART_RES;
}

/**
 * Extra display scale for pixel sprites drawn at the same pixel density as the heroes but meant to loom (the Sineiro:
 * PixelLab draws every figure about 100 px tall, so a boss gets its size here).
 */
export const SPRITE_SCALE: Record<string, number> = {
  // Target on-screen heights (px), Aldo being 62: crowd about his size, the resistant a head taller, small flyers
  // about half, elites about 1.5x, bosses 2.2x or more. The collision radius stays in data/enemies.ts.
  'enemy.skeleton': 1.25, // 78: the sturdy warrior stands out of the crowd
  'enemy.emberBones': 1.05, // 66
  'enemy.ghost': 0.9, // 55
  'enemy.coldSpirit': 0.92, // 54
  'enemy.slime': 0.8, // 46 x 38
  'enemy.bonePile': 0.42, // about half the width of the skeleton that fell
  'enemy.vampireBat': 0.52, // 29 x 31
};

/** Enemies that fly: they hover over the ground with a shadow under them (GameScene). */
export const FLYERS: Record<string, boolean> = { 'enemy.bat': true, 'enemy.vampireBat': true };

/** Pixel-art enemies (PixelLab): still frames facing right, already upscaled to ART_RES, in public/sprites/enemies/. */
function pixelEnemies(ids: string[]): Record<string, AssetDef> {
  return Object.fromEntries(
    ids.map((id) => [`enemy.${id}`, { kind: 'image', url: `sprites/enemies/${id}.png` } as AssetDef]),
  );
}

/** One strip per pose of every animated enemy (files `<id>-<pose>.png` next to the still, already at ART_RES). */
function enemySheets(): Record<string, AssetDef> {
  const poses: EnemyPose[] = ['walk', 'windup', 'strike', 'death'];
  return Object.fromEntries(
    Object.entries(ENEMY_ANIMS).flatMap(([sprite, a]) =>
      poses.map((pose) => [
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
