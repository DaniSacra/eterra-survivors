# Eterra Survivors

Survivors-like spin-off of **Crônicas de Eterra** (repo `danisacra/cronicas-de-eterra`). Playable heroes are the
original party: **Aldo** (default), Lyra, Teo and Andilla. Valmor is a village in the frozen south of Imladrin
(not a character); Aldo was born in Hyarmeth and comes back to Valmor for work (and for Clara). Stages follow the
original story: Arredores de Valmor, the graveyard (Ossadas, grey bats, Ratos de Cova; boss **Cavaleiro Negro** at
10:00), Cripta da Igreja Velha (Rato Gigante, Gosma Verde; boss O Sineiro, whose bell wakes the dead), Estrada do
Sul (Lobos da Geada, Corvos; boss Lobo Velho); clearing one unlocks the next. Enemies come from the original cast.
Weapon evolutions are called **Elos**; in the original an Elo is something else (two heroes combining skills in
the same round, e.g. Espada de Fogo = Aldo + Lyra), so the name is borrowed, not the mechanic.
World, story and characters of Eterra belong to Daniel. **The lore lives only in the local original repo**,
`/home/dani/games/dungeon-rpg/docs/mundo/` (`canone.md` first, then `historias/prologo.md`,
`historias/capitulo1-parte1.md`, `pendencias.md`); the GitHub copy has only code. Read it before writing any
player-facing text with lore, and never invent lore: ask Daniel. Genre mechanics are fine; never clone another
game's content.

Stack: Phaser 3 + TypeScript (strict) + Vite + Vitest + ESLint + Prettier. Deployed to GitHub Pages by
`.github/workflows/deploy.yml` (Vite `base` is `/eterra-survivors/`).

## Commands

- `npm run dev` — dev server · `npm test` — unit tests · `npm run lint` · `npm run typecheck` · `npm run build`
- `npm run lab` — weapon DPS table (solo and crowd, L1/Lmax/Elo) from `tests/lab/weapons.test.ts`
- `npm run sim` — full runs (4 heroes x 3 stages x 8 seeds) with the bot in `tests/lab/bot.ts`; `SIM_HERO`,
  `SIM_STAGE`, `SIM_SEEDS` narrow it; `SIM_SHOP=none|half|full|all` picks the Loja profile (`all` = the three,
  for the `TARGETS` table: wins and median death per stage x profile, gold per run, heroes more than 20 points off
  the stage marked `!`), `SIM_RUNS=1` prints each run, `SIM_VIGIL=1` goes on into the Noite Sem Fim. The `LOJA`
  line gives the whole Loja in average runs (goal 40–60). It prints real DPS **per level** (`levelDps`: only while at that level), each Elo against its base at max
  level in the same runs (`ELO X`, goal >= 2.5x) and the level where the card pool runs short (`POOL`). Both are
  skipped by `npm test`; results go in `docs/balance-baseline.md`
- Every step must end with `npm test`, `npm run lint` and `npm run build` green, and the game running.
- Installable on phones (PWA): `public/manifest.webmanifest`, icons and `public/sw.js` (network first, offline
  fallback), registered in `main.ts` in production builds only.

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
  Weapon kinds: arc, homing, aura, thrown, orbit, zone, strike, slam. Arc weapons swing around the hero; thrown weapons can fly where the hero faces (`aim: 'facing'`), burst on the
  first hit (`blast`) or crit (`crit`); slam weapons (Maça de Ferro, Quebra-Junta) land a heavy blow in front that
  stuns (bosses only `config.weapons.bossStun`; a stun running is never renewed, and it does not stop a boss's ability),
  and every `waveEvery` blows a shock wave that throws enemies back (waves hit and push, only the blow stuns).
  Weapons never shake the screen (only hurting the hero, bombs, bosses and the forge moment do). Knockback decays
  at `config.enemies.knockbackDecay` per second, so a push travels about knockback / 10 px: a weapon that "pushes"
  needs hundreds (the shields use 600).
  Every weapon has a **category** (`aimed` / `auto` / `area`, an Elo inherits its base's) and must sit in its band
  of crowd DPS at max level, relative to the best `aimed` weapon (`CATEGORY_BANDS` in `data/weapons.ts`: aimed
  85–100%, auto 50–65%, area 40–55%; Elos against the best aimed Elo). `tests/core/bands.test.ts` enforces it and
  `npm run lab` shows it.
  An evolution (Elo) is an evolved weapon entry (one level) plus an `EVOLUTIONS` entry. It forms on the spot
  (`forgeElos`, `eloForged` event) when the base weapon and its recipe passive are both at max level; level-up
  cards that move an owned recipe are `config.xp.recipeWeight` times likelier and show its progress
  ("Elo Fúria: arma 6/7 · Força 5/5"); the pause lists each weapon's `eloStatus`. Each Elo has an `element`
  (`ELEMENTS`) whose colour (`ELEMENT_COLOR` in `render/ui.ts`, one each) tints its effects and projectiles. The
  forge moment (`GameScene.forgeMoment`): 0.5 s of slow motion, the `forge` sound, element sparks, the HUD notice
  and a braided chain between the Elo and its passive in the build strip (`BuildSlots`), kept all run.
  Each Elo has its own verb, as optional data on its `WeaponDef`: Fúria `wave`, Estrela de Lyra `split` (stars that
  fall and burst again, `fuse` projectiles), Quebra-Junta `waveEvery: 1` / `aftershock` / `crush`, Leque de Facas
  `ricochet` / `bleed`, Luz Sagrada `mend`, Chama de Yah `pulse`, Vigília `dart` (`bladeRadius`, shared with the
  renderer), Nevasca `shatter` (queued, burst in `updateShatters`), Tempestade `chain`, Fúria da Forja
  `boomerang`, Procissão `swell`, Muralha de Valmor `ward` (`hurtHero`) and Espada de Fogo `ground` (burning
  zones). Kill and hit hooks live in `core/elos.ts`; damage over time (bleed, burn) is `applyDot` in
  `core/enemies.ts`. The lab's dummies are immortal and ignore knockback, so effects that hang on kills, travel or
  pushes must also be checked in `npm run sim` (`REAL DPS`). The first forge of each Elo banks
  `ELO_DISCOVERY_GOLD`; the Livro de Elos (Coleção → Elos) opens a page per discovered Elo. Elites drop chests: gold, a
  level of something owned and a heal (`CHEST` in `data/pickups.ts`).
  When weapons and passives run short, `data/rewards.ts` cards (Bolsa de Ouro, Banquete, Bênção de Yah) keep the
  level-up at 3 cards; `canBanish` never lets Banir leave fewer.
  Each hero's starting weapon (`characters.ts` `weapon`) is only where they start: every weapon and Elo is offered
  to every hero.
- Stages (`data/stages.ts`) have a `layout` and a `mult`. Layouts (`core/terrain.ts`, pure, no storage): `open`
  (Valmor), `obstacles` (Cripta: one obstacle per cell by a hash of the run seed, clear around the start; they block
  hero and enemies, not shots) and `corridor` (Estrada do Sul: a road between forests, enemies come from both ends
  and some out of the sides). `mult` scales enemy HP, contact and ability damage, speed, spawn density and gold;
  the Noite Sem Fim inherits it. The shared wave curve (`data/waves.ts`) also ramps contact damage per segment
  (`damage`, applied through `world.enemyDamage`).
- Meta progression (`core/meta.ts`, pure) is persisted by `render/save.ts` (localStorage, always try/catch):
  banked gold, shop levels, bought heroes, cleared stages. `World` takes a `RunSetup` (hero, stage, shop bonuses).
  The Loja buys in two steps (`ShopCart`: select, then `confirmPurchase`), in sections (`SHOP_SECTIONS`); items
  raise a stat, add level-up charges or, Segunda Chance, a revive (`RunBonuses.revives`, `config.revive`).
  Bot targets per stage x Loja profile (none / half / full wins): Valmor 0–15% (death at 6–8 min) / 40–60% / 85%+,
  Cripta 0–10% / 55–65% / 90%+ (Daniel, 2026-11-11: with half the Loja you should win about 60%), Estrada 0% / 0–10% / 35–55%. Tune stage `mult` and waves first, then weapons.
- **Noite Sem Fim**: after a victory the end screen offers "Continuar a vigília" (`world.continueVigil()`); the
  spawner then grows the stage's last full wave (`config.vigil`: HP, contact damage, batch, an elite a minute).
  The victory is banked when the boss falls; `recordVigil` adds only what the vigil brought, and each hero keeps
  the longest vigil per stage (`HeroRecord.vigil`, Heróis tab, achievement `vigil5`).
- `src/render/` — Phaser-side drawing. `assets.ts` is the **single asset map**: every texture is drawn from
  code in `render/art/` (`Pen`, placeholder until real sprites); swap an entry to an image URL to use real sprites.
  Art direction since 2026-11-10: dark, lit fantasy (darkness layer, lights, detailed tiles and props, sprites).
  The visual standard (art and layout) lives in `.claude/agents/visual-director.md`; follow it for any visual work.
  UI/UX proposals (what the player sees and when) come from the `ui-designer` agent, based on the reference
  screenshots in `docs/design/ui-references/`; the visual-director implements them.
  Effects (weapons, Elos, hits, statuses, telegraphs) belong to the `vfx-director` agent: each effect must show
  what its mechanic does.
- `src/scenes/` — Boot, Menu, Select (hero + stage), Shop, Collection, Options, Game, Hud (overlay), LevelUp,
  Pause, End. **Coleção** (`CollectionScene`) has four tabs drawn by `scenes/collection/*.ts` (Bestiário, Elos,
  Conquistas, Heróis): each tab draws in a `TabArea` and returns its focusable buttons; the scene owns the tab row,
  Back and keys (free-layout `keyNav` with `cols = 0`, Q/E switch tabs, Esc back).
- Collection and achievements: `core/records.ts` (`summarizeRun`, favourite weapon, possible Elos),
  `data/achievements.ts` (declarative list and groups), `core/achievements.ts` (metrics, unlock, live check);
  `core/meta.ts` `recordRun` updates hero records, bestiary, totals and achievements at the end of a run. In a run,
  `GameScene` checks live achievements once a second and the HUD shows a queued toast.
- Communication core → render: `world.events` (drained by GameScene every frame) for rare things, and
  `world.tally` (running counts of attacks, hits, kills, gems) for frequent ones; never allocate per hit.
- Sound: `render/sounds.ts` is the **single sound map** (Web Audio synth recipes today, swap an entry to a file
  URL later); `render/sound.ts` plays them (unlocked on the first gesture, voice cap). Options (mute, damage
  numbers, calm screen) live in `core/settings.ts` (pure) + `render/settings.ts` (localStorage).
- Bosses: each has one telegraphed ability (`data/enemies.ts` `ability`, logic in `core/bosses.ts`, marker in
  `render/fx.ts`). When a boss arrives the common crowd leaves the field (`clearCrowd`, no XP or drops;
  elites stay), and a boss's bite skips the wave damage ramp, so the fight lasts ~30 s (NE-05).

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
- The sim bot is no human: read its numbers as relative. The curve was calibrated to its targets on 2026-11-09
  (Etapa 6 in `docs/balance-baseline.md`) and still needs playtesting.
- Overlays bind keys through `bindKeys()` (render/ui.ts): the key that opens an overlay is still queued that
  frame and would otherwise trigger it immediately.
- `window.game` is exposed in dev builds and in test mode, for browser automation.
- **Test mode** (`?dev` at the end of the URL, also on the published game; `render/dev.ts`): every hero and stage
  open (`playtest.unlockAll` in `core/meta.ts`), the Loja sets any level for free (− / +, keys + and −, the whole
  Loja at max or zero; `setShopLevel`), a "MODO DEV" tag on Menu, Preparação and Loja, and its own save key
  (`eterra-survivors.save.dev`), so the player's real progress is never touched and the boss arrives at 5:00 (`config.devBossAt`, `playtest.bossAt`), so it can be seen without playing ten minutes.
