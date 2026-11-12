import type Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { music } from './music';
import { setSetting, settings } from './settings';
import { UI, button, label, seal } from './ui';

/** The options shown as on/off buttons, in order. */
const OPTIONS: ('muted' | 'music' | 'damageNumbers' | 'calm')[] = ['muted', 'music', 'damageNumbers', 'calm'];

const SHORT = {
  muted: 'soundShort',
  music: 'musicShort',
  damageNumbers: 'numbersShort',
  calm: 'calmShort',
} as const;

/**
 * The options side by side in one row of `w` (the pause screen, NU-03): a short name and a lamp, lit when on.
 * Buttons left to right, for keyNav.
 */
export function optionRow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h = 44,
  gap = 8,
): Phaser.GameObjects.Rectangle[] {
  const bw = (w - gap * (OPTIONS.length - 1)) / OPTIONS.length;
  const size = Math.min(15, h * 0.36);
  return OPTIONS.map((key, i) => {
    const bx = x - w / 2 + bw / 2 + i * (bw + gap);
    const isOn = () => (key === 'muted' ? !settings().muted : settings()[key]);
    const paint = () =>
      lamp.setFillStyle(isOn() ? UI.ok : UI.panelOff).setStrokeStyle(2, isOn() ? UI.ok : UI.borderOff);
    const b = button(scene, bx, y, bw, h, () => {
      setSetting(key, !settings()[key]);
      music.sync(scene);
      paint();
    });
    label(scene, bx - 6, y, t.options[SHORT[key]], size, { bold: true });
    const lamp = scene.add.circle(bx + bw / 2 - 12, y, 5);
    paint();
    return b;
  });
}

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
      music.sync(scene);
      state.set(isOn() ? t.options.on : t.options.off, isOn());
    });
    label(scene, x - w / 2 + 14, by, t.options[key], size, { bold: true, align: 'left' }).setOrigin(0, 0.5);
    const state = seal(scene, x + w / 2 - 12, by, isOn() ? t.options.on : t.options.off, isOn(), 13);
    return b;
  });
}
