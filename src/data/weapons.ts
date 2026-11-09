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
 * A heavy blow that splits the ground: a fissure (a long rectangle) runs out in front of the hero, and a moment
 * later (the weapon's `combo` seconds) a tremor bursts where the blow landed. Everything it hits is stunned.
 */
export interface SlamLevel extends BaseLevel {
  /** Length and width of each fissure, world px. */
  length: number;
  width: number;
  knockback: number;
  /** Fissures per blow, fanned out by `spread` radians. */
  count: number;
  spread: number;
  /** The tremor: a fraction of `damage`, and its radius. */
  tremor: number;
  tremorRadius: number;
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
    /** Slam weapons: the seconds until the tremor. */
    combo?: number;
    /** Arc weapons: every `every`-th swing is a thrust instead, longer (x`range`), narrow (`arc`) and harder (x`damage`). */
    thrust?: { every: number; range: number; arc: number; damage: number };
    /** Thrown weapons: the chance of a critical hit, and its damage multiplier. */
    crit?: { chance: number; mult: number };
  };
}[WeaponKind];

/** Builds the level table from level 1 plus the changes of each next level. */
function levels<L>(first: L, ...changes: Partial<L>[]): L[] {
  const out = [first];
  for (const c of changes) out.push({ ...(out[out.length - 1] as L), ...c });
  return out;
}

export const WEAPONS = {
  /** Lâmina de Valmor: Aldo's village steel, a wide slash in front and, every third blow, a long thrust. */
  blade: {
    kind: 'arc',
    category: 'aimed',
    thrust: { every: 3, range: 1.6, arc: 0.45, damage: 2.2 },
    levels: levels<ArcLevel>(
      { damage: 13, cooldown: 0.9, range: 95, arc: 2.5, knockback: 140, swings: 1 },
      { damage: 17, range: 98 },
      { swings: 2 },
      { damage: 22, cooldown: 0.8, range: 100 },
      { damage: 28, arc: 2.7 },
      { damage: 32, cooldown: 0.7, range: 110 },
      { damage: 46, range: 122, arc: 3 },
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
      { damage: 8.4 },
      { radius: 90 },
      { damage: 10, cooldown: 0.35 },
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
        damage: 18,
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
      { damage: 22 },
      { cooldown: 0.42 },
      { count: 3 },
      { damage: 28 },
      { count: 4, damage: 33, cooldown: 0.36 },
    ),
  },

  /** Cajado de Lyra: an orb of arcane light fired where Lyra looks; it bursts on the first enemy it meets. */
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
        radius: 8,
        spread: 0.25,
        knockback: 60,
        blast: 34,
      },
      { damage: 51 },
      { blast: 42 },
      { count: 2 },
      { damage: 63, cooldown: 0.9 },
      { blast: 50 },
      { damage: 82, cooldown: 0.75 },
    ),
  },
  /** Espadas dos Paladinos: the four raised swords of the crypt, circling Aldo. */
  paladinSwords: {
    kind: 'orbit',
    category: 'area',
    levels: levels<OrbitLevel>(
      { damage: 6.8, cooldown: 0.4, count: 1, orbitRadius: 70, radius: 12, spin: 3, knockback: 80 },
      { count: 2 },
      { damage: 9.6 },
      { count: 3, spin: 3.5 },
      { orbitRadius: 82, radius: 14 },
      { count: 4 },
      { damage: 12, spin: 4 },
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
      { damage: 99, radius: 40, cooldown: 1.7 },
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
        knockback: 260,
      },
      { damage: 46 },
      { count: 2 },
      { pierce: 5 },
      { damage: 59, cooldown: 1.6 },
      { count: 3 },
      { damage: 79, radius: 11 },
    ),
  },
  /** Fogos-Fátuos: slow, lingering lights that hunt the dead. */
  wisps: {
    kind: 'homing',
    category: 'auto',
    levels: levels<HomingLevel>(
      {
        damage: 12,
        cooldown: 1.6,
        speed: 170,
        count: 2,
        pierce: 1,
        lifetime: 4,
        radius: 7,
        turnRate: 4,
        knockback: 10,
      },
      { count: 3 },
      { damage: 15 },
      { pierce: 3, lifetime: 5 },
      { count: 4 },
      { damage: 21 },
      { count: 5, damage: 26, cooldown: 1.1 },
    ),
  },
  /** Escudos de Valmor: round shields circling close, shoving back whatever they hit. */
  shields: {
    kind: 'orbit',
    category: 'area',
    levels: levels<OrbitLevel>(
      { damage: 9.4, cooldown: 0.8, count: 1, orbitRadius: 80, radius: 11, spin: 2.2, knockback: 150 },
      { damage: 12 },
      { count: 2 },
      { orbitRadius: 88, radius: 12 },
      { damage: 16, cooldown: 0.7 },
      { count: 3 },
      { damage: 23, spin: 2.6 },
    ),
  },
  /** Maça de Ferro: the blow splits the ground ahead, the ground shakes where it landed, and whoever is hit reels. */
  mace: {
    kind: 'slam',
    category: 'aimed',
    combo: 0.8,
    levels: levels<SlamLevel>(
      {
        damage: 24,
        cooldown: 1.5,
        length: 150,
        width: 34,
        knockback: 80,
        count: 1,
        spread: 0.5,
        tremor: 0.8,
        tremorRadius: 55,
        stun: 0.4,
      },
      { damage: 31 },
      { length: 175, tremorRadius: 62 },
      { damage: 40, cooldown: 1.35 },
      { width: 42 },
      { damage: 50 },
      { damage: 66, cooldown: 1.15, length: 200, tremorRadius: 72 },
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
      { damage: 42, radius: 56 },
    ),
  },

  // Evolved forms (see data/evolutions.ts): one level, never offered on level-up, only from a chest.

  /** Fúria: Aldo spins the blade against everything around him. */
  fury: {
    kind: 'arc',
    levels: [{ damage: 66, cooldown: 0.5, range: 134, arc: Math.PI * 2, knockback: 160, swings: 1 }],
  },
  /** Luz Sagrada: Teo's holy light, a swarm of piercing motes. */
  holyLight: {
    kind: 'homing',
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
    levels: [{ damage: 15, cooldown: 0.3, radius: 150 }],
  },
  /** Leque de Facas: a wider fan of knives, faster, and crits that cut deeper. */
  fan: {
    kind: 'thrown',
    aim: 'facing',
    crit: { chance: 0.3, mult: 3 },
    levels: [
      {
        damage: 52,
        cooldown: 0.3,
        speed: 560,
        count: 7,
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
    levels: [
      { damage: 57, cooldown: 0.3, count: 6, orbitRadius: 105, radius: 18, spin: 4.5, knockback: 140 },
    ],
  },
  /** Nevasca: frost everywhere. */
  blizzard: {
    kind: 'zone',
    levels: [{ damage: 4.7, cooldown: 1.4, count: 5, radius: 85, duration: 4 }],
  },
  /** Tempestade: a storm over the battlefield. */
  storm: {
    kind: 'strike',
    levels: [{ damage: 36, cooldown: 0.8, count: 8, radius: 52 }],
  },
  /** Quebra-Junta: two fissures fanned out at once, and a tremor that shakes the whole front. */
  jointBreaker: {
    kind: 'slam',
    combo: 0.8,
    levels: [
      {
        damage: 118,
        cooldown: 0.9,
        length: 240,
        width: 46,
        knockback: 110,
        count: 2,
        spread: 0.45,
        tremor: 1,
        tremorRadius: 95,
        stun: 0.5,
      },
    ],
  },

  /** Espada de Fogo: a rain of burning swords over the field. */
  fireSword: {
    kind: 'strike',
    levels: [{ damage: 26, cooldown: 0.8, count: 7, radius: 70 }],
  },
  /** Fúria da Forja: hammers that never stop. */
  forgeFury: {
    kind: 'thrown',
    levels: [
      {
        damage: 103,
        cooldown: 1,
        speed: 300,
        count: 4,
        pierce: 999,
        lifetime: 1.8,
        radius: 18,
        spread: 0.35,
        knockback: 400,
      },
    ],
  },
  /** Procissão das Almas: a long line of lights walking the field. */
  soulProcession: {
    kind: 'homing',
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
  /** Muralha de Valmor: a ring of shields, wide and close-set, that the dead can't get through. */
  valmorWall: {
    kind: 'orbit',
    levels: [
      { damage: 110, cooldown: 0.5, count: 6, orbitRadius: 100, radius: 16, spin: 2.6, knockback: 200 },
    ],
  },
  /** Estrela de Lyra: three big orbs at a time, bursting wide. */
  lyraStar: {
    kind: 'thrown',
    aim: 'facing',
    levels: [
      {
        damage: 58,
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
