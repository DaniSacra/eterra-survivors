import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, newSave, recordRun, sanitizeSave, serializeSave } from '../../src/core/meta';
import { newRunSummary, type RunSummary } from '../../src/core/records';
import { stageCast } from '../../src/data/stages';

/** A save as version 1 wrote it (shape copied from a real browser save). */
const V1 = {
  version: 1,
  gold: 1234,
  shop: { might: 3, maxHp: 2, reroll: 2 },
  heroes: ['lyra'],
  cleared: ['valmor', 'crypt'],
  elos: ['fury', 'storm'],
  lastHero: 'lyra',
  lastStage: 'crypt',
};

const run = (over: Partial<RunSummary> = {}): RunSummary => ({ ...newRunSummary(), ...over });

describe('save v2 migration', () => {
  it('a v1 save keeps everything and seeds the bestiary from the stages won', () => {
    const s = sanitizeSave(JSON.parse(JSON.stringify(V1)));
    expect(s).toMatchObject({
      version: SAVE_VERSION,
      gold: 1234,
      shop: { might: 3, maxHp: 2, reroll: 2 },
      heroes: ['lyra'],
      cleared: ['valmor', 'crypt'],
      elos: ['fury', 'storm'],
      lastHero: 'lyra',
      lastStage: 'crypt',
      records: {},
    });
    // Valmor's cast first seen in Valmor; the Crypt's own cast in the Crypt; elites (in both) stay in Valmor.
    expect(s.bestiary.bones).toEqual({ kills: 0, stage: 'valmor' });
    expect(s.bestiary.golem).toEqual({ kills: 0, stage: 'valmor' });
    expect(s.bestiary.rat).toEqual({ kills: 0, stage: 'crypt' });
    expect(s.bestiary.blackKnight).toEqual({ kills: 1, stage: 'valmor' });
    expect(s.bestiary.bellRinger).toEqual({ kills: 1, stage: 'crypt' });
    expect(s.bestiary.oldWolf).toBeUndefined();
    expect(Object.keys(s.bestiary).sort()).toEqual(
      [...new Set([...stageCast('valmor'), ...stageCast('crypt')])].sort(),
    );
    expect(s.totals).toEqual({ runs: 0, wins: 2, kills: 0, damage: 0, gold: 0, time: 0 });
  });

  it('a versionless save is seeded the same way', () => {
    const s = sanitizeSave({ gold: 5, cleared: ['valmor'] });
    expect(s.gold).toBe(5);
    expect(s.bestiary.blackKnight?.kills).toBe(1);
    expect(s.totals.wins).toBe(1);
  });

  it('an empty or junk save is a new save', () => {
    expect(sanitizeSave(undefined)).toEqual(newSave());
    expect(sanitizeSave([1, 2])).toEqual(newSave());
    expect(sanitizeSave({ version: 2, records: 'x', bestiary: 3, totals: null })).toEqual(newSave());
  });

  it('repairs each broken field on its own, dropping unknown ids', () => {
    const s = sanitizeSave({
      version: 2,
      gold: 10,
      records: {
        aldo: {
          runs: -3,
          bestTime: NaN,
          bestKills: 12.9,
          wins: { valmor: 2.7, mars: 3 },
          elos: ['fury', 'blade', 'nope'],
          weaponRuns: { blade: 4, sword: 2, frost: -1 },
          closestWin: 7,
        },
        gandalf: { runs: 9 },
      },
      bestiary: {
        bones: { kills: 'a', stage: 'mars' },
        dragon: { kills: 3 },
        rat: { kills: 4, stage: 'crypt' },
      },
      totals: { kills: Infinity, damage: 12.5, runs: 3.2 },
    });
    expect(s.gold).toBe(10);
    expect(Object.keys(s.records)).toEqual(['aldo']);
    expect(s.records.aldo).toMatchObject({
      runs: 0,
      bestTime: 0,
      bestKills: 12,
      wins: { valmor: 2 },
      elos: ['fury'],
      weaponRuns: { blade: 4 },
      closestWin: 1,
      fastestWin: 0,
    });
    expect(s.bestiary).toEqual({ bones: { kills: 0, stage: 'valmor' }, rat: { kills: 4, stage: 'crypt' } });
    expect(s.totals).toEqual({ runs: 3, wins: 0, kills: 0, damage: 12.5, gold: 0, time: 0 });
  });

  it('survives a round trip through storage', () => {
    const s = sanitizeSave(V1);
    recordRun(
      s,
      run({ hero: 'teo', won: true, time: 640, kills: 900, killsBy: { bones: 900 }, seen: ['bones'] }),
    );
    expect(sanitizeSave(JSON.parse(JSON.stringify(serializeSave(s))))).toEqual(s);
  });

  it('a newer save keeps its records, bestiary and totals, merged by the larger value', () => {
    const future = {
      version: SAVE_VERSION + 1,
      gold: 50,
      records: {
        aldo: {
          runs: 7,
          bestKills: 2000,
          fastestWin: 630,
          closestWin: 0.2,
          wins: { valmor: 2, newStage: 1 },
          x: 1,
        },
        newHero: { runs: 3 },
      },
      bestiary: { bones: { kills: 500, stage: 'valmor' }, dragon: { kills: 2, stage: 'newStage' } },
      totals: { runs: 9, kills: 5000, damage: 1e6, gold: 300, time: 4000, wins: 2, hours: 1 },
    };
    const s = sanitizeSave(JSON.parse(JSON.stringify(future)));
    recordRun(
      s,
      run({
        hero: 'aldo',
        won: true,
        time: 610,
        kills: 100,
        hpLeft: 0.5,
        killsBy: { bones: 100 },
        seen: ['bones'],
      }),
    );
    const back = JSON.parse(JSON.stringify(serializeSave(s)));
    expect(back.version).toBe(SAVE_VERSION + 1);
    expect(back.records.newHero).toEqual({ runs: 3 });
    expect(back.records.aldo).toMatchObject({
      runs: 8,
      bestKills: 2000,
      fastestWin: 610,
      closestWin: 0.2,
      wins: { valmor: 3, newStage: 1 },
      x: 1,
    });
    expect(back.bestiary).toEqual({
      bones: { kills: 600, stage: 'valmor' },
      dragon: { kills: 2, stage: 'newStage' },
    });
    expect(back.totals).toEqual({
      runs: 10,
      wins: 3,
      kills: 5100,
      damage: 1e6,
      gold: 300,
      time: 4610,
      hours: 1,
    });
  });
});

describe('recordRun', () => {
  it('a lost run adds gold, the hero record, the bestiary and the totals', () => {
    const s = newSave();
    const out = recordRun(
      s,
      run({
        hero: 'lyra',
        stage: 'crypt',
        time: 300.5,
        level: 20,
        kills: 700,
        gold: 80,
        damage: 50_000,
        bestHit: 61,
        untouched: 42,
        hpLeft: 0,
        weapons: ['lightning', 'frost', 'frost'],
        elos: ['storm'],
        maxed: 1,
        killsBy: { rat: 600, spider: 100 },
        seen: ['rat', 'spider', 'slime'],
      }),
    );
    expect(out.elos).toEqual(['storm']);
    expect(s.gold).toBe(80);
    expect(s.cleared).toEqual([]);
    expect(s.elos).toEqual(['storm']);
    expect(s.records.lyra).toMatchObject({
      runs: 1,
      wins: {},
      bestTime: 300.5,
      fastestWin: 0,
      bestLevel: 20,
      bestKills: 700,
      bestHit: 61,
      bestDamage: 50_000,
      weaponRuns: { lightning: 1, frost: 1 },
      elos: ['storm'],
      untouched: 42,
      closestWin: 1,
      maxElos: 1,
      maxMaxed: 1,
      soloWins: 0,
    });
    expect(s.bestiary).toEqual({
      rat: { kills: 600, stage: 'crypt' },
      spider: { kills: 100, stage: 'crypt' },
      slime: { kills: 0, stage: 'crypt' },
    });
    expect(s.totals).toEqual({ runs: 1, wins: 0, kills: 700, damage: 50_000, gold: 80, time: 300.5 });
  });

  it('victories: stage cleared, fastest and closest win, and a win with only the starting weapon', () => {
    const s = newSave();
    const win = (time: number, hpLeft: number, weapons: RunSummary['weapons']) =>
      recordRun(s, run({ hero: 'aldo', stage: 'valmor', won: true, time, hpLeft, weapons, seen: ['bones'] }));
    win(650, 0.4, ['blade', 'frost']);
    win(620, 0.8, ['blade']);
    win(700, 0.05, ['blade']);
    const r = s.records.aldo!;
    expect(s.cleared).toEqual(['valmor']);
    expect(r).toMatchObject({ runs: 3, wins: { valmor: 3 }, fastestWin: 620, closestWin: 0.05, soloWins: 2 });
    expect(r.bestTime).toBe(700);
    expect(r.weaponRuns).toEqual({ blade: 3, frost: 1 });
    // The bestiary keeps the first stage an enemy was seen in.
    recordRun(s, run({ stage: 'crypt', seen: ['bones'], killsBy: { bones: 5 } }));
    expect(s.bestiary.bones).toEqual({ kills: 5, stage: 'valmor' });
    expect(s.totals.wins).toBe(3);
  });
});
