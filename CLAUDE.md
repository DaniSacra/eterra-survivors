# Eterra Survivors

Survivors-like spin-off of **Crônicas de Eterra** (repo `danisacra/cronicas-de-eterra`). Playable heroes are the
original party: **Aldo** (default), Lyra, Teo and Andilla. Valmor is Aldo's village in the frozen south of Imladrin
(not a character). Stages: Arredores de Valmor (boss **Cavaleiro Negro** at 10:00), Cripta da Igreja Velha
(O Sineiro), Estrada do Sul (Lobo Velho); clearing one unlocks the next. Enemies come from the original cast.
Evolutions are called **Elos** (as in the original). World, story and characters of Eterra belong to Daniel;
check the original repo before inventing lore. Genre mechanics are fine; never clone another game's content.

Stack: Phaser 3 + TypeScript (strict) + Vite + Vitest + ESLint + Prettier. Deployed to GitHub Pages by
`.github/workflows/deploy.yml` (Vite `base` is `/eterra-survivors/`).

## Commands

- `npm run dev` — dev server · `npm test` — unit tests · `npm run lint` · `npm run typecheck` · `npm run build`
- `npm run lab` — weapon DPS table (solo and crowd, L1/Lmax/Elo) from `tests/lab/weapons.test.ts`
- `npm run sim` — 48 full runs (4 heroes x 3 stages x 4 seeds) with the bot in `tests/lab/bot.ts`; `SIM_HERO`,
  `SIM_STAGE`, `SIM_SEEDS` narrow it. Both are skipped by `npm test`; results go in `docs/balance-baseline.md`
- Every step must end with `npm test`, `npm run lint` and `npm run build` green, and the game running.

## Conventions

- Code, identifiers, comments and commit messages in **English**.
- Every player-facing string in **Portuguese (pt-BR)**, only in `src/i18n/pt-BR.ts`. Never hardcode UI text elsewhere.
- DRY and KISS: reuse first, no premature abstractions.
- Unit tests for all game logic (`tests/core/*.test.ts`).
- Small Conventional Commits (`feat:`, `fix:`, `perf:`, `test:`, `docs:`, `chore:`, `refactor:`) at the end of each step.
- Daniel prefers autonomous progress: once a plan is approved, keep going through all of it, committing **and
  pushing** as each step/phase finishes, and tell him when there is something new to test. Don't stop to ask between
  approved steps.
- The backlog lives in `docs/design/backlog.md`; mark items done there as they land.

## Architecture

- `src/core/` — pure game logic. **Must not import Phaser** (enforced by ESLint). Deterministic given a seed
  (`Rng`), 100% testable. `World.step(dt, input)` advances everything; the render layer only reads state.
- `src/data/` — data-driven content: `weapons.ts`, `evolutions.ts`, `enemies.ts`, `waves.ts` (shared curve by
  role), `stages.ts`, `characters.ts`, `upgrades.ts` (passives), `pickups.ts`, `shop.ts`, `config.ts`.
  A new weapon (of an existing `kind`) or enemy = new data entry + its name in `pt-BR.ts` + an asset key.
  A brand-new weapon behaviour = a new `kind` with one fire function in `core/weapons.ts`.
  Weapon kinds: arc, homing, aura, thrown, orbit, zone, strike. An evolution (Elo) is an evolved weapon entry
  (one level) plus an `EVOLUTIONS` entry: base at max level, passive owned, then a chest. Elites drop chests.
  Each hero's starting weapon (`characters.ts` `weapon`) is a **signature weapon**: only that hero is ever
  offered it (and so its Elo). Everything else is a shared pool; keep hero names off shared weapons.
- Meta progression (`core/meta.ts`, pure) is persisted by `render/save.ts` (localStorage, always try/catch):
  banked gold, shop levels, bought heroes, cleared stages. `World` takes a `RunSetup` (hero, stage, shop bonuses).
- `src/render/` — Phaser-side drawing. `assets.ts` is the **single asset map**: every texture is drawn from
  code in `render/art/` (cartoon vector, `Pen`); swap an entry to an image URL to use real sprites.
  The visual standard (art and layout) lives in `.claude/agents/visual-director.md`; follow it for any visual work.
  UI/UX proposals (what the player sees and when) come from the `ui-designer` agent, based on the reference
  screenshots in `docs/design/ui-references/`; the visual-director implements them.
- `src/scenes/` — Boot, Menu, Select (hero + stage), Shop, Game, Hud (overlay), LevelUp, Pause, End.
- Communication core → render: `world.events` (drained by GameScene every frame) for rare things, and
  `world.tally` (running counts of attacks, hits, kills, gems) for frequent ones; never allocate per hit.
- Sound: `render/sounds.ts` is the **single sound map** (Web Audio synth recipes today, swap an entry to a file
  URL later); `render/sound.ts` plays them (unlocked on the first gesture, voice cap). Options (mute, damage
  numbers, calm screen) live in `core/settings.ts` (pure) + `render/settings.ts` (localStorage).
- Bosses: each has one telegraphed ability (`data/enemies.ts` `ability`, logic in `core/bosses.ts`, marker in
  `render/fx.ts`).

## Performance rules (target: 500+ enemies at 60 FPS on phones)

- Never allocate in the per-frame loop (no closures/arrays/objects per entity per frame).
- All entities live in `Pool<T>` (`core/pool.ts`): dense active array, O(1) swap-remove. Kills are deferred
  (`dead` flag) and swept at the end of `step`, so indices stay valid during a step.
- No Arcade physics per entity: movement is a manual vector to the player; collisions and separation use
  `SpatialHash` (`core/spatialHash.ts`), rebuilt before and after enemy movement each step.
- XP gems merge into the nearest gem once `config.gems.maxActive` is reached.
- Render mirrors pools by index (`render/mirror.ts`), reusing display objects.
- F3 toggles the debug overlay (FPS + active entities); F4 (debug only) spawns 100 enemies for stress tests.

## Tuning and verification notes

- Balance lives in `src/data` (waves, enemies, weapons, upgrades, config); the `balance-tester` agent audits it.
- Orbit weapons test contact every frame; their `cooldown` is the re-hit delay per enemy (`Enemy.orbitReady`). Measured on 2026-11-08: core
  `World.step` costs ~0.5 ms with 700 enemies in Node; the browser held 60 FPS with 700 enemies at 4x CPU throttle.
- A naive bot (circling, light avoidance, weapons-first picks) survives ~4–5 min, so the curve probably needs
  playtesting before it feels fair to reach the boss.
- Overlays bind keys through `bindKeys()` (render/ui.ts): the key that opens an overlay is still queued that
  frame and would otherwise trigger it immediately.
- `window.game` is exposed in dev builds only, for browser automation.
