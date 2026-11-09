import type Phaser from 'phaser';
import type { Settings } from '../core/settings';
import { t } from '../i18n/pt-BR';
import { setSetting, settings } from './settings';
import { button, label, seal } from './ui';

/** The options shown as on/off buttons, in order. */
const OPTIONS: (keyof Settings)[] = ['muted', 'damageNumbers', 'calm'];

/** One toggle card per option (name on the left, on/off seal on the right), stacked from `y` down; for keyNav. */
export function optionButtons(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h = 44,
  gap = 10,
): Phaser.GameObjects.Rectangle[] {
  const size = Math.min(17, h * 0.38);
  return OPTIONS.map((key, i) => {
    const by = y + i * (h + gap);
    // Sound is stored as "muted": its seal shows whether the sound is on.
    const isOn = () => (key === 'muted' ? !settings().muted : settings()[key]);
    const b = button(scene, x, by, w, h, () => {
      setSetting(key, !settings()[key]);
      state.set(isOn() ? t.options.on : t.options.off, isOn());
    });
    label(scene, x - w / 2 + 14, by, t.options[key], size, { bold: true, align: 'left' }).setOrigin(0, 0.5);
    const state = seal(scene, x + w / 2 - 12, by, isOn() ? t.options.on : t.options.off, isOn(), 13);
    return b;
  });
}
