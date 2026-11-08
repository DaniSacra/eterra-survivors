import { newSave, sanitizeSave, type MetaSave } from '../core/meta';

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

export function bankGold(amount: number): void {
  if (amount <= 0) return;
  const save = loadSave();
  save.gold += amount;
  writeSave(save);
}
