import Phaser from 'phaser';
import { enemyTraits } from '../core/format';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { STAGES, type StageId } from '../data/stages';
import { ART_RES } from './art/pen';
import { ENEMY_ANIMS, poseKey } from './enemyAnims';
import { showScale } from './showScale';
import { UI } from './ui';

/** What an enemy shows off in the Bestiário: one of its tricks, drawn with a small effect. */
export type ShowMove =
  | 'swing'
  | 'charge'
  | 'zigzag'
  | 'shoot'
  | 'leap'
  | 'burst'
  | 'collapse'
  | 'phase'
  | 'rally'
  | 'spawn'
  | 'flee'
  | 'cleave'
  | 'toll'
  | 'frost'
  | 'web'
  | 'dig';

/** Elites and bosses show their own tricks in turn; the crowd shows the one its way of fighting implies. */
const OWN_MOVES: Partial<Record<EnemyId, ShowMove[]>> = {
  golem: ['leap'],
  witch: ['shoot'],
  gravedigger: ['dig'],
  bellRinger: ['toll'],
  oldWolf: ['charge', 'frost'],
  spiderMother: ['charge', 'web', 'spawn'],
  blackKnight: ['cleave'],
  frostWolf: ['charge'],
};

const BY_WAY: Record<string, ShowMove> = {
  charge: 'charge',
  zigzag: 'zigzag',
  phase: 'phase',
  shoot: 'shoot',
  leap: 'leap',
  pack: 'charge',
  banner: 'rally',
  nest: 'spawn',
  flee: 'flee',
  reassemble: 'collapse',
  burst: 'burst',
};

/** The moves an enemy shows, in turn (pure: tested). */
export function showMoves(id: EnemyId): ShowMove[] {
  const own = OWN_MOVES[id];
  if (own) return own;
  const way = enemyTraits(ENEMIES[id]).way;
  return [(way && BY_WAY[way]) || 'swing'];
}

/** Effect colours, per enemy where it has one (fire, frost, venom), else a pale white. */
const TINT: Partial<Record<EnemyId, number>> = {
  coldSpirit: 0x9fe0ff,
  oldWolf: 0x9fe0ff,
  frostBoar: 0x9fe0ff,
  frostWolf: 0x9fe0ff,
  emberBones: 0xff8a3a,
  witch: 0x8ae06a,
  slime: 0x8ae06a,
  spiderMother: 0xb070ff,
  bellRinger: UI.goldHex,
  blackKnight: 0xff4060,
  warBanner: 0x7cc46a,
  goblin: 0xd8b070,
};

/** Who hovers instead of walking. */
const FLYING = new Set<EnemyId>(['bat', 'vampireBat', 'ghost', 'coldSpirit', 'crow']);

/**
 * The Bestiário's stage: the enemy at a large size (in order of its real size, see `showScale`) on a strip of its own
 * stage's ground, standing in place: its walk cycle loops and, every few seconds, it winds up and shows one of its
 * tricks. Render only.
 */
export class Showcase {
  private root: Phaser.GameObjects.Container;
  private timers: Phaser.Time.TimerEvent[] = [];
  private moveIndex = 0;

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: number,
    private w: number,
    private h: number,
  ) {
    this.root = scene.add.container(0, 0);
    const shape = scene.make.graphics({}, false).fillStyle(0xffffff).fillRect(x, y, w, h);
    this.root.setMask(shape.createGeometryMask());
    scene.add.rectangle(x, y, w, h).setOrigin(0).setStrokeStyle(2, UI.border).setDepth(2);
    if (!scene.textures.exists('show.glow')) {
      const c = scene.textures.createCanvas('show.glow', 64, 64);
      const ctx = c?.getContext();
      if (c && ctx) {
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        c.refresh();
      }
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clear());
  }

  /** Shows `id` on its stage's ground; `seen` false shows only a dark silhouette standing still. */
  show(id: EnemyId, stage: StageId, seen = true, calm = false): void {
    this.clear();
    const s = this.scene;
    const { x, y, w, h } = this;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (this.keep(o), o);
    // The ground, darker towards the top (the sky of the stage), and a pool of light where the enemy walks.
    add(s.add.rectangle(x, y, w, h, 0x0b0d18).setOrigin(0));
    const floorY = y + h * 0.3;
    add(
      s.add
        .tileSprite(x, floorY, w, h - (floorY - y), STAGES[stage].tile)
        .setOrigin(0)
        .setTileScale(0.5)
        .setAlpha(0.85),
    );
    // A fog from the top fading into the ground, so the enemy stands in a pool of its own stage.
    for (let i = 0; i < 12; i++)
      add(s.add.rectangle(x, floorY + i * 6, w, 6, 0x0b0d18, 0.85 - i * 0.07).setOrigin(0));
    const feet = y + h * 0.84;
    add(
      s.add
        .image(x + w / 2, feet, 'show.glow')
        .setDisplaySize(w * 0.9, h * 0.5)
        .setTint(seen ? 0xffe0a0 : 0x8090c0)
        .setAlpha(seen ? 0.22 : 0.32),
    );

    // The enemy at a whole number of art pixels per art pixel: as large as the box allows.
    const def = ENEMIES[id];
    const anim = ENEMY_ANIMS[def.sprite];
    const tex = anim ? poseKey(def.sprite, 'walk') : def.sprite;
    if (!s.textures.exists(tex)) return;
    const frameH = (anim ? anim.h : s.textures.getFrame(tex).height) / ART_RES;
    const frameW = (anim ? anim.w : s.textures.getFrame(tex).width) / ART_RES;
    const k = showScale(frameW, frameH, w, h);
    const scale = k / ART_RES;
    const fly = FLYING.has(id);
    const footY = fly ? feet - h * 0.12 : feet;
    add(s.add.ellipse(x + w / 2, feet, frameW * k * 0.55, 8 + k * 2, 0x05040f, 0.55));
    const sprite = add(
      s.add
        .sprite(x + w / 2, footY + this.feetPad(tex) * scale, tex)
        .setOrigin(0.5, 1)
        .setScale(scale),
    );
    if (!seen) {
      sprite.setTint(0x10121c);
      return;
    }
    if (calm) return;
    if (s.anims.exists(tex)) sprite.play(tex);
    if (fly)
      s.tweens.add({
        targets: sprite,
        y: sprite.y - 6 * k,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

    // In place: the walk cycle loops on the spot and, every couple of seconds, the enemy winds up and shows a trick
    // (its attack frames and a small effect), without crossing the box.
    const moves = showMoves(id);
    const loop = () => {
      if (!sprite.active) return;
      if (s.anims.exists(tex)) sprite.play(tex, true);
      const move = moves[this.moveIndex++ % moves.length] as ShowMove;
      this.after(this.trick(sprite, id, move, k, footY) + 900, loop);
    };
    this.after(700, loop);
  }

  /** Winds up (its own frames when it has them) and plays `move`; returns how long it takes, in ms. */
  private trick(
    sprite: Phaser.GameObjects.Sprite,
    id: EnemyId,
    move: ShowMove,
    k: number,
    footY: number,
  ): number {
    const s = this.scene;
    const def = ENEMIES[id];
    const anim = ENEMY_ANIMS[def.sprite];
    const windKey = poseKey(def.sprite, 'windup');
    // The blow of its act, else the bite or swing it makes when it reaches the hero.
    const strikeKey = poseKey(def.sprite, anim?.frames.strike ? 'strike' : 'attack');
    const hasWind = !!anim?.frames.windup && s.anims.exists(windKey);
    let wind = 450;
    if (hasWind) {
      sprite.play({ key: windKey, repeat: 0 });
      wind = ((anim?.frames.windup ?? 6) / (anim?.fps.windup ?? 8)) * 1000;
    }
    this.after(wind, () => {
      if (!sprite.active) return;
      if ((anim?.frames.strike || anim?.frames.attack) && s.anims.exists(strikeKey))
        sprite.play({ key: strikeKey, repeat: 0 });
      else sprite.anims.resume();
      this.move(sprite, id, move, k, footY);
    });
    return wind + 1100;
  }

  private move(
    sprite: Phaser.GameObjects.Sprite,
    id: EnemyId,
    move: ShowMove,
    k: number,
    footY: number,
  ): void {
    const s = this.scene;
    const tint = TINT[id] ?? 0xf0ecff;
    const dir = sprite.flipX ? -1 : 1;
    const front = sprite.x + dir * sprite.displayWidth * 0.4;
    const mid = sprite.y - sprite.displayHeight * 0.45;
    const reach = Math.min(this.w * 0.3, 60 * k);
    const ring = (rx: number, ry: number, color: number, size: number, delay = 0, flat = true) => {
      const r = this.keep(
        s.add
          .ellipse(rx, ry, 10, flat ? 4 : 10)
          .setStrokeStyle(Math.max(2, k), color, 1)
          .setFillStyle(color, 0.12),
      );
      r.setAlpha(0);
      s.tweens.add({
        targets: r,
        width: size,
        height: flat ? size * 0.35 : size,
        alpha: { from: 1, to: 0 },
        delay,
        duration: 700,
        ease: 'Quad.easeOut',
        onComplete: () => r.destroy(),
      });
    };
    // The sprite itself never moves, scales or shakes here (only its own frames play): a lunge is just dust behind it.
    const dash = () => {
      for (let i = 0; i < 3; i++) ring(sprite.x - dir * i * 10, footY, 0xd8d0c0, 18 + i * 6, i * 60);
    };
    switch (move) {
      case 'swing':
      case 'cleave': {
        const big = move === 'cleave';
        const g = this.keep(s.add.graphics());
        const r = big ? reach * 1.1 : reach * 0.55;
        g.lineStyle(big ? 6 : 3, big ? tint : 0xffffff, 0.95);
        g.beginPath();
        g.arc(front - dir * r * 0.3, mid, r, dir > 0 ? -1.1 : Math.PI - 1.1, dir > 0 ? 1.1 : Math.PI + 1.1);
        g.strokePath();
        s.tweens.add({ targets: g, alpha: 0, duration: 380, onComplete: () => g.destroy() });
        if (!big) dash();
        break;
      }
      case 'charge':
        dash();
        break;
      case 'flee':
        dash();
        break;
      case 'zigzag':
        dash();
        break;
      case 'shoot': {
        const p = this.keep(
          s.add
            .image(front, mid, 'show.glow')
            .setDisplaySize(10 * k, 10 * k)
            .setTint(tint),
        );
        const to = front + dir * Math.min(this.w * 0.55, 140 * k);
        s.tweens.add({
          targets: p,
          x: to,
          y: footY - 4,
          duration: 520,
          ease: 'Quad.easeIn',
          onComplete: () => {
            ring(p.x, footY, tint, 30 * k);
            p.destroy();
          },
        });
        break;
      }
      case 'leap': {
        ring(sprite.x, footY, 0x05040f, 40 * k);
        ring(sprite.x, footY, tint === 0xf0ecff ? 0xd8c8a0 : tint, 70 * k, 260);
        break;
      }
      case 'burst':
        ring(sprite.x, mid, tint, 60 * k, 0, false);
        ring(sprite.x, mid, 0xffe080, 40 * k, 120, false);
        break;
      case 'collapse':
        ring(sprite.x, footY, 0xd8d0c0, 40 * k);
        break;
      case 'phase':
        dash();
        break;
      case 'rally':
      case 'toll':
      case 'frost':
      case 'web':
        for (let i = 0; i < 3; i++)
          ring(
            sprite.x,
            move === 'toll' ? mid : footY,
            move === 'web' ? 0xf0f0f0 : tint,
            (50 + i * 30) * k,
            i * 160,
            move !== 'toll',
          );
        break;
      case 'spawn':
        for (let i = 0; i < 3; i++) {
          const key = ENEMY_ANIMS['enemy.spider'] ? poseKey('enemy.spider', 'walk') : 'enemy.spider';
          if (!s.textures.exists(key)) break;
          const baby = this.keep(
            s.add
              .sprite(sprite.x, footY, key)
              .setOrigin(0.5, 1)
              .setScale(Math.max(1, Math.floor(k / 2)) / ART_RES),
          );
          if (s.anims.exists(key)) baby.play(key);
          const to = sprite.x + (i - 1) * reach * 0.9 + dir * 20;
          baby.setFlipX(to < sprite.x);
          s.tweens.add({
            targets: baby,
            x: to,
            y: footY + (i - 1) * 6,
            alpha: { from: 1, to: 0 },
            duration: 1200,
            onComplete: () => baby.destroy(),
          });
        }
        break;
      case 'dig':
        for (let i = 0; i < 3; i++) {
          const hx = sprite.x + (i - 1) * reach * 0.8 + dir * 16;
          const hole = this.keep(s.add.ellipse(hx, footY + 4, 1, 1, 0x05040f, 0.9));
          s.tweens.add({
            targets: hole,
            width: 26 * k * 0.6,
            height: 8 * k * 0.6,
            delay: i * 140,
            duration: 220,
            yoyo: true,
            hold: 500,
            onComplete: () => hole.destroy(),
          });
        }
        break;
    }
  }

  /** Transparent rows under the first frame's feet, in texture px (cached per key). */
  private feetPad(key: string): number {
    const hit = PADS.get(key);
    if (hit !== undefined) return hit;
    const frame = this.scene.textures.getFrame(key, 0) ?? this.scene.textures.getFrame(key);
    let pad = 0;
    const canvas = document.createElement('canvas');
    canvas.width = frame.cutWidth;
    canvas.height = frame.cutHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        frame.source.image as CanvasImageSource,
        frame.cutX,
        frame.cutY,
        frame.cutWidth,
        frame.cutHeight,
        0,
        0,
        frame.cutWidth,
        frame.cutHeight,
      );
      const data = ctx.getImageData(0, 0, frame.cutWidth, frame.cutHeight).data;
      let row = frame.cutHeight - 1;
      const opaque = (r: number) => {
        for (let c = 0; c < frame.cutWidth; c++)
          if ((data[(r * frame.cutWidth + c) * 4 + 3] ?? 0) > 20) return true;
        return false;
      };
      while (row > 0 && !opaque(row)) row--;
      pad = frame.cutHeight - 1 - row;
    }
    PADS.set(key, pad);
    return pad;
  }

  /** Adds `o` to the masked stage and gives it back. */
  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.root.add(o);
    return o;
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(this.scene.time.delayedCall(ms, fn));
  }

  private clear(): void {
    for (const t of this.timers) t.remove(false);
    this.timers = [];
    for (const o of this.root.list) this.scene.tweens.killTweensOf(o);
    this.root.removeAll(true);
    this.moveIndex = 0;
  }
}

const PADS = new Map<string, number>();
