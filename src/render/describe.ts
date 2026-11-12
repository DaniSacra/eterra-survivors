import { REWARDS, type RewardDef, type RewardId } from '../data/rewards';
import { ACHIEVEMENTS, type AchievementId } from '../data/achievements';
import { config, type StatKey } from '../data/config';
import { formatTime } from '../core/format';
import { evolutionOf, weaponCategory } from '../data/evolutions';
import { PASSIVES, type PassiveId } from '../data/upgrades';
import { WEAPONS, type WeaponId } from '../data/weapons';
import { weaponLevelDiff, type UpgradeOption } from '../core/upgrades';
import { t } from '../i18n/pt-BR';

/** Stats that are multipliers show as percentages. */
const PERCENT_STATS: StatKey[] = ['might', 'cooldown', 'area', 'growth', 'greed'];

const num = (v: number): string => String(Math.round(v * 100) / 100).replace('.', ',');

function weaponValue(stat: string, v: number): string {
  if (stat === 'arc') return t.units.degrees(String(Math.round((v * 180) / Math.PI)));
  if (stat === 'cooldown' || stat === 'duration' || stat === 'stun' || stat === 'lifetime')
    return t.units.seconds(num(v));
  return num(v);
}

export function formatStatDelta(stat: StatKey, delta: number): string {
  const sign = delta > 0 ? t.units.plus : t.units.minus;
  const abs = Math.abs(delta);
  const value = PERCENT_STATS.includes(stat)
    ? t.units.percent(String(Math.round(abs * 100)))
    : stat === 'regen'
      ? t.units.perSecond(num(abs))
      : num(abs);
  return t.units.delta(t.stats[stat], sign, value);
}

/**
 * A stat's current value for the stat sheet: "-" while it is still at `base`, percent stats as the change from
 * base ("+20%", "−8%"), regen per second, amount as "+1", the rest as plain numbers. Max life always shows.
 */
export function formatStatValue(stat: StatKey, value: number, base: number): string {
  const delta = value - base;
  if (stat !== 'maxHp' && Math.abs(delta) < 1e-6) return t.levelUp.untouched;
  const sign = delta > 0 ? t.units.plus : t.units.minus;
  if (PERCENT_STATS.includes(stat)) return sign + t.units.percent(String(Math.round(Math.abs(delta) * 100)));
  if (stat === 'regen') return t.units.perSecond(num(value));
  if (stat === 'amount') return sign + num(Math.abs(delta));
  return num(value);
}

/**
 * What a level-up card shows in brackets after a passive's change (PU-03, UI-E). Absolute stats (speed, armor,
 * max life, pickup radius, regen) show the real "from → to" even at the base value; percent and amount stats show
 * only the total after, and nothing while there was none yet. Null: no brackets.
 */
export function formatCardTotal(stat: StatKey, from: number, to: number, base: number): string | null {
  if (PERCENT_STATS.includes(stat) || stat === 'amount') {
    if (Math.abs(from - base) < 1e-6) return null;
    return t.levelUp.totalAfter(formatStatValue(stat, to, base));
  }
  const show = (v: number) => (stat === 'regen' ? t.units.perSecond(num(v)) : num(v));
  return t.levelUp.previewBase(show(from), show(to));
}

/** A new weapon's level 1 numbers for its card ("Dano 6 · Recarga 1,8s · Alcance 90", CU-05); '' when none. */
export function weaponStartLine(id: WeaponId): string {
  const level = WEAPONS[id].levels[0] as unknown as Record<string, number> | undefined;
  if (!level) return '';
  // Reach: a projectile's `radius` is its size, so it only counts for the kinds that act around a point.
  const areaKind = WEAPONS[id].kind === 'aura' || WEAPONS[id].kind === 'zone';
  const range = ['range', areaKind ? 'radius' : '', 'orbitRadius'].find((k) => k && level[k] !== undefined);
  return ['damage', 'cooldown', range]
    .filter((k): k is string => !!k && level[k] !== undefined)
    .map((k) => `${t.weaponStats[k]} ${weaponValue(k, level[k] as number)}`)
    .join(t.sep);
}

/** A recipe as a picture (PX-08): the weapon and the passive with their levels, and the Elo they open. */
export interface RecipePicture {
  weaponIcon: string;
  weaponLevel: number;
  weaponMax: number;
  passiveIcon: string;
  passiveLevel: number;
  passiveMax: number;
  /** The Elo's own icon once it has been forged before; null keeps it a golden "?" (NU-02). */
  eloIcon: string | null;
  /** Both levels are at their max: this choice forges the Elo. */
  ready: boolean;
  /** The base weapon's name, for "Combina com a sua ...". */
  weaponName: string;
}

export function recipePicture(
  base: WeaponId,
  weaponLevel: number,
  passiveLevel: number,
  known: readonly WeaponId[],
): RecipePicture | null {
  const evo = evolutionOf(base);
  if (!evo) return null;
  const passive = evo.evo.passive;
  return {
    weaponIcon: `icon.${base}`,
    weaponLevel,
    weaponMax: WEAPONS[base].levels.length,
    passiveIcon: `icon.${passive}`,
    passiveLevel,
    passiveMax: PASSIVES[passive].maxLevel,
    eloIcon: known.includes(evo.id) ? `icon.${evo.id}` : null,
    ready: completes(base, weaponLevel, passiveLevel),
    weaponName: t.weapons[base].name,
  };
}

export interface UpgradeText {
  title: string;
  tag: string;
  desc: string;
  /** Asset key of the card's icon. */
  icon: string;
  /** The Elo recipes this option moves, with their progress after the choice ("Elo Fúria: arma 6/7 · Força 5/5"). */
  recipe: string;
  /** Icon of the recipe's passive (weapon cards), shown before the recipe; '' when none. */
  recipeIcon: string;
  /** The recipe is still incomplete after this choice (it reads muted); false when this choice forges the Elo. */
  recipeMissing: boolean;
  /** The recipe this option moves, as a picture (the first one, or the closest to done for a passive). */
  picture?: RecipePicture;
  /** A new weapon's level 1 numbers; shown before its flavour text (numbers first, flavour only with room). */
  stats?: string;
}

/**
 * One recipe's progress line, levels as they would be: "Elo Fúria: arma 6/7 · Força 5/5". An Elo never forged
 * (not in `known`) keeps its name secret: "Elo de Espada: arma 6/7 · Força 5/5" (NU-02).
 */
export function recipeProgress(
  base: WeaponId,
  weaponLevel: number,
  passiveLevel: number,
  known: readonly WeaponId[],
): string {
  const evo = evolutionOf(base);
  if (!evo) return '';
  const passive = evo.evo.passive;
  const isKnown = known.includes(evo.id);
  return (isKnown ? t.elo.progress : t.elo.progressUnknown)(
    t.weapons[isKnown ? evo.id : base].name,
    t.units.of(String(weaponLevel), WEAPONS[base].levels.length),
    t.passives[passive],
    t.units.of(String(passiveLevel), PASSIVES[passive].maxLevel),
  );
}

/** Whether these levels complete the recipe of `base`. */
function completes(base: WeaponId, weaponLevel: number, passiveLevel: number): boolean {
  const evo = evolutionOf(base);
  return (
    !!evo && weaponLevel >= WEAPONS[base].levels.length && passiveLevel >= PASSIVES[evo.evo.passive].maxLevel
  );
}

/** Icon of each reward card. */
const REWARD_ICON: Record<RewardId, string> = {
  goldBag: 'pickup.gold',
  feast: 'pickup.food',
  blessing: 'icon.might',
};

/**
 * Texts and icon of a level-up card. `owned`: the hero's weapons and levels, `passives`: the hero's passives, for
 * the progress of the Elo recipes the choice moves.
 */
export function describeUpgrade(
  opt: UpgradeOption,
  owned: readonly { id: WeaponId; level: number }[] = [],
  passives: Partial<Record<PassiveId, number>> = {},
  known: readonly WeaponId[] = [],
): UpgradeText {
  switch (opt.kind) {
    case 'weapon': {
      const w = t.weapons[opt.id];
      const evo = evolutionOf(opt.id);
      const max = WEAPONS[opt.id].levels.length;
      const passiveLevel = evo ? (passives[evo.evo.passive] ?? 0) : 0;
      const recipe = recipeProgress(opt.id, opt.level, passiveLevel, known);
      const recipeIcon = evo ? `icon.${evo.evo.passive}` : '';
      const recipeMissing = !!evo && !completes(opt.id, opt.level, passiveLevel);
      const icon = `icon.${opt.id}`;
      if (opt.level === 1)
        return {
          title: w.name,
          // How it fights: aimed (walk to aim it), automatic or around the hero (NU-07).
          tag: t.levelUp.newWeaponOf(t.levelUp.category[weaponCategory(opt.id)]),
          desc: w.desc,
          stats: weaponStartLine(opt.id),
          picture: recipePicture(opt.id, opt.level, passiveLevel, known) ?? undefined,
          icon,
          recipe,
          recipeIcon,
          recipeMissing,
        };
      const desc = weaponLevelDiff(opt.id, opt.level)
        .filter((d) => t.weaponStats[d.stat])
        .map((d) =>
          t.units.change(
            t.weaponStats[d.stat] as string,
            weaponValue(d.stat, d.from),
            weaponValue(d.stat, d.to),
          ),
        )
        .join(t.sep);
      return {
        title: w.name,
        tag: t.units.of(t.levelUp.level(opt.level), max),
        desc,
        picture: recipePicture(opt.id, opt.level, passiveLevel, known) ?? undefined,
        icon,
        recipe,
        recipeIcon,
        recipeMissing,
      };
    }
    case 'passive': {
      const def = PASSIVES[opt.id];
      const moved = owned.filter((o) => evolutionOf(o.id)?.evo.passive === opt.id);
      return {
        title: t.passives[opt.id],
        tag: t.units.of(t.levelUp.level(opt.level), def.maxLevel),
        desc: formatStatDelta(def.stat, def.perLevel),
        icon: `icon.${opt.id}`,
        picture: moved
          .map((o) => recipePicture(o.id, o.level, opt.level, known) as RecipePicture)
          .sort(
            (a, b) =>
              b.weaponLevel / b.weaponMax +
              b.passiveLevel / b.passiveMax -
              (a.weaponLevel / a.weaponMax + a.passiveLevel / a.passiveMax),
          )[0],
        recipe: moved.map((o) => recipeProgress(o.id, o.level, opt.level, known)).join(t.levelUp.recipeSep),
        recipeIcon: '',
        recipeMissing: !moved.some((o) => completes(o.id, o.level, opt.level)),
      };
    }
    case 'reward': {
      const r: RewardDef = REWARDS[opt.id];
      const text = t.rewards[opt.id];
      const n = r.gold ?? Math.round((r.heal ?? r.might ?? 0) * 100);
      return {
        title: text.name,
        tag: t.levelUp.reward,
        desc: text.desc(n),
        icon: REWARD_ICON[opt.id],
        recipe: '',
        recipeIcon: '',
        recipeMissing: false,
      };
    }
    case 'heal':
      return {
        title: t.levelUp.heal,
        tag: '',
        desc: t.levelUp.healDesc(config.xp.healAmount),
        icon: 'pickup.food',
        recipe: '',
        recipeIcon: '',
        recipeMissing: false,
      };
  }
}

/** Short numbers for tables: 980, 19,2k, 1,3M. */
export function formatCompact(v: number): string {
  if (v < 1000) return String(Math.round(v));
  if (v < 1e6) return `${num(Math.round(v / 100) / 10)}${t.end.thousand}`;
  return `${num(Math.round(v / 1e5) / 10)}${t.end.million}`;
}

/** One decimal, pt-BR comma. */
export const formatDecimal = (v: number): string => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

/**
 * An achievement's texts: name, description (with its goal: the seconds for bossFast, else the goal), gold reward
 * and the title it gives, if any.
 */
export function describeAchievement(id: AchievementId): {
  name: string;
  desc: string;
  reward: string;
  title: string | null;
} {
  const def = ACHIEVEMENTS[id];
  const text = t.achievements.items[id];
  const shown = def.metric === 'bossFast' ? (def.at ?? 0) : def.goal;
  return {
    name: text.name,
    desc: typeof text.desc === 'function' ? text.desc(t.int(shown)) : text.desc,
    reward:
      def.charge && config.achievementCharges
        ? t.achievements.reward(def.gold) + t.sep + t.shop.charges[def.charge]
        : t.achievements.reward(def.gold),
    title: t.achievements.titles[id] ?? null,
  };
}

/** "8.240 de 10.000" (times as minutes: "4:10 de 5:00"). */
export function achievementProgress(id: AchievementId, value: number, goal: number): string {
  const metric = ACHIEVEMENTS[id].metric;
  const f = metric === 'bestTime' || metric === 'untouched' || metric === 'vigil' ? formatTime : t.int;
  return t.achievements.progress(f(value), f(goal));
}
