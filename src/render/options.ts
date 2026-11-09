import type Phaser from 'phaser';
import type { Settings } from '../core/settings';
import { t } from '../i18n/pt-BR';
import { setSetting, settings } from './settings';
import { button } from './ui';

/** The options shown as on/off buttons, in order. */
const OPTIONS: (keyof Settings)[] = ['damageNumbers', 'calm'];

/** One toggle button per option, stacked from `y` down; returns them for keyNav. */
export function optionButtons(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h = 44,
  gap = 10,
): Phaser.GameObjects.Rectangle[] {
  return OPTIONS.map((key, i) => {
    const text = () => t.options[key](settings()[key]);
    const b = button(
      scene,
      x,
      y + i * (h + gap),
      w,
      h,
      () => {
        setSetting(key, !settings()[key]);
        (b.getData('label') as Phaser.GameObjects.Text).setText(text());
      },
      text(),
    );
    (b.getData('label') as Phaser.GameObjects.Text).setFontSize(Math.min(17, h * 0.38));
    return b;
  });
}
