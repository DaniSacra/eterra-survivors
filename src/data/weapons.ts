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

export interface LevelsByKind {
  arc: ArcLevel;
  homing: HomingLevel;
  aura: AuraLevel;
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
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const STARTING_WEAPON: WeaponId = 'blade';
