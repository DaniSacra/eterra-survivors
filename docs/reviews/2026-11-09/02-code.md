# Revisão 2026-11-09 · Código (src/ e tests/)

Commit: `3b9939c`. Escopo: correção, regras do CLAUDE.md, código morto, duplicação e lacunas de teste, com atenção
às mudanças recentes (forja do Elo, verbos em `core/elos.ts`, `applyDot`, pancada e tontura, empurrão, modo `?dev`
com save próprio, Livro de Elos, ouro de descoberta).

Não repito o que o backlog já trata. Os 13 achados da revisão de 2026-11-08 viraram RB-01 a RB-08 e RT-01 a RT-06,
todos feitos, e conferi que continuam corrigidos: vitória vence morte simultânea (`world.ts:199-205`, `end()` com
guarda), fantasma esmaecido fora da mira e das colisões, semente registrada, F4 só em `DEV`. `config.unlockAll*`
ligado segue sob D-06 (ver achado 9).

Verificação: os achados 2 a 5 foram reproduzidos com um vitest temporário fora do repo
(`/tmp/claude-1000/-home-dani-games-eterra-survivors/fa0bf9c7-8ee4-4a47-a092-cca892969417/scratchpad/rv/probe.test.ts`).
O achado 1 foi confirmado lendo o caminho do código (GameScene e PauseScene). Regras gerais conferidas sem achado
novo: nenhum `phaser` em `src/core` ou `src/data`; nenhum `Math.random` no jogo; nenhum texto de jogador fora do
`pt-BR.ts` (só as aspas do achado 10); pools com morte adiada; o save `?dev` usa sua própria chave
(`render/save.ts:17`).

## Resumo

| #   | Severidade | Confiança          | Achado                                                                                |
| --- | ---------- | ------------------ | ------------------------------------------------------------------------------------- |
| 1   | Média      | Alta               | Desistir durante a Noite Sem Fim descarta tudo o que a vigília rendeu                 |
| 2   | Média      | Alta (reproduzido) | O esmagamento do Quebra-Junta vale sempre no centro (a onda do mesmo golpe já esmaga) |
| 3   | Baixa      | Alta (reproduzido) | Herói com 0 de vida curado no mesmo passo não morre (Luz Sagrada, comida, baú)        |
| 4   | Baixa      | Alta (reproduzido) | Baú que forja um Elo apaga o momento da forja (ícone e aviso da arma base)            |
| 5   | Baixa      | Alta (reproduzido) | `applyDot`: o dano contínuo mais forte herda a duração mais longa do outro            |
| 6   | Baixa      | Média              | Tontura não segura a habilidade do chefe (a investida anda e acerta tonta)            |
| 7   | Info       | Alta               | Comentários e nome de teste desatualizados ("a cada três" com `every: 2`, docs órfãs) |
| 8   | Info       | Alta               | Código morto: `unlockedTitles`, `weaponsCompletedBy`, `elementOf`; `addLink` frágil   |
| 9   | Info       | Alta               | `playtest.unlockAll` sem teste; os testes "playtest switch" testam outra coisa        |
| 10  | Info       | Alta               | Miudezas: card sem atributo visível, closure por quadro, aspas fora do i18n           |

---

## 1. Desistir durante a Noite Sem Fim descarta o que a vigília rendeu · Média · alta

**Onde:** `src/scenes/GameScene.ts:357` (SHUTDOWN chama `this.bank()`), `:756-757` (`bank` sai se `banked`),
`:780-790` (`bankVigil`, só chamado no evento `lost`, `:878`); `src/scenes/PauseScene.ts:112-113` (Desistir).

A vitória é registrada quando o chefe cai (`bank()`, `banked = true`). Na vigília, o registro só acontece pelo
evento `lost` (`w.endless ? this.bankVigil() : this.bank()`). Se o jogador sair pela Pausa → Desistir, a cena
é parada e o SHUTDOWN chama `bank()`, que retorna na hora porque `banked` já é `true`. Com isso se perdem o ouro
coletado na vigília, as mortes e o dano para os totais e o Bestiário, os Elos formados depois do chefe (e o ouro de
descoberta deles), o recorde de vigília por herói (`HeroRecord.vigil`) e a conquista `vigil5`. Numa partida normal,
Desistir guarda o ouro. Na vigília, que é justamente a parte longa e opcional, sair pela pausa joga tudo fora. O
jogador não tem como saber disso.

**Correção:** no SHUTDOWN, `if (w.endless) this.bankVigil(); else this.bank();`, com uma guarda própria em
`bankVigil` (`vigilBanked`), porque o caminho normal (`lost` e depois SHUTDOWN) não pode registrar duas vezes.
Como a lógica de "o que a vigília soma" já é pura (`recordVigil`, testada em `vigil.test.ts`), basta um teste de
cena, ou extrair a decisão "qual registro fazer" para uma função pura testável.

## 2. O esmagamento do Quebra-Junta vale sempre no centro · Média · reproduzido

**Onde:** `src/core/weapons.ts:225` (onda no mesmo disparo, `waveEvery: 1`), `:306-310` (`slamHit`),
`src/data/weapons.ts:511-516`; o efeito está em `src/scenes/GameScene.ts:325-331`.

`slamHit` testa `e.stun > 0` **antes** de aplicar a tontura do próprio golpe. Mas `fireSlam` chama `smash` (que
atordoa) e logo depois, no mesmo disparo, `shockWave`. Quando a onda chega, todo inimigo que estava no círculo da
pancada já está tonto e leva `crush` (×1,5). Isso vale também para o chefe: `bossStun` 0,1 s basta.

**Reproduzido:** esqueleto e Cavaleiro Negro dentro da pancada, um disparo: dano 131,2 em cada um, ou seja,
64 (pancada) + 44,8 × 1,5 (onda esmagando). O esperado pela descrição ("crushes the already stunned") seria
64 + 44,8 = 108,8. O teste `weapons.test.ts:93-109` só cobre um inimigo **fora** da pancada, onde a regra
funciona: a onda o encontra sem tontura e o tremor seguinte o esmaga.

Efeitos:

- O verbo deixa de ser condicional. No miolo da multidão e no chefe, o golpe dá +21% sempre, e o jogador não
  ganha nada por "acertar quem já está tonto".
- O efeito visual discorda da regra. `crushSpark` só dispara se `img.stunned` era verdadeiro **no quadro
  anterior** (`GameScene.ts:325`), então esse esmagamento no mesmo golpe não mostra a faísca âmbar. A tontura do
  golpe anterior (0,5 s) acaba antes da próxima pancada (recarga 0,9 s × cooldown), então na prática a faísca só
  aparece no tremor.

**Correção (decisão do Daniel, porque mexe no balanço medido no lab e no sim):** ou o esmagamento conta só a tontura
anterior ao disparo (guardar em `slamHit` um "atordoado antes deste golpe", por exemplo marcando o uid ou o tempo
da tontura), e o Quebra-Junta perde ~21% no centro e precisa de ajuste de dano para ficar na faixa
(`bands.test.ts`); ou a regra passa a ser "a onda esmaga o que a pancada atordoou", e então o comentário, a
descrição e o `crushSpark` (que pode olhar `e.stun > 0` do quadro atual junto com `e.hitBy`) precisam dizer isso.
Nos dois casos, um teste com o inimigo **dentro** da pancada.

## 3. Herói com 0 de vida curado no mesmo passo não morre · Baixa · reproduzido

**Onde:** `src/core/elos.ts:26-36` (Luz Sagrada), `src/core/pickups.ts:49-52` (comida), `src/core/upgrades.ts:185`
(baú), decidido em `src/core/world.ts:199-205`.

A morte só é decidida no fim de `step` (`if (this.player.hp <= 0)`). Entre a mordida (em `updateEnemies`) e esse
teste rodam armas, projéteis e itens. Qualquer cura nesse meio põe a vida acima de 0 e cancela a morte, porque as
curas fazem `Math.min(maxHp, p.hp + x)` sem olhar se o herói já caiu.

**Reproduzido:** herói com 1 de vida, esqueleto encostado, Luz Sagrada matando outro inimigo no mesmo passo.
Resultado: `state 'playing'`, vida 1, eventos `['playerHit', ...]`, sem `lost`. Com a comida e o baú é raro, mas
com o Elo novo do Teo não é: até 4 curas por segundo, e as primeiras mortes de cada janela caem em quadros
quaisquer, então ele ganha um "salvo da morte" de vez em quando, sem consumir a Segunda Chance. Isso também mexe nos
números do sim para o Teo.

**Correção:** uma função `heal(p, amount)` em `core/player.ts` que não faz nada com `p.hp <= 0`, usada por todas as
curas (Luz Sagrada, comida, baú, Banquete, cura do level-up). Teste: mordida letal e morte pela Luz Sagrada no mesmo
passo terminam em `lost` (ou em `revived`, com Segunda Chance).

## 4. Baú que forja um Elo apaga o momento da forja · Baixa · reproduzido

**Onde:** `src/core/upgrades.ts:175-187` (`openChest` aplica o nível, que forja, e só depois empurra `chest`),
`src/scenes/GameScene.ts:826-836`.

**Reproduzido:** Lâmina no nível 6 com Força no máximo, abrir um baú: eventos
`[eloForged(fury), chest(reward: blade nível 7)]`. O `handleEvents` trata a forja (`forgeMoment`: ícone do Elo,
`moments.elo = true`) e logo em seguida o baú, que troca o ícone que sobe pelo da Lâmina, zera `moments.elo` (ícone
menor) e anuncia "ganhou Lâmina de Valmor nível 7" no centro da tela, sobre o aviso do Elo. O momento mais
importante da partida aparece como um nível comum de uma arma que nem existe mais na build.

**Correção:** em `openChest`, se o nível aplicado formou um Elo, não anunciar o nível (empurrar o `chest` antes do
`applyUpgrade`, ou com `reward: null`), ou então no GameScene ignorar o ícone e o texto do baú quando houve
`eloForged` no mesmo quadro. Teste de core: a ordem e o conteúdo dos eventos quando o baú completa a receita.

## 5. `applyDot`: o mais forte herda a duração mais longa · Baixa · reproduzido

**Onde:** `src/core/enemies.ts:81-95`.

Quando chega um dano contínuo mais forte, o código faz `e.dot = Math.max(e.dot, duration)`. Ele fica com o dps novo
e com a duração que sobrava do antigo. **Reproduzido:** sangramento de 5/s por 3 s e depois queimadura de 20/s por
0,5 s resultam em queimadura de 20/s por **3 s** (60 de dano, em vez de 10 mais o resto do sangramento). Só
acontece com Leque de Facas e Espada de Fogo juntos, ou com dois acertos de força diferente (Bênção de Yah no meio).
O teste "the stronger one stays" (`eloEffects.test.ts:137`) não cobre durações diferentes.

**Correção:** ao trocar pelo mais forte, `e.dot = duration` (ou somar as duas fontes, se for essa a intenção).

## 6. Tontura não segura a habilidade do chefe · Baixa · média

**Onde:** `src/core/enemies.ts:214-219`, `src/core/bosses.ts:47-58` e `:67-72`.

`updateBoss` roda antes da tontura e continua avançando os tempos da habilidade. Na investida (`lunge`), ele move o
chefe direto (`e.x += e.aimX * speed * dt`) e acerta o herói por `hurtHero`, que não olha `e.stun`. Já a mordida
comum respeita a tontura (`enemies.ts:299`). Com `bossStun` de 0,1 s o efeito é pequeno, mas a regra do CLAUDE.md
("stuns, bosses only `bossStun`") passa a valer só para o andar. **Correção:** em `updateEnemies`, não chamar
`updateBoss` (ou chamar com `dt` 0) enquanto `e.stun > 0`, se a tontura deve mesmo segurar o chefe; senão,
documentar que ela não interrompe habilidades.

## 7. Comentários e nome de teste desatualizados · Info

- `src/data/weapons.ts:186`: a Lâmina diz "every third blow, a long thrust", mas `thrust.every: 2`.
- `src/data/weapons.ts:439`: a Fúria diz "every third blow a cutting wave", mas `wave.every: 2`. O teste
  `tests/core/eloEffects.test.ts:40` repete "every third blow" (o corpo usa `def.wave.every`, então passa).
- `src/core/world.ts:74`: doc órfã "Base weapons whose ready Elo was already announced this run." sobre
  `endless` (o campo foi removido junto com o aviso de Elo pronto).
- `src/core/meta.ts:496`: doc de `shopBonuses` solta acima da doc de `ShopCart`.
- `src/scenes/ShopScene.ts:180`: doc de `card()` solta acima de `greetingBanner`.
- `src/render/buildPanel.ts:30-31`: "a formed Elo a pulsing gold frame and a formed Elo a fixed gold frame" (sobra do
  estado "receita pronta", que não existe mais).
- `src/core/weapons.ts:183` e `:194`: `thrust` e `wave` dividem `w.swings`. Hoje nenhuma arma tem os dois, mas
  se tiver, o contador anda duas vezes por golpe. Vale um comentário ou contadores separados.

## 8. Código morto e um ponto frágil · Info

- `unlockedTitles` (`src/core/achievements.ts:197`): não é usado nem em teste.
- `weaponsCompletedBy` (`src/core/upgrades.ts:159`) e `elementOf` (`src/data/evolutions.ts:61`): só usados em teste.
- `addLink` (`src/core/effects.ts:89-95`) pega `bolts.active[length - 1]` depois de `addBolt`. Funciona porque
  `addBolt` não tem teto, mas se ganhar um (como `addPuff` tem), passa a transformar outro raio em elo. Mais
  simples: `addBolt` devolver o `Bolt`.

## 9. `playtest.unlockAll` sem teste · Info

`tests/core/characters.test.ts:30` e `:47` se chamam "playtest switch opens every hero/stage", mas testam
`config.unlockAllHeroes`/`unlockAllStages` e saem cedo (`if (!config...) return`). O interruptor do modo `?dev`
(`playtest.unlockAll`, `core/meta.ts:444`) não tem nenhum teste. Como os dois `config.unlockAll*` seguem `true`
(D-06), os testes da progressão normal (`it.skipIf`, `:35` e `:52`) ficam pulados: são 2 dos 4 "skipped" do
`npm test`. Com o `?dev` pronto (D-07), o motivo de manter os dois `config` ligados no jogo publicado sumiu. Fica para
o Daniel decidir no D-06. Enquanto isso, um teste que liga e desliga `playtest.unlockAll` (restaurando no
`finally`) cobre o caminho que o `?dev` usa.

## 10. Miudezas · Info

- `src/scenes/GameScene.ts:410`: `this.forest.forEach((f, i) => …)` em `placeView`, que roda todo quadro, cria uma
  closure por quadro na Estrada (regra de não alocar no laço). Trocar por `for`.
- `for…of` sobre pools no render a cada quadro (`GameScene.ts` `deathSparks`/`swingSparks`/`boltSparks`,
  `render/fx.ts:239-419`) e em `wardReady` (`core/elos.ts:118`, chamado a cada contato). O RT-02 trocou só os do
  core; o padrão do projeto é `for` indexado.
- `wisps` nível 4: só muda `pierce` (mostrado) e `lifetime`, que não tem rótulo em `t.weaponStats`, então a carta
  esconde metade da melhora. Os outros 90 níveis mostram tudo.
- `src/scenes/collection/elos.ts:146`: as aspas `“…”` da frase do Elo estão no código. Mover para
  `t.elos.quote(line)`.

## Lacunas de teste (lógica de jogo)

- Inimigo **dentro** da pancada do Quebra-Junta (achado 2).
- Mordida letal e cura no mesmo passo (achado 3).
- Eventos do baú que completa uma receita: ordem e `reward` (achado 4).
- Dois danos contínuos de força e duração diferentes (achado 5).
- Chefe tonto durante a investida (achado 6).
- `playtest.unlockAll` (achado 9).
- O registro na saída pela pausa durante a vigília (achado 1) é de cena. Para testar, extrair a escolha "bank ou
  bankVigil" para uma função pura.
