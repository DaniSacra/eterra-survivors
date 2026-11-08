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
  /** Elites are rare and tough, and drop a chest. */
  elite?: boolean;
}

export const ENEMIES = {
  skeleton: { sprite: 'enemy.skeleton', radius: 11, hp: 10, speed: 70, damage: 5, xp: 1, knockbackResist: 0 },
  spider: { sprite: 'enemy.spider', radius: 9, hp: 5, speed: 125, damage: 4, xp: 1, knockbackResist: 0 },
  slime: { sprite: 'enemy.slime', radius: 17, hp: 45, speed: 42, damage: 8, xp: 3, knockbackResist: 0.6 },
  // Cripta da Igreja Velha
  bones: { sprite: 'enemy.bones', radius: 11, hp: 12, speed: 65, damage: 5, xp: 1, knockbackResist: 0 },
  bat: { sprite: 'enemy.bat', radius: 8, hp: 5, speed: 135, damage: 4, xp: 1, knockbackResist: 0 },
  ghost: { sprite: 'enemy.ghost', radius: 15, hp: 38, speed: 55, damage: 8, xp: 3, knockbackResist: 0.7 },
  // Estrada do Sul
  hooded: { sprite: 'enemy.hooded', radius: 11, hp: 11, speed: 72, damage: 5, xp: 1, knockbackResist: 0 },
  crow: { sprite: 'enemy.crow', radius: 8, hp: 5, speed: 140, damage: 4, xp: 1, knockbackResist: 0 },
  frostWolf: {
    sprite: 'enemy.frostWolf',
    radius: 15,
    hp: 40,
    speed: 60,
    damage: 8,
    xp: 3,
    knockbackResist: 0.5,
  },
  // Elites (stage `elites`): drop a chest.
  goblin: {
    sprite: 'enemy.goblin',
    radius: 18,
    hp: 400,
    speed: 100,
    damage: 12,
    xp: 15,
    knockbackResist: 0.8,
    elite: true,
  },
  golem: {
    sprite: 'enemy.golem',
    radius: 26,
    hp: 900,
    speed: 50,
    damage: 18,
    xp: 25,
    knockbackResist: 0.95,
    elite: true,
  },
  // Bosses (stage `boss`): killing one wins the stage.
  bellRinger: {
    sprite: 'enemy.bellRinger',
    radius: 30,
    hp: 3800,
    speed: 85,
    damage: 18,
    xp: 0,
    knockbackResist: 1,
    boss: true,
  },
  oldWolf: {
    sprite: 'enemy.oldWolf',
    radius: 30,
    hp: 3500,
    speed: 115,
    damage: 18,
    xp: 0,
    knockbackResist: 1,
    boss: true,
  },
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
