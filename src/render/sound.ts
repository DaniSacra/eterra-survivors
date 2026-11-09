import { settings } from './settings';
import { SOUNDS, type SoundDef, type SoundId } from './sounds';

/** At most this many sounds at once; extra plays are dropped (500 enemies must never crackle). */
const MAX_VOICES = 10;
const MASTER = 0.8;

/**
 * Plays the sounds of render/sounds.ts. The audio context starts on the first touch or key press (browsers
 * only allow audio after a user gesture); before that, and when muted, every play is silently skipped.
 */
class SoundPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = 0;
  private hooked = false;
  private readonly last: Partial<Record<SoundId, number>> = {};
  private readonly buffers = new Map<string, AudioBuffer>();

  /**
   * Hooks the unlock to user gestures. The listeners stay on: iOS suspends the context when the player switches
   * apps or locks the screen, and only a new gesture may resume it. Safe to call more than once.
   */
  init(): void {
    if (typeof window === 'undefined' || this.hooked) return;
    this.hooked = true;
    const opts = { capture: true, passive: true };
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown'])
      window.addEventListener(type, this.wake, opts);
    // Coming back to the tab: try right away (some browsers allow it without a new gesture).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx) this.wake();
    });
  }

  /** Creates or resumes the context unless it is already running. Cheap when it is. */
  private readonly wake = (): void => {
    this.ensure();
    const ctx = this.ctx;
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  };

  private ensure(): void {
    if (this.ctx) return;
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null; // no audio on this device: the game is just silent
    }
  }

  /** `pitch` multiplies the frequency (for rising gem chimes). */
  play(id: SoundId, pitch = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== 'running' || settings().muted) return;
    const def = SOUNDS[id] as SoundDef;
    const now = ctx.currentTime;
    if (def.every && now - (this.last[id] ?? -1) < def.every) return;
    if (this.voices >= MAX_VOICES) return;
    this.last[id] = now;
    if (def.kind === 'file') return this.playFile(def.url, def.vol);
    const notes = def.notes ?? NO_MELODY;
    for (let i = 0; i < notes.length; i++) {
      const k = pitch * 2 ** ((notes[i] as number) / 12);
      this.tone(def.wave, def.from * k, def.to * k, now + i * def.dur, def.dur, def.vol);
    }
  }

  private tone(wave: OscillatorType, from: number, to: number, at: number, dur: number, vol: number): void {
    const ctx = this.ctx as AudioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, at);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
    // Quick attack, soft exponential release: round, toy-like blips without clicks.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur * 1.6);
    osc.connect(gain).connect(this.master as GainNode);
    this.voices++;
    osc.onended = () => {
      this.voices--;
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(at);
    osc.stop(at + dur * 1.7);
  }

  private playFile(url: string, vol: number): void {
    const ctx = this.ctx as AudioContext;
    const buf = this.buffers.get(url);
    if (!buf) {
      void fetch(url)
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b))
        .then((d) => this.buffers.set(url, d))
        .catch(() => {});
      return;
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(gain).connect(this.master as GainNode);
    this.voices++;
    src.onended = () => {
      this.voices--;
      src.disconnect();
      gain.disconnect();
    };
    src.start();
  }
}

const NO_MELODY: readonly number[] = [0];

export const sound = new SoundPlayer();
