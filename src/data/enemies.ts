/**
 * A boss's telegraphed attack (core/bosses.ts). Every `every` seconds, once the hero is within `trigger`, the boss
 * stops for `windup` seconds while a marker shows where it will hit, then:
 * - cleave: hurts the hero if inside the `arc` (radians) of radius `range` toward where it aimed;
 * - toll: `count` `summon`s rise in a ring of radius `range` around the boss (no direct damage);
 * - lunge: dashes `range` px straight at where it aimed, hurting the hero it runs into.
 */
export interface BossAbility {
  kind: 'cleave' | 'toll' | 'lunge';
  every: number;
  windup: number;
  trigger: number;
  range: number;
  damage: number;
  arc?: number;
  /** toll: what rises (an EnemyId) and how many. */
  summon?: string;
  count?: number;
  /** lunge: dash duration, seconds. */
  dash?: number;
}

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
  ability?: BossAbility;
  /**
   * A way of moving of its own (core/behaviours.ts): zigzag weaves sideways; charge crouches then dashes;
   * phase passes through the others and now and then fades out (harmless and untouchable for a moment).
   */
  move?: 'zigzag' | 'charge' | 'phase';
}

export const ENEMIES = {
  skeleton: { sprite: 'enemy.skeleton', radius: 11, hp: 10, speed: 70, damage: 5, xp: 1, knockbackResist: 0 },
  spider: {
    sprite: 'enemy.spider',
    radius: 9,
    hp: 5,
    speed: 120,
    damage: 4,
    xp: 1,
    knockbackResist: 0,
    move: 'zigzag',
  },
  slime: { sprite: 'enemy.slime', radius: 17, hp: 45, speed: 42, damage: 8, xp: 3, knockbackResist: 0.6 },
  // Cripta da Igreja Velha
  bones: { sprite: 'enemy.bones', radius: 11, hp: 12, speed: 65, damage: 5, xp: 1, knockbackResist: 0 },
  bat: { sprite: 'enemy.bat', radius: 8, hp: 5, speed: 126, damage: 4, xp: 1, knockbackResist: 0 },
  ghost: {
    sprite: 'enemy.ghost',
    radius: 15,
    hp: 38,
    speed: 55,
    damage: 8,
    xp: 3,
    knockbackResist: 0.7,
    move: 'phase',
  },
  /** Rato Gigante: the big rats of the crypt (Crônicas de Eterra), darting at whoever comes close. */
  rat: {
    sprite: 'enemy.rat',
    radius: 12,
    hp: 16,
    speed: 80,
    damage: 6,
    xp: 2,
    knockbackResist: 0.1,
    move: 'charge',
  },
  // Estrada do Sul
  hooded: {
    sprite: 'enemy.hooded',
    radius: 11,
    hp: 11,
    speed: 72,
    damage: 5,
    xp: 1,
    knockbackResist: 0,
    move: 'charge',
  },
  crow: { sprite: 'enemy.crow', radius: 8, hp: 5, speed: 126, damage: 4, xp: 1, knockbackResist: 0 },
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
    hp: 650,
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
    hp: 13000,
    speed: 85,
    damage: 18,
    xp: 0,
    knockbackResist: 1,
    boss: true,
    // A badalada: the bell swings, and the dead of the crypt rise around him.
    ability: {
      kind: 'toll',
      every: 8,
      windup: 1.1,
      trigger: 600,
      range: 80,
      damage: 0,
      summon: 'bones',
      count: 8,
    },
  },
  oldWolf: {
    sprite: 'enemy.oldWolf',
    radius: 30,
    hp: 12000,
    speed: 115,
    damage: 18,
    xp: 0,
    knockbackResist: 1,
    boss: true,
    // Mordida Funda: crouches, then lunges in a straight line.
    ability: { kind: 'lunge', every: 4.5, windup: 0.8, trigger: 320, range: 280, damage: 22, dash: 0.5 },
  },
  blackKnight: {
    sprite: 'enemy.blackKnight',
    radius: 34,
    hp: 14000,
    speed: 95,
    damage: 20,
    xp: 0,
    knockbackResist: 1,
    boss: true,
    // Corte Brutal: raises the sword, then a wide slash in front.
    ability: { kind: 'cleave', every: 3.5, windup: 0.8, trigger: 170, range: 140, damage: 26, arc: 2.2 },
  },
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;
export const ENEMY_IDS = Object.keys(ENEMIES) as EnemyId[];
export const MAX_ENEMY_RADIUS = Math.max(...Object.values(ENEMIES).map((e) => e.radius));
