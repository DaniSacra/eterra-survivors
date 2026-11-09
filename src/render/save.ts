import {
  newSave,
  recordRun as record,
  sanitizeSave,
  serializeSave,
  type MetaSave,
  type RunRecorded,
} from '../core/meta';
import type { RunSummary } from '../core/records';
import type { CharacterId } from '../data/characters';
import type { StageId } from '../data/stages';

/** Browser persistence of the meta save. Storage may be missing or blocked: the game still runs without it. */
const KEY = 'eterra-survivors.save';

export function loadSave(): MetaSave {
  try {
    return sanitizeSave(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return newSave();
  }
}

export function writeSave(save: MetaSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(serializeSave(save)));
  } catch {
    // Private mode or full storage: progress just isn't kept.
  }
}

/** Records the end of a run in the stored save (core/meta.ts `recordRun`). */
export function recordRun(run: RunSummary): RunRecorded {
  const save = loadSave();
  const out = record(save, run);
  writeSave(save);
  return out;
}

/** Remembers the hero and stage chosen, so the Preparação opens on them after a reload. */
export function rememberChoice(character: CharacterId, stage: StageId): void {
  const save = loadSave();
  if (save.lastHero === character && save.lastStage === stage) return;
  save.lastHero = character;
  save.lastStage = stage;
  writeSave(save);
}
