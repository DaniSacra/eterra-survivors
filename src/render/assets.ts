import { vfxAssets } from './vfx';
import type Phaser from 'phaser';
import { ENEMY_ANIMS, declaredPoses, poseKey } from './enemyAnims';
import { ICON_ART } from './art/icons';
import { OBSTACLE_FILES } from '../data/obstacles';
import { ITEM_ART } from './art/items';
import { ART_RES, ART_SCALE, Pen } from './art/pen';
import type { ArtDef } from './art/types';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { STAGES, stageCast, type StageId } from '../data/stages';
import { CHARACTERS } from '../data/characters';

/**
 * The single asset map. Every visual is referenced by key. Heroes, enemies, decals, obstacles, projectiles and tiles
 * are PNGs (PixelLab, files in /public); only a few small icons (lock, trophy, skull, slow, Gaspar) are still drawn from code (render/art, `Pen`). To swap
 * one, change its entry to `{ kind: 'image', url: 'sprites/foo.png' }`, drawn at ART_RES times its world size.
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

/**
 * The hero's reaction strips (PA-03): a stagger when hit (shown for `seconds`) and a fall on the last death (7 frames
 * over `seconds`, then it lies still; the end screen opens 0.9 s after the death, so the fall must stay under that).
 */
export const HERO_HURT = { frames: 6, seconds: 0.14 };
export const HERO_FALL = { frames: 7, seconds: 0.6 };

/** PixelLab canvas sizes of the heroes (art px; files are at ART_RES). */
const FRAME_HIBIT = { w: 64, h: 80 };

const PIXEL_ICONS = [
  ...['blade', 'elunLight', 'yahAura', 'daggers', 'paladinSwords', 'frost', 'lightning', 'staff', 'hammer'],
  ...[
    'wisps',
    'shields',
    'mace',
    'fire',
    'fury',
    'holyLight',
    'yahFlame',
    'fan',
    'vigil',
    'blizzard',
    'storm',
  ],
  ...['forgeFury', 'soulProcession', 'valmorWall', 'jointBreaker', 'fireSword', 'lyraStar', 'vigor'],
  ...[
    'swiftness',
    'might',
    'haste',
    'reach',
    'attraction',
    'recovery',
    'armor',
    'amount',
    'growth',
    'luck',
    'greed',
  ],
  ...['reroll', 'skip', 'revive', 'anvil'],
];

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
  // Pixel frames for panels and buttons (9-slice, see render/ui.ts `skin`).
  'ui.panel': { kind: 'image', url: 'sprites/ui/panel.png' },
  'ui.button': { kind: 'image', url: 'sprites/ui/button.png' },
  ...vfxAssets(),
  ...art(ITEM_ART, ART_RES),
  // Pixel pickups (PixelLab, PA-04): the rare ones the player most wants to spot; they replace the code-drawn ones.
  'pickup.chest': { kind: 'image', url: 'sprites/items/chest.png' },
  'pickup.magnet': { kind: 'image', url: 'sprites/items/magnet.png' },
  'pickup.bomb': { kind: 'image', url: 'sprites/items/bell.png' },
  // AR-04: the rest of the ground items and the XP gems (light blue, the only cyan on screen) as pixel sprites too.
  'pickup.gold': { kind: 'image', url: 'sprites/items/gold.png' },
  'pickup.food': { kind: 'image', url: 'sprites/items/food.png' },
  'pickup.elixir': { kind: 'image', url: 'sprites/items/elixir.png' },
  'pickup.freeze': { kind: 'image', url: 'sprites/items/freeze.png' },
  'gem.small': { kind: 'image', url: 'sprites/items/gem-small.png' },
  'gem.medium': { kind: 'image', url: 'sprites/items/gem-medium.png' },
  'gem.large': { kind: 'image', url: 'sprites/items/gem-large.png' },
  // Pixel projectiles and pieces of effects (PixelLab, files at ART_RES); they replace the code-drawn ones of the same key.
  'proj.shields': { kind: 'image', url: 'sprites/fx/shield.png' },
  'proj.valmorWall': { kind: 'image', url: 'sprites/fx/shield.png' },
  'proj.hammer': { kind: 'image', url: 'sprites/fx/hammer.png' },
  'proj.forgeFury': { kind: 'image', url: 'sprites/fx/forgeHammer.png' },
  'proj.daggers': { kind: 'image', url: 'sprites/fx/dagger.png' },
  'proj.staff': { kind: 'image', url: 'sprites/fx/staffOrb.png' },
  'proj.holyLight': { kind: 'image', url: 'sprites/fx/holyDove.png' },
  'proj.elunLight': { kind: 'image', url: 'sprites/fx/elunOrb.png' },
  'proj.starlet': { kind: 'image', url: 'sprites/fx/starlet.png' },
  'proj.lyraStar': { kind: 'image', url: 'sprites/fx/lyraStar.png' },
  // Elo and Fogos-Fátuos projectiles (PF-04): hand-built pixel sprites with their own colours (not element-tinted).
  'proj.fury': { kind: 'image', url: 'sprites/fx/furyWave.png' },
  'proj.fan': { kind: 'image', url: 'sprites/fx/fanKnife.png' },
  'proj.wisps': { kind: 'image', url: 'sprites/fx/wisp.png' },
  'proj.soulProcession': { kind: 'image', url: 'sprites/fx/soul.png' },
  'fx.shield': { kind: 'image', url: 'sprites/fx/shield.png' },
  'fx.sword': { kind: 'image', url: 'sprites/fx/sword.png' },
  'fx.maceHead': { kind: 'image', url: 'sprites/fx/maceHead.png' },
  'fx.iceShard': { kind: 'image', url: 'sprites/fx/iceShard.png' },
  // Ground decals and the Cripta's obstacles: PixelLab pixel art (files already at ART_RES), see decals.ts / obstacles.ts.
  ...props('decals', DECALS),
  ...props('obstacles', [...OBSTACLE_FILES]),
  ...art(ICON_ART, ART_RES),
  ...pixelIcons(),
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

/**
 * Weapon, Elo, passive and Loja icons (PixelLab medallions, AR-04b): 32 x 32 art px centred in the 40 x 40 box the
 * code-drawn badges had, at ART_RES, so every call site keeps its scale. Files `sprites/icons/<id>.png`.
 */
function pixelIcons(): Record<string, AssetDef> {
  return Object.fromEntries(
    PIXEL_ICONS.flatMap((id) => [
      [`icon.${id}`, { kind: 'image', url: `sprites/icons/${id}.png` } as AssetDef],
      // The same icon redrawn on a 16 px grid (files at ART_RES) for uses of 20 px and under.
      [`icon.${id}.s`, { kind: 'image', url: `sprites/icons16/${id}.png` } as AssetDef],
    ]),
  );
}

/** Icon uses at or under this size (world px) take the 16 px set at integer scale. */
export const SMALL_ICON_MAX = 20;
/** World px that `size` 28 stands for in every call site: the 32 px medallion is scaled by size / ICON_BADGE. */
export const ICON_BADGE = 28;
const PIXEL_ICON_KEYS = new Set(PIXEL_ICONS.map((id) => `icon.${id}`));

/**
 * Shows icon `key` on `img` at `size` (the old badge-relative size): the 32 px medallion scaled to fit, or, for pixel
 * icons at SMALL_ICON_MAX and under, the 16 px set at exactly one world px per art px (crisp, never fractional).
 */
export function fitIcon(img: Phaser.GameObjects.Image, key: string, size: number): Phaser.GameObjects.Image {
  if (size <= SMALL_ICON_MAX && PIXEL_ICON_KEYS.has(key))
    return img.setTexture(`${key}.s`).setScale(ART_SCALE);
  return img.setTexture(key).setScale((ART_SCALE * size) / ICON_BADGE);
}

/** Pixel props by folder: key `decal.<name>` / `obstacle.<name>`, file `sprites/<folder>/<name>.png`. */
function props(folder: 'decals' | 'obstacles', names: string[]): Record<string, AssetDef> {
  const key = folder === 'decals' ? 'decal' : 'obstacle';
  return Object.fromEntries(
    names.map((n) => [`${key}.${n}`, { kind: 'image', url: `sprites/${folder}/${n}.png` } as AssetDef]),
  );
}

/** Menus size heroes for a texture (38 + 2 x PAD world px tall): a pixel hero shrinks to it. */
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
    // Reacting to damage and the fall before the end screen (PA-03): driven frame by frame by GameScene, not looped.
    [`player.${id}.hurt`]: {
      kind: 'sheet',
      url: `sprites/${id}-hurt.png`,
      ...frame,
      fps: HERO_HURT.frames / HERO_HURT.seconds,
    },
    [`player.${id}.fall`]: {
      kind: 'sheet',
      url: `sprites/${id}-fall.png`,
      ...frame,
      fps: HERO_FALL.frames / HERO_FALL.seconds,
    },
    // The hero facing the viewer (PixelLab south view, native size), for the selection screen.
    [`player.${id}.front`]: { kind: 'image', url: `sprites/${id}-front.png` },
  };
}

/**
 * What loads when. The boot loads what every screen needs; the textures that weigh most (the enemies' sheets and
 * the effect strips, about 110 of the 128 MB the game decodes) wait until something needs them: a run loads its
 * stage's cast, the effects and the hero's reactions (`runKeys`), the Bestiário the sheets it shows (`enemyKeys`).
 */
const isEnemyKey = (key: string): boolean => key.startsWith('enemy.');
const isHeroReaction = (key: string): boolean => /^player\.[a-z]+\.(hurt|fall)$/.test(key);
const isLazy = (key: string): boolean => isEnemyKey(key) || key.startsWith('vfx.') || isHeroReaction(key);

/** The still enemies painted on the home (MenuScene `SIEGE`); the stage and story cards use the bosses' stills. */
export const HOME_ENEMIES = [
  'skeleton',
  'witch',
  'emberBones',
  'golem',
  'vampireBat',
  'ghost',
  'blackKnight',
  'oldWolf',
  'spiderMother',
].map((id) => `enemy.${id}`);

/** Every string inside `value`, at any depth (enemy defs name the enemies they raise and the sprites they show). */
function collectStrings(value: unknown, out: string[]): string[] {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) collectStrings(v, out);
  return out;
}

/** Asset keys of one enemy sprite: its still and each strip it declares. */
function spriteKeys(sprite: string): string[] {
  const prefix = `${sprite}.`;
  return [sprite, ...Object.keys(ASSETS).filter((k) => k.startsWith(prefix))];
}

/**
 * Asset keys for the enemies `ids` and everything their defs name (summons, nest and dig spawns, the pile they
 * fall in, a dark form): found by reading the defs, so a new behaviour needs no list.
 */
export function enemyKeys(ids: Iterable<EnemyId>): string[] {
  const seen = new Set<string>();
  const sprites = new Set<string>();
  const queue = [...ids];
  while (queue.length > 0) {
    const id = queue.pop() as EnemyId;
    if (seen.has(id)) continue;
    seen.add(id);
    const def = ENEMIES[id];
    sprites.add(def.sprite);
    for (const str of collectStrings(def, [])) {
      if (str in ENEMIES) queue.push(str as EnemyId);
      else if (str.startsWith('enemy.') && ASSETS[str]) sprites.add(str);
    }
  }
  return [...sprites].flatMap(spriteKeys);
}

/** The boss stills of the story and stage cards. */
const bossSprites = (): string[] => Object.values(STAGES).map((s) => ENEMIES[s.boss.id].sprite);

/** What the boot loads: everything but the lazy groups, plus the stills of the home and of the boss cards. */
export function bootKeys(): string[] {
  const stills = new Set([...HOME_ENEMIES, ...bossSprites()]);
  return Object.keys(ASSETS).filter((k) => !isLazy(k) || stills.has(k));
}

/**
 * Effect strips only an Elo plays (6 MB each decoded): not loaded with the run, but when the Elo forges (GameScene)
 * or, at the latest, the first frame an effect asks for them (`fxSprites`).
 */
export const ELO_VFX = ['vfx.pulse', 'vfx.furySpin'];

/** The on-demand strips Elo `id` plays (Chama de Yah's wave, Fúria's spin). */
export const eloVfx = (id: string): string[] =>
  id === 'yahFlame' ? ['vfx.pulse'] : id === 'fury' ? ['vfx.furySpin'] : [];

/** What a run of `hero` in `stage` needs on top of the boot: the stage's cast, all effect strips, the hero's reactions. */
export function runKeys(stage: StageId, hero: string): string[] {
  const sprite = CHARACTERS[hero as keyof typeof CHARACTERS]?.sprite ?? `player.${hero}`;
  return [
    ...enemyKeys(stageCast(stage)),
    ...Object.keys(ASSETS).filter((k) => k.startsWith('vfx.') && !ELO_VFX.includes(k)),
    `${sprite}.hurt`,
    `${sprite}.fall`,
  ];
}

/** Queues the files of `keys` that are not loaded yet; true when there is something to load. */
export function queueAssets(scene: Phaser.Scene, keys: Iterable<string>): boolean {
  let any = false;
  for (const key of keys) {
    const def = ASSETS[key];
    if (!def || def.kind === 'art' || scene.textures.exists(key)) continue;
    if (def.kind === 'image') scene.load.image(key, def.url);
    else scene.load.spritesheet(key, def.url, { frameWidth: def.w, frameHeight: def.h });
    any = true;
  }
  return any;
}

/** Loads the boot set (call in `preload`). */
export function preloadAssets(scene: Phaser.Scene): void {
  queueAssets(scene, bootKeys());
}

/** Pixel art stays crisp (no smoothing); strips become looping animations of the same key. */
export function prepareAssets(scene: Phaser.Scene, keys: Iterable<string>): void {
  for (const key of keys) {
    const def = ASSETS[key];
    if (!def || def.kind === 'art' || !scene.textures.exists(key)) continue;
    scene.textures.get(key).setFilter(NEAREST);
    if (def.kind === 'sheet' && !scene.anims.exists(key))
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key),
        frameRate: def.fps,
        repeat: -1,
      });
  }
}

/**
 * Loads `keys` (the ones still missing), prepares them and calls `done`; at once when nothing is missing.
 * `onProgress` gets 0..1 while files arrive.
 */
export function loadThen(
  scene: Phaser.Scene,
  keys: string[],
  done: () => void,
  onProgress?: (p: number) => void,
): void {
  if (!queueAssets(scene, keys)) return done();
  if (onProgress) scene.load.on('progress', onProgress);
  scene.load.once('complete', () => {
    if (onProgress) scene.load.off('progress', onProgress);
    prepareAssets(scene, keys);
    done();
  });
  scene.load.start();
}

/**
 * Frees the on-demand textures (and their animations) not in `keep`, so a session that visits several stages or many
 * Bestiário entries never holds them all at once. The boot set is never freed.
 */
export function releaseAssets(scene: Phaser.Scene, keep: Iterable<string> = []): void {
  const stay = new Set([...bootKeys(), ...keep]);
  for (const key of Object.keys(ASSETS)) {
    if (!isLazy(key) || stay.has(key)) continue;
    if (scene.anims.exists(key)) scene.anims.remove(key);
    if (scene.textures.exists(key)) scene.textures.remove(key);
  }
}

const requested = new Set<string>();

/** Loads `keys` in the background while the scene runs (no bar); asking again for one on its way is harmless. */
export function requestAssets(scene: Phaser.Scene, keys: string[]): void {
  const fresh = keys.filter((k) => !requested.has(k) && !scene.textures.exists(k));
  if (fresh.length === 0) return;
  for (const k of fresh) requested.add(k);
  loadThen(scene, fresh, () => fresh.forEach((k) => requested.delete(k)));
}

/** Generates the code-drawn textures and prepares the loaded ones. Call in `create()` after `preloadAssets`. */
export function generateAssets(scene: Phaser.Scene): void {
  prepareAssets(scene, Object.keys(ASSETS));
  const g = scene.make.graphics({}, false);
  for (const [key, def] of Object.entries(ASSETS)) {
    if (def.kind !== 'art' || scene.textures.exists(key)) continue;
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
