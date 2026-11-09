# Revisão 2026-11-09 · Visual (arte e layout)

Commit: `3b9939c`. Revisão feita pelo visual-director, só leitura: nada em `src/`, `tests/` ou `docs/design/` foi
alterado.

Método: servidor na porta 4175 com `?dev` (save próprio semeado: 3 heróis, Valmor vencida, 5 Elos, Bestiário com 7
inimigos) e também sem `?dev` (preços e botão Comprar da Loja). Playwright em 420 x 820 (toque), 1000 x 680 (mouse) e,
para conferir, 360 x 740 e 820 x 420. Cenas capturadas: Menu, Preparação, Loja, as quatro abas da Coleção e a página de
um Elo, Opções, início das três fases, multidões de 400 a 520 inimigos com 200 gemas por fase, os 13 Elos em quatro
grupos sobre multidão, os três chefes com escolta, o momento da forja, subida de nível, Pausa e fim de jogo. Folha com
todas as texturas em `00-sheet.png`.

Capturas (fora do repo):
`/tmp/claude-1000/-home-dani-games-eterra-survivors/fa0bf9c7-8ee4-4a47-a092-cca892969417/scratchpad/visual/`
(abaixo, só o nome do arquivo; as sem `?dev` estão na subpasta `nodev/`). Script:
`/tmp/claude-1000/-home-dani-games-eterra-survivors/fa0bf9c7-8ee4-4a47-a092-cca892969417/scratchpad/shots.mjs`.

Os itens A-01 a A-14, RA-01 a RA-06, RF-01 a RF-11, RU-01 a RU-08, CC-01 a CC-10 e D-08 do backlog estão feitos. O que
volta aqui é **regressão, caso que o item não cobriu ou coisa nova** desde `16d126a` (Elos forjados, verbos dos Elos,
Loja em seções, Coleção, Estrada em corredor, Cripta com obstáculos, modo de teste).

## Resumo

A identidade se manteve: contorno único, olhos grandes, heróis com cor própria, gemas como o único ciano forte, menus
coerentes, Coleção bem acabada. Os problemas mais visíveis agora são de **acabamento do chão e da luta**: (1) o tile de
Valmor e o da Estrada têm costura visível, uma grade a cada 128 px de mundo; (2) os Elos novos de área deixam a
multidão branca, porque o flash de acerto só foi tirado de aura e zona; (3) os números de dano voltam a formar pilhas
com os verbos novos (onda, estrela, corrente, bumerangue, ricochete) e com a Geada. No layout, a **Loja quebra em 360 px**
(uma coluna, o detalhe cobre a lista e os Especiais somem), e no celular em pé **a Estrada do Sul parece Valmor**,
porque a estrada é mais larga que a vista e o tile é quase igual.

## Achados, do mais visível ao menos visível

### 1. Costura do tile em Valmor e na Estrada: grade a cada 128 px · alto

- Onde: `src/render/art/tiles.ts:22-35` (Valmor: manchas de 50 a 90 px em `r() * SIZE`, sem repetir do outro lado) e
  `:70-78` (Estrada: manchas de 26 a 52 px, mesmo problema). Toda mancha que passa da borda é cortada em linha reta.
- Evidência: `06-start-valmor-1000x680.png` (linhas verticais em x ≈ 137, 318, 500, 682, 863 e horizontais em
  y ≈ 158, 340, 520, a tela inteira quadriculada); `crop-roadseam.png` (recorte 2x da Estrada: as manchas terminam
  num corte reto no meio do chão). No celular a grade também aparece, menos marcada (`06-start-valmor-420x820.png`). É
  a primeira tela de todo jogador novo. A Cripta não tem o problema (as lajes são grade de propósito).
- Correção (custo por quadro zero, é textura): em `tiles.ts`, um helper `wrapEllipse(p, x, y, w, h)` que desenha a
  mancha também em `x ± SIZE` e `y ± SIZE` quando ela cruza a borda; usar nos laços de manchas, pedrinhas e pontos
  de neve dos dois tiles. Aceite: captura de 1000 x 680 sem nenhuma linha reta no chão.

### 2. Loja em 360 px: uma coluna, detalhe sobre a lista, Especiais fora da tela · alto

- Onde: `src/scenes/ShopScene.ts:140` (`cols = floor((listW + GAP) / (165 + GAP))`: com 360 px, `listW` = 336 e dá
  1 coluna) e `:142` (`cardH` com mínimo 34 px, que não cabe e passa da área); `:133-136` (o painel de detalhe fica
  fixo embaixo, por cima do que sobrar).
- Evidência: `nodev/03-shop-360x740.png`: 15 cards em uma coluna, o painel de detalhe cobre Dados da Andilla,
  Conselho do Ancião e Paciência, Voltar fica sobre Bênção do Templo, e Segunda Bainha e Segunda Chance ficam fora da
  tela (inalcançáveis por toque). Os cards compactos têm 34 px de altura, abaixo do alvo de toque de 40 a 44 px. Em
  420 px está certo (`nodev/03-shop-420x820.png`). 360 px é a largura dos Androids mais comuns.
- Correção: largura mínima do card 150 (360 px dá 2 colunas: (336 + 8) / 158 = 2,2) e altura mínima 40; se mesmo
  assim não couber, encolher o painel de detalhe (só nome, Agora/Próximo e Comprar em uma linha) antes de
  sobrepor. Aceite: 360 x 640 e 360 x 740 com os 15 itens visíveis e nada sobreposto.

### 3. Elos de área deixam a multidão branca (flash de acerto) · alto

- Onde: `src/scenes/GameScene.ts:53-58` (`AREA_HIT` só cobre `aura` e `zone`) e `:333` (`setTintFill(TINT.hit)` em
  todo inimigo atingido por qualquer outra arma). Os verbos novos acertam dezenas de inimigos de uma vez: Quebra-Junta
  e Fúria (arc), Maça (slam com onda de choque), Estrela de Lyra (`split`), Tempestade (`chain`), Leque (`ricochet`),
  Muralha de Valmor (empurra com o anel).
- Evidência: `10-elos-b-420x820.png` (Estrela, Tempestade e Procissão: uma nuvem branca de ~200 px cobre a Lyra e
  tudo à volta dela); `10-elos-d-420x820.png` e `10-elos-d-1000x680.png` (Quebra-Junta, Muralha e Espada de Fogo: uma
  faixa branca em arco, sem forma de inimigo nenhum dentro); `07-crowd-valmor-420x820.png` (Maça: mancha branca colada
  ao Aldo). Em multidão densa, um inimigo branco encosta no outro e o contorno escuro some; o jogador perde
  justamente o que está mais perto.
- Correção (render, sem alocação; o vfx-director escolhe o detalhe): o flash branco vale só para golpe de um alvo
  (projétil, arremesso, raio único); para `arc`, `slam` e os verbos de área (split, chain, wave, ricochet, ward),
  só o squash e as faíscas, como já é com aura e zona. Alternativa mais simples: trocar `setTintFill` por
  `setTint(0xffffff)` com um brilho do topo (`setTint(0xffffff, 0xffffff, TINT.frost, TINT.frost)`), que clareia sem
  apagar o contorno. Aceite: captura de Quebra-Junta e Estrela de Lyra com 400 inimigos onde dá para contar os
  inimigos dentro do golpe.

### 4. Estrada do Sul no celular em pé parece Valmor · médio-alto

- Onde: `src/data/stages.ts:68` (`corridor` com `width: 520`); a vista em 420 px tem 420 / 0,875 = 480 px de mundo, então
  a floresta nunca aparece com o herói no meio da estrada. `src/render/art/tiles.ts:65-79`: o tile da estrada
  (`0x3a4258`, manchas `0x4a5470`, pontos de neve) é quase o tile de Valmor (`0x34405e`, manchas `0x3e4b6c`, pontos
  de neve). `src/scenes/SelectScene.ts:239-242`: a miniatura da fase é só um pedaço do tile.
- Evidência: `06-start-southRoad-420x820.png` contra `06-start-valmor-420x820.png` (mesma cor, mesma textura; só a
  cerca e os Encapuzados dizem que é outra fase); no desktop a floresta aparece e a fase tem cara própria
  (`06-start-southRoad-1000x680.png`). Na Preparação as miniaturas de Valmor e da Estrada são iguais e a da Cripta é
  um quadrado escuro (`02-select-420x820.png`, `nodev/02-select-360x740.png`).
- Correção:
  1. Tile da estrada com identidade de estrada: neve pisada mais clara e quente no meio (ex. `0x48465a` com manchas
     `0x55526a`) e os sulcos (`decal.ruts`) mais frequentes, sempre no sentido norte-sul, para ler "caminho".
  2. Borda da estrada desenhada mesmo quando a floresta está fora da vista: um banco de neve contínuo (faixa clara de
     ~16 px, sem contorno) a `width / 2` do centro, que no celular fica a 20 px da borda da tela e já anuncia o
     corredor. Se o game-director aceitar, `width` 520 para 440 resolve sem arte nova (é mudança de jogo, não minha).
  3. Miniatura da fase com o elemento que a identifica: lápide em Valmor, pilar na Cripta, dois pinheiros na borda da
     Estrada (as texturas já existem: `decal.grave`, `obstacle.0`, `tile.forest`).

### 5. Números de dano voltam a empilhar com os verbos dos Elos e com a Geada · médio

- Onde: `src/core/world.ts:258-262` (só `aura` e `orbit` ficam sem número); `src/core/effects.ts:128` (o orçamento por
  disparo, `numberBudget`, só é usado em `arc` e `strike`, `core/weapons.ts:280, 336, 502, 596` e
  `core/projectiles.ts:226`); `src/data/config.ts:138` (`maxDamageNumbers: 40`). O A-04 cobriu golpes de área; os
  verbos novos e as zonas ficaram de fora.
- Evidência: `10-elos-b-420x820.png` (pilha de ~25 números sobre a Lyra: 164, 54, 36, 18...);
  `10-elos-c-420x820.png` (colunas de "59" e "119" do bumerangue da Fúria da Forja à direita do Teo);
  `10-elos-a-420x820.png` (faixa de "149" da Fúria sobre o Aldo); `07-crowd-valmor-420x820.png` (cacho de ~20 "6" da
  Geada colado ao herói). Com 40 números de 14 px numa tela de 420 px, um quarto da área em volta do herói vira texto.
- Correção (core, testável, sem `Rng`): (a) `zone` sem número, como `aura` (a Geada e a Nevasca já mostram o tick com
  pulso e cristais, RF-11); (b) orçamento por quadro para números novos (ex. 6 por `step`), em vez de só por disparo
  de `arc`/`strike`, o que cobre todo verbo novo de uma vez; (c) `maxDamageNumbers` 40 para 24 quando a vista for
  retrato. Aceite: as capturas acima sem pilha sobre o herói.

### 6. A corrente do Elo na faixa da build parece o algarismo "8" · médio

- Onde: `src/render/buildPanel.ts:163-175` (a corrente vai da base do slot da arma ao topo do slot da passiva) e
  `:319-355` (`chain`: duas fitas que se cruzam a cada poucos px). Entre as duas linhas da faixa sobram ~8 px, então
  a trança vira dois laços empilhados.
- Evidência: `crop-strip.png` (recorte 4x de `12-forge-after-420x820.png`): um "8" vermelho sob a Fúria e um "8"
  azul sob a Nevasca, logo ao lado dos números de nível e das barrinhas. Lê como "nível 8", não como "corrente".
- Correção: com menos de ~14 px de espaço, desenhar um elo só (um anel de metal deitado, na cor do elemento, cruzando a
  borda dos dois slots) ou a corrente em diagonal, do canto inferior esquerdo da arma ao canto superior esquerdo
  da passiva; ou abrir 4 px a mais entre as linhas quando houver Elo. Aceite: no recorte 4x não aparece nenhum
  algarismo.

### 7. Herói ferido perde a cor de identidade · médio

- Onde: `src/render/fx.ts:169` (`heroHurt: 0xff9090`) aplicado em `src/scenes/GameScene.ts:814`. Sob multidão o herói
  apanha quase sem parar e fica vermelho a maior parte do tempo.
- Evidência: `08-crowd-crypt-1000x680.png` (a Lyra ferida fica com chapéu e roupa vermelhos: lê como a Andilla);
  `09-crowd-road-420x820.png` e `16-teo-crypt-420x820.png` (o Teo vira um boneco vermelho; só o anel verde diz quem é).
  O RF-02 resolveu o rosto; a cor do herói ainda some.
- Correção (com o vfx-director): o dano aparece no contorno e no anel (piscar em `UI.danger` por 0,12 s) e no tremor
  da barrinha, não no corpo; se ficar a tinta, mais clara (`0xffd0d0`) e só no primeiro décimo de segundo de cada
  golpe. Aceite: captura dos quatro heróis cercados onde cada um é reconhecido pela roupa.

### 8. Bestiário: inimigo não visto não é silhueta · médio-baixo

- Onde: `src/scenes/collection/bestiary.ts:26` (`setTint(UI.border)` multiplica a cor: o que é claro continua
  reconhecível). O comentário em `:31` promete "a silhouette".
- Evidência: `04-coll-bestiary-420x820.png` e `04-coll-bestiary-1000x680.png`: a Gosma continua verde, o Goblin verde
  com a lança, os Lobos da Geada brancos com olho; só os escuros (aranha, corvo, Encapuzado) viram sombra. Estraga a
  surpresa da fase seguinte e não é o mesmo mistério do Livro de Elos.
- Correção: para inimigos (silhueta recortada, não distintivo redondo), `setTintFill(UI.borderOff)` com alfa 0,9: a
  forma fica, a cor e os olhos não. O Livro de Elos continua com `setTint` (lá o `setTintFill` virava disco, RA-05).

### 9. Textos de 11 px · médio-baixo

- Onde: `src/render/buildList.ts:75` (linha "Elo X: arma 7/7 · passiva 3/3" da Pausa); `src/scenes/ShopScene.ts:284`
  (dica de teclas no detalhe) e `:336` (dica do modo de teste).
- Evidência: `14-pause-420x820.png` (as três linhas de receita da build ficam miúdas e apagadas, justamente a
  informação que a Pausa existe para mostrar).
- Correção: 12 px no mínimo (regra do padrão); na Pausa, 12 px em `UI.muted` com a parte que falta em `UI.gold`.

### 10. Página do Elo flutua sem painel, com dois "Voltar" · médio-baixo

- Onde: `src/scenes/collection/elos.ts:107-160` (`drawPage` desenha a partir de `a.y` sem painel, mais o botão
  "Voltar ao Livro"; o Voltar da cena continua embaixo).
- Evidência: `04-coll-elos-page-420x820.png`: o conteúdo ocupa a metade de cima, a metade de baixo fica vazia, e há
  "Voltar ao Livro" (dourado, com foco) e "Voltar" um sob o outro. Em 820 x 420 está bom (`04-coll-elos-page-820x420.png`).
- Correção: painel do tamanho do conteúdo, centrado na área livre (como `EndScene`), com a borda na cor do elemento; o
  Voltar de baixo passa a voltar ao Livro enquanto a página estiver aberta (um botão só, Esc igual).

### 11. Selo "MODO DEV" sobre o botão Voltar · baixo (só no modo de teste)

- Onde: `src/render/dev.ts:20-26` (canto inferior direito, profundidade 100).
- Evidência: `02-select-420x820.png` e `03-shop-420x820.png`: "MODO DEV · progresso à parte" escrito por cima do
  Voltar.
- Correção: no retrato, colar o selo no topo (canto superior direito, abaixo da safe-area) ou acima da linha de
  botões de baixo; no deitado, onde está.

### 12. Aranha Tumular e Rato Gigante na mesma cor · baixo

- Onde: `src/render/art/enemies.ts:116-135` (aranha marrom-escura) e `:178` (rato `0x8a7a6e`).
- Evidência: `08-crowd-crypt-1000x680.png`, `16-teo-crypt-420x820.png`: na Cripta, o básico (rato) e o rápido
  (aranha) são dois marrons do mesmo tamanho; o jogador não separa quem vai alcançá-lo.
- Correção: a aranha fica quase preta (`~0x2e2a30`) com pernas longas e os dois olhos brancos maiores (r 2.4), para
  ler como silhueta de pernas; o rato fica no marrom-acinzentado de hoje. Fora de roxo (Lyra), ciano (gemas) e verde
  (Gosma e Teo).

### 13. Fogos-Fátuos e Procissão no ciano das gemas · baixo

- Onde: `src/render/art/items.ts:151` (`proj.wisps` `0xe8ffff` / `0x40e0d8`) contra a gema `:119-120`
  (`0x3ed4ff` / `0xd4f8ff`); `src/render/ui.ts:17` (`ELEMENT_COLOR.soul` `0x7af0dc`) contra `:39` (`UI.xp`
  `0x7ae6ff`), quase o mesmo tom. O comentário de `ELEMENT_COLOR` diz que nenhum elemento usa o ciano das gemas.
- Evidência: `00-sheet.png` (o fogo-fátuo e a gema pequena lado a lado têm o mesmo azul-verde); a regra do A-05 é que a
  gema seja o único ciano saturado.
- Correção: fogo-fátuo em branco-esverdeado pálido e quente (núcleo `0xf4ffe0`, aro `0xa8e0a0` a 0,8) ou dourado
  pálido de vela; `soul` para um verde-água dessaturado (`~0x9ad8c0`), fora da faixa de matiz 185 a 200°.

### 14. Coleção no desktop: larguras que não conversam · baixo

- Onde: `src/scenes/collection/heroes.ts` (4 cartões de borda a borda) e `elos.ts` (3 colunas de ~300 px com ícones de
  20 px), sob uma linha de abas de 560 px centrada.
- Evidência: `04-coll-heroes-1000x680.png` (cartões de 12 px a 988 px, metade de baixo vazia);
  `04-coll-elos-1000x680.png` (cards largos com a receita espremida à esquerda).
- Correção: conteúdo das abas com `min(960, width - 2 x gutter)` centrado; nos cards de Elo, ícones de 28 px quando o
  card passar de 240 px.

### 15. Pausa no celular: build e botões com larguras diferentes · baixo

- Onde: `src/scenes/PauseScene.ts:56-57` (`bw` 320 para os botões, `lw` 360 para a lista).
- Evidência: `14-pause-420x820.png`: o painel "Sua build" começa em x = 30 e os botões em x = 50.
- Correção: a mesma largura para os dois (`min(360, width - 32)`).

### 16. Pequenos desvios de cor e texto · baixo

- `src/scenes/GameScene.ts:76`: faíscas do giro da Fúria em dourado `0xffd870`, mas o elemento da Fúria é vermelho
  (`ELEMENT_COLOR.fury`); a Quebra-Junta (`:78`, `0xffa060`) também não usa o âmbar `earth`. Usar a cor do elemento,
  como o resto do Elo.
- `src/i18n/pt-BR.ts:577`: a página da Fúria diz "a cada terceiro golpe", mas `data/weapons.ts:442` tem
  `wave.every: 2`.
- `src/render/art/enemies.ts:155`: o olho brilhante das Ossadas é `0xe86a7a`, exatamente a cor de identidade da
  Andilla; centenas de pontinhos dela na tela de Valmor. Trocar por um vermelho mais frio (`~0xff5a6a`), que não é cor de
  herói.
- `src/scenes/GameScene.ts:872`: a revivência ainda faz `cameras.main.flash` de tela inteira (respeita a tela calma,
  mas o RF-04 tirou os flashes de tela inteira); um anel dourado saindo do herói (o `levelUpPulse` que já roda ali)
  basta.
- `src/render/buildPanel.ts:29-31`: o comentário fala em "formed Elo a pulsing gold frame and a formed Elo a fixed gold
  frame" (duplicado e desatualizado: o Elo pronto pulsa, o formado leva a cor do elemento).
- `src/render/ui.ts:136-143`: o selo "Desligado" (`UI.textOff` `#6a6658` sobre `UI.panelOff`) quase some
  (`05-options-420x820.png`); `UI.muted` no texto mantém a diferença sem perder a leitura.
- Loja no celular (`nodev/03-shop-420x820.png`): os cards compactos mostram nome e preço, mas não o nível (2/10), que só
  aparece no detalhe; o padrão pede o nível no canto de cima à direita. Com cards de 40 px, o nível cabe em 12 px sob
  o nome.

## O que está bom (para não mexer)

- Gemas: com a família do gelo branca e lilás (A-05), elas leem em menos de 2 s nas três fases, inclusive dentro da
  Nevasca (`12-forge-after-420x820.png`).
- Chefes por cima da escolta e com tamanho certo; o Lobo Velho cinza destaca bem entre os Encapuzados marrons
  (`11-boss-oldWolf-420x820.png`).
- Momento da forja: anel, faíscas na cor do elemento e aviso com a borda do elemento, sem cobrir a barra do chefe
  (`12-forge-420x820.png`).
- Coleção: abas, chips de grupo, selos "Feita" e barras de progresso coerentes com a Loja e as Opções; no deitado, o
  cabeçalho compacto funciona (`04-coll-bestiary-820x420.png`).
- Subida de nível e Pausa com a build ao lado no desktop (`13-levelup-1000x680.png`, `14-pause-1000x680.png`).

## Não capturado

- A tela de vitória: no roteiro o Sineiro não morreu com `damageEnemy` direto e a captura caiu no meio da Noite Sem
  Fim (`15-end-won-420x820.png` mostra o HUD da partida, não a tela final). A tela de derrota está em
  `15-end-lost-420x820.png`, sem achados novos.
