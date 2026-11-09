import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '../data/characters';
import { config, type Stats } from '../data/config';
import { SHOP, SHOP_IDS, type ChargeKey, type ShopDef, type ShopId } from '../data/shop';
import { STAGES, STAGE_IDS, stageCast, type StageId } from '../data/stages';
import { ENEMY_IDS, type EnemyId } from '../data/enemies';
import { EVOLVED_IDS } from '../data/evolutions';
import { WEAPON_IDS, type WeaponId } from '../data/weapons';
import { ACHIEVEMENTS, ACHIEVEMENT_IDS, type AchievementId } from '../data/achievements';
import { checkAchievements } from './achievements';
import type { RunSummary } from './records';

/**
 * Bump when the save shape changes, and migrate older saves in `sanitizeSave`.
 * v2: hero records, bestiary and totals.
 */
export const SAVE_VERSION = 2;

/** One hero's records (the Coleção's Heróis tab and the achievements read them). */
export interface HeroRecord {
  runs: number;
  /** Victories per stage. */
  wins: Partial<Record<StageId, number>>;
  /** Longest run, seconds (victories go past 10:00). */
  bestTime: number;
  /** Shortest victory, seconds (0 = never won). */
  fastestWin: number;
  bestLevel: number;
  bestKills: number;
  bestHit: number;
  bestDamage: number;
  /** Runs each base weapon was held in (an Elo counts as its base). */
  weaponRuns: Partial<Record<WeaponId, number>>;
  /** Elos this hero has formed. */
  elos: WeaponId[];
  /** Longest stretch from the start of a run without being hit, seconds. */
  untouched: number;
  /** Lowest HP fraction left at a victory (1 = no victory yet). */
  closestWin: number;
  /** Most Elos in one run, and most weapons at max level at the end of one. */
  maxElos: number;
  maxMaxed: number;
  /** Victories holding only the starting weapon (or its Elo). */
  soloWins: number;
  /** Longest Noite Sem Fim per stage, whole seconds of vigil after the boss. */
  vigil: Partial<Record<StageId, number>>;
}

export interface BestiaryEntry {
  kills: number;
  /** The stage where it was first seen. */
  stage: StageId;
}

export interface Totals {
  runs: number;
  wins: number;
  kills: number;
  damage: number;
  /** Gold picked up in runs. */
  gold: number;
  /** Seconds played. */
  time: number;
}

/** What survives between runs. Persisted by render/save.ts. */
export interface MetaSave {
  version: number;
  gold: number;
  shop: Partial<Record<ShopId, number>>;
  /** Heroes bought (free ones are always available). */
  heroes: CharacterId[];
  /** Stages won at least once. */
  cleared: StageId[];
  /** Elos ever formed (the Livro de Elos shows their recipes). */
  elos: WeaponId[];
  /** The hero and stage last chosen, so the Preparação opens on them (absent: Aldo in Valmor). */
  lastHero?: CharacterId;
  lastStage?: StageId;
  /** Per hero (`heroes` is the list of heroes bought). */
  records: Partial<Record<CharacterId, HeroRecord>>;
  /** Enemies seen at least once. */
  bestiary: Partial<Record<EnemyId, BestiaryEntry>>;
  totals: Totals;
  /** Achievements unlocked (their gold already banked). */
  achievements: AchievementId[];
  /** Unlocked but not yet seen in the Coleção (the menu button shows a dot). */
  fresh: AchievementId[];
  /** The title chosen (an unlocked achievement that gives one); absent: no title shown. */
  title?: AchievementId;
  /**
   * The raw save when it came from a newer version (an old build still cached): kept so that writing it back
   * doesn't drop what this build doesn't know. See `serializeSave`.
   */
  future?: Record<string, unknown>;
}

export type Charges = Record<ChargeKey, number>;

/** Everything a run starts with besides the defaults (from the shop, later the character). */
export interface RunBonuses {
  stats: Partial<Stats>;
  charges: Charges;
}

export const newSave = (): MetaSave => ({
  version: SAVE_VERSION,
  gold: 0,
  shop: {},
  heroes: [],
  cleared: [],
  elos: [],
  records: {},
  bestiary: {},
  totals: newTotals(),
  achievements: [],
  fresh: [],
});

const newTotals = (): Totals => ({ runs: 0, wins: 0, kills: 0, damage: 0, gold: 0, time: 0 });

export const newHeroRecord = (): HeroRecord => ({
  runs: 0,
  wins: {},
  bestTime: 0,
  fastestWin: 0,
  bestLevel: 0,
  bestKills: 0,
  bestHit: 0,
  bestDamage: 0,
  weaponRuns: {},
  elos: [],
  untouched: 0,
  closestWin: 1,
  maxElos: 0,
  maxMaxed: 0,
  soloWins: 0,
  vigil: {},
});

/** A finite number >= 0, else 0 (`int`: floored, for counters). */
function num(v: unknown, int = false): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return 0;
  return int ? Math.floor(v) : v;
}

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Known ids of `list`, in data order. */
const known = <T extends string>(list: unknown, ids: readonly T[]): T[] =>
  Array.isArray(list) ? ids.filter((id) => list.includes(id)) : [];

/** Counters keyed by known ids (unknown ids and zeros dropped). */
function counts<T extends string>(raw: unknown, ids: readonly T[]): Partial<Record<T, number>> {
  const r = obj(raw);
  const out: Partial<Record<T, number>> = {};
  for (const id of ids) {
    const n = num(r[id], true);
    if (n > 0) out[id] = n;
  }
  return out;
}

/** Weapons renamed since older saves (Sinos de Bronze became Escudos de Valmor): their records carry over. */
const RENAMED: Record<string, string> = { bells: 'shields', funeralToll: 'valmorWall' };
const renamedList = (raw: unknown): unknown =>
  Array.isArray(raw) ? raw.map((id) => (typeof id === 'string' ? (RENAMED[id] ?? id) : id)) : raw;
function renamedKeys(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) out[RENAMED[k] ?? k] = v;
  return out;
}

function sanitizeRecord(raw: unknown): HeroRecord {
  const r = obj(raw);
  const closest = typeof r.closestWin === 'number' && Number.isFinite(r.closestWin) ? r.closestWin : 1;
  return {
    runs: num(r.runs, true),
    wins: counts(r.wins, STAGE_IDS),
    bestTime: num(r.bestTime),
    fastestWin: num(r.fastestWin),
    bestLevel: num(r.bestLevel, true),
    bestKills: num(r.bestKills, true),
    bestHit: num(r.bestHit),
    bestDamage: num(r.bestDamage),
    weaponRuns: counts(renamedKeys(r.weaponRuns), WEAPON_IDS),
    elos: known(renamedList(r.elos), EVOLVED_IDS),
    untouched: num(r.untouched),
    closestWin: Math.max(0, Math.min(1, closest)),
    maxElos: num(r.maxElos, true),
    maxMaxed: num(r.maxMaxed, true),
    soloWins: num(r.soloWins, true),
    vigil: counts(r.vigil, STAGE_IDS),
  };
}

function sanitizeBestiary(raw: unknown): MetaSave['bestiary'] {
  const r = obj(raw);
  const out: MetaSave['bestiary'] = {};
  for (const id of ENEMY_IDS) {
    if (!(id in r)) continue;
    const e = obj(r[id]);
    // A stage this build doesn't know: the first stage that sends it (elites: the first stage).
    const stage =
      STAGE_IDS.find((s) => s === e.stage) ??
      STAGE_IDS.find((s) => stageCast(s).includes(id)) ??
      (STAGE_IDS[0] as StageId);
    out[id] = { kills: num(e.kills, true), stage };
  }
  return out;
}

/**
 * v0/v1 saves know which stages were won: their cast was seen there (the boss with one kill, it fell), and at
 * least that many runs were won. Nothing else can be told (not even the hero), so the rest starts empty.
 */
function seedFromCleared(save: MetaSave): void {
  for (const stage of save.cleared) {
    for (const id of stageCast(stage)) save.bestiary[id] ??= { kills: 0, stage };
    const boss = save.bestiary[STAGES[stage].boss.id] as BestiaryEntry;
    boss.kills = Math.max(boss.kills, 1);
  }
  save.totals.wins = Math.max(save.totals.wins, save.cleared.length);
}

/**
 * Accepts anything (old, versionless or broken saves) and returns a valid save of the current version. Every
 * field is repaired on its own, so one broken field never costs the rest.
 * Version 0 (no `version` field) had no Elos list: it simply starts empty, nothing else is lost.
 * Versions 0 and 1 had no records, bestiary or totals: see `seedFromCleared`.
 */
export function sanitizeSave(raw: unknown): MetaSave {
  const save = newSave();
  if (!raw || typeof raw !== 'object') return save;
  const r = raw as {
    version?: unknown;
    gold?: unknown;
    shop?: unknown;
    heroes?: unknown;
    cleared?: unknown;
    elos?: unknown;
    lastHero?: unknown;
    lastStage?: unknown;
    records?: unknown;
    bestiary?: unknown;
    totals?: unknown;
    achievements?: unknown;
    fresh?: unknown;
    title?: unknown;
  };
  if (typeof r.version === 'number' && r.version > SAVE_VERSION) save.future = r as Record<string, unknown>;
  if (typeof r.gold === 'number' && Number.isFinite(r.gold) && r.gold >= 0) save.gold = Math.floor(r.gold);
  if (r.shop && typeof r.shop === 'object') {
    for (const id of SHOP_IDS) {
      const lv = (r.shop as Record<string, unknown>)[id];
      if (typeof lv === 'number' && lv > 0) save.shop[id] = Math.min(Math.floor(lv), SHOP[id].maxLevel);
    }
  }
  save.heroes = known(r.heroes, CHARACTER_IDS);
  save.cleared = known(r.cleared, STAGE_IDS);
  save.elos = known(renamedList(r.elos), EVOLVED_IDS);
  const records = obj(r.records);
  for (const id of CHARACTER_IDS) if (id in records) save.records[id] = sanitizeRecord(records[id]);
  save.bestiary = sanitizeBestiary(r.bestiary);
  const totals = obj(r.totals);
  for (const k of Object.keys(save.totals) as (keyof Totals)[])
    save.totals[k] = num(totals[k], k !== 'damage' && k !== 'time');
  if (!(typeof r.version === 'number' && r.version >= 2)) seedFromCleared(save);
  save.achievements = known(r.achievements, ACHIEVEMENT_IDS);
  save.fresh = known(r.fresh, save.achievements);
  const title = save.achievements.find((id) => id === r.title);
  if (title && ACHIEVEMENTS[title].title) save.title = title;
  // The last choice only if it can still be played (hero owned, stage open).
  const hero = CHARACTER_IDS.find((id) => id === r.lastHero);
  if (hero && heroUnlocked(save, hero)) save.lastHero = hero;
  const stage = STAGE_IDS.find((id) => id === r.lastStage);
  if (stage && stageUnlocked(save, stage)) save.lastStage = stage;
  return save;
}

/** The hero and stage to preselect: the last valid choice, else Aldo in Valmor. */
export function lastRun(save: MetaSave): { character: CharacterId; stage: StageId } {
  return { character: save.lastHero ?? 'aldo', stage: save.lastStage ?? 'valmor' };
}

/**
 * Merges a newer build's progress (`old`) with this build's (`now`): numbers by the larger (records and counters
 * only grow; `fastestWin` and `closestWin` by the smaller that is set), lists by union, objects key by key, so
 * entries this build doesn't know survive. A text keeps the old value (the stage an enemy was first seen in).
 */
function mergeUp(old: unknown, now: unknown, key = ''): unknown {
  if (typeof now === 'number') {
    if (typeof old !== 'number' || !Number.isFinite(old)) return now;
    if (key === 'fastestWin') return old > 0 && (now === 0 || old < now) ? old : now;
    if (key === 'closestWin') return Math.min(old, now);
    return Math.max(old, now);
  }
  if (Array.isArray(now)) return [...new Set([...(Array.isArray(old) ? old : []), ...now])];
  if (now && typeof now === 'object') {
    const base = obj(old);
    const out: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(now)) out[k] = mergeUp(base[k], v, k);
    return out;
  }
  return typeof old === typeof now ? old : now;
}

/**
 * What gets written to storage. A save read from a newer version keeps its version, unknown fields, and the shop
 * levels, heroes, stages, Elos, records, bestiary and totals this build doesn't know, merged with what changed here.
 */
export function serializeSave(save: MetaSave): object {
  const { future, ...known } = save;
  if (!future) return known;
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const union = (old: unknown, now: readonly string[]) => [...new Set([...list(old), ...now])];
  const shop = future.shop && typeof future.shop === 'object' ? future.shop : {};
  return {
    ...future,
    gold: known.gold,
    shop: { ...shop, ...known.shop },
    heroes: union(future.heroes, known.heroes),
    cleared: union(future.cleared, known.cleared),
    elos: union(future.elos, known.elos),
    records: mergeUp(future.records, known.records),
    bestiary: mergeUp(future.bestiary, known.bestiary),
    totals: mergeUp(future.totals, known.totals),
    achievements: union(future.achievements, known.achievements),
    fresh: union(future.fresh, known.fresh),
    title: known.title ?? future.title,
    lastHero: known.lastHero,
    lastStage: known.lastStage,
  };
}

/** What a recorded run changed, for the end screen. */
export interface RunRecorded {
  /** Elos new to the save. */
  elos: WeaponId[];
  /** Achievements unlocked by this run (their gold already banked). */
  achievements: AchievementId[];
}

/**
 * Records a finished run in the save: its gold, the stage if won, its Elos, the hero's records, the bestiary and
 * the totals; then unlocks the achievements it earned. Pure: render/save.ts loads, calls this and writes.
 */
export function recordRun(save: MetaSave, run: RunSummary): RunRecorded {
  save.gold += Math.max(0, Math.floor(run.gold));
  if (run.won) markCleared(save, run.stage);
  const elos = discoverElos(save, run.elos);

  const rec = (save.records[run.hero] ??= newHeroRecord());
  rec.runs++;
  rec.bestTime = Math.max(rec.bestTime, run.time);
  rec.bestLevel = Math.max(rec.bestLevel, run.level);
  rec.bestKills = Math.max(rec.bestKills, run.kills);
  rec.bestHit = Math.max(rec.bestHit, run.bestHit);
  rec.bestDamage = Math.max(rec.bestDamage, run.damage);
  rec.untouched = Math.max(rec.untouched, run.untouched);
  rec.maxElos = Math.max(rec.maxElos, run.elos.length);
  rec.maxMaxed = Math.max(rec.maxMaxed, run.maxed);
  for (const id of new Set(run.weapons)) rec.weaponRuns[id] = (rec.weaponRuns[id] ?? 0) + 1;
  for (const id of run.elos) if (!rec.elos.includes(id)) rec.elos.push(id);
  if (run.won) {
    rec.wins[run.stage] = (rec.wins[run.stage] ?? 0) + 1;
    rec.fastestWin = rec.fastestWin > 0 ? Math.min(rec.fastestWin, run.time) : run.time;
    rec.closestWin = Math.min(rec.closestWin, run.hpLeft);
    const signature = CHARACTERS[run.hero].weapon;
    if (run.weapons.every((id) => id === signature)) rec.soloWins++;
  }
  recordVigilTime(rec, run);

  for (const id of run.seen) save.bestiary[id] ??= { kills: 0, stage: run.stage };
  for (const id of ENEMY_IDS) {
    const k = run.killsBy[id] ?? 0;
    if (k > 0) (save.bestiary[id] ??= { kills: 0, stage: run.stage }).kills += k;
  }

  const tot = save.totals;
  tot.runs++;
  if (run.won) tot.wins++;
  tot.kills += run.kills;
  tot.damage += run.damage;
  tot.gold += Math.max(0, Math.floor(run.gold));
  tot.time += run.time;
  return { elos, achievements: checkAchievements(save) };
}

function recordVigilTime(rec: HeroRecord, run: RunSummary): void {
  const v = Math.floor(run.vigil);
  if (v > (rec.vigil[run.stage] ?? 0)) rec.vigil[run.stage] = v;
}

/**
 * The end of a Noite Sem Fim. The victory itself was recorded when the boss fell (`before` is the summary then);
 * this adds only what the vigil brought: its gold, kills, damage and time, new Elos and bestiary entries, best
 * marks and the vigil record. Runs and victories are not counted again.
 */
export function recordVigil(save: MetaSave, run: RunSummary, before: RunSummary): RunRecorded {
  const gold = Math.max(0, Math.floor(run.gold - before.gold));
  save.gold += gold;
  const elos = discoverElos(save, run.elos);
  const rec = (save.records[run.hero] ??= newHeroRecord());
  rec.bestTime = Math.max(rec.bestTime, run.time);
  rec.bestLevel = Math.max(rec.bestLevel, run.level);
  rec.bestKills = Math.max(rec.bestKills, run.kills);
  rec.bestHit = Math.max(rec.bestHit, run.bestHit);
  rec.bestDamage = Math.max(rec.bestDamage, run.damage);
  rec.maxElos = Math.max(rec.maxElos, run.elos.length);
  rec.maxMaxed = Math.max(rec.maxMaxed, run.maxed);
  for (const id of run.elos) if (!rec.elos.includes(id)) rec.elos.push(id);
  recordVigilTime(rec, run);
  for (const id of run.seen) save.bestiary[id] ??= { kills: 0, stage: run.stage };
  for (const id of ENEMY_IDS) {
    const k = (run.killsBy[id] ?? 0) - (before.killsBy[id] ?? 0);
    if (k > 0) (save.bestiary[id] ??= { kills: 0, stage: run.stage }).kills += k;
  }
  const tot = save.totals;
  tot.kills += run.kills - before.kills;
  tot.damage += Math.max(0, run.damage - before.damage);
  tot.gold += gold;
  tot.time += Math.max(0, run.time - before.time);
  return { elos, achievements: checkAchievements(save) };
}

/** Marks Elos as discovered; returns the ones that were new. */
export function discoverElos(save: MetaSave, ids: readonly WeaponId[]): WeaponId[] {
  const fresh = ids.filter((id) => EVOLVED_IDS.includes(id) && !save.elos.includes(id));
  save.elos.push(...fresh);
  return fresh;
}

/** Whether any hero has held this base weapon in a run (the Livro de Elos then reveals its Elo's passive). */
export function weaponUsed(save: MetaSave, id: WeaponId): boolean {
  return Object.values(save.records).some((r) => (r?.weaponRuns[id] ?? 0) > 0);
}

export const heroUnlocked = (save: MetaSave, id: CharacterId): boolean =>
  config.unlockAllHeroes || CHARACTERS[id].cost === 0 || save.heroes.includes(id);

/** Buys a hero if affordable. Returns true on success. */
export function unlockHero(save: MetaSave, id: CharacterId): boolean {
  const cost = CHARACTERS[id].cost;
  if (heroUnlocked(save, id) || save.gold < cost) return false;
  save.gold -= cost;
  save.heroes.push(id);
  return true;
}

/** The first stage is always open; each next one opens when the previous is cleared (or all, while playtesting). */
export function stageUnlocked(save: MetaSave, id: StageId): boolean {
  const i = STAGE_IDS.indexOf(id);
  return config.unlockAllStages || i === 0 || save.cleared.includes(STAGE_IDS[i - 1] as StageId);
}

export function markCleared(save: MetaSave, id: StageId): void {
  if (!save.cleared.includes(id)) save.cleared.push(id);
}

export const shopLevel = (save: MetaSave, id: ShopId): number => save.shop[id] ?? 0;

/** Price of the next level, or null when maxed. */
export function shopCost(save: MetaSave, id: ShopId): number | null {
  const def: ShopDef = SHOP[id];
  const next = shopLevel(save, id) + 1;
  return next > def.maxLevel ? null : def.baseCost * next;
}

/** Buys the next level if affordable. Returns true on success. */
export function buy(save: MetaSave, id: ShopId): boolean {
  const cost = shopCost(save, id);
  if (cost === null || save.gold < cost) return false;
  save.gold -= cost;
  save.shop[id] = shopLevel(save, id) + 1;
  return true;
}

/** The starting stat deltas and per-run charges the shop gives (and achievements, if `achievementCharges`). */
/**
 * The Loja's two-step purchase: choosing an item only selects it (its detail shows); buying needs a confirmation
 * of the selected item, and enough gold.
 */
export interface ShopCart {
  selected: ShopId | null;
}

export function confirmPurchase(save: MetaSave, cart: ShopCart): boolean {
  return cart.selected !== null && buy(save, cart.selected);
}

/** Gold still missing for the next level of `id`: 0 when affordable, null when maxed. */
export function shopShortfall(save: MetaSave, id: ShopId): number | null {
  const cost = shopCost(save, id);
  return cost === null ? null : Math.max(0, cost - save.gold);
}

/** The most expensive next level in the Loja (a long-term goal for the end screen), null when all is bought. */
export function biggestGoal(save: MetaSave): { id: ShopId; cost: number } | null {
  let best: { id: ShopId; cost: number } | null = null;
  for (const id of SHOP_IDS) {
    const cost = shopCost(save, id);
    if (cost !== null && (!best || cost > best.cost)) best = { id, cost };
  }
  return best;
}

export function shopBonuses(save: MetaSave): RunBonuses {
  const out: RunBonuses = { stats: {}, charges: { ...config.charges } };
  for (const id of SHOP_IDS) {
    const lv = shopLevel(save, id);
    if (lv === 0) continue;
    const def: ShopDef = SHOP[id];
    const add = def.perLevel * lv;
    if ('stat' in def) out.stats[def.stat] = (out.stats[def.stat] ?? 0) + add;
    else out.charges[def.charge] += add;
  }
  if (config.achievementCharges)
    for (const id of save.achievements) {
      const charge = ACHIEVEMENTS[id].charge;
      if (charge) out.charges[charge]++;
    }
  return out;
}
