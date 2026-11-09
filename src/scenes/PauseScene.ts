import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { UI, bindKeys, button, dim, isShort, keyNav, label, restartOnResize, safeArea } from '../render/ui';
import { optionButtons } from '../render/options';
import type { HudScene } from './HudScene';
import { SCENES } from './keys';

const BTN_H = 46;
const GAP = 10;
/** How long Desistir waits for the confirming press. */
const CONFIRM_MS = 2000;

/** Continuar on top, the options, and Desistir last (red, asks twice). The HUD stays visible above it. */
export class PauseScene extends Phaser.Scene {
  private confirming = false;

  constructor() {
    super(SCENES.pause);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.confirming = false;
    dim(this);
    this.scene.bringToTop(SCENES.hud);
    const hud = this.scene.get(SCENES.hud) as HudScene;
    // Phone lying down: Continuar and Desistir on the left, options on the right, the title clear of the HUD.
    if (isShort(this) && width >= 600) {
      const colW = Math.min(320, (width - 48) / 2);
      const lx = cx - 8 - colW / 2;
      const rx = cx + 8 + colW / 2;
      const top = Math.max(safeArea().top + 84, hud.countersBottom + 20);
      label(this, cx, top, t.pause.title, 32, { bold: true, color: UI.gold, stroke: true });
      const y0 = top + 36 + BTN_H / 2;
      const options = optionButtons(this, rx, y0, colW, BTN_H, GAP);
      const quit = this.quitButton(lx, y0 + 2 * (BTN_H + GAP), colW);
      const resume = button(this, lx, y0, colW, BTN_H, () => this.resume(), t.pause.resume);
      // A 2-column grid for the keys: Continuar | option, - | option, Desistir | option.
      keyNav(this, [resume, options[0] ?? null, null, options[1] ?? null, quit, options[2] ?? null], 2);
    } else {
      const bw = Math.min(320, width - 32);
      const total = 50 + 5 * (BTN_H + GAP) + GAP;
      const top = Math.max(hud.bottom + 36, height / 2 - total / 2);
      label(this, cx, top, t.pause.title, 36, { bold: true, color: UI.gold, stroke: true });
      const y0 = top + 50 + BTN_H / 2;
      // Wider gaps set Continuar and Desistir apart from the options.
      keyNav(this, [
        button(this, cx, y0, bw, BTN_H, () => this.resume(), t.pause.resume),
        ...optionButtons(this, cx, y0 + BTN_H + GAP * 2, bw, BTN_H, GAP),
        this.quitButton(cx, y0 + 4 * (BTN_H + GAP) + GAP * 2, bw),
      ]);
    }

    bindKeys(this, (kb) => {
      kb.once('keydown-ESC', () => this.resume());
      kb.once('keydown-P', () => this.resume());
    });
    restartOnResize(this);
  }

  /** Desistir in red; the first press only arms it ("Confirmar desistir") for a moment. */
  private quitButton(x: number, y: number, w: number): Phaser.GameObjects.Rectangle {
    const b = button(this, x, y, w, BTN_H, () => this.quit(b), t.pause.quit);
    (b.getData('label') as Phaser.GameObjects.Text).setColor(UI.danger);
    return b;
  }

  private resume(): void {
    this.scene.resume(SCENES.game);
    this.scene.stop();
  }

  private quit(b: Phaser.GameObjects.Rectangle): void {
    const text = b.getData('label') as Phaser.GameObjects.Text;
    if (!this.confirming) {
      this.confirming = true;
      text.setText(t.pause.quitConfirm);
      this.time.delayedCall(CONFIRM_MS, () => {
        this.confirming = false;
        text.setText(t.pause.quit);
      });
      return;
    }
    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.menu);
  }
}
