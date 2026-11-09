import { CHARACTER_IDS, type CharacterId } from './characters';
import { ENEMY_IDS, type EnemyId } from './enemies';
import { EVOLUTIONS, EVOLVED_IDS } from './evolutions';
import type { ChargeKey } from './shop';
import { STAGE_IDS } from './stages';
import { WEAPON_IDS } from './weapons';

/** The Coleção's achievement pages. */
export type AchievementGroup =
  'kills' | 'damage' | 'survival' | 'weapons' | 'heroes' | 'stages' | 'collection';

/**
 * What an achievement measures (core/achievements.ts `METRICS`), always read from the save (plus a live run):
 * - runKills, bestHit, runDamage, bestTime, untouched, bestLevel, runElos, runMaxed: the best of any hero's record;
 * - totalKills, totalDamage: the totals; enemyKills: bestiary kills of `enemies`;
 * - closeWin: 1 once a victory ended with `at` or less of the HP; bossFast: 1 once a boss fell within `at` seconds
 *   of arriving; soloWins: victories with only the starting weapon;
 * - elosFound: Elos discovered; sharedUsed: shared weapons ever held; heroWins: victories of `hero`;
 *   heroesWon: heroes with a victory; heroAllStages: most stages won by one hero; stagesCleared; seen: bestiary
 *   size; shopLevels: shop levels bought; vigil: the longest Noite Sem Fim, seconds.
 */
export type Metric =
  | 'runKills'
  | 'totalKills'
  | 'enemyKills'
  | 'bestHit'
  | 'runDamage'
  | 'totalDamage'
  | 'bestTime'
  | 'untouched'
  | 'closeWin'
  | 'bestLevel'
  | 'elosFound'
  | 'runElos'
  | 'runMaxed'
  | 'sharedUsed'
  | 'soloWins'
  | 'heroWins'
  | 'heroesWon'
  | 'heroAllStages'
  | 'bossFast'
  | 'stagesCleared'
  | 'seen'
  | 'shopLevels'
  | 'vigil';

/** One achievement: done when `metric` reaches `goal`. Names and texts live in i18n under `achievements`. */
export interface AchievementDef {
  group: AchievementGroup;
  metric: Metric;
  goal: number;
  /** heroWins: whose victories. */
  hero?: CharacterId;
  /** enemyKills: which enemies count. */
  enemies?: EnemyId[];
  /** closeWin: HP fraction; bossFast: seconds after the boss arrives. */
  at?: number;
  /** Gold banked when it is unlocked. */
  gold: number;
  /** Unlocks a cosmetic title (its text in i18n `achievements.titles`). */
  title?: true;
  /** One more use per run of a level-up helper, only while `config.achievementCharges` is on. */
  charge?: ChargeKey;
}

/** Base weapons (not an Elo): any hero can be offered any of them. */
export const SHARED_WEAPONS = WEAPON_IDS.filter((id) => !EVOLUTIONS[id]);

const DEFS = {
  // Abates
  killsRun1k: { group: 'kills', metric: 'runKills', goal: 1000, gold: 50 },
  killsRun3k: { group: 'kills', metric: 'runKills', goal: 3000, gold: 100 },
  killsTotal10k: { group: 'kills', metric: 'totalKills', goal: 10_000, gold: 100 },
  killsTotal50k: { group: 'kills', metric: 'totalKills', goal: 50_000, gold: 250, title: true },
  rats500: { group: 'kills', metric: 'enemyKills', enemies: ['rat', 'graveRat'], goal: 500, gold: 50 },
  elites25: { group: 'kills', metric: 'enemyKills', enemies: ['goblin', 'golem'], goal: 25, gold: 100 },
  // Dano (weapon hits only: a bomb is no build)
  hit80: { group: 'damage', metric: 'bestHit', goal: 80, gold: 50 },
  // Calibrated with the sim (docs/balance-baseline.md, CC-04): about half of the veteran bot's victories.
  hit120: { group: 'damage', metric: 'bestHit', goal: 100, gold: 100 },
  damageRun: { group: 'damage', metric: 'runDamage', goal: 260_000, gold: 100 },
  damageTotal: { group: 'damage', metric: 'totalDamage', goal: 1_000_000, gold: 150 },
  // Sobrevivência
  survive5: { group: 'survival', metric: 'bestTime', goal: 300, gold: 25 },
  survive10: { group: 'survival', metric: 'bestTime', goal: 600, gold: 50 },
  untouched: { group: 'survival', metric: 'untouched', goal: 90, gold: 75 },
  closeWin: { group: 'survival', metric: 'closeWin', at: 0.1, goal: 1, gold: 75 },
  level50: { group: 'survival', metric: 'bestLevel', goal: 50, gold: 75 },
  vigil5: { group: 'survival', metric: 'vigil', goal: 300, gold: 150, title: true },
  // Armas e Elos
  eloFirst: { group: 'weapons', metric: 'elosFound', goal: 1, gold: 50, charge: 'reroll' },
  elosRun3: { group: 'weapons', metric: 'runElos', goal: 3, gold: 100 },
  maxed4: { group: 'weapons', metric: 'runMaxed', goal: 4, gold: 75 },
  allShared: { group: 'weapons', metric: 'sharedUsed', goal: SHARED_WEAPONS.length, gold: 100 },
  soloWin: { group: 'weapons', metric: 'soloWins', goal: 1, gold: 150, title: true },
  // Heróis (the first four are each hero's victory line in the original)
  winAldo: { group: 'heroes', metric: 'heroWins', hero: 'aldo', goal: 1, gold: 100 },
  winLyra: { group: 'heroes', metric: 'heroWins', hero: 'lyra', goal: 1, gold: 100 },
  winTeo: { group: 'heroes', metric: 'heroWins', hero: 'teo', goal: 1, gold: 100 },
  winAndilla: { group: 'heroes', metric: 'heroWins', hero: 'andilla', goal: 1, gold: 100 },
  winAll: { group: 'heroes', metric: 'heroesWon', goal: CHARACTER_IDS.length, gold: 200, title: true },
  heroAllStages: { group: 'heroes', metric: 'heroAllStages', goal: STAGE_IDS.length, gold: 150 },
  // Fases
  bossKnight: { group: 'stages', metric: 'enemyKills', enemies: ['blackKnight'], goal: 1, gold: 50 },
  bossRinger: { group: 'stages', metric: 'enemyKills', enemies: ['bellRinger'], goal: 1, gold: 75 },
  bossWolf: { group: 'stages', metric: 'enemyKills', enemies: ['oldWolf'], goal: 1, gold: 75 },
  // Calibrated like hit120: the veteran bot's median boss fight is 34 s (49 s without the shop).
  bossFast: { group: 'stages', metric: 'bossFast', at: 40, goal: 1, gold: 100 },
  allStages: { group: 'stages', metric: 'stagesCleared', goal: STAGE_IDS.length, gold: 150 },
  // Coleção
  seen8: { group: 'collection', metric: 'seen', goal: 8, gold: 25 },
  seenAll: {
    group: 'collection',
    metric: 'seen',
    goal: ENEMY_IDS.length,
    gold: 150,
    title: true,
    charge: 'skip',
  },
  elosAll: {
    group: 'collection',
    metric: 'elosFound',
    goal: EVOLVED_IDS.length,
    gold: 300,
    title: true,
    charge: 'banish',
  },
  shop10: { group: 'collection', metric: 'shopLevels', goal: 10, gold: 50 },
} satisfies Record<string, AchievementDef>;

export type AchievementId = keyof typeof DEFS;
export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = DEFS;
/** In display order (grouped). */
export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];
export const ACHIEVEMENT_GROUPS: AchievementGroup[] = [
  'kills',
  'damage',
  'survival',
  'weapons',
  'heroes',
  'stages',
  'collection',
];
