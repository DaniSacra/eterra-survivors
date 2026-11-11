# 02 · Revisão de código (commit 7e51776)

Escopo: `src/` e `tests/`, com foco na Cripta e no código novo (fb4d0e5..7e51776: `reassemble`, `burst`, `trail`, `dig`,
`coldSpirit`, Dobre Fúnebre, `playtest.bossAt`, `SPRITE_SCALE`, `pixelEnemies`, Mãe-Aranha/`web`/`eggs`). Somente leitura.
Checks de base verdes (00-checks.md). Lido: `core/{enemies,marks,arena,behaviours,bosses,elos,waves,world,meta}.ts`,
`data/{enemies,stages,achievements}.ts`, diffs de `render/`, `scenes/`, `i18n/` e `tests/core/undead.test.ts`.

Verificado e **sem problema**: nenhum `import 'phaser'` em `core/` ou `data/`; `Math.random` ausente (só `Date.now()` como
semente padrão em `math.ts:22` e `world.ts:156`, pontos de entrada); textos novos de UI estão em `pt-BR.ts`;
`spawnEnemy` reseta `pile`, `rose`, `trailT`, `brewT`, `stir`, `spawned` (sem vazamento entre inimigos reutilizados do
pool); `playtest.bossAt` tem teste (`waves.test.ts:105`) com `finally` que restaura o global; nada aloca por quadro em
`leaveTrail`, `dig`, `explode` e no espelho do `GameScene` (o `SPRITE_SCALE[key]` é só busca por string); tudo que é novo
respeita `world.freeze` (pilha, trilha, cova, marca de explosão); `SAVE_VERSION` não precisou subir (`sanitizeBestiary`
só filtra por `ENEMY_IDS`, entradas antigas como `blackKnight` continuam válidas e `bestiaryOrder(seen)` as lista).

## Média

**M1. `elites25` ("Pedra Partida", "Derrote 25 elites") só conta o Golem.**
`src/data/achievements.ts:77` -> `enemies: ['golem']`. O Golem agora é elite só da Estrada (`stages.ts:96`); o Coveiro
(único elite da Cripta, `stages.ts:77`) e a Bruxa (elite da fase 1, `stages.ts:55`) não contam, embora a descrição diga
"elites" (`pt-BR.ts:437`). O backlog planejou isso no FT-13 (~linha 2330: "`elites25` passa a contar `witch` e `golem`
(e a elite da Cripta, quando houver)"); a parte do Coveiro ficou para trás quando o FT-16 entrou. Correção:
`['witch', 'gravedigger', 'golem']`. O teste (`tests/core/achievements.test.ts:43`) só semeia `d.enemies`, então não pega a
divergência entre texto e dados.

**M2. A pilha de ossos quebra com o segundo acerto no mesmo quadro (a Ossada quase nunca remonta contra builds de área).**
`src/core/enemies.ts:216-225`: o golpe que zera o HP vira pilha e retorna (`:240-249`); qualquer outra chamada a
`damageEnemy` depois, mesmo no mesmo `step`, mata de vez. Aura, órbita, zona, projétil perfurante e arco com vários
golpes aplicam dano várias vezes por segundo, então contra esses builds a Ossada praticamente não remonta, e contra
mira única remonta sempre. A descrição do jogo diz "Levanta se a pilha não for quebrada". O teste `undead.test.ts:44` só
cobre dois `damageEnemy` seguidos (é exatamente esse caso) sem distinguir quebra deliberada de duplo acerto do mesmo
ataque. Sugestão: janela curta (~0.15 s) em que a pilha ignora dano, ou só quebrar por origem diferente; medir no
`npm run sim` com Aura/Órbita.
Também: a quebra pula `source.damage`, `world.bestHit` e `onEnemyDamaged` (`enemies.ts:226-239` vem depois do `return`
da pilha), então o relatório de fim de partida subconta o dano que quebra pilhas e não aparece número de dano.

**M3. Spawns de `dig` e de `riseAt` fora da tela ignoram `config.enemies.maxActive`.**
`behaviours.ts:360` (`dig`) chama `riseAt` sem checar `world.enemies.size < maxActive`, ao contrário de `nest`, `toll` e
`eggs` (`bosses.ts:97,107`). `riseAt` com ponto fora da vista chama `spawnEnemy` direto (`marks.ts`, 1º `if`), e
`Pool.acquire` nunca recusa (`pool.ts`). Os `specials` (`waves.ts`, `send`) também não checam. Risco prático baixo (o
lote do spawner respeita o teto), mas a regra de desempenho (500+ a 60 FPS) pede o teto travado: checar dentro de
`riseAt`.

**M4. O Coveiro cava com o herói longe e as Ossadas dele ignoram o `hpMult` da onda.**
`behaviours.ts:349-367`: `dig` não olha `dist` (o `nest` tem `range`), então gasta o ciclo de 7 s mesmo longe e fora da
tela. E `riseAt(...)` fica com `hpMult = 1`, enquanto `toll` (`bosses.ts:106`) e `nest` passam
`segmentAt(...).hpMult`. O elite entra tarde na curva, então as Ossadas dele têm 10 HP x `stage.mult.hp` contra o
dobro ou mais das comuns da mesma hora. Pode ser intencional, mas está inconsistente e não consta no FT-16.

## Baixa

**B1. `markWeb` mexe em outra marca quando as marcas estão cheias.**
`arena.ts:111-113`: `addPatch` devolve `false` se `world.marks.size >= config.marks.max` (160), mas o retorno é
ignorado e `world.marks.active[size - 1].born` é sobrescrito na última marca qualquer. Efeito: embaralha a ordem de
"a mais antiga derrete"; raro. Correção: `if (addPatch(...)) {...}`. Sem teste.

**B2. Marcas reaproveitadas do pool carregam campos velhos.**
`addBurst`, `riseAt` e `markIce` não resetam `slow`, `life`, `damage`, `tick`, `foe`, `fromX/Y` (só `addPatch` seta quase
todos). Hoje nada lê o campo errado (`groundSlow` ignora `spawn` e `ttl > 0`; `explode` libera a marca no mesmo quadro),
mas é frágil. Sugestão: um `resetMark(m)` único (DRY com `createMark`).

**B3. `trail.cap` é global por tipo, não por dono.**
`enemies.ts:403-412` (o comentário diz "its cap"): com `max: 6` Gosmas e `cap: 5`, o teto de 5 vale para a fase toda e
Gosmas podem ficar sem rastro. O teste (`undead.test.ts:121`) usa uma só Gosma. Decidir: ajustar comentário/dado, ou
guardar o dono na marca.

**B4. Atordoamento: `dig` e `shoot` se comportam diferente.**
`shoot` cancela a mira se `e.stun > 0` (`behaviours.ts`, janela de `Windup`); `dig` só testa `stun` para começar
(`:365`), então a Maça de Ferro não interrompe a cova já plantada. Decidir se deve.

**B5. Código morto: arte em código dos inimigos que ganharam PNG.**
`render/assets.ts:43-54` sobrescreve `enemy.bones/skeleton/emberBones/bonePile/ghost/coldSpirit/slime/vampireBat/
gravedigger/bellRinger`, mas `render/art/enemies.ts` (558 linhas) ainda os desenha (`:119,:140,:160,:162,:175,:190,:192,
:213,:384,:503`) para uma textura que o último spread descarta. Manter como reserva é escolha do Daniel; senão, remover.
O comentário de `assets.ts:11-13` ("today they are drawn from code") fica desatualizado.

**B6. `SPRITE_SCALE` só vale no `GameScene`, e o corpo não acompanha.**
`assets.ts:74` e `GameScene.ts:~373`. O Sineiro desenhado a 1.5x mantém `radius: 30` (`data/enemies.ts:471`): o sprite
passa de ~100 para ~150 px de altura, fora do raio de contato; o Bestiário (`bestiary.ts:25`) não aplica o fator.
Reavaliar `radius` ou documentar no dado.

**B7. Textos de lore provisórios.**
`pt-BR.ts` (diff): `spiderMother`, `gravedigger`, `emberBones`, `coldSpirit`, `vampireBat` têm descrições escritas para o
Survivors ("Os ovos ficam nas cercas. A mãe fica onde é mais escuro."). Estão marcadas como provisórias; o CLAUDE.md
manda perguntar ao Daniel antes de inventar lore (FT-12/14/16 no backlog).

**B8. `bossKnight` mudou de significado.**
Mesmo id, agora exige `spiderMother` (`data/achievements.ts`). Decisão registrada em comentário do `pt-BR.ts`;
quem matou o Cavaleiro Negro ganhou "Ninho Desfeito" sem ver a Mãe-Aranha. Sem migração necessária.

**B9. Pequenas.**

- `dig.spawn`/`nest.spawn` são `string` com `as EnemyId` (`behaviours.ts:360`); `BossAbility.summon` tem o mesmo cast.
  Um id errado só falharia em execução.
- `createEnemy` (`enemies.ts:69-107`) com ordem de campos fora do `interface` (`vanished` no meio); sem efeito.
- Em `?dev` o chefe vem aos 5:00 com a curva de meia partida (`config.devBossAt`); esperado, só vale saber ao ler números.

## Testes que faltam

- `coldSpirit`/`shoot` como comportamento (só aparece como elenco em `behaviours.test.ts:63`).
- Pilha sob `world.freeze` e sob `clearCrowd` (o chefe chega com pilhas no chão: sem gema nem explosão).
- `burst` com Muralha de Valmor pronta (`attacker = null`: bloqueia sem contra-ataque) e `explode` poupando chefe.
- `markWeb` com marcas cheias (B1) e `meltOldest('web')`.
- `groundSlow` com `slime` e `web` formados.
- Dobre Fúnebre no ciclo: o `bosses.test.ts:112` cobre o anel, não que o ciclo é estrito (o anel, com `trigger` 240,
  segura a próxima Badalada, `trigger` 600, enquanto o herói está longe).
- `bestiaryOrder(seen)` e `bossSummons` (`stages.ts`) sem teste dedicado (só indireto em `achievements.test.ts:72`).
- `elites25` contra as elites reais (M1).

## Resumo

Alta: nenhuma (sem crash, sem vazamento de estado entre partidas, sem quebra de save, sem não determinismo). Média:
M1 a M4. Baixa: B1 a B9. Itens já resolvidos ou planejados no backlog não foram repetidos (FT-16 "falta arte final"
cumprido pelos PNGs PixelLab; AR-03 e FT-17 feitos).
