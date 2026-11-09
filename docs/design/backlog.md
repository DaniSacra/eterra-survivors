# Backlog do Eterra Survivors

Visão: uma partida rápida, mil jeitos de montar. Dez minutos no celular ou no navegador, com uma build que tem
profundidade de verdade e um motivo para jogar só mais uma.

Este backlog segue o plano do Daniel (Etapas 0 a 4) e encaixa nele as auditorias do balance-tester e do
visual-director de 2026-11-08, sem duplicar itens. O que o plano não cobre fica na Etapa 5 (profundidade e retenção),
na Etapa 6 (lançamento) ou em "Ideias para depois". Quando o plano do Daniel e um relatório divergem, vale o plano
(ver "Decisões já tomadas pelo plano").

Como ler: cada item tem ID, por quê (com a evidência), o quê mudar, dono, tamanho (P = horas, M = um dia,
G = vários dias) e critério de aceite. Dentro de cada etapa, a ordem é impacto sobre esforço.
Donos: **impl** (implementador), **visual** (visual-director), **bal** (balance-tester, verifica com sim e lab).

## Princípio de estilo (vale para tudo)

O cartoon fofo é intencional e deve ser preservado: inimigos simpáticos, cores suaves, traço vetorial (`Pen`).
Toda melhoria de arte é de legibilidade, acabamento e ambientação, nunca de tornar o jogo sombrio. Se uma proposta
(inclusive deste backlog) pede "mais escuro" ou "mais ameaçador", ela se resolve com contraste, contorno e luz, não
com tom sombrio.

## Forma de trabalho

1. Apresentar o plano de cada etapa ao Daniel e aguardar aprovação antes de mexer.
2. Uma etapa por vez. Cada passo termina com `npm test`, `npm run lint` e `npm run build` verdes, o jogo rodando e
   um commit pequeno (Conventional Commits, em inglês).
3. Números antes e depois: `npm run sim` e `npm run lab` rodam antes e ao fim de cada etapa (e de cada ajuste de
   balanceamento). A linha de base fica em `docs/balance-baseline.md`, e cada etapa acrescenta sua tabela antes/depois.
4. Ao fim de cada etapa, mostrar ao Daniel o que mudou, com os números do sim e do lab.
5. Textos do jogador só em `src/i18n/pt-BR.ts`. Arte segue `.claude/agents/visual-director.md`.

## Próximos 5

1. **S-01** Simulador `npm run sim`
2. **S-02** Linha de base em `docs/balance-baseline.md`
3. **B-01** Leque de Facas sem ponto cego
4. **B-02** "Arma própria" sobreposta na Preparação
5. **B-03** Cargas zeradas e itens da Loja com estado visual claro

---

## Etapa 0: Simulador (medir antes de mexer)

**S-01 · Simulador de partidas completas** · impl · M · ✅ feito
- Por quê: o bot atual do balance-tester é fraco (corridas de 4 a 6 min, "ler como relativo"); sem um bot
  estável, cada ajuste vira chute.
- O quê: `tests/lab/sim.test.ts` (pulado no `npm test`, como o lab) e script `"sim"` no `package.json`.
  Reaproveitar `scratchpad/balance/sim.ts` do balance-tester. 4 heróis x 3 fases x 4 sementes. Movimento: foge de
  inimigos próximos (peso 1/d², chefe com peso maior), anda tangencial à ameaça, vai a gemas e itens, vira de vez em
  quando para o inimigo mais próximo quando não está colado. Escolhas: Elo > melhorar arma possuída > arma nova
  (até 4) > passiva de receita de Elo > Força, Pressa, Quantidade, Alcance, Vigor, Armadura. Saída por partida:
  resultado, tempo, nível, abates, ouro, HP restante do chefe, Elos, snapshot a cada 2 min (nível, inimigos ativos,
  HP), top 3 armas por dano. Resumo por herói e fase: vitórias e tempo médio.
- Aceite: `npm run sim` roda as 48 partidas em menos de 2 min no Node, é determinístico por semente e o
  `npm test` continua sem rodá-lo.

**S-02 · Linha de base** · bal · P · ✅ feito
- Por quê: Forma de trabalho, item 3.
- O quê: criar `docs/balance-baseline.md` com a saída do sim e do `npm run lab` no commit atual, antes de qualquer
  mudança de dados.
- Aceite: arquivo com data, commit, tabela por herói x fase e DPS por arma do lab.

## Etapa 1: Bugs

**B-01 · Leque de Facas com ponto cego à frente** · impl · P · ✅ feito
- Por quê: balance-tester: count 10 par, nenhuma faca no centro (±18°); DPS solo 0, esqueleto a 100 px nunca morre.
- O quê: decisão do Daniel: quando o leque cobre o círculo inteiro, rotacionar meio passo (`core/weapons.ts`, fogo
  `thrown`), em vez de mudar para count 11. Teste em `tests/core/weapons.test.ts`: alvo logo à frente é atingido.
- Aceite: teste novo verde; no lab, Leque mata o esqueleto parado a 100 px.

**B-02 · "Arma própria" sobrepõe a descrição na Preparação** · impl + visual · P · ✅ feito
- Por quê: visual-director: cards de Aldo e Andilla em 1000x680; quebra de linha não contada, label sem
  alinhamento à esquerda, fonte 11px (`SelectScene.ts`).
- O quê: posicionar o label pela altura real do texto da descrição, alinhar à esquerda, fonte mínima 12px.
- Aceite: nada sobreposto em desktop (1000x680 e 1920x1080) e no celular 390x844, nos quatro heróis.

**B-03 · Estados desabilitados: cargas e Loja** · impl + visual · P · ✅ feito
- Por quê: plano do Daniel (Trocar/Pular/Banir com 0 cargas parecem clicáveis) e visual-director (Loja com 0 ouro:
  `card.setAlpha(0.55)` deixa o painel translúcido e não distingue caro de esgotado, `ShopScene.ts`).
- O quê: um estilo único de "desabilitado" em `render/ui.ts` (painel opaco, texto e borda em tom apagado), usado
  pelos botões de carga do LevelUp e pelos cards da Loja; "Completo" com selo próprio, diferente de "sem ouro".
- Aceite: com 0 cargas, os três botões aparecem desabilitados e não respondem; na Loja dá para distinguir à primeira
  vista comprável, caro e completo.

**B-04 · Raio e Geada miram fora da tela no retrato** · impl · P · ✅ feito
- Por quê: balance-tester: `viewReach = max(w,h)/2` (`core/weapons.ts`) deixa alvos nas laterais fora da tela no
  celular em pé. Baixa severidade, mas é o caso de uso principal do Daniel.
- O quê: usar a meia-largura e a meia-altura da vista separadamente (retângulo visível).
- Aceite: teste com vista 390x844: todo alvo escolhido está dentro do retângulo visível.

**B-05 · Lâmina com 2 golpes acerta duas vezes quem está sobre o herói** · impl · P · ✅ feito
- Por quê: balance-tester (`core/weapons.ts`, fogo `arc`). Menor.
- O quê: um inimigo recebe no máximo um acerto por disparo, mesmo com frente e costas.
- Aceite: teste com inimigo sobreposto ao herói recebe um acerto por disparo.

**B-06 · Dica "F3 depuração" aparece em produção** · impl · P · ✅ feito
- Por quê: visual-director: o menu mostra a dica de depuração para jogadores.
- O quê: `t.menu.controlsDesktop` sem o F3; mostrar a dica de F3 só em build de desenvolvimento.
- Aceite: no GitHub Pages a dica não cita F3.

## Etapa 2: Balanceamento (corrida justa até o chefe)

Hoje só 2 de 96 corridas do bot chegam às 10:00 (1 vitória). Meta da etapa (plano do Daniel): no sim, cada herói
sobrevive em média 6 min ou mais em Valmor, sem herói muito acima dos outros. Cada item roda sim e lab antes e
depois e registra em `docs/balance-baseline.md`.

**E-01 · Suavizar a curva das 3:00 às 10:00** · impl + bal · P · ✅ feito
- Por quê: balance-tester: HP inimigo por segundo em Valmor 382, 625, 1330, 2125 contra 1000 a 1800 de DPS de boa
  build, com 500 a 580 vivos; o pico das 4:00 tira os básicos e dobra o HP.
- O quê (`data/waves.ts`, `CURVE`): 240 s mantém básicos na mistura (`{ basic: 2, fast: 3, tank: 2 }`) e hpMult
  1.8; 300 s hpMult 2.1; 390 s 2.6; 480 s interval 0.55, batch 7, hpMult 3.1; 540 s interval 0.5, batch 8, hpMult 3.5.
- Aceite: no sim, tempo médio de sobrevivência sobe em todas as fases; nenhum snapshot passa de 600 inimigos ativos.

**E-02 · Inimigos rápidos mais lentos que o herói** · impl + bal · P · ✅ feito
- Por quê: balance-tester: corvo 140, morcego 135 e aranha 125 contra herói 150 causam 42%, 55% e 65% do dano
  recebido. Com a curva nova, a Estrada vai de 0/24 para 5/24 corridas que chegam às 10:00.
- O quê (`data/enemies.ts`): crow 126, bat 126, spider 120.
- Aceite: no sim, a fatia de dano dos rápidos cai abaixo de 40% em todas as fases.

**E-03 · Armas fracas na multidão** · impl + bal · M · ✅ feito
- Por quê: DPS em multidão (plano do Daniel): Luz de Elun 216, Adagas 278, Fogos-Fátuos 131, contra Lâmina 1984.
  balance-tester: Adagas é a pior heroína (187 s), Luz real 32, Martelo 57, Aura 77, Chama de Yah solo 38.
- O quê (`data/weapons.ts`), começando pelas assinaturas:
  - Adagas: pierce +1 e damage +2 por nível; L1 count 2, L2 e L3 count 3 (balance-tester: 404 a 547 s no bot).
  - Luz de Elun: cooldown -0.3 por nível (mínimo 0.8), L1 count 2.
  - Fogos-Fátuos: damage +2 em todos os níveis. Martelo: cooldown 2.2 para 1.8 (L5 a L7 1.6).
  - Aura de Yah: L1 damage 4, L7 11; Chama de Yah 14.
  - Lâmina: só reduzir um pouco se, depois dos buffs, ela ainda for mais que 2x a segunda arma no sim.
  - Geada e Nevasca seguem as melhores na prática (194 e 314): manter; se sobrar, L7 damage 7 e Nevasca 8.
- Aceite: no lab, nenhuma arma base abaixo de metade da mediana de DPS em multidão no nível máximo.

**E-04 · Adagas miram no inimigo mais próximo** · impl · P · ✅ feito
- Por quê: decisão do Daniel. Hoje são lançadas para onde Andilla anda, o que pune a heroína de fuga. O Martelo
  mantém a direção do movimento (é a arma de "mirar andando").
- O quê: nova opção por arma `thrown` (`aim: 'nearest' | 'facing'`, no `ThrownLevel` ou na entrada da arma) em
  `data/weapons.ts` e `core/weapons.ts`; Adagas e Leque usam `nearest`, Martelo e Fúria da Forja `facing`.
- Aceite: teste: com o herói andando para a direita e um inimigo à esquerda, a adaga vai para a esquerda.

**E-05 · Lyra: primeiro raio no mais próximo, vida -10** · impl + bal · P · ✅ feito
- Por quê: decisão do Daniel. balance-tester: Raio solo cresce só 2.5x de L1 a Lmax e Lyra é a mais lenta contra o
  chefe; ele propunha L7 damage 38 para 50.
- O quê: no fogo `strike`, o primeiro raio de cada disparo vai no inimigo visível mais próximo, os demais ao acaso.
  `characters.ts` lyra `maxHp: -10`. Só aplicar o L7 50 se o sim ainda mostrar Lyra atrás.
- Aceite: teste do primeiro alvo; no sim, tempo de Lyra contra o chefe dentro de 25% dos outros heróis.

**E-06 · Chefes muito acima das elites** · impl + bal · P · ✅ feito
- Por quê: balance-tester: o Golem às 9:30 tem 4050 HP (900 x hpMult), mais que o chefe (3500 a 4000).
- O quê: decisão do Daniel: chefes com 12 a 15 mil HP, ajustado pelo sim (ponto de partida: blackKnight 14000,
  bellRinger 13000, oldWolf 12000). Golem hp 900 para 650 (também ajuda E-08).
- Aceite: no sim, luta de chefe entre 45 e 90 s para builds que chegam às 10:00.

**E-07 · Uma mecânica telegrafada por chefe** · impl + visual + bal · G · ✅ feito
- Por quê: plano do Daniel: hoje os chefes são só perseguidores grandes. Cada um ganha um padrão simples,
  legível no celular, em `src/core` com teste. Nomes vêm das habilidades do jogo original (`src/data.js`).
- O quê:
  - Cavaleiro Negro: **Corte Brutal**, área em arco à frente, marcada no chão por ~0.8 s antes do golpe.
  - O Sineiro: **badalada** que chama escolta (um anel de Ossadas surge à volta), com o sino balançando antes.
  - Lobo Velho: **Mordida Funda**, investida em linha reta, com a linha marcada no chão antes.
  - Telegrafar com aviso visual no chão (arte do visual-director, estilo fofo), sem alocação por frame.
- Aceite: testes em `tests/core/` para tempo de aviso e dano; no sim, a mecânica causa dano mas não mata sozinha
  um herói com vida cheia.

**E-08 · Elos mais cedo** · impl + bal · P · ✅ feito
- Por quê: balance-tester: 0.1 a 0.8 Elos por corrida, chegando aos 8 a 9 min; só 0.8 a 2.4 baús das 6 elites.
- O quê: `config.xp.step` 9 para 7; golem 650 (E-06); Elos pouco acima da base: fury damage 60, vigil damage 28.
  Elites da Cripta: hoje só Golem; ver pergunta 1 ao Daniel.
- Aceite: no sim, média de pelo menos 1 Elo por corrida que passa dos 6 min, o primeiro antes das 7:00.

**E-09 · Armadura não pode zerar o dano** · impl + bal · P · ✅ feito
- Por quê: balance-tester: armadura 5 corta 68% do dano e todo inimigo comum passa a dar 1.
- O quê: passiva `armor` maxLevel 5 para 3 (`data/upgrades.ts`), ou `config.player.minDamage` 2. Escolher pelo sim
  (sugestão: maxLevel 3, mais simples de entender no card).
- Aceite: no sim, build com armadura máxima ainda recebe dano relevante dos comuns depois das 6:00.

**E-10 · Renda de ouro cerca de 2.5x** · impl + bal · P · ✅ feito
- Por quê: balance-tester: 9.6 de ouro por minuto; Loja completa (21.650) mais heróis (1.100) pede 115 a 360
  corridas.
- O quê (`data/config.ts`, `gold`): dropChance 0.05, coin 5, chest 50.
- Aceite: no sim, 25 a 40 de ouro por minuto; a Loja completa em torno de 40 a 80 corridas.

## Etapa 3: Legibilidade e arte (dono principal: visual-director)

**A-01 · Tokens de cor únicos** · visual + impl · P · ✅ feito
- Por quê: visual-director: `#ffd870` e `#ff8090` repetidos em ~12 lugares, `UI.accent` é outro dourado, o HUD
  inventa cores (XP ciano, dois vermelhos).
- O quê: `UI.gold`, `UI.danger` (e o que faltar) em `render/ui.ts`, trocando todos os hexadecimais soltos.
- Aceite: `grep` não encontra cor hexadecimal de UI fora dos tokens nas cenas.

**A-02 · Herói sempre visível (e Lyra na Cripta)** · visual · M · ✅ feito
- Por quê: plano do Daniel (o herói some na multidão do chefe) e visual-director (Lyra some na Cripta: roxo igual a
  morcegos e aranhas; chão da cripta com contraste alto, `tiles.ts`).
- O quê: contorno claro permanente e anel mais forte sob o herói. O roxo da Lyra é canônico no original
  (`#d070e0`), então quem muda é o elenco: morcegos e aranhas puxam para cinza azulado ou marrom; baixar o contraste
  do chão da cripta.
- Aceite: captura com 500 inimigos e chefe em 390x844: o herói é achado em menos de 1 s, nas três fases, com os
  quatro heróis.

**A-03 · HUD legível no celular** · visual + impl · P · ✅ feito
- Por quê: plano do Daniel (barrinha de vida abaixo do herói) e visual-director (HP sem número, textos sem
  contorno, nome do chefe colado à barra, sem safe-area para notch).
- O quê: barrinha de vida sob o herói; número de HP na barra do HUD; contorno nos textos; respiro no nome do chefe;
  margens com `env(safe-area-inset-*)`.
- Aceite: em 390x844 e em paisagem, nenhum texto do HUD cortado pelo notch; vida legível sem olhar para o canto.

**A-04 · Números de dano que não poluem** · impl + visual · M · ✅ feito
- Por quê: plano do Daniel e visual-director: sans-serif, todos brancos e iguais, empilham sobre a multidão.
- O quê: menores, somados por inimigo num intervalo curto (~0.25 s), cor própria para golpe forte, ocultos para
  aura e órbita. Opção na Pausa para desligar (localStorage com try/catch). Sem alocação: pool atual de números.
- Aceite: com 500 inimigos, no máximo `maxDamageNumbers` na tela e nenhum bloco ilegível; a opção sobrevive ao
  recarregar a página.

**A-05 · Gemas que contrastam com os três chãos** · visual · P · ✅ feito
- Por quê: plano do Daniel; visual-director: gemas dominam a tela no limite de 250.
- O quê: cor única (verde ou dourado com brilho) que contraste com neve, pedra azul e estrada; três tamanhos claros;
  avaliar `gems.maxActive` 250 para 150 com o sim (a fusão já existe).
- Aceite: captura nas três fases: gemas visíveis e sem cobrir inimigos.

**A-06 · Golpes e zonas com acabamento** · visual · M · ✅ feito
- Por quê: plano do Daniel; visual-director: slash é uma fatia branca, raio é uma linha de 4 px, sem contorno.
- O quê: arco da Lâmina com rastro e gradiente; Geada com borda e cristais; raio com contorno e brilho.
- Aceite: revisão do visual-director aprova as capturas; FPS no stress test (F4) igual ao anterior.

**A-07 · Elos com visual próprio** · visual · M · ✅ feito
- Por quê: visual-director: Vigília, Dobre Fúnebre e Nevasca quase iguais à base. O Elo é a recompensa máxima da
  partida e precisa parecer um.
- O quê: cada Elo com cor, tamanho ou forma que o diferencie da base (10 entradas em `render/assets.ts`).
- Aceite: num teste cego de capturas, dá para dizer base ou Elo em todos os 10 pares.

**A-08 · Arte dos chefes** · visual · M · ✅ feito
- Por quê: visual-director: Cavaleiro Negro sem luz de baixo, some no chão; Lobo Velho é recolor 2x do Lobo da Geada
  com contorno de 4 px.
- O quê: luz de recorte no Cavaleiro (contraste, não tom sombrio); Lobo Velho com desenho próprio (pelagem velha,
  cicatriz), contorno no padrão. Junto com os avisos de E-07.
- Aceite: os três chefes se destacam do chão e da escolta em 390x844.

**A-09 · Itens do chão distintos** · visual · P · ✅ feito
- Por quê: visual-director: a Badalada (bomba) é um sino igual aos Sinos de Bronze, o ímã parece bomba, o freeze
  está sem `ink()`.
- O quê: silhuetas diferentes para Badalada, Pedra-Ímã e Sopro de Geada; todas com tinta.
- Aceite: os seis itens do chão são distintos em miniatura (32 px).

**A-10 · Chãos com decalques** · visual · M · ✅ feito
- Por quê: plano do Daniel: repetição visível do tile.
- O quê: decalques determinísticos por posição: Valmor com lápides fofas, montinhos de neve, galhos, flores de gelo;
  Cripta e Estrada com elementos próprios. Sem custo por frame (desenhados por tile).
- Aceite: nenhuma repetição óbvia numa tela; FPS inalterado no stress test.

**A-11 · Subida de nível com ícone e receita de Elo** · visual + impl · M · ✅ feito
- Por quê: plano do Daniel; visual-director: cards de 84 px meio vazios, sem ícone, e a tela cobre as barras do HUD.
- O quê: ícone da arma ou passiva em cada carta; dica curta de receita ("Forma Elo com Força"), reaproveitando
  `t.levelUp.evolvesWith`; layout que não cobre HP e XP.
- Aceite: em 390x844, as três cartas com ícone e a barra de HP visível durante a escolha.

**A-12 · Preparação com herói em destaque** · visual + impl · M · ✅ feito
- Por quê: plano do Daniel; visual-director: faixa vazia de ~150 px, heróis pequenos, fases sem arte nem cadeado.
- O quê: metade inferior mostra o herói selecionado grande, atributos e o ícone da arma própria; fases com
  miniatura do chão e cadeado quando trancadas.
- Aceite: nada sobreposto em desktop e 390x844; dá para ver qual fase está trancada sem ler.

**A-13 · Menu com ilustração intencional** · visual · P · ✅ feito
- Por quê: plano do Daniel (o Cavaleiro semitransparente parece erro) e visual-director (marca d'água atrapalha o
  título; sempre o chão de Valmor).
- O quê: tirar a marca d'água; ilustração do grupo dos quatro heróis no espaço vazio.
- Aceite: título limpo; revisão do visual-director aprova em desktop e celular.

**A-14 · Juice de combate e transições** · impl + visual · M · ✅ feito
- Por quê: visual-director: morte de inimigo sem efeito, coleta sem retorno, level-up sem animação, cortes secos
  entre cenas.
- O quê: puff de morte em `Pool` (sem alocar), brilho curto na coleta de gema e item, pulso no level-up, fade de
  ~150 ms entre cenas. Opção na Pausa para reduzir tremor e flash (acessibilidade), junto da opção de A-04.
- Aceite: stress test com 700 inimigos mantém 60 FPS no celular do Daniel; com a opção ligada, sem tremor de tela.

## Etapa 4: Som

**SND-01 · Módulo de som com mapa único** · impl · M · ✅ feito
- Por quê: plano do Daniel; visual-director: zero áudio.
- O quê: módulo em `src/render` que reage a `world.events`; efeitos curtos e fofos gerados por Web Audio; um mapa
  único de sons (como `assets.ts`) para trocar por arquivos depois: golpe, acerto, gema, subir de nível, baú,
  elite, chefe, vitória, derrota. Limite de sons simultâneos (e de acertos por frame).
- Aceite: cada evento da lista toca; com 500 inimigos não há estalo nem queda de FPS; o primeiro toque destrava o
  áudio no celular.

**SND-02 · Mudo salvo** · impl · P · ✅ feito
- Por quê: plano do Daniel.
- O quê: botão de mudo no menu e na pausa, salvo no localStorage com try/catch; textos em `pt-BR.ts`.
- Aceite: o mudo sobrevive ao recarregar e a uma localStorage bloqueada (aba anônima) sem erro.

## Etapa 5: Profundidade e retenção (fora do plano atual, propor depois da Etapa 4)

**D-01 · Limite de passivas por partida** · impl + bal · P · ✅ feito
- Por quê: hoje as armas têm limite (6) mas as passivas não; no fim da partida o jogador pega todas e a escolha
  perde peso (pilar 2).
- O quê: `config.weapons.maxPassives` 6 em `core/upgrades.ts` `candidates()`.
- Aceite: teste de candidatos; no sim, builds diferentes por semente (passivas finais variam).

**D-02 · Tela final com "só mais uma"** · impl · P · ✅ feito
- Por quê: pilar 4: a derrota precisa mostrar o que avançou.
- O quê: no EndScene, ouro ganho contra o próximo item da Loja ao alcance e Elos descobertos nesta partida.
- Aceite: toda tela de fim mostra pelo menos uma meta próxima.

**D-03 · Livro de Elos** · impl + visual · M · ✅ feito
- Por quê: descobrir Elos é o objetivo de longo prazo do gênero; o jogo original já tem a ideia de Elos conhecidos
  com dica (`src/elos.js`).
- O quê: tela que lista os 10 Elos, com receita revelada após a primeira descoberta (salvo em `core/meta.ts`).
- Aceite: descobrir um Elo o marca no livro e o save antigo continua válido (`sanitizeSave`).

**D-04 · Um inimigo com comportamento novo por fase** · impl + bal · G · ✅ feito
- Por quê: todos os inimigos só perseguem; falta variedade que peça movimento (pilar 2).
- O quê: um comportamento simples, data-driven: Encapuzado que investe em linha; Espectro que atravessa e some.
  Na Cripta, considerar o Rato Gigante (do elenco original da cripta, hoje sem uso).
- Aceite: teste do comportamento; FPS no stress test inalterado.

**D-05 · Mais armas no grupo compartilhado** · impl + bal · M · ✅ feito
- Por quê: são só 6 armas compartilhadas; poucas builds por herói (pilar 3).
- O quê: 2 a 3 armas novas de `kind` existentes e seus Elos, com nomes do original (pedir ao game-director uma
  proposta com dados prontos).
- Aceite: no sim, nenhuma arma nova com pick rate acima de 40%.

**D-06 · Heróis voltam a ser comprados** · impl · P · ✅ feito
- Por quê: com a renda de E-10, comprar heróis vira uma meta curta e boa.
- O quê: `config.unlockAllHeroes` false quando o Daniel encerrar os testes; revisar custos (300, 300, 500).
- Aceite: um jogador novo libera o segundo herói em 3 a 5 corridas no sim.

## Etapa 6: Lançamento

**L-01 · Medição em celular real** · bal + impl · P
- Por quê: tudo das Etapas 3 e 4 custa render; a meta é 500+ inimigos a 60 FPS no celular.
- O quê: rodar F4 no celular do Daniel e no Chrome com CPU 4x; registrar no `docs/balance-baseline.md`.
- Aceite: 60 FPS com 500 inimigos depois do juice e do som.

**L-02 · Versão do save** · impl · P · ✅ feito
- Por quê: Livro de Elos e novas metas mudam o save; o jogador não pode perder ouro.
- O quê: campo `version` no `MetaSave` com migração em `sanitizeSave`.
- Aceite: teste carrega um save atual e um sem versão sem perder nada.

**L-03 · Tela de opções mínima** · impl + visual · P · ✅ feito
- Por quê: as opções de A-04, A-14 e SND-02 ficam espalhadas pela Pausa.
- O quê: um painel de opções (menu e pausa) com números de dano, tremor e flash, som.
- Aceite: todas as opções num lugar só, salvas.

---

## Decisões já tomadas pelo plano do Daniel

| Tema | Relatório propôs | Plano do Daniel decide |
| --- | --- | --- |
| Leque de Facas | count 11, spread TAU/11 | rotacionar meio passo quando cobre o círculo (B-01) |
| Adagas | só pierce, damage e count | mirar no inimigo mais próximo; Martelo segue o movimento (E-04); buffs numéricos depois, pelo sim |
| Lyra | Raio L7 damage 38 para 50 | primeiro raio no mais próximo e vida -20 para -10 (E-05); L7 50 só se o sim pedir |
| Chefes | golem 650 para não passar do chefe | chefes com 12 a 15 mil HP e uma mecânica telegrafada cada (E-06, E-07); golem 650 mantido pelos Elos |
| Lâmina | não citada | pode ser reduzida um pouco se seguir dominante (E-03) |
| Estilo | "Cavaleiro sem luz de baixo, se mistura" | resolver com contraste e luz, nunca tornando o jogo sombrio |
| Meta de balanceamento | 2/96 chegam às 10:00 | média de 6 min ou mais em Valmor por herói, sem herói muito acima |

## Perguntas para o Daniel (respondidas em 2026-11-08: "tudo bem para tudo")

Aplicado: Cripta alterna Golem e Goblin; mecânicas dos chefes com os nomes do original; morcegos e aranhas mudam de
cor (A-02); Rato Gigante pode entrar na Cripta (D-04). Pedido extra: Andilla mais forte no começo (feito em E-03).

1. **Golem na Cripta**: no original o Golem de Pedra existe no elenco, mas a Cripta da Igreja Velha usa Rato
   Gigante, Morcego Vampiro e Gosma Verde. Hoje a Cripta tem só o Golem como elite. Ele pertence à cripta? Se não,
   qual elite cabe lá (o balance-tester sugeriu alternar Golem e Goblin Lanceiro)?
2. **Mecânicas dos chefes (E-07)**: Corte Brutal (Cavaleiro), badalada que chama Ossadas (Sineiro) e Mordida Funda em
   investida (Lobo Velho) usam os nomes de habilidades do original. Combinam com o que você imagina para eles?
3. **Cor dos inimigos da Cripta (A-02)**: o roxo da Lyra é canônico (`#d070e0`), então a proposta é mudar morcegos e
   aranhas. Tudo bem?
4. **Rato Gigante (D-04)**: pode entrar no Eterra Survivors como inimigo comum da Cripta?

## Fora de escopo / ideias para depois

- Música por fase (o plano pede só efeitos agora).
- Modo infinito depois do chefe, ou dificuldade extra por fase vencida.
- Itens equipáveis guardados entre partidas, ou uma loja dentro da partida.
- Habilidade ativa por herói (um botão), pensando no controle de um polegar.
- Objetivos na fase (proteger a fonte da cripta, escoltar algo na Estrada), quebrando o loop de 10 minutos.
- Desafios e conquistas que liberam armas novas.
- Novas fases do Capítulo 1 do original (Pasto do Vau, Vau do Corvo, caminho para Erukh), com lore do Daniel.
- Tabela de recordes local por herói e fase.
