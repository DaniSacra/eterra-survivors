# 06 · Efeitos visuais (vfx-director) · commit 18f6ee3

Escopo: só revisão, nada implementado nem gerado. Método: leitura de `src/render/fx.ts`, `sparks.ts`, `vfx.ts`,
`fxSprites.ts`, `GameScene.ts`, `data/weapons.ts`, e o jogo aberto em `?dev` (Playwright, Valmor, 30 inimigos em volta
do herói, 700x520; capturas em rajada, a mais cheia de cada arma). Capturas em
`/tmp/claude-1000/-home-dani-games-eterra-survivors/af7b83b9-2eaa-495e-882f-2287b4d17434/scratchpad/shots/`
(`aura7-1`, `flame-1`, `furyB-3`, `jb-1`, `maceB-8`, `fsw-7`, `storm-0`, `bliz-0`, `vig-0`, `wall-4`, `ff-0`,
`soul-3`, `fan-0`, `cnt-all5`). Já feito ou planejado fica de fora e é citado pelo ID (DD-15, DD-13, CF-08, RF-04,
NF-01 a NF-10).

## Já coberto (não repetir)

- DD-15 "falta": Fúria (giro), cadeia da Tempestade, onda da Chama, acertos. Tudo confirmado abaixo, entra só como
  dado de severidade.
- CF-08 (Aura grossa, Leque com rebote, Maça com luz âmbar): proposto, aura e maça já avançaram; sobra só o Leque.
- RF-04 revisão: `cameras.main.flash` da Segunda Chance (`GameScene.ts:1522`) ainda existe, segue aberto.
- "Efeitos menores" (backlog, Efeitos menores): Fogos-Fátuos com rastro, rastro e faísca de gema coletada.

## Resumo por gravidade

| #   | Gravidade | Achado                                                                                                  | Onde                                  |
| --- | --------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | Alta      | Pool de sprites de efeito (160) estoura com 5 armas de área e corta o que é desenhado depois, sem aviso | `fxSprites.ts:9,32,61`                |
| 2   | Alta      | Fúria é vermelho puro e vetor: lê como aviso de inimigo e destoa do resto em pixel                      | `fx.ts:46,631`                        |
| 3   | Média     | Acertos de área não mostram "quem apanhou": Aura, Geada, Maça, Fúria só têm cruz de 3 px                | `GameScene.ts:70,554`, `sparks.ts:49` |
| 4   | Média     | Quebra-Junta: três anéis grossos de bege a cada 0,9 s, o efeito mais pesado da tela                     | `fx.ts:788`, `GameScene.ts:979`       |
| 5   | Média     | Verbos sem desenho: ricochete (Leque), volta (Fúria da Forja), laço (Escudos), cadeia (Tempestade)      | `fx.ts:488,538`                       |
| 6   | Média     | Projéteis ainda de código: Leque, Fúria (onda), Fogos-Fátuos, Procissão                                 | `art/items.ts:147-152`                |
| 7   | Média     | Espada de Fogo + Nevasca + Chama = tapete de chama, inimigos somem no laranja                           | `fx.ts:269-276,1139`                  |
| 8   | Baixa     | Morte: fumaça branca desenhada em código sobre tudo, ainda não em pixel                                 | `fx.ts:400`                           |
| 9   | Baixa     | Pulso de nível é círculo vetorial, nasce junto com a tela de escolha                                    | `GameScene.ts:1365`                   |
| 10  | Baixa     | Gema coletada: só som e um anel de 6 px                                                                 | `xp.ts:71`, `fx.ts:435`               |
| 11  | Baixa     | Telegrafo de chefe ainda é vetor (correto, mas sem os "adesivos" pixel do resto)                        | `fx.ts:2046`                          |

## 1. Alta · O pool de `fxSprites` esgota e corta efeitos em silêncio

- O que faz: toda peça pixel colocada por `drawFx` (chamas, cristais, aura, espadas, golpes, raios) sai do
  `fxSprites`, com `MAX = 160` imagens (`fxSprites.ts:9`). Passou disso, `put`/`putFrame` fazem `if (!img) return`
  (`fxSprites.ts:32,61`): a peça simplesmente não aparece.
- O que o jogador vê hoje: medi `fxSprites` visíveis por quadro (script no scratchpad, `count.mjs`). Espada de Fogo
  sozinha: 42 a 70. Nevasca sozinha: 25 a 50. Espada de Fogo + Vigília + Nevasca + Chama + Geada nível 7: sobe a
  135 em 6 s e **trava em 158-160 depois de ~12 s**. Como as zonas são desenhadas primeiro (`fx.ts:269-276`) e as
  espadas orbitais, o escudo e os golpes depois, o que cai fora é o que é mais importante de ler (a espada que
  gira em volta do herói, o corte da Lâmina).
- O que deveria mostrar: o limite deve sacrificar o enfeite (chama de zona, cristal), nunca o que tem hitbox.
- Proposta: (a) reservar o começo do pool para o que tem dano (golpes, raios, espadas, aura) desenhando zonas por
  último, ou duas faixas de orçamento (`put` com prioridade); (b) teto de chamas por zona proporcional ao orçamento
  que sobra (hoje 6 ou 3 fixo, `fx.ts:1156`, o corte `fewFlames` só olha `burns > 8`); (c) logar em dev quando
  estourar. Custo de desempenho: zero ou negativo (menos sprites). Tamanho P. Dono: vfx.

## 2. Alta · Fúria (Elo da Lâmina): vermelho de perigo, em vetor, sem o giro

- O que faz (`data/weapons.ts:457`): giro de 360° com alcance 134 a cada 0,5 s e, a cada 2º golpe, uma onda de
  corte que atravessa tudo (raio 34, 460 px/s).
- O que o jogador vê hoje (`furyB-3`): uma faixa branco-acinzentada com borda **vermelha `0xff4a4a`**
  (`ELEMENT_COLOR.fury`, `fx.ts:46` e `ui.ts:9`) que varre em meia-lua. O aviso de inimigo é coral `0xff8090`
  (`UI.dangerHex`): duas cores vizinhas, a borda da Fúria parece telégrafo de chefe. A onda (`proj.fury`) ainda é
  `crescent(18)` de código (`art/items.ts:147`). Na captura, a onda aparece como uma bola vermelha sólida.
  A Lâmina base ganhou meia-lua pixel (DD-15), a Fúria ficou para trás e agora destoa.
- O que deveria mostrar: o Elo é uma transformação, não uma Lâmina vermelha. Sugestão: giro pixel (anel de corte
  que gira 360° com poeira de cinzas), cor de ferro em brasa/escarlate quente `~0xff6a3a` tirando do vermelho-coral,
  e a onda como lâmina de luz pixel que cresce com `stats.area` (NF-07 já escala), com faíscas dos dois lados.
- Desempenho: um sprite de giro (6 quadros) por golpe e um da onda; menos Graphics (`drawSwing` vetorial faz 3
  `band` + 2 `arcLine`). Tamanho M. Hoje DD-15 já lista o giro: este achado soma o conflito de cor.

## 3. Média · O acerto não diz quem apanhou nas armas de área

- O que faz: Aura, Geada, Maça, Lâmina e Fúria atingem dezenas de inimigos no mesmo quadro.
- O que o jogador vê hoje: `AREA_HIT` (`GameScene.ts:70-77`) desliga o flash branco para `aura`, `zone`, `arc`,
  `slam` e qualquer arma com `split/chain/ricochet/ward/ground/wave`, para evitar a mancha branca (NF-01, acertado).
  O que sobra é a faísca de `HIT_SPARK`: uma cruz de 2 a 3 px (`sparks.ts:49-70`), com orçamento de 24 por quadro e
  teto de 96. Em `aura7-1` (Aura L7 sobre 30 inimigos) quase não se vê quem foi tocado. A régua do vfx-director pede
  "inimigo dentro ganha brilho dourado no acerto". Armas sem entrada em `HIT_SPARK` (Lâmina, Adagas, Martelo,
  Escudos, Muralha, Vigília, Leque, Maça) fazem a mesma estrela branca, Vigília e Escudos não têm cor própria.
- O que deveria mostrar: um contorno ou rim de 1 a 2 quadros na cor da arma (tinta que **soma** claridade
  nas bordas, não `setTintFill`), só para o tipo de arma, mais a gotinha sobre a cabeça que o NF-02 deixou
  de fora. Para Vigília e Escudos, cor própria no `HIT_SPARK` (ouro-branco, aço).
- Desempenho: usar o mesmo `img.setTint` que já roda por inimigo (`GameScene.ts:554-561`), sem nenhum objeto
  novo; a faísca continua do pool. Custo desprezível. Tamanho P.

## 4. Média · Quebra-Junta é o efeito mais pesado da tela

- O que faz: golpe em cone, onda de choque a todo golpe (raio 150), eco de 70% 0,3 s depois (`aftershock`),
  stun de 0,5 s, a cada 0,9 s, com `crush` contra atordoado.
- O que o jogador vê hoje (`jb-1`): três anéis concêntricos grossos, bege e âmbar (`drawShock` põe um anel de 12 px
  de brilho `fx.ts:788-810` mais os dois anéis do sprite `shock`, mais o eco), cobrindo uns 300 px de diâmetro, com
  a tela inteira em poeira clara. Em 30 inimigos, os esqueletos pálidos dentro dos anéis perdem contorno. Ainda tem
  pausa de 50 ms (`GameScene.ts:979`, DD-13) por golpe: com 0,9 s de recarga são ~5% do tempo parado, e a pausa dispara
  duas vezes no mesmo quadro (golpe e onda).
- O que deveria mostrar: a onda é o verbo (empurrar), então deve ler como empurrão: poeira em risco atrás
  de quem é jogado (NF-04 já faz), e o anel com **um** traço claro, sem o halo de 12 px. O eco deve ser uma versão
  menor e mais fraca, nunca igual.
- Proposta: tirar o halo `glow` (12 px, alfa 0,4) do `drawShock` quando já há o sprite, eco a 50% de alfa, uma pausa
  por quadro (`stopUntil` só se ainda não está parado). Desempenho: menos Graphics. Tamanho P.

## 5. Média · Verbos sem desenho próprio

Cada um tem lógica pronta no core e nenhum desenho dedicado (só trilha ou faísca genérica):

- **Leque de Facas, `ricochet`** (`core/projectiles.ts:216`): a faca vira no ar sem sinal nenhum. Ver `fan-0`: as
  facas são pontinhos (código, `art/items.ts:148`) e o rebote não aparece. Proposta: estrela pequena e um risco de
  luz esmeralda do ponto do rebote até o novo alvo (o `bolt` link da Tempestade já tem esse formato), +1 faísca
  por rebote do pool. A gota de sangramento já existe (`dotSpark`).
- **Fúria da Forja, `boomerang`**: só trilha cobre e faísca de brasa 30% dos quadros (`GameScene.ts:413`). A volta
  precisa de um arco visível (fantasma do caminho de ida, mais fraco) e de um clarão no momento em que ela vira.
- **Escudos de Valmor e Muralha, `loop`** (`wall-4`): o caminho circular aparece como riscos brancos soltos; a
  Muralha com 8 escudos faz 8 riscos e quase nada mais. Proposta: arco de aço traçado até o ponto de virada,
  e um clarão no retorno. O guarda `ward` já está bom (`drawWard`, `fx.ts:1185`).
- **Tempestade, `chain`** (DD-15, `storm-0`): linha roxa de 2 px e um disco branco. É a parte mais fraca de um
  efeito lindo (os raios azuis são ótimos). Proposta no mesmo vocabulário do raio, e usar o violeta do elemento
  em vez do azul-branco do sprite `bolt` quando for o Elo, para a cor combinar com `ELEMENT_COLOR.storm`.
- **Estrela de Lyra, `split`**: funcional (a estrelinha salta e cai, `GameScene.ts:407`), sem pouso marcado.
  Proposta: faísca em anel menor no ponto de pouso (usar `SPARK.ring` do pool).
- **Procissão, `swell`**: seis pontos de 6 px girando (`drawSouls`, `fx.ts:834`). Contam as cargas mas não explicam
  o ganho; um anel fino que fecha, ou aura azul-pálida no herói proporcional ao nº de cargas.

Desempenho: todas do pool de faíscas ou 1 sprite por evento. Tamanho M no conjunto.

## 6. Média · Projéteis que seguem em código

`art/items.ts:147-152`: `proj.fan`, `proj.fury`, `proj.wisps`, `proj.soulProcession` (e o Fogos-Fátuos/Procissão em
`wisp(...)`) ainda são desenhos de `Pen`. Em `soul-3` a Procissão são seis pontos ciano quase invisíveis contra
esqueleto claro; é um Elo, deveria ser o mais bonito. Facas do Leque (`fan-0`) do mesmo jeito. Os outros projéteis
(adaga, martelo, escudo, pomba, orbe, estrela) já são PixelLab (`assets.ts:67-76`). Proposta: um tamanho coerente com
`radius` (Procissão 10, Fogos 7, Leque 8), contorno escuro e núcleo claro, 4 quadros de brilho. Desempenho: igual
(sprite do pool de mirror). Tamanho P a M (4 gerações, registrar em `credits.md`). Dono: vfx.

## 7. Média · Mancha de chama: leitura da multidão com Espada de Fogo

- O que faz: 7 raios por 0,8 s, cada um deixa chão em brasa por 2,5 s com queima de 2 s.
- O que o jogador vê hoje (`fsw-7`): até ~22 zonas e blasts ao mesmo tempo; o fundo vira laranja, os números de dano
  disputam, os esqueletos ficam recortados contra a luz. Os cortes do NF-02 (`EMBER_FILLS`) tiraram o tapete, mas as
  chamas continuam 3 por zona mesmo com 22 zonas (`fx.ts:1156`), e o `fxSprites` do achado 1 sofre com isso.
- Proposta: orçamento total de chamas por quadro (ex. 36), distribuído pelas zonas mais novas; as velhas viram só
  anel de brasa. Cor: hoje a chama (`0xff5a14`) e o disco de Fogo/Espada têm o mesmo laranja do telégrafo de
  Ossada em Brasa (`WARN_COLOR` é coral, ok), mas **brasa de inimigo e brasa do herói** se misturam em fase com
  Ossada em Brasa (`drawFoes` `fx.ts:1370`): conferir na Cripta.
- Desempenho (medido): `fps.mjs`, 150 morcegos, 420x820, 4x CPU, GL por software (só valem as proporções): Lâmina
  sozinha 24 a 17 FPS; cinco armas de área (Espada de Fogo, Nevasca, Chama, Vigília, Geada L7) 19 a 13 FPS, ou
  seja ~-25% por efeito. Quebra-Junta sozinha 22 a 18. Falta medir no aparelho real (F4 no navegador do Daniel),
  mas a conta confirma que o corte de sprites do achado 1 também é o ganho de desempenho.

## 8. Baixa · Morte: fumaça branca vetorial

`fx.ts:400-421`: pop branco + três nuvens em disco, alfa 0,9, sem aditivo, sobre os inimigos (`top`). Os corpos já
têm animação pixel (`corpses`), então o disco branco brilha de forma estranha ao lado deles; em morte em massa
(Chama, Tempestade) são 3 discos x 2 camadas por morte. Proposta: um sprite de poeira/estrelas de 5 quadros
(PixelLab) para o puff comum, deixando `fx.ts:400` só para elite. Dentro do que o NF-05 do puff pede, sem aumentar
o teto de partículas. Tamanho P.

## 9. Baixa · Subida de nível

`GameScene.ts:1365`: `this.add.circle` com tween (cria objeto e tween a cada nível, fora do loop quente, mas
fora do padrão). Como `levelUp` abre a tela de escolha no mesmo quadro (`GameScene.ts:1437`), o anel de 450 ms corre
**por baixo do overlay**, praticamente invisível. Proposta: sprite pixel no `fxGlow` e esperar o overlay fechar para
tocar o anel, ou tocá-lo na saída da tela. Tamanho P.

## 10. Baixa · Gema coletada

`core/xp.ts:71` emite um puff `gem` de raio 6, que vira um anel de 7 a 10 px (`fx.ts:435`) no centro do herói. Só
som. Já está em "Efeitos menores" do backlog (rastro e faísca da gema): sugiro cintilar na cor do tier
(pequena/média/grande) e puxar a gema com rastro curto na última fração do caminho. Do pool de faíscas.

## 11. Baixa · Telegrafos de chefe

`fx.ts:2046-2210`, `1588-1660`: formas certas (faixa listrada com borda tracejada, cone com fatias, círculo com
anel crescente), em coral com borda branca, sob os inimigos, e a área desenhada é a que dói (`reach`, `range`,
`leap.radius`). Pontos a melhorar, nenhum urgente:

- O salto (`drawLeapMark`) não tem listras como a investida, só o círculo (a régua dos telégrafos manda
  "círculos com anéis concêntricos"). O Dobre tem os anéis, o salto não.
- Preenchimentos 0,1 a 0,3 de alfa (ok, abaixo de `ZONE_FILL_MAX`), mas só os chefes têm o desenho "rico";
  elites com `charge` usam a faixa sem chevron (`fx.ts:1588`), consistente com RF-10.
- Tudo é vetor: para o padrão pixel (DD-15 não lista), um sprite de borda tracejada e um de listra pixel
  repetíveis dariam a mesma leitura com a mesma silhueta. Prioridade baixa: o telégrafo é por função e já lê.

## Por arma: o que faz / o que se vê / o que falta (resumo)

| Arma                          | Estado                                                                 | Faltando                                           |
| ----------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| Lâmina de Valmor (base, máx.) | Meia-lua pixel (DD-15), faíscas, flash por área                        | Acerto de área (#3)                                |
| Fúria                         | Vetor, vermelho                                                        | #2                                                 |
| Luz de Elun / Luz Sagrada     | Orbe/pomba pixel com rastro; cruzes de cura no herói                   | Rastro de pomba com plumas; ok                     |
| Aura de Yah (máx.)            | Anel pixel, onda no tique, núcleo suave (`aura7-1`): lê bem e leve     | Inimigo dentro não brilha (#3)                     |
| Chama de Yah                  | 10 chamas na borda, onda de brasa a cada 10 tiques, brasas (`flame-1`) | Borda grossa; ok. Aviso do pulso já existe (NF-08) |
| Adagas / Leque                | Adaga pixel; facas do Leque em código                                  | #5, #6                                             |
| Cajado / Estrela de Lyra      | Orbe pixel, estouro em anel, estrelinhas                               | Pouso da estrelinha (#5)                           |
| Espadas de Paladino / Vigília | Espada pixel girando, trilha, rim; Vigília dourada lê bem (`vig-0`)    | Acerto sem cor própria (#3)                        |
| Geada / Nevasca               | Cristais pixel, anel de tique; Nevasca com flocos (`bliz-0`)           | `shatter` ok; fill pálido, ok                      |
| Raio / Tempestade             | Raio pixel excelente (`storm-0`)                                       | Cadeia fraca (#5)                                  |
| Martelo / Fúria da Forja      | Martelo pixel girando                                                  | Volta sem desenho (#5)                             |
| Fogos-Fátuos / Procissão      | Código, minúsculos (`soul-3`)                                          | #6                                                 |
| Escudos / Muralha             | Escudo pixel; guarda `ward` bom                                        | Laço sem arco (#5)                                 |
| Maça / Quebra-Junta           | Cabeça pixel, onda pixel, contagem de 3 em âmbar                       | Peso excessivo do Elo (#4)                         |
| Fogo / Espada de Fogo         | Bola e chama pixel; zona em brasa                                      | Densidade (#7), pool (#1)                          |

## Estados, acertos, mortes, itens

- **Stun** (`drawStuns`, `fx.ts:1224`): duas estrelas de 4,5 px girando; bom, limite 48 por quadro.
- **Congelado/lento/queimando/sangrando**: tintas (`GameScene.ts:556-561`) e faíscas de `dotSpark`; lê bem (Geada em
  branco-lilás, queima em laranja, sangramento em gota esmeralda); Chama/Espada de Fogo põem `BURNING_SHOWN = 14`
  poças de brilho no `fxGlow`. Falta: congelado não tem cristal em cima, só tinta (idéia: 1 cristal pixel no topo
  dos 12 primeiros; custo igual ao do pool, atenção ao achado 1).
- **Acertos**: NF-06 feito (estrela maior, anel, crítico duplo). Ver #3 para o que falta.
- **Mortes**: ver #8; chefe e elite têm explosão própria e tremor só no chefe (permitido).
- **Itens**: baú com anel e brilho (bom), bomba/geada com onda até a borda e `lighting.flash`; a
  Segunda Chance ainda faz `cameras.main.flash` (RF-04 aberto).
- **Forja** (`forgeMoment`, `GameScene.ts:1311`): câmera lenta, anel, 18 estrelas, `lighting.flash`, tremor curto
  (permitido pela regra). Bom, mantido; o anel de nível (#9) não deve competir com ele.

## Ordem sugerida

1. #1 (pool: bug silencioso, ganha desempenho) e #4 (Quebra-Junta, só tirar halo).
2. #2 Fúria (cor e pixel) e #3 (acerto de área com cor), juntos porque tocam `GameScene.ts` e `sparks.ts`.
3. #5 e #6 em uma rodada de PixelLab: cadeia, ricochete, volta, laço, Leque, Procissão, Fogos.
4. #7 orçamento de chama, #8 puff de morte, #9 a #11 por último.

Teste obrigatório depois de cada um: F4 (100 inimigos, 420x820, 4x CPU) igual ou melhor que antes, capturas das armas no
nível máximo com 26 inimigos em volta (a folha de captura do CF-08), e `?dev` na Cripta e na Estrada, onde o fundo é
mais escuro ou mais verde e as cores de Espada de Fogo e Fúria precisam ser conferidas. Não verifiquei Cripta e
Estrada (só Valmor) nesta rodada.

Limites desta revisão: capturas por GL de software em rajada, a mais cheia por tamanho de arquivo; o FPS medido
é só relativo; os telégrafos de chefe foram lidos no código e não vistos em jogo (o chefe vem aos 5:00 em `?dev`).
