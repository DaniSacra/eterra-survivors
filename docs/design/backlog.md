# Backlog do Eterra Survivors

Visão: uma partida rápida, mil jeitos de montar. Dez minutos no celular ou no navegador, com uma build que tem
profundidade de verdade e um motivo para jogar só mais uma.

Este backlog segue o plano do Daniel (Etapas 0 a 4) e encaixa nele as auditorias do balance-tester e do
visual-director de 2026-11-08, sem duplicar itens. O que o plano não cobre fica na Etapa 5 (profundidade e retenção),
na Etapa 6 (lançamento) ou em "Ideias para depois". Quando o plano do Daniel e um relatório divergem, vale o plano
(ver "Decisões já tomadas pelo plano").

Como ler: cada item tem ID, por quê (com a evidência), o quê mudar, dono, tamanho (P = horas, M = um dia,
G = vários dias) e critério de aceite. Dentro de cada etapa, a ordem é impacto sobre esforço.
Donos: **impl** (implementador), **visual** (visual-director), **bal** (balance-tester, verifica com sim e lab),
**vfx** (vfx-director), **ui** (ui-designer).

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

Plano da noite de 2026-11-08 (aprovado): ver a seção "Revisão 2026-11-08" no fim das etapas.

1. **RB-01** Vitória e derrota no mesmo passo (a fase não é liberada)
2. **RB-02** Fantasma esmaecido come projéteis e atrai a mira
3. **RU-02** Faixa da build no HUD
4. **RF-02** Acerto em flash branco; herói ferido com rosto visível
5. **RE-01** Aldo em Valmor, a primeira partida, justa

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

**B-06 · Dica "F3 depuração" aparece em produção** · impl · P · ✅ feito (reaberto e fechado na Revisão 2026-11-08)

- Por quê: visual-director: o menu mostra a dica de depuração para jogadores. Revisão 2026-11-08 (02-code #6, 03-qa
  #8): só a dica saiu; o atalho F4 continua ativo no GitHub Pages e gera 100 inimigos por toque (`HudScene.ts:75-76`),
  dá para farmar XP.
- O quê: `t.menu.controlsDesktop` sem o F3 (feito). Novo: registrar o F4 só com `import.meta.env.DEV`; o F3 (painel
  de FPS) fica em produção para a medição do L-01.
- Aceite: no GitHub Pages a dica não cita F3 e o F4 não faz nada; no `npm run dev` o F4 segue gerando inimigos.

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

**E-08 · Elos mais cedo** · impl + bal · P · ↩ reaberto na Revisão 2026-11-08 (aceite não cumprido) · ✅ feito

- Por quê: balance-tester: 0.1 a 0.8 Elos por corrida, chegando aos 8 a 9 min; só 0.8 a 2.4 baús das 6 elites.
- O quê: `config.xp.step` 9 para 7; golem 650 (E-06); Elos pouco acima da base: fury damage 60, vigil damage 28.
  Elites da Cripta: hoje só Golem; ver pergunta 1 ao Daniel.
- Aceite: no sim, média de pelo menos 1 Elo por corrida que passa dos 6 min, o primeiro antes das 7:00.
- Revisão 2026-11-08 (01-balance D9): sim de 12 sementes, 1º Elo em média entre **7:33 e 8:19** e só 29 de 144
  corridas formam um Elo antes das 7:00. Aceite não cumprido. Novo O quê: `ELITE_TIMES` (`data/stages.ts:15`) de
  `[100, 220, 330, 420, 500, 570]` para `[90, 200, 300, 390, 480, 560]`. Reserva, só se o aceite ainda falhar:
  `config.xp.step` 7 para 6.5. Medir com `SIM_SEEDS=12`.
- Feito na R2 (lote 3, com a reserva): `ELITE_TIMES` novo **e** `config.xp.step` 7 para **6.5**. Só os horários novos
  pioraram (1,76 Elo por corrida contra 1,94: o baú chega antes de a arma estar no máximo e vira um nível qualquer);
  com a reserva, 1º Elo médio 8:08 para **7:40**, corridas com Elo antes das 7:00 24 para **44** de 144, Elos por
  corrida que passa dos 6 min 2,00 para **2,06**. Aceite (média antes das 7:00) **ainda não cumprido**: medido com um
  robô que anota quando a receita fica pronta, ela fica pronta em média aos 6:50 e o baú vem 51 s depois. O robô sobe
  as 4 armas por igual, então a primeira só chega ao máximo perto dos 7 min; um jogador que foca uma arma chega bem
  antes. Próximo passo, se o Daniel quiser: a próxima elite depois da receita pronta solta o baú mais cedo, ou uma
  elite extra aos 6:00.

**E-09 · Armadura não pode zerar o dano** · impl + bal · P · ↩ reaberto na Revisão 2026-11-08 · ✅ feito

- Por quê: balance-tester: armadura 5 corta 68% do dano e todo inimigo comum passa a dar 1.
- O quê: passiva `armor` maxLevel 5 para 3 (`data/upgrades.ts`), ou `config.player.minDamage` 2. Escolher pelo sim
  (sugestão: maxLevel 3, mais simples de entender no card).
- Aceite: no sim, build com armadura máxima ainda recebe dano relevante dos comuns depois das 6:00.
- Revisão 2026-11-08 (01-balance D8): com a Loja inteira, Aldo chega a armadura 7 (herói 1 + passiva 3 + Loja 3),
  todo comum dá 1 de dano e a regeneração empata: o veterano vence 47 de 48 levando 0 a 5,6 de dano por minuto. Novo
  O quê: `config.player.minDamage` 1 para **2** (regra única para herói, passiva e Loja; `SHOP.armor` fica como está).
  Aceite novo: no sim veterano (`bal/veteran.test.ts` do balance-tester), dano recebido por minuto acima de 10 em
  pelo menos metade das corridas, e o sim normal sem queda de mais de 2 vitórias em 48.
- Feito na R2 (lote 4): `config.player.minDamage` 1 para **2**, teste em `pickups.test.ts` (armadura 7 leva 2 de um
  golpe comum). Sim normal: 122/144 antes e depois (nenhuma queda). Sim veterano (Loja inteira, 48 corridas): **4 de
  48** com mais de 10 de dano por minuto, igual com `minDamage` 1; vitórias 45/48. Aceite novo **não cumprido**, e não
  por causa da armadura: só o Aldo apanha (12 a 13 por minuto em Valmor e na Cripta, 3 na Estrada); Lyra, Teo e
  Andilla com a Loja inteira matam tudo antes de encostar (0 a 0,8 por minuto). O veterano fácil é poder total, não
  armadura: pede a dificuldade extra por fase vencida ("Ideias para depois"). A regra de 2 fica porque é o piso certo
  quando o Aldo empilha armadura.

**E-10 · Renda de ouro cerca de 2.5x** · impl + bal · P · ✅ feito (valores corrigidos no texto em 2026-11-08)

- Por quê: balance-tester: 9.6 de ouro por minuto; Loja completa (21.650) mais heróis (1.100) pede 115 a 360
  corridas.
- O quê (`data/config.ts`, `gold`): proposto dropChance 0.05, coin 5, chest 50. **Aplicado na Etapa 2:
  dropChance 0.03, coin 3, chest 25** (decisão registrada em `docs/balance-baseline.md`, junto com a curva mais dura e
  os preços novos dos heróis). Revisão 2026-11-08 (05-ui, achado lateral) apontou a diferença; o balance-tester
  (01-balance, "Economia") confirmou que os valores aplicados cumprem o aceite: 461 de ouro por corrida, Loja e
  heróis (24.450) em ~53 corridas. Nenhuma mudança de dados.
- Aceite: no sim, 25 a 40 de ouro por minuto; a Loja completa em torno de 40 a 80 corridas. Cumprido.

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

**A-04 · Números de dano que não poluem** · impl + visual · M · ↩ reaberto na Revisão 2026-11-08 · ✅ feito

- Por quê: plano do Daniel e visual-director: sans-serif, todos brancos e iguais, empilham sobre a multidão.
- O quê: menores, somados por inimigo num intervalo curto (~0.25 s), cor própria para golpe forte, ocultos para
  aura e órbita. Opção na Pausa para desligar (localStorage com try/catch). Sem alocação: pool atual de números.
- Aceite: com 500 inimigos, no máximo `maxDamageNumbers` na tela e nenhum bloco ilegível; a opção sobrevive ao
  recarregar a página.
- Revisão 2026-11-08 (04-visual #3): caso não coberto: golpes de área (Quebra-Junta, Maça, Fogo) empilham "124 166"
  em ~15 camadas sobre o herói, e a fonte de 13 px no mundo vira 11,4 px no celular (zoom 0.875). Novo O quê: para
  `arc` e `strike` (e o golpe do chefe), só os 4 maiores números de cada disparo; desvio determinístico por `uid`
  (vem de RT-01); fonte `Math.ceil(14 / zoom)` ou `setScale(1 / zoom)` na criação, sem alocar por quadro. Aceite
  novo: captura de Quebra-Junta e Espada de Fogo em 420x820 sem pilha de números sobre o herói; nenhum número abaixo
  de 12 px de tela.
- Feito na R5: `world.numberBudget` (core, testado): um golpe `arc` mostra no máximo `config.effects.arcNumbers` (4)
  números novos e cada raio de `strike` no máximo `strikeNumbers` (2); acertos num inimigo que já mostra número
  continuam somando nele. Como o dano de um disparo é igual para todos, "os 4 maiores" vira "os 4 primeiros". Desvio
  por `uid` nos dois eixos (±8 x ±6). Fonte de 16 px com escala `max(13, 14 / zoom) / 16`: nunca abaixo de 14 px de
  tela. O golpe do chefe acerta o herói, que não mostra número, então não precisou de regra.

**A-05 · Gemas que contrastam com os três chãos** · visual · P · ↩ reaberto na Revisão 2026-11-08 · ✅ feito

- Por quê: plano do Daniel; visual-director: gemas dominam a tela no limite de 250.
- O quê: cor única (verde ou dourado com brilho) que contraste com neve, pedra azul e estrada; três tamanhos claros;
  avaliar `gems.maxActive` 250 para 150 com o sim (a fusão já existe).
- Aceite: captura nas três fases: gemas visíveis e sem cobrir inimigos.
- Revisão 2026-11-08 (04-visual #1 e #15): as gemas azul-claras (escolha explícita do Daniel em a957868) leem bem no
  chão vazio, mas dividem a família de cor com o gelo: flor de gelo do tamanho de uma gema, poça da Estrada, tinta de
  lento e congelado, Geada, olho ciano do fantasma, ossadas da Cripta. A gema grande (`gem(1.9)`) é maior que um
  morcego. **Regra: a gema continua azul-clara, nunca volta a verde; quem muda é o gelo.** Novo O quê:
  1. A gema vira a única coisa ciano saturada e cintilante da tela: tom puxado levemente para ciano (o visual-director
     escolhe o hex, partindo de `0x5ccbff`), cintilar de alfa ou escala por `sin(world.time * 6 + g.x)` no
     `gemMirror` (sem alocação), tamanhos `gem(1.25)` e `gem(1.6)`.
  2. Família do gelo em branco, branco-lilás e cinza-azulado dessaturado: flor de gelo `~0xe8e2f4` a 0.35, poça
     `~0x4a5470`, tinta `slowed ~0xd8e4f0` e `frozen ~0xc8d8f0`, olho do fantasma sem ciano (branco ou dourado
     pálido).
- Aceite novo: captura de Valmor com Geada e da Cripta com 400 inimigos em 420x820: dá para apontar todas as gemas em
  menos de 2 s e nenhuma flor de gelo é confundida com gema; nenhum verde nas gemas.
- Feito na R5: gema `0x3ed4ff` (corpo) e `0xd4f8ff` (luz), XP do HUD, brilho de coleta e favicon em `0x7ae6ff`/
  `0x3ed4ff`; tamanhos `gem(1.25)` e `gem(1.6)`; cintilar de escala e alfa no `gemMirror` (mais forte na gema grande).
  Gelo: tinta `slowed 0xe2def2`, `frozen 0xd0cae8`, flor de gelo `0xe8e2f4` a 0.35, poça `0x4a5470`, halo do Sopro
  de Geada branco-lilás, fantasma branco-lilás com olho dourado pálido, Ossadas em cinza-lilás `0xb8b4cc`, pontas do
  ímã brancas. F4: Lâmina ~58, 6 Elos ~49 (igual à R4).

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

**A-10 · Chãos com decalques** · visual · M · ↩ reaberto na Revisão 2026-11-08 · ✅ feito

- Por quê: plano do Daniel: repetição visível do tile.
- O quê: decalques determinísticos por posição: Valmor com lápides fofas, montinhos de neve, galhos, flores de gelo;
  Cripta e Estrada com elementos próprios. Sem custo por frame (desenhados por tile).
- Aceite: nenhuma repetição óbvia numa tela; FPS inalterado no stress test.
- Revisão 2026-11-08 (04-visual #7): caso não coberto: o tile da Estrada tem sulcos de largura total (listras a cada
  46/82 px, `tiles.ts:68`) e pedras claras repetidas em grade que competem com gemas e Encapuzados; o musgo da Cripta
  repete a cada 128 px. Novo O quê: sulcos fora do tile (ou decal curto e curvo); pedras do tile sem brilho, em tom
  próximo do chão (`~0x4e566e`), volume só no `decal.stones`; musgo da Cripta com metade dos pontos e alfa 0.15.
  Aceite novo: captura da luta do Lobo Velho em 420x820 e 1000x680 sem listras nem grade de pedras visíveis.
- Feito na R5: tile da Estrada sem sulcos, pedras chatas em `0x4e566e` sem brilho, montes de neve a 0.45; sulcos
  viraram o decal curto e curvo `decal.ruts`; musgo da Cripta com 3 pontos a 0.15. Custo por quadro zero (textura).

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

**D-05 · Mais armas no grupo compartilhado** · impl + bal · M · ✅ feito (aceite revisto em 2026-11-08)

- Por quê: são só 6 armas compartilhadas; poucas builds por herói (pilar 3).
- O quê: 2 a 3 armas novas de `kind` existentes e seus Elos, com nomes do original (pedir ao game-director uma
  proposta com dados prontos).
- Aceite: no sim, nenhuma arma nova com pick rate acima de 40%. Revisão 2026-11-08 (01-balance): com 8 armas
  compartilhadas e o bot pegando 4, a média esperada é ~50%; aceite trocado por "nenhuma arma compartilhada 15
  pontos acima ou abaixo da média do PICKS". Maça 49% e Fogo 48%: cumprido.

**D-06 · Heróis voltam a ser comprados** · impl · P · ✅ feito

- Por quê: com a renda de E-10, comprar heróis vira uma meta curta e boa.
- O quê: `config.unlockAllHeroes` e `config.unlockAllStages` false quando o Daniel encerrar os testes; revisar custos (300, 300, 500).
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

## Revisão 2026-11-08

Origem: revisão completa de `16d126a` (`docs/reviews/2026-11-08/00` a `07`). Triagem, conflitos e leitura de design
em `docs/reviews/2026-11-08/07-direcao.md`. **Aprovado pelo Daniel para implementar esta noite, de forma autônoma**:
ele testa tudo junto de manhã e diz o que não gostou. Por isso, exceção à "Forma de trabalho" item 1: não parar entre
fases para pedir aprovação; commit e push ao fim de cada passo.

Prefixos novos: **RB** bug, **RT** técnico (código, sem efeito de jogo), **RE** equilíbrio, **RF** efeitos visuais,
**RU** interface, **RA** arte e polimento. Itens antigos reabertos mantêm o ID (B-06, E-08, E-09, A-04, A-05, A-10):
o escopo novo está no próprio item, mais acima.

Regras da noite:

- Cada passo: `npm test`, `npm run lint`, `npm run build` verdes, jogo rodando, um commit (Conventional Commits, em
  inglês) e push. Lógica nova no core com teste em `tests/core/`.
- Sim com 12 sementes (`SIM_SEEDS=12 npm run sim`) no fim da R1 (nova linha de base) e depois de cada lote da R2;
  tabelas antes e depois em `docs/balance-baseline.md`.
- R3, R4 e R5 mexem em render: medir F4 (420x820, CPU 4x) antes da R3 e no fim de cada fase; nenhuma alocação por
  quadro; efeitos trocam desenho em vez de somar sempre que possível; modo calmo respeitado.
- Ao terminar um item, marcar `✅ feito` aqui. Se um item travar (mais de ~45 min sem saída), anotar o motivo no
  item, deixar `⏸ adiado` e seguir para o próximo.

### Plano da noite

| Fase                      | Passos (um commit cada, nesta ordem)                                                                                                             | Donos                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| **R1 Bugs e integridade** | RB-01 · RB-02 + RB-03 · B-06 · RB-04 · RB-08 · RB-06 + RB-07 · RB-05 · RT-01 · RT-02 · RT-03 · RT-04 · RT-05 + RT-06 · nova linha de base do sim | impl (ui confere RB-05) |
| **R2 Balanceamento**      | lote 1: RE-01 + RE-02 + RE-05 · lote 2: RE-03 + RE-04 + RE-07 · lote 3: E-08 + RE-06 · lote 4: E-09 · RE-08 (só se o sim pedir) · tabela final   | impl + bal              |
| **R3 Efeitos (VFX)**      | RF-01 · RF-02 · RF-03 · RF-04 · RF-05 · RF-06 · RF-07 · RF-08 · RF-09 · RF-10 · RF-11 · medição F4                                               | vfx + impl              |
| **R4 Interface**          | RU-01 · RU-02 · RU-03 · RU-04 · RU-05 · RU-06 · RU-07 · RU-08                                                                                    | ui + impl               |
| **R5 Arte e polimento**   | A-05 · A-04 · A-10 · RA-01 · RA-02 + RA-03 · RA-04 · RA-05 · RA-06 · capturas finais                                                             | visual + impl           |

Meta da R2 (sim de 12 sementes, 4 heróis x 3 fases): todo herói entre 55% e 85% de vitórias; Aldo em Valmor pelo
menos 7 de 12; vitórias Valmor ≥ Cripta ≥ Estrada (folga de 3); 1º Elo em média antes das 7:00; luta de chefe com
mediana de 45 a 90 s e no máximo 3 mortes por tempo esgotado na Estrada.

### R1 · Bugs e integridade

**RB-01 · Vitória e derrota no mesmo passo viram derrota** · impl · P · ✅ feito

- Por quê: 02-code #2 (reproduzido): herói com 1 de HP mordido no mesmo passo em que a Aura mata o chefe termina com
  `state = 'lost'` e eventos `['playerHit', 'won', 'lost']`; o `bank()` lê `lost`, a fase **não** é liberada, a tela de
  fim abre duas vezes e tocam os dois sons. Acontece justamente na luta do chefe.
- O quê: `end()` sai cedo se o estado já for `won` ou `lost`; a checagem de morte no fim do `step` só roda com
  `state === 'playing'`. A vitória tem prioridade (o chefe caiu). Teste em `world.test.ts` com o cenário acima.
- Aceite: teste novo verde; no cenário, `state === 'won'`, um só evento de fim, fase gravada como vencida.

**RB-02 · Fantasma esmaecido come projéteis e atrai a mira** · impl · P · ✅ feito

- Por quê: 02-code #1 e 01-balance B1 (reproduzido nos dois): com o Espectro esmaecido, `damageEnemy` ignora o golpe
  mas o projétil registra o acerto e gasta a perfuração (`projectiles.ts:121-137`); Adagas L1 contra fantasma e dois
  esqueletos perde metade do dano. `nearestEnemy` e `randomEnemyNear` escolhem fantasmas intocáveis; a órbita grava
  `orbitReady` antes do dano.
- O quê: em `updateProjectiles`, pular `isFaded(e)` como `e.dead`; excluir esmaecidos em `nearestEnemy` e
  `randomEnemyNear`; em `sweepOrbit`, checar `isFaded` antes de gravar `orbitReady`. Testes: projétil atravessa o
  fantasma esmaecido e acerta quem está atrás; mira ignora esmaecido; teste de pierce > 0 (02-code #13).
- Aceite: testes verdes; no cenário do balance-tester, o esqueleto 1 e o 2 levam dano com o fantasma esmaecido.

**RB-03 · Sopro de Geada deixa o fantasma intocável por 6 s** · impl · P · ✅ feito

- Por quê: 01-balance B2 (reproduzido): com o mundo congelado o `behaviourStep` não roda e o fantasma esmaecido fica
  imune os 6 s inteiros; o item de limpar a tela protege justamente ele.
- O quê: ao congelar (`core/pickups.ts`), todo fantasma esmaecido volta a sólido (`act = Idle`). Teste.
- Aceite: fantasma esmaecido dentro da Aura leva dano durante o congelamento.

**RB-04 · Som some no iPhone depois de trocar de app** · impl · P · ✅ feito

- Por quê: 02-code #3: `unlock` é registrado com `{ once: true }` (`render/sound.ts:112-119`); quando o iOS suspende o
  `AudioContext` (troca de app, tela bloqueada), ninguém chama `resume()` de novo e o jogo fica mudo. É o celular, o
  caso de uso principal.
- O quê: listeners sem `once` em `pointerdown`, `pointerup` e `keydown` que chamam `resume()` sempre que
  `ctx.state !== 'running'`; voltar a escutar em `visibilitychange` e no `statechange` do contexto.
- Aceite: no Chromium, `ctx.suspend()` seguido de um toque volta a tocar; Daniel confere no iPhone (trocar de app e
  voltar).

**RB-05 · Celular deitado: botões e cartas fora da tela** · impl + ui · M · ✅ feito

- Por quê: 03-qa #1, #2, #4, #5, #6 (820x420): Trocar/Pular/Banir abaixo da tela no level-up (`LevelUpScene.ts:39-40`,
  77); Loja corta Paciência e Bênção do Templo (`ShopScene.ts:38-41`); Livro de Elos esconde a última linha
  (`EloBookScene.ts:26-30`); fases com 22 px na Preparação e dica do menu fora da tela; Pausa com o cronômetro sobre o
  título e chão sem redesenhar depois de girar.
- O quê: level-up com cargas numa coluna ao lado das cartas (ou cartas sem a linha da receita) quando faltar altura;
  Loja e Livro com 3 colunas quando `width >= 780` e a lista não couber; mínimo de altura nos cards de fase e dica do
  menu reposicionada; Pausa com `top` abaixo do HUD; no resize do GameScene pausado, centralizar câmera e chão.
- Aceite: capturas em 820x420 e 640x360 de level-up, Loja, Livro, Preparação, Menu e Pausa sem nada fora da tela nem
  sobreposto; 420x820 e 1000x680 sem regressão.

**RB-06 · Toque duplo na Loja compra dois níveis** · impl · P · ✅ feito

- Por quê: 03-qa #3: dois toques rápidos em Sopa Quente compram 0 para 2 (760 para 460 de ouro); `buy()` recria a cena
  e o segundo toque cai no botão novo.
- O quê: ignorar compras por ~250 ms depois de uma compra (cards armados com `delayedCall`, como o `bindKeys`).
- Aceite: duplo toque e duplo clique compram um nível só.

**RB-07 · Teclado da Loja pula para o card errado** · impl · P · ✅ feito

- Por quê: 02-code #4: o `keyNav` recebe só os cards compráveis com `cols = 2`, então ↓ anda na diagonal.
- O quê: passar todos os cards ao `keyNav` (que já pula desabilitados) e Voltar numa linha própria.
- Aceite: com A comprável, B caro, C e D compráveis, ↓ a partir de A vai para C.

**RB-08 · Estado que vaza entre partidas e level-up lançado duas vezes** · impl · P · ✅ feito

- Por quê: 02-code #9 e #10: `controls`, `gemStreak` e `lastGem` não são zerados no `create()` do GameScene (o tom da
  gema continua subindo da partida anterior); com level-ups em fila, a LevelUpScene reinicia duas vezes.
- O quê: zerar os três no início do `create()`; lançar a LevelUp só se `!this.scene.isActive(SCENES.levelUp)`.
- Aceite: segunda partida começa com o tom de gema base; com 3 level-ups em fila, um restart por escolha.

**RT-01 · Efeitos não consomem o `Rng` da partida; semente registrada** · impl · P · ✅ feito

- Por quê: 02-code #7: `addDamageNumber` sorteia o deslocamento com `world.rng`; qualquer ajuste visual muda todas as
  sementes do sim e a linha de base deixa de ser comparável. Partidas reais não guardam a semente. 04-visual #3: os
  números empilham na mesma coluna.
- O quê: deslocamento do número determinístico pelo `uid` do inimigo (ex.: `(uid * 7919 % 11) - 5`); o GameScene gera
  a semente (`Date.now() >>> 0`), passa ao `World` e a mostra no painel F3 e no `window.game` de dev.
- Aceite: teste: mudar `maxDamageNumbers` não muda o resultado de uma corrida com a mesma semente; a semente aparece
  no F3. **Depois deste passo, rodar o sim de 12 sementes e gravar a nova linha de base** (início da R2).
- Feito: nova linha de base (12 sementes) em `docs/balance-baseline.md`, seção "Revisão 2026-11-08 · R1": 109/144
  vitórias, Valmor 31, Cripta 42, Estrada 36; 1º Elo médio 7:49.

**RT-02 · Alocação por quadro no GameScene** · impl · P · ✅ feito

- Por quê: 02-code #5: `tiers.find(...)` cria uma closure por gema por quadro (até 250) e `String(Math.round(...))`
  uma string por número por quadro; viola a regra de desempenho.
- O quê: `gemSprite(value)` de módulo com `for`; guardar o último valor arredondado por número e só converter quando
  mudar; laços `for...of` sobre pools do core (`zones.ts`, `xp.ts`, `effects.ts`, `pickups.ts`) viram `for` indexado.
- Aceite: nenhum `find`/closure/`String()` por entidade no `update` do GameScene (revisão do diff).

**RT-03 · Save aceita `Infinity` e rebaixa versão futura** · impl · P · ✅ feito

- Por quê: 02-code #8: `r.gold >= 0` aceita `Infinity` (vira `null` e 0 na leitura seguinte); um save de versão maior
  que `SAVE_VERSION` perde os campos novos ao ser regravado por um build antigo em cache.
- O quê: `Number.isFinite`; save de versão futura preserva as chaves desconhecidas ao regravar. Testes em
  `meta.test.ts` para os dois casos.
- Aceite: testes verdes; nenhum save atual perde dados (teste do L-02 continua verde).

**RT-04 · Textos fora do i18n, ícone de pausa e dica por dispositivo** · impl · P · ✅ feito

- Por quê: 02-code #11, 03-qa #7, 04-visual #19, 05-ui #3 (extra): unidades e separadores em `describe.ts`,
  `EndScene.ts`, `SelectScene.ts`; "II" como texto (`HudScene.ts:70`); a dica do level-up fala de toque no desktop e
  de teclas no celular, e o celular mostra "1." "2." "3." sem teclado.
- O quê: `t.units` e `t.sep` em `pt-BR.ts`; ícone de pausa desenhado (`icon.pause` ou duas barras em `Graphics`);
  `t.levelUp.hintTouch` ("Toque numa opção") e `hintKeys` ("Clique ou use 1, 2, 3") por `device.input.touch`, sem
  numeração no toque.
- Aceite: `grep` não acha texto de jogador fora do `pt-BR.ts` nesses arquivos; dica certa em 420x820 (toque) e
  1000x680.

**RT-05 · Código morto e duplicação** · impl · P · ✅ feito

- Por quê: 02-code #12: `normalizeInto` e `distSq` só usados em teste; `fireOrbit` é stub; `isEvolved` repete `isElo`.
- O quê: remover os dois helpers e o teste deles; tirar `orbit` do mapa `FIRE` pelo tipo; ficar só com `isElo`.
- Aceite: testes, lint e typecheck verdes.

**RT-06 · Favicon** · impl · P · ✅ feito

- Por quê: 03-qa #10: 404 de `/favicon.ico` gera 2 erros de console no Chromium com janela.
- O quê: um favicon pequeno (SVG inline no `index.html`, desenhado no estilo do jogo, sem asset externo pesado).
- Aceite: console limpo ao abrir o jogo no Chromium com janela.

### R2 · Balanceamento

Todos os números vêm do `01-balance.md` (sim de 12 sementes e variantes medidas). Aplicar por lote, rodar o sim de 12
sementes depois de cada lote e registrar.

**RE-01 · Aldo em Valmor, a primeira partida, justa** · impl + bal · P · ✅ feito

- Por quê: 01-balance D3: Aldo vence 18 de 36 (o pior); Aldo em Valmor 5 de 12, nível médio 33,5, a primeira partida
  de todo jogador novo. Na corrida a Lâmina L7 rende 67 DPS e a Fúria 59 contra 166 a 171 da Nevasca e da Luz
  Sagrada: o golpe corpo a corpo perde alcance quando o herói foge.
- O quê (`data/weapons.ts`): `blade` `range` +10 em todos os níveis (L1 95 ... L7 122); `fury` `range` 125 para 150.
  Reserva, se o lote não levar Aldo em Valmor a 7 de 12: Aldo `maxHp` +20 para +30 (`characters.ts`).
- Aceite: Aldo em Valmor pelo menos 7 de 12; Aldo entre 55% e 85% no total.
- Feito (lote 1, sim de 12 sementes): Aldo em Valmor 4 para **10/12**; Aldo 18 para **24/36** (67%). Reserva de
  `maxHp` não foi necessária. Lab: Lâmina multidão Lmax 1984 para 2349, Fúria 5115 para 7254; DPS real da Fúria no sim
  86 para 95.
- Ajuste final da R2 (depois do lote 4, com as fases mais duras): a reserva `maxHp` +20 para **+30** e armadura do
  Aldo 1 para **2**. Com 24 sementes, a armadura sozinha vale +10 vitórias em 72 para o Aldo (36 para 46). Sim final
  de 12 sementes: Aldo **22/36** (61%), Aldo em Valmor **8/12**; com 48 sementes, 95/144 (66%) e 30/48 em Valmor.

**RE-02 · Cada fase pelo menos tão difícil quanto a anterior** · impl + bal · P · ✅ feito

- Por quê: 01-balance D6: Cripta 38/48 e nível 43,6 contra Valmor 29/48 e 37,9. Em Valmor o Goblin (440 HP,
  velocidade 100) chega às 1:40 e mata builds fracas; o Rato Gigante dá 0,125 XP por HP (Ossos 0,083) e passa metade
  do tempo parado.
- O quê: Valmor `elites('golem', 'goblin')` (`data/stages.ts:25`); `rat.xp` 2 para 1 (`data/enemies.ts`). Medido
  separado: Valmor 29 para 33/48; Cripta 38 para 36/48.
- Aceite: vitórias Valmor ≥ Cripta ≥ Estrada, com folga de 3.
- Feito (lote 1, sim de 12 sementes): vitórias Valmor 31 para **38/48**, Cripta 42 para **37/48**, Estrada 36 para
  **37/48** (ordem certa, dentro da folga de 3). Lyra na Cripta caiu de 10 para 7/12.
- Ajuste final da R2: o lote 3 (Elos mais cedo, mira no chefe) deixou a Cripta fácil de novo (42 a 44 de 48). Cripta
  com mais vida: `bones` 12 para **14**, `ghost` 38 para **44**, `rat` 16 para **18**. Com 48 sementes: Valmor
  **152**, Cripta **152**, Estrada **155** de 192 (dentro da folga). No sim final de 12 sementes: 38 / 34 / 40 de 48
  (ruído das sementes 1 a 12; nas sementes 13 a 24 a Cripta fez 41 e a Estrada 39).

**RE-05 · Parede dos 6:30** · impl + bal · P · ✅ feito

- Por quê: 01-balance D5: 18 das 47 derrotas entre 6 e 8 min; o segmento de 390 s multiplica o HP gerado por segundo
  por 1,8 de uma vez (300 s 18,0; 390 s 32,7), os outros degraus ficam em 1,3 a 1,5.
- O quê: `CURVE` (`data/waves.ts`) 390 s `hpMult` 2.8 para 2.5. Medido: Estrada 30 para 35/48; mortes entre 6 e 8 min
  em Valmor de 9 para 6.
- Aceite: mortes entre 6 e 8 min abaixo de 12 nas 144 corridas; nenhum snapshot novo acima de 650 vivos.
- Feito (lote 1, sim de 12 sementes): mortes entre 6 e 8 min 14 para **12** de 144 (o lote 2 continua o trabalho, ver
  a tabela final da R2); snapshots acima de 650 vivos 15 para 7, máximo 700 (nenhum acima do que já havia).
- Ajuste final da R2: com os lotes 2 a 4 o jogo ficou fácil demais (122/144, Lyra 92%, Teo 89%); `CURVE` +5% de vida
  de 5:00 em diante (300 s 2.2, 390 s 2.6, 480 s 3.7, 540 s 4.3; o degrau de 6:30 continua menor que antes, 1,18x
  contra 1,33x). Mortes entre 6 e 8 min: 12 de 144 no sim final de 12 sementes, 41 de 576 com 48 sementes (10,3 por
  144). Snapshots no teto de 700 vivos: 20 de 600 no sim final (o teto é o `maxActive`, nenhum acima).

**RE-03 · Elos corpo a corpo e de aura na altura dos outros** · impl + bal · P · ✅ feito

- Por quê: 01-balance D4: DPS real no sim (144 corridas): Chama de Yah 34, Fúria 59, Quebra-Junta 59, Vigília 73
  contra Luz Sagrada 171, Nevasca 166, Tempestade 163, Espada de Fogo 155; Maça L7 rende 37, a pior base no máximo.
- O quê (`data/weapons.ts`): `yahFlame` `radius` 125 para 150; `jointBreaker` `range` 120 para 145 e `arc` 2.6 para
  3.0; `mace` `range` L1 78 para 88, L5 88 para 100, L7 96 para 110 (níveis intermediários interpolados). A Chama a
  150 px pede o disco grande com alfa baixo (RF-06).
- Aceite: no relatório de armas do sim, nenhum Elo abaixo de 90 de DPS real e Maça L7 acima de 55.
- Feito (lote 2): números como no O quê. Lab multidão: Chama de Yah 2195 para 3046, Quebra-Junta 3150 para 4650, Maça
  L1 72 para 120 e Lmax 1136 para 1486 (no chefe: Fúria 93, Vigília 91, Quebra-Junta e Maça sem perda). Aceite do sim
  **não cumprido** e deixado assim de propósito: DPS real no sim (média de quem tem a arma no fim) Chama 33 para 37,
  Quebra-Junta 31 para 49, Vigília 55 para 48, Fúria 86 para 83, Maça L7 21 para 30. O robô do sim foge de tudo a
  menos de 200 px, então aura e golpe corpo a corpo quase nunca têm alvo; subir mais o dano para chegar a 90 no sim
  deixaria essas armas muito acima das outras na multidão do lab (já são as maiores). Conferir jogando (o humano entra
  na multidão).

**RE-04 · Leque de Facas melhor que as Adagas contra um alvo** · impl + bal · P · ✅ feito

- Por quê: 01-balance D1: o Elo da Andilla rende 81 DPS no chefe a 60 px e 27 a 90 px (0,18x da base), contra Adagas
  L7 152; ela é a mais lenta contra o chefe (107 s). Num anel de 10 facas só uma pega o alvo. Conflito com B-01
  resolvido em `07-direcao.md` (conflito 1).
- O quê: `fan` `spread` de `TAU/10` para 0.16 (leque de ~85° à frente, mirando no mais próximo), dano 15 mantido. A
  rotação de meio passo do B-01 continua no core e no teste para qualquer arremesso que cubra o círculo. Medido: chefe
  243 / 135 / 79 DPS a 60 / 90 / 140 px; multidão 1175 (igual).
- Aceite: no lab de chefe, Leque acima de 1,5x as Adagas L7 a 60 e a 90 px; multidão do lab sem queda.
- Feito (lote 2): `spread` **0.1** em vez de 0.16 (leque de ~52° com 10 facas, ~57° com 11), porque com 0.16 o lab de
  chefe deu 243 / 135 / 79 DPS a 60 / 90 / 140 px, e 135 a 90 px não passa de 1,5x as Adagas L7 (152). Com 0.1: **297
  / 243 / 131** (1,95x e 1,6x a 60 e 90 px); multidão do lab 1064 para 1068 (sem queda); lab solo 27 para 162. Testes:
  o Leque mira no mais próximo e acerta pelo menos 3 facas a 90 px; o anel do B-01 continua testado para qualquer
  arremesso que cubra o círculo. Descrição no pt-BR atualizada.

**RE-07 · Pequenos acertos de curva** · impl + bal · P · ✅ feito

- Por quê: 01-balance D10: Fogo solo cresce só 2,7x de L1 a Lmax (a menor DPS solo no máximo); D11: Mãos Ligeiras
  (+1 de quantidade em todas as armas, +25% a +100% de DPS) custa 2000 contra 1500 da Recarga inteira.
- O quê: `fire` L7 `damage` 32 para 38; `SHOP.amount` `baseCost` 2000 para 3000.
- Aceite: lab: Fogo solo Lmax perto de 23; economia do sim: Loja e heróis ainda dentro de 40 a 80 corridas.
- Feito (lote 2): lab Fogo solo Lmax 19,2 para **22,8**, multidão 670 para 796. Economia: Loja inteira mais os três
  heróis custam 25450 de ouro; com ~500 de ouro por corrida no sim (sem contar a Ganância comprada), cerca de 50
  corridas, dentro de 40 a 80. O segundo herói continua a 2 corridas do Aldo em Valmor.

**E-08 (reaberto) · Elos mais cedo** · lote 3. Ver o item na Etapa 2.

**RE-06 · Armas de alvo aleatório miram o chefe** · impl + bal · P · ✅ feito

- Por quê: 01-balance D7: a Estrada tem 7 das 12 derrotas na luta do chefe e a Lyra perdeu 3 por tempo esgotado (20
  a 30 DPS no chefe); Raio, Fogo e Geada caem na escolta e o Lobo Velho nunca fica numa zona. Lab de chefe: Fogo L7
  19 DPS (388 s para 14 mil), Geada 24, Raio 23.
- O quê: em `fireStrike` e `fireZone` (`core/weapons.ts`), o primeiro raio, chama ou mancha de cada disparo vai no
  chefe quando ele estiver no retângulo visível (`world.boss` vivo e dentro da vista do B-04); senão, a regra atual
  (Raio e Fogo no mais próximo, Geada ao acaso). Teste em `weapons.test.ts`. Reserva: `oldWolf` `hp` 12000 para 10500
  se a Estrada ainda tiver mais de 3 mortes por tempo.
- Aceite: teste verde; Lyra sem derrota por tempo esgotado na Estrada; mediana da luta de chefe de 45 a 90 s.
- Feito (lote 3): `bossOnScreen` em `core/weapons.ts`; o primeiro raio, chama ou mancha de cada disparo vai no chefe
  vivo dentro do retângulo visível. Testes em `weapons.test.ts` (Raio, Fogo e Geada miram o chefe na tela e ignoram o
  chefe fora dela). Sim: Lyra sem derrota por tempo esgotado na Estrada (**0**, era 1); tempo esgotado em toda a
  Estrada 2 para **1**; mediana da luta de chefe 64 para **57 s** (Estrada 74 para 49 s); derrotas na luta de chefe 5
  para 2. Reserva do `oldWolf` não foi necessária.
- Complemento (depois do lote 4): com o Leque mirando (RE-04) a Andilla passou a perder por tempo esgotado na Estrada
  (4 a 5 de 12): as facas iam na escolta, mais perto que o Lobo Velho, que o herói mantém longe. Agora as armas que
  miram (`aim: 'nearest'`, Adagas e Leque) também vão no chefe na tela; teste em `weapons.test.ts`. E a reserva:
  `oldWolf` `hp` 12000 para **10500**. Com 48 sementes: 9 tempos esgotados na Estrada em 192 corridas (2,3 por 12),
  Lyra 3 em 48.

**E-09 (reaberto) · Armadura não pode zerar o dano** · lote 4. Ver o item na Etapa 2.

**RE-08 · Andilla como teto, não como regra** · bal · P · ✅ feito

- Por quê: 01-balance D2: Andilla vence 32 de 36 (89%) e ganha 687 de ouro por corrida contra 364 a 410; o Daniel pediu
  a Andilla forte no começo (E-03), então não se nerfa antes de subir os outros.
- O quê: só se, depois dos lotes 1 a 4, a Andilla tiver 34 de 36 vitórias ou mais: Adagas L1 `cooldown` 0.8 para 0.9.
  Caso contrário, nada e o item fecha como "não necessário".
- Aceite: Andilla dentro da meta da R2 (55% a 85%) ou, se acima, a mudança aplicada e medida.
- Feito (condição atingida: Andilla 35/36 depois do lote 4): Adagas L1 `cooldown` 0.8 para **0.9** (só L1 a L3; o L4
  já põe 0.7). Medido: Andilla 35 para **32/36** (89%) no sim final de 12 sementes; com 48 sementes, 133/144 (92%).
  Ela segue acima de 85%, e testei nerfs maiores (L4 0.75, L6/L7 com menos dano, `moveSpeed` +5): nenhum mexe mais que
  1 a 3 vitórias em 72, porque as derrotas dela são quase só tempo esgotado no chefe. Não apliquei para não tirar a
  força do começo que o Daniel pediu (E-03); fica como teto, conferir jogando.

### R3 · Efeitos visuais (dono: vfx-director)

Tudo em `render/fx.ts`, `scenes/GameScene.ts` e `render/art/`, lendo estado que o core já expõe (`OwnedWeapon.timer`,
`z.tick`, `slash.ttl`, `bolt.ttl`, `world.freeze`, `act`/`aimX`/`aimY`, `p.angle`). Nada novo no core além do opcional
`Enemy.hitKind`. Captura antes e depois de cada item em 420x820.

**RF-01 · Aviso do chefe em coral listrado** · vfx · P · ✅ feito

- Por quê: 06-vfx #9: `WARN_COLOR 0xff8a4a` é quase o laranja do Fogo (`0xff8a3a`) e da Chama (`0xff6a3a`); com fogo
  na build, o aviso do chefe se confunde com o ataque do próprio jogador.
- O quê: perigo de inimigo em rosa-coral (o `UI.danger`) com listras e borda branca tracejada; fogo do jogador fica
  laranja-dourado.
- Aceite: captura do Corte Brutal com Espada de Fogo ativa: aviso e fogo distintos à primeira vista.
- Feito: perigo de chefe em rosa-coral (`UI.dangerHex`) com listras que rolam (arcos no Corte Brutal, setas na Mordida
  Funda) e borda branca tracejada que marcha mais rápido conforme o golpe chega; Fogo, Espada de Fogo e Chama passaram
  para laranja-dourado (`fx.ts`).

**RF-02 · Acerto em flash branco; herói ferido com rosto visível** · vfx + impl · P · ✅ feito

- Por quê: 06-vfx #1 e 04-visual #4: a tinta `TINT.hit 0xff7070` deixa a multidão inteira vermelha quando aura, geada
  ou Fúria batem (parece sangue, apaga o tom fofo e cobre o azul do lento), e é o vermelho da Andilla; o herói ferido
  vira silhueta vermelha chapada (`setTintFill(TINT.heroHurt)`, `GameScene.ts:312`).
- O quê: inimigo atingido com `setTintFill(0xffffff)` nos primeiros ~0.05 s do `flash`, depois a tinta de status;
  squash (escala ~1.15 x 0.85 decaindo com `flash`) no lugar do tremor de rotação; herói ferido com `setTint(0xff9090)`
  (multiplica) e o contorno piscando branco que já existe.
- Aceite: capturas com Aura L7 e com Andilla cercada: nenhuma massa vermelha; o rosto do herói ferido é visível.
- Feito: inimigo atingido pisca branco (`setTintFill`) só na primeira metade do `flash` (~0.05 s) e depois volta a
  tinta de lento ou congelado; squash 1.15 x 0.85 que decai com o `flash` no lugar do tremor de rotação; modo calmo
  sem o branco (só o squash). Herói ferido com `setTint(0xff9090)` (multiplica, o rosto aparece) por 140 ms, com o
  contorno piscando branco. Tintas de lento e congelado ficam para a A-05 (família branco-lilás).

**RF-03 · Chefes e elites por cima, elite e baú com cara de recompensa** · vfx + visual · P · ✅ feito

- Por quê: 04-visual #5: todo inimigo na profundidade 5, o Cavaleiro aparece só pela capa e o Sineiro some sob as
  próprias Ossadas; 04-visual #6 e 06-vfx #17: o Goblin Lanceiro não se distingue de uma Gosma e ninguém sabe que ele
  solta o baú; o baú no chão não brilha.
- O quê: `setDepth(boss ? 7 : elite ? 6 : 5)` no `if` de troca de textura do `enemyMirror` (custo zero por quadro);
  anel dourado no chão das elites desenhado na própria textura (no lugar da sombra preta); brilho em estrela piscando no
  baú caído.
- Aceite: capturas dos três chefes com escolta em 420x820: chefe inteiro visível; elite reconhecível numa multidão.
- Feito: profundidade por papel (chefe 7, elite 6, comum 5) posta só na troca de textura do `enemyMirror`; Goblin
  Lanceiro e Golem com anel dourado no chão desenhado na textura (`Pen.eliteRing`, no lugar da sombra preta); baú
  caído com anel dourado pulsando e uma estrela branca que pisca na tampa (`fx.ts`).

**RF-04 · Sem flash de tela inteira: baú, Badalada e Sopro de Geada com forma** · vfx + impl · M · ✅ feito

- Por quê: 06-vfx #5 e #12: o baú (`cameras.main.flash`, `GameScene.ts:331`) pinta a tela de amarelo opaco num quadro e
  não mostra o que veio, justamente o momento do Elo; Badalada e Sopro de Geada idem; o fim do congelamento chega sem
  aviso e o inimigo lento anda na mesma cadência.
- O quê: baú: raios de luz girando atrás do herói (6 triângulos, alfa baixo), o ícone da recompensa (`ICON_ART`)
  subindo do herói e um anel na cor do herói; Elo com raios duplos e estrelas; se o flash ficar, véu de 25% por 120 ms.
  Badalada: anel dourado de som do herói até as bordas em ~0.3 s. Sopro de Geada: onda de gelo até as bordas, tinta de
  4 cantos nos congelados, piscar no último 1 s (`world.freeze < 1`). Lento: cadência de passos `time * 4`.
  Modo calmo: sem tremor e sem véu.
- Aceite: nenhum `cameras.main.flash` opaco no jogo; captura do baú com Elo mostra o ícone do Elo; o congelamento pisca
  antes de acabar.
- Feito: nenhum `cameras.main.flash` no jogo. Baú: raios de luz girando atrás do herói (6, ou dois conjuntos cruzados
  com a cor do herói no Elo), anel na cor do herói, estrelas no Elo e o ícone da recompensa saltando do herói e
  subindo (uma `Image` reusada). Badalada: anel dourado de som até as bordas em ~0.3 s (o tremor fica, fora do modo
  calmo). Sopro de Geada: onda branco-lilás com lascas até as bordas, geada e pingentes nas bordas da tela enquanto
  dura, tinta de 4 cantos nos congelados (topo claro) e os dois piscam no último 1 s. Lento: passos com cadência `time
  - 4`. Sem véu (não foi preciso). Estado dos momentos em `render/fx.ts` (`Moments`), só tempos, sem alocar.

**RF-05 · Pool de faíscas, mortes de desenho animado** · vfx + impl · M · ✅ feito

- Por quê: 06-vfx (infraestrutura), #1 e #8: nenhum acerto diz qual arma bateu nem quão forte; a morte é uma bolha de
  sabão cinza; elite e chefe morrem igual a um morcego; a vitória não tem momento. Gema e item dividem o teto de puffs
  com as mortes e somem nas ondas grandes.
- O quê: `render/sparks.ts`, array fixo de ~96 entradas criado uma vez, teto rígido (metade no modo calmo), máximo de
  ~24 faíscas novas por quadro, desenhado no `fxTop`; alimentado só lendo estado (flash recém-posto, puff novo, raio
  novo). Faísca por tipo: estrela branca (corte), cruz dourada (luz), floco (gelo), brasa (fogo); opcional
  `Enemy.hitKind` no core com teste. Morte: 3 nuvenzinhas, "pop" branco e 2 a 3 estrelinhas; elite com confete dourado;
  chefe com anéis de luz, estrelas e tremor forte (sem câmera lenta). Reservar 10 do teto de puffs para gema e item.
- Aceite: F4 com 700 inimigos sem queda maior que 10% contra a medição do início da R3; capturas de morte comum, de
  elite e do chefe aprovadas pelo vfx-director.
- Feito: `render/sparks.ts`: 96 faíscas criadas uma vez (48 no modo calmo), no máximo 24 novas por quadro, desenhadas
  no `fxTop`; alimentadas lendo o estado (`e.flash` recém-posto, puff novo). Core: `Enemy.hitBy` (a arma do último
  acerto, uma atribuição em `damageEnemy`) com teste, e `effects.pickupPuffs` (10 do teto de puffs reservados para
  gema e item) com teste. Faísca por arma: estrela branca (corte), cruz dourada (luz; roxa no Raio, verde-dourada na
  Luz de Elun), floco (gelo), brasa que sobe (fogo). Morte: pop branco, 3 nuvenzinhas e 2 a 3 estrelinhas; elite com
  anel e confete dourado; chefe com 3 anéis (dourado, branco, cor do herói), estrelas, confete e tremor forte (fora do
  modo calmo). Golpes e raios somem quando a partida acaba (não ficam congelados no ar). F4 com 701 inimigos a 4x: sem
  armas 58.3 para 58.0, Lâmina L7 56.5 para 56.1, 6 Elos 45.4 para 44.1 FPS (dentro do ruído, abaixo de 10%).

**RF-06 · Aura e Chama de Yah pulsando no ritmo do dano** · vfx · P · ✅ feito

- Por quê: 06-vfx #2: o alfa oscila por `sin(time * 6)`, desligado do tick (período ~1 s contra ticks de 0.35 a 0.5
  s); no L1 o único sinal de dano é a turma ficar vermelha; a Chama lê como serra.
- O quê: fase pelo `OwnedWeapon.timer`; núcleo em 3 discos concêntricos de alfa baixo; onda que sai até exatamente o
  raio a cada tick; borda que acende no tick; 5 a 8 motes determinísticos. Chama: núcleo branco-quente, línguas de fogo
  arredondadas e brasas, disco grande a ~0.06 (o raio vai a 150 em RE-03).
- Aceite: num vídeo curto dá para contar os ticks; a Chama não esconde os inimigos dentro dela.
- Feito: fase pelo `OwnedWeapon.timer` (0 no tick); núcleo em 3 discos de luz macia; a cada tick uma onda fina sai do
  núcleo até exatamente o raio de dano (desenhada por cima da multidão, fina, para ser vista sem esconder ninguém) e a
  borda acende e descansa; 5 a 8 motes de luz subindo (mais por nível). Chama de Yah: disco grande a 0.06, núcleo
  branco-quente, 16 línguas de fogo redondas que sobem (mais altas no tick) e 10 brasas. Ajuste do RF-02: acertos de
  aura e de Geada não pintam o inimigo de branco (a turma inteira virava uma bolha branca a cada tick); o tick aparece
  pela onda, pelas cruzes douradas e pelo squash.

**RF-07 · Golpes que varrem (Lâmina, Fúria, Maça, Quebra-Junta, Corte Brutal)** · vfx · M · ✅ feito

- Por quê: 06-vfx #3 e 04-visual #2: o golpe aparece inteiro e desbota (não se lê a direção); a Fúria é um disco bege
  parado; a Maça é um disco cinza de ~300° com preenchimento 0.6 por cima dos inimigos que parece neblina; o
  Quebra-Junta cobre quase o círculo; o Corte Brutal é uma fatia branca parada.
- O quê: borda brilhante que varre de `a0` a `a1` com rastro em gradiente (2 fatias, não 3), borda âmbar de Aldo na
  Lâmina; Fúria como lâmina que dá uma volta com rastro dourado e centro vazio; Maça sem fatia cheia (faixa grossa na
  borda, preenchimento no máximo 0.15, anel de choque no chão e lascas); Quebra-Junta em cobre com rachaduras e
  faíscas; Corte Brutal com o mesmo varrer, poeira e tremor curto.
- Aceite: inimigos visíveis através de qualquer golpe; direção do golpe legível numa captura; custo igual ou menor.
- Feito: um só `drawSwing` para todos os golpes e o Corte Brutal: a lâmina (linha branca com a borda colorida) varre
  de `a0` a `a1` na primeira metade da vida do golpe, puxando um rastro em lua crescente (2 faixas de anel, o miolo
  perto do herói fica livre) que depois alcança a ponta e some. Lâmina com borda âmbar de Aldo; Fúria uma volta
  inteira com rastro dourado e faíscas pela tangente; Maça com preenchimento 0.15, faixa estreita na borda, anel de
  choque no chão abrindo para fora e lascas; Quebra-Junta em cobre com rachaduras no chão nas duas pontas e faíscas;
  Corte Brutal com o mesmo varrer em branco e coral, poeira na borda e tremor curto (fora do modo calmo). As faixas
  são setores de anel preenchidos (sem as listras que o arco grosso fazia). `CLEAVE_SHOW` passou a ser exportado de
  `core/bosses.ts`.

**RF-08 · Golpes do céu: bola de fogo, Espada de Fogo cravando, raio de Lyra** · vfx · M · ✅ feito

- Por quê: 06-vfx #4 e #7, 04-visual #2: o Fogo é um risco reto ("palito") e dois discos no `top` que escondem os
  inimigos (laranja a 0.4 sobre azul vira marrom); a Espada de Fogo não tem espada; o Raio tem sempre o mesmo
  zigue-zague, um disco cáqui por cima e é amarelo, não da Lyra.
- O quê: Fogo: gota de fogo caindo, explosão de pétalas no `ground` até o raio exato, brasas que somem com o `ttl`.
  Espada de Fogo: `drawSword` em cores de fogo caindo de ponta e cravando. Raio: 3 a 4 vértices por hash de `b.x`/`b.y`,
  clarão branco e faíscas no primeiro quadro, marca queimada no `ground`, contorno roxo de Lyra; Tempestade com 1 a 2
  galhos e sombra de nuvem. Nenhum disco opaco no `top`.
- Aceite: capturas de Fogo, Espada de Fogo, Raio e Tempestade no quadro do impacto com os inimigos visíveis.
- Feito: `drawBolt`: nenhum disco por cima dos inimigos; a área de dano fica no chão. Fogo: bola de fogo com cauda
  caindo no primeiro quarto da vida, depois uma flor de 8 pétalas de chama abrindo até o raio exato, borda clara no
  raio, anel de fumaça e brasas que sobem (pool de faíscas). Espada de Fogo: `drawSword` em cores de fogo caindo de
  ponta e cravada no centro da explosão. Raio de Lyra: zigue-zague de 4 segmentos próprio de cada raio (hash de
  `b.x`/`b.y`), contorno de tinta, roxo de Lyra e núcleo branco, clarão branco pequeno no pouso, marca queimada com
  anel roxo no chão e faíscas roxas; Tempestade com 2 galhos e sombra de nuvem. Sem o escurecer de tela (não
  precisou).

**RF-09 · Projéteis e órbitas com rastro e a cor do dono** · vfx · M · ✅ feito

- Por quê: 06-vfx #6, #10, #14, #18: Luz de Elun branca some entre esqueletos brancos; órbitas sem rastro somem na
  multidão; o halo da Vigília é um disco marrom maior que o hitbox; o Martelo voa parado; Adagas sem rastro; as armas
  próprias não têm a cor do herói.
- O quê: Luz de Elun com rastro curto e halo verde-dourado de Teo (Luz Sagrada com estrelinha); Adagas com traço de
  velocidade vermelho de Andilla; Martelo girando (`SPIN` por sprite, pré-calculado); Espadas com arco de rastro
  (~0.6 rad); Vigília sem disco, brilho do tamanho do hitbox e anel dourado com 4 marcas.
- Aceite: captura em L7 com 100 inimigos: todos os projéteis e espadas achados; nenhum halo maior que o hitbox.
- Feito: rastros por arma (`TRAIL` em `fx.ts`, desenhados no `fxTop` sob o sprite, comprimento pela velocidade): Luz
  de Elun com halo verde-dourado de Teo e rastro curto; Luz Sagrada com rastro dourado e estrelinha piscando; Adagas
  com traço vermelho de Andilla; Leque com traço rosa-escuro; Martelo girando em voo (`SPIN` por sprite) com rastro
  largo; Fúria da Forja igual, alaranjada e soltando brasas; Fogos-Fátuos e Procissão com fila de luzes ondulante.
  Espadas com rastro em setor de anel (~0.6 rad) ao longo da órbita; Vigília sem o disco marrom, brilho branco-dourado
  do tamanho exato do hitbox, rastro dourado mais longo e o círculo guardado como anel dourado com 4 marcas girando.
  Sinos ficaram como estavam (não fazem parte deste item).

**RF-10 · Investidas legíveis e chegada das Ossadas** · vfx + visual · P · ✅ feito

- Por quê: 04-visual #8 e 06-vfx #13: o preparo da investida de Encapuzado, Rato e Goblin é o tremor de rotação,
  invisível em 24 px; com 6 na tela não se sabe quem vai investir nem para onde; as Ossadas do Sineiro surgem do nada; a
  Mordida Funda não deixa rastro.
- O quê: no `Windup` de inimigos sem `ability`, agachar (escala 1.15 x 0.8) e uma seta curta no chão na direção
  `aimX`/`aimY`; esticão na arrancada; puff de terra nas marcas das Ossadas na troca Windup para Idle do Sineiro; 3
  linhas de velocidade atrás do Lobo Velho e poeira no fim.
- Aceite: captura de 6 Encapuzados em preparo: dá para dizer a direção de cada um.
- Feito: inimigos com `move: 'charge'` agacham no `Windup` (escala +0.15 x -0.2, sem o tremor de rotação, que ficou só
  para chefes) e mostram uma seta coral no chão na direção `aimX`/`aimY` que cresce até a arrancada; esticão nos
  primeiros 0.2 s da investida. Sineiro: puff de terra (anel) e lascas de osso em cada marca na troca Windup para
  Idle. Lobo Velho: 3 linhas de velocidade atrás dele na Mordida Funda e poeira onde ele para. `CHARGE` passou a ser
  exportado de `core/behaviours.ts` (só leitura no render).

**RF-11 · Geada com pouso e tick visíveis** · vfx · P · ✅ feito

- Por quê: 06-vfx #11: a mancha surge pronta e o tick só aparece pelos inimigos tingidos; a Nevasca a 0.34 lava a
  tela com 4 zonas de 75 px.
- O quê: pouso (anel que abre e 6 lascas), anel de geada no tick (`z.tick`), borda que se parte no fim; Nevasca com
  flocos determinísticos e fundo a 0.22. Cores na família nova do gelo (A-05: branco e branco-lilás), sem o ciano da
  gema.
- Aceite: captura com Nevasca e gemas no chão: gemas visíveis dentro da zona.
- Feito: `drawZone`: pouso em 0.15 s (o círculo abre de 0 ao raio e 6 lascas de gelo voam da borda); a cada tick
  (`z.tick`) um anel de geada corre do meio até a borda e os cristais dão um pulso; nos últimos 0.4 s a borda se parte
  em 8 pedaços que se afastam enquanto some. Fundo a 0.22 nas duas (Geada em branco-lilás `0xd8d2f0`, Nevasca em
  branco com a borda azul forte); Nevasca com 6 flocos determinísticos caindo. Nada em ciano: as gemas seguem visíveis
  dentro da zona.

**Medição F4 da R3** · ✅ feita

- Chromium headless (GL por software), 420x820, CPU 4x, 701 inimigos com vida infinita, média de 10 leituras de
  `actualFps`, base (`c264c41`, antes da R3) e R3 rodando lado a lado: sem armas ~54 contra ~50 FPS (dentro do ruído
  da máquina, que variou de 47 a 59 nas duas versões), Lâmina L7 ~48 contra ~46, 6 Elos (Chama, Vigília, Nevasca,
  Tempestade, Espada de Fogo, Fúria) ~37 contra ~43; uma arma por vez: Chama 57/55, Vigília 54/56, Nevasca 50/55,
  Fúria 52/57.
- Achado: os `fillCircle`, `strokeCircle`, `arc` e `slice` do Phaser montam sempre 100 pontos (e o preenchimento passa
  pelo earcut), seja qual for o tamanho; com as faíscas, nuvens e motes novos isso derrubou os Elos para ~29 FPS. Saiu
  `render/shapes.ts` (`disc`, `ring`, `arcLine`, `band`: leques e faixas de triângulos com poucos segmentos por
  tamanho, de uma tabela pronta) e todo o `fx.ts` e o `sparks.ts` passaram a usá-lo; os efeitos novos ficaram mais
  baratos que os antigos.
- Chefes não piscam branco nem amassam muito ao levar golpe (com 6 armas o chefe virava uma silhueta branca, o mesmo
  problema do herói vermelho do RF-02); o golpe aparece pelas faíscas e números.
- L-01 (celular real) segue aberto.

### R4 · Interface (dono: ui-designer)

**RU-01 · Escolha segura, receita com estado e level-up sem faixa clara** · ui + impl · P · ✅ feito

- Por quê: 05-ui #3: com o joystick flutuante, um toque novo logo depois de abrir a escolha pega a carta de baixo; a
  receita não diz se o jogador já tem a passiva; a carta de passiva cita só a primeira arma (Cota de Malha esquece a
  Vigília). 04-visual #9: o escuro deixa uma faixa de 44 px no topo cortando ouro e abates. 06-vfx #16: o pulso de nível
  some sob o overlay.
- O quê: cartas e botões de carga entram com fade de ~300 ms e ignoram `pointerdown` nesse tempo (não repetir no
  restart de Trocar/Banir); receita com mini-ícone da passiva e "(você tem)", "(falta)" ou "Elo pronto: pegue um
  baú"; carta de passiva lista todas as armas possuídas que completa (função pura em `core/upgrades.ts`, testada);
  escuro na tela inteira e `bringToTop(SCENES.hud)` na LevelUp e na Pausa. Textos em `pt-BR.ts` conforme o `05-ui.md`.
- Aceite: toque 100 ms depois de abrir não escolhe; teste da lista de armas; captura sem faixa clara e com o pulso
  visível.

**RU-02 · Faixa da build no HUD** · ui + impl · M · ✅ feito

- Por quê: 05-ui #1 e referência do Daniel (`docs/design/ui-references/hud-active-weapons.png`): o jogador não vê a
  build durante a corrida, nem slots livres, nem que só falta um baú para o Elo. É o item que mais leva a profundidade
  de build (pilar 3) para dentro da partida.
- O quê: canto superior esquerdo abaixo do ouro: até 6 slots de arma (24 px, pips de nível) e 6 de passiva (20 px);
  slot vazio com borda apagada; arma no máximo com barra dourada; "Elo pronto" com moldura dourada pulsando (um tween
  criado na mudança); Elo formado com moldura fixa. `world.buildRev` incrementado em `applyUpgrade()` e
  `eloReady(world, weaponId)` puro em `core/upgrades.ts`, ambos testados; o HUD só redesenha quando `buildRev` muda. A
  faixa não é interativa (não rouba toque do joystick).
- Aceite: em 360x640, 420x820 e 1000x680 a faixa cabe com safe-area e não cobre o herói; zero alocação por quadro;
  "Elo pronto" acende quando arma no máximo + passiva.

**RU-03 · Barra do chefe no topo e HUD mais limpo** · ui + impl · P · ✅ feito

- Por quê: 05-ui #8: a barra do chefe fica a 40 px do rodapé, sob o polegar, na luta mais importante; #9: nível longe
  da barra de XP, botão de pausa abaixo de 44 px, ouro e abates espalhados.
- O quê: barra do chefe logo abaixo da faixa da build (largura máxima 420 px); "Nv" na ponta da barra de XP; pausa de
  44 px no canto real; ouro e abates numa linha à direita com ícone.
- Aceite: 420x820 com chefe: barra e nome visíveis no terço superior; alvo da pausa com 44 px; nada sobreposto em
  360x640 e paisagem.

**RU-04 · Painel de build e atributos na subida de nível** · ui + impl · M · ✅ feito

- Por quê: 05-ui #2 e referência do Daniel (`levelup-stats-panel.png`): o jogador vê "Dano +10%" mas não quanto Dano
  já tem nem se há slot livre; no celular sobram ~200 px vazios abaixo das cargas.
- O quê: `render/buildPanel.ts` com `buildSlots` (reusado pela faixa do RU-02) e `statSheet` em três grupos
  (Sobreviver, Ataque, Coleta), "-" no valor base, prévia `atual → novo` em dourado para a carta em foco;
  `formatStatValue` em `describe.ts`; ícone `icon.greed`. Desktop: painel à direita das cartas; altura abaixo de 700
  ou sobra menor que 170 px: só os slots.
- Aceite: 420x820 e 1000x680 com o painel completo; 360x640 só com slots; nada sobreposto; prévia certa para uma
  passiva (teste do formatador).

**RU-05 · Tela final com ícones, "faltou pouco" e Próxima fase** · ui + impl · P · ✅ feito

- Por quê: 05-ui #7: a tabela de DPS é boa, mas sem ícones nem o Elo que ficou a um passo, o melhor gancho de "só
  mais uma" (pilar 4); 03-qa (sugestão): depois de liberar uma fase, "Jogar de novo" repete a antiga.
- O quê: ícone de 20 px e barra de dano por arma; passivas com pips; linha "Faltou um baú para formar X!" (ou "o Elo
  de Y" se o Elo for desconhecido, sem revelar o nome) quando `eloReady` no fim, ou "estava a um nível do Elo"; botão
  "Próxima fase" quando a vitória liberou fase nova.
- Aceite: fim com Lâmina no máximo + Força mostra a linha de "faltou pouco"; vitória em Valmor oferece a Cripta num
  toque.

**RU-06 · Pausa com Desistir protegido** · ui + impl · P · ✅ feito

- Por quê: 04-visual #10 e 03-qa: Desistir logo abaixo de Continuar, mesmo peso, sem confirmação; larguras
  desalinhadas, título branco.
- O quê: Continuar no topo, depois as opções, Desistir por último em `UI.danger`; o primeiro toque em Desistir troca o
  rótulo para "Confirmar desistir" por 2 s; todos com a mesma largura; título em `UI.gold`.
- Aceite: um toque acidental em Desistir não encerra a partida; capturas em 420x820 e 1000x680 alinhadas.

**RU-07 · Lembrar herói e fase escolhidos** · impl · P · ✅ feito

- Por quê: 03-qa #9: a escolha vive só no `registry`; depois de recarregar, a Preparação volta para Aldo e Valmor
  mesmo com a Cripta liberada (pilar 1: do menu ao jogo em menos de 10 s).
- O quê: `lastHero` e `lastStage` no `MetaSave` (`core/meta.ts`), validados em `sanitizeSave` (herói comprado, fase
  aberta; senão o padrão), com teste.
- Aceite: escolher Lyra na Cripta, recarregar: a Preparação abre em Lyra e Cripta; save antigo continua válido.

**RU-08 · Joystick do tamanho da tela** · impl · P · ✅ feito

- Por quê: 05-ui #13: `config.joystick.radius` 56 fixo é ~16% da largura em 360 px e pequeno em tablet.
- O quê: raio `min(64, max(48, menorLado * 0.13))`.
- Aceite: 360x640 e 820x1180 com joystick proporcional.

**Medição F4 da R4** · ✅ feita

- Mesmo método da R3 (420x820, CPU 4x, 701 inimigos), base `35e305e` (fim da R3) lado a lado: Lâmina L7 ~58 contra
  ~57 FPS, 6 Elos (Fúria, Nevasca, Tempestade, Luz Sagrada, Chama, Leque) ~50 contra ~48, dentro do ruído.
- Achado: a faixa da build como `Graphics` (retângulos arredondados com contorno, redesenhados pelo Phaser a cada
  quadro mesmo sem mudar) derrubava a Lâmina para ~40 e os Elos para ~30. Agora molduras, pips e brilho são assados em
  texturas (`generateTexture`) só quando `buildRev` muda; ficam só imagens no quadro.

### R5 · Arte e polimento (dono: visual-director)

Começa pelos reabertos **A-05** (gemas x gelo, o mais visível), **A-04** (números em golpe de área) e **A-10** (chão
da Estrada), descritos nos próprios itens.

**RA-01 · Rato com corpo de verdade, aranha com olhos fofos** · visual · P · ✅ feito

- Por quê: 04-visual #8: o rato tem corpo 18 x 11 para um raio de 12 e parece morcego; #14: a aranha comum tem olho
  vermelho brilhante, reservado a Ossadas, Encapuzados e chefes na escada de ameaça.
- O quê: rato `ellipse(15, 13, 22, 14)`, cabeça maior, olho r 2.4; aranha com dois `pen.eye` brancos (r 2) e um
  olhinho menor.
- Aceite: na folha de texturas, rato maior que morcego; nenhum comum com olho brilhante.
- Feito: rato com corpo 22 x 14, cabeça e orelha maiores, olho r 2.4; aranha com dois olhos brancos e um olhinho.
  O esqueleto comum de Valmor também tinha olho brilhante (azul): ganhou olhinhos brancos nas órbitas; o brilho
  ficou só nas Ossadas, no fantasma, nos Encapuzados, nas elites e nos chefes.

**RA-02 · Vida numa cor só** · visual · P · ✅ feito

- Por quê: 04-visual #12: barrinha verde sob o herói e barra vermelha no HUD parecem duas coisas.
- O quê: `UI.hp` nas duas, barrinha piscando em `UI.danger` abaixo de 35%.
- Aceite: captura com as duas barras na mesma cor.

**RA-03 · Tremor sem borda vazia** · visual · P · ✅ feito

- Por quê: 04-visual #13: o chão cobre a vista com 2 px de margem e o tremor mostra uma faixa escura de ~7 px.
- O quê: margem de 24 px de mundo no `ground` e nos decals.
- Aceite: captura no pico do tremor de dano sem borda escura.
- Feito: a margem fixa de 24 px não bastava em 1000x680 (o tremor do Phaser anda `intensidade x lado x zoom` px de
  mundo: 0.02 x 1000 x 1.42 = 28). Agora a margem é calculada no `fitCamera` a partir do tremor mais forte (0.02),
  `ceil(0.02 x maior lado x zoom) + 4`, para o chão e os decals. Capturas do tremor de 0.02 sem borda nos três
  tamanhos. Barrinha sob o herói em `UI.hp`, piscando em `UI.danger` abaixo de 35%.

**RA-04 · Opções com selo de ligado e desligado** · visual · P · ✅ feito

- Por quê: 04-visual #11: "Som: ligado" só em texto; título branco fora do padrão.
- O quê: rótulo à esquerda e selo à direita (ligado como o "Completo" da Loja; desligado em `UI.textOff`); título em
  `UI.gold`; o mesmo selo nas opções da Pausa.
- Aceite: dá para ver o estado das três opções sem ler.
- Feito: componente `seal()` em `render/ui.ts` (ligado = o "Completo" da Loja, agora feito por ele; desligado = painel
  apagado com borda e texto em `UI.textOff`), usado por `optionButtons` (Opções e Pausa) com rótulo à esquerda;
  textos `t.options.on/off`; título das Opções em `UI.gold`.

**RA-05 · Livro de Elos com silhueta e base visível** · visual · P · ✅ feito

- Por quê: 04-visual #16 e 05-ui #11: `setTintFill(UI.borderOff)` apaga o ícone e sobram sete discos iguais; o mistério
  precisa de forma para dar vontade de descobrir.
- O quê: Elo desconhecido com o ícone da arma base colorido, "+ ?" para a passiva, "=" e a silhueta do Elo em
  `UI.border`; descoberto, os três coloridos. Sem revelar a passiva antes da descoberta.
- Aceite: captura em 420x820 e 1000x680: cada card desconhecido mostra de qual arma o Elo nasce.
- Feito: cada card desenha a receita em ícones, arma + passiva = Elo. Desconhecido: arma colorida, "?" dourado num
  disco no lugar da passiva e o Elo como sombra (`setTint(UI.border)`: a forma aparece, as cores não; o
  `setTintFill` virava um disco liso porque todo ícone é um distintivo redondo). "Só herói" à direita da receita;
  nomes da receita (ou "Nasce de") embaixo. Card com 74 px no mínimo (vira 3 colunas em 820x420). De carona: ícone
  da Geada em branco-lilás, como as zonas (A-05).

**RA-06 · Preparação: botão principal à esquerda, herói maior, fase vencida** · visual · P · ✅ feito

- Por quê: 04-visual #17: Partir à direita contra o padrão (principal à esquerda, como na tela final); herói de ~18 px
  no cartão; 05-ui #12: o jogador não vê quais fases já venceu.
- O quê: Partir à esquerda, Voltar à direita; herói do cartão a `ART_SCALE * 1.2`; selo "Vencida" (`t.select.cleared`)
  com o estilo do "Completo" da Loja, lendo `save.cleared`.
- Aceite: captura com Valmor vencida e Cripta aberta mostra o selo; nada sobreposto em 420x820 e 1000x680.
- Feito: Partir à esquerda (borda de foco), Voltar à direita; herói do cartão a `ART_SCALE * 1.2`, de pé no canto
  com os pés na linha da descrição (o chapéu da Lyra cabe no cartão); selo "Vencida" com o `seal()` da RA-04 no canto
  superior direito do cartão da fase. Conferido em 390x844, 420x820, 820x420, 1000x680 e 1920x1080.

**Medição F4 e capturas finais da R5** · ✅ feita

- Mesmo método da R3 e R4 (420x820, CPU 4x, 701 inimigos): Lâmina L7 ~58 FPS (R4 ~58), 6 Elos 48 a 52 em três
  medições (R4 ~50), Maça + Fogo + Raio ~55, Lâmina com 250 gemas cintilando ~56. Dentro do ruído; o cintilar das gemas
  é só escala e alfa por imagem, sem alocação.
- Capturas finais (420x820, 1000x680, 820x420) no scratchpad da sessão, `r5/final-*`.

### Rejeitados nesta revisão

- `rat.hp` 24 (01-balance D6): medido, não resolve (Cripta 39/48).
- `SHOP.armor` `maxLevel` 1 (01-balance D8): trocado por `minDamage` 2 (E-09), regra única.
- Nerf direto da Andilla (01-balance D2): só condicional (RE-08).
- Câmera lenta na morte do chefe (06-vfx #8): o mundo já para; explosão e tremor bastam.
- `oldWolf` 10500 e `xp.step` 6.5 como primeira opção: ficam como reserva de RE-06 e E-08.

---

## Lore: conferência com o original (2026-11-09)

Lore lida em `/home/dani/games/dungeon-rpg/docs/mundo/` (cânone, prólogo, capítulo 1) e no `src/data.js` do original.

**RL-01 · Elenco das fases como no original** · impl · P · ✅ feito

- Por quê: no original, o cemitério de Valmor tem Ossadas, morcegos cinzentos e Ratos de Cova; a cripta tem Rato
  Gigante, Morcego Vampiro e Gosma Verde. Aqui Valmor tinha Esqueleto, Aranha e Gosma, e a Ossada estava na Cripta.
- Feito: Valmor = Ossada (básico), Morcego (rápido), Esqueleto maior (resistente, arte 1.3x, raio 14), Rato de Cova
  (extra, novo: rato cinza 0.75x). Cripta = Rato Gigante (básico), Aranha Tumular (rápido), Gosma Verde (resistente),
  Espectro (extra). O Sineiro continua erguendo Ossadas. Sim 12 sementes antes/depois: Valmor 38→38/48,
  Cripta 34→34/48, Estrada 40→40/48; Aldo em Valmor 8→10/12.

**RL-02 · Vitória em Valmor sem contradizer a história** · impl · P · ✅ feito

- Por quê: quem acorda os mortos é o sino do Sineiro, então eles não "voltam a dormir" ao fim de Valmor.
- Feito: "O Cavaleiro Negro caiu. Mas o sino da igreja velha continua tocando."

**RL-03 · Correções no CLAUDE.md e no game-director** · impl · P · ✅ feito

- Aldo nasceu em Hyarmeth (não é de Valmor); o Elo do original é a combinação de dois heróis (o nome foi
  emprestado, a mecânica não); a lore fica só na cópia local do original, não no GitHub.

**Perguntas abertas para o Daniel (lore)**

1. "Aura de Yah" e "Chama de Yah": Yah é o Criador no cânone. Usar o nome numa arma de fogo incomoda?
2. Elos: manter como evolução de arma, ou aproximar do original (ex.: Espada de Fogo do Aldo = Lâmina + Fogo)?
3. Chefe de Valmor: manter o Cavaleiro Negro (só existe na tabela de dados do original) ou outro do cemitério?
4. Lore sem uso, pronta para fases futuras: a Irmandade dos encapuzados (o olho cortado ao meio), Morvath e o
   túmulo arrombado, "O rei voltará".

## Coleção e conquistas (2026-11-09)

Pedido do Daniel: Bestiário, conquistas e registros por herói, para dar motivo de voltar (pilar 4). Desenho completo,
pesquisa do gênero, lista das 35 conquistas, schema do save e telas em `docs/design/conquistas.md`. Ordem de
implementação abaixo; cada item é um commit.

**CC-01 · Contadores da partida** · impl · P · ✅ feito

- O quê: `world.killsBy`, `world.seen`, `world.bestHit`, `player.hitsTaken` + `world.firstHitAt`; `core/records.ts`
  com `summarizeRun(world, out?)`.
- Aceite: testes em `tests/core/records.test.ts`; F4 com 700 inimigos sem perda de FPS.
- Feito: `World.step` com 700 inimigos no Node 0,34 ms antes e 0,35 ms depois (ruído); F4 no navegador a 60 FPS.

**CC-02 · Save v2 (registros, Bestiário, totais)** · impl · M · ✅ feito

- O quê: `SAVE_VERSION` 2; `records`, `bestiary`, `totals`, `achievements`, `fresh`, `title`; migração de v0/v1
  (semeia o Bestiário pelas fases vencidas); mescla com save de versão futura; `recordRun` puro em `core/meta.ts`.
- Aceite: save v1 real continua com ouro, Loja, heróis, fases e Elos; testes de v0, lixo e versão futura.
- Feito: testes em `tests/core/save.test.ts`; `achievements`, `fresh` e `title` entram no save junto com as
  conquistas (CC-03), ainda na versão 2.

**CC-03 · Conquistas (dados e lógica)** · impl · M · ✅ feito

- O quê: `src/data/achievements.ts` (35 entradas declarativas), `core/achievements.ts` (métricas, progresso,
  checagem, conquista mais perto), textos em `pt-BR.ts`.
- Aceite: ids únicos e com texto; cada uma destrancável num save sintético; ouro somado uma vez; retroativas no save
  migrado.
- Feito: testes em `tests/core/achievements.test.ts`; textos com `describeAchievement` (render/describe.ts); as três
  cargas opcionais atrás de `config.achievementCharges`, ligado pelo Daniel em 2026-11-09 (Primeiro Elo: Trocar +1; Bestiário Completo: Pular +1; Livro Completo: Banir +1).

**CC-04 · Conquistas na tela final e calibração** · impl + bal · P · ✅ feito

- O quê: `bank()` com `summarizeRun` + `recordRun`; tela final com conquistas novas e "Perto: ..."; sim imprime dano
  e maior golpe; calibrar `damageRun`, `bossFast` e `hit120`.
- Aceite: toda tela final mostra uma conquista nova ou a mais perto; números em `docs/balance-baseline.md`.
- Feito: até 3 conquistas novas (e "+N conquistas"), senão "Perto:" (a mais perto entre 50% e 99%; sem nenhuma,
  a de maior progresso). O menu destranca as conquistas que um save antigo já merecia. Calibrado com 144 partidas
  normais e 144 de veterano (`SIM_SHOP=full`): `damageRun` 260.000, `hit120` 100, `bossFast` 40 s mantido.

**CC-05 · Tela Coleção com abas** · impl + ui · M · aprovado

- O quê: `CollectionScene` (Bestiário · Elos · Conquistas · Heróis) no lugar do `EloBookScene`; botão "Coleção" no
  menu com ponto de novidade.
- Aceite: aba Elos idêntica ao Livro atual; teclado e toque trocam de aba; celular em pé e deitado.

**CC-06 · Aba Bestiário** · impl + visual · M · aprovado

- O quê: grade com silhuetas, ficha com abates, primeira fase, características em termos de jogador
  (`enemyTraits` puro e testado) e frase do original onde houver (fontes em `conquistas.md`).
- Aceite: os 16 inimigos aparecem; não vistos sem nenhum dado; nenhuma frase inventada.

**CC-07 · Aba Conquistas** · impl + ui · M · aprovado

- O quê: páginas por grupo, progresso com barra, novas destacadas, escolha de título.
- Aceite: as 35 aparecem com progresso correto; abrir a aba limpa o ponto do menu.

**CC-08 · Aba Heróis** · impl + ui · M · aprovado

- O quê: cartão por herói (partidas, marcas de vitória por fase, melhor tempo, vitória mais rápida, nível, abates,
  maior golpe, arma favorita, Elos) e totais globais; título na tela final.
- Aceite: os registros batem com uma partida jogada de ponta a ponta.

**CC-09 · Aviso de conquista na partida** · impl + vfx · P · aprovado

- O quê: checagem uma vez por segundo, aviso pequeno no alto do HUD (2,5 s, fila), som `achievement`.
- Aceite: não cobre o centro nem a barra do chefe; espera o level-up fechar; FPS igual.

**CC-10 · Revisão visual e documentação** · visual + impl · P · aprovado

- O quê: visual-director confere as abas e o aviso; `CLAUDE.md` com os arquivos novos; itens marcados aqui.

**Perguntas abertas (CC)**

1. Frases para os seis inimigos sem texto no original (Esqueleto, Aranha Tumular, Gosma Verde, Espectro, Golem de
   Pedra, Cavaleiro Negro)?
2. Ligar as três recompensas opcionais (+1 Trocar, +1 Pular, +1 Banir por partida) ou ficar só no ouro?
3. Tudo bem usar as citações do original nos nomes (falas de vitória dos heróis, Seu Joaquim, "Ninguém mais desce")?

## Decisões já tomadas pelo plano do Daniel

| Tema                        | Relatório propôs                         | Plano do Daniel decide                                                                               |
| --------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Leque de Facas              | count 11, spread TAU/11                  | rotacionar meio passo quando cobre o círculo (B-01)                                                  |
| Adagas                      | só pierce, damage e count                | mirar no inimigo mais próximo; Martelo segue o movimento (E-04); buffs numéricos depois, pelo sim    |
| Lyra                        | Raio L7 damage 38 para 50                | primeiro raio no mais próximo e vida -20 para -10 (E-05); L7 50 só se o sim pedir                    |
| Chefes                      | golem 650 para não passar do chefe       | chefes com 12 a 15 mil HP e uma mecânica telegrafada cada (E-06, E-07); golem 650 mantido pelos Elos |
| Lâmina                      | não citada                               | pode ser reduzida um pouco se seguir dominante (E-03)                                                |
| Estilo                      | "Cavaleiro sem luz de baixo, se mistura" | resolver com contraste e luz, nunca tornando o jogo sombrio                                          |
| Meta de balanceamento       | 2/96 chegam às 10:00                     | média de 6 min ou mais em Valmor por herói, sem herói muito acima                                    |
| Gemas (2026-11-08)          | visual: gema azul se confunde com o gelo | gema segue azul-clara por escolha do Daniel; o gelo muda de cor (A-05)                               |
| Leque de Facas (2026-11-08) | balance: leque à frente (`spread` 0.16)  | aceito pelo game-director (RE-04); o Daniel confere de manhã e pode voltar ao anel do B-01           |

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
- Tabela de recordes local por herói e fase (virou CC-08, 2026-11-09).

Da Revisão 2026-11-08 (ordem de prioridade para a próxima conversa com o Daniel):

- **Dificuldade por fase vencida** (01-balance D8: com a Loja inteira o veterano vence 47 de 48): um nível extra por
  fase depois de vencê-la, com curva mais dura e mais ouro. O próximo sistema grande para o pilar 4; nome e
  apresentação com o Daniel.
- **Revelação pausada do Elo formado** (05-ui #5): só se, depois do RF-04, o Daniel sentir que o Elo ainda passa
  despercebido. Baú comum continua sem pausa.
- **Pausa como ficha da build** (05-ui #4): reaproveita o `buildPanel` do RU-04, com DPS por arma e estado do Elo.
- **Setas na borda para baú e elite** (05-ui #6).
- **Loja com ícones, grupos e pips** (05-ui #10), com 4 ícones novos.
- **Joystick fixo como opção** (05-ui #13).
- **Efeitos menores** (06-vfx): Fogos-Fátuos com rastro, sinos balançando, rastro e faísca de gema coletada,
  Tempestade escurecendo a tela.
- **Menu e Loja usando o espaço que sobra** (04-visual #18).
- **Tamanho do bundle** (00-checks: 1,30 MB num chunk, 357 kB gzip): medir o tempo até o menu em 4G antes de mexer.
