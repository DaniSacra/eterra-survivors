import { it } from 'vitest';
import { CHARACTER_IDS } from '../../src/data/characters';
import { STAGE_IDS } from '../../src/data/stages';
import { simulate, type SimResult } from './bot';

/**
 * Full-run simulator (balance tool, skipped by `npm test`): `npm run sim` plays 4 heroes x 3 stages x 4 seeds
 * with the scripted bot in tests/lab/bot.ts and prints each run plus a summary per hero and stage.
 * SIM_HERO / SIM_STAGE / SIM_SEEDS narrow it down. Read the numbers as relative: the bot is no human.
 */
const SEEDS = Number(import.meta.env.SIM_SEEDS ?? 4);
const heroes = CHARACTER_IDS.filter((h) => !import.meta.env.SIM_HERO || h === import.meta.env.SIM_HERO);
const stages = STAGE_IDS.filter((s) => !import.meta.env.SIM_STAGE || s === import.meta.env.SIM_STAGE);

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

function line(r: SimResult): string {
  const boss = r.bossHpLeft === null ? '' : ` boss ${pct(r.bossHpLeft)} left after ${r.bossTime}s`;
  const snaps = r.snaps.map((s) => `${s.t / 60}m L${s.level}/${s.enemies}e/${s.hp}hp`).join(' ');
  return (
    `${r.hero.padEnd(8)}${r.stage.padEnd(10)}#${r.seed} ${(r.won ? 'WON ' : 'lost').padEnd(5)}${mmss(r.time).padStart(6)}` +
    ` L${r.level} k${r.kills} g${r.gold} max${r.maxEnemies}e fast${pct(r.taken.fast / (r.taken.total || 1))}${boss}` +
    `\n    elos [${r.elos.join(' ')}] top [${r.top.join(' ')}]\n    ${snaps}`
  );
}

it.skipIf(!import.meta.env.SIM)('full-run simulator', { timeout: 600_000 }, () => {
  const results: SimResult[] = [];
  const out: string[] = [];
  for (const hero of heroes)
    for (const stage of stages)
      for (let seed = 1; seed <= SEEDS; seed++) {
        const r = simulate(hero, stage, seed);
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
  console.log('\nSIM\n' + out.join('\n'));
});
