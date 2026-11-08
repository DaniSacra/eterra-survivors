/** Global tuning. Content (weapons, enemies, waves, upgrades) lives in its own data files. */
export const config = {
  matchDuration: 600, // seconds; the boss arrives at the end
  maxDt: 1 / 20, // clamp long frames so nothing tunnels
  view: {
    /** World pixels guaranteed along the screen's shortest side; sets the camera zoom. */
    minWorldSide: 480,
  },
  player: {
    radius: 12,
    iframes: 0.5, // seconds of invulnerability after a hit
    pickupRadius: 18,
    stats: {
      maxHp: 100,
      moveSpeed: 150,
      magnet: 70,
      might: 1, // damage multiplier
      cooldown: 1, // cooldown multiplier (lower is faster)
      area: 1, // area multiplier
      regen: 0, // hp per second
    },
  },
  joystick: {
    radius: 56,
    deadZone: 0.12,
  },
} as const;

export type Stats = { -readonly [K in keyof typeof config.player.stats]: number };
export type StatKey = keyof Stats;
