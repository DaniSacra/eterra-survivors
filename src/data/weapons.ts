/**
 * Weapons. Each has a `kind` (behaviour, implemented once in core/weapons.ts) and per-level stats.
 * Adding a weapon of an existing kind = a new entry here + its name/description in i18n.
 * Every level must have `damage` and `cooldown` (seconds; for auras, the tick interval).
 */
interface BaseLevel {
  damage: number;
  cooldown: number;
}

export interface ArcLevel extends BaseLevel {
  range: number;
  /** Width of the slash, radians. */
  arc: number;
  knockback: number;
  /** 1 = front only, 2 = front and back (or twice in front, see the weapon's `combo`). */
  swings: number;
  /** Shock wave where the blow lands (at the tip of the reach): a fraction of `damage`, hitting what the swing missed. */
  shock?: number;
  /** Radius of that shock wave, world px. */
  shockRadius?: number;
}

/**
 * A heavy blow in front of the hero: everything within `radius` of where it lands is hit and stunned. Every
 * `waveEvery`-th blow (the weapon's) a shock wave runs out to `waveRadius`, a fraction `wave` of the damage,
 * throwing everything back (`waveKnockback`).
 */
export interface SlamLevel extends BaseLevel {
  radius: number;
  knockback: number;
  wave: number;
  waveRadius: number;
  waveKnockback: number;
  /** Seconds the enemies hit can't move or bite (bosses: config.weapons.bossStun at most). */
  stun: number;
}

export interface HomingLevel extends BaseLevel {
  speed: number;
  count: number;
  /** Extra enemies each projectile passes through. */
  pierce: number;
  lifetime: number;
  radius: number;
  /** Radians per second the projectile can turn. */
  turnRate: number;
  knockback: number;
}

export interface AuraLevel extends BaseLevel {
  radius: number;
}

/** Straight shots fanned out by `spread` radians, thrown where the hero faces (or at the nearest enemy, see `aim`). */
export interface ThrownLevel extends BaseLevel {
  speed: number;
  count: number;
  pierce: number;
  lifetime: number;
  radius: number;
  spread: number;
  knockback: number;
  /** The shot bursts on the first enemy it meets, hurting everything within this radius (0 or absent: none). */
  blast?: number;
}

/** Blades circling the hero; each hurts what it touches, then waits `cooldown` before hitting that enemy again. */
export interface OrbitLevel extends BaseLevel {
  count: number;
  orbitRadius: number;
  /** Hit radius of each blade. */
  radius: number;
  /** Radians per second. */
  spin: number;
  knockback: number;
}

/** Patches of frost dropped on random enemies; they hurt (every config.zones.tick) and slow. */
export interface ZoneLevel extends BaseLevel {
  count: number;
  radius: number;
  duration: number;
}

/** Bolts from the sky on random enemies, hurting a small area around each. */
export interface StrikeLevel extends BaseLevel {
  count: number;
  radius: number;
}

export interface LevelsByKind {
  arc: ArcLevel;
  slam: SlamLevel;
  homing: HomingLevel;
  aura: AuraLevel;
  thrown: ThrownLevel;
  orbit: OrbitLevel;
  zone: ZoneLevel;
  strike: StrikeLevel;
}
export type WeaponKind = keyof LevelsByKind;

/**
 * How a weapon finds its targets, which sets how strong it may be (crowd DPS at max level, against the best aimed
 * weapon): `aimed` goes where the hero walks or looks (85–100%), `auto` aims by itself or falls on random enemies
 * (50–65%), `area` works around the hero: auras, orbits, zones (40–55%).
 */
export type WeaponCategory = 'aimed' | 'auto' | 'area';
export const CATEGORY_BANDS: Record<WeaponCategory, [number, number]> = {
  aimed: [0.85, 1],
  auto: [0.5, 0.65],
  area: [0.4, 0.55],
};

export type WeaponDef = {
  [K in WeaponKind]: {
    kind: K;
    levels: LevelsByKind[K][];
    /** Thrown weapons: 'nearest' aims at the boss or the closest enemy; 'facing' (default) goes where the hero walks. */
    aim?: 'nearest' | 'facing';
    /** Strength band (base weapons only; an Elo inherits its base's, see `weaponCategory`). */
    category?: WeaponCategory;
    /** Slam weapons: every this many blows the shock wave runs out (1 = every blow). */
    waveEvery?: number;
    /** Thrown weapons: the chance of a critical hit, and its damage multiplier. */
    crit?: { chance: number; mult: number };
    /**
     * Arc weapons (Fúria): every `every`-th blow also sends a cutting wave where the hero faces, through everything
     * (x`damage` of the blow, `speed` px/s for `lifetime` s, hit radius `radius`).
     */
    wave?: { every: number; damage: number; speed: number; lifetime: number; radius: number };
    /**
     * Bursting shots (Estrela de Lyra): the burst throws `count` small stars that land `distance` px around it
     * after `fall` s and burst again at `scale` of the damage and radius (one generation only).
     */
    split?: { count: number; distance: number; scale: number; fall: number };
    /** Slam weapons: each full shock wave sets off a smaller one (x`scale` damage and radius) `delay` s later. */
    aftershock?: { scale: number; delay: number };
    /** Slam weapons: damage multiplier against enemies already stunned when hit (esmagar). */
    crush?: number;
    /** Thrown weapons (Leque de Facas): a shot that hits bounces to the nearest enemy within `range`, `count` times. */
    ricochet?: { count: number; range: number };
    /** Thrown weapons: a critical hit makes the enemy bleed `dps` x the hit's damage per second for `duration` s. */
    bleed?: { dps: number; duration: number };
    /** Luz Sagrada: each kill heals the hero `heal` HP, at most `perSecond` times a second. */
    mend?: { heal: number; perSecond: number };
    /** Chama de Yah: every `every`-th pulse is a wave out to x`radius`, x`damage`, pushing everything away. */
    pulse?: { every: number; damage: number; radius: number; knockback: number };
    /**
     * Vigília: each sword darts out `reach` px and back once a turn, as it passes the direction of the nearest
     * enemy (over `window` of the turn).
     */
    dart?: { reach: number; window: number };
    /** Nevasca: an enemy that dies inside its frost shatters, hurting all around it (x`damage` of a tick). */
    shatter?: { damage: number; radius: number };
    /** Tempestade: each bolt jumps to `count` more enemies within `range`, x`damage` each. */
    chain?: { count: number; range: number; damage: number };
    /**
     * Thrown weapons (Escudos de Valmor): the shot flies a closed curve (a circle of a radius between `minRadius`
     * and `maxRadius`, on a random side, whose far point is the target) and may hit everything again on the way back.
     */
    loop?: { minRadius: number; maxRadius: number };
    /** Fúria da Forja: the hammer turns back halfway and hits again on the way home. */
    boomerang?: boolean;
    /** Procissão: each kill adds a wisp to the next casts, up to `cap`, for `duration` s after the last kill. */
    swell?: { cap: number; duration: number };
    /**
     * Muralha de Valmor: a guard that takes one hit every `every` s; the attacker gets x`damage` of a shield's
     * blow back.
     */
    ward?: { every: number; damage: number };
    /**
     * Espada de Fogo: where the sword lands the ground burns for `duration` s (x`damage` of the strike per tick),
     * setting alight whoever walks in (`burn`: x`dps` of the strike per second, for `for` s).
     */
    ground?: { duration: number; damage: number; burn: number; for: number };
  };
}[WeaponKind];

/** Builds the level table from level 1 plus the changes of each next level. */
function levels<L>(first: L, ...changes: Partial<L>[]): L[] {
  const out = [first];
  for (const c of changes) out.push({ ...(out[out.length - 1] as L), ...c });
  return out;
}

export const WEAPONS = {
  /** Lâmina de Valmor: Aldo's village steel, a wide slash in front. */
  blade: {
    kind: 'arc',
    category: 'aimed',
    levels: levels<ArcLevel>(
      { damage: 16, cooldown: 0.9, range: 95, arc: 2.5, knockback: 140, swings: 1 },
      { damage: 21, range: 98 },
      { swings: 2 },
      { damage: 25, cooldown: 0.8, range: 100 },
      { damage: 28, arc: 2.7 },
      { damage: 30, cooldown: 0.7, range: 110 },
      { damage: 43, range: 122, arc: 3 },
    ),
  },

  /** Luz de Elun: seeking motes of holy light. */
  elunLight: {
    kind: 'homing',
    category: 'auto',
    levels: levels<HomingLevel>(
      {
        damage: 7.9,
        cooldown: 1.3,
        speed: 280,
        count: 2,
        pierce: 0,
        lifetime: 2.5,
        radius: 6,
        turnRate: 7,
        knockback: 40,
      },
      { cooldown: 1 },
      { damage: 11, cooldown: 0.8 },
      { count: 3 },
      { pierce: 1, damage: 13 },
      { count: 5 },
      { damage: 17, pierce: 2 },
    ),
  },
  /** Aura de Yah: a burning halo that hurts everything close. */
  yahAura: {
    kind: 'aura',
    category: 'area',
    levels: levels<AuraLevel>(
      { damage: 4.2, cooldown: 0.5, radius: 55 },
      { radius: 65 },
      { damage: 6.3 },
      { radius: 75, cooldown: 0.45 },
      { damage: 6.5 },
      { radius: 120 },
      { damage: 4.8, cooldown: 0.35, radius: 150 },
    ),
  },
  /** Adagas de Andilla: quick knives thrown where she runs, in a narrow fan; each stops in the first enemy, and some crit. */
  daggers: {
    kind: 'thrown',
    category: 'aimed',
    aim: 'facing',
    crit: { chance: 0.2, mult: 2 },
    levels: levels<ThrownLevel>(
      {
        damage: 17,
        cooldown: 0.5,
        speed: 520,
        count: 1,
        pierce: 0,
        lifetime: 0.9,
        radius: 7,
        spread: 0.08,
        knockback: 25,
      },
      { count: 2 },
      { damage: 21 },
      { cooldown: 0.42 },
      { count: 3 },
      { damage: 27 },
      { count: 4, damage: 32, cooldown: 0.36 },
    ),
  },

  /** Cajado de Lyra: a fireball fired where Lyra looks, small at first and bigger with each level; it bursts on the first enemy. */
  staff: {
    kind: 'thrown',
    category: 'aimed',
    aim: 'facing',
    levels: levels<ThrownLevel>(
      {
        damage: 39,
        cooldown: 1.1,
        speed: 340,
        count: 1,
        pierce: 0,
        lifetime: 1.3,
        radius: 7,
        spread: 0.25,
        knockback: 60,
        blast: 34,
      },
      { damage: 51, radius: 8 },
      { blast: 42, radius: 9 },
      { count: 2, radius: 10 },
      { damage: 63, cooldown: 0.9, radius: 12 },
      { blast: 50, radius: 13 },
      { damage: 82, cooldown: 0.75, radius: 15 },
    ),
  },
  /** Espadas dos Paladinos: the four raised swords of the crypt, circling Aldo. */
  paladinSwords: {
    kind: 'orbit',
    category: 'area',
    levels: levels<OrbitLevel>(
      { damage: 7.6, cooldown: 0.4, count: 1, orbitRadius: 70, radius: 9, spin: 5, knockback: 80 },
      { count: 2 },
      { damage: 10.7 },
      { count: 3, spin: 5.8 },
      { orbitRadius: 96, radius: 12 },
      { count: 4 },
      { damage: 10.5, spin: 6.6, orbitRadius: 130 },
    ),
  },
  /** Geada de Valmor: patches of frost that hurt and slow. */
  frost: {
    kind: 'zone',
    category: 'area',
    levels: levels<ZoneLevel>(
      { damage: 3.9, cooldown: 3, count: 1, radius: 45, duration: 2.5 },
      { radius: 52 },
      { count: 2 },
      { damage: 5.9, duration: 3 },
      { radius: 60 },
      { count: 3 },
      { damage: 7.9, cooldown: 2.5, duration: 3.5 },
    ),
  },
  /** Raio: lightning on random enemies. */
  lightning: {
    kind: 'strike',
    category: 'auto',
    levels: levels<StrikeLevel>(
      { damage: 46, cooldown: 2.2, count: 1, radius: 32 },
      { count: 2 },
      { damage: 62 },
      { count: 3, cooldown: 2 },
      { radius: 36 },
      { count: 4, damage: 78 },
      { damage: 90, radius: 40, cooldown: 1.7 },
    ),
  },
  /** Martelo do Gaspar: the smith's heavy hammer, thrown ahead; it ploughs through rows. */
  hammer: {
    kind: 'thrown',
    category: 'aimed',
    levels: levels<ThrownLevel>(
      {
        damage: 37,
        cooldown: 1.8,
        speed: 260,
        count: 1,
        pierce: 3,
        lifetime: 1.6,
        radius: 9,
        spread: 0.3,
        knockback: 500,
      },
      { damage: 46 },
      { count: 2 },
      { pierce: 5 },
      { damage: 59, cooldown: 1.6 },
      { count: 3 },
      { damage: 79, radius: 11 },
    ),
  },
  /** Fogos-Fátuos: a few green flames shot at once at the nearest enemy on screen, like knives that aim themselves. */
  wisps: {
    kind: 'thrown',
    category: 'auto',
    aim: 'nearest',
    levels: levels<ThrownLevel>(
      {
        damage: 12.5,
        cooldown: 1.3,
        speed: 380,
        count: 2,
        pierce: 0,
        lifetime: 1.3,
        radius: 6,
        spread: 0.2,
        knockback: 10,
      },
      { count: 3 },
      { damage: 17.5 },
      { pierce: 1, lifetime: 1.5 },
      { count: 4 },
      { damage: 24 },
      { count: 5, damage: 28, cooldown: 1.0 },
    ),
  },

  /**
   * Escudos de Valmor: a shield thrown at the nearest enemy that spins out in a wide curve, loops round and comes
   * back to where it started, hitting everyone along the way (twice: out and home).
   */
  shields: {
    kind: 'thrown',
    category: 'auto',
    aim: 'nearest',
    loop: { minRadius: 70, maxRadius: 130 },
    levels: levels<ThrownLevel>(
      {
        damage: 22,
        cooldown: 1.6,
        speed: 330,
        count: 1,
        pierce: 999,
        lifetime: 2,
        radius: 18,
        spread: 0.5,
        knockback: 220,
      },
      { damage: 10.4 },
      { count: 2 },
      { radius: 20, cooldown: 1.45 },
      { damage: 13.7 },
      { count: 3 },
      { damage: 18.5, cooldown: 1.3 },
    ),
  },
  /** Maça de Ferro: a heavy blow in front that leaves enemies reeling; every third, a shock wave throws them back. */
  mace: {
    kind: 'slam',
    category: 'aimed',
    waveEvery: 3,
    levels: levels<SlamLevel>(
      {
        damage: 20,
        cooldown: 1.4,
        radius: 60,
        knockback: 160,
        wave: 0.8,
        waveRadius: 105,
        waveKnockback: 450,
        stun: 0.4,
      },
      { damage: 26 },
      { radius: 65, waveRadius: 115 },
      { damage: 32, cooldown: 1.25 },
      { radius: 70 },
      { damage: 41 },
      { damage: 58, cooldown: 1.1, radius: 75, waveRadius: 125 },
    ),
  },

  /** Fogo: flames falling on enemies, fewer than lightning but burning a wider patch. */
  fire: {
    kind: 'strike',
    category: 'auto',
    levels: levels<StrikeLevel>(
      { damage: 15, cooldown: 2, count: 1, radius: 40 },
      { damage: 20 },
      { count: 2 },
      { radius: 48, cooldown: 1.8 },
      { damage: 26 },
      { count: 3 },
      { damage: 38, radius: 56 },
    ),
  },

  // Evolved forms (see data/evolutions.ts): one level, never offered on level-up; they forge from their recipe.

  /** Fúria: the blade whirls around the hero; every other blow a cutting wave runs ahead. */
  fury: {
    kind: 'arc',
    wave: { every: 2, damage: 3, speed: 460, lifetime: 0.8, radius: 34 },
    levels: [{ damage: 45, cooldown: 0.5, range: 134, arc: Math.PI * 2, knockback: 160, swings: 1 }],
  },
  /** Luz Sagrada: Teo's holy light, a swarm of piercing motes. */
  holyLight: {
    kind: 'homing',
    mend: { heal: 1, perSecond: 4 },
    levels: [
      {
        damage: 32,
        cooldown: 0.65,
        speed: 340,
        count: 8,
        pierce: 4,
        lifetime: 3,
        radius: 8,
        turnRate: 9,
        knockback: 60,
      },
    ],
  },
  /** Chama de Yah: the halo becomes a wide pyre. */
  yahFlame: {
    kind: 'aura',
    pulse: { every: 10, damage: 4, radius: 1.25, knockback: 650 },
    levels: [{ damage: 11, cooldown: 0.3, radius: 150 }],
  },
  /** Leque de Facas: knives that bounce from enemy to enemy, and crits that make them bleed. */
  fan: {
    kind: 'thrown',
    aim: 'facing',
    crit: { chance: 0.3, mult: 3 },
    ricochet: { count: 3, range: 220 },
    bleed: { dps: 0.5, duration: 3 },
    levels: [
      {
        damage: 22,
        cooldown: 0.4,
        speed: 560,
        count: 5,
        pierce: 0,
        lifetime: 1,
        radius: 8,
        spread: 0.12,
        knockback: 30,
      },
    ],
  },

  /** Vigília dos Quatro: the paladins keep watch, wide and fast. */
  vigil: {
    kind: 'orbit',
    dart: { reach: 120, window: 0.16 },
    levels: [
      { damage: 56, cooldown: 0.3, count: 6, orbitRadius: 105, radius: 18, spin: 4.5, knockback: 140 },
    ],
  },
  /** Nevasca: frost everywhere. */
  blizzard: {
    kind: 'zone',
    shatter: { damage: 8, radius: 55 },
    levels: [{ damage: 4.7, cooldown: 1.4, count: 5, radius: 85, duration: 4 }],
  },
  /** Tempestade: a storm over the battlefield. */
  storm: {
    kind: 'strike',
    chain: { count: 2, range: 170, damage: 0.7 },
    levels: [{ damage: 38, cooldown: 0.8, count: 6, radius: 52 }],
  },
  /** Quebra-Junta: the shock wave on every blow, an aftershock right after it, and the stunned get crushed. */
  jointBreaker: {
    kind: 'slam',
    waveEvery: 1,
    aftershock: { scale: 0.7, delay: 0.3 },
    crush: 1.5,
    levels: [
      {
        damage: 76,
        cooldown: 0.9,
        radius: 70,
        knockback: 260,
        wave: 0.7,
        waveRadius: 150,
        waveKnockback: 800,
        stun: 0.5,
      },
    ],
  },

  /** Espada de Fogo: a rain of burning swords over the field. */
  fireSword: {
    kind: 'strike',
    ground: { duration: 2.5, damage: 0.15, burn: 0.3, for: 2 },
    levels: [{ damage: 18, cooldown: 0.8, count: 5, radius: 70 }],
  },
  /** Fúria da Forja: hammers that never stop. */
  forgeFury: {
    kind: 'thrown',
    boomerang: true,
    levels: [
      {
        damage: 54,
        cooldown: 1,
        speed: 300,
        count: 4,
        pierce: 999,
        lifetime: 3.4,
        radius: 18,
        spread: 0.35,
        knockback: 400,
      },
    ],
  },
  /** Procissão das Almas: a long line of lights walking the field. */
  soulProcession: {
    kind: 'homing',
    swell: { cap: 4, duration: 4 },
    levels: [
      {
        damage: 36,
        cooldown: 0.9,
        speed: 210,
        count: 9,
        pierce: 4,
        lifetime: 6,
        radius: 10,
        turnRate: 5,
        knockback: 20,
      },
    ],
  },
  /** Muralha de Valmor: a ring of shields thrown out on every side at once, and a guard that holds one blow. */
  valmorWall: {
    kind: 'thrown',
    aim: 'nearest',
    loop: { minRadius: 90, maxRadius: 140 },
    ward: { every: 10, damage: 3 },
    levels: [
      {
        damage: 21,
        cooldown: 1.5,
        speed: 330,
        count: 8,
        pierce: 999,
        lifetime: 2,
        radius: 24,
        spread: (Math.PI * 2) / 8,
        knockback: 500,
      },
    ],
  },
  /** Estrela de Lyra: the orb bursts and splits into small stars that fall around it and burst again. */
  lyraStar: {
    kind: 'thrown',
    aim: 'facing',
    split: { count: 5, distance: 70, scale: 0.5, fall: 0.35 },
    levels: [
      {
        damage: 33,
        cooldown: 0.6,
        speed: 380,
        count: 3,
        pierce: 0,
        lifetime: 1.4,
        radius: 11,
        spread: 0.3,
        knockback: 90,
        blast: 80,
      },
    ],
  },
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
