import { config } from './config';
import type { EnemyId } from './enemies';
import { buildWaves, type WaveSegment } from './waves';

/** A place to survive in. Names and texts live in i18n under `stages`. */
export interface StageDef {
  /** Ground tile asset key (render/assets.ts). */
  tile: string;
  waves: WaveSegment[];
  /** One elite at each of these times (seconds), with the HP multiplier of the segment then active. */
  elites: { id: EnemyId; at: number }[];
  boss: { id: EnemyId; at: number };
}

const ELITE_TIMES = [100, 220, 330, 420, 500, 570];
/** Alternates the given elites over the shared schedule. */
const elites = (...ids: EnemyId[]) =>
  ELITE_TIMES.map((at, i) => ({ id: ids[i % ids.length] as EnemyId, at }));

export const STAGES = {
  /** Arredores de Valmor: the village graveyard in the frozen south. */
  valmor: {
    tile: 'tile',
    waves: buildWaves({ basic: 'skeleton', fast: 'spider', tank: 'slime' }),
    elites: elites('golem', 'goblin'),
    boss: { id: 'blackKnight', at: config.matchDuration },
  },
  /** Cripta da Igreja Velha: where the Sineiro rang the bell that wakes the dead. */
  crypt: {
    tile: 'tile.crypt',
    waves: buildWaves({ basic: 'bones', fast: 'bat', tank: 'ghost', extra: 'rat' }),
    elites: elites('golem', 'goblin'),
    boss: { id: 'bellRinger', at: config.matchDuration },
  },
  /** Estrada do Sul: the frozen road, the hooded ones and the wolf pack. */
  southRoad: {
    tile: 'tile.road',
    waves: buildWaves({ basic: 'hooded', fast: 'crow', tank: 'frostWolf' }),
    elites: elites('goblin', 'golem'),
    boss: { id: 'oldWolf', at: config.matchDuration },
  },
} satisfies Record<string, StageDef>;

export type StageId = keyof typeof STAGES;
/** In unlock order: clearing one opens the next. */
export const STAGE_IDS = Object.keys(STAGES) as StageId[];
