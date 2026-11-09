---
name: revisao
description: Full review of Eterra Survivors - runs every relevant agent in parallel (balance, code bugs, runtime QA, visual, UI) to hunt for improvements, bugs, errors and evolutions, each leaving a report in docs/reviews/, then the game-director reads all reports and turns them into backlog items. Use when Daniel types /revisao.
argument-hint: '[foco opcional, ex.: "Cripta", "UI do celular", "Lyra"]'
disable-model-invocation: true
---

# /revisao: full review → reports → backlog

Optional focus from Daniel: **$ARGUMENTS** (empty means the whole game). Pass it to every agent as a priority, not
as a limit.

All reports go in `docs/reviews/<YYYY-MM-DD>/` (today's date; if the folder exists, add `-2`, `-3`). Reports are in
Portuguese (pt-BR). Agents only **analyse and write their own report file**: no agent edits `src/`, `tests/`,
`docs/design/` or any other report in this phase. Scratch scripts and screenshots go in the session scratchpad.

## 1. Baseline (you, before the agents)

Run and save the results to `docs/reviews/<date>/00-checks.md` (pass/fail plus any errors, short):
`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git log --oneline -15`. Note the commit hash.
Each agent gets the folder path, the commit hash and the checks summary in its prompt.

## 2. Reviewers in parallel (one message, all Agent calls together, in the background)

Every prompt says: read `CLAUDE.md` and `docs/design/backlog.md` first, skip what is already done or planned
(cite the backlog ID instead), rank findings by severity/impact, give `file:line` and evidence for each one, and
write the report to the exact path below. Each agent that opens the game uses its **own port** (shown below) with
`npx vite --port <port> --strictPort` in the background, and stops it when done.

| Report          | Agent (`subagent_type`) | Port | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-balance.md` | `balance-tester`        | –    | Runs `npm run sim` and `npm run lab`, compares with `docs/balance-baseline.md`. Broken weapons, passives, Elos and defenses; outliers per role; curve, survivability per hero x stage, boss reachability, gold/shop economy.                                                                                                                                                                                                                                                  |
| `02-code.md`    | `general-purpose`       | –    | Code review of `src/` and `tests/` for correctness bugs (edge cases, wrong formulas, state that leaks between runs, save/meta versioning, determinism with `Rng`), violations of the `CLAUDE.md` rules (Phaser in `core/`, per-frame allocation, hardcoded UI strings outside `pt-BR.ts`, pools and deferred kills), dead code, duplication, missing unit tests for game logic. Read-only: no edits.                                                                          |
| `03-qa.md`      | `general-purpose`       | 4174 | Plays the real game with Playwright (`playwright-core` at `/home/dani/projects/jerusalem-antiga/node_modules/playwright-core`, `window.game` in dev) at 420x820 and 1000x680: every scene and flow (menu, select, shop, run, level-up with Trocar/Pular/Banir, pause, options, Livro de Elos, end, unlocking the next stage, save reload). Records console errors, softlocks, keys or taps that do nothing or double-fire, FPS with the F4 stress spawn. Read-only: no edits. |
| `04-visual.md`  | `visual-director`       | 4175 | Review only, **do not implement**: art and layout against the visual standard, consistency between scenes, readability of the chaos on a phone, missing or placeholder art, motion and feedback. Screenshot paths in the report.                                                                                                                                                                                                                                              |
| `05-ui.md`      | `ui-designer`           | 4176 | Full UI/UX review grounded in `docs/design/ui-references/` and genre research: HUD, level-up, pause, end, menus, phone controls.                                                                                                                                                                                                                                                                                                                                              |
| `06-vfx.md`     | `vfx-director`          | 4177 | Review only, **do not implement**: every weapon (base, max level, Elo), hits, deaths, pickups, statuses and boss telegraphs: what each does, what the player sees today, what the effect should show; performance cost of each proposal.                                                                                                                                                                                                                                      |

When all six are done, check every file exists and is non-empty; rerun any agent that failed (once).

## 3. Game director (last, after all reports)

Run `game-director` (foreground) with this task:

> Read every report in `docs/reviews/<date>/` and the current `docs/design/backlog.md`. Write
> `docs/reviews/<date>/07-direcao.md`: your own design read of the game (what moves it most toward the pillars:
> evolutions, new content, retention), plus a triage of the reports: what you accept, merge, reject (and why), and
> conflicts between reports with your decision. Then update `docs/design/backlog.md`: add a section
> `## Revisão <date>` with the accepted items in the backlog's existing format (ID with a new prefix per kind, por
> quê citing the report and evidence, o quê, dono, tamanho, aceite), ordered by impact over effort, bugs first.
> Do not duplicate existing items: update them instead. Mark every new item `· proposto` (awaiting Daniel's
> approval). Refresh "Próximos 5" only as a suggestion inside your section. Do not touch code.

## 4. Wrap up (you)

1. `npx prettier --write docs/reviews/<date> docs/design/backlog.md`, then `npm run lint` and `npm run build`.
2. Commit only `docs/` (`docs: full review <date> and backlog proposals`) and push.
3. Tell Daniel in pt-BR, short: how many findings per report, the critical bugs (if any), the top 5 proposals of the
   game-director, and the path of the folder. Nothing is implemented until he approves items from the backlog.
