import Phaser from 'phaser';
import { eloReady } from '../core/upgrades';
import { isElo } from '../core/weapons';
import type { World } from '../core/world';
import { config, type StatKey } from '../data/config';
import { PASSIVES, PASSIVE_IDS, type PassiveId } from '../data/upgrades';
import { WEAPONS } from '../data/weapons';
import { t } from '../i18n/pt-BR';
import { ART_SCALE } from './art/pen';
import { formatStatValue } from './describe';
import { UI, label } from './ui';

/** Icon badges are drawn 28 world px wide (render/art/icons.ts). */
const BADGE = 28;
const GAP = 4;
const PIP_H = 3;
/** Margin around the baked textures for frames drawn just outside a slot. */
const BLEED = 4;
let nextId = 0;

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
  /** Drawn off-screen, then baked into textures: a Graphics would re-tessellate its rounded rects every frame. */
  private readonly frames: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly framesTex: Phaser.GameObjects.Image;
  private readonly glowTex: Phaser.GameObjects.Image;
  /** Texture keys of this strip's baked layers (one strip per scene can coexist with another). */
  private readonly keys: [string, string];
  private readonly mark: Phaser.GameObjects.Graphics;
  private readonly icons: Phaser.GameObjects.Image[] = [];
  private readonly glowTween: Phaser.Tweens.Tween;
  /** Some weapon's Elo is ready (the HUD then points at elites off screen). */
  ready = false;

  constructor(
    scene: Phaser.Scene,
    /** Weapon slot side in px; passive slots are a bit smaller. */
    private size = 24,
  ) {
    this.frames = scene.make.graphics({}, false);
    this.glow = scene.make.graphics({}, false);
    const id = nextId++;
    this.keys = [`buildSlots.frames.${id}`, `buildSlots.glow.${id}`];
    this.framesTex = scene.add.image(-BLEED, -BLEED, '__DEFAULT').setOrigin(0);
    this.glowTex = scene.add.image(-BLEED, -BLEED, '__DEFAULT').setOrigin(0);
    this.mark = scene.add.graphics();
    const n = config.weapons.maxOwned + config.weapons.maxPassives;
    for (let i = 0; i < n; i++) this.icons.push(scene.add.image(0, 0, 'icon.blade').setVisible(false));
    this.container = scene.add.container(0, 0, [this.framesTex, ...this.icons, this.glowTex, this.mark]);
    this.container.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.frames.destroy();
      this.glow.destroy();
      for (const key of this.keys) if (scene.textures.exists(key)) scene.textures.remove(key);
    });
    this.glowTween = scene.tweens.add({
      targets: this.glowTex,
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
    return BuildSlots.heightFor(this.size);
  }

  static heightFor(size: number): number {
    return size + Math.round(size * 0.84) + 2 * (PIP_H + 4) + 6;
  }

  setSize(size: number): this {
    this.size = size;
    return this;
  }

  /** Redraws the slots from the world (call when `world.buildRev` changes). */
  refresh(world: World, focus: SlotFocus | null = null): void {
    const g = this.frames.clear().translateCanvas(BLEED, BLEED);
    const glow = this.glow.clear().translateCanvas(BLEED, BLEED);
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

    // Bake both layers into textures (drawn BLEED px in, so frames just outside a slot are not cut).
    const tw = this.width + BLEED * 2;
    const th = this.height + BLEED * 2;
    const [fk, gk] = this.keys;
    for (const [img, src, key] of [
      [this.framesTex, g, fk],
      [this.glowTex, glow, gk],
    ] as const) {
      if (img.scene.textures.exists(key)) img.scene.textures.remove(key);
      src.generateTexture(key, tw, th);
      img.setTexture(key);
    }
    this.ready = ready;
    if (ready) this.glowTween.resume();
    else this.glowTween.pause();
    this.glowTex.setAlpha(1);

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

/** The stat sheet's groups, in reading order. */
const GROUPS: { key: keyof typeof t.levelUp.groups; stats: StatKey[] }[] = [
  { key: 'survive', stats: ['maxHp', 'regen', 'armor', 'moveSpeed'] },
  { key: 'attack', stats: ['might', 'cooldown', 'area', 'amount'] },
  { key: 'collect', stats: ['magnet', 'growth', 'greed'] },
];

/** Each stat shows the icon of the passive that raises it (gold has no passive: its own icon). */
export const STAT_ICON = Object.fromEntries(
  PASSIVE_IDS.map((id) => [PASSIVES[id].stat, `icon.${id}`]),
) as Partial<Record<StatKey, string>>;

const ROW = 18;
const FONT = 13;

/**
 * The hero's stats in three groups (Sobreviver, Ataque, Coleta): "-" while a stat is at its base, and the focused
 * passive card's change as `now → after` in gold. `columns`: the groups side by side (phones, under the cards),
 * else stacked (desktop, beside them). Static: built once per level-up screen.
 */
export class StatSheet {
  readonly height: number;

  /** Height before building: columns (2 groups side by side, Coleta in 2 columns) or stacked. */
  static heightFor(columns: boolean): number {
    return columns ? 2 * (ROW + 2) + 4 * ROW + 6 + 2 * ROW : 3 * (ROW + 2) + 11 * ROW + 12;
  }

  private readonly values = new Map<StatKey, Phaser.GameObjects.Text>();
  private previewed: StatKey | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    private readonly world: World,
    columns: boolean,
  ) {
    // Columns (phones): Sobreviver and Ataque side by side, Coleta under them in the same two columns.
    // Stacked (desktop): one group after the other.
    const colW = columns ? w / 2 : w;
    const names = colW < 150 ? t.statsShort : t.stats;
    const row = (gx: number, gy: number, stat: StatKey) => {
      scene.add
        .image(gx + 7, gy + ROW / 2 - 1, STAT_ICON[stat] ?? 'icon.greed')
        .setScale((ART_SCALE * 15) / BADGE);
      label(scene, gx + 18, gy, names[stat], FONT, { align: 'left' });
      const right = gx + colW - (columns ? 10 : 0);
      this.values.set(stat, label(scene, right, gy, '', FONT, { bold: true }).setOrigin(1, 0));
      this.show(stat, null);
    };
    const title = (gx: number, gy: number, key: keyof typeof t.levelUp.groups) =>
      label(scene, gx, gy, t.levelUp.groups[key], FONT, { bold: true, color: UI.muted, align: 'left' });
    let bottom = y;
    GROUPS.forEach((group, gi) => {
      if (columns && gi < 2) {
        const gx = x + gi * colW;
        title(gx, y, group.key);
        group.stats.forEach((stat, k) => row(gx, y + ROW + 2 + k * ROW, stat));
        bottom = Math.max(bottom, y + ROW + 2 + group.stats.length * ROW);
      } else if (columns) {
        const gy = bottom + 6;
        title(x, gy, group.key);
        group.stats.forEach((stat, k) =>
          row(x + (k % 2) * colW, gy + ROW + 2 + Math.floor(k / 2) * ROW, stat),
        );
        bottom = gy + ROW + 2 + Math.ceil(group.stats.length / 2) * ROW;
      } else {
        const gy = bottom + (gi > 0 ? 6 : 0);
        title(x, gy, group.key);
        group.stats.forEach((stat, k) => row(x, gy + ROW + 2 + k * ROW, stat));
        bottom = gy + ROW + 2 + group.stats.length * ROW;
      }
    });
    this.height = bottom - y;
  }

  /** Shows `from → to` on one stat (the focused passive card), or nothing. */
  setPreview(p: { stat: StatKey; from: number; to: number } | null): void {
    if (this.previewed && this.previewed !== p?.stat) this.show(this.previewed, null);
    this.previewed = p?.stat ?? null;
    if (p) this.show(p.stat, p);
  }

  private show(stat: StatKey, p: { from: number; to: number } | null): void {
    const base = config.player.stats[stat];
    const text = this.values.get(stat);
    if (!text) return;
    const now = formatStatValue(stat, this.world.player.stats[stat], base);
    if (p)
      text.setText(t.levelUp.preview(formatStatValue(stat, p.from, base), formatStatValue(stat, p.to, base)));
    else text.setText(now);
    text.setColor(p ? UI.gold : now === t.levelUp.untouched ? UI.muted : UI.text);
  }
}
