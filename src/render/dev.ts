import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { UI, label, safeArea } from './ui';

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

/** The "Modo dev" tag in the bottom-right corner, so a test session is never mistaken for the real game. */
export function devTag(scene: Phaser.Scene): void {
  if (!DEV_MODE) return;
  const s = safeArea();
  label(scene, scene.scale.width - s.right - 8, scene.scale.height - s.bottom - 6, t.dev.tag, 12, {
    bold: true,
    color: UI.danger,
  })
    .setOrigin(1, 1)
    .setDepth(100);
}
