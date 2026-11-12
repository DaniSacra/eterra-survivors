import Phaser from 'phaser';
import { isElo } from '../core/weapons';
import type { World } from '../core/world';
import { config, type StatKey } from '../data/config';
import { PASSIVES, PASSIVE_IDS, type PassiveId } from '../data/upgrades';
import { WEAPONS, type WeaponId } from '../data/weapons';
import { EVOLUTIONS, type ElementId, type Evolution } from '../data/evolutions';
import { t } from '../i18n/pt-BR';
import { fitIcon } from './assets';
import { formatStatValue } from './describe';
import { ovalRing } from './shapes';
import { ELEMENT_COLOR, UI, label } from './ui';

const GAP = 4;
const PIP_H = 4;
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
 * slots show how many still fit; a weapon at max level gets a gold bar and a formed Elo a frame in its
 * element's colour, chained to its passive. Not interactive (it must not steal joystick touches). Draws only on `refresh`.
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
  /** Empty slots show how many still fit (the level-up preview); the HUD shows only the filled ones. */
  showEmpty = true;
  /** The little particles running along the Elo chains (rebuilt on refresh). */
  private bits: Phaser.GameObjects.Shape[] = [];
  private readonly scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    /** Weapon slot side in px; passive slots are a bit smaller. */
    private size = 24,
  ) {
    this.scene = scene;
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
      this.clearBits();
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
        if (this.showEmpty) this.slot(g, x, 0, S, false, false);
        continue;
      }
      const elo = isElo(o.id);
      this.slot(g, x, 0, S, true, elo);
      const wi = this.icons[icon++];
      if (wi)
        fitIcon(wi, `icon.${o.id}`, S - 2)
          .setPosition(x + S / 2, S / 2)
          .setVisible(true);
      if (!elo) this.pips(g, x, S + 2, S, o.level, WEAPONS[o.id].levels.length);
      const evo = EVOLUTIONS[o.id];
      if (evo) {
        ready = true;
        glow.lineStyle(2.5, ELEMENT_COLOR[evo.element], 1).strokeRoundedRect(x - 2, -2, S + 4, S + 4, 5);
      }
    }

    const py = S + PIP_H + 8;
    const ids = Object.keys(world.passives) as PassiveId[];
    for (let i = 0; i < config.weapons.maxPassives; i++) {
      const x = i * pitch + (S - P) / 2;
      const id = ids[i];
      if (!id) {
        if (this.showEmpty) this.slot(g, x, py, P, false, false);
        continue;
      }
      this.slot(g, x, py, P, true, false);
      const pi = this.icons[icon++];
      if (pi)
        fitIcon(pi, `icon.${id}`, P - 2)
          .setPosition(x + P / 2, py + P / 2)
          .setVisible(true);
      this.pips(g, x, py + P + 2, P, world.passives[id] ?? 0, PASSIVES[id].maxLevel);
    }
    for (let i = icon; i < this.icons.length; i++) this.icons[i]?.setVisible(false);

    // Each formed Elo is chained to its recipe passive: a braided chain in its element's colour, glowing softly.
    this.clearBits();
    world.weapons.forEach((o, i) => {
      const evo = EVOLUTIONS[o.id];
      const j = evo ? ids.indexOf(evo.passive) : -1;
      if (!evo || j < 0) return;
      ready = true;
      const ax = i * pitch + S / 2;
      const bx = j * pitch + S / 2;
      const color = ELEMENT_COLOR[evo.element];
      chain(g, ax, S, bx, py, color, 1.6);
      chain(glow, ax, S, bx, py, color, 3.4);
      this.chainBits(ax, S, bx, py, evo.element);
    });

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

  /**
   * The forge moment in the strip: the Elo's icon and its passive's lean toward each other and back while a
   * flash in the element's colour marks the chain being made (the chain itself is drawn by `refresh`).
   */
  forge(world: World, elo: WeaponId): void {
    this.refresh(world);
    const evo = EVOLUTIONS[elo] as Evolution;
    const i = world.weapons.findIndex((o) => o.id === elo);
    const j = (Object.keys(world.passives) as PassiveId[]).indexOf(evo.passive);
    if (i < 0 || j < 0) return;
    const S = this.size;
    const P = this.small;
    const pitch = S + GAP;
    const a = { x: i * pitch + S / 2, y: S / 2 };
    const b = { x: j * pitch + S / 2, y: S + PIP_H + 8 + P / 2 };
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const color = ELEMENT_COLOR[evo.element];
    for (const [pos, key, side] of [
      [a, `icon.${elo}`, S],
      [b, `icon.${evo.passive}`, P],
    ] as const) {
      const img = fitIcon(this.scene.add.image(pos.x, pos.y, key), key, side - 2);
      this.container.add(img);
      this.scene.tweens.add({
        targets: img,
        x: pos.x + (mid.x - pos.x) * 0.45,
        y: pos.y + (mid.y - pos.y) * 0.45,
        scale: img.scale * 1.3,
        duration: 260,
        yoyo: true,
        ease: 'Sine.easeInOut',
        onComplete: () => img.destroy(),
      });
    }
    const flash = this.scene.add.circle(mid.x, mid.y, S * 0.4, color, 0.9);
    this.container.add(flash);
    this.scene.tweens.add({
      targets: flash,
      scale: 2.4,
      alpha: 0,
      delay: 200,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  /** Two particles of the element running down a chain, over and over (flames, crystals, sparks, glints). */
  private chainBits(ax: number, ay: number, bx: number, by: number, element: ElementId): void {
    const color = ELEMENT_COLOR[element];
    const r = Math.max(2, this.size * 0.11);
    for (let k = 0; k < 2; k++) {
      const bit = bitShape(this.scene, element, r, color).setPosition(ax, ay).setAlpha(0);
      this.container.add(bit);
      this.bits.push(bit);
      this.scene.tweens.add({
        targets: bit,
        x: bx,
        y: by,
        angle: element === 'ice' || element === 'steel' ? 45 : 0,
        duration: 1400,
        delay: k * 700,
        repeat: -1,
        onUpdate: (tw) => bit.setAlpha(Math.sin(tw.progress * Math.PI) * 0.95),
      });
    }
  }

  private clearBits(): void {
    for (const bit of this.bits) {
      this.scene.tweens.killTweensOf(bit);
      bit.destroy();
    }
    this.bits = [];
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

/** Below this length (px) a chain is drawn as two links instead of a braid. */
const SHORT_CHAIN = 14;

/**
 * A braided chain from (ax, ay) to (bx, by): two strands crossing each other every few px, over a dark outline so
 * it reads on any ground. `width` is the strand's (the glow layer draws it thicker).
 */
export function chain(
  g: Phaser.GameObjects.Graphics,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  color: number,
  width: number,
): void {
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 1) return;
  if (len < SHORT_CHAIN) {
    // Too short to braid (it read as an "8", NA-03): two links, one along the gap and one lying across it.
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    for (const [w, c] of [
      [width + 1.6, UI.dim],
      [width, color],
    ] as const) {
      g.lineStyle(w, c, 1);
      ovalRing(g, mx, my, 5, len + 3);
      ovalRing(g, mx, my, 11, 4.5);
    }
    return;
  }
  const nx = -(by - ay) / len;
  const ny = (bx - ax) / len;
  const steps = Math.max(6, Math.round(len / 2));
  const crossings = Math.max(2, Math.round(len / 7));
  const amp = 2.2;
  for (const [w, c] of [
    [width + 1.6, UI.dim],
    [width, color],
  ] as const) {
    for (const side of [1, -1]) {
      g.lineStyle(w, c, 1).beginPath();
      for (let k = 0; k <= steps; k++) {
        const f = k / steps;
        const o = side * amp * Math.sin(f * crossings * Math.PI);
        const x = ax + (bx - ax) * f + nx * o;
        const y = ay + (by - ay) * f + ny * o;
        if (k === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    }
  }
}

/** The particle each element sends down its chain. */
function bitShape(
  scene: Phaser.Scene,
  element: ElementId,
  r: number,
  color: number,
): Phaser.GameObjects.Shape {
  switch (element) {
    case 'fury':
    case 'fire':
    case 'forge':
      return scene.add.triangle(0, 0, 0, r * 1.6, r, 0, r * 2, r * 1.6, color); // a flame
    case 'ice':
    case 'steel':
      return scene.add.rectangle(0, 0, r * 1.5, r * 1.5, color); // a crystal (turned 45 degrees)
    case 'storm':
    case 'arcane':
      return scene.add.star(0, 0, 4, r * 0.45, r * 1.4, color); // a spark
    case 'earth':
      return scene.add.rectangle(0, 0, r * 1.4, r, color); // a pebble
    default:
      return scene.add.circle(0, 0, r, color); // holy glint, soul light, shadow drop
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
      const key = STAT_ICON[stat] ?? 'icon.greed';
      fitIcon(scene.add.image(gx + 7, gy + ROW / 2 - 1, key), key, 15);
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
