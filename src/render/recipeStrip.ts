import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { ART_SCALE } from './art/pen';
import type { RecipePicture } from './describe';
import { UI, label } from './ui';

const ICON = 16;
const BAR_W = 24;

/**
 * A recipe as a picture (PX-08): [weapon icon + level bar] + [passive icon + level bar] → the Elo, a golden "?" until
 * it has been forged once (its name stays secret, NU-02). Left-aligned at (x, cy); returns the width it took.
 */
export function drawRecipe(scene: Phaser.Scene, x: number, cy: number, p: RecipePicture): number {
  let cx = x;
  const piece = (icon: string, level: number, max: number): void => {
    scene.add.image(cx + ICON / 2, cy, icon).setScale((ART_SCALE * ICON) / 28);
    cx += ICON + 3;
    scene.add
      .rectangle(cx, cy + 1, BAR_W, 6, 0x05040f, 0.9)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, UI.border);
    scene.add
      .rectangle(
        cx + 1,
        cy + 1,
        Math.max(0, (BAR_W - 2) * Math.min(1, level / max)),
        4,
        level >= max ? UI.accent : 0x8a6a1c,
      )
      .setOrigin(0, 0.5);
    cx += BAR_W + 3;
    label(scene, cx, cy, `${level}/${max}`, 11, {
      color: level >= max ? UI.gold : UI.muted,
      align: 'left',
    }).setOrigin(0, 0.5);
    cx += 22;
  };
  piece(p.weaponIcon, p.weaponLevel, p.weaponMax);
  label(scene, cx, cy, '+', 13, { color: UI.muted }).setOrigin(0, 0.5);
  cx += 12;
  piece(p.passiveIcon, p.passiveLevel, p.passiveMax);
  label(scene, cx, cy, '→', 13, { color: UI.muted }).setOrigin(0, 0.5);
  cx += 16;
  if (p.eloIcon) scene.add.image(cx + ICON / 2, cy, p.eloIcon).setScale((ART_SCALE * ICON) / 28);
  else {
    const c = scene.add
      .circle(cx + ICON / 2, cy, ICON / 2, 0x05040f, 0.9)
      .setStrokeStyle(2, UI.accent, p.ready ? 1 : 0.7);
    label(scene, cx + ICON / 2, cy, '?', 13, { bold: true, color: UI.gold });
    if (p.ready) scene.tweens.add({ targets: c, alpha: 0.5, duration: 450, yoyo: true, repeat: -1 });
  }
  cx += ICON;
  return cx - x;
}

/** "Combina com a sua <weapon>", for a passive card that moves a recipe of a weapon the hero owns. */
export const matchesText = (weapon: string): string => t.levelUp.matches(weapon);
