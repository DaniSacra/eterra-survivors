/**
 * The single sound map (like render/assets.ts for images). Today every sound is synthesized by Web Audio
 * from a small recipe; to use a recorded file, change an entry to `{ kind: 'file', url: 'sfx/foo.ogg' }`
 * (files in /public).
 */
export interface Synth {
  kind: 'synth';
  wave: OscillatorType;
  /** Start and end pitch of each note, Hz (a slide when they differ). */
  from: number;
  to: number;
  /** Seconds per note. */
  dur: number;
  vol: number;
  /** Semitone offsets for a little melody (one note each), played `dur` apart. */
  notes?: number[];
  /** Minimum seconds between two plays of this sound (frequent ones must not flood). */
  every?: number;
}
export type SoundDef = Synth | { kind: 'file'; url: string; vol: number; every?: number };

export const SOUNDS = {
  attack: { kind: 'synth', wave: 'triangle', from: 520, to: 260, dur: 0.06, vol: 0.04, every: 0.09 },
  hit: { kind: 'synth', wave: 'square', from: 300, to: 170, dur: 0.035, vol: 0.025, every: 0.05 },
  kill: { kind: 'synth', wave: 'sine', from: 650, to: 1100, dur: 0.05, vol: 0.05, every: 0.045 },
  gem: { kind: 'synth', wave: 'sine', from: 900, to: 1300, dur: 0.05, vol: 0.06, every: 0.035 },
  hurt: { kind: 'synth', wave: 'square', from: 240, to: 110, dur: 0.12, vol: 0.07, every: 0.2 },
  pickup: { kind: 'synth', wave: 'triangle', from: 600, to: 950, dur: 0.06, vol: 0.09, notes: [0, 5] },
  /** A thief rat is about to appear: a quick jingle of coins. */
  coins: {
    kind: 'synth',
    wave: 'triangle',
    from: 1320,
    to: 1320,
    dur: 0.045,
    vol: 0.09,
    notes: [0, 0, 4, 7, 12],
  },
  levelUp: {
    kind: 'synth',
    wave: 'triangle',
    from: 523,
    to: 523,
    dur: 0.07,
    vol: 0.11,
    notes: [0, 4, 7, 12],
  },
  chest: {
    kind: 'synth',
    wave: 'triangle',
    from: 660,
    to: 660,
    dur: 0.06,
    vol: 0.1,
    notes: [0, 7, 12, 16, 19],
  },
  /** An Elo forged: hammer on the anvil, three ringing blows. */
  forge: {
    kind: 'synth',
    wave: 'square',
    from: 1320,
    to: 880,
    dur: 0.09,
    vol: 0.09,
    notes: [0, 0, 7],
  },
  /** Muralha de Valmor's guard takes a hit: a bright clang. */
  ward: {
    kind: 'synth',
    wave: 'square',
    from: 1500,
    to: 1100,
    dur: 0.07,
    vol: 0.07,
    notes: [0, 12],
    every: 0.2,
  },
  /** An achievement met in the run (the HUD notice). */
  achievement: {
    kind: 'synth',
    wave: 'triangle',
    from: 880,
    to: 880,
    dur: 0.08,
    vol: 0.1,
    notes: [0, 5, 9, 12],
  },
  elite: { kind: 'synth', wave: 'sawtooth', from: 180, to: 120, dur: 0.22, vol: 0.06, notes: [0, -2] },
  boss: { kind: 'synth', wave: 'sine', from: 220, to: 200, dur: 0.45, vol: 0.16, notes: [0, -5, -12] },
  won: {
    kind: 'synth',
    wave: 'triangle',
    from: 523,
    to: 523,
    dur: 0.12,
    vol: 0.12,
    notes: [0, 4, 7, 12, 16, 19],
  },
  /** The Sineiro's Badalada: two low tolls of the bell, a beat apart. */
  bellToll: {
    kind: 'synth',
    wave: 'triangle',
    from: 196,
    to: 184,
    dur: 0.5,
    vol: 0.12,
    notes: [0, 0],
    every: 1,
  },
  /** The Dobre Fúnebre warning: one deeper, longer toll. */
  bellDirge: { kind: 'synth', wave: 'sine', from: 110, to: 98, dur: 0.7, vol: 0.16, every: 1 },
  /** ...and its blow: a thud under the ring of shock. */
  dirgeBeat: {
    kind: 'synth',
    wave: 'sine',
    from: 90,
    to: 40,
    dur: 0.22,
    vol: 0.2,
    notes: [0, 7],
    every: 0.5,
  },
  /** A skeleton collapses into bones: a short clatter falling in pitch. */
  pileFall: {
    kind: 'synth',
    wave: 'triangle',
    from: 420,
    to: 140,
    dur: 0.05,
    vol: 0.045,
    notes: [0, -4, -9],
    every: 0.09,
  },
  /** A pile stands up again: bones clicking back together, rising. */
  pileRise: {
    kind: 'synth',
    wave: 'triangle',
    from: 220,
    to: 420,
    dur: 0.05,
    vol: 0.045,
    notes: [0, 3, 7],
    every: 0.12,
  },
  /** A pile broken for good: a dry, bright crack. */
  pileBreak: {
    kind: 'synth',
    wave: 'square',
    from: 1000,
    to: 240,
    dur: 0.03,
    vol: 0.07,
    notes: [0, 5, -3],
    every: 0.05,
  },
  /** An Ossada em Brasa goes off: a low pop and a hiss. */
  emberBurst: {
    kind: 'synth',
    wave: 'sawtooth',
    from: 420,
    to: 60,
    dur: 0.14,
    vol: 0.09,
    notes: [0, -12],
    every: 0.1,
  },
  /** The Coveiro plants his shovel: a dull thud of earth. */
  dig: {
    kind: 'synth',
    wave: 'triangle',
    from: 150,
    to: 70,
    dur: 0.09,
    vol: 0.1,
    notes: [0, -3],
    every: 0.3,
  },
  denied: {
    kind: 'synth',
    wave: 'triangle',
    from: 130,
    to: 90,
    dur: 0.09,
    vol: 0.09,
    notes: [0, -2],
    every: 0.2,
  },
  lost: { kind: 'synth', wave: 'triangle', from: 392, to: 380, dur: 0.2, vol: 0.11, notes: [7, 4, 0, -5] },
} satisfies Record<string, SoundDef>;

export type SoundId = keyof typeof SOUNDS;
