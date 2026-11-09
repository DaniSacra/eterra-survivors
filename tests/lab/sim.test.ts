import { it } from 'vitest';
import { CHARACTERS, CHARACTER_IDS } from '../../src/data/characters';
import { EVOLUTIONS } from '../../src/data/evolutions';
import { WEAPON_IDS, type WeaponId } from '../../src/data/weapons';
import { maxLevel } from '../../src/core/weapons';
import { STAGE_IDS } from '../../src/data/stages';
import { shopBonuses, newSave } from '../../src/core/meta';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { config } from '../../src/data/config';
import { SHOP, SHOP_IDS, type ShopId } from '../../src/data/shop';
import { simulate, type SimResult } from './bot';
import type { RunSetup } from '../../src/core/world';

/**
 * Full-run simulator (balance tool, skipped by `npm test`): `npm run sim` plays 4 heroes x 3 stages x 4 seeds
 * with the scripted bot in tests/lab/bot.ts and prints each run plus a summary per hero and stage.
 * SIM_HERO / SIM_STAGE / SIM_SEEDS narrow it down. Read the numbers as relative: the bot is no human.
 */
const SEEDS = Number(import.meta.env.SIM_SEEDS ?? 8);
const heroes = CHARACTER_IDS.filter((h) => !import.meta.env.SIM_HERO || h === import.meta.env.SIM_HERO);
const stages = STAGE_IDS.filter((s) => !import.meta.env.SIM_STAGE || s === import.meta.env.SIM_STAGE);
/**
 * Shop profiles: `none` (a new player), `half` (every item at half its levels, rounded down) and `full` (the
 * veteran). SIM_SHOP picks one (default none) or `all` of them.
 */
type Profile = 'none' | 'half' | 'full';
const PROFILES: Profile[] = ['none', 'half', 'full'];
const profiles: Profile[] =
  import.meta.env.SIM_SHOP === 'all' ? PROFILES : [(import.meta.env.SIM_SHOP as Profile) || 'none'];
function setupFor(profile: Profile): RunSetup {
  if (profile === 'none') return {};
  const level = (id: ShopId) => (profile === 'full' ? SHOP[id].maxLevel : Math.floor(SHOP[id].maxLevel / 2));
  return {
    bonuses: shopBonuses({ ...newSave(), shop: Object.fromEntries(SHOP_IDS.map((id) => [id, level(id)])) }),
  };
}
const veteran = profiles.includes('full');
type Run = SimResult & { profile: Profile };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

function line(r: Run): string {
  const boss = r.bossHpLeft === null ? '' : ` boss ${pct(r.bossHpLeft)} left after ${r.bossTime}s`;
  const snaps = r.snaps.map((s) => `${s.t / 60}m L${s.level}/${s.enemies}e/${s.hp}hp`).join(' ');
  return (
    `${r.profile.padEnd(5)}${r.hero.padEnd(8)}${r.stage.padEnd(10)}#${r.seed} ${(r.won ? 'WON ' : 'lost').padEnd(5)}${mmss(r.time).padStart(6)}` +
    ` L${r.level} k${r.kills} g${r.gold} dmg${Math.round(r.damage / 1000)}k hit${Math.round(r.bestHit)}` +
    ` max${r.maxEnemies}e fast${pct(r.taken.fast / (r.taken.total || 1))}${boss}` +
    `\n    elos [${r.elos.join(' ')}] top [${r.top.join(' ')}]\n    ${snaps}`
  );
}

it.skipIf(!import.meta.env.SIM)('full-run simulator', { timeout: 600_000 }, () => {
  const results: Run[] = [];
  const out: string[] = [];
  for (const profile of profiles)
    for (const hero of heroes)
      for (const stage of stages)
        for (let seed = 1; seed <= SEEDS; seed++) {
          const r = { ...simulate(hero, stage, seed, setupFor(profile)), profile };
          results.push(r);
          // Every run in full only for small sims; the tables below are what counts.
          if (import.meta.env.SIM_RUNS) out.push(line(r));
        }
  out.push(
    '\nSUMMARY  shop hero    stage     wins  avg time  avg lvl  reached10  elos/run  gold/min  fast dmg',
  );
  for (const profile of profiles)
    for (const hero of heroes)
      for (const stage of stages) {
        const rs = results.filter((r) => r.profile === profile && r.hero === hero && r.stage === stage);
        const avg = (f: (r: SimResult) => number) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
        const taken = rs.reduce((a, r) => a + r.taken.total, 0) || 1;
        out.push(
          `         ${profile.padEnd(5)}${hero.padEnd(8)}${stage.padEnd(10)}${`${rs.filter((r) => r.won).length}/${rs.length}`.padEnd(6)}` +
            `${mmss(Math.round(avg((r) => Math.min(r.time, 600)))).padStart(8)}  ${avg((r) => r.level)
              .toFixed(1)
              .padStart(7)}` +
            `  ${String(rs.filter((r) => r.bossTime !== null).length).padStart(9)}  ${avg(
              (r) => r.elos.length,
            )
              .toFixed(1)
              .padStart(8)}` +
            `  ${avg((r) => r.gold / (r.time / 60))
              .toFixed(1)
              .padStart(8)}  ${pct(rs.reduce((a, r) => a + r.taken.fast, 0) / taken).padStart(8)}`,
        );
      }
  // The targets table: win rate and median minute of death per stage and shop profile, and each hero's gap.
  const median = (xs: number[]) => {
    const v = [...xs].sort((a, b) => a - b);
    return v.length ? ((v[(v.length - 1) >> 1] as number) + (v[v.length >> 1] as number)) / 2 : 0;
  };
  out.push('\nTARGETS  stage     shop  wins        death(median)  gold/run  heroes (win % vs stage)');
  for (const stage of stages)
    for (const profile of profiles) {
      const rs = results.filter((r) => r.stage === stage && r.profile === profile);
      const rate = rs.filter((r) => r.won).length / rs.length;
      const dead = rs.filter((r) => !r.won).map((r) => r.time / 60);
      const per = heroes.map((h) => {
        const hr = rs.filter((r) => r.hero === h);
        const hrate = hr.filter((r) => r.won).length / hr.length;
        return `${h} ${pct(hrate)}${Math.abs(hrate - rate) > 0.2 ? '!' : ''}`;
      });
      out.push(
        `         ${stage.padEnd(10)}${profile.padEnd(6)}${`${rs.filter((r) => r.won).length}/${rs.length} ${pct(rate)}`.padEnd(12)}` +
          `${(dead.length ? median(dead).toFixed(1) + ' min' : '-').padStart(13)}` +
          `  ${Math.round(rs.reduce((a, r) => a + r.gold, 0) / rs.length)
            .toString()
            .padStart(8)}  ${per.join(' · ')}`,
      );
    }
  // Pick rate of the shared weapons: share of runs that ended owning it (or its Elo).
  const shared = WEAPON_IDS.filter((id) => !EVOLUTIONS[id]);
  out.push(
    '\nPICKS    ' +
      shared
        .map((id) => `${id} ${pct(results.filter((r) => r.owned.includes(id)).length / results.length)}`)
        .join(' · '),
  );
  // Real DPS in the runs, measured only while at that level (at least MIN_LEVEL_TIME there): each base weapon at
  // max level (its own runs, or the minute before it became an Elo) and each Elo.
  const MIN_LEVEL_TIME = 30;
  const avgOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const atMax = (id: WeaponId) =>
    results.flatMap((r) =>
      r.dps.flatMap((d) => {
        if (d.id === id && d.level === maxLevel(id) && d.levelTime >= MIN_LEVEL_TIME) return [d.levelDps];
        if (EVOLUTIONS[d.id]?.from === id && d.prevDps > 0) return [d.prevDps];
        return [];
      }),
    );
  out.push(
    'REAL DPS ' +
      WEAPON_IDS.map((id) => {
        const ds = EVOLUTIONS[id]
          ? results.flatMap((r) =>
              r.dps.filter((d) => d.id === id && d.levelTime >= MIN_LEVEL_TIME).map((d) => d.levelDps),
            )
          : atMax(id);
        return ds.length
          ? `${id}${EVOLUTIONS[id] ? '' : ':max'} ${Math.round(avgOf(ds))} (${ds.length})`
          : '';
      })
        .filter(Boolean)
        .join(' · '),
  );
  // Each Elo against its base at max level in the same runs (goal: >= 2.5x).
  out.push(
    'ELO X    ' +
      WEAPON_IDS.filter((id) => EVOLUTIONS[id])
        .map((id) => {
          const rs = results.flatMap((r) =>
            r.dps
              .filter((d) => d.id === id && d.levelTime >= MIN_LEVEL_TIME && d.prevDps > 0)
              .map((d) => d.levelDps / d.prevDps),
          );
          return rs.length ? `${id} ${avgOf(rs).toFixed(1)}x` : '';
        })
        .filter(Boolean)
        .join(' · '),
  );
  if (import.meta.env.SIM_VIGIL) {
    const v = results.filter((r) => r.won);
    out.push(
      `VIGIL    ${v.length} victories went on: average ${Math.round(avgOf(v.map((r) => r.vigil)))} s of vigil, ` +
        `${v.filter((r) => r.vigil >= 300).length} reached 5:00 (Até o Amanhecer)`,
    );
  }
  const short = results.filter((r) => r.poolShortLevel > 0);
  out.push(
    `POOL     ran short of 3 cards in ${short.length}/${results.length} runs, ` +
      `at level ${avgOf(short.map((r) => r.poolShortLevel)).toFixed(1)} on average`,
  );
  // Achievement calibration (docs/design/conquistas.md): goals meant for about half of the bot's victories.
  const wins = results.filter((r) => r.won);
  const share = (f: (r: SimResult) => boolean) => pct(wins.filter(f).length / (wins.length || 1));
  const { damageRun, hit120, bossFast } = ACHIEVEMENTS;
  out.push(
    `ACHIEVE  ${veteran ? 'veteran ' : ''}wins ${wins.length}/${results.length}` +
      ` · run damage median ${Math.round(median(wins.map((r) => r.damage)))}` +
      ` (>=${damageRun.goal}: ${share((r) => r.damage >= damageRun.goal)})` +
      ` · best hit median ${Math.round(median(wins.map((r) => r.bestHit)))}` +
      ` (>=${hit120.goal}: ${share((r) => r.bestHit >= hit120.goal)})` +
      ` · boss time median ${Math.round(median(wins.map((r) => r.time - config.matchDuration)))}s` +
      ` (<=${bossFast.at}s: ${share((r) => r.time - config.matchDuration <= (bossFast.at ?? 0))})`,
  );
  // A new player: Aldo in Valmor, run after run, until the cheapest hero is affordable.
  const cheapest = Math.min(...CHARACTER_IDS.map((h) => CHARACTERS[h].cost).filter((c) => c > 0));
  let bank = 0;
  let runs = 0;
  while (bank < cheapest && runs < 20) bank += simulate('aldo', 'valmor', 100 + runs++).gold;
  out.push(`UNLOCK   second hero (${cheapest} gold) after ${runs} runs of Aldo in Valmor`);
  // The whole Loja in average runs (the mean gold of every run simulated here).
  const shopTotal = SHOP_IDS.reduce(
    (n, id) => n + (SHOP[id].baseCost * SHOP[id].maxLevel * (SHOP[id].maxLevel + 1)) / 2,
    0,
  );
  const meanGold = results.reduce((a, r) => a + r.gold, 0) / results.length;
  out.push(
    `LOJA     everything costs ${shopTotal} gold = ${(shopTotal / meanGold).toFixed(0)} average runs (${Math.round(meanGold)} gold/run)`,
  );
  console.log('\nSIM\n' + out.join('\n'));
});
