import { markCleared, newSave, sanitizeSave, type MetaSave } from '../core/meta';
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
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Private mode or full storage: progress just isn't kept.
  }
}

/** Records the end of a run: its gold, and the stage if it was won. */
export function recordRun(gold: number, cleared: StageId | null): void {
  const save = loadSave();
  save.gold += Math.max(0, gold);
  if (cleared) markCleared(save, cleared);
  writeSave(save);
}
