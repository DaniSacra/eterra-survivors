import Phaser from 'phaser';
import { maxLevel, weaponPower } from '../core/weapons';
import { EVOLUTIONS, type Evolution } from '../data/evolutions';
import type { WeaponId } from '../data/weapons';
import { t } from '../i18n/pt-BR';
import { ART_SCALE } from '../render/art/pen';
import { sound } from '../render/sound';
import { UI, bindKeys, dim, label } from '../render/ui';
import type { HudScene } from './HudScene';
import { SCENES } from './keys';

/** Touches are ignored this long after opening, so a finger still steering doesn't close it unseen. */
const ARM_DELAY = 600;
/** Icon badges are drawn 28 px wide (render/art/icons.ts). */
const BADGE = 28;

/**
 * The Elo moment: the game pauses and the recipe shows as icons (weapon + passive = Elo), with the Elo's name,
 * its line and the damage before and after. Closed by a touch, Space or Enter.
 */
export class EloScene extends Phaser.Scene {
  private elo: WeaponId = 'fury';
  private closing = false;

  constructor() {
    super(SCENES.elo);
  }

  init(data: { elo: WeaponId }): void {
    this.elo = data.elo;
    this.closing = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const evo = EVOLUTIONS[this.elo] as Evolution;
    const backdrop = dim(this, 0.75);
    this.scene.bringToTop();

    const pw = Math.min(460, width - 24);
    const ph = Math.min(300, height - 24);
    const top = height / 2 - ph / 2;
    this.add.rectangle(cx, height / 2, pw, ph, UI.panel, 0.97).setStrokeStyle(3, UI.goldHex);
    const short = ph < 300;
    let y = top + (short ? 24 : 32);
    label(this, cx, y, t.elo.formed, short ? 24 : 30, { bold: true, color: UI.gold, stroke: true });

    // The recipe as big icons; the Elo's grows in with a pulse.
    const icon = short ? 40 : 52;
    const sym = 26;
    y += short ? 46 : 62;
    const step = icon + sym;
    const x0 = cx - step;
    const put = (x: number, key: string) => this.add.image(x, y, key).setScale((ART_SCALE * icon) / BADGE);
    put(x0, `icon.${evo.from}`);
    label(this, x0 + step / 2, y, t.elos.plus, 24, { bold: true, color: UI.muted });
    put(cx, `icon.${evo.passive}`);
    label(this, cx + step / 2, y, t.elos.equals, 24, { bold: true, color: UI.muted });
    const elo = put(cx + step, `icon.${this.elo}`);
    const scale = elo.scale;
    elo.setScale(0);
    this.tweens.add({ targets: elo, scale, duration: 420, delay: 150, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: elo,
      scale: scale * 1.1,
      duration: 600,
      delay: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    y += icon / 2 + (short ? 22 : 30);
    label(this, cx, y, t.weapons[this.elo].name, short ? 20 : 24, { bold: true, color: UI.gold });
    y += short ? 26 : 34;
    const line = t.elo.lines[this.elo];
    if (line) {
      const l = label(this, cx, y, line, 14, { color: UI.text, wrap: pw - 40 });
      l.setFontStyle('italic');
      y += l.height / 2 + (short ? 16 : 22);
    }
    const from = Math.round(weaponPower(evo.from, maxLevel(evo.from)));
    const to = Math.round(weaponPower(this.elo));
    label(this, cx, y, t.elo.power(String(from), String(to)), 15, { bold: true, color: UI.gold });
    label(this, cx, top + ph - 18, t.elo.close, 12, { color: UI.muted });

    sound.play('levelUp');
    this.time.delayedCall(ARM_DELAY, () => backdrop.once('pointerup', () => this.close()));
    bindKeys(this, (kb) => {
      for (const key of ['keydown-SPACE', 'keydown-ENTER', 'keydown-ESC']) kb.once(key, () => this.close());
    });
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    (this.scene.get(SCENES.hud) as HudScene).joystick.setEnabled(true);
    this.scene.resume(SCENES.game);
    this.scene.stop();
  }
}
