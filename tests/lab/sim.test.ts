import { it } from 'vitest';
import { CHARACTERS, CHARACTER_IDS, SIGNATURE_OWNER } from '../../src/data/characters';
import { EVOLUTIONS } from '../../src/data/evolutions';
import { WEAPON_IDS } from '../../src/data/weapons';
import { maxLevel } from '../../src/core/weapons';
import { STAGE_IDS } from '../../src/data/stages';
import { shopBonuses, newSave } from '../../src/core/meta';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { config } from '../../src/data/config';
import { SHOP, SHOP_IDS } from '../../src/data/shop';
import { simulate, type SimResult } from './bot';

/**
 * Full-run simulator (balance tool, skipped by `npm test`): `npm run sim` plays 4 heroes x 3 stages x 4 seeds
 * with the scripted bot in tests/lab/bot.ts and prints each run plus a summary per hero and stage.
 * SIM_HERO / SIM_STAGE / SIM_SEEDS narrow it down. Read the numbers as relative: the bot is no human.
 */
const SEEDS = Number(import.meta.env.SIM_SEEDS ?? 4);
const heroes = CHARACTER_IDS.filter((h) => !import.meta.env.SIM_HERO || h === import.meta.env.SIM_HERO);
const stages = STAGE_IDS.filter((s) => !import.meta.env.SIM_STAGE || s === import.meta.env.SIM_STAGE);
/** SIM_SHOP=full: the veteran, with every shop level bought. */
const veteran = import.meta.env.SIM_SHOP === 'full';
const setup = veteran
  ? {
      bonuses: shopBonuses({
        ...newSave(),
        shop: Object.fromEntries(SHOP_IDS.map((id) => [id, SHOP[id].maxLevel])),
      }),
    }
  : {};

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

function line(r: SimResult): string {
  const boss = r.bossHpLeft === null ? '' : ` boss ${pct(r.bossHpLeft)} left after ${r.bossTime}s`;
  const snaps = r.snaps.map((s) => `${s.t / 60}m L${s.level}/${s.enemies}e/${s.hp}hp`).join(' ');
  return (
    `${r.hero.padEnd(8)}${r.stage.padEnd(10)}#${r.seed} ${(r.won ? 'WON ' : 'lost').padEnd(5)}${mmss(r.time).padStart(6)}` +
    ` L${r.level} k${r.kills} g${r.gold} dmg${Math.round(r.damage / 1000)}k hit${Math.round(r.bestHit)}` +
    ` max${r.maxEnemies}e fast${pct(r.taken.fast / (r.taken.total || 1))}${boss}` +
    `\n    elos [${r.elos.join(' ')}] top [${r.top.join(' ')}]\n    ${snaps}`
  );
}

it.skipIf(!import.meta.env.SIM)('full-run simulator', { timeout: 600_000 }, () => {
  const results: SimResult[] = [];
  const out: string[] = [];
  for (const hero of heroes)
    for (const stage of stages)
      for (let seed = 1; seed <= SEEDS; seed++) {
        const r = simulate(hero, stage, seed, setup);
        results.push(r);
        out.push(line(r));
      }
  out.push('\nSUMMARY  hero    stage     wins  avg time  avg lvl  reached10  elos/run  gold/min  fast dmg');
  for (const hero of heroes)
    for (const stage of stages) {
      const rs = results.filter((r) => r.hero === hero && r.stage === stage);
      const avg = (f: (r: SimResult) => number) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
      const taken = rs.reduce((a, r) => a + r.taken.total, 0) || 1;
      out.push(
        `         ${hero.padEnd(8)}${stage.padEnd(10)}${`${rs.filter((r) => r.won).length}/${rs.length}`.padEnd(6)}` +
          `${mmss(Math.round(avg((r) => Math.min(r.time, 600)))).padStart(8)}  ${avg((r) => r.level)
            .toFixed(1)
            .padStart(7)}` +
          `  ${String(rs.filter((r) => r.bossTime !== null).length).padStart(9)}  ${avg((r) => r.elos.length)
            .toFixed(1)
            .padStart(8)}` +
          `  ${avg((r) => r.gold / (r.time / 60))
            .toFixed(1)
            .padStart(8)}  ${pct(rs.reduce((a, r) => a + r.taken.fast, 0) / taken).padStart(8)}`,
      );
    }
  // Pick rate of the shared weapons: share of runs that ended owning it (or its Elo).
  const shared = WEAPON_IDS.filter((id) => !EVOLUTIONS[id] && !SIGNATURE_OWNER[id]);
  out.push(
    '\nPICKS    ' +
      shared
        .map((id) => `${id} ${pct(results.filter((r) => r.owned.includes(id)).length / results.length)}`)
        .join(' · '),
  );
  // Real DPS in the runs: each Elo, and each base weapon held at max level (runs that hold it, average).
  out.push(
    'REAL DPS ' +
      WEAPON_IDS.map((id) => {
        const ds = results.flatMap((r) => r.dps.filter((d) => d.id === id && d.level === maxLevel(id)));
        return ds.length
          ? `${id}${EVOLUTIONS[id] ? '' : ':max'} ${Math.round(ds.reduce((a, d) => a + d.dps, 0) / ds.length)}`
          : '';
      })
        .filter(Boolean)
        .join(' · '),
  );
  // Achievement calibration (docs/design/conquistas.md): goals meant for about half of the bot's victories.
  const wins = results.filter((r) => r.won);
  const median = (xs: number[]) => {
    const v = [...xs].sort((a, b) => a - b);
    return v.length ? ((v[(v.length - 1) >> 1] as number) + (v[v.length >> 1] as number)) / 2 : 0;
  };
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
  console.log('\nSIM\n' + out.join('\n'));
});
