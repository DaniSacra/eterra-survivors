/** Global tuning. Content (weapons, enemies, waves, upgrades) lives in its own data files. */
export const config = {
  matchDuration: 600, // seconds; the boss arrives at the end
  devBossAt: 300, // seconds; in test mode (?dev) the boss comes at 5:00
  /**
   * Noite Sem Fim (after beating the boss): the last full wave keeps growing. Per minute of vigil: enemy HP
   * x(1 + hpPerMinute) and contact damage x(1 + damagePerMinute), one more enemy per batch every minute, batches a bit faster (down to minInterval); an
   * elite every `eliteEvery` seconds (its chest keeps the Elos and rewards coming).
   */
  vigil: {
    hpPerMinute: 2,
    damagePerMinute: 1.5,
    batchPerMinute: 1,
    intervalPerMinute: 0.03,
    minInterval: 0.3,
    eliteEvery: 60,
  },
  /** Playtesting: every hero is free. Set to false to sell them for gold again (data/characters.ts costs). */
  unlockAllHeroes: false,
  /** Playtesting: every stage is open. Set to false so each stage opens by clearing the previous one. */
  unlockAllStages: false,
  maxDt: 1 / 20, // clamp long frames so nothing tunnels
  /** Help for a player stuck on a stage never won (PX-17): each defeat in a row adds damage to the next run. */
  assist: { mightPerTry: 0.08, maxTries: 3 },
  view: {
    /** World pixels guaranteed along the screen's shortest side; sets the camera zoom. */
    minWorldSide: 480,
    /** Same, for a phone held upright (height > width): the hero reads bigger on a narrow screen. */
    portraitWorldSide: 420,
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
    /** A fresh pile of bones ignores hits for this long, so one swing of many hits does not break it (CB-01). */
    pileGuard: 0.15,
  },
  /** Damage over time (bleeding, burning): seconds between ticks. */
  dotTick: 0.5,
  /** A banner's rally: what a rallied enemy gets. */
  rally: { speed: 1.3, damage: 1.25 },
  /** Enemy shots (their own pool). */
  enemyShots: { max: 60 },
  /**
   * Ground marks (their own pool): an enemy about to rise inside the view shows `spawnTime` s first, never closer
   * than `spawnMinDist` px to the hero.
   */
  /**
   * The thief rat (FT-10) does not walk in from the edge: it appears `dist` px from the hero (past any blow's reach)
   * on a mark `warn` s ahead, with a sound of coins, and runs from there.
   */
  thief: { dist: 200, warn: 1 },
  /** A ghost's dark form (after its first vanish, until it dies): faster and harder-hitting. */
  darkGhost: { speed: 1.45, damage: 1.8 },
  marks: { max: 160, spawnTime: 0.5, spawnMinDist: 80, poolTick: 0.5 },
  xp: {
    /** XP to go from level L to L+1 = base + step * (L - 1). */
    base: 5,
    step: 6.5,
    choices: 3,
    /**
     * How much likelier a card is when it moves an owned weapon's Elo recipe (a level of that weapon, or of its
     * recipe passive): chasing an Elo is the run's main goal (first one around minutes 5-7).
     */
    recipeWeight: 3,
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
    bombDamage: 600,
    freezeTime: 6,
    /** Elixir (the witch's last potion): heals this share of max HP, and the weapons cool down faster for a while. */
    elixirHeal: 0.5,
    elixirTime: 10,
    elixirCooldown: 0.7,
  },
  gold: {
    /** Chance that a normal enemy drops a coin, and what it is worth (times greed). */
    dropChance: 0.03,
    coin: 3,
  },
  /**
   * Achievements with a `charge` (Primeiro Elo, Bestiário Completo, Livro Completo) add one use per run of that
   * level-up helper. On by Daniel's choice (2026-11-09); off, they give only gold.
   */
  achievementCharges: true,
  /** Level-up helpers every run starts with (the shop adds more). */
  charges: { reroll: 1, skip: 1, banish: 0 },
  /** Segunda Chance: the life the hero gets up with (a fraction of max), and the seconds nothing can hurt them. */
  revive: { hp: 0.5, iframes: 2 },
  /** Gold for giving up a level-up's choice (Pular). Fixed on purpose: greed and the stage do not scale it (decision 6). */
  skipGold: 15,
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
    /** Longest stun a boss takes from a slam (seconds). */
    bossStun: 0.1,
  },
  effects: {
    slashTtl: 0.18,
    /** A mace blow's mark on the ground, and its shock wave running out. */
    smashTtl: 0.4,
    shockTtl: 0.45,
    /** Chama de Yah's wave running out. */
    pulseTtl: 0.4,
    boltTtl: 0.22,
    damageNumberTtl: 0.6,
    damageNumberRise: 40, // px per second
    maxDamageNumbers: 40,
    /** Hits on the same enemy within this many seconds add up into one number. */
    damageMergeTime: 0.25,
    /** From this much damage (after merging) a number is a strong hit. */
    strongHit: 40,
    /**
     * Area hits around the hero would stack a number per enemy: a swing (arc) shows at most this many new numbers,
     * and each falling strike bolt `strikeNumbers` (hits on an enemy that already shows one still add up there).
     */
    arcNumbers: 4,
    strikeNumbers: 2,
    /** Whatever the weapon, at most this many new numbers appear per frame (hits on a shown number still add up). */
    frameNumbers: 6,
    puffTtl: 0.3,
    maxPuffs: 60,
    /** Of those, kept for gem and item glints (deaths never take them). */
    pickupPuffs: 10,
  },
  joystick: {
    /** Radius in CSS px: this share of the screen's shorter side, kept between min and max. */
    radiusShare: 0.13,
    minRadius: 48,
    maxRadius: 64,
    deadZone: 0.12,
  },
} as const;

export type Stats = { -readonly [K in keyof typeof config.player.stats]: number };
export type StatKey = keyof Stats;
