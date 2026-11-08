/** Enemy roster, from the original Crônicas de Eterra cast. Names live in i18n under `enemies`. */
export interface EnemyDef {
  /** Asset key in render/assets.ts. */
  sprite: string;
  radius: number;
  hp: number;
  speed: number;
  /** Contact damage per hit on the player. */
  damage: number;
  /** XP dropped on death (0 = no gem). */
  xp: number;
  /** 0 = full knockback, 1 = immovable. */
  knockbackResist: number;
  boss?: boolean;
}

export const ENEMIES = {
  skeleton: { sprite: 'enemy.skeleton', radius: 11, hp: 10, speed: 70, damage: 5, xp: 1, knockbackResist: 0 },
  spider: { sprite: 'enemy.spider', radius: 9, hp: 5, speed: 125, damage: 4, xp: 1, knockbackResist: 0 },
  slime: { sprite: 'enemy.slime', radius: 17, hp: 45, speed: 42, damage: 8, xp: 3, knockbackResist: 0.6 },
  blackKnight: {
    sprite: 'enemy.blackKnight',
    radius: 34,
    hp: 4000,
    speed: 95,
    damage: 20,
    xp: 0,
    knockbackResist: 1,
    boss: true,
  },
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;
export const ENEMY_IDS = Object.keys(ENEMIES) as EnemyId[];
export const MAX_ENEMY_RADIUS = Math.max(...Object.values(ENEMIES).map((e) => e.radius));
