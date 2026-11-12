# 04 Visual (2026-11-11, commit 18f6ee3)

Escopo: só revisão, nada implementado nem gerado. Capturas em
`/tmp/claude-1000/-home-dani-games-eterra-survivors/af7b83b9-2eaa-495e-882f-2287b4d17434/scratchpad/s/`
(`m-` = 420x820, `d-` = 1000x680, sempre `?dev`): `m-menu.png`, `m-heroes.png`, `m-stages.png`, `m-story.png`,
`m-shop.png`, `m-collection.png`, `m-options.png`, `m-g-valmor-0.png`, `m-g-valmor-330.png`, `m-g-crypt-0.png`,
`m-g-crypt-330.png`, `m-g-southRoad-0.png`, `d-g-valmor-330.png`, `d-g-crypt-150.png`.

Aviso sobre as capturas de jogo: avancei o mundo por script (`world.step` em laço, escolhendo a carta 1 nos
level-ups, herói com HP forçado). Por isso aparecem "99897/160" no HP, a barra do herói larga demais, o overlay de
level-up com as cartas vazias e o "Fim de jogo" da Estrada. Isso é do script, não do jogo, e não está nos achados.
Não consegui mostrar a Estrada com multidão (o herói morreu a 0:57 no meu script).
A porta 4175 já tinha um servidor de outro processo (pid 90999); usei-o só para leitura e não o parei. O meu,
que subiu em 4176 por engano, foi parado.

Resumo: o que mudou desde a revisão anterior funcionou. Chão de PixelLab nas quatro fases, inimigos com andar,
cenário por fase, Menu com ilustração e luz. O gargalo agora é a **coerência**: HUD e menus continuam em outro
mundo (fonte serifada do sistema, painéis chapados e ícones em código) ao lado de sprites hi-bit; Valmor não lê
como neve; e vários itens já propostos (CA-01, CA-02, CA-03, CT-03, AR-02 b) seguem abertos. Itens já no
backlog estão citados com o ID e não são repetidos como achado novo.

## 1. Alto impacto

1. **A fase de Valmor não parece neve nem vila** (`public/sprites/tiles/valmor.png`, `ASSETS.tile`
   em `src/render/assets.ts:~58`; `m-g-valmor-0.png`, `d-g-valmor-330.png`, `m-stages.png`).
   O chão é cascalho azul-acinzentado com tufos secos, sem neve, sem estrada, sem campo. O texto do cartão da
   fase diz "Celeiros, cercas e campos na neve" e o Menu mostra neve e luz quente: a promessa do Menu não chega
   à partida. Este tile também é o fundo de Heróis, Loja, Opções, Coleção e das miniaturas da Fase (`StageScene.ts:27`, `ShopScene.ts:120`
   etc.), então as telas de menu leem como "porão de pedra", não como Valmor. Os decalques de Valmor
   (lanterna, cerca, monte de neve) são pequenos e, a 420 px, a lanterna lê como uma chave laranja (`m-g-valmor-0.png`,
   quatro deles). Proposta: regerar o tile de Valmor com neve rala sobre terra escura (a Estrada e a Cripta
   já estão na família certa) e dar às lanternas o dobro do tamanho e um halo. AR-02 só cita "neve" como detalhe;
   item novo, M, ~1 geração (tileset) mais decalques.
2. **HUD e menus ainda não têm o mundo em pixel**: toda a tipografia é `Georgia, "Times New Roman", serif`
   do sistema (`src/render/ui.ts:24`), suavizada, ao lado de sprites de 2x2 px. Painéis são retângulos chapados e
   botões são caixas lisas (`m-shop.png`, `m-options.png`, `m-story.png`); a barra de vida é um retângulo
   vermelho de 6 px (`GameScene.ts:831-834`, `HudScene`); o joystick é um círculo vetorial
   (`src/render/joystick.ts:21-22`). O Menu (`m-menu.png`) é o único ponto onde título, botões e arte conversam.
   Ícones do HUD, da Loja e das cartas são `ICON_ART` (código, `src/render/art/icons.ts`, 379 linhas), e o resto
   dos itens do chão também (ver 3). O backlog tem CU-07 "moldura das barras do HUD", mas nada sobre fonte e painel. Proposta: (a) uma fonte pixel
   (bitmap font ou web font de pixel com licença livre) para títulos e HUD, sem custo de geração; (b) moldura
   e botões em 9-slice de PixelLab (um `create_image_pro` pequeno de painel e botão, 10 gerações, mais
   reduce_colors no tom do jogo); (c) barra de vida do herói com moldura e brilho de pixel. Item novo, M.
3. **Os inimigos comuns ainda não pisam no chão** (`GameScene.ts:507-518`, `:818-825`): a sombra só é desenhada
   para o herói e para voadores. Em `m-g-crypt-330.png` o monte de esqueletos e ossadas flutua e vira uma massa
   de recortes sobre a pedra. É o CA-01 (proposto, P): subo a prioridade, é o item de custo
   mais baixo (zero gerações, uma textura `shadow`) e de maior ganho de leitura da multidão.
4. **Multidão da Cripta: três silhuetas claras iguais** (`m-g-crypt-330.png`). Ossada, Esqueleto de escudo e
   Ossada em Brasa seguem brancas e do mesmo tamanho aparente; só os esqueletos armados em azul-aço se separam. O herói (Lyra, roxa) se
   destaca só pelo halo claro (`GameScene.ts:96` `HERO_HALO`) e pela luz. É o CA-03 (proposto): confirmo e peço
   que ele venha antes de qualquer geração de inimigo novo, porque cada inimigo novo na Cripta pior a mancha.
5. **Heróis têm só andar e respirar** (`pixelHero('aldo', FRAME_HIBIT, 8, 4)`, `assets.ts:~108`). Não há
   quadro de ataque, de dano nem de morte; o dano é só flash branco e a morte é a tela final. O padrão pede idle, walk, hurt,
   death e ataque para heróis. Itens vizinhos: AR-05 (ajustes pendentes da Lyra e do Teo) cobre só cajado,
   maça e faixas. Proposta: `create_character_state` ou `animate_character` com `taking-punch` (1 geração por herói, leste)
   para o dano, e um clipe de queda para a morte (4 a 8 gerações no total). Sem isso o
   herói é o único elemento do jogo sem reação quando tomam dano além do flash e do tremor.
6. **Cripta: o desenho do chão ainda repete em grade** (`m-g-crypt-0.png`: o mesmo bloco grande de pedra a cada
   ~170 px; `GameScene.ts:328` `tileSprite` com um só tile por fase). O tile foi regerado em PixelLab (e014c73),
   mas continua um tile repetido; o AR-02 (a) pedia variantes por hash de célula e continua aberto.
   O chão agora é escuro e de baixo contraste, o que ajuda, mas na captura inicial (`m-g-crypt-0.png`) se vê
   a malha. Proposta: o que o AR-02 (a) já descreve; custo zero se reaproveitar os tiles dos decalques
   de rachadura, ou 1 geração de tileset com variantes.

## 2. Médio impacto

7. **Itens do chão, gemas e vários projéteis ainda são código** (`src/render/art/items.ts:141-257`: gemas,
   baú, ouro, comida, ímã, bomba, elixir, gelo; `proj.fury`, `proj.fan`, `proj.wisps`, `proj.soulProcession`).
   Nas capturas de multidão (`m-g-valmor-330.png`) as gemas ciano e as moedas leem bem, mas têm contorno e
   brilho de outra mão que os sprites de rato e aranha. As gemas têm a regra de ser "a única coisa ciano" (A-05) e funcionam; os pickups raros
   (baú, ímã, bomba) é onde o estilo destoa mais, e são o que o jogador mais quer olhar. Proposta: baú, ímã e bomba
   como `create_1_direction_object` 32 px (10 gerações cada, candidatos grátis), o resto depois. Os projéteis de
   Elo ficam com o vfx-director.
8. **Arte de código morta e comentário falso** (`src/render/art/enemies.ts` 558 linhas, `heroes.ts` 106,
   `assets.ts:11-13`): todos os 26 inimigos têm PNG em `public/sprites/enemies/` e os quatro heróis têm
   `pixelHero`. É o CT-03 (proposto): só acrescento que `heroes.ts` (`chibi`) também está morto e que `Pen`
   só é necessário para itens e ícones. Remover reduz o arquivo e tira a ilusão de que o jogo é "desenhado em código".
9. **Telas de menu com buracos de composição**: `m-story.png` tem 300 px vazios entre o texto da fase e Partir;
   `m-stages.png` deixa ~80 px vazios no fim da lista; `m-options.png` é uma coluna de quatro caixas no meio de
   um fundo repetido, sem a ilustração do Menu; `m-collection.png` mostra o Bestiário vazio ("???") com uma
   silhueta preta de rato num palco sem luz. Em 1000x680 o mesmo vale (não capturei todas). Proposta de baixo custo: usar o
   cartaz da fase (sprite do chefe e tile) na Story em tamanho maior e deixar o herói escolhido ao lado de Partir; usar as camadas
   `home.*` de fundo em Opções e Loja com alfa baixo; no Bestiário não visto, mostrar o chão da fase e uma
   luz fraca em vez de preto. Parte disto cabe no CU-07.
10. **Loja em modo dev: texto sobreposto** (`m-shop.png`): "Agora nada ainda" colide com a dica "– mudam o nível (grátis)"
    na mesma linha (y≈645), e a segunda linha de botões (Zerar tudo / Tudo no máximo) fica a 8 px dos
    − / +. É só no `?dev`, mas é a tela que o Daniel usa para testar. Arquivo: `src/scenes/ShopScene.ts` (bloco do painel
    de detalhe, ~`:284-336`).
11. **Painel de build em 1000x680 corta as últimas linhas** (`d-g-crypt-150.png`: o painel "Sobreviver, Ataque,
    Coleta" termina abaixo da tela, com "Ouro" fora). Só vi com o overlay de level-up que meu script forçou
    e as cartas não desenharam, então confirmar jogando antes de agir. Se for real, é o NB-08 / CU-04 ainda sem altura segura.
12. **Aviso de chefe sobre a barra do chefe e o título do level-up** (`m-g-valmor-330.png`: "Mãe-Aranha chegou!" a y≈245
    sobre a faixa do nome; `d-g-valmor-330.png`: o aviso encosta no herói). É o NB-08 (reaberto, proposto): o aviso deveria ficar abaixo da barra
    do chefe e acima do herói, com contorno de pixel, e some em 1,5 s.
13. **Valmor: ratos oliva sobre chão azul** (`d-g-valmor-330.png`) leem bem; o problema é a aranha-mãe, só um
    pouco maior que os ratos juntos e com o brilho do corpo fraco (`m-g-valmor-330.png`, canto inferior esquerdo).
    Não "enche a tela" (padrão: 70 a 85 px de corpo; a Mãe-Aranha tem ~110 px de largura mas está baixa na tela
    e coberta por ratos). Mesma recomendação do CA-02 para o Sineiro: luz própria mais forte e subir a profundidade
    do chefe acima da escolta. A luz de chefe existe (`GameScene.ts:124` `BOSS_LIGHT`, roxo claro) mas some em Valmor.

## 3. Pequenos e polimento

14. **Joystick desenhado como círculo vetorial branco** (`joystick.ts:21-22`) e visível na captura de desktop como
    disco laranja grande (`d-g-valmor-330.png`, canto inferior esquerdo): conferir se é o joystick ou uma luz de
    efeito; em ambos os casos é a única peça sem pixel no campo. Trocar por um anel e um botão em pixel (2 imagens pequenas).
15. **XP no topo**: a barra de experiência é uma faixa ciano chapada de 16 px no topo, colada ao "Nv 10" amarelo
    de ~12 px que encosta no botão de pausa (`m-g-valmor-330.png`, canto superior direito). Mesma família do item 2.
16. **O Fim de jogo** (`m-g-southRoad-330.png`) é um painel limpo e coerente com o resto do HUD; quando o item 2 sair
    ele é o primeiro candidato a molde (já tem a hierarquia de título coral, dourado e muted correta).
17. **Estrada (`m-g-southRoad-0.png`) é hoje a fase mais bem composta**: estrada de terra, floresta de pinheiros
    em pixel, fogueiras que acendem o chão, corredor legível; use-a como régua de densidade e de luz para
    Valmor (item 1) e Cripta (item 6). O Cavaleiro Encapuzado aparece cedo no topo e lê bem.

## Ordem sugerida (esforço contra ganho)

1. Zero geração: CA-01 (sombra), CA-03 por tinta, fonte pixel, remover a arte morta (CT-03), arrumar a Loja dev (10).
2. Uma geração de tileset: Valmor com neve (1).
3. Dez gerações cada: baú, ímã e bomba (7); moldura de painel e botão (2).
4. Dano e morte dos heróis (5), com a conta de gerações dita antes ao Daniel.
5. Variantes de chão da Cripta (6) junto com o AR-02 (b).

Nada nesta revisão foi gerado nem alterado no código. Registro de custos: nenhum.
