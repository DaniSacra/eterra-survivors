import { config } from './config';
import { ENEMIES, ENEMY_IDS, type EnemyDef, type EnemyId } from './enemies';
import { buildWaves, type WaveSegment } from './waves';

/**
 * How a stage's ground plays (logic in core/terrain.ts):
 * - `open`: an endless field.
 * - `obstacles`: an endless field with columns, sarcophagi and gravestones, placed by the run's seed in cells of
 *   `cell` px (one obstacle in `chance` of them), none within `clear` px of the start. They block the hero and the
 *   enemies (circles: walkers slide along them); shots fly over.
 * - `corridor`: an endless road running north–south, `width` px wide, between impassable frozen forest. Enemies come
 *   from both ends, and `sides` of them out of the forest.
 */
export type StageLayout =
  | { kind: 'open' }
  | { kind: 'obstacles'; cell: number; chance: number; clear: number }
  | { kind: 'corridor'; width: number; sides: number };

/** Multipliers over the shared wave curve (enemies, elites and the boss alike), and the gold a run brings. */
export interface StageMult {
  hp: number;
  damage: number;
  speed: number;
  /** Enemies per spawn batch. */
  spawn: number;
  gold: number;
}

/** A place to survive in. Names and texts live in i18n under `stages`. */
export interface StageDef {
  /** Ground tile asset key (render/assets.ts). */
  tile: string;
  layout: StageLayout;
  mult: StageMult;
  waves: WaveSegment[];
  /** One elite at each of these times (seconds), with the HP multiplier of the segment then active. */
  elites: { id: EnemyId; at: number }[];
  /** Scheduled one-offs besides the elites: from `from` s, one every `every` s (each waits under its def's `max`). */
  specials?: { id: EnemyId; from: number; every: number }[];
  boss: { id: EnemyId; at: number };
}

const ELITE_TIMES = [90, 200, 300, 390, 480, 560];
/** Alternates the given elites over the shared schedule. */
const elites = (...ids: EnemyId[]) =>
  ELITE_TIMES.map((at, i) => ({ id: ids[i % ids.length] as EnemyId, at }));

export const STAGES = {
  /** Arredores de Valmor: barns, fences and fields around the village, in the snow, taken by rats and spiders (FT-13). */
  valmor: {
    tile: 'tile',
    layout: { kind: 'open' },
    mult: { hp: 0.9, damage: 0.95, speed: 1, spawn: 1, gold: 1 },
    waves: buildWaves({ basic: 'graveRat', fast: 'bat', tank: 'rat', extra: 'spider' }),
    elites: elites('witch'),
    specials: [
      { id: 'spiderNest', from: 45, every: 30 },
      { id: 'thiefRat', from: 150, every: 120 },
    ],
    boss: { id: 'spiderMother', at: config.matchDuration },
  },
  /**
   * Cripta da Igreja Velha: where the Sineiro rang the bell that wakes the dead. Provisional cast until FT-16 (the
   * rats and spiders went to the first stage; the Gosma Verde waits for its place as a hazard).
   */
  crypt: {
    tile: 'tile.crypt',
    layout: { kind: 'obstacles', cell: 170, chance: 0.4, clear: 260 },
    mult: { hp: 1.4, damage: 1.65, speed: 1.05, spawn: 1.15, gold: 1.5 },
    waves: buildWaves({
      basic: 'bones',
      fast: 'vampireBat',
      tank: 'skeleton',
      extra: 'ghost',
      shooter: 'coldSpirit',
    }),
    elites: elites('gravedigger'),
    specials: [
      { id: 'emberBones', from: 40, every: 12 },
      { id: 'slime', from: 70, every: 15 },
    ],
    boss: { id: 'bellRinger', at: config.matchDuration },
  },
  /** Estrada do Sul: the frozen road, the hooded ones and the wolf pack. */
  southRoad: {
    tile: 'tile.road',
    layout: { kind: 'corridor', width: 320, sides: 0.05 },
    mult: { hp: 2.1, damage: 1.8, speed: 1.1, spawn: 1.0, gold: 2 },
    waves: buildWaves({
      basic: 'hooded',
      fast: 'crow',
      tank: 'frostBoar',
      extra: 'frostWolf',
      shooter: 'goblin',
    }),
    elites: elites('golem'),
    specials: [{ id: 'warBanner', from: 120, every: 45 }],
    boss: { id: 'oldWolf', at: config.matchDuration },
  },
} satisfies Record<string, StageDef>;

export type StageId = keyof typeof STAGES;
/** In unlock order: clearing one opens the next. */
export const STAGE_IDS = Object.keys(STAGES) as StageId[];

/** What a boss raises out of the ground (its abilities' `summon`), so those join the stage's cast. */
function bossSummons(id: EnemyId): EnemyId[] {
  const def: EnemyDef = ENEMIES[id];
  const list = def.abilities ?? (def.ability ? [def.ability] : []);
  return list.flatMap((a) => (a.summon ? [a.summon as EnemyId] : []));
}

/** Every enemy a stage sends (its wave cast in role order, then its elites and boss), without repeats. */
export function stageCast(id: StageId): EnemyId[] {
  const s: StageDef = STAGES[id];
  const ids = [
    ...s.waves.flatMap((w) => w.enemies.map((e) => e.id)),
    ...(s.specials ?? []).map((e) => e.id),
    ...s.elites.map((e) => e.id),
    s.boss.id,
    ...bossSummons(s.boss.id),
  ];
  return [...new Set(ids)];
}

/**
 * The bestiary's order: each stage's wave cast in stage order (with what the boss raises), then every elite, then
 * the bosses. An enemy no stage sends any more (the Cavaleiro Negro, the Gosma Verde for now) is listed, last, only
 * for whoever already met it (`seen`: the save's bestiary).
 */
export function bestiaryOrder(seen: Partial<Record<EnemyId, unknown>> = {}): EnemyId[] {
  const ids = [
    ...STAGE_IDS.flatMap((id) => {
      const s: StageDef = STAGES[id];
      return [
        ...s.waves.flatMap((w) => w.enemies.map((e) => e.id)),
        ...(s.specials ?? []).map((e) => e.id),
        ...bossSummons(s.boss.id),
      ];
    }),
    ...STAGE_IDS.flatMap((id) => STAGES[id].elites.map((e) => e.id)),
    ...STAGE_IDS.map((id) => STAGES[id].boss.id),
  ];
  const placed = new Set(ids);
  return [...placed, ...ENEMY_IDS.filter((id) => !placed.has(id) && seen[id])];
}
