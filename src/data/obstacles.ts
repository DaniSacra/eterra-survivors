/**
 * The things that stand on a stage's ground and block (core/terrain.ts places them, render/obstacles.ts draws them).
 * Each stage has a set; an obstacle's `r` is its hit circle (world px) and the sprite's foot sits on that circle.
 */
export type ObstacleSet = 'crypt' | 'village' | 'road';

export interface ObstacleDef {
  /** Texture key (render/assets.ts, files in public/sprites/obstacles). */
  sprite: string;
  /** Hit radius, world px. */
  r: number;
  /** Where the foot is, as a fraction of the sprite's height: that point sits on the hit circle. */
  foot: number;
  /** Display scale over the shared pixel scale (the Cripta's first four are drawn 1.5x, see render/obstacles.ts). */
  scale: number;
}

const def = (sprite: string, r: number, foot: number, scale = 1): ObstacleDef => ({
  sprite: `obstacle.${sprite}`,
  r,
  foot,
  scale,
});

export const OBSTACLE_SETS: Record<ObstacleSet, readonly ObstacleDef[]> = {
  /** Cripta: columns (every other with a torch), sarcophagi, gravestones, paladin statues and bone piles. */
  crypt: [
    def('0', 20, 0.92, 1.5),
    def('1', 24, 0.64, 1.5),
    def('2', 15, 0.64, 1.5),
    def('statue', 18, 0.9),
    def('bones', 22, 0.78),
  ],
  /** Arredores de Valmor: fences, carts, hay bales and the well. */
  village: [def('fence', 26, 0.8), def('cart', 28, 0.82), def('hay', 22, 0.8), def('well', 24, 0.86)],
  /** Estrada do Sul: logs, boulders and a wrecked cart. */
  road: [def('logs', 26, 0.8), def('rocks', 24, 0.8), def('wreck', 28, 0.8)],
};

/** Every sprite file name (without folder and extension) the obstacles use, for the loader. */
export const OBSTACLE_FILES: readonly string[] = [
  '0',
  '0t',
  '1',
  '2',
  ...Object.values(OBSTACLE_SETS)
    .flat()
    .map((d) => d.sprite.replace('obstacle.', ''))
    .filter((n) => !['0', '1', '2'].includes(n)),
];
