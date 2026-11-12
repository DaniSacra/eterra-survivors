# 02 · Revisão de código (commit 18f6ee3)

Escopo: `src/` e `tests/`, somente leitura. Base verde (`00-checks.md`: 437 testes, lint, typecheck e build). Li o
CLAUDE.md e o `docs/design/backlog.md` e conferi a revisão anterior (`docs/reviews/2026-11-11/02-code.md`): tudo o que ela
apontou já foi corrigido (CB-01, CB-03, CB-05, CT-01, `resetMark`, `owner` do rastro) e não é repetido aqui.
Lido com atenção: `core/{world,meta,enemies,projectiles,weapons,waves,marks,arena,bosses,elos,upgrades,xp,pickups,
player,records,achievements,terrain,effects,spatialHash}`, `render/{music,musics,save,options,edgeArrows,edgeTargets,vfx}`,
`scenes/{GameScene,StageScene,StoryScene,choice,BootScene}`, `main.ts`, `public/sw.js`, e a lista de testes.

Verificado e **sem problema**: nenhum `import 'phaser'` em `core/` ou `data/`, e `core/` e `data/` não importam `render/`,
`scenes/` nem `i18n/`; nenhum `Math.random` fora de arte e menu (só `Date.now()` como semente nos pontos de entrada); nenhuma
string de UI com acento ou texto fixo fora de `pt-BR.ts`; nenhum `console.*`, `@ts-ignore`, `eslint-disable`,
`TODO` em `src/`; todo uso de `world.scratch` nos loops de arma/projétil é seguro contra reentrada (`onKill` não consulta
o hash; Nevasca enfileira os estilhaços); `SAVE_VERSION` 2 com migração por `sanitizeSave`, `serializeSave` preserva campos
de versão futura; `bankOnEnd` impede registrar a partida duas vezes; `SHUTDOWN` do `GameScene` solta `BLUR` e `RESIZE`;
`World` nunca é lido com estado de partida anterior (cada `create` faz `new World`). Os testes do que é lógica de jogo
são abrangentes (47 arquivos em `tests/core`); só destaco as lacunas reais.

## Média

**M1. O ouro é arredondado moeda a moeda e distorce Ganância e o multiplicador de ouro das fases.**
`src/core/pickups.ts:58`: `world.gold += Math.round(amount * greed * stage.mult.gold)`, chamado a cada moeda
(`config.gold.coin = 3`, `config.ts:119`). Efeito medido na conta:

| Ganância (Loja, `shop.ts:28`) | moeda                | ganho real sobre 3           |
| ----------------------------- | -------------------- | ---------------------------- |
| nv 1 (1,1)                    | 3,3 -> 3             | 0% (a compra não rende nada) |
| nv 2, 3, 4 (1,2 / 1,3 / 1,4)  | 3,6 / 3,9 / 4,2 -> 4 | +33% nos três                |
| nv 5 (1,5)                    | 4,5 -> 5             | +67%                         |

E a Cripta (`gold: 1.5`, `stages.ts:80`) paga 5 por moeda (x1,67), a Estrada (`gold: 2`) paga 6. A Loja e o ouro por fase
(`balance` mede "40-60% do ouro da Loja por partida", CLAUDE.md `LOJA`) estão calibrados em cima de um valor que não é o
dos dados. Correção: acumular o valor fracionário em `world.gold` e arredondar uma vez só ao banco (`recordRun` já faz
`Math.floor(run.gold)`), ou arredondar só o total. Teste que falta: 100 moedas com Ganância 1,1 rendem 330, não 300.
O `skipGold` (`world.ts:263`, 15 fixos) também ignora Ganância e `mult.gold`; confirmar se é intencional.

**M2. A música pode iniciar duas vezes a mesma faixa (som em dobro).**
`src/render/music.ts:34-38`: `play()` registra um `scene.load.once('filecomplete-audio-<id>')` e chama `load.audio` a cada
chamada enquanto o arquivo (2 a 3 MB) ainda carrega. `start()` (`:56`) não confere se já existe voz do mesmo `id`; o teste
`voices.some(...)` só roda antes do carregamento terminar. Se `play(id)` ou `sync()` for chamado de novo durante o
download (as chaves de Opções/Pausa chamam `music.sync(scene)` com **outra cena**, `options.ts:38,64`, e esse `sync`
chama `play(wanted)`), dois ouvintes disparam no mesmo evento e dois `scene.sound.add` tocam sobrepostos. Não reproduzi
no navegador (só leitura). Correção barata: em `start()`, `if (this.voices.some(v => v.id === id)) return;`, e/ou guardar
um `loading: Set<MusicId>` para não registrar o segundo `once`. A parte pura do player (rampa de `vol`/`duck`, silenciar)
não tem teste; `tests/render/music.test.ts` só confere mapa e arquivos. Extrair `tick` para uma função pura permitiria testar
o fade e a regra "silenciado de vez para o arquivo".

**M3. Alocações por quadro que sobraram (regra de desempenho do CLAUDE.md), todas no caminho de 500+ inimigos.**

- `src/scenes/GameScene.ts:924`: `this.corpsePool.find((o) => !o.img.visible)` cria um closure **por morte nova por
  quadro** (centenas por segundo numa horda). Trocar por laço `for` com índice.
- `src/scenes/GameScene.ts:786`: `[this.pilesPrev, this.pilesNow] = [this.pilesNow, this.pilesPrev]` aloca um array por
  quadro. Usar variável temporária.
- `src/render/edgeArrows.ts:50` (`(x, y) => view.contains(x, y)`) e `src/render/edgeTargets.ts:30` (`const put = ...`)
  criam dois closures por quadro, apesar do comentário "Nothing allocates per frame" (`edgeArrows.ts:15`). Receber o
  retângulo (x, y, w, h) em vez do callback, e inlinar o `put`.
- Menor: `GameScene.ts:~960` `for (const c of this.corpsePool)` (iterador). Já listados como feitos em RT-02/NT-01; foram
  casos novos do código das mortes em sprite (DD-06/DD-07).

**M4. O Service Worker nunca limpa o cache antigo.**
`public/sw.js:16`: `caches.open('eterra-survivors')` guarda toda resposta GET same-origin `ok`, com nome de cache fixo e
sem `activate` que apague entradas. Cada deploy do Vite gera arquivos com hash novo (o chunk do Phaser tem ~1 MB+) e agora
há 13 MB de MP3 em `public/audio/music/`; as versões antigas ficam para sempre no celular instalado. Sugestão: versionar o
nome (`eterra-survivors-<build>`) e apagar os caches de outro nome no `activate`, ou só guardar `index.html` e o que o
build referencia. Também: `res.ok` aceita 206 (resposta parcial), e `cache.put` de 206 rejeita; hoje o Phaser carrega por
XHR inteiro, então não aparece, mas o `.catch` não existe no `put` (rejeição não tratada).

## Baixa

**B1. Estilhaço: `nearestEnemy` sobrescreve `near` e o laço do projétil continua sobre a lista nova.**
`src/core/projectiles.ts:217-224`: o comentário diz "this overwrites `near`: stop here", mas só dá `break` se `next`
existe. Sem alvo de ricochete, `nearestEnemy` já reescreveu `world.scratch` e o laço segue com `n` de uma lista que é
outra (a do alcance do ricochete). O teste de distância evita dano errado, mas candidatos podem ser pulados ou repetidos
neste quadro. Correção: `break` sempre após chamar `nearestEnemy`, ou consultar numa lista separada (`targetsScratch`
já é usada por `burst`).

**B2. Maça aplica atordoamento antes de checar se o alvo é atingível.**
`src/core/weapons.ts:312` (`slamHit`): `e.stun = ...` é gravado antes de `damageEnemy`, que sai cedo para fantasma
esmaecido (`isFaded`) e para pilha de osso recém-caída. O fantasma "intocável" ganha atordoamento (segura o relógio de
fase? `behaviourStep` só soma `actT` no caminho `move`, que roda com `speed` 0) e a pilha também. Mover a gravação para
depois de uma checagem `isFaded`/`pile`, e cobrir com teste.

**B3. `markIce` ignora `config.marks.max`.**
`src/core/arena.ts:81`: `world.marks.acquire()` direto, enquanto `addPatch`/`addBurst`/`riseAt` respeitam o teto (160).
O número de gelos é pequeno (`cap`), por isso o risco é nulo hoje, mas é a única porta que burla o teto de marcas.

**B4. Marcas de surgimento pendentes não contam para `alive`/`max` nem para `maxActive`.**
`src/core/waves.ts:capped` e `batchSize` olham `world.alive[id]` e `world.enemies.size`, mas até 160 marcas `spawn` podem
estar esperando; ao vencerem, `updateMarks` só checa `maxActive` (e `m.force`), não o `max` do tipo. Um tipo com
`max: 3` (Ninho, Estandarte, Ladrão) pode passar do limite quando vários marcam no mesmo intervalo. Impacto baixo, mas
fura a regra "o spawner mantém cada tipo sob o seu `max`".

**B5. `onScreen` de `core/weapons.ts` usa `min(w, h) / 2`, não o retângulo (B-04 do backlog).**
`src/core/weapons.ts:599`. O B-04 pedia a meia-largura e a meia-altura separadas; o alvo "na tela" no retrato é
limitado a metade da largura (~195 px num celular 390 de largura) em todas as direções, então inimigos visíveis acima e
abaixo ficam sem mira automática. O `bossOnScreen` ao lado já faz certo. Não é fora da tela (segurança preservada), mas
o item está marcado como feito com critério de aceite diferente do código. Decidir: usar o retângulo em `nearestEnemy`
(precisa de variante com `hw`/`hh`, como `randomEnemyNear`).

**B6. `liveAchievements` aloca uma vez por segundo, ao contrário do que o comentário afirma.**
`src/core/achievements.ts:151` ("Allocates only when something is found") chama `METRICS.*` que usam `.map`/spread
(`heroElos`, `vigil` com `flatMap` e `Object.values`, `sharedUsed`, `enemyKills` com `reduce`, `seen` com `bestiaryOrder()`),
para ~todas as conquistas, 1 Hz. Não é por quadro e é barato; corrigir o comentário (ou trocar por laços) é suficiente.

**B7. Código morto.**

- `src/render/vfx.ts:54` `vfxFrame`: nunca chamada; o `length = age` como padrão devolve sempre `-1` (e `NaN` com
  `age = 0`). Remover, ou testar e corrigir se for voltar a usar.
- `src/core/marks.ts:15` `isPatch` e `src/render/ui.ts:64` `SLIME_WARN`: sem uso.
- Textos sem uso em `src/i18n/pt-BR.ts`: `menu.intro` (`:44`), `levelUp.newWeapon` (`:67`), `shop.intro` (`:546`).
- `src/core/world.ts:89`: comentário solto "Base weapons whose ready Elo was already announced this run." sem campo embaixo.
- Já no backlog: arte em código dos inimigos com PNG (CT-03, proposto).

**B8. Duplicação.**
`src/scenes/StageScene.ts:98-99` e `src/scenes/StoryScene.ts:52,STAGES_BEFORE` calculam "a fase anterior" para
`stageScreen.unlockBy` de duas maneiras. Um helper `previousStage(id)` em `data/stages.ts` serve aos dois (e o
`StageScene` não precisaria do caso `: s.name`).

**B9. `thiefPoint` pode devolver ponto perto demais.**
`src/core/waves.ts:thiefPoint`: se as 8 tentativas ficam todas a menos de 75% de `thief.dist` (obstáculos próximos), a
função termina sem sinalizar e `this.at` fica com o último ponto empurrado. O aviso de 1 s e a distância mínima de
golpe (DD-02) deixam de valer nesse caso raro. Cair para o melhor candidato (o mais distante) em vez do último.

**B10. `fx.ts` com 2313 linhas.**
`src/render/fx.ts` mistura arma, Elo, chefe, aviso, marca e zona. Não há regra do CLAUDE.md quebrada, mas é o ponto de
maior custo de mudança do render (o `GameScene` tem 1544). Quando a DD-15 terminar, separar por família (golpes,
zonas, chefes) em arquivos que o `drawFx` chame, sem mudar comportamento.

## Lacunas de teste (lógica do jogo)

- Ouro: nenhum teste do arredondamento de `addGold` (M1).
- `meltOldest`, `addBurst` (limite de marcas) e `holdInArena` com `markIce` perto da parede: sem teste direto.
- `vfxFrame`, `mixColor`, `optionRow`: sem teste (os dois últimos são render).
- Música: só estrutura (M2).
- Aviso para o `balance-tester`: o laço de ricochete (B1) e o atordoamento em fantasma/pilha (B2) não aparecem no `lab`
  (alvos imortais), só no `sim`.

## Ordem sugerida

1. M1 (muda número de balanceamento; revalidar `LOJA` e as faixas por fase depois), 2. M2 (uma linha), 3. M3 (laços
   simples), 4. M4, 5. B1/B2 com teste, 6. B7 (limpeza), o resto quando passar por perto.

Nenhum item acima está no backlog como pendente, exceto CT-03 e B-04 (citados).
