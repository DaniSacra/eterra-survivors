import { describe, expect, it } from 'vitest';
import {
  METRICS,
  checkAchievements,
  closestAchievement,
  liveAchievements,
  progress,
} from '../../src/core/achievements';
import {
  newHeroRecord,
  newSave,
  recordRun,
  sanitizeSave,
  serializeSave,
  shopBonuses,
  type MetaSave,
} from '../../src/core/meta';
import { newRunSummary, type RunSummary } from '../../src/core/records';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_GROUPS,
  ACHIEVEMENT_IDS,
  SHARED_WEAPONS,
  type AchievementDef,
  type AchievementId,
  type Metric,
} from '../../src/data/achievements';
import { CHARACTER_IDS } from '../../src/data/characters';
import { config } from '../../src/data/config';
import { ENEMY_IDS } from '../../src/data/enemies';
import { EVOLVED_IDS } from '../../src/data/evolutions';
import { STAGE_IDS } from '../../src/data/stages';
import { t } from '../../src/i18n/pt-BR';
import { achievementProgress, describeAchievement } from '../../src/render/describe';

const run = (over: Partial<RunSummary> = {}): RunSummary => ({ ...newRunSummary(), ...over });

/** Edits a save so that `def` is met, touching only what its metric reads. */
const MEET: Record<Metric, (s: MetaSave, d: AchievementDef) => void> = {
  runKills: (s, d) => void (s.records.teo = { ...newHeroRecord(), bestKills: d.goal }),
  totalKills: (s, d) => void (s.totals.kills = d.goal),
  enemyKills: (s, d) => {
    for (const id of d.enemies ?? []) s.bestiary[id] = { kills: d.goal, stage: 'valmor' };
  },
  bestHit: (s, d) => void (s.records.lyra = { ...newHeroRecord(), bestHit: d.goal }),
  runDamage: (s, d) => void (s.records.aldo = { ...newHeroRecord(), bestDamage: d.goal }),
  totalDamage: (s, d) => void (s.totals.damage = d.goal),
  bestTime: (s, d) => void (s.records.andilla = { ...newHeroRecord(), bestTime: d.goal }),
  untouched: (s, d) => void (s.records.aldo = { ...newHeroRecord(), untouched: d.goal }),
  closeWin: (s, d) =>
    void (s.records.aldo = { ...newHeroRecord(), wins: { crypt: 1 }, closestWin: d.at ?? 0 }),
  bestLevel: (s, d) => void (s.records.teo = { ...newHeroRecord(), bestLevel: d.goal }),
  elosFound: (s, d) => void (s.elos = EVOLVED_IDS.slice(0, d.goal)),
  runElos: (s, d) => void (s.records.aldo = { ...newHeroRecord(), maxElos: d.goal }),
  runMaxed: (s, d) => void (s.records.aldo = { ...newHeroRecord(), maxMaxed: d.goal }),
  sharedUsed: (s) => {
    s.records.aldo = { ...newHeroRecord(), weaponRuns: { [SHARED_WEAPONS[0]!]: 1 } };
    s.records.teo = { ...newHeroRecord(), weaponRuns: Object.fromEntries(SHARED_WEAPONS.map((w) => [w, 2])) };
  },
  soloWins: (s) => void (s.records.andilla = { ...newHeroRecord(), soloWins: 1 }),
  heroWins: (s, d) => void (s.records[d.hero!] = { ...newHeroRecord(), wins: { southRoad: 1 } }),
  heroesWon: (s) => {
    for (const h of CHARACTER_IDS) s.records[h] = { ...newHeroRecord(), wins: { valmor: 1 } };
  },
  heroAllStages: (s) =>
    void (s.records.lyra = { ...newHeroRecord(), wins: Object.fromEntries(STAGE_IDS.map((id) => [id, 1])) }),
  bossFast: (s, d) =>
    void (s.records.aldo = { ...newHeroRecord(), fastestWin: config.matchDuration + (d.at ?? 0) }),
  stagesCleared: (s) => void (s.cleared = [...STAGE_IDS]),
  seen: (s, d) => {
    for (const id of ENEMY_IDS.slice(0, d.goal)) s.bestiary[id] = { kills: 0, stage: 'valmor' };
  },
  shopLevels: (s) => void (s.shop = { might: 5, maxHp: 5 }),
  vigil: (s, d) => void (s.records.teo = { ...newHeroRecord(), vigil: { crypt: d.goal } }),
};

describe('achievement data', () => {
  it('36 achievements in 7 groups, 3.700 gold and 6 titles, every one with its texts', () => {
    expect(ACHIEVEMENT_IDS).toHaveLength(36);
    expect(new Set(ACHIEVEMENT_IDS).size).toBe(36);
    expect(ACHIEVEMENT_IDS.reduce((n, id) => n + ACHIEVEMENTS[id].gold, 0)).toBe(3700);
    const titled = ACHIEVEMENT_IDS.filter((id) => ACHIEVEMENTS[id].title);
    expect(titled).toHaveLength(6);
    expect(Object.keys(t.achievements.titles).sort()).toEqual([...titled].sort());
    for (const g of ACHIEVEMENT_GROUPS) {
      expect(ACHIEVEMENT_IDS.some((id) => ACHIEVEMENTS[id].group === g)).toBe(true);
      expect(t.achievements.groups[g]).toBeTruthy();
    }
    for (const id of ACHIEVEMENT_IDS) {
      const d = describeAchievement(id);
      expect(d.name, id).toBeTruthy();
      expect(d.desc, id).toBeTruthy();
      expect(`${d.name}${d.desc}`, id).not.toMatch(/[—–]/);
      expect(ACHIEVEMENTS[id].goal, id).toBeGreaterThan(0);
    }
  });

  it('descriptions show the goal (and the seconds of the fast boss)', () => {
    expect(describeAchievement('killsTotal10k').desc).toContain('10.000');
    expect(describeAchievement('bossFast').desc).toContain(`${ACHIEVEMENTS.bossFast.at} s`);
    expect(describeAchievement('killsRun1k').reward).toBe(t.achievements.reward(50));
    expect(describeAchievement('elosAll').title).toBe(t.achievements.titles.elosAll);
  });

  it('only the three optional ones give a charge', () => {
    const charged = ACHIEVEMENT_IDS.filter((id) => ACHIEVEMENTS[id].charge);
    expect(charged.sort()).toEqual(['eloFirst', 'elosAll', 'seenAll']);
  });
});

describe('checkAchievements', () => {
  it('a new save has none', () => {
    const s = newSave();
    expect(checkAchievements(s)).toEqual([]);
    expect(s.gold).toBe(0);
  });

  it.each(ACHIEVEMENT_IDS)('%s can be unlocked from a save', (id: AchievementId) => {
    const s = newSave();
    const def = ACHIEVEMENTS[id];
    expect(progress(s, id).value).toBeLessThan(def.goal);
    MEET[def.metric](s, def);
    expect(progress(s, id)).toEqual({ value: def.goal, goal: def.goal });
    expect(checkAchievements(s)).toContain(id);
    expect(s.achievements).toContain(id);
    expect(s.fresh).toContain(id);
  });

  it('banks the gold once', () => {
    const s = newSave();
    s.totals.kills = 10_000;
    expect(checkAchievements(s)).toEqual(['killsTotal10k']);
    expect(s.gold).toBe(ACHIEVEMENTS.killsTotal10k.gold);
    expect(checkAchievements(s)).toEqual([]);
    expect(s.gold).toBe(ACHIEVEMENTS.killsTotal10k.gold);
    expect(s.achievements).toEqual(['killsTotal10k']);
  });

  it('are retroactive on a migrated save', () => {
    const s = sanitizeSave({
      version: 1,
      gold: 100,
      shop: { might: 5, maxHp: 5 },
      cleared: ['valmor', 'crypt', 'southRoad'],
      elos: ['fury'],
    });
    const got = checkAchievements(s);
    expect(got).toEqual(
      expect.arrayContaining([
        'eloFirst',
        'bossKnight',
        'bossRinger',
        'bossWolf',
        'allStages',
        'seen8',
        'shop10',
      ]),
    );
    // No hero is known to have won: hero achievements wait for a real run.
    expect(got).not.toContain('winAldo');
    expect(s.gold).toBe(100 + got.reduce((n, id) => n + ACHIEVEMENTS[id].gold, 0));
  });

  it('recordRun unlocks what the run earned and banks it with the run gold', () => {
    const s = newSave();
    const out = recordRun(
      s,
      run({ hero: 'aldo', time: 320, kills: 1200, gold: 40, killsBy: { bones: 1200 } }),
    );
    expect(out.achievements).toEqual(['killsRun1k', 'survive5']);
    expect(s.gold).toBe(40 + 50 + 25);
    expect(s.fresh).toEqual(['killsRun1k', 'survive5']);
  });

  it('a victory with only the starting weapon, close to death, by the boss deadline', () => {
    const s = newSave();
    const won = run({
      hero: 'teo',
      stage: 'crypt',
      won: true,
      time: 610,
      hpLeft: 0.08,
      weapons: ['mace'],
    });
    const got = recordRun(s, won).achievements;
    expect(got).toEqual(expect.arrayContaining(['soloWin', 'closeWin', 'winTeo', 'bossFast', 'survive10']));
    expect(got).not.toContain('winAldo');
  });
});

describe('save fields', () => {
  it('keeps known achievements, fresh ones among them, and a title only if unlocked and titled', () => {
    const s = sanitizeSave({
      version: 2,
      achievements: ['elosAll', 'killsRun1k', 'nope'],
      fresh: ['killsRun1k', 'winAll', 'nope'],
      title: 'elosAll',
    });
    expect(s.achievements).toEqual(['killsRun1k', 'elosAll']);
    expect(s.fresh).toEqual(['killsRun1k']);
    expect(s.title).toBe('elosAll');
    expect(sanitizeSave({ achievements: ['killsRun1k'], title: 'killsRun1k' }).title).toBeUndefined();
    expect(sanitizeSave({ achievements: [], title: 'elosAll' }).title).toBeUndefined();
  });

  it('a newer save keeps achievements this build does not know', () => {
    const s = sanitizeSave({ version: 99, achievements: ['killsRun1k', 'future1'], title: 'future1' });
    s.totals.kills = 10_000;
    checkAchievements(s);
    const back = JSON.parse(JSON.stringify(serializeSave(s)));
    expect(back.achievements).toEqual(['killsRun1k', 'future1', 'killsTotal10k']);
    expect(back.title).toBe('future1');
  });
});

describe('live check and the closest one', () => {
  it('reports what the live run just met, once, without touching the save', () => {
    const s = newSave();
    const shown = new Set<AchievementId>();
    const live = run({ kills: 999, time: 200 });
    expect(liveAchievements(s, live, shown)).toEqual([]);
    live.kills = 1000;
    expect(liveAchievements(s, live, shown)).toEqual(['killsRun1k']);
    expect(liveAchievements(s, live, shown)).toEqual([]);
    expect(s.achievements).toEqual([]);
    expect(s.gold).toBe(0);
    // Already unlocked in the save: never announced again.
    s.achievements.push('survive5');
    live.time = 400;
    expect(liveAchievements(s, live, shown)).toEqual([]);
  });

  it('a live run counts on top of the save', () => {
    const s = newSave();
    s.totals.kills = 9_500;
    s.bestiary.rat = { kills: 400, stage: 'crypt' };
    const live = run({ kills: 500, killsBy: { graveRat: 100 } });
    expect(METRICS.totalKills(s, ACHIEVEMENTS.killsTotal10k, live)).toBe(10_000);
    expect(liveAchievements(s, live, new Set())).toEqual(['killsTotal10k', 'rats500']);
  });

  it('the closest locked one between 50% and 99%', () => {
    const s = newSave();
    expect(closestAchievement(s)).toBeNull();
    s.totals.kills = 8_240;
    expect(closestAchievement(s)).toEqual({ id: 'killsTotal10k', value: 8_240, goal: 10_000 });
    s.records.aldo = { ...newHeroRecord(), bestKills: 950 };
    expect(closestAchievement(s)?.id).toBe('killsRun1k');
    s.achievements.push('killsRun1k');
    expect(closestAchievement(s)?.id).toBe('killsTotal10k');
  });

  it('below 50%, the end screen can still ask for the closest one with any progress', () => {
    const s = newSave();
    expect(closestAchievement(s, 0)).toBeNull();
    s.records.aldo = { ...newHeroRecord(), bestTime: 60 };
    expect(closestAchievement(s)).toBeNull();
    expect(closestAchievement(s, 0)).toEqual({ id: 'survive5', value: 60, goal: 300 });
  });

  it('progress reads as numbers with dots, times as minutes', () => {
    expect(achievementProgress('killsTotal10k', 8240, 10_000)).toBe(
      t.achievements.progress('8.240', '10.000'),
    );
    expect(achievementProgress('damageTotal', 1_234_567, 1e6)).toContain('1.234.567');
    expect(achievementProgress('survive5', 250, 300)).toBe(t.achievements.progress('04:10', '05:00'));
  });
});

describe('optional charges', () => {
  it('each unlocked one adds a use per run while the switch is on (it is, by default)', () => {
    const s = newSave();
    s.achievements.push('eloFirst', 'seenAll', 'elosAll', 'killsRun1k');
    const flags = config as { achievementCharges: boolean };
    const was = flags.achievementCharges;
    expect(was).toBe(true);
    try {
      expect(shopBonuses(s).charges).toEqual({
        reroll: config.charges.reroll + 1,
        skip: config.charges.skip + 1,
        banish: config.charges.banish + 1,
      });
      flags.achievementCharges = false;
      expect(shopBonuses(s).charges).toEqual(config.charges);
    } finally {
      flags.achievementCharges = was;
    }
  });
});
