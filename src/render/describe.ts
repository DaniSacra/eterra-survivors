import { config, type StatKey } from '../data/config';
import { evolutionOf } from '../data/evolutions';
import { PASSIVES } from '../data/upgrades';
import { WEAPONS } from '../data/weapons';
import { weaponLevelDiff, type UpgradeOption } from '../core/upgrades';
import { t } from '../i18n/pt-BR';

/** Stats that are multipliers show as percentages. */
const PERCENT_STATS: StatKey[] = ['might', 'cooldown', 'area'];

const num = (v: number): string => String(Math.round(v * 100) / 100).replace('.', ',');

function weaponValue(stat: string, v: number): string {
  if (stat === 'arc') return `${Math.round((v * 180) / Math.PI)}°`;
  if (stat === 'cooldown') return `${num(v)}s`;
  return num(v);
}

export function formatStatDelta(stat: StatKey, delta: number): string {
  const sign = delta > 0 ? '+' : '−';
  const abs = Math.abs(delta);
  const value = PERCENT_STATS.includes(stat)
    ? `${Math.round(abs * 100)}%`
    : stat === 'regen'
      ? `${num(abs)}/s`
      : num(abs);
  return `${t.stats[stat]} ${sign}${value}`;
}

/** Title, tag and description lines for a level-up card. */
export function describeUpgrade(opt: UpgradeOption): { title: string; tag: string; desc: string } {
  switch (opt.kind) {
    case 'weapon': {
      const w = t.weapons[opt.id];
      if (opt.level === 1) return { title: w.name, tag: t.levelUp.newWeapon, desc: w.desc };
      const desc = weaponLevelDiff(opt.id, opt.level)
        .filter((d) => t.weaponStats[d.stat])
        .map((d) => `${t.weaponStats[d.stat]} ${weaponValue(d.stat, d.from)} → ${weaponValue(d.stat, d.to)}`)
        .join(' · ');
      const max = WEAPONS[opt.id].levels.length;
      const evo = opt.level === max ? evolutionOf(opt.id) : null;
      const hint = evo ? ` ${t.levelUp.evolvesWith(t.passives[evo.evo.passive])}` : '';
      return { title: w.name, tag: `${t.levelUp.level(opt.level)}/${max}`, desc: desc + hint };
    }
    case 'evolution': {
      const w = t.weapons[opt.id];
      return { title: w.name, tag: t.levelUp.evolution, desc: w.desc };
    }
    case 'passive': {
      const def = PASSIVES[opt.id];
      return {
        title: t.passives[opt.id],
        tag: `${t.levelUp.level(opt.level)}/${def.maxLevel}`,
        desc: formatStatDelta(def.stat, def.perLevel),
      };
    }
    case 'heal':
      return { title: t.levelUp.heal, tag: '', desc: t.levelUp.healDesc(config.xp.healAmount) };
  }
}
