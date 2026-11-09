# Revisão de efeitos visuais (vfx-director)

- Data: 2026-11-08 · commit `16d126a` · só revisão, nada foi implementado.
- Método: li `render/fx.ts`, `render/decals.ts`, `render/art/items.ts`, `scenes/GameScene.ts`, `data/weapons.ts`,
  `core/weapons.ts`, `core/zones.ts`, `core/effects.ts`, `core/enemies.ts`, `core/bosses.ts`, `core/behaviours.ts`,
  `core/pickups.ts`, `core/xp.ts`. Rodei o jogo em `localhost:4177` com Playwright a 420 x 820 e capturei, para cada
  arma (L1, L7 e Elo), uma rajada de 6 quadros a cada ~90 ms com 100 inimigos em volta do herói, além de quadros
  congelados no instante exato de cada raio e golpe, os três telegraphs de chefe, investida, Sopro de Geada, baú,
  Badalada e subida de nível.
- Capturas (scratchpad, fora do repo):
  `/tmp/claude-1000/-home-dani-games-eterra-survivors/470e035a-3810-4b29-b6ff-5c2763c5683c/scratchpad/vfx/`
  (folhas `sheet-*.png` com base, L7 e Elo lado a lado; zooms `z-bladefury.png`, `z-elun.png`, `z-bolts.png`,
  `z-boss.png`, `z-misc.png`).
- Já feito e por isso fora desta lista: A-06 (acabamento de golpes, Geada e raio), A-07 (Elos com cor própria), A-14
  (puff de morte, brilho de coleta, pulso de nível, fade), E-07 (telegraphs dos chefes), A-04 (números de dano).
  Esta revisão vai um passo além deles: o efeito **explicar a mecânica** (onde, quando, quem, o que mais, quão forte).
  L-01 (medição em celular real) segue aberto e vale para todas as propostas.

## Ranking por impacto

| #   | Item                                                                                                  | Onde                                        | Custo                   | Core                            |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------- | ------------------------------- |
| 1   | Acerto: tinta vermelha na multidão vira flash branco + faísca do tipo da arma                         | `GameScene.ts:151`, `fx.ts:65`              | baixo                   | opcional: `Enemy.hitKind`       |
| 2   | Aura de Yah e Chama de Yah: pulso de luz sincronizado com o tick de dano                              | `fx.ts:125-148`                             | baixo                   | nenhum (`OwnedWeapon.timer`)    |
| 3   | Golpes em arco estáticos; Fúria é um disco bege                                                       | `fx.ts:20-26`, `fx.ts:183-208`              | baixo (troca, não soma) | nenhum (`slash.ttl`)            |
| 4   | Fogo e Espada de Fogo: um risco reto e um disco opaco por cima dos inimigos                           | `fx.ts:214-221`, `fx.ts:231-232`            | baixo                   | nenhum                          |
| 5   | Baú, Sopro de Geada e Badalada: flash de tela inteira opaco                                           | `GameScene.ts:331`, `GameScene.ts:339-342`  | baixo                   | nenhum                          |
| 6   | Luz de Elun e Luz Sagrada quase invisíveis (sem rastro, brancas sobre esqueletos brancos)             | `items.ts:89-90`, `GameScene.ts:102-108`    | baixo                   | nenhum                          |
| 7   | Raio e Tempestade: zigue-zague sempre igual, disco cáqui por cima, sem impacto                        | `fx.ts:222-232`                             | baixo                   | nenhum                          |
| 8   | Mortes parecem bolhas de sabão; elite e chefe morrem igual a um morcego                               | `fx.ts:172-178`, `world.ts:203`             | médio                   | nenhum (raio do puff)           |
| 9   | Aviso de chefe usa o mesmo laranja do fogo do jogador                                                 | `fx.ts:82-83` vs `fx.ts:29`, `fx.ts:55-56`  | zero                    | nenhum                          |
| 10  | Órbitas sem rastro; halo da Vigília marrom e maior que o hitbox                                       | `fx.ts:149-164`                             | baixo                   | nenhum                          |
| 11  | Geada e Nevasca: aparecem do nada, tick invisível                                                     | `fx.ts:105-122`                             | baixo                   | nenhum (`z.tick`, `z.duration`) |
| 12  | Congelado e lento: só uma tinta; o fim do congelamento não avisa                                      | `GameScene.ts:139`, `GameScene.ts:151-153`  | zero                    | nenhum                          |
| 13  | Investida de inimigos comuns sem marca no chão; impacto do Corte Brutal e Ossadas surgindo sem efeito | `GameScene.ts:145`, `fx.ts:241-250`         | baixo                   | nenhum                          |
| 14  | Martelo não gira; Adagas sem rastro e sem a cor de Andilla                                            | `GameScene.ts:105-106`, `items.ts:91-94`    | baixo                   | nenhum                          |
| 15  | Sinos não balançam nem badalam                                                                        | `fx.ts:340-358`                             | baixo                   | nenhum                          |
| 16  | Coleta de gema invisível; pulso de nível escondido pelo overlay                                       | `fx.ts:178-181`, `GameScene.ts:260-271`     | baixo                   | nenhum                          |
| 17  | Elites e baú no chão sem destaque de "recompensa"                                                     | `GameScene.ts:84-92`                        | baixo                   | nenhum                          |
| 18  | Cores de assinatura dos heróis ausentes nas armas próprias                                            | `fx.ts:18-26`, `fx.ts:52`, `items.ts:89-91` | zero                    | nenhum                          |

Uma infraestrutura serve a vários itens (1, 4, 7, 8, 14): um **pool de faíscas no render**
(`render/sparks.ts`, array fixo de ~96 entradas `{x, y, vx, vy, ttl, color, kind}` criado uma vez, com teto rígido e
metade do teto no modo calmo), desenhado no `fxTop` dentro de `drawFx`. Ele é alimentado só por leitura do estado:
inimigos cujo `flash` acabou de ser posto (`e.flash > hitFlash - dt`), puffs novos, raios novos (`b.ttl` perto de
`boltTtl`). Nada no core, nenhuma alocação por quadro.

---

## Arma por arma

Para cada uma: **faz** (dados e função de disparo), **hoje** (o que a captura mostra), **deve mostrar**, **custo**.

### Lâmina de Valmor (`blade`, arco, assinatura de Aldo) e Fúria (`fury`)

- **Faz**: `fireArc` (`core/weapons.ts:108-137`) acerta tudo num leque à frente (`arc` 2.5 rad, alcance 85 a 112),
  com empurrão 140; no L3 também atrás (`swings: 2`). Fúria: círculo inteiro, alcance 125, dano 60, a cada 0.65 s.
- **Hoje**: uma fatia translúcida branco-azulada que só some em 0.18 s (`fx.ts:183-208`). Não varre: aparece inteira
  e desbota, então não se lê a direção do golpe. No L7 os dois golpes de 3 rad formam um disco com duas fendas
  (`z-bladefury.png`, 1º quadro). A Fúria, com `[0xffe8a0, 0xffa040]` em três camadas sobre o chão azul, vira um
  **disco bege-amarronzado parado** (`z-bladefury.png`, 4º quadro): nada de "girar a lâmina".
- **Deve mostrar**: um **corte que varre**. Com `t = 1 - s.ttl/slashTtl`, a borda brilhante (linha branca + borda
  colorida) anda de `a0` até `a1` em t 0 a 0.5, deixando atrás um rastro em gradiente que encolhe (2 fatias, não 3).
  Uma lua crescente fina e nítida lê melhor que um leque cheio. Borda em âmbar de Aldo (`HERO_COLOR.aldo`) por ser a
  arma própria dele. O golpe de trás pode usar o mesmo varrer espelhado. **Fúria**: uma lâmina que dá uma volta
  inteira em 0.18 s (a borda gira 2π) com rastro dourado quente e o centro sem preenchimento (anel, não disco), mais
  4 a 6 faíscas douradas saindo pela tangente. É transformação, não cópia maior.
- **Custo**: igual ou menor que hoje (2 fatias e 2 arcos em vez de 3 fatias e 2 arcos). Nenhum dado novo.

### Maça de Ferro (`mace`) e Quebra-Junta (`jointBreaker`)

- **Faz**: arco mais lento e estreito (1.4 s, `arc` 2.1, empurrão 230); Quebra-Junta frente e trás, empurrão 320,
  dano 75.
- **Hoje**: o mesmo leque da Lâmina em cinza (`fx.ts:24-25`). Peso nenhum.
- **Deve mostrar**: o que diferencia a maça é **o baque e o empurrão**. Varrer mais curto e mais largo no fim
  (antecipação), e no fim do arco um **anel de choque no chão** (no `ground`) do raio do golpe, abrindo para fora:
  "empurra". Poeira/neve: 3 a 4 círculos baixos na borda. Quebra-Junta: as mesmas ondas mais **rachaduras** curtas
  no chão nas duas pontas, e estrelinhas de "crec" nos inimigos acertados (faíscas tipo estrela).
- **Custo**: 1 anel + até 4 círculos por golpe, um golpe por segundo. Nada no core.

### Aura de Yah (`yahAura`, aura) e Chama de Yah (`yahFlame`)

- **Faz**: `fireAura` (`core/weapons.ts:265-279`) dá dano a todos dentro de `radius` (55 a 90; Chama 125) a cada
  `cooldown` (0.5 a 0.35 s; Chama 0.3). Não empurra. O tick fica em `OwnedWeapon.timer` (`core/weapons.ts:80`):
  o render já sabe a fase do tick sem nada novo.
- **Hoje**: um círculo plano dourado com alpha oscilando por `sin(time * 6)` (`fx.ts:127`), **desligado do tick**
  (período ~1 s contra ticks de 0.35 a 0.5 s). No L1 a multidão cobre o círculo e o único sinal de dano é a turma
  inteira ficando vermelha ao mesmo tempo (`sheet-aura-l1.png`, linha 1). A Chama é um disco rosado com triângulos na
  borda: lê como "serra", não como fogo (`sheet-aura-l1.png`, linha 3).
- **Deve mostrar** (o exemplo do Daniel):
  - fase `k = 1 - w.timer / (s.cooldown * p.stats.cooldown)` (0 no tick, 1 antes do próximo);
  - **núcleo**: 3 discos concêntricos (r 0.35, 0.6, 1.0) de alpha decrescente (0.18, 0.10, 0.05), quente no centro,
    para virar luz macia e não uma moeda;
  - **onda**: a cada tick um anel sai de 0.3 r até **exatamente r** em k 0 a 0.45, alpha 0.7 a 0, espessura 4 a 1;
    o player sente o ritmo e vê o limite real;
  - **borda**: traço fino que acende (alpha 0.9) no instante do tick e descansa em 0.35;
  - **motes**: 5 (L1) a 8 (L7) pontinhos de luz subindo dentro do raio, posições determinísticas por `i` e `time`
    (sem pool);
  - **quem foi atingido**: inimigos dentro de `r` com `flash > 0` ganham um brilho dourado (faísca em cruz pequena)
    em vez do vermelho (ver item 1).
  - **Chama de Yah**: mesma estrutura, mas núcleo branco-quente, onda em laranja, a borda vira **línguas de fogo
    arredondadas** (gotas que sobem, não triângulos para fora) e **brasas** subindo e sumindo; alpha do disco grande
    baixo (0.08), porque 125 px cobre muita gente.
- **Custo**: ~6 primitivas a mais por quadro (L1) e ~14 (Chama). Zero no core.

### Luz de Elun (`elunLight`, teleguiado, assinatura de Teo) e Luz Sagrada (`holyLight`)

- **Faz**: `fireHoming` (`core/weapons.ts:139-163`): 2 a 5 luzes (Luz Sagrada 6) que viram até `turnRate` rad/s
  rumo ao inimigo mais próximo, atravessam `pierce` alvos (0 a 2; Luz Sagrada 4), vivem 2.5 a 3 s.
- **Hoje**: `glowOrb` de raio 4 (Luz Sagrada 5) em creme e branco (`items.ts:89-90`). Num campo de esqueletos
  brancos elas **somem**: nas capturas de L7 quase não se acha uma (`z-elun.png`, 1º quadro). Sem rastro, não se vê
  a curva de busca nem o "atravessou".
- **Deve mostrar**: um **rastro curto** (duas linhas de alpha decrescente atrás de `p.angle`, comprimento ~ velocidade
  x 0.05 s) que deixa ver a curva; halo em verde-dourado de Teo (`HERO_COLOR.teo`) para separar dos esqueletos;
  ao atravessar, faísca em cruz. Luz Sagrada: rastro branco com brilho dourado, núcleo um pouco maior e uma
  estrelinha girando no centro, um "enxame" que se lê como Elo.
- **Custo**: 2 linhas por projétil teleguiado (no máximo dezenas). Os projéteis são `Image` (`GameScene.ts:102-108`);
  o rastro vai no `fxTop` lendo `world.projectiles.active`. Nada no core.

### Fogos-Fátuos (`wisps`) e Procissão das Almas (`soulProcession`)

- **Faz**: teleguiados lentos (170 a 210), vida longa (4 a 6 s), atravessam 1 a 4.
- **Hoje**: a chaminha deitada (`items.ts:41-64`) é a melhor arte de projétil do jogo, mas também sem rastro.
- **Deve mostrar**: rastro ondulante ciano (3 pontos que seguem a cabeça com atraso, desenhados como círculos
  decrescentes) e uma leve oscilação vertical. Procissão: os pontos de rastro mais longos e azulados, para virar a
  "fila de luzes" do nome.
- **Custo**: 3 círculos por projétil. Prioridade baixa.

### Adagas de Andilla (`daggers`, arremesso, assinatura de Andilla) e Leque de Facas (`fan`)

- **Faz**: `fireThrown` (`core/weapons.ts:165-186`): 2 a 4 facas rápidas (460) no inimigo mais próximo, em leque de
  0.14 rad, atravessando 1 a 3. Leque: 10 facas em círculo, a cada 0.55 s.
- **Hoje**: facas prateadas pequenas, sem rastro, legíveis só de perto (`z-elun.png`, 4º quadro). O Leque se lê bem
  como anel rosado (`z-elun.png`, 5º quadro).
- **Deve mostrar**: um **traço de velocidade** fino atrás de cada faca em vermelho de Andilla, e um brilho no punho
  na saída (para ver o arremesso). No Leque, um anel rápido saindo da heroína no disparo, do raio da primeira faca.
- **Custo**: 1 linha por faca (até ~30). Nada no core.

### Martelo do Gaspar (`hammer`) e Fúria da Forja (`forgeFury`)

- **Faz**: arremesso na direção do movimento, lento (260), pesado, atravessa 3 a 5 (Fúria da Forja infinito),
  empurrão 260 a 400.
- **Hoje**: o martelo voa **parado**, apontado para a frente (`GameScene.ts:106` aplica só `p.angle`). Fúria da
  Forja é o mesmo martelo laranja com halo.
- **Deve mostrar**: o martelo **girando** (rotação `p.angle + time * 14` só para sprites de martelo; um mapa
  `SPIN[sprite]` pré-calculado, sem string por quadro), e um rastro grosso em arco que mostra o "atravessa fileiras".
  Fúria da Forja: rastro de **brasas** caindo atrás e um anel de calor nos acertos.
- **Custo**: zero para o giro; 1 arco por martelo.

### Espadas dos Paladinos (`paladinSwords`, órbita) e Vigília dos Quatro (`vigil`)

- **Faz**: `sweepOrbit` (`core/weapons.ts:193-219`): 1 a 4 espadas giram (raio 70 a 82, 3 a 4 rad/s) e acertam ao
  tocar, com espera `cooldown` por inimigo.
- **Hoje**: espadinhas bonitas (`fx.ts:300-338`), mas **sem rastro**: com 3.5 rad/s quase não se percebe o giro
  numa foto, e no meio da multidão elas somem (`sheet-swords-l1.png`). A Vigília pinta um disco `style.dark` 0xe8b840
  a 0.35 em cada espada (`fx.ts:161`) que sobre o chão azul vira **marrom-oliva sujo**, e com raio `r * 1.5` (27 px)
  fica **maior que o hitbox** (18 px), contra a regra "nunca maior que o hitbox".
- **Deve mostrar**: atrás de cada espada um **arco de rastro** (traço do mesmo círculo da órbita, ~0.6 rad atrás da
  lâmina, alpha 0.5 a 0) em aço claro: explica "gira e corta". Vigília: tirar o disco marrom; pôr um brilho branco e
  dourado do tamanho exato do hitbox, o círculo guardado como anel fino dourado com 4 marcas (os quatro paladinos) e
  o rastro mais longo e dourado. Faísca de aço quando um inimigo é tocado (item 1).
- **Custo**: 1 arco por espada (até 6). Troca o disco por um anel: igual ou menor.

### Sinos de Bronze (`bells`) e Dobre Fúnebre (`funeralToll`)

- **Faz**: órbita larga e lenta (110 a 140, 1.6 a 2.2 rad/s), empurrão alto (260 a 320).
- **Hoje**: sinos parados, sempre de boca para baixo (`fx.ts:340-358`).
- **Deve mostrar**: sinos **balançando** como pêndulo (inclinação `sin(time * 5 + i)`, desenho já é procedural) e,
  a cada `cooldown` da arma, um **anel de som** curto saindo de cada sino até o seu hitbox: o "dong" que empurra.
  Dobre Fúnebre: anéis duplos, mais escuros e dourados, e um anel grande no círculo guardado a cada volta completa.
- **Custo**: 1 anel por sino em parte do tempo. Fase do anel a partir de `world.time % cooldown` (não precisa saber
  o acerto real).

### Geada de Valmor (`frost`, zona) e Nevasca (`blizzard`)

- **Faz**: `fireZone` + `updateZones` (`core/zones.ts:52-70`): manchas de raio 45 a 60 (Nevasca 75) sobre inimigos ao
  acaso, dano a cada `config.zones.tick` (0.5 s) e lentidão. `z.tick` (próximo tick) e `z.duration - z.ttl` (idade)
  já existem.
- **Hoje**: círculo azul com borda branca e 3 a 6 cristais girando (`fx.ts:105-122`): bom acabamento (A-06), mas a
  mancha **surge pronta** e o tick só aparece como todo mundo dentro ficando vermelho (`sheet-frost-l1.png`, L7,
  3º quadro). Nevasca: discos brancos a 0.34 muito claros que, com 4 zonas de 75 px, lavam boa parte da tela.
- **Deve mostrar**: **pouso** (idade < 0.15 s: anel que abre de 0 a r e 6 lascas de gelo voando para fora);
  **tick** (`z.tick` perto de 0.5): um anel de geada percorrendo de dentro para fora e os cristais dando um pulso;
  **fim**: a borda se parte em segmentos antes de sumir. Nevasca: flocos caindo dentro da zona (6 pontos
  determinísticos por `time`), fundo menos opaco (0.22) e a borda azul forte que já tem.
- **Custo**: ~3 primitivas por zona (até 16 zonas). Nada no core.

### Raio de Lyra (`lightning`, golpe do céu, assinatura de Lyra) e Tempestade (`storm`)

- **Faz**: `fireStrike` (`core/weapons.ts:235-260`): 1 a 4 raios (Tempestade 6), o primeiro no inimigo mais
  próximo, dano em raio 24 a 32 (Tempestade 44), instantâneo; `addBolt` só desenha.
- **Hoje**: dois segmentos com **sempre o mesmo desenho** (`fx.ts:227-228`, deslocamentos fixos +8 e -6) e um disco
  `0xfff6a0` a 0.4 **no `top`**, por cima dos inimigos, que sobre o azul fica cáqui (`z-bolts.png`). Nenhum clarão de
  impacto. Tempestade é a mesma coisa em lilás e mais grossa. A cor é amarela, não a de Lyra.
- **Deve mostrar**: zigue-zague de 3 a 4 vértices variando por `b.x`/`b.y` (hash simples, sem alocar); no primeiro
  quadro (t > 0.8) um **clarão** branco pequeno e 4 a 6 faíscas saindo; a área de dano no **chão** (`ground`),
  como marca queimada que some, e não um disco sobre os inimigos. Borda roxa de Lyra (`HERO_COLOR.lyra`) no
  contorno do raio, núcleo branco. **Tempestade**: raio com 1 a 2 galhos laterais, sombra de nuvem elíptica no chão
  sob cada ponto, e um leve escurecer azul de tela que acompanha as rajadas (desligado no modo calmo).
- **Custo**: +2 segmentos por raio e as faíscas do pool. Tirar o disco do `top` alivia a leitura.

### Fogo (`fire`, golpe do céu) e Espada de Fogo (`fireSword`)

- **Faz**: igual ao Raio, menos chamas e área maior (40 a 56; Espada 58).
- **Hoje**: um **risco reto diagonal** (`fx.ts:219`) que parece um bastão, mais **dois discos** (`core` a 0.5 e cor a
  0.4) no `top` que **escondem os inimigos** (`z-bolts.png`, linha 2). A Espada de Fogo, "chuva de espadas
  ardentes", não tem espada nenhuma: é o mesmo risco, em vermelho.
- **Deve mostrar**: uma **bola de fogo** caindo (gota com cauda: círculo + triângulo, t 1 a 0.6), depois **explosão
  de chamas** no chão (pétalas arredondadas em anel até o raio exato, no `ground`), brasas subindo e anel de
  fumaça clara. **Espada de Fogo**: reusar `drawSword` (`fx.ts:300`) com cores de fogo, apontando para baixo, caindo
  e **cravando** no centro, com a explosão de chamas em volta; a espada fica cravada até o fim do `ttl`.
- **Custo**: parecido com hoje; o disco opaco sai do `top`. Nada no core (se a espada cravada precisar durar mais que
  0.22 s, basta um `ttl` maior por arma no render, sem mexer no dano).

---

## Acertos

- **Faz**: `damageEnemy` (`core/enemies.ts:109-128`) põe `e.flash = 0.1`, soma empurrão e conta `tally.hits`.
- **Hoje**: `setTint(TINT.hit)` vermelho (`GameScene.ts:151`, `fx.ts:65`) mais um tremor de rotação. Quando a aura,
  a geada ou a Fúria batem em 30 inimigos de uma vez, **a multidão inteira fica vermelha** (`sheet-aura-l1.png`,
  `sheet-frost-l1.png`): parece perigo ou sangue, apaga o tom fofo, e esconde o "lento" azul (a tinta de acerto tem
  prioridade). Nenhuma faísca, nada que diga qual arma acertou nem quão forte.
- **Deve mostrar**:
  - **flash branco** curto (`setTintFill(0xffffff)` nos primeiros ~0.05 s do `flash`, depois a tinta de status), o
    padrão do gênero, fofo e legível sobre qualquer cor;
  - **squash** de impacto (escala 1.15 x 0.85 decaindo com `flash`) no lugar do tremor de rotação, na direção do
    empurrão (`kbx`, `kby` já existem);
  - **faísca** do pool de faíscas, tamanho pelo dano (dá para inferir pelo `strong` do número de dano ou pelo tipo):
    estrela branca (corte), cruz dourada (luz), floco (gelo), brasa (fogo). Teto de ~24 faíscas novas por quadro.
- **Core mínimo (opcional)**: `Enemy.hitKind: number` (índice do `WeaponKind`, ou -1) escrito em `damageEnemy`: uma
  atribuição, sem alocação, com teste em `tests/core/enemies.test.ts`. Sem ele, o render já consegue a cor certa para
  aura e zonas por posição; com ele, toda arma acerta na sua cor.

## Mortes

- **Hoje**: `addPuff(..., 'death')` (`world.ts:203`) desenha um círculo cinza translúcido crescendo com um ponto de
  brilho (`fx.ts:172-178`): parece **bolha de sabão** sobre as gemas. Elite (que solta baú) e chefe morrem com o
  mesmo efeito, só maior. Na vitória não há momento nenhum: o chefe some e 900 ms depois abre o fim
  (`GameScene.ts:344-351`).
- **Deve mostrar**: puff de desenho animado: 3 nuvenzinhas que se espalham e encolhem (posições por `f.x`), um
  "pop" branco no primeiro quadro e 2 a 3 estrelinhas voando (do pool). Elite (`f.r >= 20`): o mesmo maior, com
  confete dourado anunciando o baú. Chefe (`f.r >= 30`, ou pelo evento `won`): explosão de luz em anéis, estrelas,
  câmera lenta curta no render (só visual, o mundo já parou) e um tremor forte (modo calmo: sem tremor).
- **Custo**: até 4 primitivas por puff, `maxPuffs` 60 (`config.ts:106`). Atenção: gema e item dividem o mesmo teto
  com as mortes; numa onda grande os brilhos de coleta somem. Sugestão: reservar 10 do teto para `gem`/`item`.

## Coletas

- **Gema**: o brilho de coleta é um anel de raio 6 **sobre o herói** (`xp.ts:69`, `fx.ts:178-181`), invisível sob o
  anel de luz do herói. Gemas puxadas voam sem rastro. Proposta: a gema puxada ganha um risco azul curto atrás; ao
  coletar, uma faísca azul que sobe do herói em direção à barra de XP (só um ponto, 0.25 s). Barato.
- **Ouro, comida, ímã**: anel dourado de raio 16 (`pickups.ts:81`) e o aviso no HUD. Comida deveria mostrar a cura
  (cruzinhas verdes subindo do herói); ímã, um anel que se expande até a tela e puxa as gemas (que já voam).
- **Baú**: hoje é `cameras.main.flash(250, 255, 220, 140)` (`GameScene.ts:331`): no primeiro quadro **a tela inteira
  fica amarela opaca** (`z-misc.png`, 6º quadro), sem nada do jogo visível; no modo calmo não há nada. É o maior
  momento da partida (o Elo) e não tem forma. Proposta: no ponto da coleta, raios de luz girando atrás do herói (6
  triângulos longos, alpha baixo), o **ícone da recompensa** (`ICON_ART`, já existe para cada arma) subindo do herói
  e um anel na cor do herói; Elo com raios duplos e estrelas. O flash de tela, se ficar, vira um véu de 25% e 120 ms.
- **Badalada (bomba)**: flash + tremor (`GameScene.ts:339-341`). A área é a tela visível (`pickups.ts:55-61`):
  mostrar isso com um **anel dourado de som** saindo do herói até as bordas da tela em ~0.3 s, e os inimigos
  acertados com faísca. Tira o flash opaco.

## Status

- **Congelado (Sopro de Geada)**: flash azul de tela inteira opaco (`GameScene.ts:342`, `z-misc.png` 3º quadro),
  depois inimigos parados com `TINT.frozen` (`GameScene.ts:152`). Funciona, mas não parece gelo e o fim (6 s) chega
  sem aviso. Proposta: uma **onda de gelo** saindo do herói até as bordas no lugar do flash; tinta em gradiente de 4
  cantos (`setTint(topo claro, topo claro, base azul, base azul)`, custo zero) para parecer "coberto de geada";
  geada nas bordas da tela enquanto dura; **piscar** a tinta no último 1 s (`world.freeze < 1`), para o jogador saber
  que vão voltar a andar.
- **Lento (Geada)**: `TINT.slowed` claro (`GameScene.ts:153`) e é só. O inimigo lento **anda com a mesma cadência**
  de passos (`GameScene.ts:139` usa `time * 9` para todos). Proposta: com `e.slow > 0`, cadência `time * 4` (passos
  pesados, custo zero) e um floco pequeno sobre a cabeça em uma parte dos lentos (1 a cada 4 por `uid`, para não
  poluir). O lento deixa de ser coberto pela tinta de acerto se o acerto virar flash branco curto (item 1).
- **Queimando**: não existe no core (o Fogo é dano instantâneo). As brasas propostas para Fogo e Chama devem sumir
  junto com o `ttl` para não sugerir dano contínuo que não existe.
- **Fantasma esmaecido** (`phase`): alpha 0.3 (`GameScene.ts:155`) é claro e suficiente.

## Chefes e telegraphs

- **Cores**: `WARN_COLOR` 0xff8a4a (`fx.ts:82`) é praticamente o laranja do Fogo (0xff8a3a, `fx.ts:55`) e da Chama
  (0xff6a3a, `fx.ts:29`). Com Fogo ou Chama no build, o aviso do chefe se confunde com o fogo do próprio jogador.
  Proposta: perigo do inimigo em **rosa-coral com listras** (o `#ff8090` de perigo já usado na UI) e borda branca
  tracejada; fogo do jogador fica laranja-dourado. Custo zero.
- **Corte Brutal**: o aviso cresce bem (`z-boss.png`), mas o golpe é uma fatia branca parada por 0.25 s
  (`fx.ts:243-249`). Proposta: varrer como a Lâmina (mesmo código), poeira na borda e tremor curto.
- **Badalada do Sineiro**: anel e marcas bons; as Ossadas **surgem do nada** (`bosses.ts`, `release` caso `toll`).
  Proposta: nas marcas, um puff de terra/osso no instante do surgimento (o render detecta a troca de `act` de
  Windup para Idle no chefe; nenhum dado novo).
- **Mordida Funda**: faixa e ponto que avança, bons. Na investida (`Active`) não há rastro: 3 linhas de velocidade
  atrás do lobo e poeira no fim.
- **Investida de inimigos comuns** (`hooded`, `goblin`, `move: 'charge'`, `behaviours.ts:243-265`): o aviso é só o
  tremor de rotação (`GameScene.ts:145`), igual ao dos chefes, sem marca no chão. Com 6 deles na tela não dá para
  saber quem vai investir nem para onde. Proposta: uma setinha curta no chão, na direção `aimX`/`aimY`, durante o
  `Windup` (poucos inimigos por vez, custo desprezível).

## Subida de nível e baú

- **Subida de nível**: `levelUpPulse` (`GameScene.ts:260-271`) cria um `circle` e um tween por evento (aloca, mas é
  raro, aceitável) e o overlay abre **no mesmo quadro**, escurecendo a tela: o pulso quase não é visto
  (`z-misc.png`, último quadro). Proposta: coluna de luz dourada sobre o herói + anel, e o overlay entrando com
  ~200 ms de atraso visual (o mundo já está parado em `levelup`, então não muda o jogo). Combinar com o ui-designer.
- **Elite e baú no chão**: o aviso de elite é só texto. O baú no chão flutua (`GameScene.ts:89-90`) mas não brilha.
  Proposta: anel dourado e duas faíscas girando sob a elite (é a portadora do baú) e um brilho em estrela piscando
  no baú caído. Poucos objetos, custo desprezível.

## Cores de assinatura

`HERO_COLOR` (`fx.ts:12-17`) só é usado na luz sob o herói. As armas próprias deveriam carregar a cor do dono:
Lâmina com borda âmbar (hoje aço azul, `fx.ts:18-19`), Raio com contorno roxo (hoje amarelo, `fx.ts:52`), Luz de
Elun com halo verde-dourado (hoje creme, `items.ts:89`), Adagas com rastro vermelho (hoje prata, `items.ts:91`).
Os Elos das assinaturas mantêm a cor do herói com um acento novo.

## Desempenho

- Medição relativa (Chromium headless com GL por software, CPU 4x, 420 x 820, 701 inimigos): sem armas 27 a 40 FPS;
  com 6 Elos (Chama, Vigília, Nevasca, Tempestade, Espada de Fogo, Fúria) 19 a 23 FPS. Não vale como número de
  celular (L-01 segue aberto), mas mostra que efeitos já pesam: toda proposta acima **troca** desenho em vez de somar
  quando possível (Fúria 3 fatias para 2, Vigília disco para anel, discos de raio/fogo do `top` para o `ground`).
- Regras para implementar: tudo em `drawFx` sobre os dois `Graphics` que já existem ou em `Image` de pool; o pool
  de faíscas com teto fixo e metade no modo calmo; posições "aleatórias" por hash de `x`, `y`, `uid` ou `i`, nunca
  `Math.random` nem objetos por quadro; medir F4 a 420 x 820 com CPU 4x antes e depois de cada item.
- Core: só uma adição opcional (`Enemy.hitKind`, item 1). Aura (`OwnedWeapon.timer`), zonas (`z.tick`,
  `z.duration`), golpes (`slash.ttl`), raios (`bolt.ttl`), congelamento (`world.freeze`), investidas (`act`, `actT`,
  `aimX`, `aimY`) e projéteis (`angle`) já expõem tudo o que os efeitos precisam.
