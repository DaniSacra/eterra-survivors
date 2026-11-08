import { config } from '../data/config';
import { Rng, type Vec2 } from './math';
import { createPlayer, updatePlayer, type Player } from './player';

export type WorldState = 'playing' | 'levelup' | 'won' | 'lost';

/** The whole match state. Pure logic: the render layer reads it, never writes it. */
export class World {
  time = 0;
  state: WorldState = 'playing';
  readonly rng: Rng;
  readonly player: Player = createPlayer();
  /** Visible world size (set by the renderer); spawning happens just outside it. */
  readonly view = { w: 480, h: 800 };

  constructor(seed?: number) {
    this.rng = new Rng(seed);
  }

  setView(w: number, h: number): void {
    this.view.w = w;
    this.view.h = h;
  }

  step(dt: number, input: Vec2): void {
    if (this.state !== 'playing') return;
    dt = Math.min(dt, config.maxDt);
    this.time += dt;
    updatePlayer(this.player, input, dt);
  }
}
