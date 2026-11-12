import {
  ACHIEVEMENTS,
  ACHIEVEMENT_IDS,
  SHARED_WEAPONS,
  type AchievementDef,
  type AchievementId,
  type Metric,
} from '../data/achievements';
import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '../data/characters';
import { config } from '../data/config';
import { SHOP_IDS } from '../data/shop';
import { STAGE_IDS, bestiaryOrder } from '../data/stages';
import type { HeroRecord, MetaSave } from './meta';
import type { RunSummary } from './records';

/**
 * Achievements are pure functions of the save, plus (for the in-run notice) a run not yet recorded. Everything is
 * checked at the end of a run and, live, once a second: no per-frame cost.
 */

/** The best value of a hero record field over every hero. */
function best(save: MetaSave, field: keyof HeroRecord): number {
  let v = 0;
  for (const id of CHARACTER_IDS) {
    const n = save.records[id]?.[field];
    if (typeof n === 'number' && n > v) v = n;
  }
  return v;
}

const sumValues = (o: Partial<Record<string, number>>): number => {
  let n = 0;
  for (const k in o) n += o[k] ?? 0;
  return n;
};

/** Stages `hero` has won (counting a live victory). */
function stagesWon(save: MetaSave, hero: CharacterId, run: RunSummary | null): number {
  const wins = save.records[hero]?.wins ?? {};
  let n = 0;
  for (const s of STAGE_IDS)
    if ((wins[s] ?? 0) > 0 || (run?.won && run.hero === hero && run.stage === s)) n++;
  return n;
}

const liveWin = (run: RunSummary | null, hero?: CharacterId): number =>
  run?.won && (!hero || run.hero === hero) ? 1 : 0;

/** Each metric's current value. `run` is a live run not yet in the save (null once recorded). */
export const METRICS: Record<
  Metric,
  (save: MetaSave, def: AchievementDef, run: RunSummary | null) => number
> = {
  runKills: (s, _d, r) => Math.max(best(s, 'bestKills'), r?.kills ?? 0),
  totalKills: (s, _d, r) => s.totals.kills + (r?.kills ?? 0),
  enemyKills: (s, d, r) =>
    (d.enemies ?? []).reduce((n, id) => n + (s.bestiary[id]?.kills ?? 0) + (r?.killsBy[id] ?? 0), 0),
  bestHit: (s, _d, r) => Math.max(best(s, 'bestHit'), r?.bestHit ?? 0),
  runDamage: (s, _d, r) => Math.max(best(s, 'bestDamage'), r?.damage ?? 0),
  totalDamage: (s, _d, r) => s.totals.damage + (r?.damage ?? 0),
  bestTime: (s, _d, r) => Math.max(best(s, 'bestTime'), r?.time ?? 0),
  untouched: (s, _d, r) => Math.max(best(s, 'untouched'), r?.untouched ?? 0),
  closeWin: (s, d, r) => {
    const at = d.at ?? 0;
    if (r?.won && r.hpLeft <= at) return 1;
    return CHARACTER_IDS.some((id) => {
      const rec = s.records[id];
      return rec !== undefined && sumValues(rec.wins) > 0 && rec.closestWin <= at;
    })
      ? 1
      : 0;
  },
  bestLevel: (s, _d, r) => Math.max(best(s, 'bestLevel'), r?.level ?? 0),
  elosFound: (s, _d, r) => s.elos.length + (r?.elos.filter((id) => !s.elos.includes(id)).length ?? 0),
  runElos: (s, _d, r) => Math.max(best(s, 'maxElos'), r?.elos.length ?? 0),
  heroElos: (s, _d, r) =>
    Math.max(
      0,
      ...CHARACTER_IDS.map((h) => {
        const known = s.records[h]?.elos ?? [];
        const live = r?.hero === h ? r.elos.filter((id) => !known.includes(id)).length : 0;
        return known.length + live;
      }),
    ),
  runMaxed: (s, _d, r) => Math.max(best(s, 'maxMaxed'), r?.maxed ?? 0),
  sharedUsed: (s, _d, r) =>
    SHARED_WEAPONS.filter(
      (w) => r?.weapons.includes(w) || CHARACTER_IDS.some((h) => (s.records[h]?.weaponRuns[w] ?? 0) > 0),
    ).length,
  soloWins: (s, _d, r) => {
    let n = 0;
    for (const id of CHARACTER_IDS) n += s.records[id]?.soloWins ?? 0;
    const sig = r ? CHARACTERS[r.hero].weapon : null;
    return n + (r?.won && r.weapons.every((w) => w === sig) ? 1 : 0);
  },
  heroWins: (s, d, r) => {
    const hero = d.hero ?? 'aldo';
    return sumValues(s.records[hero]?.wins ?? {}) + liveWin(r, hero);
  },
  heroesWon: (s, _d, r) =>
    CHARACTER_IDS.filter((h) => sumValues(s.records[h]?.wins ?? {}) > 0 || liveWin(r, h) > 0).length,
  heroAllStages: (s, _d, r) => Math.max(0, ...CHARACTER_IDS.map((h) => stagesWon(s, h, r))),
  bossFast: (s, d, r) => {
    const limit = config.matchDuration + (d.at ?? 0);
    if (r?.won && r.time <= limit) return 1;
    return CHARACTER_IDS.some((h) => {
      const f = s.records[h]?.fastestWin ?? 0;
      return f > 0 && f <= limit;
    })
      ? 1
      : 0;
  },
  stagesCleared: (s, _d, r) =>
    STAGE_IDS.filter((id) => s.cleared.includes(id) || (r?.won && r.stage === id)).length,
  seen: (s, _d, r) => bestiaryOrder().filter((id) => s.bestiary[id] || r?.seen.includes(id)).length,
  shopLevels: (s) => SHOP_IDS.reduce((n, id) => n + (s.shop[id] ?? 0), 0),
  vigil: (s, _d, r) =>
    Math.max(r?.vigil ?? 0, ...CHARACTER_IDS.flatMap((h) => Object.values(s.records[h]?.vigil ?? {}))),
};

/** How far an achievement is: `value` (capped at the goal) out of `goal`. */
export function progress(
  save: MetaSave,
  id: AchievementId,
  run: RunSummary | null = null,
): { value: number; goal: number } {
  const def = ACHIEVEMENTS[id];
  return { value: Math.min(def.goal, METRICS[def.metric](save, def, run)), goal: def.goal };
}

const isDone = (save: MetaSave, id: AchievementId, run: RunSummary | null): boolean => {
  const p = progress(save, id, run);
  return p.value >= p.goal;
};

/**
 * Unlocks every achievement the save (plus `run`, if not recorded yet) now meets: marks it, flags it as fresh and
 * banks its gold, once. Returns the new ones, in display order.
 */
export function checkAchievements(save: MetaSave, run: RunSummary | null = null): AchievementId[] {
  const out: AchievementId[] = [];
  for (const id of ACHIEVEMENT_IDS) {
    if (save.achievements.includes(id) || !isDone(save, id, run)) continue;
    save.achievements.push(id);
    save.fresh.push(id);
    save.gold += ACHIEVEMENTS[id].gold;
    out.push(id);
  }
  return out;
}

const NONE: readonly AchievementId[] = Object.freeze([]);

/**
 * The in-run notice: achievements the live run has just met that are not in the save and not in `shown` (which
 * this adds them to). Changes nothing else; the real unlock happens when the run is recorded. Allocates a little
 * (the scene calls it once a second, not per frame).
 */
export function liveAchievements(
  save: MetaSave,
  run: RunSummary,
  shown: Set<AchievementId>,
): readonly AchievementId[] {
  let out: AchievementId[] | null = null;
  for (const id of ACHIEVEMENT_IDS) {
    if (shown.has(id) || save.achievements.includes(id) || !isDone(save, id, run)) continue;
    shown.add(id);
    (out ??= []).push(id);
  }
  return out ?? NONE;
}

/**
 * The locked achievement closest to done, from `min` of the way (50% by default) to 99%, for the end screen's
 * "Perto". Null if none.
 */
export function closestAchievement(
  save: MetaSave,
  min = 0.5,
): { id: AchievementId; value: number; goal: number } | null {
  let found: { id: AchievementId; value: number; goal: number } | null = null;
  let bestShare = min;
  for (const id of ACHIEVEMENT_IDS) {
    if (save.achievements.includes(id)) continue;
    const p = progress(save, id);
    const share = p.value / p.goal;
    if (share > 0 && share >= bestShare && share < 1 && (!found || share > bestShare)) {
      found = { id, ...p };
      bestShare = share;
    }
  }
  return found;
}
