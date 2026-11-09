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
  /** 1 = front only, 2 = front and back. */
  swings: number;
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
  homing: HomingLevel;
  aura: AuraLevel;
  thrown: ThrownLevel;
  orbit: OrbitLevel;
  zone: ZoneLevel;
  strike: StrikeLevel;
}
export type WeaponKind = keyof LevelsByKind;

export type WeaponDef = {
  [K in WeaponKind]: {
    kind: K;
    levels: LevelsByKind[K][];
    /** Thrown weapons: 'nearest' aims at the closest enemy; 'facing' (default) flies where the hero walks. */
    aim?: 'nearest' | 'facing';
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
    levels: levels<ArcLevel>(
      { damage: 10, cooldown: 0.9, range: 95, arc: 2.5, knockback: 140, swings: 1 },
      { damage: 13, range: 98 },
      { swings: 2 },
      { damage: 17, cooldown: 0.8, range: 100 },
      { damage: 21, arc: 2.7 },
      { damage: 25, cooldown: 0.7, range: 110 },
      { damage: 36, range: 122, arc: 3 },
    ),
  },
  /** Luz de Elun: seeking motes of holy light. */
  elunLight: {
    kind: 'homing',
    levels: levels<HomingLevel>(
      {
        damage: 9,
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
      { damage: 12, cooldown: 0.8 },
      { count: 3 },
      { pierce: 1, damage: 15 },
      { count: 5 },
      { damage: 20, pierce: 2 },
    ),
  },
  /** Aura de Yah: a burning halo that hurts everything close. */
  yahAura: {
    kind: 'aura',
    levels: levels<AuraLevel>(
      { damage: 4, cooldown: 0.5, radius: 55 },
      { radius: 65 },
      { damage: 6 },
      { radius: 75, cooldown: 0.45 },
      { damage: 8 },
      { radius: 90 },
      { damage: 11, cooldown: 0.35 },
    ),
  },
  /** Adagas de Andilla: quick knives thrown at the nearest enemy, passing through the first ones. */
  daggers: {
    kind: 'thrown',
    aim: 'nearest',
    levels: levels<ThrownLevel>(
      {
        damage: 12,
        cooldown: 0.8,
        speed: 460,
        count: 2,
        pierce: 1,
        lifetime: 1.1,
        radius: 7,
        spread: 0.14,
        knockback: 30,
      },
      { count: 3 },
      { damage: 15 },
      { pierce: 2, cooldown: 0.7 },
      { count: 4 },
      { damage: 18 },
      { damage: 21, pierce: 3 },
    ),
  },
  /** Espadas dos Paladinos: the four raised swords of the crypt, circling Aldo. */
  paladinSwords: {
    kind: 'orbit',
    levels: levels<OrbitLevel>(
      { damage: 10, cooldown: 0.4, count: 1, orbitRadius: 70, radius: 12, spin: 3, knockback: 80 },
      { count: 2 },
      { damage: 14 },
      { count: 3, spin: 3.5 },
      { orbitRadius: 82, radius: 14 },
      { count: 4 },
      { damage: 20, spin: 4 },
    ),
  },
  /** Geada de Valmor: patches of frost that hurt and slow. */
  frost: {
    kind: 'zone',
    levels: levels<ZoneLevel>(
      { damage: 4, cooldown: 3, count: 1, radius: 45, duration: 2.5 },
      { radius: 52 },
      { count: 2 },
      { damage: 6, duration: 3 },
      { radius: 60 },
      { count: 3 },
      { damage: 8, cooldown: 2.5, duration: 3.5 },
    ),
  },
  /** Raio de Lyra: lightning on random enemies. */
  lightning: {
    kind: 'strike',
    levels: levels<StrikeLevel>(
      { damage: 18, cooldown: 2.2, count: 1, radius: 24 },
      { count: 2 },
      { damage: 24 },
      { count: 3, cooldown: 2 },
      { radius: 32 },
      { count: 4, damage: 30 },
      { damage: 38, cooldown: 1.7 },
    ),
  },
  /** Martelo do Gaspar: the smith's heavy hammer, thrown ahead; it ploughs through rows. */
  hammer: {
    kind: 'thrown',
    levels: levels<ThrownLevel>(
      {
        damage: 22,
        cooldown: 1.8,
        speed: 260,
        count: 1,
        pierce: 3,
        lifetime: 1.6,
        radius: 12,
        spread: 0.3,
        knockback: 260,
      },
      { damage: 28 },
      { count: 2 },
      { pierce: 5 },
      { damage: 36, cooldown: 1.6 },
      { count: 3 },
      { damage: 48, radius: 15 },
    ),
  },
  /** Fogos-Fátuos: slow, lingering lights that hunt the dead. */
  wisps: {
    kind: 'homing',
    levels: levels<HomingLevel>(
      {
        damage: 8,
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
      { damage: 11 },
      { pierce: 3, lifetime: 5 },
      { count: 4 },
      { damage: 14 },
      { count: 5, damage: 18, cooldown: 1.1 },
    ),
  },
  /** Sinos de Bronze: heavy bells swinging in a wide, slow circle. */
  bells: {
    kind: 'orbit',
    levels: levels<OrbitLevel>(
      { damage: 14, cooldown: 0.8, count: 1, orbitRadius: 110, radius: 18, spin: 1.6, knockback: 260 },
      { damage: 18 },
      { count: 2 },
      { orbitRadius: 125, radius: 20 },
      { damage: 24, cooldown: 0.7 },
      { count: 3 },
      { damage: 32, spin: 2 },
    ),
  },
  /** Maça de Ferro: a heavy iron mace, slow and wide, that crushes what is in front and throws it back. */
  mace: {
    kind: 'arc',
    levels: levels<ArcLevel>(
      { damage: 16, cooldown: 1.4, range: 88, arc: 2.1, knockback: 230, swings: 1 },
      { damage: 21 },
      { swings: 2 },
      { damage: 27, cooldown: 1.25 },
      { range: 100, arc: 2.4 },
      { damage: 35 },
      { damage: 46, cooldown: 1.1, range: 110 },
    ),
  },
  /** Fogo: flames falling on enemies, fewer than lightning but burning a wider patch. */
  fire: {
    kind: 'strike',
    levels: levels<StrikeLevel>(
      { damage: 14, cooldown: 2, count: 1, radius: 40 },
      { damage: 18 },
      { count: 2 },
      { radius: 48, cooldown: 1.8 },
      { damage: 24 },
      { count: 3 },
      { damage: 32, radius: 56 },
    ),
  },

  // Evolved forms (see data/evolutions.ts): one level, never offered on level-up, only from a chest.

  /** Fúria: Aldo spins the blade against everything around him. */
  fury: {
    kind: 'arc',
    levels: [{ damage: 60, cooldown: 0.65, range: 150, arc: Math.PI * 2, knockback: 220, swings: 1 }],
  },
  /** Luz Sagrada: Teo's holy light, a swarm of piercing motes. */
  holyLight: {
    kind: 'homing',
    levels: [
      {
        damage: 24,
        cooldown: 0.75,
        speed: 340,
        count: 6,
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
    levels: [{ damage: 14, cooldown: 0.3, radius: 150 }],
  },
  /** Leque de Facas: Andilla's fan of knives, a wide spread thrown at the nearest enemy. */
  fan: {
    kind: 'thrown',
    aim: 'nearest',
    levels: [
      {
        damage: 15,
        cooldown: 0.55,
        speed: 480,
        count: 10,
        pierce: 3,
        lifetime: 1.2,
        radius: 7,
        spread: 0.1,
        knockback: 40,
      },
    ],
  },
  /** Vigília dos Quatro: the paladins keep watch, wide and fast. */
  vigil: {
    kind: 'orbit',
    levels: [
      { damage: 28, cooldown: 0.3, count: 6, orbitRadius: 105, radius: 18, spin: 4.5, knockback: 140 },
    ],
  },
  /** Nevasca: frost everywhere. */
  blizzard: {
    kind: 'zone',
    levels: [{ damage: 9, cooldown: 1.8, count: 4, radius: 75, duration: 4 }],
  },
  /** Tempestade: a storm over the battlefield. */
  storm: {
    kind: 'strike',
    levels: [{ damage: 50, cooldown: 1, count: 6, radius: 44 }],
  },
  /** Quebra-Junta: the mace aims at the joints, front and back, with a huge blow. */
  jointBreaker: {
    kind: 'arc',
    levels: [{ damage: 75, cooldown: 1, range: 145, arc: 3, knockback: 320, swings: 2 }],
  },
  /** Espada de Fogo: a rain of burning swords over the field. */
  fireSword: {
    kind: 'strike',
    levels: [{ damage: 38, cooldown: 1.1, count: 5, radius: 58 }],
  },
  /** Fúria da Forja: hammers that never stop. */
  forgeFury: {
    kind: 'thrown',
    levels: [
      {
        damage: 70,
        cooldown: 1.3,
        speed: 300,
        count: 3,
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
        damage: 18,
        cooldown: 1,
        speed: 210,
        count: 8,
        pierce: 4,
        lifetime: 6,
        radius: 10,
        turnRate: 5,
        knockback: 20,
      },
    ],
  },
  /** Dobre Fúnebre: the bells toll for everything around Aldo. */
  funeralToll: {
    kind: 'orbit',
    levels: [
      { damage: 45, cooldown: 0.6, count: 5, orbitRadius: 140, radius: 24, spin: 2.2, knockback: 320 },
    ],
  },
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
