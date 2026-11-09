import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { UI, isShort, label, safeArea } from './ui';

/**
 * Test mode: `?dev` at the end of the URL (works on the published game too). Every hero and stage open, the Loja
 * sets any level for free, and progress goes to a save of its own (render/save.ts), so the real one stays clean.
 */
export const DEV_MODE = ((): boolean => {
  try {
    return new URLSearchParams(window.location.search).has('dev');
  } catch {
    return false;
  }
})();

/**
 * The "Modo dev" tag, so a test session is never mistaken for the real game: top-right standing (the bottom holds
 * the Back button there), bottom-right lying down.
 */
export function devTag(scene: Phaser.Scene): void {
  if (!DEV_MODE) return;
  const s = safeArea();
  const bottom = isShort(scene);
  const x = scene.scale.width - s.right - 8;
  const y = bottom ? scene.scale.height - s.bottom - 6 : s.top + 2;
  label(scene, x, y, bottom ? t.dev.tag : t.dev.tagShort, 12, { bold: true, color: UI.danger })
    .setOrigin(1, bottom ? 1 : 0)
    .setDepth(100);
}
