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

/** Straight shots thrown where Aldo faces, fanned out by `spread` radians between shots. */
export interface ThrownLevel extends BaseLevel {
  speed: number;
  count: number;
  pierce: number;
  lifetime: number;
  radius: number;
  spread: number;
  knockback: number;
}

/** Blades circling Aldo; every `cooldown` each one hurts what it touches. */
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

export type WeaponDef = { [K in WeaponKind]: { kind: K; levels: LevelsByKind[K][] } }[WeaponKind];

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
      { damage: 10, cooldown: 0.9, range: 80, arc: 2.2, knockback: 140, swings: 1 },
      { damage: 13, range: 84 },
      { swings: 2 },
      { damage: 17, cooldown: 0.8, range: 90 },
      { damage: 21, arc: 2.7 },
      { damage: 25, cooldown: 0.7, range: 100 },
      { damage: 32, range: 112, arc: 3 },
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
        count: 1,
        pierce: 0,
        lifetime: 2.5,
        radius: 6,
        turnRate: 7,
        knockback: 40,
      },
      { count: 2 },
      { damage: 12 },
      { count: 3, cooldown: 1.15 },
      { pierce: 1, damage: 14 },
      { count: 4 },
      { damage: 18, cooldown: 1, pierce: 2 },
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
  /** Adagas de Andilla: knives thrown straight ahead. */
  daggers: {
    kind: 'thrown',
    levels: levels<ThrownLevel>(
      {
        damage: 8,
        cooldown: 1,
        speed: 420,
        count: 1,
        pierce: 0,
        lifetime: 1.2,
        radius: 6,
        spread: 0.12,
        knockback: 30,
      },
      { count: 2 },
      { damage: 11 },
      { count: 3, cooldown: 0.85 },
      { pierce: 1 },
      { count: 4, damage: 13 },
      { damage: 16, cooldown: 0.7, pierce: 2 },
    ),
  },
  /** Espadas dos Paladinos: the four raised swords of the crypt, circling Aldo. */
  paladinSwords: {
    kind: 'orbit',
    levels: levels<OrbitLevel>(
      { damage: 8, cooldown: 0.4, count: 1, orbitRadius: 70, radius: 12, spin: 3, knockback: 80 },
      { count: 2 },
      { damage: 11 },
      { count: 3, spin: 3.5 },
      { orbitRadius: 82, radius: 14 },
      { count: 4 },
      { damage: 15, spin: 4 },
    ),
  },
  /** Geada de Lyra: patches of frost that hurt and slow. */
  frost: {
    kind: 'zone',
    levels: levels<ZoneLevel>(
      { damage: 6, cooldown: 3, count: 1, radius: 45, duration: 2.5 },
      { radius: 52 },
      { count: 2 },
      { damage: 8, duration: 3 },
      { radius: 60 },
      { count: 3 },
      { damage: 11, cooldown: 2.5, duration: 3.5 },
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

  // Evolved forms (see data/evolutions.ts): one level, never offered on level-up, only from a chest.

  /** Fúria: Aldo spins the blade against everything around him. */
  fury: {
    kind: 'arc',
    levels: [{ damage: 40, cooldown: 0.65, range: 125, arc: Math.PI * 2, knockback: 220, swings: 1 }],
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
    levels: [{ damage: 15, cooldown: 0.3, radius: 125 }],
  },
  /** Leque de Facas: Andilla's fan of knives in every direction. */
  fan: {
    kind: 'thrown',
    levels: [
      {
        damage: 20,
        cooldown: 0.45,
        speed: 480,
        count: 10,
        pierce: 3,
        lifetime: 1.2,
        radius: 7,
        spread: (Math.PI * 2) / 10,
        knockback: 40,
      },
    ],
  },
  /** Vigília dos Quatro: the paladins keep watch, wide and fast. */
  vigil: {
    kind: 'orbit',
    levels: [
      { damage: 22, cooldown: 0.3, count: 6, orbitRadius: 105, radius: 18, spin: 4.5, knockback: 140 },
    ],
  },
  /** Nevasca: frost everywhere. */
  blizzard: {
    kind: 'zone',
    levels: [{ damage: 16, cooldown: 1.8, count: 5, radius: 75, duration: 4 }],
  },
  /** Tempestade: a storm over the battlefield. */
  storm: {
    kind: 'strike',
    levels: [{ damage: 50, cooldown: 1, count: 8, radius: 44 }],
  },
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
