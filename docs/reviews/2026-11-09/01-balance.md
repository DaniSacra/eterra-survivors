# Revisão 2026-11-09 · Balanceamento (balance-tester)

Commit `3b9939c`. Nada em `src/`, `tests/` ou `docs/design/` foi alterado. Os scripts de medição ficam no scratchpad
da sessão (`.../scratchpad/t/*.test.ts`, rodados com `npx vitest run --config .../scratchpad/vitest.config.mjs
--silent=false <nome>`); as variantes de dados trocam valores de `WEAPONS` em tempo de execução, sem tocar em `src/data`.

## Como medi

| Medição                     | Comando / script                                                                                                                                                                                                                            | Resultado                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Lab                         | `npm run lab`                                                                                                                                                                                                                               | idêntico à tabela "Ajustes depois do teste do Daniel" (`balance-baseline.md`): maça 468 (93%), Quebra-Junta 1890 (4,0x), todas nas faixas |
| Sim, 3 perfis               | `SIM_SHOP=all npm run sim` (8 sementes) e `SIM_SHOP=all SIM_SEEDS=16 npm run sim` (576 corridas)                                                                                                                                            | 16 sementes idêntico à última linha do baseline (13/48/98, 0/17/81, 0/0/52): o sim é determinístico                                       |
| Antes do retrabalho da maça | `git archive 3621033` extraído no scratchpad, mesmo sim de 16 sementes                                                                                                                                                                      | base de comparação "antes" (escudos com empurrão 150, maça antiga)                                                                        |
| Lutas de chefe              | `SIM_SHOP=half SIM_RUNS=1 SIM_SEEDS=16 npm run sim`                                                                                                                                                                                         | duração da luta e mortes nela, por corrida                                                                                                |
| Noite Sem Fim               | `SIM_SHOP=full SIM_VIGIL=1 SIM_RUNS=1 npm run sim` (8 sementes, 96 corridas; o teste estoura os 600 s mas imprime tudo)                                                                                                                     | vigília por corrida, com e sem Quebra-Junta                                                                                               |
| Empurrão e DPS solo         | `t/push.test.ts`: um inimigo imortal, mundo congelado (o knockback continua valendo), 1 a 3 s                                                                                                                                               | px de deslocamento por arma; solo L1/Lmax                                                                                                 |
| Trava do Quebra-Junta       | `t/stunlock.test.ts`: Aldo parado, só a arma, recarga 0,55 e área 1,65 (Pressa e Alcance no máximo + Loja), vigília com 5 min, 120 s                                                                                                        | golpes recebidos por minuto                                                                                                               |
| Rajadas                     | `t/volleyproof.test.ts` (20 inimigos na tela + 0/100/300 fora, 40 sementes) e `t/volley.test.ts` (bot, Valmor e Cripta, 2–8 min)                                                                                                            | raios, espadas e manchas por disparo                                                                                                      |
| Verbos dos Elos             | `t/controlled.test.ts`: bot do sim com vida infinita, uma arma só, 2–8 min, 4 sementes; conta cura, proteção, almas, investida, bumerangue, estrelas, ricochete, estilhaço, chão em brasa, sangramento, pulsos, ondas, tremores, atordoados | todos acontecem, menos a investida da Vigília                                                                                             |
| Variantes                   | `t/variant.test.ts`: o sim com todos os heróis começando com a arma, 6 sementes, meia Loja e Loja inteira; `t/realdps.test.ts`: o sim inteiro de 16 sementes com uma troca de dados                                                         | números das sugestões                                                                                                                     |

O bot foge de tudo a menos de 200 px e só vira para o inimigo no quadro em que uma arma de mira dispara. Corpo a
corpo, auras e órbitas rendem menos no sim do que nas mãos de quem entra na multidão (já registrado no RE-03).

## Resumo

- **Alvos de fase: todos dentro** (16 sementes): Valmor 13% / 48% / 98% (morte sem Loja aos 6,5 min), Cripta
  0% / 17% / 81%, Estrada 0% / 0% / 52%. 1º Elo na mediana aos 5,6–5,7 min. Loja inteira = 57 corridas médias.
- **Bug grave novo**: o Quebra-Junta atordoa tudo em até ~250 px de novo antes de o atordoamento acabar. Com Pressa
  e Alcance no máximo o herói **não leva golpe nenhum**: 27 das 39 vigílias com Quebra-Junta bateram o teto de 30 min
  do sim; sem ele, nenhuma (mediana 2,3 min).
- **A maça nova rende 87 de DPS real no máximo, contra 129 antes do retrabalho** (mesmas 576 corridas, mesma
  métrica), a pior `aimed` (as outras 208–650). O Teo, que começa com ela, caiu de 56% para 31% em Valmor com meia
  Loja e é hoje o herói mais fraco nessa célula.
- **O empurrão dos escudos funciona** (60 px numa Ossada, 46 px num Esqueleto) e **não** é o que derruba o DPS deles:
  com o empurrão antigo (150) o DPS real dos escudos no máximo é 30, hoje 24; antes do retrabalho já era 21.
- Mais dois bugs de mecânica: rajadas de alvo aleatório (Raio, Tempestade, Fogo, Espada de Fogo, Geada, Nevasca)
  param no meio quando a maior parte dos inimigos está fora da tela, e a investida da Vigília quase nunca acontece.

---

## 1. Bugs

### B1 · Alta · Quebra-Junta trava todos os inimigos em volta: herói imortal na Noite Sem Fim

- **O que acontece**: `slamHit` renova o atordoamento em todo acerto (`src/core/weapons.ts:308-309`), e o
  Quebra-Junta acerta com a pancada, com a onda (todo golpe, `waveEvery: 1`) e com o tremor 0,3 s depois
  (`aftershock`, `src/core/weapons.ts:113-119` e `245-250`). A onda vai a 150 px x área (≈250 px com Alcance no
  máximo) e atordoa 0,5 s; com Pressa no máximo a recarga é 0,9 x 0,55 ≈ 0,5 s, e o tremor cobre o intervalo.
  Quem está atordoado não anda nem morde (`src/core/enemies.ts:216-219` e `299`). Resultado: nenhum inimigo
  chega ao herói, para sempre.
- **Prova 1 (vigília, `SIM_SHOP=full SIM_VIGIL=1 SIM_RUNS=1`, 96 corridas)**: 73 vitórias seguiram na vigília,
  média **877 s** (baseline: 243 s), 40 passaram de 5:00 (baseline: 9 de 36). Separando: **com Quebra-Junta, 27 de
  39 bateram o teto de 30 min do sim** (mediana 32 min, o teto), sempre com a vida cheia nos snapshots de 2 em 2 min
  e 700 inimigos vivos; **sem Quebra-Junta, 0 de 34** (mediana 2,3 min, 12 de 34 passam de 5:00, como antes).
  Antes do retrabalho (`3621033`, mesmo comando com 4 sementes) o Quebra-Junta já esticava a vigília (3 de 18 no
  teto, mediana 13,9 min), mas a onda em todo golpe virou a trava completa.
- **Prova 2 (`t/stunlock.test.ts`, vigília com 5 min, herói parado, 120 s)**: golpes recebidos por minuto:

  | Arma (recarga 0,55, área 1,65)                      | golpes/min      | inimigos vivos |
  | --------------------------------------------------- | --------------- | -------------- |
  | Quebra-Junta (`stun` 0,5, atual)                    | **0,0**         | 689            |
  | Quebra-Junta sem Pressa/Alcance (recarga 1, área 1) | 66,7            | 699            |
  | Maça L7                                             | 92,7            | 701            |
  | Fúria / Muralha / Chama de Yah                      | 109 / 105 / 102 | 470–675        |

  A causa é o atordoamento, não o empurrão: com `waveKnockback` 250, 400 ou com `waveEvery: 2` continua 0,0;
  com `stun` 0 vira 108,7; com `stun` 0,15, 76,7; com 0,3, 0,0.

- **Na partida normal** (indicativo, há viés de seleção): com meia Loja, quem forja o Quebra-Junta antes das 10:00
  vence 18/27 em Valmor e 8/14 na Cripta, contra 13/37 e 3/50 de quem não forja.
- **Correção (mecânica, implementador)**: só a pancada atordoa (a onda e o tremor só batem e empurram), **ou** quem
  acabou de sair do atordoamento fica imune por um tempo (por exemplo 1 s) e `slamHit` não renova um atordoamento em
  curso. Paliativo só com dados, se a mecânica esperar: `jointBreaker` `stun` 0.5 → **0.15** (lab 1890 → 1718, 86%
  da melhor Elo `aimed`, dentro da faixa; vigília 76,7 golpes/min). Medir de novo a vigília depois.

### B2 · Média · Rajadas de alvo aleatório param no meio quando os inimigos estão fora da tela

- **O que acontece**: `randomEnemyNear` (`src/core/projectiles.ts:110-120`) sorteia 12 vezes na lista **inteira** de
  inimigos ativos e desiste se nenhum sorteado está na tela; `fireStrike` e `fireZone` dão `break` na primeira falha
  (`src/core/weapons.ts:495-496` e `475-476`) e o resto da rajada se perde. Nas corridas do bot só 7% a 20% dos
  inimigos vivos estão na tela (o anel de nascimento fica fora dela), então cada sorteio falha em até ~40% das vezes.
- **Prova (`t/volleyproof.test.ts`, 20 inimigos na tela, 40 sementes, um disparo)**:

  | Arma                                    | 0 fora da tela | 100 fora | 300 fora |
  | --------------------------------------- | -------------- | -------- | -------- |
  | Espada de Fogo (7 espadas)              | 7,00           | 4,58     | **2,30** |
  | Nevasca (5 manchas)                     | 5,00           | 3,48     | **1,32** |
  | Tempestade (8 raios + elos da corrente) | 19,15          | 9,55     | **6,03** |

  Nas corridas do bot (Valmor, 2–8 min): Raio L7 2,2 de 4 raios, Espada de Fogo 2,9 de 7, Nevasca 2,4 de 5, Geada
  L7 2,0 de 3, Fogo L7 2,0 de 3.

- **Efeito**: as armas de muitos alvos perdem mais que as de poucos, o que ajuda a explicar a **Tempestade com ELO X
  1,2x** (a única Elo abaixo de 2,5x no sim de 16 sementes; o lab dá 4,2x). Com uma varredura de reserva (mock de
  `randomEnemyNear`, 8 sementes, Loja inteira, Cripta): Tempestade real 716 → 1199, Espada de Fogo 615 → 1361
  (vitórias dentro do ruído).
- **Correção (mecânica)**: quando os sorteios falham, varrer a lista a partir de um índice sorteado (ou trocar o
  `break` por `continue` com mais tentativas). Depois, medir de novo a Tempestade e reajustar a faixa `auto` no lab
  se o sim subir demais.

### B3 · Média · A investida da Vigília quase nunca acontece

- **O que acontece**: `sweepOrbit` mira no inimigo mais próximo e, se ele está dentro do círculo, `aimReach` = 0
  (`src/core/weapons.ts:437-443`). Na multidão quase sempre há alguém a menos de 105 px, então as espadas não
  avançam. O teste de unidade (`tests/core/eloEffects.test.ts:186`) usa um inimigo sozinho fora do círculo, por isso
  passa.
- **Prova (`t/controlled.test.ts`, bot, 2–8 min, 4 sementes)**: `aimReach > 0` em **6%** dos passos com o bot,
  **0%** com o herói parado ou indo para cima dos inimigos.
- **Correção (mecânica)**: mirar no inimigo mais próximo **fora** do círculo (entre `orbitR` e `orbitR + reach`),
  que é o que o texto promete ("avançam até o inimigo mais perto e voltam").

### B4 · Baixa · Dois empurrões prometidos que não aparecem

Medido com `t/push.test.ts` (inimigo sem resistência; o Esqueleto tem 0,6 e anda menos da metade):

| Arma                   | knockback | px empurrado           | Texto                                        | Sugestão (`data/weapons.ts`)                        |
| ---------------------- | --------- | ---------------------- | -------------------------------------------- | --------------------------------------------------- |
| Martelo do Gaspar (L7) | 260       | **26**                 | "atravessa e empurra longe" (`pt-BR.ts:567`) | `hammer` `knockback` 260 → **500** (~50 px)         |
| Chama de Yah, onda     | 320       | **31** (Esqueleto ~12) | "empurra tudo para longe" (`pt-BR.ts:585`)   | `yahFlame` `pulse.knockback` 320 → **650** (~60 px) |

### B5 · Baixa · Textos com o ritmo errado

- Lâmina: "A cada três golpes, uma estocada" (`src/i18n/pt-BR.ts:551`), mas `thrust.every` é 2
  (`src/data/weapons.ts:190`). Fúria: "a cada terceiro golpe, solta uma onda" (`pt-BR.ts:577`), mas `wave.every` é 2
  (`weapons.ts:442`). Os comentários em `weapons.ts:186` e `439` repetem o "terceiro". Trocar para "a cada dois
  golpes" / "a cada segundo golpe".
- `config.weapons.slamImpact` (`src/data/config.ts:126`) não é lido em lugar nenhum desde o retrabalho da maça
  (`SMASH_AHEAD` em `core/weapons.ts:230` faz esse papel). Remover.

---

## 2. Desequilíbrios

DPS real = `REAL DPS` do sim de 16 sementes (576 corridas), arma no máximo por pelo menos 30 s; "antes" = commit
`3621033`, mesmo sim.

| Arma / item                         | Medido                                                                                                                                                                                   | Esperado                                      | Sugestão em `src/data`                                                                                                                   | Por quê                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Maça de Ferro**                   | real L7 **87** (antes 129); outras `aimed` 208–650; solo Lmax 83 (a menor `aimed`), solo L7/L1 3,2x; o bot acerta alguém em 62% das pancadas fugindo; Teo meia Loja Valmor 56% → **31%** | perto das outras `aimed` no sim; Lmax 4–8x L1 | `mace` `radius` L1–L7 48/48/52/52/56/56/60 → **60/60/65/65/70/70/75** e `damage` x0,75 (27/34/34/43/43/54/70 → **20/26/26/32/32/41/53**) | o que falta é alcance, não dano: a pancada cobre 33 px atrás e ~93 px à frente. Lab 468 → 455 (91%, na faixa). Variante (todos começam com a maça, 6 sementes): meia Loja Valmor 9 → 13/24, Loja inteira Valmor 22 → 24/24, Cripta igual. Só raio maior (sem cortar dano) dá 601 no lab, fora da faixa                                                                                |
| **Quebra-Junta** (fora a B1)        | real 402 (antes 574); ELO X 4,5x                                                                                                                                                         | ≥ 2,5x                                        | nada além da B1                                                                                                                          | rende bem sobre a maça; a queda acompanha a base                                                                                                                                                                                                                                                                                                                                      |
| **Tempestade**                      | ELO X **1,2x** (Raio L7 813 real, Tempestade 854)                                                                                                                                        | ≥ 2,5x                                        | primeiro a B2; se continuar abaixo de 2x, `storm` `chain.count` 2 → 3                                                                    | a rajada de 8 perde mais que a de 4 (B2)                                                                                                                                                                                                                                                                                                                                              |
| **Escudos de Valmor / Muralha**     | real **24** e **184** (as menores entre bases e Elos); com o empurrão antigo 30 e 192; antes do retrabalho 21 e 214                                                                      | faixa `area` (40–55% no lab)                  | nenhuma por enquanto                                                                                                                     | o empurrão custa ~20% do DPS e compra pouca sobrevivência (Cripta Loja inteira 53 → 52/64 com 150 → 600). Dobrar o dano dá +3 a +4 vitórias em 24 na variante, mas leva o lab a 460 (92%), fora da faixa: o lab usa alvos que não se movem, então não mede arma que empurra. Decisão do diretor: medir a faixa das armas de empurrão com knockback, ou aceitar os escudos como defesa |
| Aura de Yah / Espadas dos Paladinos | real 45 / 49 (Geada 481)                                                                                                                                                                 | faixa `area`                                  | nenhuma                                                                                                                                  | o bot não entra na multidão (RE-03); não repetir o ajuste por esse número                                                                                                                                                                                                                                                                                                             |
| Fúria / Estrela de Lyra             | ELO X 2,6x / 2,9x                                                                                                                                                                        | ≥ 2,5x                                        | nada                                                                                                                                     | no limite; olhar de novo depois da B2 e da maça                                                                                                                                                                                                                                                                                                                                       |
| Luta do chefe                       | mediana 13 s (Loja inteira) e 16 s (meia); em Valmor com meia Loja, **18 das 49** corridas que chegam ao chefe morrem 4 a 22 s depois dele nascer (chefe com 18% a 48%)                  | —                                             | nenhuma agora                                                                                                                            | a luta é uma corrida de DPS de ~15 s e se decide com a onda das 9:00 ainda em campo. Pergunta já aberta na "Rodada UI e features" do backlog (chefe que cai rápido)                                                                                                                                                                                                                   |
| Heróis fora de 20 pontos            | Lyra Valmor meia Loja 69% (fase 48%); Aldo Estrada Loja inteira 31% (fase 52%); Andilla Cripta Loja inteira 100% (fase 81%)                                                              | ±20 pontos                                    | nenhuma isolada                                                                                                                          | ruído de ±12 pontos com 16 corridas por herói; a maça (Teo) é o desvio com causa clara                                                                                                                                                                                                                                                                                                |
| Badalada (bomba)                    | 250 de dano fixo; o Encapuzado tem 253 a 304 de vida na Estrada a partir das 8:00, o Esqueleto 450–540 em Valmor, a Gosma 608–729 na Cripta                                              | matar o básico até o fim                      | `config.pickups.bombDamage` 250 → **600**                                                                                                | o item some de importância no fim da partida; 600 mata todo básico e rápido das três fases até as 10:00                                                                                                                                                                                                                                                                               |
| Curva                               | maior degrau de vida/segundo gerada: 3:00 → 4:00 (x3,3 em Valmor) e 5:00 → 6:30 (x2,1 a x2,5), com dano de contato x1,5                                                                  | —                                             | nenhuma                                                                                                                                  | as metas de morte (Valmor sem Loja 6,5 min, Cripta 3,5, Estrada 1,6) batem; só registrar                                                                                                                                                                                                                                                                                              |

DPS solo no nível 1 (meta antiga 6–12): Lâmina 33, Adagas 40, Cajado 37, Maça 26, Raio 23, Martelo 20 acima;
Espadas 3,4 e Escudos 3,8 abaixo. Solo Lmax/L1 abaixo de 4x: Raio 2,6x, Geada 3,1x, Maça 3,2x, Aura 3,4x, Fogo
3,4x. As faixas da multidão estão todas certas; esses números são só referência.

---

## 3. Ok

- **Alvos de fase x Loja** (16 sementes): os nove dentro da meta, iguais à última linha do baseline.
- **Lab**: todas as bases e Elos dentro das faixas; Elos de 3,8x a 4,6x a base.
- **Verbos dos Elos acontecem** (`t/controlled.test.ts`, 2–8 min): Luz Sagrada cura ~4 de vida/s (o teto); Muralha
  segura um golpe a cada 10 s (34 a 44 em 6 min); Procissão fica nas 4 almas extras; Fúria da Forja volta (1446
  bumerangues); Estrela de Lyra solta as estrelinhas; Leque ricocheteia (~7500 pulos) e deixa ~15 inimigos
  sangrando; Nevasca estilhaça (~5400); Espada de Fogo deixa ~3100 chãos em brasa e ~145 inimigos queimando; Chama
  de Yah pulsa a cada 3 s; Quebra-Junta solta onda em todo golpe e o tremor depois (800 e 400 em 6 min) e esmaga
  atordoados. Só a investida da Vigília falha (B3).
- **Empurrões que funcionam**: Escudos 60 px (Esqueleto 46), Muralha 75 px, onda da Maça 69 px, Quebra-Junta 80 px
  por onda, Fúria da Forja 79 px. A pancada da Maça empurra 22 px, de propósito ("um pouco").
- **Atordoamento**: a maça atordoa 0,4 s, o chefe só 0,1 s (`bossStun`); a maça não trava ninguém (92,7 golpes/min
  na vigília).
- **Defesas**: armadura corta até `minDamage` 2 (Aldo com 4 já leva 2 dos básicos até os 3:00; com 12, só Esqueleto,
  Gosma, Lobo e o fim da curva passam de 2); Segunda Chance, comida, ímã, congelamento cobertos pelos testes.
- **Economia**: Loja inteira = 57 corridas médias (meta 40–60); 2º herói depois de 2 corridas do Aldo em Valmor;
  ouro por corrida sem Loja 254 / 88 / 48, meia 667 / 630 / 330, inteira 982 / 1563 / 1756.
- **Elos**: 1º Elo na mediana aos 5,6–5,7 min com Loja (90% das corridas com Loja inteira); 2,0 e 4,5 por corrida.
- **Cartas**: o baralho fica sem 3 cartas em 39% das corridas, por volta do nível 58; as recompensas preenchem.
- **Conquistas**: dano por partida ≥ 750 mil em 52% das vitórias, golpe ≥ 250 em 46%, chefe em ≤ 15 s em 57%.
- **Noite Sem Fim sem Quebra-Junta**: mediana 2,3 min, 12 de 34 passam de 5:00 (Até o Amanhecer), parecido com o
  baseline (9 de 36).
- **Lab**: a Aura de Yah mostra 0 de DPS em multidão no L1 porque a grade começa a 64 px e a aura tem 55; no jogo os
  inimigos encostam a ~23 px. É do lab, não da arma.
