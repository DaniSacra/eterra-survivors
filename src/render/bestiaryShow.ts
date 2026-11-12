import Phaser from 'phaser';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { STAGES, type StageId } from '../data/stages';
import { ART_RES } from './art/pen';
import { t } from '../i18n/pt-BR';
import { ENEMY_ANIMS, poseKey, poseMs, showPoses, type EnemyAnim, type EnemyPose } from './enemyAnims';
import { showScale } from './showScale';
import { UI, label } from './ui';

/** Who hovers instead of walking. */
const FLYING = new Set<EnemyId>(['bat', 'vampireBat', 'ghost', 'coldSpirit', 'crow']);

/**
 * The Bestiário's stage: the enemy at a large size (in order of its real size, see `showScale`) on a strip of its own
 * stage's ground, standing in place. It plays each of its strips in turn (walk, attack, then its special poses and
 * its death, where it has them) with a caption naming the pose; a tap or click moves on to the next one. Only the
 * strips' own frames play: the sprite is never moved, scaled or shaken. Render only.
 */
export class Showcase {
  private root: Phaser.GameObjects.Container;
  private timer?: Phaser.Time.TimerEvent;
  private poses: EnemyPose[] = [];
  private pose = 0;
  private sprite?: Phaser.GameObjects.Sprite;
  private caption?: Phaser.GameObjects.Text;
  private count?: Phaser.GameObjects.Text;
  private id?: EnemyId;
  private calm = false;

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
    // Tapping the stage steps to the next pose.
    scene.add
      .zone(x, y, w, h)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(3)
      .on('pointerdown', () => this.next());
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
    if (!s.textures.exists('show.glow')) {
      const c = s.textures.createCanvas('show.glow', 64, 64);
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
    const footY = FLYING.has(id) ? feet - h * 0.12 : feet;
    add(s.add.ellipse(x + w / 2, feet, frameW * k * 0.55, 8 + k * 2, 0x05040f, 0.55));
    const sprite = add(
      s.add
        .sprite(x + w / 2, footY + this.feetPad(tex) * scale, tex)
        .setOrigin(0.5, 1)
        .setScale(scale),
    );
    this.sprite = sprite;
    if (!seen) {
      sprite.setTint(0x10121c);
      return;
    }
    this.id = id;
    this.calm = calm;
    this.poses = showPoses(id);
    if (this.poses.length === 0) {
      if (!calm && s.anims.exists(tex)) sprite.play(tex);
      return;
    }
    this.caption = add(
      label(s, x + 10, y + 8, '', 14, { bold: true, color: UI.gold, align: 'left', stroke: true }),
    ).setOrigin(0, 0);
    this.count = add(
      label(s, x + w - 10, y + 9, '', 13, { color: UI.muted, align: 'left', stroke: true }),
    ).setOrigin(1, 0);
    this.play(0);
  }

  /** Steps to the next pose (a tap), wrapping round. */
  private next(): void {
    if (this.poses.length > 1) this.play(this.pose + 1);
  }

  /** Puts pose `i` on the sprite and, unless calm, plays it and queues the next. */
  private play(i: number): void {
    const sprite = this.sprite;
    const id = this.id;
    if (!sprite || !id || this.poses.length === 0) return;
    this.timer?.remove(false);
    this.pose = i % this.poses.length;
    const pose = this.poses[this.pose] as EnemyPose;
    const def = ENEMIES[id];
    const anim = ENEMY_ANIMS[def.sprite] as EnemyAnim;
    const key = poseKey(def.sprite, pose);
    this.caption?.setText(t.bestiary.pose[pose]);
    this.count?.setText(`${this.pose + 1}/${this.poses.length}`);
    sprite.anims.stop();
    if (this.calm) {
      // Calm screen: nothing moves, each pose shows its middle frame until tapped.
      sprite.setTexture(key, Math.floor(((anim.frames[pose] ?? 1) - 1) / 2));
      return;
    }
    if (this.scene.anims.exists(key)) {
      const loops = pose === 'walk' || pose === 'attack';
      sprite.play({ key, repeat: loops ? -1 : 0 });
    }
    this.timer = this.scene.time.delayedCall(poseMs(anim, pose), () => this.play(this.pose + 1));
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

  private clear(): void {
    this.timer?.remove(false);
    this.timer = undefined;
    this.sprite = undefined;
    this.caption = undefined;
    this.count = undefined;
    this.id = undefined;
    this.poses = [];
    this.root.removeAll(true);
  }
}

const PADS = new Map<string, number>();
