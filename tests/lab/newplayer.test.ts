import { it } from 'vitest';
import { buy, newSave, shopBonuses, shopCost, unlockHero } from '../../src/core/meta';
import { CHARACTERS } from '../../src/data/characters';
import { SHOP_IDS } from '../../src/data/shop';
import { simulate } from './bot';

/**
 * First-hour economy (PX-17), skipped by `npm test`: `npm run newplayer` plays careers of consecutive Aldo runs in
 * Valmor, banking each run's gold like the game does (no achievement gold, so a little conservative), under two
 * spending habits, and prints how soon a new player could own a second hero and win Valmor.
 * NP_CAREERS / NP_RUNS narrow it; NP_HERO_COST overrides the second hero's price; NP_WIN_GOLD adds a first-win gift.
 * The bot is no human: read it as relative (CLAUDE.md).
 */
const CAREERS = Number(import.meta.env.NP_CAREERS ?? 24);
const RUNS = Number(import.meta.env.NP_RUNS ?? 10);
const COST = Number(import.meta.env.NP_HERO_COST ?? CHARACTERS.lyra.cost);
/** A new player is weaker than the bot: this much less damage and life (NP_HANDICAP, 0 = the bot as it is). */
const HANDICAP = Number(import.meta.env.NP_HANDICAP ?? 0);
const GIFT = Number(import.meta.env.NP_WIN_GOLD ?? 0);
type Habit = 'hero' | 'shop';

/** `hero` saves for the hero and buys the Loja only after; `shop` spends everything on the cheapest Loja item. */
function career(habit: Habit, id: number) {
  const save = newSave();
  const golds: number[] = [];
  let heroRun = 0;
  let firstWin = 0;
  const times: number[] = [];
  for (let i = 1; i <= RUNS; i++) {
    const bonuses = shopBonuses(save);
    bonuses.stats.might = (bonuses.stats.might ?? 0) - HANDICAP;
    bonuses.stats.maxHp = (bonuses.stats.maxHp ?? 0) - HANDICAP * 200;
    const r = simulate('aldo', 'valmor', id * 100 + i, { bonuses });
    times.push(r.time);
    golds.push(r.gold);
    save.gold += Math.floor(r.gold) + (r.won && firstWin === 0 ? GIFT : 0);
    if (r.won && firstWin === 0) firstWin = i;
    if (!heroRun && habit === 'hero' && save.gold >= COST) {
      heroRun = i;
      save.gold -= COST;
      unlockHero(save, 'lyra');
    }
    if (!heroRun && habit === 'shop' && save.gold >= COST) heroRun = -i; // could have, but spent it
    if (habit === 'shop' || heroRun > 0) {
      for (;;) {
        const cheap = SHOP_IDS.map((s) => ({ s, c: shopCost(save, s) }))
          .filter((x): x is { s: (typeof SHOP_IDS)[number]; c: number } => x.c !== null && x.c <= save.gold)
          .sort((a, b) => a.c - b.c)[0];
        if (!cheap || !buy(save, cheap.s)) break;
      }
    }
  }
  return { golds, heroRun, firstWin, times };
}

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

it.skipIf(!import.meta.env.NEWPLAYER)('first-hour economy', { timeout: 900_000 }, () => {
  const out: string[] = [
    `handicap ${HANDICAP}, hero costs ${COST}, first-win gift ${GIFT}, ${CAREERS} careers x ${RUNS} runs`,
  ];
  for (const habit of ['hero', 'shop'] as Habit[]) {
    const cs = Array.from({ length: CAREERS }, (_, i) => career(habit, i + 1));
    out.push(`\n== habit: ${habit === 'hero' ? 'saves for the hero first' : 'spends on the Loja every run'}`);
    out.push(
      `gold per run (median) runs 1-5: ${[0, 1, 2, 3, 4].map((k) => Math.round(median(cs.map((c) => c.golds[k] ?? 0)))).join(' ')}`,
    );
    out.push(`death/run time median, run 1: ${mmss(median(cs.map((c) => c.times[0] ?? 0)))}`);
    const upto = (_k: number, f: (c: (typeof cs)[number]) => boolean) =>
      Math.round((100 * cs.filter(f).length) / cs.length);
    const heroBy = (k: number) =>
      habit === 'hero'
        ? upto(k, (c) => c.heroRun > 0 && c.heroRun <= k)
        : upto(k, (c) => c.heroRun < 0 && -c.heroRun <= k);
    out.push(
      `hero affordable by run 2/3/4/5/8: ${[2, 3, 4, 5, 8].map((k) => `${heroBy(k)}%`).join(' ')}${habit === 'shop' ? ' (gold was spent on the Loja)' : ''}`,
    );
    out.push(
      `first Valmor win by run 3/5/8/${RUNS}: ${[3, 5, 8, RUNS].map((k) => `${upto(k, (c) => c.firstWin > 0 && c.firstWin <= k)}%`).join(' ')}`,
    );
  }
  console.log(out.join('\n'));
});
