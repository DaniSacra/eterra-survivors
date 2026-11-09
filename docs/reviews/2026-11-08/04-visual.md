# Revisão 2026-11-08 · Visual (arte e layout)

Commit: `97e273a`. Revisão feita pelo visual-director, só leitura: nada em `src/` foi alterado.

Método: servidor de desenvolvimento na porta 4175, Playwright em 420 x 820 (toque) e 1000 x 680 (mouse e teclado),
todas as cenas, mais multidões montadas pelo `window.game` (400 a 520 inimigos e 220 gemas por fase, os quatro
heróis, os três chefes com escolta, Maça de Ferro, Fogo, Quebra-Junta e Espada de Fogo congelados no quadro do
golpe). As capturas ficaram no scratchpad da sessão (fora do repo):
`/tmp/claude-1000/-home-dani-games-eterra-survivors/470e035a-3810-4b29-b6ff-5c2763c5683c/scratchpad/shots/`
(abaixo, só o nome do arquivo dentro dessa pasta). `00-sheet.png` é a folha com todas as texturas geradas.

Todos os itens A-01 a A-14, D-03 e L-03 do backlog estão feitos. Itens que voltam aqui são **regressões ou
casos que o item não cobriu**, citados pelo ID. A faixa da build no HUD e a Pausa como ficha da build já estão no
`05-ui.md` (propostas 1 e 4) e não se repetem aqui.

## Resumo

O jogo tem identidade: contorno único, olhos grandes, heróis com cor própria, menus coerentes. As gemas azul-claras
leem bem nos três chãos escuros. Os problemas mais visíveis estão **na luta**: (1) o azul das gemas é o mesmo do
gelo (flor de gelo no chão, tinta de congelado, Geada, fantasmas e ossadas da Cripta); (2) as armas novas de área
(Maça, Fogo e seus Elos) pintam discos opacos que lavam a multidão, e os números de dano viram blocos sobre o herói;
(3) o vermelho de "inimigo atingido" é o vermelho da Andilla e o herói ferido vira um borrão vermelho chapado;
(4) chefes e elites ficam por baixo da escolta. Fora da luta: chão da Estrada com listras repetidas, faixa
descoberta na subida de nível, títulos e Pausa fora do padrão.

## Achados, do mais visível ao menos visível

### 1. Azul das gemas igual ao azul do gelo e da Cripta · alto

- Onde: `src/render/art/items.ts:67-68` (gema `0x5ccbff` / `0xd4f2ff`); `src/render/art/tiles.ts:121-131`
  (`decal.iceFlower` `0x9ad8ff`, mesmo tamanho de uma gema pequena); `src/render/art/tiles.ts:180-186`
  (`decal.puddle` azul); `src/render/fx.ts:66-67` (tintas `frozen 0x80c8ff` e `slowed 0xb8e0ff`);
  `src/render/fx.ts:42` (`FROST_COLOR 0x9ad8ff`); `src/render/art/enemies.ts:124` (ossada `0xa4b8da`) e
  `:133-140` (fantasma `0xcbe4f4` com olho ciano).
- Evidência: `06-game-start-valmor-420x820.png` (a flor de gelo perto do rodapé parece uma gema que não se coleta);
  `07-crowd-valmor-*.png` (gemas dentro da Geada somem; esqueletos lentos ficam azul-gema);
  `08-crowd-crypt-*.png` (na Cripta, ossadas, morcegos e fantasmas são todos azul-acinzentados: a gema perde a
  vez). Nos chãos vazios a gema lê bem (A-05 ok); o problema é a família de cor.
- Correção: a gema é a única coisa azul-ciano saturada e brilhante na tela.
  1. Flor de gelo em branco-lilás pálido e alfa menor (`0xe8e2f4`, 0.35), ou trocar por cristal branco; poça da
     Estrada em cinza-azulado neutro (`0x4a5470`, como os montes do próprio tile).
  2. Tinta de lento/congelado mais branca e menos saturada (`slowed 0xd8e4f0`, `frozen 0xc8d8f0`), lendo como
     "geada por cima", não como "azul-gema".
  3. Na gema, um brilho que pisca: no `gemMirror` (`src/scenes/GameScene.ts:76-83`), alfa ou escala oscilando por
     `sin(world.time * 6 + g.x)` (sem alocação, igual ao balanço dos itens em `:90`). Nada mais na tela pisca assim.
  4. Fantasma sem olho ciano (usar `0xe8f6ff` ou dourado pálido), para não repetir o brilho da gema.

### 2. Maça de Ferro, Fogo e seus Elos lavam a multidão · alto

- Onde: `src/render/fx.ts:24-25` (estilos `mace` cinza `0xd8d0c4` e `jointBreaker` creme) desenhados pelo laço de
  golpes em `:183-208` com preenchimento `0.6` (`:194`) por cima dos inimigos (`fxTop`, profundidade 11);
  `src/render/fx.ts:55-56` e `:214-221` (Fogo e Espada de Fogo: uma linha reta com as camadas do raio, disco
  `core` a 0.5 e disco de cor a 0.4 em `:231`).
- Evidência: `15-weapons-base-slashes-1000x680.png` (a Maça é um disco cinza de ~300° que deixa todos os inimigos
  embaçados: parece neblina, não um golpe pesado); `15-weapons-elo-slashes-1000x680.png` (Quebra-Junta, dois leques
  creme quase cobrindo o círculo); `15-weapons-base-bolts-1000x680.png` (Fogo: um "palito" laranja inclinado e um
  disco marrom, porque laranja a 0.4 sobre azul-noite vira marrom); `15-weapons-elo-bolts-420x820.png` (Espada de
  Fogo: listras retas paralelas como sabres de luz, discos laranja cobrindo inimigos e a vida do herói).
- Correção (só em `fx.ts`, sem alocação):
  1. Golpes de maça: sem fatia cheia. Uma faixa grossa na borda (`lineStyle(8..10)` entre `0.8 * range` e `range`),
     a borda fina por fora e 5 a 6 lascas curtas de poeira radiais na borda. Preenchimento no máximo 0.15.
     Quebra-Junta igual, em cobre `0xc86a3a` com faíscas douradas, para ler como Elo.
  2. Fogo: uma bola de fogo caindo (círculo `core` com cauda em gota na cor) em vez da linha; no impacto, 6 línguas
     de chama em triângulo (o mesmo desenho da Chama de Yah em `fx.ts:134-147`) e um anel claro. Disco no máximo 0.2.
  3. Espada de Fogo: uma espada caindo de ponta (reusar `drawSword` com `color 0xffe080`, `dark 0xff5a2a`) com
     línguas de chama no impacto. Assim o Elo tem silhueta própria, não só "Fogo mais grosso".

### 3. Números de dano em bloco sobre o herói · alto (A-04 feito, caso não coberto)

- Onde: `src/scenes/GameScene.ts:109-131` (um número por inimigo atingido, fonte de 13 px no mundo);
  `config.effects` / `core/effects.ts` (soma por inimigo, mas não por golpe de área).
- Evidência: `09-crowd-road-elos-420x820.png` (Quebra-Junta: "124 166" empilhados em ~15 camadas sobre o Teo);
  `15-weapons-base-bolts-1000x680.png` e `15-weapons-elo-slashes-1000x680.png` (blocos de "51 86" e "83"
  dourados). Com zoom 420/480 = 0.875, o número de 13 px aparece com 11,4 px no celular, abaixo do mínimo de 12.
- Correção: armas de área (`arc`, `strike`, e o golpe do chefe) mostram só os 3 a 4 maiores números por golpe, ou
  um número somado no centro do golpe; deslocar cada número com um desvio determinístico por `uid` para não
  empilhar na mesma coluna; fonte de `Math.ceil(14 / zoom)` no celular (ou `setScale(1 / zoom)` na criação).

### 4. Vermelho de "atingido" igual ao da Andilla; herói ferido vira borrão chapado · alto

- Onde: `src/render/fx.ts:65` (`TINT.hit 0xff7070`) e `:16` (`HERO_COLOR.andilla 0xe86a7a`);
  `src/scenes/GameScene.ts:312` (`setTintFill(TINT.heroHurt)` apaga rosto e roupa do herói por 90 ms).
- Evidência: `10-crowd-andilla-420x820.png` (Andilla, contorno vermelho, cercada de inimigos vermelhos de dano: o
  olho não acha o centro); `11-boss-bellRinger-1000x680.png` e `11-boss-blackKnight-1000x680.png` (o herói ferido
  é uma silhueta vermelha lisa no meio da escolta).
- Correção: piscar de dano dos inimigos em branco (`setTintFill(0xffffff)` durante `e.flash`, o padrão do gênero e
  neutro para os quatro heróis); herói ferido com `setTint(0xff9090)` (multiplica, mantém o rosto) e o contorno
  piscando branco, que já existe (`GameScene.ts:212-216`).

### 5. Chefes e elites desenhados por baixo da escolta · alto

- Onde: `src/scenes/GameScene.ts:133` (todo inimigo na profundidade 5, na ordem do pool).
- Evidência: `11-boss-blackKnight-420x820.png` (o Cavaleiro Negro aparece só pela capa atrás de esqueletos);
  `11-boss-bellRinger-1000x680.png` (o Sineiro some sob as Ossadas que ele mesmo chama);
  `11-boss-oldWolf-420x820.png` (o Lobo Velho, com 78 px, não se acha no meio dos Encapuzados). A arte de A-08 está
  boa, mas fica coberta.
- Correção: no `enemyMirror`, ao trocar a textura (já existe o `if` em `:136`), `setDepth(e.def.boss ? 7 :
e.def.elite ? 6 : 5)`. Custo zero por quadro. O aviso no chão (`drawBossWarning`) continua por baixo de todos.

### 6. Elites sem cor de destaque · médio

- Onde: `src/render/art/enemies.ts:188-229` (Goblin e Golem só têm sombra preta, `:192` e `:215`).
- Evidência: `07-crowd-valmor-1000x680.png` (o Goblin Lanceiro tem quase o tamanho de uma Gosma e não se destaca;
  ninguém sabe que ele solta o baú).
- Correção (padrão: "elites maiores, com cor de destaque"): trocar a sombra das elites por um anel dourado no chão
  desenhado na própria textura (`fill(0xffd870, 0.35)` + borda `0xe8b840` em volta da sombra), sem custo por quadro.
  Opcional: Goblin 10% maior (`w/h 46`).

### 7. Chão da Estrada do Sul com listras e pedras repetidas · médio (A-10 feito, caso não coberto)

- Onde: `src/render/art/tiles.ts:68` (sulcos como faixas de largura total em y 38 e 84 de cada tile de 128 px) e
  `:72-77` (pedras com sombra e brilho `0xa2a2ac`, contraste alto).
- Evidência: `11-boss-oldWolf-420x820.png` e `11-boss-oldWolf-1000x680.png` (listras horizontais a cada 46/82 px e
  a mesma constelação de pedras repetida em grade; as pedras claras competem com as gemas e com os Encapuzados).
  O tile da Cripta repete o musgo na mesma posição a cada 128 px (`15-weapons-rat-slashes-1000x680.png`), menos grave.
- Correção: tirar os sulcos do tile (ou desenhá-los como decal curto e curvo); pedras do tile sem brilho e em tom
  próximo do chão (`0x4e566e`), deixando as pedras com volume só para o `decal.stones`. Musgo da Cripta: metade dos
  pontos, alfa 0.15.

### 8. Rato Gigante pequeno e investida sem preparo legível · médio

- Onde: `src/render/art/enemies.ts:146-164` (corpo 18 x 11 para um `radius` de 12 em `src/data/enemies.ts:76`;
  o padrão pede corpo de ~24); `src/scenes/GameScene.ts:145-146` (a preparação da investida de Rato e Encapuzado
  usa o mesmo tremor de rotação do chefe, quase invisível em sprites de 24 px).
- Evidência: `15-weapons-rat-slashes-1000x680.png` (os ratos parecem do tamanho de morcegos, finos, olho pequeno);
  nas multidões, a investida dos Encapuzados não se distingue de andar.
- Correção: rato com corpo `ellipse(15, 13, 22, 14)`, cabeça um pouco maior e olho `r 2.4`. Preparação de
  investida (inimigos sem `ability` e com `act === Windup`): agachar (escala `x 1.15, y 0.8`) em vez de girar, e
  na arrancada um esticão (`x 1.2, y 0.85`). Tudo no `enemyMirror`, sem alocação.

### 9. Subida de nível deixa uma faixa clara cortando o HUD · médio

- Onde: `src/scenes/LevelUpScene.ts:12` (`HUD_BARS = 44`) e `:38-45` (escurece só abaixo de 44 px);
  `src/scenes/HudScene.ts:92-94` (abates e ouro ficam em y 36 a 53).
- Evidência: `12-levelup-1000x680.png` e `12-levelup-420x820.png` (uma faixa de 44 px do chão sem escurecer no
  topo, com "0 ouro" e "0 abates" cortados ao meio pela borda do escuro).
- Correção: escurecer a tela inteira e trazer o HUD para cima enquanto a escolha está aberta
  (`this.scene.bringToTop(SCENES.hud)` no `create` da LevelUp, e o mesmo na Pausa). As barras ficam nítidas sem a
  costura, e Pausa e LevelUp passam a seguir a mesma regra (hoje a Pausa cobre o HUD todo, `13-pause-*.png`).

### 10. Pausa: "Desistir" com o mesmo peso de "Continuar" e larguras desalinhadas · médio

- Onde: `src/scenes/PauseScene.ts:19-23` (título branco, Desistir logo abaixo de Continuar, botões de 260 px e
  opções de 320 px).
- Evidência: `13-pause-420x820.png` e `13-pause-1000x680.png`.
- Correção: Continuar no topo, depois as opções, e Desistir por último, com borda e texto em `UI.danger`; todos com
  a mesma largura (`ow`). Título em `UI.gold` como os demais.

### 11. Opções só dizem o estado em texto · médio

- Onde: `src/render/options.ts:20-35`; `src/scenes/OptionsScene.ts:19` (título em `UI.text`, branco).
- Evidência: `05-options-420x820.png` ("Som: ligado", "Tela calma (sem tremor): não": nada visual diz o que está
  ligado).
- Correção: rótulo à esquerda e um selo à direita no cartão (ligado: fundo `UI.ok` a 0.18, borda `UI.ok`, texto
  `UI.okText`, como o selo "Completo" da Loja em `ShopScene.ts:69-79`; desligado: `UI.textOff`). Título em
  `UI.gold`. Reaproveitar o mesmo selo na Pausa.

### 12. Vida do herói em duas cores · médio

- Onde: `src/render/fx.ts:61-62` (barrinha sob o herói verde `0x7cd860`, vermelha abaixo de 35%) contra
  `src/render/ui.ts` `UI.hp 0xd83a4a` (barra do HUD sempre vermelha).
- Evidência: `07-crowd-valmor-420x820.png` (verde embaixo do herói, vermelho no canto: parecem duas coisas).
- Correção: uma cor só para a vida. Sugestão: `UI.hp` nas duas, com a barrinha piscando em `UI.danger` abaixo de
  35%. Se o verde ficar, vira token `UI.hpOk` e entra também no HUD.

### 13. Tremor de câmera mostra a borda vazia do mundo · médio

- Onde: `src/scenes/GameScene.ts:231-233` (o chão cobre a vista com só 2 px de margem) e os tremores de
  `:311`, `:318`, `:341` (0.006 a 0.012 da largura, 6 a 12 px de tela).
- Evidência: `11-boss-blackKnight-1000x680.png` (faixa escura de ~7 px na borda esquerda durante o tremor do dano).
- Correção: margem de 24 px de mundo (`- 24` na posição e `+ 48` no tamanho do `ground`) e o mesmo na área dos
  decals.

### 14. Aranha comum com olhos brilhantes · baixo

- Onde: `src/render/art/enemies.ts:102` (`pen.glow` vermelho na Aranha, que é inimiga comum).
- Evidência: `00-sheet.png` (é o único comum com olho de "inimigo sério").
- Correção: dois `pen.eye` brancos grandes (r 2) e um terceiro olhinho menor; o vermelho fica para Ossadas,
  Encapuzados e chefes, como manda a escada de ameaça.

### 15. Gema grande maior que um inimigo comum · baixo

- Onde: `src/render/art/items.ts:100-101` (`gem(1.35)` e `gem(1.9)`: a grande tem 23 x 27 px de mundo).
- Evidência: `08-crowd-crypt-1000x680.png` e `11-boss-bellRinger-1000x680.png` (gemas grandes maiores que
  morcegos e quase do tamanho de uma Ossada).
- Correção: `gem(1.25)` e `gem(1.6)`, e a diferença de valor vem do brilho que pisca mais forte (achado 1).

### 16. Livro de Elos: Elo desconhecido vira um disco liso · baixo

- Onde: `src/scenes/EloBookScene.ts:41` (`setTintFill(UI.borderOff)` apaga o desenho do ícone, sobra o aro).
- Evidência: `04-elobook-420x820.png` e `04-elobook-1000x680.png` (sete discos iguais).
- Correção: mostrar o ícone da arma de origem (`icon.${evo.from}`) com `setTint(0x404858)` e um "?" em `UI.gold`
  por cima (o texto "?" já existe como `t.elos.unknown`). A dica fica visual, como no jogo original.

### 17. Preparação: botão principal à direita e heróis pequenos nos cartões · baixo

- Onde: `src/scenes/SelectScene.ts:77-88` (Voltar à esquerda, Partir à direita; o padrão pede o principal à
  esquerda, como na `EndScene`); `:126` (herói a `ART_SCALE * 0.9`, ~18 px no cartão).
- Evidência: `02-select-420x820.png`, `02-select-1000x680.png`.
- Correção: Partir à esquerda e Voltar à direita; herói do cartão a `ART_SCALE * 1.2`, usando o vão vazio abaixo
  da descrição (os cartões de 420 px têm ~40 px livres).

### 18. Menu e Loja com espaço sobrando · baixo

- Onde: `src/scenes/MenuScene.ts:25-26` e `:73` (grupo dos heróis limitado a `k 2.2` e a 42% da altura);
  `src/scenes/ShopScene.ts:41` (cartões limitados a 58 px).
- Evidência: `01-menu-1000x680.png` (heróis de ~45 px numa tela de 680, vão de ~60 px entre a frase e os botões);
  `03-shop-420x820.png` (~180 px vazios sob a lista).
- Correção: no menu, subir o limite para `k 3` e descer a frase para perto dos botões; na Loja, `Math.min(66, ...)`
  e centrar a grade na altura disponível.

### 19. Textos pequenos fora do i18n e dica de teclado no celular · baixo

- Onde: `src/scenes/HudScene.ts:70` (o "II" da pausa é texto solto, fora do `pt-BR.ts`);
  `src/scenes/LevelUpScene.ts:69` (no toque, a dica diz "ou use 1, 2, 3").
- Correção: desenhar o ícone de pausa (duas barras com `Graphics` ou um `icon.pause` em `render/art/icons.ts`);
  dica de toque sem teclas no celular (`t.levelUp.hintTouch`), como já faz a Preparação com `t.select.keys`.

## O que está bom e deve ficar

- Heróis com contorno colorido e anel no chão: acha-se o herói em menos de 1 s nas três fases (A-02 ok), exceto o
  caso da Andilla ferida (achado 4).
- Ícones de arma e de Elo (`00-sheet.png`): Maça/Quebra-Junta e Fogo/Espada de Fogo diferem bem em forma e cor.
- Lobo Velho e Cavaleiro Negro com luz de baixo, quando visíveis (`11-boss-oldWolf-1000x680.png`).
- Tela final dimensionada ao conteúdo e centrada, com a meta da Loja em dourado (`14-end-lost-*.png`).
- Livro de Elos com receitas em dourado e dono da arma assinatura; cores e tokens de `UI` respeitados nas cenas.

## Ordem sugerida

1. Achados 4, 5 e 13 (uma linha cada, efeito imediato na luta).
2. Achado 1 (família de cor das gemas) e 15.
3. Achados 2 e 3 (Maça, Fogo e números), juntos, com captura antes e depois e F4 para medir FPS.
4. Achados 6, 7 e 8 (arte: elites, Estrada, rato).
5. Achados 9 a 12 (layout de LevelUp, Pausa, Opções, cor da vida) e o resto.
