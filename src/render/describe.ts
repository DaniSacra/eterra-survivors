import { ACHIEVEMENTS, type AchievementId } from '../data/achievements';
import { config, type StatKey } from '../data/config';
import { formatTime } from '../core/format';
import { evolutionOf } from '../data/evolutions';
import { PASSIVES, type PassiveId } from '../data/upgrades';
import { WEAPONS, type WeaponId } from '../data/weapons';
import { weaponLevelDiff, weaponsCompletedBy, type UpgradeOption } from '../core/upgrades';
import { t } from '../i18n/pt-BR';

/** Stats that are multipliers show as percentages. */
const PERCENT_STATS: StatKey[] = ['might', 'cooldown', 'area', 'growth', 'greed'];

const num = (v: number): string => String(Math.round(v * 100) / 100).replace('.', ',');

function weaponValue(stat: string, v: number): string {
  if (stat === 'arc') return t.units.degrees(String(Math.round((v * 180) / Math.PI)));
  if (stat === 'cooldown' || stat === 'duration') return t.units.seconds(num(v));
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

export interface UpgradeText {
  title: string;
  tag: string;
  desc: string;
  /** Asset key of the card's icon. */
  icon: string;
  /** The Elo this option leads to, if any, and whether its passive is owned ("Forma Elo com Força (falta)"). */
  recipe: string;
  /** Icon of the recipe's passive (weapon cards), shown before the recipe; '' when none. */
  recipeIcon: string;
  /** Weapon cards: the recipe's passive is missing (the recipe reads muted). */
  recipeMissing: boolean;
}

/**
 * Texts and icon of a level-up card. `owned`: the hero's weapons, to tell which Elos a passive completes;
 * `passives`: the hero's passives, to tell whether a weapon's recipe is complete.
 */
export function describeUpgrade(
  opt: UpgradeOption,
  owned: readonly WeaponId[] = [],
  passives: Partial<Record<PassiveId, number>> = {},
): UpgradeText {
  switch (opt.kind) {
    case 'weapon': {
      const w = t.weapons[opt.id];
      const evo = evolutionOf(opt.id);
      const max = WEAPONS[opt.id].levels.length;
      let recipe = '';
      if (evo) {
        const name = t.passives[evo.evo.passive];
        const have = (passives[evo.evo.passive] ?? 0) > 0;
        recipe =
          have && opt.level >= max
            ? t.levelUp.eloReady
            : have
              ? t.levelUp.recipeHave(name)
              : t.levelUp.recipeNeed(name);
      }
      const recipeIcon = evo ? `icon.${evo.evo.passive}` : '';
      const recipeMissing = !!evo && !passives[evo.evo.passive];
      const icon = `icon.${opt.id}`;
      if (opt.level === 1)
        return {
          title: w.name,
          tag: t.levelUp.newWeapon,
          desc: w.desc,
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
        icon,
        recipe,
        recipeIcon,
        recipeMissing,
      };
    }
    case 'evolution': {
      const w = t.weapons[opt.id];
      const icon = `icon.${opt.id}`;
      return {
        title: w.name,
        tag: t.levelUp.evolution,
        desc: w.desc,
        icon,
        recipe: '',
        recipeIcon: '',
        recipeMissing: false,
      };
    }
    case 'passive': {
      const def = PASSIVES[opt.id];
      const names = weaponsCompletedBy(owned, opt.id).map((id) => t.weapons[id].name);
      return {
        title: t.passives[opt.id],
        tag: t.units.of(t.levelUp.level(opt.level), def.maxLevel),
        desc: formatStatDelta(def.stat, def.perLevel),
        icon: `icon.${opt.id}`,
        recipe:
          names.length > 1
            ? t.levelUp.recipeForMany(names.join(t.levelUp.and))
            : names.length === 1
              ? t.levelUp.recipeFor(names[0] as string)
              : '',
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
  const f = metric === 'bestTime' || metric === 'untouched' ? formatTime : t.int;
  return t.achievements.progress(f(value), f(goal));
}
