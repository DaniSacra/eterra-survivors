/** Global tuning. Content (weapons, enemies, waves, upgrades) lives in its own data files. */
export const config = {
  matchDuration: 600, // seconds; the boss arrives at the end
  /** Playtesting: every hero is free. Set to false to sell them for gold again (data/characters.ts costs). */
  unlockAllHeroes: true,
  maxDt: 1 / 20, // clamp long frames so nothing tunnels
  view: {
    /** World pixels guaranteed along the screen's shortest side; sets the camera zoom. */
    minWorldSide: 480,
  },
  player: {
    radius: 12,
    iframes: 0.5, // seconds of invulnerability after a hit
    pickupRadius: 18,
    stats: {
      maxHp: 100,
      moveSpeed: 150,
      magnet: 70,
      might: 1, // damage multiplier
      cooldown: 1, // cooldown multiplier (lower is faster)
      area: 1, // area multiplier
      regen: 0, // hp per second
      armor: 0, // flat damage taken reduction per hit
      amount: 0, // extra projectiles / blades / patches / bolts
      growth: 1, // xp multiplier
      greed: 1, // gold multiplier
    },
    /** Hits never do less than this, whatever the armor. */
    minDamage: 2,
  },
  enemies: {
    maxActive: 700,
    /** Extra distance beyond the screen corner where enemies appear. */
    spawnMargin: 40,
    /** Enemies farther than spawnRadius * this are moved back in front of the player. */
    recycleFactor: 1.6,
    /** How hard overlapping enemies push each other apart (0..1 of the overlap per step). */
    separation: 0.5,
    knockbackDecay: 10, // per second
    hitFlash: 0.1,
  },
  xp: {
    /** XP to go from level L to L+1 = base + step * (L - 1). */
    base: 5,
    step: 6.5,
    choices: 3,
    /** Fallback option when everything is maxed. */
    healAmount: 30,
  },
  gems: {
    /** Above this many gems on the ground, new drops merge into the nearest gem. */
    maxActive: 250,
    pullSpeed: 380,
    /** Visual tiers by value (asset keys in render/assets.ts), highest first. */
    tiers: [
      { min: 20, sprite: 'gem.large' },
      { min: 5, sprite: 'gem.medium' },
      { min: 0, sprite: 'gem.small' },
    ],
  },
  pickups: {
    /** Collision radius of things on the ground (chests, food...). */
    radius: 14,
    /** Chance that a normal enemy drops a random floor item (data/pickups.ts weights). */
    dropChance: 0.006,
    maxActive: 40,
    foodHeal: 30,
    bombDamage: 250,
    freezeTime: 6,
  },
  gold: {
    /** Chance that a normal enemy drops a coin, and what it is worth (times greed). */
    dropChance: 0.03,
    coin: 3,
    /** Extra gold in every chest. */
    chest: 25,
  },
  /** Level-up helpers every run starts with (the shop adds more). */
  charges: { reroll: 1, skip: 1, banish: 0 },
  zones: {
    /** Seconds between damage ticks of a frost patch. */
    tick: 0.5,
    /** Speed multiplier of an enemy inside frost. */
    slowFactor: 0.45,
  },
  weapons: {
    maxOwned: 6,
    /** Different passives a run can hold; once full, only the owned ones level up (choices keep weight). */
    maxPassives: 6,
    /** Homing shots look for targets within this distance. */
    seekRange: 420,
    /** Retry delay when a weapon had nothing to shoot at. */
    idleRetry: 0.2,
  },
  effects: {
    slashTtl: 0.18,
    boltTtl: 0.22,
    damageNumberTtl: 0.6,
    damageNumberRise: 40, // px per second
    maxDamageNumbers: 40,
    /** Hits on the same enemy within this many seconds add up into one number. */
    damageMergeTime: 0.25,
    /** From this much damage (after merging) a number is a strong hit. */
    strongHit: 40,
    puffTtl: 0.3,
    maxPuffs: 60,
    /** Of those, kept for gem and item glints (deaths never take them). */
    pickupPuffs: 10,
  },
  joystick: {
    radius: 56,
    deadZone: 0.12,
  },
} as const;

export type Stats = { -readonly [K in keyof typeof config.player.stats]: number };
export type StatKey = keyof Stats;
