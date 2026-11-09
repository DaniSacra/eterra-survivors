import { config } from './config';
import type { EnemyId } from './enemies';
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
  boss: { id: EnemyId; at: number };
}

const ELITE_TIMES = [90, 200, 300, 390, 480, 560];
/** Alternates the given elites over the shared schedule. */
const elites = (...ids: EnemyId[]) =>
  ELITE_TIMES.map((at, i) => ({ id: ids[i % ids.length] as EnemyId, at }));

export const STAGES = {
  /** Arredores de Valmor: the village graveyard in the frozen south (cast as in the original's graveyard). */
  valmor: {
    tile: 'tile',
    layout: { kind: 'open' },
    mult: { hp: 1, damage: 1.05, speed: 1, spawn: 1, gold: 1 },
    waves: buildWaves({ basic: 'bones', fast: 'bat', tank: 'skeleton', extra: 'graveRat' }),
    elites: elites('golem', 'goblin'),
    boss: { id: 'blackKnight', at: config.matchDuration },
  },
  /** Cripta da Igreja Velha: where the Sineiro rang the bell that wakes the dead. */
  crypt: {
    tile: 'tile.crypt',
    layout: { kind: 'obstacles', cell: 170, chance: 0.4, clear: 260 },
    mult: { hp: 1.3, damage: 1.75, speed: 1.05, spawn: 1.15, gold: 1.5 },
    waves: buildWaves({ basic: 'rat', fast: 'spider', tank: 'slime', extra: 'ghost' }),
    elites: elites('golem', 'goblin'),
    boss: { id: 'bellRinger', at: config.matchDuration },
  },
  /** Estrada do Sul: the frozen road, the hooded ones and the wolf pack. */
  southRoad: {
    tile: 'tile.road',
    layout: { kind: 'corridor', width: 520, sides: 0.2 },
    mult: { hp: 2.3, damage: 2.1, speed: 1.1, spawn: 1.25, gold: 2 },
    waves: buildWaves({ basic: 'hooded', fast: 'crow', tank: 'frostWolf' }),
    elites: elites('goblin', 'golem'),
    boss: { id: 'oldWolf', at: config.matchDuration },
  },
} satisfies Record<string, StageDef>;

export type StageId = keyof typeof STAGES;
/** In unlock order: clearing one opens the next. */
export const STAGE_IDS = Object.keys(STAGES) as StageId[];

/** Every enemy a stage sends (its wave cast in role order, then its elites and boss), without repeats. */
export function stageCast(id: StageId): EnemyId[] {
  const s: StageDef = STAGES[id];
  const ids = [
    ...s.waves.flatMap((w) => w.enemies.map((e) => e.id)),
    ...s.elites.map((e) => e.id),
    s.boss.id,
  ];
  return [...new Set(ids)];
}

/** The bestiary's order: each stage's wave cast in stage order, then every elite, then the bosses. */
export function bestiaryOrder(): EnemyId[] {
  const ids = [
    ...STAGE_IDS.flatMap((id) => STAGES[id].waves.flatMap((w) => w.enemies.map((e) => e.id))),
    ...STAGE_IDS.flatMap((id) => STAGES[id].elites.map((e) => e.id)),
    ...STAGE_IDS.map((id) => STAGES[id].boss.id),
  ];
  return [...new Set(ids)];
}
