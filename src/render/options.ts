import type Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { music } from './music';
import { nextMusic } from '../core/settings';
import { setSetting, settings } from './settings';
import { UI, fontPx, button, label, seal } from './ui';

/** The options shown as on/off buttons, in order. */
const OPTIONS: ('muted' | 'music' | 'damageNumbers' | 'calm' | 'tips')[] = [
  'muted',
  'music',
  'damageNumbers',
  'calm',
  'tips',
];

const SHORT = {
  muted: 'soundShort',
  music: 'musicShort',
  damageNumbers: 'numbersShort',
  calm: 'calmShort',
  tips: 'tipsShort',
} as const;

/**
 * The options side by side in one row of `w` (the pause screen, NU-03): a short name and a bar on the bottom edge, green when on.
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
    const paint = () => bar.setFillStyle(isOn() ? UI.ok : UI.panelOff);
    const b = button(scene, bx, y, bw, h, () => {
      setSetting(key, !settings()[key]);
      music.sync(scene);
      paint();
    });
    // The name is centred; the state is a 3 px bar on the bottom edge (green on), so the text width never matters.
    const text = label(scene, bx, y - 2, t.options[SHORT[key]], size, { bold: true });
    for (let s = size; text.width + 12 > bw && s > 9; s--) text.setFontSize(fontPx(s - 1));
    const bar = scene.add.rectangle(bx, y + h / 2 - 3, bw - 4, 3, UI.panelOff);
    paint();
    return b;
  });
}

/** One toggle card per option (name on the left, on/off seal on the right), stacked from `y` down; for keyNav. */
/** The Opções screen has one more switch than the pause row: the anonymous statistics. */
const ALL_OPTIONS: ((typeof OPTIONS)[number] | 'stats')[] = [...OPTIONS, 'stats'];

export function optionButtons(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h = 44,
  gap = 10,
): Phaser.GameObjects.Rectangle[] {
  const size = Math.min(17, h * 0.38);
  return ALL_OPTIONS.map((key, i) => {
    const by = y + i * (h + gap);
    // Sound is stored as "muted": its seal shows whether the sound is on.
    const isOn = () => (key === 'muted' ? !settings().muted : settings()[key]);
    // The music has three states (Desligada, Baixa, Normal); the others are on or off.
    const stateText = () =>
      key === 'music'
        ? t.options.musicLevel[settings().music ? settings().musicLevel : 'off']
        : isOn()
          ? t.options.on
          : t.options.off;
    const b = button(scene, x, by, w, h, () => {
      if (key === 'music') {
        const next = nextMusic(settings());
        setSetting('music', next.music);
        setSetting('musicLevel', next.musicLevel);
      } else setSetting(key, !settings()[key]);
      music.sync(scene);
      state.set(stateText(), isOn());
    });
    label(scene, x - w / 2 + 14, by, t.options[key], size, { bold: true, align: 'left' }).setOrigin(0, 0.5);
    const state = seal(scene, x + w / 2 - 12, by, stateText(), isOn(), 13);
    return b;
  });
}
