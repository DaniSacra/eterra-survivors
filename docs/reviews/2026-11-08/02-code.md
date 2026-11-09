# Revisão 2026-11-08 · Código (src/ e tests/)

Commit: `97e273a`. Escopo: correção, regras do CLAUDE.md, código morto, duplicação e lacunas de teste.
Não repete o que o backlog já trata: `config.unlockAllHeroes: true` é intencional até o fim dos testes (D-06), e a
medição em celular real segue pendente (L-01).

Verificação: os achados 1 e 2 foram reproduzidos com um vitest temporário no scratchpad da sessão (fora do repo).
Os outros foram confirmados lendo o caminho do código, inclusive o fonte do Phaser 3.90 em `node_modules` quando foi
preciso.

## Resumo

| #   | Severidade | Confiança          | Achado                                                                           |
| --- | ---------- | ------------------ | -------------------------------------------------------------------------------- |
| 1   | Média      | Alta (reproduzido) | Espectro esmaecido (fantasma) "come" projéteis e atrai a mira                    |
| 2   | Média      | Alta (reproduzido) | Morrer e matar o chefe no mesmo passo vira derrota e abre duas telas de fim      |
| 3   | Média      | Média              | Áudio destravado uma única vez: some no iOS depois de trocar de app              |
| 4   | Baixa      | Alta               | Navegação por teclado da Loja pula para o card errado                            |
| 5   | Baixa      | Alta               | Alocação por entidade por frame no GameScene (regra de performance)              |
| 6   | Baixa      | Alta               | F3 e F4 (gerar 100 inimigos) funcionam em produção                               |
| 7   | Baixa      | Alta               | Efeito visual consome o `Rng` da partida; partidas reais não registram a semente |
| 8   | Baixa      | Alta               | `sanitizeSave` aceita `Infinity` e rebaixa sem aviso um save de versão futura    |
| 9   | Baixa      | Média              | Estado do GameScene que vaza entre partidas (`controls`, sequência de gemas)     |
| 10  | Baixa      | Alta               | LevelUpScene reiniciada duas vezes quando há level-ups em fila                   |
| 11  | Info       | Alta               | Textos de jogador (unidades, separadores, "II") fora do `pt-BR.ts`               |
| 12  | Info       | Alta               | Código morto e duplicação                                                        |
| 13  | Info       | Alta               | Lógica sem teste unitário                                                        |

---

## 1. Espectro esmaecido "come" projéteis e atrai a mira · Média · reproduzido

**Onde:** `src/core/projectiles.ts:121-133` (colisão), `src/core/projectiles.ts:61-72` (`nearestEnemy`),
`src/core/projectiles.ts:85-90` (`randomEnemyNear`), `src/core/weapons.ts:199-201` (`sweepOrbit`).

`damageEnemy` ignora inimigos esmaecidos (`isFaded`), mas o laço de colisão dos projéteis não sabe disso. Ele chama
`damageEnemy` (que não faz nada), registra o uid em `p.hits` e decrementa `p.pierce`. Com pierce 0, o projétil morre
no fantasma, que continua intacto.

**Cenário (reproduzido):** fantasma esmaecido em x=100 e esqueleto em x=140, na mesma linha. Um projétil com
pierce 0 sai de x=90. Resultado: fantasma com 38/38 de HP, esqueleto com 10/10 e o projétil já liberado. No jogo, na
Cripta (fase que tem `ghost` como tanque), as Adagas (`aim: 'nearest'`), as Luzes de Elun (homing) e o primeiro raio
do Raio miram o fantasma mais próximo mesmo quando ele está intocável. Com isso o golpe se perde, e o esqueleto logo
atrás fica livre. A órbita também grava `e.orbitReady[slot]` antes do `damageEnemy`, então o fantasma que reaparece
ainda fica imune por um intervalo de re-acerto.

**Correção:** em `updateProjectiles`, pular `isFaded(e)` junto com `e.dead` antes do teste de distância. Em
`nearestEnemy` e `randomEnemyNear`, também excluir `isFaded(e)`, para que a mira não escolha alvos intocáveis. Em
`sweepOrbit`, checar `isFaded` antes de gravar `orbitReady`. Teste novo em `behaviours.test.ts`: um projétil passa
pelo fantasma esmaecido e acerta o inimigo de trás.

## 2. Morte e vitória no mesmo passo viram derrota · Média · reproduzido

**Onde:** `src/core/world.ts:139-140` e `world.ts:197-200` (`end`), consumido em `src/scenes/GameScene.ts:344-351`.

`onEnemyKilled` chama `end('won')` dentro de `sweepDeadEnemies`. No fim do `step`, `if (this.player.hp <= 0)
this.end('lost')` roda sem checar se o estado ainda é `'playing'`. `end` também não protege contra uma segunda
chamada.

**Cenário (reproduzido):** herói com 1 de HP e um esqueleto encostado nele. O chefe tem 1 de HP dentro da Aura.
No mesmo passo, o esqueleto morde (HP 0) e a Aura mata o chefe. Resultado: `state = 'lost'` e eventos
`['playerHit', 'won', 'lost']`. No GameScene, o evento `won` chama `bank()`, que lê `w.state === 'lost'`. Assim a
fase **não** é marcada como vencida e a próxima não abre. Os dois eventos ainda agendam `scene.launch(end)` duas
vezes (a tela de fim reinicia) e tocam os sons de vitória e de derrota. É raro, mas acontece justamente no momento
mais importante da partida (a luta contra o chefe, com escolta e golpe telegrafado).

**Correção:** em `end()`, sair cedo com `if (this.state === 'won' || this.state === 'lost') return;`. Também dá para
trocar a linha final do `step` para `if (this.state === 'playing' && this.player.hp <= 0)`. Antes, decidir quem tem
prioridade: o mais justo é a vitória, já que o chefe caiu. Teste em `world.test.ts` com o cenário acima.

## 3. Áudio destravado só uma vez · Média · confiança média

**Onde:** `src/render/sound.ts:112-119`.

`unlock` é registrado com `{ once: true }` em `pointerdown` e `keydown`. Depois disso, ninguém mais chama
`ctx.resume()`. Dois casos de falha:

- No iOS/Safari, o `AudioContext` vai para `suspended`/`interrupted` quando o jogador troca de app, bloqueia a tela
  ou recebe uma ligação. Ao voltar, `play()` vê `ctx.state !== 'running'` e fica mudo pelo resto da sessão. Isso pega
  o caso de uso principal do Daniel (celular), e o jogo pausa justamente no `BLUR`.
- Em alguns WebKit, a ativação do usuário só conta no `touchend`/`click`, não no `pointerdown`. Se o primeiro
  `resume()` falhar, o listener já foi removido. O Phaser, por exemplo, escuta `touchstart`, `touchend`, `mousedown`
  e `keydown`.

**Correção:** manter os listeners (sem `once`) em `pointerdown`, `pointerup` e `keydown`. Neles, chamar
`ensure()` e `resume()` sempre que `ctx.state !== 'running'`. Remover os listeners só quando estiver `running`, e
reinstalá-los num `visibilitychange`/`statechange` do contexto. Testar no iPhone: entrar no jogo, trocar de app e
voltar.

## 4. Navegação por teclado da Loja pula para o card errado · Baixa · alta

**Onde:** `src/scenes/ShopScene.ts:50-53` e `:86-87`, com `src/render/ui.ts:173` e `:187`.

A Loja passa para `keyNav` só os cards compráveis, mais o botão Voltar, e usa `cols = 2`. Para cima e para baixo,
o foco anda `±cols` **dentro da lista filtrada**, que não corresponde à grade desenhada. Exemplo: A (comprável),
B (caro), C (comprável), D (comprável), em duas colunas. A lista usável fica `[A, C, D, Voltar]`, e ↓ a partir de A
vai para D, na diagonal, em vez de C. Voltar é um botão largo único, mas conta como "uma coluna" da grade.

**Correção:** passar todos os cards para o `keyNav`, que já pula desabilitados ao mover: andar na grade completa e
continuar no sentido até achar um habilitado. Outra saída é usar `cols = 1` quando a lista estiver filtrada. Voltar
pode ficar fora da grade, numa linha própria.

## 5. Alocação por entidade por frame no GameScene · Baixa · alta

**Onde:** `src/scenes/GameScene.ts:79` e `:122`.

- `config.gems.tiers.find((tier) => g.value >= tier.min)` cria uma closure por gema, por frame (até 250 por frame).
- `String(Math.round(d.value))` cria uma string por número de dano, por frame (até 40), mesmo quando o valor não
  mudou.

As duas violam a regra "never allocate in the per-frame loop" e geram trabalho de GC no celular (L-01).

**Correção:** uma função de módulo `gemSprite(value)` com um `for` sobre `tiers`, ou três `if`. Para os números,
guardar o último valor arredondado no próprio objeto (`txt.setData` ou um campo paralelo no Mirror) e só converter
quando mudar.

Menor ainda: `for...of` sobre pools em laços quentes do core (`zones.ts:55`, `xp.ts:24`, `effects.ts:123`,
`pickups.ts:58`). O V8 costuma eliminar o iterador, mas o resto do core usa `for` indexado. Uniformizar.

## 6. F3 e F4 ativos em produção · Baixa · alta

**Onde:** `src/scenes/HudScene.ts:75-76`.

B-06 tirou só a **dica** do F3 do menu em produção. O atalho continua ativo. No GitHub Pages, qualquer jogador que
aperte F3 e depois F4 gera 100 inimigos por toque (`stress()`). O CLAUDE.md diz "F4 (debug only)".

**Correção:** registrar o F4 só com `import.meta.env.DEV`. O F3 (painel de FPS) pode ficar, se o Daniel quiser
medir no celular (L-01).

## 7. Efeito visual consome o `Rng` da partida; semente não registrada · Baixa · alta

**Onde:** `src/core/effects.ts:100`, `src/core/math.ts:41`, `src/scenes/GameScene.ts:71`.

- `addDamageNumber` sorteia o deslocamento do número com `world.rng`. É puramente visual, mas avança o mesmo fluxo
  que decide spawns, drops e escolhas. Qualquer ajuste visual (`damageMergeTime`, `maxDamageNumbers`, ocultar
  aura/órbita) muda o desenrolar de **todas** as sementes do `npm run sim`, e a linha de base deixa de ser
  comparável sem nenhuma mudança de balanceamento.
- O `Rng` sem semente usa `Date.now()` dentro do core. O GameScene cria `new World(undefined, …)` e não guarda a
  semente, então um bug visto numa partida real não pode ser reproduzido.

**Correção:** um segundo `Rng` só para cosméticos (`world.fxRng`), ou um deslocamento determinístico pelo uid
(`(uid * 7919 % 10) - 5`). No GameScene, gerar a semente (`Date.now() >>> 0`), passá-la ao `World` e expô-la no
painel F3 ou no `window.game` de dev.

## 8. `sanitizeSave` aceita `Infinity` e rebaixa save futuro sem aviso · Baixa · alta

**Onde:** `src/core/meta.ts:45` e `:41-56`.

- `typeof r.gold === 'number' && r.gold >= 0` aceita `Infinity`. `JSON.stringify(Infinity)` vira `null`, e na leitura
  seguinte o ouro cai para 0. Só acontece com save adulterado, mas o teste "repairs broken or tampered saves" não
  cobre esse caso.
- `version` é ignorado na leitura. Um save de versão **maior** que `SAVE_VERSION` (por exemplo, um build antigo em
  cache do GitHub Pages aberto depois de um mais novo) é reduzido aos campos conhecidos e regravado no próximo
  `recordRun`/`buy`. Os campos novos se perdem. L-02 está feito, mas sem esse caso.

**Correção:** trocar por `Number.isFinite(r.gold)`. Para versão futura, decidir uma política simples: não regravar
(somente leitura) ou preservar as chaves desconhecidas no objeto salvo. Um teste para cada caso em `meta.test.ts`.

## 9. Estado do GameScene que vaza entre partidas · Baixa · média

**Onde:** `src/scenes/GameScene.ts:38`, `:58-59`, `:161` e `:199`.

A instância da cena é reaproveitada no "Jogar de novo", mas o `create()` não zera:

- `this.controls`: o guarda `if (!this.controls) return` deixa de valer na segunda partida. Até o `CREATE` da HUD
  nova, `update` lê o `Controls` antigo, com teclas já destruídas no shutdown do teclado, e chama
  `hud.joystick.setEnabled` no joystick destruído. Hoje é inofensivo (vetor zero, `setVisible` em objeto destruído
  não lança erro), mas é frágil.
- `gemStreak` e `lastGem`: `lastGem` guarda o tempo da partida anterior (por exemplo, 300). Na nova, `now - lastGem`
  dá negativo, menor que 0,4, e o tom da primeira gema continua subindo de onde parou.

**Correção:** no começo do `create()`, `this.controls = undefined!` (ou tipar como `Controls | null`) e
`this.gemStreak = 0; this.lastGem = -1`.

## 10. LevelUpScene reiniciada duas vezes com level-ups em fila · Baixa · alta

**Onde:** `src/core/world.ts:181-186` e `:188-192`, `src/scenes/LevelUpScene.ts:131-133`,
`src/scenes/GameScene.ts:304-308`.

Ao escolher com outro level-up na fila, `finishLevelUp` chama `openLevelUp`, que emite `levelUp`. O
`refresh()` da LevelUpScene já reinicia a cena com as opções novas. No frame seguinte, o GameScene trata o evento e
dá `scene.launch(levelUp)` na cena já ativa, o que gera um segundo restart (e perde um `banishing` que estivesse
ativo, embora `refresh(false)` já o zere). Não quebra nada, mas é trabalho dobrado e fonte de confusão.

**Correção:** no GameScene, só lançar se a cena não estiver ativa: `if (!this.scene.isActive(SCENES.levelUp))`.
O som e o pulso continuam a cada nível.

## 11. Textos de jogador fora do `pt-BR.ts` · Info

Pequenos, mas contra a regra "only in `src/i18n/pt-BR.ts`":

- `src/render/describe.ts:14-16` e `:23-25`: as unidades `°`, `s`, `/s`, `%` e os sinais `+`/`−`.
- O separador `' · '` em `describe.ts:52`, `EndScene.ts:113` e `SelectScene.ts:171`.
- `src/scenes/HudScene.ts:70`: o ícone de pausa `'II'`, que poderia ser desenhado como dois retângulos, sem texto.

**Correção:** `t.units.{seconds, perSecond, degrees, percent}` e `t.sep`, ou desenhar o ícone de pausa.

## 12. Código morto e duplicação · Info

- `normalizeInto` e `distSq` (`src/core/math.ts:10-28`) só são usados em `tests/core/math.test.ts`. Remover os dois e
  o teste, ou usar onde cabem.
- `fireOrbit` (`src/core/weapons.ts:181-184`) é um stub que nunca roda, mantido só para o tipo de `FIRE`. Dá para
  tirar `orbit` do mapa (`FIRE: { [K in Exclude<WeaponKind, 'orbit'>]: … }`).
- `isEvolved` (`src/core/upgrades.ts:15`) repete `isElo` (`src/core/weapons.ts:41`). Ficar com um só.
- `ringPoint` é exportado mas só usado dentro de `enemies.ts`. Inofensivo.

## 13. Lógica sem teste unitário · Info

- Projéteis com **pierce > 0**: não acertar o mesmo inimigo duas vezes e parar após `pierce + 1` acertos. Hoje só o
  caso pierce 0 é coberto (`weapons.test.ts:79`). Inclui o caso do achado 1.
- A prioridade entre `won` e `lost` no mesmo passo (achado 2).
- `homing` que perde o alvo e escolhe outro sem repetir `hits` (`projectiles.ts:107-110`).
- Elites reaparecendo no anel quando ficam longe (o teste de reciclagem só usa inimigo comum). Confirmar que o
  chefe **não** recicla.
- `sanitizeSave` com `Infinity`/`NaN` e com versão futura (achado 8).
- Fora do core e por isso aceitável, mas citado: o hash de `render/decals.ts` (determinismo por célula) poderia ter
  um teste puro, se for extraído para o core.

## O que foi checado e está ok

- Nenhum `import` de Phaser em `src/core`, nenhum `Math.random` em `src/` nem em `tests/`.
- Pools: as mortes são adiadas e varridas de trás para frente, os projéteis guardam `target` + `targetUid` e
  revalidam pelo uid, e `releaseWhere`/`expire` andam de trás para frente.
- Os buffers `world.scratch` e `targetsScratch` são usados em sequência, sem uma consulta sobrescrever a outra no
  meio de um laço.
- Listeners de cena: `RESIZE`, `BLUR` e o joystick são removidos no `SHUTDOWN`. As teclas são limpas pelo próprio
  `KeyboardPlugin.shutdown` (Phaser 3.90). `scene.resume` vai para a fila, então o Espaço que fecha a Pausa não a
  reabre.
- Meta: `newSave` e `shopBonuses` copiam `config.charges`, e os `stats` do jogador são copiados de
  `config.player.stats`, então nenhum dado é mutado entre partidas.
