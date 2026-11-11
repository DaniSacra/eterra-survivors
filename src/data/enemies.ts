import type { PickupId } from './pickups';

/**
 * A boss's telegraphed attack (core/bosses.ts). Every `every` seconds, once the hero is within `trigger`, the boss
 * stops for `windup` seconds while a marker shows where it will hit, then:
 * - cleave: hurts the hero if inside the `arc` (radians) of radius `range` toward where it aimed;
 * - toll: `count` `summon`s rise in a ring of radius `range` around the boss (no direct damage);
 * - lunge: dashes `range` px straight at where it aimed, hurting the hero it runs into;
 * - frost: howls, and `count` patches of ice of `radius` form where it marked (`near`..`far` px from the hero, never
 *   under them), slowing the hero to `slow` until the fight ends; at most `cap` (the oldest melts);
 * - web: `count` webs of `radius` (one right on the hero, the rest `near`..`far` px around), each slowing to `slow`
 *   for `life` s once the windup is over; at most `cap` at once (the oldest goes);
 * - eggs: `count` `summon`s (egg sacs) in a ring of radius `range` around the boss, hatching on their own.
 */
export interface BossAbility {
  kind: 'cleave' | 'toll' | 'lunge' | 'frost' | 'web' | 'eggs';
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
  /** frost: patch radius, the most at once, how near and far from the hero, and the hero's speed on the ice. */
  radius?: number;
  cap?: number;
  near?: number;
  far?: number;
  slow?: number;
  /** web: seconds a web lasts once formed. */
  life?: number;
}

/** Mordida Funda: the Lobo Velho crouches, then lunges in a straight line. */
const DEEP_BITE: BossAbility = {
  kind: 'lunge',
  every: 4.5,
  windup: 0.8,
  trigger: 320,
  range: 280,
  damage: 22,
  dash: 0.5,
};

/** Ferroada: the Mãe-Aranha's short lunge (the Aranha Tumular's skill in the original). */
const STING: BossAbility = {
  kind: 'lunge',
  every: 3.5,
  windup: 0.6,
  trigger: 220,
  range: 170,
  damage: 22,
  dash: 0.3,
};

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
  /** A boss with more than one ability uses them in this order, round and round (`ability` is the first). */
  abilities?: BossAbility[];
  /** A boss that closes the ground around the hero on arrival: half the length of the arena, px (FT-08). */
  arena?: number;
  /**
   * A way of moving of its own (core/behaviours.ts): zigzag weaves sideways; charge crouches then dashes;
   * phase passes through the others and now and then fades out (harmless and untouchable for a moment);
   * shoot keeps its distance and throws slow shots; leap marks the hero's spot and lands there; pack comes in from
   * the side; still stands where it is.
   */
  move?: 'zigzag' | 'charge' | 'phase' | 'shoot' | 'leap' | 'pack' | 'still' | 'flee' | 'dig';
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
    /** Lobbed instead of thrown straight: lands where the hero stood after `flight` s and leaves the next of `pools`. */
    lob?: { flight: number; pools: GroundPool[] };
  };
  /**
   * brew (FT-11): every `every` s it stops `windup` s stirring, then heals the others within `radius` by `heal` of
   * their max HP and rallies them for `rally` s.
   */
  brew?: { every: number; windup: number; radius: number; heal: number; rally: number };
  /** leap: marks the hero's spot, crouches `windup`, flies `air` s (no contact), lands hurting within `radius`. */
  leap?: { trigger: number; windup: number; air: number; radius: number; rest: number };
  /** pack: heads for a point `flank` rad to its side (by uid parity) until within `close` px, then straight in. */
  pack?: { flank: number; close: number };
  /** banner: every `tick` s, the enemies within `radius` are rallied (config.rally) for a little over a tick. */
  banner?: { radius: number; tick: number };
  /**
   * nest (FT-09): stands still; while the hero is within `range` px, every `every` s raises `count` of `spawn` beside
   * it (each out of a spawn mark), up to `total` in all. `once`: it is gone after the last batch (an egg hatching).
   */
  nest?: { spawn: string; every: number; count: number; total: number; range: number; once?: boolean };
  /**
   * flee (FT-10): walks up to `keep` px of the hero, then runs from them (to the side), picking up every gem it
   * crosses (`steal`) to carry; after `life` s it runs off the field for good.
   */
  flee?: { keep: number; life: number; steal: boolean };
  /**
   * trail (FT-16): every `every` s it leaves `pool` under itself (a slowing patch), at most `cap` of its trail alive.
   */
  trail?: { every: number; cap: number; pool: GroundPool };
  /**
   * dig (FT-16, the Coveiro): every `every` s it stops `windup` s, then `count` of `spawn` rise in a ring of
   * `radius` px around it (each out of a spawn mark).
   */
  dig?: { every: number; windup: number; count: number; radius: number; spawn: string };
  /**
   * reassemble (FT-15): the first death is not one. It falls in a pile (harmless, still, no gem) that stands up again
   * after `delay` s with `hp` of its max life; any hit on the pile breaks it for good.
   */
  reassemble?: { delay: number; hp: number; sprite: string };
  /**
   * burst (FT-14): when it dies for good it leaves a mark that bursts after `delay` s: hurts the hero within `radius`
   * px (contact damage x `damage`) and the other enemies there (`foes` of its own max HP).
   */
  burst?: { delay: number; radius: number; damage: number; foes: number };
  /**
   * Besides its gem: gold (before greed and the stage's mult), a random floor item, a chest (an elite always drops
   * one) and a given pickup.
   */
  loot?: { gold?: number; item?: boolean; chest?: boolean; pickup?: PickupId };
}

/** A patch an enemy leaves on the ground (core/marks.ts). `hit` is contact damage x hit, every tick, inside it. */
export interface GroundPool {
  kind: 'poison' | 'tar' | 'web' | 'slime';
  radius: number;
  ttl: number;
  slow?: number;
  hit?: number;
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
  /** Ossada: in the crypt it does not stay down unless the pile is broken (FT-15). */
  bones: {
    sprite: 'enemy.bones',
    radius: 11,
    hp: 10,
    speed: 70,
    damage: 5,
    xp: 1,
    knockbackResist: 0,
    reassemble: { delay: 3, hp: 0.3, sprite: 'enemy.bonePile' },
  },
  /** Ossada em Brasa (provisional name): the embers in its chest go off a second after it falls (FT-14). */
  emberBones: {
    sprite: 'enemy.emberBones',
    radius: 11,
    hp: 14,
    speed: 66,
    damage: 5,
    xp: 2,
    knockbackResist: 0,
    max: 8,
    burst: { delay: 1, radius: 48, damage: 1.5, foes: 0.6 },
  },
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
  graveRat: { sprite: 'enemy.graveRat', radius: 9, hp: 9, speed: 78, damage: 4, xp: 1, knockbackResist: 0 },
  // Cripta da Igreja Velha: the original crypt's giant rats and green slime, with tomb spiders and ghosts.
  /** Rato Gigante: the big rats of the crypt (Crônicas de Eterra), darting at whoever comes close. */
  rat: {
    sprite: 'enemy.rat',
    radius: 15,
    hp: 42,
    speed: 55,
    damage: 8,
    xp: 3,
    knockbackResist: 0.5,
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
  /** Gosma Verde: in the crypt it is a hazard, leaving green slime that slows whoever walks in it (FT-16). */
  slime: {
    sprite: 'enemy.slime',
    radius: 17,
    hp: 45,
    speed: 42,
    damage: 8,
    xp: 3,
    knockbackResist: 0.6,
    max: 6,
    trail: { every: 1.2, cap: 5, pool: { kind: 'slime', radius: 26, ttl: 4, slow: 0.7 } },
  },
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
  /** Ninho de Aranha (provisional name): a web bundle that keeps hatching spiders until it is broken (FT-09). */
  spiderNest: {
    sprite: 'enemy.spiderNest',
    radius: 18,
    hp: 60,
    speed: 0,
    damage: 0,
    xp: 8,
    knockbackResist: 1,
    move: 'still',
    max: 3,
    nest: { spawn: 'spider', every: 4, count: 2, total: 10, range: 520 },
    loot: { gold: 10, item: true },
  },
  /** Rato Ladrão (provisional name): runs off with the gems on the ground; catch it for them and a chest (FT-10). */
  thiefRat: {
    sprite: 'enemy.thiefRat',
    radius: 10,
    hp: 30,
    speed: 135,
    damage: 0,
    xp: 0,
    knockbackResist: 0.3,
    move: 'flee',
    max: 1,
    flee: { keep: 200, life: 16, steal: true },
    loot: { chest: true },
  },
  /** Ovo de Aranha (provisional name): hatches three spiders in a few seconds unless broken first (FT-12). */
  spiderEgg: {
    sprite: 'enemy.spiderEgg',
    radius: 10,
    hp: 40,
    speed: 0,
    damage: 0,
    xp: 1,
    knockbackResist: 1,
    move: 'still',
    nest: { spawn: 'spider', every: 3.5, count: 3, total: 3, range: 9999, once: true },
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
  /**
   * Bruxa do Caldeirão (provisional name): keeps away and lobs potions where the hero stands (poison, then tar); now
   * and then stirs the cauldron, healing and rallying the crowd around it. Falls with a chest and an Elixir (FT-11).
   */
  witch: {
    sprite: 'enemy.witch',
    radius: 20,
    hp: 450,
    speed: 55,
    damage: 10,
    xp: 20,
    knockbackResist: 0.85,
    elite: true,
    move: 'shoot',
    shoot: {
      range: 280,
      keep: 200,
      every: 3,
      windup: 0.7,
      speed: 0,
      radius: 8,
      life: 0,
      lob: {
        flight: 0.9,
        pools: [
          { kind: 'poison', radius: 52, ttl: 4, hit: 0.5 },
          { kind: 'tar', radius: 60, ttl: 4, slow: 0.6 },
        ],
      },
    },
    brew: { every: 8, windup: 1, radius: 170, heal: 0.3, rally: 4 },
    loot: { pickup: 'elixir' },
  },
  /**
   * Coveiro (provisional name): a gravedigger who keeps the crypt's graves; now and then plants the shovel and a ring
   * of Ossadas climbs out of the ground around him (FT-16).
   */
  gravedigger: {
    sprite: 'enemy.gravedigger',
    radius: 20,
    hp: 480,
    speed: 48,
    damage: 12,
    xp: 20,
    knockbackResist: 0.85,
    elite: true,
    move: 'dig',
    dig: { every: 7, windup: 1.1, count: 4, radius: 110, spawn: 'bones' },
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
    ability: DEEP_BITE,
    // Two bites, then the Uivo da Geada (provisional name): ice that stays until the fight ends (FT-08).
    abilities: [
      DEEP_BITE,
      DEEP_BITE,
      {
        kind: 'frost',
        every: 4.5,
        windup: 1.2,
        trigger: 600,
        range: 0,
        damage: 0,
        count: 2,
        radius: 64,
        cap: 6,
        near: 120,
        far: 220,
        slow: 0.6,
      },
    ],
    arena: 450,
  },
  /**
   * Mãe-Aranha (provisional name): Ferroada (a short lunge), Teia (webs that slow), Ferroada, Ovos (sacs that hatch
   * unless broken), round and round (FT-12).
   */
  spiderMother: {
    sprite: 'enemy.spiderMother',
    radius: 32,
    hp: 81000,
    speed: 90,
    damage: 18,
    xp: 0,
    knockbackResist: 1,
    boss: true,
    ability: STING,
    abilities: [
      STING,
      {
        kind: 'web',
        every: 4,
        windup: 0.9,
        trigger: 500,
        range: 100,
        damage: 0,
        count: 3,
        radius: 60,
        life: 8,
        slow: 0.55,
        cap: 6,
        near: 60,
        far: 200,
      },
      STING,
      {
        kind: 'eggs',
        every: 4,
        windup: 1,
        trigger: 600,
        range: 110,
        damage: 0,
        summon: 'spiderEgg',
        count: 4,
      },
    ],
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
