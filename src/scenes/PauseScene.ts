import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { UI, bindKeys, button, dim, isShort, keyNav, label, restartOnResize, safeArea } from '../render/ui';
import { optionButtons } from '../render/options';
import type { GameScene } from './GameScene';
import type { HudScene } from './HudScene';
import { buildListHeight, drawBuildList } from '../render/buildList';
import { SCENES } from './keys';

const BTN_H = 46;
const GAP = 10;
/** How long Desistir waits for the confirming press. */
const CONFIRM_MS = 2000;

/**
 * Continuar on top, the options, and Desistir last (red, asks twice), beside or under the run's build with each
 * weapon's Elo status. The HUD stays visible above it.
 */
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
    const world = (this.scene.get(SCENES.game) as GameScene).world;
    const titleSize = 32;
    if (isShort(this) && width >= 600) {
      // Phone lying down: title and buttons on the left, the build on the right.
      const colW = Math.min(300, (width - 48) / 2);
      const lx = cx - 8 - colW / 2;
      const top = Math.max(safeArea().top + 84, hud.countersBottom + 20);
      label(this, lx, top, t.pause.title, titleSize, { bold: true, color: UI.gold, stroke: true });
      keyNav(this, this.stack(lx, top + 30 + 19, colW, 38, 6));
      const ly = top - 16;
      drawBuildList(this, world, cx + 8, ly, colW, height - ly - 8);
    } else if (width >= 760) {
      // Wide: the buttons and the build side by side.
      const bw = 300;
      const lw = 360;
      const total = 2 * GAP + 5 * (BTN_H + GAP) + GAP * 2;
      const listH = buildListHeight(world, lw);
      const top = Math.max(hud.bottom + 36, height / 2 - Math.max(total, listH) / 2);
      label(this, cx, top, t.pause.title, 36, { bold: true, color: UI.gold, stroke: true });
      keyNav(this, this.stack(cx - 12 - bw / 2, top + 50 + BTN_H / 2, bw, BTN_H, GAP));
      drawBuildList(this, world, cx + 12, top + 50 - 4, lw);
    } else {
      // Standing phone: title, the build, then the buttons (smaller when room is short).
      const bw = Math.min(320, width - 32);
      const lw = Math.min(360, width - 32);
      const top = hud.bottom + 30;
      const listH = buildListHeight(world, lw);
      const room = height - safeArea().bottom - 12 - (top + 28);
      const tight = listH + 12 + 5 * (BTN_H + GAP) + GAP * 2 > room;
      const bh = tight ? 38 : BTN_H;
      const gap = tight ? 6 : GAP;
      const buttonsH = 5 * (bh + gap) + gap * 2;
      const showList = listH + 12 + buttonsH <= room;
      label(this, cx, top, t.pause.title, titleSize, { bold: true, color: UI.gold, stroke: true });
      let y = top + 28;
      if (showList) y += drawBuildList(this, world, cx - lw / 2, y, lw) + 12;
      else y = Math.max(y, height / 2 - buttonsH / 2);
      keyNav(this, this.stack(cx, y + bh / 2, bw, bh, gap));
    }

    bindKeys(this, (kb) => {
      kb.once('keydown-ESC', () => this.resume());
      kb.once('keydown-P', () => this.resume());
    });
    restartOnResize(this);
  }

  /** Continuar, the options and Desistir stacked from `y0` (centres); wider gaps set the options apart. */
  private stack(x: number, y0: number, w: number, h: number, gap: number): Phaser.GameObjects.Rectangle[] {
    return [
      button(this, x, y0, w, h, () => this.resume(), t.pause.resume),
      ...optionButtons(this, x, y0 + h + gap * 2, w, h, gap),
      this.quitButton(x, y0 + 4 * (h + gap) + gap * 2, w, h),
    ];
  }

  /** Desistir in red; the first press only arms it ("Confirmar desistir") for a moment. */
  private quitButton(x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    const b = button(this, x, y, w, h, () => this.quit(b), t.pause.quit);
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
