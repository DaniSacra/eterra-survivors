# 04 Visual (2026-11-11, commit 7e51776, foco Cripta)

Capturas (420x820 = `m-`, 1000x680 = `d-`), em `/tmp/claude-1000/-home-dani-games-eterra-survivors/65a2d29d-24a3-46ee-8b2b-e862c2b93e2f/scratchpad/`:
`m-c2-0.png` (Cripta, início), `m-c2-2.png` (multidão, 3:13), `m-c2-boss.png` (Sineiro, 5:04), `d-c2-3.png` (Sineiro, desktop),
`m-select.png`, `m-menu.png`. (O "NaN/180" no HP das capturas é do meu script que forçou o HP; não é bug do jogo.
O tempo do mundo foi adiantado por script, por isso o Sineiro aparece com a multidão ainda na tela.)

Resumo: os sprites PixelLab dos inimigos da Cripta ficaram da mesma família do Aldo e muito mais próximos do Sea of
Stars do que o resto. O gargalo agora é o **cenário** (um tile único repetido, props em código), a **animação**
(inimigos são quadros parados com squash) e a **leitura do herói no monte**. Itens já cobertos: AR-04 (Pen repintado,
proposto), AR-02 "falta: tiles novos e borda irregular" (confirmo, abaixo), A-05 (gemas, feito).

## 1. Alto impacto

1. **Chão da Cripta é um único tile de 128 px repetido** (`src/scenes/GameScene.ts:235` tileSprite; `src/render/art/tiles.ts:62-92`
   `tile.crypt`, uma só textura com seed fixa). Em `m-c2-0.png` e `m-c2-2.png` o desenho de tijolos se repete em grade
   visível, com as mesmas manchas verdes nos mesmos lugares. É o oposto da regra 3 das referências ("sem cor de tile
   plana, props em vários tamanhos") e do padrão ("variantes por hash da célula"). Os decalques (`decals.ts:16`)
   ajudam pouco: são esparsos (45% das células de 150 px). Proposta: 4 a 6 variantes de 128 px escolhidas por hash de
   célula (ou chão por chunks), não TileSprite; mais tarde, tileset PixelLab pro (`create_topdown_tileset`, 15 gerações, 32 px,
   com lajes em relevo). Parte do AR-02 "falta tiles novos"; vale um item novo.
2. **Cripta é a mais clara e mais saturada de ruído das três fases e briga com os comuns**: blocos rosa/azul/teal com
   musgo ciano (`tiles.ts:75-92`) têm valor parecido com o de morcegos magenta, fantasmas lilás e Aldo. Em `m-c2-2.png` o
   herói e o morcego somem no fundo; é a "lama" que o README dos Sea of Stars condena para o oposto: personagens devem
   ser mais saturados e claros que o chão. Reduzir o valor/contraste dos blocos (juntas e topos a 60-70%) e deixar a
   saturação para os props e as luzes. `lighting.ts:18` (`crypt ambient 0x3c3260`) já é violeta; o chão está acima
   do ambiente por causa do glow aditivo.
3. **Herói se perde no monte** (`m-c2-2.png`, `m-c2-boss.png`, `d-c2-3.png`): Aldo (64x80 art px) é menor que esqueletos
   (108x124 arquivo, mesma escala) e que os Coveiros (192x192), e o monte de inimigos em volta tapa os pés. Hoje só
   há a luz do herói (`HERO_LIGHT` 200) e o contorno que pisca ao apanhar (`GameScene.ts:155` playerOutline). A-02 foi
   marcado feito antes dos sprites novos; reabrir. Sugestões: contorno/halo âmbar sempre ligado e fino (cor de
   identidade `0xe8b840`) com a profundidade do herói acima de tudo (já 13.1), sombra elíptica sob ele e talvez
   +10% de escala; nunca reduzir os inimigos abaixo do hitbox.
4. **Inimigos sem ciclo de andar**: são imagens estáticas (`assets.ts:41-52`, `pixelEnemies`, ids como `enemy.skeleton`)
   com squash por seno (`GameScene.ts:346-357`). Em multidão o squash lê como vibração; o Aldo anda (6 quadros), eles
   deslizam. Incoerência de movimento entre herói e inimigos. Custo: andar leste por inimigo = 1 geração cada
   (`animate_character` template, 10 sprites = 10), mas os inimigos foram criados por `create_character_pro_flash`/objeto;
   conferir se há esqueleto. Prioridade: Ossada, Esqueleto, Morcego (asas batendo é o que mais vende "vivo"), Fantasma.
   Sem animação de morte nem de dano: só flash branco (`GameScene.ts:378-394`). Backlog tem AR-05 "idle, andar, dano e
   morte" como meta; só os heróis cumprem.
5. **Props da Cripta ainda são código (Pen), em outro estilo que os sprites** (`tiles.ts:170-232`, `obstacle.0/0t/1/2`;
   `decals`): colunas lisas de 3 tons, sarcófago e lápide com contorno grosso 2 px cartoon e brilhos retangulares.
   Ao lado de Aldo e das Ossadas PixelLab (contorno fino tingido, 2-3 tons, rim de luz) parecem de outro jogo.
   Sem variedade: 3 tipos de obstáculo, 7 decalques (`decals.ts:16-24`), um deles repetido duas vezes. Tochas só em
   metade das colunas (`obstacles.ts:50`). Proposta, na ordem: colunas (1 objeto 8 direções não precisa; `create_1_direction_object`
   64 px, 10 gerações, candidatos grátis), sarcófago, lápide; depois decalques de ossos, teias, tocha de parede e arco.
   Props devem estar em 3 escalas (coluna alta, urna pequena, grade) como nas refs 01/03/04.
6. **Sineiro a 1.5x é solução provisória** (`assets.ts:72` `SPRITE_SCALE`, 190x204 arquivo). Em `m-c2-boss.png` ele é
   apenas um pouco maior que os 3 Coveiros (192x192) e o "monte" (ponto 3): não "enche a tela" (padrão: 70-85 px de
   corpo, ref-05: um terço da tela). Escalar o sprite 1.5x também quebra a densidade de pixel única (pixels de 3x3 vs 2x2)
   e o NEAREST gera bordas de espessura diferente do resto. Gerar o chefe em tamanho nativo maior (128 a 192 px, v3
   ~4 a 6 gerações) com ponto fraco brilhante (o sino) e luz própria; a luz de chefe já existe (`lighting.ts`), conferir que acompanha o novo tamanho.
   Os Coveiros (sub-chefes?) com a mesma silhueta do chefe poluem: nas capturas três deles formam um bloco marrom
   idêntico (`gravedigger`) e o chefe se confunde. Dar cor própria ao chefe e variação de capuz aos Coveiros.

## 2. Médio impacto

7. **Comuns pouco saturados / fora da regra "uma cor principal por criatura"**: Ossada, Esqueleto e Ossada em Brasa são todos
   branco-osso; o Esqueleto de escudo azul-cinza e o Ossada diferem só no escudo. Em multidão (`m-c2-2.png`) leem como uma
   massa branca. Enquanto Morcego (magenta), Fantasma (lilás), Espírito Gélido (ciano) e Gosma (verde) separam bem. Dar ao
   Esqueleto uma cor dominante (ex. armadura azul-aço mais escura e capa vermelha já existe, aumentar a mancha) e à Ossada
   crânio mais amarelado ou olho âmbar; tudo isso é regeneração (10 gerações cada com `create_character_state`).
8. **Fantasma lilás-claro tem o maior valor da tela** e chama mais atenção que o perigo real
   (`m-c2-boss.png` e `d-c2-3.png`): brilha mais que o herói. Escurecer o corpo 15 a 20% e manter só os olhos e a boca brilhantes
   (regra "um acento brilhante"; rosto sorridente no fantasma também é cômico demais para uma ameaça de fase 2, mas é
   coerente com a regra comic do Sea of Stars; deixo a decisão para o Daniel).
9. **Faltam sombras de contato nos sprites de inimigos**: os heróis têm sombra, os inimigos PixelLab não
   (`GameScene.ts` loop de inimigos, ~l. 340). Uma elipse escura pré-alocada por inimigo (ou uma só textura "shadow" na
   profundidade abaixo) cola os sprites no chão e separa o monte. Custo: 1 imagem por inimigo, sem alocação por quadro.
10. **Clarões de luz quentes fracos no chão**: as velas e tochas aparecem (`m-c2-0.png`, canto inferior direito), mas o raio
    de 120/200 px com tinta laranja quase não lê sobre o chão roxo claro; a regra "luz quente contra escuridão fria" (ref
    README 4) pede poças maiores e mais contrastadas, o que combina com o ponto 2 (escurecer o chão para a luz contar).
11. **Contraste de cartas de nível com a multidão atrás** (`d-c2-3.png` mostrado durante o nível): painéis bem legíveis, mas o
    texto do cabeçalho "Subiu de nível!" cai sobre os inimigos em 1000x680; pequena observação, já aceitável.
12. **Borda do mapa**: a Cripta é obstáculos infinitos; sem borda irregular caindo no preto (AR-02 "falta", confirmo).
    Na Estrada há floresta; a Cripta só tem "chão infinito". Baixa prioridade se a fase é aberta por design.

## 3. Menor / coerência

13. `heroFit` e `MENU_HERO_H` (`assets.ts:63-70`) escalam os heróis para o tamanho do chibi de código; o Aldo (64x80) e os
    outros (48x64) têm quadros diferentes, e a densidade de pixel do Aldo agora é a referência da Cripta. Se os outros
    heróis forem regenerados (Lyra e Teo perderam o cajado e a maça, backlog AR-05), regenerar no mesmo estilo do Aldo
    novo (v3, referência `aldo.png`) para o jogo parecer de uma só mão. Hoje em jogo só se vê o Aldo na Cripta.
14. Ícones, HUD e cartas continuam no estilo vetorial arredondado do `Pen` (`icons.ts`): os ícones de arma nas cartas
    (`m-c2-2.png` via level-up) têm contorno e brilho cartoon; aceitável como UI, mas o ponto de AR-04 cobre.
15. Layout em celular: HUD cabe em 420 px, sem rolagem horizontal, alvos de toque corretos nas cartas e nos botões
    (Trocar/Pular/Banir 44 px). Não encontrei problema de layout; a nota é só o painel de atributos que ocupa quase metade
    da tela de level-up em 420x820 (`m-c2-2.png` primeira captura), empurrando as cartas para cima e cobrindo o chão; já
    é o desenho escolhido (A-11), apenas observação.

## 4. O que está bom (manter)

- Família visual dos inimigos da Cripta com o Aldo: cabeça grande, silhueta robusta, contorno tingido, cor forte + um
  acento. Morcego, Espírito Gélido e Gosma são os melhores exemplos.
- Escuridão por fase e luzes (AR-01) funcionam: o inimigo nunca desaparece; a luz do herói em âmbar lê bem em `m-c2-0.png`.
- Pickups e avisos (AR-03): faixas e círculos do Sineiro (`m-c2-boss.png`, anéis tracejados) leem bem.

## Ordem sugerida (custo de gerações, conta com 40 + 5 por dia)

1. Pontos 1 e 2 (variantes do chão, menos valor): código, 0 gerações.
2. Ponto 3 e 9 (halo/sombra do herói e dos inimigos): código, 0 gerações.
3. Ponto 5 (3 props principais, `create_1_direction_object` 10 gerações cada, ~30), depois decalques.
4. Ponto 4 (animação de andar do Morcego, Ossada, Esqueleto: 3 a 6 gerações).
5. Ponto 6 (chefe novo, 4 a 6 gerações) e 7 (recolor, 10 cada).

Nada foi alterado em `src/`, `tests/` ou `docs/design/`; servidor 4175 encerrado.
