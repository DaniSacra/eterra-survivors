import type Phaser from 'phaser';

/** Shared look for menus and overlays. */
export const UI = {
  font: 'Georgia, "Times New Roman", serif',
  text: '#e8e2d0',
  textHex: 0xe8e2d0,
  muted: '#a8a090',
  accent: 0xd8a040,
  /** Titles, rewards, highlights, costs. */
  gold: '#ffd870',
  goldHex: 0xffd870,
  /** Danger, defeat, warnings. */
  danger: '#ff8090',
  dangerHex: 0xff8090,
  dangerDark: 0x8a3a48,
  /** Bars: life (hero and boss) and experience (same light blue as the gems). */
  hp: 0xd83a4a,
  xp: 0x7ae6ff,
  /** Dark outline around HUD text so it reads over any ground. */
  stroke: '#0b0d14',
  debug: '#9fffa0',
  debugBg: '#000000aa',
  panel: 0x161a26,
  panelHover: 0x232a3c,
  border: 0x4a5268,
  dim: 0x05060a,
  /** Disabled controls: opaque, darker panel with a faded border and text. */
  panelOff: 0x0f121a,
  borderOff: 0x2a2f3c,
  textOff: '#6a6658',
  /** Done / complete seal. */
  ok: 0x7cc46a,
  okText: '#9ad88a',
};

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  opts: { color?: string; bold?: boolean; wrap?: number; align?: 'left' | 'center'; stroke?: boolean } = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: UI.font,
      fontSize: `${size}px`,
      fontStyle: opts.bold ? 'bold' : 'normal',
      color: opts.color ?? UI.text,
      align: opts.align ?? 'center',
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
      stroke: opts.stroke ? UI.stroke : undefined,
      strokeThickness: opts.stroke ? Math.max(3, Math.round(size / 5)) : 0,
    })
    .setOrigin(opts.align === 'left' ? 0 : 0.5, opts.align === 'left' ? 0 : 0.5);
}

/** Clickable panel. Returns the background so callers can highlight it. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  onClick: () => void,
  text?: string,
): Phaser.GameObjects.Rectangle {
  const bg = scene.add
    .rectangle(x, y, w, h, UI.panel)
    .setStrokeStyle(2, UI.border)
    .setInteractive({ useHandCursor: true });
  // Only a press that starts on the button counts: a finger still held on the joystick when an overlay
  // opens (death, level-up) must not trigger whatever button it is lifted over.
  let armed = false;
  bg.on('pointerover', () => bg.setFillStyle(UI.panelHover));
  bg.on('pointerout', () => {
    armed = false;
    bg.setFillStyle(UI.panel);
  });
  bg.setData('action', onClick);
  bg.on('pointerdown', () => (armed = true));
  bg.on('pointerup', () => {
    if (!armed) return;
    armed = false;
    onClick();
  });
  if (text) bg.setData('label', label(scene, x, y, text, Math.min(22, h * 0.4), { bold: true }));
  return bg;
}

/** The one disabled look: opaque dark panel, faded border and text, no input (keyNav skips it). */
export function disable(bg: Phaser.GameObjects.Rectangle): Phaser.GameObjects.Rectangle {
  bg.disableInteractive().setFillStyle(UI.panelOff).setStrokeStyle(2, UI.borderOff);
  (bg.getData('label') as Phaser.GameObjects.Text | undefined)?.setColor(UI.textOff);
  return bg;
}

/** A status seal, right-aligned at `x`: `on` is the green "done" look (Loja's Completo), off a faded outline. */
export interface Seal {
  text: Phaser.GameObjects.Text;
  set(text: string, on: boolean): void;
}
export function seal(scene: Phaser.Scene, x: number, y: number, text: string, on = true, size = 12): Seal {
  const box = scene.add.rectangle(x, y, 1, 1).setOrigin(1, 0.5);
  const txt = label(scene, x - 6, y, text, size, { bold: true }).setOrigin(1, 0.5);
  const set = (s: string, isOn: boolean) => {
    txt.setText(s).setColor(isOn ? UI.okText : UI.textOff);
    box
      .setSize(txt.width + 12, txt.height + 2)
      .setFillStyle(isOn ? UI.ok : UI.panelOff, isOn ? 0.18 : 1)
      .setStrokeStyle(1, isOn ? UI.ok : UI.borderOff);
  };
  set(text, on);
  return { text: txt, set };
}

/** The small gold "something new" dot (menu button, tabs, group chips). */
export function newsDot(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Arc {
  return scene.add.circle(x, y, 5, UI.goldHex).setStrokeStyle(2, UI.dim);
}

/** Full-screen translucent backdrop that also swallows clicks. */
export function dim(scene: Phaser.Scene, alpha = 0.7): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  return scene.add.rectangle(0, 0, width, height, UI.dim, alpha).setOrigin(0).setInteractive();
}

/** Screen insets (notch, rounded corners, home bar) in CSS px, read from the #safe-area probe in index.html. */
export function safeArea(): { top: number; right: number; bottom: number; left: number } {
  try {
    const probe = document.getElementById('safe-area');
    if (!probe) throw new Error('no probe');
    const css = getComputedStyle(probe);
    return {
      top: parseFloat(css.paddingTop) || 0,
      right: parseFloat(css.paddingRight) || 0,
      bottom: parseFloat(css.paddingBottom) || 0,
      left: parseFloat(css.paddingLeft) || 0,
    };
  } catch {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
}

/** Below this height (a phone lying down) list screens use a compact header with Back in the top-left corner. */
export const SHORT_SCREEN = 520;

export const isShort = (scene: Phaser.Scene): boolean => scene.scale.height < SHORT_SCREEN;

/** A screen's Back button: centered at the bottom, or in the top-left corner on short screens. */
export function backButton(
  scene: Phaser.Scene,
  text: string,
  onClick: () => void,
): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  const left = safeArea().left;
  return isShort(scene)
    ? button(scene, left + 16 + 50, 28, 100, 40, onClick, text)
    : button(scene, width / 2, height - 34, Math.min(220, width - 60), 44, onClick, text);
}

/**
 * Columns for a grid of `n` cards of at least `rowH` px (plus `gap`) in `avail` px of height: starts at `start`
 * and adds columns (up to 3) while the rows don't fit and the cards stay at least `minW` wide.
 */
export function gridCols(
  n: number,
  width: number,
  avail: number,
  rowH: number,
  gap = 8,
  start = 1,
  minW = 180,
): number {
  let cols = start;
  while (
    cols < 3 &&
    Math.ceil(n / cols) * (rowH + gap) > avail &&
    (width - 24 - gap * cols) / (cols + 1) >= minW
  )
    cols++;
  return cols;
}

/** Static overlays simply rebuild themselves when the window resizes. */
export function restartOnResize(scene: Phaser.Scene): void {
  const handler = () => scene.scene.restart(scene.scene.settings.data);
  scene.scale.on('resize', handler);
  scene.events.once('shutdown', () => scene.scale.off('resize', handler));
}

/**
 * Binds keyboard handlers shortly after an overlay opens, so the key press that opened it
 * (still queued this frame) doesn't also trigger it.
 */
export function bindKeys(
  scene: Phaser.Scene,
  bind: (kb: Phaser.Input.Keyboard.KeyboardPlugin) => void,
): void {
  scene.time.delayedCall(100, () => bind(scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin));
}

/** Direction of a navigation key (arrows or WASD), or 0. Held keys (auto-repeat) are ignored. */
export function navStep(e: KeyboardEvent, cols = 1): number {
  if (e.repeat) return 0;
  switch (e.key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      return -cols;
    case 'arrowdown':
    case 's':
      return cols;
    case 'arrowleft':
    case 'a':
      return -1;
    case 'arrowright':
    case 'd':
      return 1;
    default:
      return 0;
  }
}

export const isConfirm = (e: KeyboardEvent): boolean => !e.repeat && (e.key === 'Enter' || e.key === ' ');

/**
 * Where the focus goes from `i` for a navigation step (±1 along the list, ±cols a row in a grid), skipping
 * disabled entries. A vertical move keeps the column when it can, else goes to the nearest enabled entry of the
 * next rows (e.g. a Back button on a row of its own), and wraps around at the ends. Pure, for tests.
 */
export function navMove(enabled: readonly boolean[], cols: number, i: number, step: number): number {
  const n = enabled.length;
  if (step === 1 || step === -1 || cols <= 1) {
    const dir = step > 0 ? 1 : -1;
    for (let k = 1; k <= n; k++) {
      const j = (((i + dir * k) % n) + n) % n;
      if (enabled[j]) return j;
    }
    return i;
  }
  const row = Math.floor(i / cols);
  if (step > 0) {
    for (let j = i + cols; j < n; j += cols) if (enabled[j]) return j;
    for (let j = (row + 1) * cols; j < n; j++) if (enabled[j]) return j;
    for (let j = i % cols; j < i; j += cols) if (enabled[j]) return j;
    for (let j = 0; j < i; j++) if (enabled[j]) return j;
  } else {
    for (let j = i - cols; j >= 0; j -= cols) if (enabled[j]) return j;
    for (let j = row * cols - 1; j >= 0; j--) if (enabled[j]) return j;
    for (let j = n - 1; j > i; j--) if (enabled[j]) return j;
  }
  return i;
}

/**
 * Where the focus goes from `i` when the buttons are laid out freely (tabs over a grid over a Back button): the
 * nearest enabled one in the direction (dx, dy), favouring the ones in line. Stays put if there is none. Pure.
 */
export function navNearest(
  points: readonly { x: number; y: number }[],
  enabled: readonly boolean[],
  i: number,
  dx: number,
  dy: number,
): number {
  const from = points[i];
  if (!from) return i;
  let best = i;
  let bestScore = Infinity;
  points.forEach((p, j) => {
    if (j === i || !enabled[j]) return;
    const along = (p.x - from.x) * dx + (p.y - from.y) * dy;
    if (along <= 1) return;
    const across = Math.abs((p.x - from.x) * dy) + Math.abs((p.y - from.y) * dx);
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = j;
    }
  });
  return best;
}

/** What a `keyNav` returns: moves the focus from code (e.g. a card was tapped). */
export interface KeyNav {
  focus(i: number): void;
}

/**
 * Keyboard navigation over `button`s laid out in a grid of `cols` columns, in reading order (`null` pads a row):
 * arrows/WASD move the focus, Enter/Space presses the focused one. Disabled buttons are skipped. The focus is
 * drawn as the hover look plus an accent border. `cols = 0` navigates by the buttons' positions instead (free
 * layouts). `onFocus` hears every focus change (with the previous index).
 */
export function keyNav(
  scene: Phaser.Scene,
  buttons: (Phaser.GameObjects.Rectangle | null)[],
  cols = 1,
  start = 0,
  onFocus?: (i: number, prev: number) => void,
): KeyNav {
  const enabled = buttons.map((b) => !!b?.input?.enabled);
  let i = enabled[start] ? start : enabled.indexOf(true);
  const show = () =>
    buttons.forEach((b, k) => {
      if (b && enabled[k])
        b.setFillStyle(k === i ? UI.panelHover : UI.panel).setStrokeStyle(
          k === i ? 3 : 2,
          k === i ? UI.accent : UI.border,
        );
    });
  const focus = (j: number) => {
    if (j === i || !enabled[j]) return;
    const prev = i;
    i = j;
    show();
    onFocus?.(i, prev);
  };
  if (i < 0) return { focus: () => {} };
  show();
  const points = cols === 0 ? buttons.map((b) => ({ x: b?.x ?? 0, y: b?.y ?? 0 })) : [];
  bindKeys(scene, (kb) =>
    kb.on('keydown', (e: KeyboardEvent) => {
      if (cols === 0) {
        const s = navStep(e, 2);
        if (s !== 0) {
          const horizontal = s === 1 || s === -1;
          focus(navNearest(points, enabled, i, horizontal ? s : 0, horizontal ? 0 : Math.sign(s)));
          return;
        }
      } else {
        const step = navStep(e, cols);
        if (step !== 0) return focus(navMove(enabled, cols, i, step));
      }
      if (isConfirm(e)) (buttons[i]?.getData('action') as () => void)();
    }),
  );
  return { focus };
}
