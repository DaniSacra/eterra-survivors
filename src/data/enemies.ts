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
   * phase passes through the others and now and then fades out (harmless and untouchable for a moment);
   * shoot keeps its distance and throws slow shots; leap marks the hero's spot and lands there; pack comes in from
   * the side; still stands where it is.
   */
  move?: 'zigzag' | 'charge' | 'phase' | 'shoot' | 'leap' | 'pack' | 'still';
  /** Most of this type alive at once: the spawner sends the stage's basic instead, specials wait. */
  max?: number;
  /** charge: its own numbers instead of the default (core/behaviours.ts CHARGE). */
  charge?: ChargeDef;
  /** shoot: walks to `range`, holds between `keep` and `range`; every `every` s winds up and throws at the hero. */
  shoot?: {
    range: number;
    keep: number;
    every: number;
    windup: number;
    /** The shot: px/s, px, seconds; damage = contact damage x `damage` (default 1). */
    speed: number;
    radius: number;
    life: number;
    damage?: number;
  };
  /** leap: marks the hero's spot, crouches `windup`, flies `air` s (no contact), lands hurting within `radius`. */
  leap?: { trigger: number; windup: number; air: number; radius: number; rest: number };
  /** pack: heads for a point `flank` rad to its side (by uid parity) until within `close` px, then straight in. */
  pack?: { flank: number; close: number };
  /** banner: every `tick` s, the enemies within `radius` are rallied (config.rally) for a little over a tick. */
  banner?: { radius: number; tick: number };
  /** Besides its gem: gold (before greed and the stage's mult) and a random floor item. */
  loot?: { gold?: number; item?: boolean };
}

/** A charge's numbers: within `trigger` px it crouches `windup` s, dashes `dash` s at x`speedMult`, rests `rest` s. */
export interface ChargeDef {
  trigger: number;
  windup: number;
  dash: number;
  speedMult: number;
  rest: number;
}

export const ENEMIES = {
  // Arredores de Valmor: the graveyard of the original (Ossadas, grey bats, grave rats) and its sturdier dead.
  bones: { sprite: 'enemy.bones', radius: 11, hp: 10, speed: 70, damage: 5, xp: 1, knockbackResist: 0 },
  bat: { sprite: 'enemy.bat', radius: 8, hp: 5, speed: 126, damage: 4, xp: 1, knockbackResist: 0 },
  skeleton: {
    sprite: 'enemy.skeleton',
    radius: 14,
    hp: 45,
    speed: 45,
    damage: 8,
    xp: 3,
    knockbackResist: 0.6,
  },
  /** Rato de Cova: the small grey rats of the graveyard (Crônicas de Eterra). */
  graveRat: { sprite: 'enemy.graveRat', radius: 9, hp: 6, speed: 100, damage: 4, xp: 1, knockbackResist: 0 },
  // Cripta da Igreja Velha: the original crypt's giant rats and green slime, with tomb spiders and ghosts.
  /** Rato Gigante: the big rats of the crypt (Crônicas de Eterra), darting at whoever comes close. */
  rat: {
    sprite: 'enemy.rat',
    radius: 12,
    hp: 14,
    speed: 80,
    damage: 6,
    xp: 1,
    knockbackResist: 0.1,
    move: 'charge',
  },
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
  ghost: {
    sprite: 'enemy.ghost',
    radius: 15,
    hp: 44,
    speed: 55,
    damage: 8,
    xp: 3,
    knockbackResist: 0.7,
    move: 'phase',
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
  /** Corvo: dives from the dark onto where the hero stood (FT-04). */
  crow: {
    sprite: 'enemy.crow',
    radius: 8,
    hp: 5,
    speed: 126,
    damage: 4,
    xp: 1,
    knockbackResist: 0,
    move: 'leap',
    leap: { trigger: 240, windup: 0.45, air: 0.6, radius: 24, rest: 3.5 },
  },
  /** Lobo da Geada: the pack comes in from the sides (FT-05). */
  frostWolf: {
    sprite: 'enemy.frostWolf',
    radius: 15,
    hp: 40,
    speed: 60,
    damage: 8,
    xp: 3,
    knockbackResist: 0.5,
    move: 'pack',
    pack: { flank: 1.0, close: 150 },
  },
  /** Goblin Lanceiro: keeps its distance and throws its spear, slower than the hero (FT-03). */
  goblin: {
    sprite: 'enemy.goblin',
    radius: 12,
    hp: 16,
    speed: 70,
    damage: 6,
    xp: 2,
    knockbackResist: 0.2,
    move: 'shoot',
    max: 10,
    shoot: { range: 260, keep: 190, every: 3.2, windup: 0.6, speed: 140, radius: 5, life: 2.2 },
  },
  /** Javali da Geada (provisional name): a long charge down the road; only a step aside saves you (FT-07). */
  frostBoar: {
    sprite: 'enemy.frostBoar',
    radius: 18,
    hp: 55,
    speed: 48,
    damage: 10,
    xp: 4,
    knockbackResist: 0.7,
    move: 'charge',
    charge: { trigger: 340, windup: 0.9, dash: 1.0, speedMult: 5.5, rest: 4 },
  },
  /** The war banner (provisional name): rallies whoever stands near it until it falls (FT-06). */
  warBanner: {
    sprite: 'enemy.warBanner',
    radius: 14,
    hp: 70,
    speed: 0,
    damage: 0,
    xp: 6,
    knockbackResist: 1,
    move: 'still',
    max: 2,
    banner: { radius: 150, tick: 0.25 },
    loot: { gold: 15, item: true },
  },
  // Elites (stage `elites`): drop a chest.
  /** Golem de Pedra: heavy, and it leaps, landing on a wide circle (FT-04). */
  golem: {
    sprite: 'enemy.golem',
    radius: 26,
    hp: 650,
    speed: 50,
    damage: 18,
    xp: 25,
    knockbackResist: 0.95,
    elite: true,
    move: 'leap',
    leap: { trigger: 300, windup: 0.8, air: 0.9, radius: 64, rest: 4 },
  },
  // Bosses (stage `boss`): killing one wins the stage.
  bellRinger: {
    sprite: 'enemy.bellRinger',
    radius: 30,
    hp: 49000,
    speed: 85,
    damage: 12,
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
    hp: 63000,
    speed: 115,
    damage: 12,
    xp: 0,
    knockbackResist: 1,
    boss: true,
    // Mordida Funda: crouches, then lunges in a straight line.
    ability: { kind: 'lunge', every: 4.5, windup: 0.8, trigger: 320, range: 280, damage: 22, dash: 0.5 },
  },
  blackKnight: {
    sprite: 'enemy.blackKnight',
    radius: 34,
    hp: 81000,
    speed: 95,
    damage: 13,
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
