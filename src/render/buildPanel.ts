import type Phaser from 'phaser';
import { eloReady } from '../core/upgrades';
import { isElo } from '../core/weapons';
import type { World } from '../core/world';
import { config } from '../data/config';
import { PASSIVES, type PassiveId } from '../data/upgrades';
import { WEAPONS } from '../data/weapons';
import { ART_SCALE } from './art/pen';
import { UI } from './ui';

/** Icon badges are drawn 28 world px wide (render/art/icons.ts). */
const BADGE = 28;
const GAP = 4;
const PIP_H = 3;

/** A slot to point at in the level-up preview: the one the focused card fills (`fresh` = a new slot). */
export interface SlotFocus {
  kind: 'weapon' | 'passive';
  index: number;
  fresh: boolean;
}

/**
 * The build as two rows of slots: weapons on top (with a pip per level), passives under them (smaller). Empty
 * slots show how many still fit; a weapon at max level gets a gold bar, a ready Elo a pulsing gold frame and a
 * formed Elo a fixed gold frame. Not interactive (it must not steal joystick touches). Draws only on `refresh`.
 */
export class BuildSlots {
  readonly container: Phaser.GameObjects.Container;
  private readonly frames: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly mark: Phaser.GameObjects.Graphics;
  private readonly icons: Phaser.GameObjects.Image[] = [];
  private readonly glowTween: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    /** Weapon slot side in px; passive slots are a bit smaller. */
    private size = 24,
  ) {
    this.frames = scene.add.graphics();
    this.glow = scene.add.graphics();
    this.mark = scene.add.graphics();
    const n = config.weapons.maxOwned + config.weapons.maxPassives;
    for (let i = 0; i < n; i++) this.icons.push(scene.add.image(0, 0, 'icon.blade').setVisible(false));
    this.container = scene.add.container(0, 0, [this.frames, ...this.icons, this.glow, this.mark]);
    this.glowTween = scene.tweens.add({
      targets: this.glow,
      alpha: { from: 1, to: 0.3 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      paused: true,
    });
    scene.tweens.add({
      targets: this.mark,
      alpha: { from: 1, to: 0.35 },
      duration: 380,
      yoyo: true,
      repeat: -1,
    });
  }

  private get small(): number {
    return Math.round(this.size * 0.84);
  }

  get width(): number {
    return Math.max(config.weapons.maxOwned, config.weapons.maxPassives) * (this.size + GAP) - GAP;
  }

  get height(): number {
    return this.size + this.small + 2 * (PIP_H + 4) + 6;
  }

  setSize(size: number): this {
    this.size = size;
    return this;
  }

  /** Redraws the slots from the world (call when `world.buildRev` changes). */
  refresh(world: World, focus: SlotFocus | null = null): void {
    const g = this.frames.clear();
    const glow = this.glow.clear();
    this.mark.clear();
    const S = this.size;
    const P = this.small;
    const pitch = S + GAP;
    let ready = false;
    let icon = 0;

    for (let i = 0; i < config.weapons.maxOwned; i++) {
      const x = i * pitch;
      const o = world.weapons[i];
      if (!o) {
        this.slot(g, x, 0, S, false, false);
        continue;
      }
      const elo = isElo(o.id);
      this.slot(g, x, 0, S, true, elo);
      this.icons[icon++]
        ?.setTexture(`icon.${o.id}`)
        .setPosition(x + S / 2, S / 2)
        .setScale((ART_SCALE * (S - 2)) / BADGE)
        .setVisible(true);
      if (!elo) this.pips(g, x, S + 2, S, o.level, WEAPONS[o.id].levels.length);
      if (eloReady(world, o.id)) {
        ready = true;
        glow.lineStyle(2.5, UI.goldHex, 1).strokeRoundedRect(x - 2, -2, S + 4, S + 4, 5);
      }
    }

    const py = S + PIP_H + 8;
    const ids = Object.keys(world.passives) as PassiveId[];
    for (let i = 0; i < config.weapons.maxPassives; i++) {
      const x = i * pitch + (S - P) / 2;
      const id = ids[i];
      this.slot(g, x, py, P, !!id, false);
      if (!id) continue;
      this.icons[icon++]
        ?.setTexture(`icon.${id}`)
        .setPosition(x + P / 2, py + P / 2)
        .setScale((ART_SCALE * (P - 2)) / BADGE)
        .setVisible(true);
      this.pips(g, x, py + P + 2, P, world.passives[id] ?? 0, PASSIVES[id].maxLevel);
    }
    for (let i = icon; i < this.icons.length; i++) this.icons[i]?.setVisible(false);

    if (ready) this.glowTween.resume();
    else this.glowTween.pause();
    glow.setAlpha(1);

    if (focus) {
      const side = focus.kind === 'weapon' ? S : P;
      const x = focus.index * pitch + (focus.kind === 'weapon' ? 0 : (S - P) / 2);
      const y = focus.kind === 'weapon' ? 0 : py;
      this.mark.lineStyle(2.5, UI.accent, 1).strokeRoundedRect(x - 2, y - 2, side + 4, side + 4, 5);
      if (focus.fresh) star(this.mark, x + side / 2, y + side / 2, side * 0.32);
    }
  }

  private slot(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
    owned: boolean,
    elo: boolean,
  ): void {
    g.fillStyle(owned ? UI.panel : UI.dim, owned ? 0.85 : 0.45).fillRoundedRect(x, y, s, s, 4);
    g.lineStyle(elo ? 2 : 1.5, elo ? UI.goldHex : owned ? UI.border : UI.borderOff, 1).strokeRoundedRect(
      x,
      y,
      s,
      s,
      4,
    );
  }

  /** One pip per level under a slot; a continuous gold bar once at max. */
  private pips(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
    level: number,
    max: number,
  ): void {
    g.fillStyle(UI.dim, 0.75).fillRect(x - 1, y - 1, s + 2, PIP_H + 2);
    if (level >= max) {
      g.fillStyle(UI.goldHex, 1).fillRect(x, y, s, PIP_H);
      return;
    }
    const w = (s - (max - 1)) / max;
    for (let k = 0; k < max; k++) {
      g.fillStyle(k < level ? UI.textHex : UI.borderOff, 1).fillRect(x + k * (w + 1), y, w, PIP_H);
    }
  }
}

/** A small gold star: the slot a new weapon or passive would take. */
function star(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(UI.goldHex, 1).beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    if (k === 0) g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    else g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath().fillPath();
}
