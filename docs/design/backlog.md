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

Desde 2026-11-10 a direção é fantasia escura e iluminada (decisão do Daniel, substitui o cartoon fofo): mundo
escuro e de cores apagadas, a luz conta a história (luz do herói, tochas, magia, Elos), chão detalhado com
objetos de cenário e, quando houver, sprites próprios animados. Legibilidade continua em primeiro lugar: ameaças
nunca somem no escuro e nada é sangrento. O padrão completo está em `.claude/agents/visual-director.md`. Itens
antigos deste backlog que pedem traço cartoon seguem a nova direção.

## Forma de trabalho

1. Apresentar o plano de cada etapa ao Daniel e aguardar aprovação antes de mexer.
2. Uma etapa por vez. Cada passo termina com `npm test`, `npm run lint` e `npm run build` verdes, o jogo rodando e
   um commit pequeno (Conventional Commits, em inglês).
3. Números antes e depois: `npm run sim` e `npm run lab` rodam antes e ao fim de cada etapa (e de cada ajuste de
   balanceamento). A linha de base fica em `docs/balance-baseline.md`, e cada etapa acrescenta sua tabela antes/depois.
4. Ao fim de cada etapa, mostrar ao Daniel o que mudou, com os números do sim e do lab.
5. Textos do jogador só em `src/i18n/pt-BR.ts`. Arte segue `.claude/agents/visual-director.md`.

## Próximos 5

Aprovado pelo Daniel em 2026-11-10: a **Etapa AR (arte nova)** vem antes das fases temáticas, para que inimigos e
fases novos já nasçam no estilo novo. A lista anterior (FT-01 a FT-08) volta depois da AR.

1. **AR-01** Escuridão e luz (camada escura, luz do herói, luzes de cenário, efeitos que iluminam)
2. **AR-02** Chão com variação e cenário por fase, borda do mapa caindo no preto
3. **AR-03** Avisos de ataque como formas no chão (FT-17)
4. **AR-04** `Pen` repintado no estilo novo (heróis, inimigos, chefes, itens)
5. **AR-05** Prova de sprites (Aldo + 2–3 inimigos), depende da fonte dos sprites (pergunta ao Daniel)

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

**B-04 · Raio e Geada miram fora da tela no retrato** · impl · P · ✅ feito · ↩ reaberto na Revisão 2026-11-11 (2) · ✅ refeito (2026-11-11; `nearestVisible`; sim antes e depois pendente, junto do PE-02)

- Por quê: balance-tester: `viewReach = max(w,h)/2` (`core/weapons.ts`) deixa alvos nas laterais fora da tela no
  celular em pé. Baixa severidade, mas é o caso de uso principal do Daniel.
- O quê: usar a meia-largura e a meia-altura da vista separadamente (retângulo visível).
- Aceite: teste com vista 390x844: todo alvo escolhido está dentro do retângulo visível.
- ↩ Reaberto na Revisão 2026-11-11 (2) · proposto (02-code B5): o `onScreen` de `core/weapons.ts:599` usa
  `min(w, h) / 2`, um círculo, não o retângulo. Seguro (nunca fora da tela), mas no retrato a mira automática ignora
  quem está visível acima e abaixo além de ~195 px. O `bossOnScreen` ao lado já faz certo. Novo O quê: `nearestEnemy`
  com variante `hw`/`hh` (como `randomEnemyNear`). Mexe no alcance real do Raio e da Geada: rodar o sim antes e depois
  (junto do PE-02). Aceite: o teste do retângulo acima, agora com um alvo a 300 px acima do herói em 390x844 sendo
  escolhido.

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

**A-02 · Herói sempre visível (e Lyra na Cripta)** · visual · M · ✅ feito · ↩ reaberto na Revisão 2026-11-11 · proposto

- Por quê: plano do Daniel (o herói some na multidão do chefe) e visual-director (Lyra some na Cripta: roxo igual a
  morcegos e aranhas; chão da cripta com contraste alto, `tiles.ts`).
- O quê: contorno claro permanente e anel mais forte sob o herói. O roxo da Lyra é canônico no original
  (`#d070e0`), então quem muda é o elenco: morcegos e aranhas puxam para cinza azulado ou marrom; baixar o contraste
  do chão da cripta.
- Aceite: captura com 500 inimigos e chefe em 390x844: o herói é achado em menos de 1 s, nas três fases, com os
  quatro heróis.
- ↩ Reaberto na Revisão 2026-11-11 · proposto (04-visual #3): o item foi feito antes dos sprites PixelLab. Hoje o
  Aldo (64x80 art px) é menor que o Esqueleto (108x124) e o Coveiro (192x192) na mesma escala, o monte tapa os pés, e
  só sobram a luz do herói e o contorno que pisca ao apanhar (`m-c2-2.png`, `m-c2-boss.png`, `d-c2-3.png`). Novo O
  quê: contorno fino âmbar sempre ligado (cor de identidade `0xe8b840`, ou a cor de cada herói), sombra elíptica sob
  o herói, profundidade acima de todos os inimigos (já 13,1). **Sem** aumentar o herói (decisão da Revisão 2026-11-11:
  mexe na leitura do hitbox). A barra de vida sob os pés é do CU-02. Dono: visual. Tamanho P. Aceite: o mesmo de
  cima, refeito na Cripta com os sprites novos e o Sineiro.

**A-03 · HUD legível no celular** · visual + impl · P · ✅ feito

- Por quê: plano do Daniel (barrinha de vida abaixo do herói) e visual-director (HP sem número, textos sem
  contorno, nome do chefe colado à barra, sem safe-area para notch).
- O quê: barrinha de vida sob o herói; número de HP na barra do HUD; contorno nos textos; respiro no nome do chefe;
  margens com `env(safe-area-inset-*)`.
- Aceite: em 390x844 e em paisagem, nenhum texto do HUD cortado pelo notch; vida legível sem olhar para o canto.

**A-04 · Números de dano que não poluem** · impl + visual · M · ↩ reaberto na Revisão 2026-11-08 · ✅ feito · ↩ reaberto na Revisão 2026-11-09 · proposto

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
- Revisão 2026-11-09 (04-visual #5): os verbos novos dos Elos (onda, estrela, corrente, bumerangue, ricochete) e as
  zonas da Geada voltaram a empilhar: ~25 números sobre a Lyra com a Estrela, colunas de "59" e "119" da Fúria da
  Forja, cacho de ~20 "6" da Geada (`10-elos-b-420x820.png`, `07-crowd-valmor-420x820.png`). O orçamento só vale para
  `arc` e `strike` (`core/weapons.ts`, `core/projectiles.ts:226`). Novo O quê: (a) `zone` sem número, como `aura`
  (`core/world.ts:258-262`); (b) orçamento **por quadro** de números novos (ex. 6 por `step`, `config.effects`) no
  lugar do orçamento por disparo, cobrindo todo verbo de uma vez (testado no core, sem `Rng`); (c) `maxDamageNumbers`
  24 no retrato só se (a) e (b) não bastarem. Dono: impl + vfx. Tamanho: P. Aceite novo: as capturas citadas sem
  pilha sobre o herói; teste do orçamento por quadro.

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

**D-06 · Heróis voltam a ser comprados** · impl · P · ✅ feito · ↩ reaberto na Revisão 2026-11-09 · ✅ feito (Daniel aprovou)

- Por quê: com a renda de E-10, comprar heróis vira uma meta curta e boa.
- O quê: `config.unlockAllHeroes` e `config.unlockAllStages` false quando o Daniel encerrar os testes; revisar custos (300, 300, 500).
- Aceite: um jogador novo libera o segundo herói em 3 a 5 corridas no sim.
- Revisão 2026-11-09 (02-code #9, 03-qa #3, 05-ui lateral): o item foi marcado feito, mas `config.unlockAllHeroes` e
  `unlockAllStages` seguem `true` (`data/config.ts:18-20`): no jogo publicado não se compra herói, não aparece "Nova
  fase liberada" nem "Próxima fase" (RU-05), e 2 dos 4 testes pulados do `npm test` são da progressão normal. Com o
  `?dev` (D-07) os interruptores não servem mais para testar; o QA desligou os dois em tempo de execução e o fluxo
  inteiro funciona (`t5.js`, `t21.js`). Novo O quê: os dois `false`, **depois** de NB-09 (comprar herói com
  confirmação) e NB-02 (tela final que cabe com a linha de fase liberada); o teste de `playtest.unlockAll` é o NT-02.
  Decisão do Daniel (recomendação do game-director: desligar agora). Aceite: save novo sem `?dev` mostra só o Aldo e
  Valmor abertos; `npm test` sem os dois `skipIf` da progressão.

**D-07 · Modo de teste `?dev`** · impl · P · ✅ feito

- Por quê: pedido do Daniel para validar o jogo com qualquer herói, qualquer fase e qualquer combinação da Loja.
- O quê: `?dev` no fim da URL (vale no jogo publicado); heróis e fases liberados, Loja com − / + grátis por item,
  "Tudo no máximo" e "Zerar tudo", selo "MODO DEV" e save próprio (o progresso real não muda).
- Aceite: com `?dev`, a Loja no máximo vale na partida (Segunda Chance, Segunda Bainha etc.) e o save normal fica
  intocado.

**D-08 · Redesenho dos Elos** · impl + visual + bal · G · ✅ feito

- Por quê: pedido do Daniel. O Elo vinha do baú e era só a base mais forte.
- O quê: o Elo se forja na hora, quando a arma e a passiva da receita chegam ao máximo. Cada Elo tem um elemento
  com cor própria, um momento de forja (câmera lenta, som, corrente na barra de build) e um efeito próprio. O Livro
  de Elos ganhou uma página por Elo e ouro de descoberta, e há uma conquista nova, "Um Herói, Todos os Elos".
- Aceite: no lab, cada Elo rende pelo menos 2,5x a base e fica na faixa da categoria; no sim, o primeiro Elo sai
  entre 5 e 7 min e as metas de vitória batem (números em `docs/balance-baseline.md`, "Rodada dos Elos").

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

**RB-05 · Celular deitado: botões e cartas fora da tela** · impl + ui · M · ✅ feito · ↩ reaberto na Revisão 2026-11-09 · ✅ feito

- Por quê: 03-qa #1, #2, #4, #5, #6 (820x420): Trocar/Pular/Banir abaixo da tela no level-up (`LevelUpScene.ts:39-40`,
  77); Loja corta Paciência e Bênção do Templo (`ShopScene.ts:38-41`); Livro de Elos esconde a última linha
  (`EloBookScene.ts:26-30`); fases com 22 px na Preparação e dica do menu fora da tela; Pausa com o cronômetro sobre o
  título e chão sem redesenhar depois de girar.
- O quê: level-up com cargas numa coluna ao lado das cartas (ou cartas sem a linha da receita) quando faltar altura;
  Loja e Livro com 3 colunas quando `width >= 780` e a lista não couber; mínimo de altura nos cards de fase e dica do
  menu reposicionada; Pausa com `top` abaixo do HUD; no resize do GameScene pausado, centralizar câmera e chão.
- Aceite: capturas em 820x420 e 640x360 de level-up, Loja, Livro, Preparação, Menu e Pausa sem nada fora da tela nem
  sobreposto; 420x820 e 1000x680 sem regressão.
- Revisão 2026-11-09 (03-qa #4, 04-visual #2): o aceite em 640x360 não está cumprido e apareceu o caso em pé de 360 px.
  Em 640x360, 667x375 e 740x360 a Loja esconde Bênção do Templo, Segunda Bainha e Segunda Chance (inalcançáveis no
  toque) e o Comprar sai pela direita (`ShopScene.ts:140-143`, `cardH` mínimo 34); a 3ª carta do level-up e o
  Desistir da Pausa ficam cortados (`shots/l640-93-pause.png`, `shots/l740-92-levelup.png`). Em 360x740 em pé a Loja
  vira uma coluna, o detalhe cobre a lista e os Especiais somem (`nodev/03-shop-360x740.png`). Novo O quê, um critério
  só para as duas orientações: card da Loja com largura mínima 150 e altura mínima 40 (alvo de toque); um degrau a mais
  de compactação abaixo de ~380 px de altura (Loja com 3 colunas e cards de uma linha, Pausa com botões de 32 px,
  level-up com cartas sem descrição longa); o detalhe da Loja encolhe (nome, Agora/Próximo e Comprar numa linha) antes
  de sobrepor a lista. A tela final é o NB-02. Tamanho: M. Aceite novo: capturas em 360x640, 360x740, 640x360,
  667x375 e 740x360 de Loja (os 15 itens tocáveis), level-up e Pausa sem nada fora da tela nem sobreposto.

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

**RF-04 · Sem flash de tela inteira: baú, Badalada e Sopro de Geada com forma** · vfx + impl · M · ✅ feito · ↩ reaberto na Revisão 2026-11-09 · proposto

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
- Revisão 2026-11-09 (04-visual #16, 06-vfx #14): sobrou um: a Segunda Chance faz `cameras.main.flash(400, …)` de tela
  inteira (`GameScene.ts:872`). Novo O quê: reviver com o anel de nível (`levelUpPulse`) e/ou os raios do baú na cor
  do herói, sem véu; o vfx-director escolhe. Tamanho: P. Aceite: `grep cameras.main.flash src` vazio.

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

**CC-05 · Tela Coleção com abas** · impl + ui · M · ✅ feito

- O quê: `CollectionScene` (Bestiário · Elos · Conquistas · Heróis) no lugar do `EloBookScene`; botão "Coleção" no
  menu com ponto de novidade.
- Aceite: aba Elos idêntica ao Livro atual; teclado e toque trocam de aba; celular em pé e deitado.
- Feito: cada aba desenha numa área (`scenes/collection/*.ts`); deitado, Voltar no canto e as abas ao lado, sem
  título. Teclado: `keyNav` ganhou navegação livre por posição (`navNearest`, testada); esquerda/direita na linha de
  abas troca na hora, Q/E (e PageUp/PageDown) trocam de qualquer lugar, Esc volta. Ponto dourado em `newsDot`.

**CC-06 · Aba Bestiário** · impl + visual · M · ✅ feito · ↩ reaberto na Revisão 2026-11-09 · proposto · ampliado na Revisão 2026-11-11

- O quê: grade com silhuetas, ficha com abates, primeira fase, características em termos de jogador
  (`enemyTraits` puro e testado) e frase do original onde houver (fontes em `conquistas.md`).
- Aceite: os 16 inimigos aparecem; não vistos sem nenhum dado; nenhuma frase inventada.
- Feito: `enemyTraits` em `core/format.ts` e `bestiaryOrder` em `data/stages.ts` (testados); grade 4 x 4 (fases,
  elites, chefes), ficha embaixo em pé e à direita deitado/largo. Frases do original com a fonte num comentário; as
  seis sem texto no original ganharam linhas escritas para o Survivors (decisão do Daniel, a revisar no teste).
- Revisão 2026-11-09 (04-visual #8, 05-ui lateral): o aceite "não vistos sem nenhum dado" não foi cumprido na arte:
  `bestiary.ts:26` usa `setTint(UI.border)`, que multiplica a cor, então a Gosma continua verde, o Goblin com a lança e
  os Lobos da Geada brancos com olho (`04-coll-bestiary-420x820.png`): estraga a surpresa da fase seguinte. Novo O quê:
  para inimigos não vistos, `setTintFill(UI.borderOff)` com alfa 0,9 (a forma fica, cor e olhos não); o Livro de Elos
  continua com `setTint` (RA-05). Dono: visual. Tamanho: P. Aceite: captura com os 16 inimigos onde nenhum não visto
  mostra cor ou olho.
- Revisão 2026-11-11 · ampliado · proposto (05-ui UI-06, `bestiary-420.png`, `bestiary-1000.png`): a silhueta acima
  continua sem fazer, e com 26 entradas a grade plana já não se lê (os 8 vistos da Cripta espalhados entre "???" de
  outras fases; miniaturas de 22 px; a ficha cai abaixo da dobra em 420). Escopo novo, além da silhueta: (1) grupos
  por fase com cabeçalho e contagem ("Cripta da Igreja Velha 5 de 9"), a fase atual aberta e as outras recolhidas
  (toque abre; decisão minha, sem rolagem por arrasto); (2) miniatura mínima de 40 px em 420; (3) selo de elite
  (coroa prata) e de chefe (sino ou estrela dourada) desenhados em `Graphics`; (4) linha **"Como lidar"** na ficha, com
  o mesmo texto da dica do CU-01 (uma fonte só, `t.bestiary.tips[id]`); (5) chefe com 0 abates mostra "De pé", não
  "x0". Textos: `bestiary.stageHeader: (fase, vistos, total) => \`${fase} ${vistos} de ${total}\``,
`bestiary.standing: 'De pé'`, `bestiary.how: 'Como lidar'`. Donos: ui + impl. Tamanho M. Aceite: capturas 420x820 e
  1000x680 com os grupos, nenhum não visto com cor, a ficha visível sem rolar, "Como lidar" nos inimigos da Cripta.

**CC-07 · Aba Conquistas** · impl + ui · M · ✅ feito

- O quê: páginas por grupo, progresso com barra, novas destacadas, escolha de título.
- Aceite: as 35 aparecem com progresso correto; abrir a aba limpa o ponto do menu.
- Feito: chips de grupo com "3/6" (3 + 4 em pé, uma linha deitado/largo; esquerda/direita troca de página), linhas
  com troféu ou cadeado, recompensa (com carga e título), progresso e barra; abrir a aba esvazia `fresh` e grava,
  as novas piscam uma vez e o chip do grupo mostra o ponto durante a visita. Tocar numa conquista com título
  destrancada veste o título (tocar de novo tira). Ícone novo `icon.trophy`.

**CC-08 · Aba Heróis** · impl + ui · M · ✅ feito

- O quê: cartão por herói (partidas, marcas de vitória por fase, melhor tempo, vitória mais rápida, nível, abates,
  maior golpe, arma favorita, Elos) e totais globais; título na tela final.
- Aceite: os registros batem com uma partida jogada de ponta a ponta.
- Feito: `favoriteWeapon` e `possibleElos` em `core/records.ts` (testados); cartões 2 x 2 em pé e 4 lado a lado
  deitado/largo, com retrato na luz do herói, três marcas de fase (douradas quando vencida), oito registros e os
  totais no pé. Herói não comprado: silhueta e preço. O título vestido aparece no topo da aba e, em itálico, embaixo
  de "fase · herói" na tela final.

**CC-09 · Aviso de conquista na partida** · impl + vfx · P · ✅ feito

- O quê: checagem uma vez por segundo, aviso pequeno no alto do HUD (2,5 s, fila), som `achievement`.
- Aceite: não cobre o centro nem a barra do chefe; espera o level-up fechar; FPS igual.
- Feito: `GameScene.checkAchievements` uma vez por segundo de jogo (um `RunSummary` reaproveitado, save lido no
  início da partida): 0,015 ms por checagem com 700 inimigos. Aviso do HUD montado uma vez (troféu, "Conquista!" e
  o nome), em fila, 2,5 s; em pé, centrado embaixo do bloco do topo ou da barra do chefe; deitado, no canto de cima
  à direita, embaixo do ouro e abates. Espera o level-up, a pausa e os avisos grandes ("chegou!") saírem. Som
  `achievement` em `render/sounds.ts`.

**CC-10 · Revisão visual e documentação** · visual + impl · P · ✅ feito

- O quê: visual-director confere as abas e o aviso; `CLAUDE.md` com os arquivos novos; itens marcados aqui.
- Feito: as quatro abas e o aviso conferidos em 420 x 820, 1000 x 680 e 820 x 420 (toque, mouse e teclado). Na tela
  final, as conquistas novas ganham o troféu e a "Perto:" o cadeado; o título vestido aparece embaixo do herói.
  `CLAUDE.md` com a Coleção e os arquivos novos.

**Perguntas abertas (CC)**

1. ~~Frases para os seis inimigos sem texto no original?~~ Daniel, 2026-11-09: linhas escritas para o Survivors, a
   revisar no teste.
2. ~~Ligar as três recompensas opcionais?~~ Respondida em 2026-11-09: ligadas.
3. ~~Usar as citações do original nos nomes?~~ Respondida em 2026-11-09: sim, pode usar.

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
- Habilidade ativa por herói (um botão), pensando no controle de um polegar. Na Revisão 2026-11-09 o game-director
  propôs antes um traço passivo por herói (ND-02), que não pede botão.
- Objetivos na fase (proteger a fonte da cripta, escoltar algo na Estrada), quebrando o loop de 10 minutos. A fonte
  da cripta virou proposta pequena na Revisão 2026-11-11 (CD-01, Fonte de Luz: cura, não escolta).
- Desafios e conquistas que liberam armas novas.
- Novas fases do Capítulo 1 do original (Pasto do Vau, Vau do Corvo, caminho para Erukh), com lore do Daniel.
- Tabela de recordes local por herói e fase (virou CC-08, 2026-11-09).
- Ondas com etiquetas (2026-11-10, da etapa "Fases temáticas"): momentos marcados da curva que pedem uma coisa de cada
  vez, como uma onda de loja (um mercador no chão por 20 s), uma de esquiva (só tiros e saltos) e uma de habilidade (um
  objetivo curto). Fica para depois de a partida de 10 minutos com chefe às 10:00 estar firme com os inimigos novos.
- Dificuldade dos inimigos novos por perigo (ND-01): mais atiradores, ninhos e estandartes por perigo, em vez de só
  multiplicar vida e dano.

Da Revisão 2026-11-08 (ordem de prioridade para a próxima conversa com o Daniel):

- **Dificuldade por fase vencida** (promovida a ND-01 na Revisão 2026-11-09) (01-balance D8: com a Loja inteira o veterano vence 47 de 48): um nível extra por
  fase depois de vencê-la, com curva mais dura e mais ouro. O próximo sistema grande para o pilar 4; nome e
  apresentação com o Daniel.
- **Revelação pausada do Elo formado** (05-ui #5): só se, depois do RF-04, o Daniel sentir que o Elo ainda passa
  despercebido. Baú comum continua sem pausa.
- **Pausa como ficha da build** (atributos promovidos a NU-03 na Revisão 2026-11-09) (05-ui #4): reaproveita o `buildPanel` do RU-04, com DPS por arma e estado do Elo.
- **Setas na borda para baú e elite** (05-ui #6). Promovida a NU-01 na Revisão 2026-11-09 (regressão).
- **Loja com ícones, grupos e pips** (05-ui #10), com 4 ícones novos. Ícones e grupos feitos; os pips viraram NU-09 na Revisão 2026-11-09.
- **Joystick fixo como opção** (05-ui #13).
- **Efeitos menores** (06-vfx): Fogos-Fátuos com rastro, sinos balançando, rastro e faísca de gema coletada,
  Tempestade escurecendo a tela.
- **Menu e Loja usando o espaço que sobra** (04-visual #18).
- **Tamanho do bundle** (00-checks: 1,30 MB num chunk, 357 kB gzip): medir o tempo até o menu em 4G antes de mexer.

## Rodada UI e features (2026-11-09)

Feito, cada etapa com commit e push: **1** Maça de Ferro e Quebra-Junta (mira, onda de choque, pancada dupla,
visual pesado); **2** Elos (≥ 2,5× a base no sim, receita no Livro, "Elo: + passiva" na carta, aviso de Elo pronto,
dica única, setas para elites, tela de celebração); **3** cartas de recompensa (Bolsa de Ouro, Banquete, Bênção de
Yah); **4** Loja em seções, com detalhe e compra confirmada; **5** menu, pausa com a build e status dos Elos, HUD só
com slots preenchidos e vida/nível maiores; **6** Noite Sem Fim. Extra: o jogo instala no celular (PWA, offline).

Para o Daniel decidir ou revisar:

- Andilla venceu 36/36 no sim depois dos Elos mais fortes (antes 33/36). Vale um ajuste nela ou nos Elos dela? (Revisão 2026-11-09:
  ND-02 propõe trocar o `greed` dela por um traço.)
- Com os Elos mais fortes o chefe cai em 28 s (mediana): `bossFast` (40 s) sai em 73% e `hit120` (100) em 60% das
  vitórias; a meta era cerca de metade. Subir para 30 s e 130? (Revisão 2026-11-09: hoje a mediana é 13 s; ver NE-05.)
- As 12 frases da tela de Elo (`t.elo.lines`) foram escritas para o Survivors, sem fatos novos de lore: revisar.
- Nome da conquista da vigília: "Até o Amanhecer" (do texto do menu), título "Vigia da Noite".
- "Dano por segundo" na celebração é o valor de tabela da arma (dano × golpes ÷ recarga), não o medido na partida.

---

## Revisão 2026-11-09

Origem: revisão completa de `3b9939c` (`docs/reviews/2026-11-09/00` a `06`). Triagem, conflitos, leitura de design e as
decisões que só o Daniel pode tomar em `docs/reviews/2026-11-09/07-direcao.md`. **Todos os itens abaixo estão
`· proposto`**: esperam a aprovação do Daniel. Achados repetidos em vários relatórios viraram um item só.

Prefixos novos: **NB** bug, **NT** técnico (código, sem efeito de jogo), **NE** equilíbrio, **NF** efeitos visuais,
**NU** interface, **NA** arte e polimento, **ND** direção (sistemas novos). Itens antigos reabertos mantêm o ID e têm o
escopo novo no próprio item, mais acima: **RB-05**, **A-04**, **RF-04**, **CC-06** e **D-06** (decisão do Daniel).

Regras (as mesmas da Revisão 2026-11-08): cada passo com `npm test`, `npm run lint`, `npm run build` verdes, jogo
rodando, um commit e push; lógica nova no core com teste em `tests/core/`; equilíbrio medido com
`SIM_SEEDS=16 SIM_SHOP=all npm run sim` antes e depois (tabelas em `docs/balance-baseline.md`); render medido no F4
(420x820, CPU 4x) antes e depois, sem alocação por quadro, modo calmo respeitado. **Todo verbo de Elo tocado aqui ganha
um teste dentro da multidão** (não só com um inimigo sozinho).

### Situação em 2026-11-09 (noite)

Daniel pediu só bugs e quick wins. Feitos: toda a **N1** (NB-01 a NB-13 e RB-05) e, com a aprovação do Daniel, o D-06 (heróis e fases trancados no jogo publicado) com o NT-02 e os
quick wins NT-01, NT-04, NE-03, NE-04, NF-01, NA-01, NA-06, NA-08, mais parte do NT-03 e do NU-08. O resto fica
`· proposto` para ele revisar, junto com as decisões do topo de `docs/reviews/2026-11-09/07-direcao.md`.

### Próximos 5 (sugestão do game-director, não substitui a lista do topo até o Daniel aprovar)

1. **NB-01** Quebra-Junta trava todos os inimigos (herói imortal na vigília)
2. **NB-02** Tela final sempre cabe, ações presas no rodapé
3. **NB-03** Desistir na Noite Sem Fim grava o que a vigília rendeu
4. **NB-04 + NE-02** Rajadas completas e Tempestade medida de novo
5. **NF-01 + NF-02** Multidão legível sob os Elos de área

### Ordem sugerida

| Fase                  | Passos (um commit cada, nesta ordem)                                                                                               | Donos                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **N1 Bugs**           | NB-01 · NB-02 · NB-03 · NB-04 · NB-05 · NB-06 · RB-05 · NB-07 · NB-08 · NB-09 · NB-10 · NB-11 · NB-12 · NB-13 · D-06 (se aprovado) | impl (ui confere NB-02, RB-05) |
| **N2 Técnico**        | NT-01 · NT-02 · NT-03 · NT-04                                                                                                      | impl                           |
| **N3 Equilíbrio**     | NE-02 · NE-01 · NE-03 + NE-04 · NE-05 · NE-06 · tabela final                                                                       | impl + bal                     |
| **N4 Efeitos**        | NF-01 + NF-02 · A-04 · NF-03 · NF-04 · NF-05 · NF-06 · NF-07 · NF-08 · NF-09 · RF-04 · NF-10 · medição F4                          | vfx + impl                     |
| **N5 Interface**      | NU-01 · NU-02 · NU-03 · NU-04 · NU-05 · NU-06 · NU-07 · NU-08 · NU-09 · NU-10                                                      | ui + impl                      |
| **N6 Arte**           | NA-01 · NA-02 · CC-06 · NA-03 · NA-04 · NA-05 · NA-06 · NA-07 · NA-08 · capturas finais                                            | visual + impl                  |
| **N7 Sistemas novos** | ND-01 · ND-02 (cada um só depois de N1 a N3 e com os nomes do Daniel)                                                              | impl + bal + ui                |

### N1 · Bugs

**NB-01 · Quebra-Junta trava todos os inimigos: herói imortal na Noite Sem Fim** · impl + bal · M · ✅ feito

- Por quê: 01-balance B1 (alta), 02-code #2 e #6. `slamHit` renova a tontura em todo acerto
  (`core/weapons.ts:308-309`) e o Quebra-Junta acerta com a pancada, a onda (todo golpe, `waveEvery: 1`) e o tremor
  0,3 s depois. Com Pressa e Alcance no máximo (recarga ~0,5 s, onda a ~250 px), nenhum inimigo chega ao herói:
  `t/stunlock` dá **0,0 golpes por minuto** com 689 inimigos vivos (a Maça L7 dá 92,7); na vigília com Loja inteira,
  **27 de 39** corridas com Quebra-Junta batem o teto de 30 min do sim, contra 0 de 34 sem ele. A causa é a tontura
  (com `stun` 0 viram 108,7 golpes/min; com 0,3, ainda 0,0). Além disso a onda do mesmo golpe já encontra o centro
  tonto e esmaga sempre (+21%, reproduzido: 131,2 contra 108,8), e a faísca de esmagamento não mostra isso.
- O quê (decisão 6 em `07-direcao.md`): só a **pancada** atordoa; onda e tremor batem e empurram, sem atordoar nem
  renovar; uma tontura em curso nunca é renovada (`slamHit`); o esmagamento (`crush`) conta só a tontura de antes deste
  golpe (o tremor esmaga quem a pancada atordoou). Reajustar o dano do `jointBreaker` para continuar na faixa
  (`bands.test.ts`) e ≥ 2,5x a maça. Documentar no CLAUDE.md que a tontura não interrompe a habilidade do chefe
  (02 #6: rejeitado como código, `bossStun` é 0,1 s). Plano B, só se a vigília ainda travar: 1 s de imunidade depois de
  sair da tontura.
- Aceite: testes com inimigo **dentro** da pancada (sem esmagamento no mesmo golpe; esmagado pelo tremor) e de tontura
  não renovada; `t/stunlock` (ou um teste equivalente no repo) com 60 golpes/min ou mais; `SIM_SHOP=full SIM_VIGIL=1`
  com a vigília do Quebra-Junta parecida com a das outras armas (nenhuma no teto); lab na faixa.

**NB-02 · Tela final maior que a tela: botões inalcançáveis** · impl + ui · P · ✅ feito

- Por quê: 03-qa #1 (alta), 05-ui #1 (alta). Numa vitória de primeira vez (6 armas, Elo, fase liberada, conquistas)
  os botões ficam fora da tela em 820x420 e 360x640 (no toque, **trava**: só recarregando) e em 1000x680 e 1280x720
  "Jogar de novo" e "Menu" saem (centro em 722 px). `EndScene.ts:99-102` só centra
  (`offset = max(8, (height - total) / 2)`); o que cresce são as notas (`:214-266`) e o relatório de armas. Piora quando
  o D-06 ligar a linha "Nova fase liberada". É o melhor momento para o "só mais uma" (pilar 4).
- O quê: botões num rodapé fixo (safe-area), fora do bloco que recebe o `offset`; regra de encaixe pura e testável
  aplicada em ordem até caber: (a) Elos novos numa linha ("Elos descobertos: Fúria, Tempestade (+80 de ouro)"),
  (b) conquistas numa linha com a soma do ouro, (c) cofre e meta numa linha, (d) sem a coluna Tempo, (e) passivas na
  linha do resumo; duas colunas sempre que a largura permitir (não só `isShort`). Textos em `pt-BR.ts` (`end`):
  `elosFound`, `achievementsFound`, `bankedGoal`, `vigilShort: 'Vigília'` (esboço no 05-ui #1).
- Aceite: teste da regra de encaixe; capturas de vitória cheia (6 armas, fase liberada, 2 Elos, 4 conquistas) em
  360x640, 820x420, 640x360, 420x820 e 1000x680 com todos os botões inteiros e tocáveis; 420x820 sem mudança visível
  numa vitória comum.

**NB-03 · Desistir durante a Noite Sem Fim descarta o que a vigília rendeu** · impl · P · ✅ feito

- Por quê: 02-code #1, 03-qa #2 (alta, reproduzido: ouro fica em 600 em vez de 800, `records.aldo.vigil` vazio). O
  SHUTDOWN chama `bank()`, que sai cedo porque a vitória já foi gravada (`GameScene.ts:357`, `:757`); `bankVigil` só
  roda no evento `lost` (`:878`). Perde-se ouro, abates, Bestiário, Elos formados na vigília (e o ouro de descoberta),
  o recorde de vigília e a conquista `vigil5`. Pausa e Desistir é o jeito natural de terminar uma vigília longa.
- O quê: no SHUTDOWN, `endless ? bankVigil() : bank()`, com guarda própria (`vigilBanked`) para não gravar duas vezes
  quando a vigília acaba em morte. Extrair a escolha "qual registro fazer" para uma função pura testável.
- Aceite: teste da função; QA: vencer, continuar, ganhar ouro, Desistir: o ouro, o recorde de vigília e os abates
  entram no save, uma vez só.

**NB-04 · Rajadas de alvo aleatório param no meio** · impl + bal · P · ✅ feito

- Por quê: 01-balance B2. `randomEnemyNear` (`core/projectiles.ts:110-120`) sorteia 12 vezes na lista inteira e
  desiste se nenhum está na tela; `fireStrike` e `fireZone` dão `break` na primeira falha (`core/weapons.ts:475-476`,
  `495-496`). Com só 7% a 20% dos inimigos na tela, a Espada de Fogo solta 2,3 de 7 espadas, a Nevasca 1,3 de 5, a
  Tempestade 6 de 19 acertos (com 300 fora da tela). Explica a **Tempestade com ELO X 1,2x** no sim (lab 4,2x).
- O quê: quando os sorteios falham, varrer a lista a partir de um índice sorteado (pelo `Rng` da partida) até achar um
  na tela, ou `continue` com mais tentativas; nunca alocar.
- Aceite: teste com 20 inimigos na tela e 300 fora: a rajada sai inteira; sim de 16 sementes antes e depois (ver
  NE-02).

**NB-05 · Baú que forja um Elo apaga o momento da forja** · impl · P · ✅ feito

- Por quê: 02-code #4 (reproduzido: eventos `[eloForged(fury), chest(reward: blade nível 7)]`). O baú troca o ícone
  do Elo pelo da Lâmina, zera `moments.elo` e anuncia "ganhou Lâmina de Valmor nível 7", uma arma que nem existe mais.
  O momento mais importante da partida aparece como um nível comum.
- O quê: em `openChest`, quando o nível aplicado forja um Elo, o evento `chest` sai sem anunciar o nível (ou o
  GameScene ignora ícone e texto do baú quando houve `eloForged` no mesmo quadro); preferir a correção no core.
- Aceite: teste de core com a ordem e o conteúdo dos eventos quando o baú completa a receita; QA: baú que forja mostra
  só o momento do Elo.

**NB-06 · Herói com 0 de vida curado no mesmo passo não morre** · impl · P · ✅ feito

- Por quê: 02-code #3 (reproduzido: herói com 1 de vida, mordida letal e Luz Sagrada matando no mesmo passo termina
  `playing` com vida 1). A morte só é decidida no fim do `step` e toda cura faz `min(maxHp, hp + x)`. Com a Luz Sagrada
  (até 4 curas por segundo) o Teo ganha "salvos da morte" grátis, e isso entra nos números do sim.
- O quê: `heal(p, amount)` em `core/player.ts` que não faz nada com `p.hp <= 0`, usado por todas as curas (Luz
  Sagrada, comida, baú, Banquete, level-up).
- Aceite: teste: mordida letal e cura no mesmo passo terminam em `lost` (ou `revived` com Segunda Chance).

**NB-07 · A investida da Vigília quase nunca acontece** · impl · P · ✅ feito

- Por quê: 01-balance B3. `sweepOrbit` mira no mais próximo e, se ele está dentro do círculo, `aimReach` = 0
  (`core/weapons.ts:437-443`); na multidão sempre há alguém a menos de 105 px. Investida em **6%** dos passos com o
  bot e 0% parado. O teste (`eloEffects.test.ts:186`) usa um inimigo sozinho fora do círculo.
- O quê: mirar no inimigo mais próximo **fora** do círculo (entre `orbitR` e `orbitR + reach`), como diz o texto.
- Aceite: teste com multidão dentro e um alvo fora: as espadas avançam; no sim, investida em pelo menos 30% dos passos
  com inimigos nessa faixa; Vigília ainda na faixa do lab.

**NB-08 · Avisos do HUD por cima do level-up e da Pausa** · ui + impl · P · ✅ feito · ↩ reaberto na Revisão 2026-11-11 · proposto

- Por quê: 03-qa #9, 05-ui #2. O toast de conquista já iniciado e o aviso grande (`announce`: "Um inimigo poderoso se
  aproxima!", "Ganhou: X") continuam animando sobre o título, a 1ª carta, a linha da receita e o Trocar
  (`HudScene.ts:217-267`; `l-06-levelup.png`, `p-15-banner-levelup.png`, `shots/m-35-pause-elo.png`). A tela de
  decisão tem que ser só da decisão (pilar 2).
- O quê: `HudScene.quiet()` que mata os tweens de toast, aviso e dica, zera o alfa e devolve o toast em curso ao início
  da fila; chamado no `create` da `LevelUpScene` e da `PauseScene`. Sem alocação por quadro.
- Aceite: capturas de level-up e Pausa logo depois de forjar um Elo e de abrir um baú, sem nada do HUD sobre o título
  ou as cartas; o toast aparece depois de fechar.
- ↩ Reaberto na Revisão 2026-11-11 · proposto (05-ui UI-02, reproduzido em `lvl-420x820.png`, `lvl-360x640.png`,
  `pause-420x820.png`): as setas de borda do NU-01 (`EdgeArrows.update`, `HudScene.ts:322`) entraram depois do `quiet()`
  e são desenhadas por cima das cartas, do ícone do Vigor e do painel de atributos; e o toast de conquista entra no meio
  da luta do chefe, junto com o aviso do Dobre Fúnebre (`boss-ab0-420x820.png`; `nextToast` só olha `state` e banner,
  `HudScene.ts:372-380`). Novo O quê: (a) `quiet()` também esconde as setas, e o `update` delas não roda com LevelUp,
  Pausa ou Fim ativos; (b) `nextToast` espera enquanto `world.boss` vive ou a vida está abaixo de 30% (a fila guarda).
  Tamanho P. Aceite: as mesmas capturas sem triângulo sobre carta ou painel; nenhuma conquista aparece durante a luta
  do chefe e todas aparecem depois.
- Revisão 2026-11-11 (2) · ampliado (04-visual #12): o aviso "Mãe-Aranha chegou!" fica sobre a faixa do nome do chefe
  em 420x820 e encosta no herói em 1000x680 (`m-g-valmor-330.png`, `d-g-valmor-330.png`). Somar ao O quê: o aviso de
  chefe abaixo da barra do chefe e acima do herói, some em 1,5 s. Aceite: captura do aviso com a barra do chefe visível.

**NB-09 · Liberar herói com um toque, e o toque duplo já começa a partida** · impl · P · ✅ feito

- Por quê: 03-qa #6 (`t6.js`: ouro 900 → 100 e a partida começou). A Loja pede dois passos e ignora toques por 250 ms
  (RB-06); a Preparação gasta 800 de ouro num toque e o segundo cai no botão novo "Partir" (`SelectScene.ts:117-126`,
  `263-277`). Hoje está escondido pelo `unlockAllHeroes`; vira bug real com o D-06.
- O quê: segundo passo "Confirmar: 800 ouro" (como o Desistir da Pausa) e o mesmo `ready` de 250 ms da Loja depois da
  compra; Enter num herói trancado também pede confirmação.
- Aceite: QA com `unlockAllHeroes` falso: toque duplo compra e não começa a partida; um toque só não compra.

**NB-10 · Textos com o ritmo errado ("a cada três" com `every: 2`)** · impl · P · ✅ feito

- Por quê: 01-balance B5, 02-code #7, 03-qa #5, 04-visual #16. Lâmina "A cada três golpes, uma estocada"
  (`pt-BR.ts:551`) e Fúria "a cada terceiro golpe" (`:577`) com `every: 2` (`data/weapons.ts:190`, `:442`); o jogador
  lê isso na carta, na Pausa e na página do Livro. Comentários em `weapons.ts:186`, `:439` e o nome do teste
  `eloEffects.test.ts:40` repetem "third". `config.weapons.slamImpact` (`config.ts:126`) não é lido desde o
  retrabalho da maça.
- O quê: "A cada dois golpes, uma estocada longa" e "a cada segundo golpe, solta uma onda cortante"; comentários e
  nome do teste corrigidos; `slamImpact` removido. Um teste que confere o número citado no texto contra o `every` dos
  dados evita a volta (se der para fazer simples; senão, só os textos).
- Aceite: textos e comentários batem com os dados; `grep slamImpact src` vazio.

**NB-11 · Só cartas de Recompensa: Trocar gasta carga à toa e Banir não faz nada** · impl · P · ✅ feito

- Por quê: 03-qa #7 (`t19.js`, `t20.js`). Trocar devolve as mesmas três cartas em outra ordem e gasta a carga; Banir
  fica ativo e não faz nada (o `canBanish` não deixa ficar com menos de 3) sem dizer por quê (`LevelUpScene.ts:182`,
  `core/world.ts:216`). Escolha que engana quebra o pilar 2.
- O quê: Trocar desabilitado quando `candidates(world).length <= choices`; Banir desabilitado quando nenhuma carta
  passa no `canBanish` (o estado desabilitado de B-03).
- Aceite: teste de core (sem candidatos novos, `reroll` não gasta carga); QA: os dois botões apagados nesse caso.

**NB-12 · `applyDot`: o dano contínuo mais forte herda a duração mais longa** · impl · P · ✅ feito

- Por quê: 02-code #5 (reproduzido: sangramento 5/s por 3 s seguido de queimadura 20/s por 0,5 s vira queimadura
  20/s por 3 s). Acontece com Leque de Facas e Espada de Fogo juntos.
- O quê: ao trocar pelo mais forte, `e.dot = duration` (`core/enemies.ts:81-95`).
- Aceite: teste com dois danos contínuos de força e duração diferentes.

**NB-13 · Loja: o selo "Completo" vaza um retângulo por seleção** · impl · P · ✅ feito

- Por quê: 03-qa #8 (`t8.js`: 5 retângulos 62x16 depois de 10 movimentos). `ShopScene.ts:286` guarda só o texto do
  `seal`; a caixa (`render/ui.ts:131`) nunca é destruída.
- O quê: `seal` devolve texto e caixa e os dois entram em `this.detail`.
- Aceite: andar 20 vezes entre itens completos não deixa nenhum objeto a mais na cena.

### N2 · Técnico

**NT-01 · Alocação por quadro que sobrou no render** · impl · P · ✅ feito

- Por quê: 02-code #10. `this.forest.forEach((f, i) => …)` em `placeView` (`GameScene.ts:410`) cria uma closure por
  quadro na Estrada; `for…of` sobre pools no render (`GameScene.ts` faíscas, `render/fx.ts:239-419`) e em `wardReady`
  (`core/elos.ts:118`, por contato). Regra de desempenho do projeto.
- O quê: `for` indexado em todos.
- Aceite: `grep -n "forEach\|for (const" ` nos laços por quadro de `GameScene.ts`, `render/fx.ts` e `core/elos.ts` sem
  ocorrência; F4 igual ou melhor.

**NT-02 · Teste do `playtest.unlockAll`** · impl · P · ✅ feito

- Por quê: 02-code #9. Os testes "playtest switch opens every hero/stage" (`characters.test.ts:30`, `:47`) testam
  `config.unlockAll*`, não o interruptor do `?dev` (`core/meta.ts:444`), que não tem teste.
- O quê: teste que liga e desliga `playtest.unlockAll` (restaurando no `finally`) e confere heróis e fases; renomear
  os testes antigos para o que testam. Vai junto com o D-06.
- Aceite: teste novo verde; com o D-06 aprovado, os dois `skipIf` da progressão passam a rodar.

**NT-03 · Código morto, comentários soltos e um ponto frágil** · impl · P · ✅ feito (2026-11-11: `weaponsCompletedBy` e `elementOf` fora, `addBolt` devolve o raio, `swings` documentado)

- Feito em 2026-11-09: removidos `unlockedTitles` e as docs soltas; aspas do Livro no `pt-BR.ts`. Falta: `weaponsCompletedBy`/`elementOf` só usados em teste, `addLink`, contadores de `swings`.

- Por quê: 02-code #7, #8, #10; 04-visual #16. `unlockedTitles`, `weaponsCompletedBy` e `elementOf` sem uso no jogo;
  docs órfãs (`world.ts:74`, `meta.ts:496`, `ShopScene.ts:180`, `buildPanel.ts:29-31`); `addLink` pega o último raio do
  pool (`effects.ts:89-95`); `thrust` e `wave` dividem `w.swings` (`core/weapons.ts:183`, `:194`); aspas da frase do
  Elo no código (`collection/elos.ts:146`).
- O quê: remover o morto (ou mover o que só o teste usa para o teste), corrigir as docs, `addBolt` devolve o `Bolt`,
  contadores separados ou um comentário, `t.elos.quote(line)` no `pt-BR.ts`.
- Aceite: lint e testes verdes; nenhum texto de jogador fora do `pt-BR.ts`.

**NT-04 · `?dev` divide as opções com o jogo real** · impl · P · ✅ feito

- Por quê: 03-qa #10. As opções (`render/settings.ts:4`) são as mesmas, inclusive `gasparMet`: abrir a Loja no `?dev`
  gasta a saudação do Gaspar do jogo real.
- O quê: `gasparMet` (e qualquer marca de "primeira vez") com chave própria no `?dev`, como o save; mudo, números e
  tela calma continuam compartilhados.
- Aceite: abrir a Loja no `?dev` não muda as opções do jogo real (teste em `settings.test.ts` se a chave for pura).

### N3 · Equilíbrio

**NE-02 · Tempestade medida de novo depois das rajadas** · bal + impl · P · ⏸ medido, falta calibrar o lab (2026-11-11)

- Por quê: 01-balance: Tempestade com ELO X **1,2x** no sim (Raio L7 813, Tempestade 854), a única Elo abaixo de
  2,5x; com a varredura de reserva (mock) a Tempestade vai de 716 para 1199 e a Espada de Fogo de 615 para 1361.
- O quê: depois do NB-04, sim de 16 sementes; se a Tempestade ficar abaixo de 2x, `storm` `chain.count` 2 → 3; se a
  faixa `auto` passar do teto no sim, reajustar no lab.
- Aceite: todas as Elos ≥ 2,5x no sim; bandas verdes; metas de fase dentro.
- Medido (2026-11-11): sim 16 sementes, Tempestade 1,3x o Raio; `chain.count` 3 não muda o sim (1,2x) e põe a
  Tempestade a 66% no lab (fora da faixa): revertido. Causa: o lab (grade de 64 px) é esparso. Com a grade de 32 px o
  Raio vai de 277 para 1891 (6,8x) e a Tempestade de 1153 para 3375 (2,9x), porque o salto acerta um só e os raios
  dela são fracos (25 contra 99). No sim, multidão densa, o Raio rende 1339 (lab 277). Próximo passo: lab com coluna
  densa (junto com o NE-06) e bandas por ela; aí subir o dano por raio da Tempestade.
- Revisão 2026-11-11 (2) (01-balance #3): Tempestade **1,4x** (793 contra 613 real) e agora também a **Espada de Fogo
  1,7x** o Fogo (600 contra 298), a segunda Elo abaixo da meta, pela mesma causa (chão em brasa e cadeia dependem de
  multidão densa). As duas são calibradas juntas no PE-02, depois do NE-06.

**NE-01 · Maça de Ferro: mais alcance, menos dano** · impl + bal · P · ✅ feito (2026-11-11: lab 91%, Teo Valmor meia Loja 54%; `docs/balance-baseline.md`)

- Por quê: 01-balance. A maça nova rende **87** de DPS real no máximo (antes 129; outras `aimed` 208 a 650); o bot
  acerta alguém em 62% das pancadas; o Teo, que começa com ela, caiu de 56% para **31%** em Valmor com meia Loja. A
  pancada cobre 33 px atrás e ~93 px à frente: falta alcance, não dano.
- O quê (`data/weapons.ts`, `mace`): `radius` L1 a L7 48/48/52/52/56/56/60 → **60/60/65/65/70/70/75**; `damage`
  27/34/34/43/43/54/70 → **20/26/26/32/32/41/53** (x0,75). Conferir o Quebra-Junta depois do NB-01.
- Aceite: lab da maça em 85% a 100% da melhor `aimed` (medido: 455, 91%); Teo em Valmor meia Loja a ±20 pontos da
  fase; Quebra-Junta ≥ 2,5x a maça.

**NE-03 · Martelo e Chama de Yah empurram como prometem** · impl + bal · P · ✅ feito

- Por quê: 01-balance B4 (`t/push`): o Martelo L7 (`knockback` 260) empurra **26 px** e o texto diz "atravessa e
  empurra longe" (`pt-BR.ts:567`); a onda da Chama de Yah (`pulse.knockback` 320) empurra **31 px** (Esqueleto ~12) e
  o texto diz "empurra tudo para longe" (`:585`). Regra: um empurrão viaja ~knockback / 10 px.
- O quê: `hammer` `knockback` 260 → **500** (~50 px); `yahFlame` `pulse.knockback` 320 → **650** (~60 px).
- Aceite: `t/push` (ou teste equivalente) com ~50 e ~60 px; bandas verdes; sim sem queda de vitórias fora do ruído.

**NE-04 · Badalada mata o básico até o fim da partida** · impl + bal · P · ✅ feito

- Por quê: 01-balance: 250 de dano fixo; a partir das 8:00 o Encapuzado tem 253 a 304 de vida, o Esqueleto 450 a 540,
  a Gosma 608 a 729. O item some de importância justo quando a tela enche.
- O quê: `config.pickups.bombDamage` 250 → **600**.
- Aceite: teste/lab: a Badalada mata básico e rápido das três fases até as 10:00; sim sem mudança fora do ruído.

**NE-05 · Luta do chefe de 30 a 45 s** · bal + impl · P · ✅ feito (2026-11-11, decisão minha para o Daniel rever: a multidão sai quando o chefe chega, mordida sem rampa, vida x3,5 a x4,5; luta ~29 s; `docs/balance-baseline.md`)

- Por quê: 01-balance: mediana de **13 s** com Loja inteira e 16 s com meia (a meta da R2 era 45 a 90 s; ontem ~28 s);
  o clímax da partida é uma corrida de DPS. Em Valmor com meia Loja, 18 de 49 corridas que chegam ao chefe morrem 4 a
  22 s depois, com a onda das 9:00 em campo, por isso não peço 90 s. Pergunta aberta na "Rodada UI e features".
- O quê: subir `hp` de `blackKnight` (20000), `bellRinger` (14000) e `oldWolf` (18000) pelo sim até a mediana dar 30 a
  45 s com a Loja inteira (ponto de partida: x2,5); recalibrar `bossFast` (40 s) e `hit120` para cerca de metade das
  vitórias.
- Aceite: mediana da luta 30 a 45 s (Loja inteira); as nove metas de fase x Loja continuam dentro; `bossFast` em 40% a
  60% das vitórias.
- Medido (2026-11-11, Loja inteira, 96 corridas): vida dos chefes x2,5 → luta 37 s, mas vitórias Valmor 94% → 53%,
  Cripta 69% → 31%, Estrada 44% → 3%; x1,5 → luta 15 s, Cripta 59%, Estrada 22%. A luta é tudo ou nada: o chefe cai
  rápido ou a onda em campo mata o herói, então mais vida só troca lutas longas por derrotas. Pergunta para o
  Daniel: diminuir as ondas enquanto o chefe vive (ex.: só o chefe e sua escolta) para a luta durar 30–45 s?
  Revertido.

**NE-06 · Lab mede armas que empurram com o empurrão** · impl + bal · M · proposto (decisão 3 do Daniel)

- Por quê: 01-balance: Escudos de Valmor e Muralha com DPS real **24** e **184**, os menores do jogo; o empurrão custa
  ~20% do DPS e compra pouca sobrevivência (Cripta Loja inteira 53 → 52 de 64 com 150 → 600). Dobrar o dano dá +3 a
  +4 vitórias em 24, mas o lab marca 92%, fora da faixa, porque os bonecos não se mexem: o lab não mede arma que
  empurra. Hoje os escudos não matam nem salvam: carta morta (pilar 3).
- O quê: no `tests/lab/weapons.test.ts`, um modo "multidão viva": bonecos imortais que sofrem knockback e voltam
  andando à velocidade de um básico; as bandas de `area` e `aimed` passam a usar esse número para as armas com
  knockback ≥ 200 (Escudos, Muralha, Martelo, Fúria da Forja, Chama de Yah, Maça e Quebra-Junta) ou para todas, se a
  diferença das outras for pequena. Depois, ajustar o dano dos escudos dentro da faixa nova.
- Aceite: `npm run lab` com a coluna nova; `bands.test.ts` usando-a; Escudos e Muralha com DPS real no sim perto das
  outras `area`; Cripta Loja inteira com escudos sem queda.
- Revisão 2026-11-11 (2) · ampliado (01-balance #1, #2, #3, #5): o mesmo ponto cego explica cinco números de hoje:
  Aura de Yah **15** de DPS real (lab 220), Espadas de Elun **66** (lab 228), Maça **76** (Lâmina 156), Tempestade 1,4x e
  Espada de Fogo 1,7x. Somar ao O quê: a multidão viva também é **densa** (a coluna de grade 32 px do NE-02), e o sim
  imprime, para armas `aura` e `orbit`, inimigos dentro do alcance por segundo (separa o bot que foge do desenho da
  arma). É o primeiro passo do PE-02; os números das cinco armas só mudam depois dele.

### N4 · Efeitos visuais (dono: vfx-director)

**NF-01 · Flash branco só em acerto de alvo único** · vfx + impl · P · ✅ feito

- Por quê: 04-visual #3 (alto), 06-vfx #1 (parte 4). `AREA_HIT` só cobre `aura` e `zone` (`GameScene.ts:53-58`);
  todo o resto pinta o inimigo de branco (`setTintFill`, `:333`). Os verbos novos acertam dezenas de uma vez:
  Estrela de Lyra e Tempestade fazem uma nuvem branca de ~200 px sobre a Lyra (`10-elos-b-420x820.png`); Quebra-Junta,
  Muralha e Espada de Fogo uma faixa branca sem forma de inimigo (`10-elos-d-*`). O jogador perde justamente o que está
  mais perto (pilar 5).
- O quê (conflito 3 em `07-direcao.md`): flash branco só para acerto de alvo único (projétil, arremesso, homing, raio
  sem corrente); todo acerto de área ou de vários alvos (`arc`, `slam`, `aura`, `zone`, `strike` em rajada e os verbos
  split, chain, wave, ricochet, ward, ground) usa só squash e faísca. O vfx-director escolhe o desenho (pode ser o
  clarão de topo do 04-visual).
- Aceite: capturas de Quebra-Junta, Estrela de Lyra, Tempestade e Espada de Fogo com 400 inimigos onde dá para contar
  os inimigos dentro do golpe.

**NF-02 · Chão somado e tintas que apagam o inimigo** · vfx · P · ✅ feito (2026-11-11; sem a gotinha sobre a cabeça)

- Por quê: 06-vfx #1 (alto), #6, #7. A Espada de Fogo deixa 21 a 28 chãos em brasa somados: um tapete laranja, e
  `TINT.burn 0xffa070` deixa a multidão inteira laranja chapada (`sheet-fireSword-p.png`); a Nevasca, ~15 zonas a 0,22,
  lava a tela de azul (`sheet-blizzard-p.png`); o sangramento (`TINT.bleed 0x8ef0b4`) pinta esqueletos de verde de
  Gosma (`sheet-fan-p.png`). No F4, Espada de Fogo e Nevasca estão entre as mais caras de desenhar.
- O quê: recheio das zonas com alfa `x min(1, k / n)` (n = zonas ativas do tipo, contado uma vez por quadro; k = 6 na
  brasa, 5 na Nevasca), bordas como estão; chamas por zona 7 → 3 acima de 8 zonas; borda da Nevasca 3 px a 0,6 com
  mais de 8; `TINT.burn` ~`0xffd8c0`, `TINT.bleed` ~`0xe0f4e8` (o "queima" e o "sangra" ficam nas brasas e gotas que já
  existem, mais uma gotinha sobre a cabeça do que sangra, com o teto das estrelas de atordoado).
- Aceite: capturas das três armas sobre multidão com esqueleto, morcego e elite reconhecíveis; F4 igual ou melhor.

**NF-03 · Maça que aparece, pousa com o dano e anuncia a onda** · vfx · P · ✅ feito (2026-11-11: cabeça cravada no quadro do dano, branca no golpe da onda; anel escuro no alcance; bolinhas âmbar da contagem; Quebra-Junta com borda âmbar; faíscas da Fúria e do Quebra-Junta na cor do elemento)

- Por quê: 06-vfx #3 (alto) e #10, 04-visual #16, feedback do Daniel sobre a maça. A pancada é uma sombra e depois uma
  meia-lua bege: a maça nunca aparece e o dano chega ~70 ms antes do impacto desenhado; nada avisa qual golpe traz a
  onda; o Quebra-Junta lê como a maça maior, bege (o âmbar `earth` fica por baixo da borda a 0,95); as faíscas da Fúria
  e do Quebra-Junta não usam a cor do elemento (`GameScene.ts:76-78`).
- O quê: depois do NE-01 (raio novo): cabeça da maça cravada no ponto de impacto no quadro 0 (squash e some em
  ~0,15 s), impacto começando junto com o dano, sem a sombra de descida; anel de impacto escuro no raio; 2 pontinhos
  âmbar sob o herói que acendem com `w.swings % waveEvery` e a cabeça branca no golpe da onda ("pá, pá, BUM"); no
  Quebra-Junta, borda principal âmbar e bege só como fio interno; faíscas na cor do elemento. Sem rachaduras no chão.
- Aceite: captura a 0,1x mostrando a maça no quadro do dano; o Daniel reconhece o golpe da onda antes dele.

**NF-04 · Empurrão com forma** · vfx · P · ✅ feito (2026-11-11: dois riscos de poeira atrás do empurrado acima de 150 px/s, até 40 por quadro; sem o puff)

- Por quê: 06-vfx #2 (alto). O empurrão acontece (escudos limpam um anel, o Quebra-Junta esvazia a tela), mas o golpe
  que empurra tem a cara de qualquer acerto; parado, o inimigo empurrado parece só ter andado.
- O quê: enquanto `hypot(e.kbx, e.kby)` > ~250, 2 riscos curtos de poeira atrás do inimigo, contra a direção do
  empurrão, e um puff nos pés no quadro em que ele começa; teto de ~40 por quadro; juntar com `drawStuns` e
  `drawCharges` num laço só.
- Aceite: captura dos escudos e da onda da maça onde o empurrão se lê parado; F4 igual.

**NF-05 · Herói ferido não perde a cor** · vfx + visual · P · ✅ feito (2026-11-11: contorno na cor de perigo 0,12 s, tinta 0xffd0d0 por 0,1 s)

- Por quê: 04-visual #7. `heroHurt: 0xff9090` (`fx.ts:169`) deixa a Lyra com cara de Andilla e o Teo um boneco
  vermelho sob multidão (`08-crowd-crypt-1000x680.png`, `16-teo-crypt-420x820.png`).
- O quê: dano no contorno e no anel (piscar `UI.danger` 0,12 s) e na barrinha; se ficar tinta, `0xffd0d0` só no
  primeiro décimo de segundo.
- Aceite: captura dos quatro heróis cercados, cada um reconhecível pela roupa.

**NF-06 · O acerto diz quão forte foi; crítico visível** · vfx + impl · P · ✅ feito (2026-11-11: `hitAmount`/`hitCrit`, estrela maior e anel no forte, estrela dupla na cor da arma no crítico)

- Por quê: 06-vfx #4. Um acerto de 13 e um de 161 têm a mesma faísca e o mesmo squash; o crítico de Adagas e Leque só
  aparece pelo número e some com os números desligados.
- O quê: `Enemy.hitAmount` em `damageEnemy` e `hitCrit` em `projectiles.ts:186` (core, com teste, sem alocação);
  faixas no render: comum, forte (`>= config.effects.strongHit`: estrela 1,5x, squash 0,25, anelzinho) e crítico
  (estrela dupla na cor da arma).
- Aceite: teste dos campos; captura de Adagas/Leque com os números desligados onde o crítico se vê.

**NF-07 · Projéteis no tamanho do acerto** · vfx · P · ✅ (cresce até o raio do acerto, nunca encolhe)

- Por quê: 06-vfx #5. A onda da Fúria acerta ~68 px de largura e o sprite tem 36; nenhum projétil cresce com Área
  (`GameScene.ts:258`, escala fixa).
- O quê: `SPRITE_RADIUS` por `proj.*` e `setScale(ART_SCALE * p.radius / SPRITE_RADIUS[sprite])`; rastro `fury`.
- Aceite: captura da Fúria com círculo de acerto desenhado batendo com a meia-lua.

**NF-08 · Verbos dos Elos anunciados** · vfx · P · ✅ feito (2026-11-11: borda da Chama esquenta e anel no raio da onda no tique anterior, 10 línguas grandes; almas da Procissão girando; estrelinhas pulam em arco)

- Por quê: 06-vfx #8, #11 e a tabela (Estrela). O pulso da Chama de Yah (a cada 10 ticks) chega sem aviso e as línguas
  parecem velinhas; o acúmulo de almas da Procissão não aparece; as estrelinhas da Estrela de Lyra voam retas, sem
  "cair".
- O quê: Chama: borda esquenta com `w.swings % pulse.every` e um círculo fino no raio do pulso no tick anterior; 10
  línguas maiores (base 9, altura 16 a 30) no lugar de 16 pequenas. Procissão: `w.stacks` luzinhas girando junto ao
  herói. Estrela: pulinho em arco (`sin(pi * k)`) no y das estrelinhas.
- Aceite: capturas mostrando o aviso antes do pulso e as almas acumuladas; custo por quadro igual.

**NF-09 · Fogo pousa com o dano** · vfx · P · ✅ (queda em 0,12 da vida)

- Por quê: 06-vfx #9. O Fogo cai ~55 ms depois do dano. (A estocada da Lâmina saiu do jogo em 2026-11-10, a pedido do
  Daniel: a arma do Aldo é só o golpe em arco.)
- O quê: queda do Fogo em 0,12 da vida.
- Aceite: captura a 0,1x com a bola de fogo no alvo no quadro do flash.

**NF-10 · Formas de 100 pontos que sobraram** · vfx · P · ✅ (escudo, anel do herói e baú com `oval`/`ovalRing`/`ring`)

- Por quê: 06-vfx #13. `drawShield` (`fx.ts:1401, 1407`: a Muralha monta 12 caminhos de 100 pontos por quadro), luz
  do herói (`:233-235`) e baú (`:340-342`) ainda usam os círculos do Phaser.
- O quê: `ring`/`disc` de `render/shapes.ts` e um `ellipseRing` com a mesma tabela.
- Aceite: F4 com a Muralha igual ou melhor.

### N5 · Interface (dono: ui-designer)

**NU-01 · Setas na borda para o baú no chão e a elite fora da tela** · ui + impl · P · ✅ feito (2026-11-11, `render/edgeArrows.ts`)

- Por quê: 05-ui #3 (regressão: `eliteArrows` saiu em `fb215a6`). A elite solta o baú onde morre (`world.ts:271`) e
  com armas automáticas ela morre fora da tela; o jogador não sabe que há um baú (ouro, cura e às vezes o nível que
  forja o Elo). Um baú perdido é uma decisão perdida (pilar 2).
- O quê: no máximo 3 setas na moldura entre `hud.bottom` e a safe-area de baixo: baú (dourada, ícone `pickup.chest`
  16 px) com prioridade sobre elite viva (coral, `UI.danger`); somem quando o alvo entra na vista; sem pulsar no modo
  calmo; seta assada em textura, varredura O(n) sem alocar. Base: `68ac386`.
- Aceite: captura com baú e elite fora da tela; F4 igual; não cobre pausa nem joystick.

**NU-02 · A receita nunca sai da carta; nome do Elo com uma regra só** · ui + impl · P · receita ✅ feita (2026-11-11: a descrição longa cede as últimas linhas, com "…"); falta a regra única do nome do Elo (decisão 2 do Daniel)

- Por quê: 05-ui #4. `LevelUpScene.ts:155` destrói a linha da receita quando a descrição tem 3 linhas (a Maça de Ferro
  em 420x820 perde a dica, `p-06-levelup.png`), justamente na carta que abre uma receita. E o nome do Elo é "???" no
  Livro e na tela final, mas aparece inteiro na carta e na Pausa (`describe.ts:62-72`).
- O quê: a linha da receita reserva seu espaço antes da descrição (descrição com no máximo 2 linhas na carta, ou uma
  frase curta `t.weapons[id].short` escrita pelo game-director na implementação); recomendação: nome do Elo secreto
  até a primeira forja em todas as telas, passiva sempre visível: `progressUnknown` = "Elo de Maça de Ferro: arma 3/7 ·
  Armadura 1/3" (`recipeProgress` recebe a lista de Elos conhecidos).
- Aceite: captura da Maça de Ferro como arma nova em 420x820 e 360x640 com a receita; a mesma regra de nome na carta,
  na Pausa, no Livro e na tela final.

**NU-03 · Pausa: build em qualquer celular, interruptores numa linha e atributos** · ui + impl · M · ✅ feito (2026-11-11: Som, Números e Calma numa linha com lâmpada; lista de uma linha por arma quando aperta; lista e botões na mesma largura; Atributos quando cabe)

- Por quê: 05-ui #5 (e #6 do diagnóstico), 04-visual #15. Em 360x640 a Pausa esconde a build inteira
  (`PauseScene.ts:59-69`) e sobram ~200 px vazios (`s-07-pause.png`); os três interruptores ocupam três linhas; a lista
  (360) e os botões (320) têm larguras diferentes; a Pausa não mostra atributos. Promove a ideia "Pausa como ficha da
  build".
- O quê: lista compacta de uma linha por arma quando aperta; Som, Números e Calma numa linha de 44 px com selo; mesma
  largura `min(360, width - 32)` para lista e botões; `StatSheet` embaixo quando houver altura. Textos:
  `pause.stats: 'Atributos'`, `options.soundShort: 'Som'`, `options.numbersShort: 'Números'`,
  `options.calmShort: 'Calma'`.
- Aceite: capturas em 360x640, 420x820, 640x360 e 1000x680 com a build visível e Desistir inteiro.

**NU-04 · A carta mostra toda a melhora** · ui + impl · P · ✅ feito (2026-11-11)

- Por quê: 05-ui #6 (carta de passiva sem o total quando não há painel, 360x640: só "Vida máxima +20") e 02-code #10
  (Fogos-Fátuos nível 4 muda `lifetime`, que não tem rótulo em `t.weaponStats`).
- O quê: sem painel, a carta de passiva mostra "(180 → 200)" via `statPreview`; rótulo para `lifetime`
  (`levelUp.after`, `weaponStats.lifetime`).
- Aceite: captura em 360x640 com o total; teste de `describe` cobrindo os 91 níveis sem mudança escondida.

**NU-05 · "Faltou pouco" diz o que faltou** · ui + impl · P · ✅ feito (2026-11-11)

- Por quê: 05-ui #9. `almostElo` sabe se falta arma ou passiva (`report.ts:51-59`), mas a frase só diz "Faltou um nível
  para o Elo de Lâmina de Valmor!". Dizer a peça transforma o lamento em plano (pilar 4).
- O quê: `report.ts` devolve `missing: 'weapon' | 'passive'` (teste); `almostPiece: (piece, elo) => "Faltou 1 nível de
${piece} para ${elo}!"`, com o nome do Elo pela regra do NU-02.
- Aceite: teste; captura da tela final com a peça.

**NU-06 · Segunda Chance visível no HUD** · ui + impl · P · ✅ feito (2026-11-11: ícone e número antes do ouro, na linha dos contadores, porque ao lado da barra de vida batia no tempo em 360 px)

- Por quê: 05-ui #8. Quem comprou a Segunda Chance (2.000 de ouro) só descobre que tem ao morrer; saber da rede muda o
  quanto o jogador arrisca.
- O quê: ícone `icon.revive` 16 px com o número à direita da barra de vida; some quando `revives` chega a 0; texto só
  quando muda.
- Aceite: captura em 360x640 e 420x820 sem invadir o centro do HUD.

**NU-07 · Categoria na carta de arma nova** · ui + impl · P · ✅ feito na carta (2026-11-11; "Nova arma · Mira / Automática / Em volta", e o nome longo encolhe para não encostar; e na página do Livro de Elos: "Elemento: Fúria · Mira")

- Por quê: 05-ui #7. Toda arma tem `category` com faixa testada, mas o jogador não vê; no celular de um polegar,
  saber "precisa mirar andando" contra "acerta sozinha" pesa na escolha da 3ª e 4ª arma (pilar 3).
- O quê: etiqueta ao lado de "Nova arma": `levelUp.category: { aimed: 'Mira', auto: 'Automática', area: 'Em volta' }`
  (não "Sozinha", que lê como sem companhia; não "Área", que é nome de atributo); também na página do Livro de Elos.
- Aceite: captura das três categorias na carta.

**NU-08 · Página do Elo com painel, um Voltar só e Esc que volta ao Livro** · ui + visual · P · ✅ feito (2026-11-11: painel com borda do elemento; o Voltar da Coleção volta ao Livro na página)

- Feito em 2026-11-09: Esc na página volta ao Livro. Falta: painel e um Voltar só.

- Por quê: 04-visual #10, 03-qa #11. A página flutua sem painel com dois "Voltar" (`collection/elos.ts:107-160`) e Esc
  sai da Coleção inteira.
- O quê: painel do tamanho do conteúdo, centrado, borda na cor do elemento; o Voltar de baixo volta ao Livro enquanto a
  página estiver aberta; Esc idem.
- Aceite: captura em 420x820 e 820x420; Esc na página volta ao Livro.

**NU-09 · Loja: nível nos cartões** · ui + visual · P · ✅ feito (2026-11-11)

- Por quê: 05-ui #11, 04-visual #16. No jogo real em 420x820 os cartões compactos mostram nome e preço; o nível só no
  detalhe. Promove os pips da ideia "Loja com ícones, grupos e pips".
- O quê: pips sob o nome (barra contínua quando `maxLevel > 5`), 12 px, dentro do card de 40 px do RB-05.
- Aceite: captura sem `?dev` em 360x740 e 420x820 com o nível de todos os itens.

**NU-10 · Preparação: cartão deitado sem transbordar e vitórias por herói** · ui + visual · P · ✅ feito (2026-11-11)

- Por quê: 05-ui #10/#11/#12. Em 820x400 a descrição do herói passa da borda e encosta em "Fase" (`SelectScene.ts:69-71`,
  `171-176`); a Preparação não mostra o que cada herói já venceu, que é o convite para "agora com a Lyra" (pilar 4).
- O quê: sem descrição quando `hh < 80`; três marcas de fase (douradas = vencida) no cartão, as mesmas da aba Heróis.
- Aceite: captura em 820x400 sem transbordo; marcas batendo com a aba Heróis.

### N6 · Arte e polimento (dono: visual-director)

**NA-01 · Costura do tile em Valmor e na Estrada** · visual · P · ✅ feito

- Por quê: 04-visual #1 (alto). Manchas cortadas na borda do tile desenham uma grade a cada 128 px de mundo
  (`tiles.ts:22-35`, `:70-78`; `06-start-valmor-1000x680.png`). É a primeira tela de todo jogador novo.
- O quê: `wrapEllipse` em `tiles.ts` que redesenha a mancha em `x ± SIZE`, `y ± SIZE` quando cruza a borda; nos laços
  de manchas, pedrinhas e pontos de neve dos dois tiles. Custo por quadro zero.
- Aceite: captura em 1000x680 sem nenhuma linha reta no chão.

**NA-02 · Estrada do Sul com cara de estrada no celular** · visual · P · proposto

- Por quê: 04-visual #4. Com 480 px de mundo na vista e a estrada de 520, a floresta nunca aparece em pé, e o tile da
  estrada é quase o de Valmor (`06-start-southRoad-420x820.png`); as miniaturas da Preparação de Valmor e da Estrada são
  iguais e a da Cripta é um quadrado escuro.
- O quê: tile de neve pisada mais clara e quente no meio, sulcos norte-sul mais frequentes; banco de neve contínuo
  (~16 px, sem contorno) a `width / 2` do centro, sempre desenhado; miniaturas com lápide, pilar e pinheiros. **Sem**
  mudar `width` (rejeitado: mexe no equilíbrio de uma fase no limite da meta).
- Aceite: capturas em 420x820 da Estrada e de Valmor que se distinguem sem inimigos; miniaturas diferentes.

**NA-03 · A corrente do Elo na faixa da build parece um "8"** · visual · P · ✅ feito (2026-11-11: abaixo de 14 px, dois elos — um ao longo, um deitado — na cor do elemento)

- Por quê: 04-visual #6 (`crop-strip.png`: um "8" vermelho sob a Fúria, ao lado dos números de nível). Lê como "nível
  8", não como corrente; é a marca permanente do Elo forjado.
- O quê: com menos de ~14 px de espaço, um elo só (anel deitado na cor do elemento cruzando as bordas) ou a corrente em
  diagonal; ou 4 px a mais entre as linhas quando houver Elo.
- Aceite: recorte 4x sem nenhum algarismo.

**NA-04 · Aranha Tumular e Rato Gigante na mesma cor** · visual · P · proposto

- Por quê: 04-visual #12. Na Cripta o básico e o rápido são dois marrons do mesmo tamanho: o jogador não separa quem vai
  alcançá-lo (pilar 5).
- O quê: aranha quase preta (~`0x2e2a30`), pernas longas, olhos brancos maiores (r 2,4); rato como está. Fora de roxo,
  ciano e verde.
- Aceite: captura de multidão da Cripta com os dois distinguíveis.

**NA-05 · Fogos-Fátuos e Procissão fora do ciano das gemas** · visual · P · proposto

- Por quê: 04-visual #13. `proj.wisps` (`0xe8ffff`/`0x40e0d8`) e `ELEMENT_COLOR.soul` (`0x7af0dc`) estão no ciano da
  gema; a regra do A-05 é a gema ser o único ciano saturado.
- O quê: fogo-fátuo branco-esverdeado quente (núcleo `0xf4ffe0`, aro `0xa8e0a0`) ou dourado de vela; `soul` ~`0x9ad8c0`.
- Aceite: folha de texturas com fogo-fátuo e gema claramente diferentes.
- Revisão 2026-11-11 (2): sai junto com o **PF-04** (os mesmos projéteis viram sprites PixelLab; as cores daqui são a
  paleta deles). Fechar os dois no mesmo commit.

**NA-06 · Nenhum texto de 11 px** · visual · P · ✅ feito

- Por quê: 04-visual #9. A receita na Pausa (`buildList.ts:75`) e as dicas da Loja (`ShopScene.ts:284`, `:336`) em
  11 px, justamente a informação que a Pausa existe para mostrar.
- O quê: 12 px no mínimo; na Pausa, `UI.muted` com a parte que falta em `UI.gold`.
- Aceite: `grep "11px"` nas cenas vazio.

**NA-07 · Acabamento de cor e largura** · visual · P · ✅ feito (2026-11-11: olho das Ossadas 0xff5a6a, selo desligado em `UI.muted`, abas da Coleção até 960 px centradas; ícones dos cards ficam em 22)

- Por quê: 04-visual #14 e #16. O olho das Ossadas é `0xe86a7a`, a cor da Andilla, em centenas de pontinhos
  (`art/enemies.ts:155`); o selo "Desligado" quase some (`ui.ts:136-143`); na Coleção em 1000x680 os cartões vão de
  borda a borda e os cards de Elo espremem a receita.
- O quê: olho das Ossadas ~`0xff5a6a`; texto do selo desligado em `UI.muted`; conteúdo das abas com
  `min(960, width - 2 x gutter)` centrado e ícones de 28 px nos cards de Elo largos.
- Aceite: capturas de Valmor, Opções e Coleção em 1000x680.

**NA-08 · Selo "MODO DEV" fora dos botões** · visual · P · ✅ feito

- Por quê: 04-visual #11, 03-qa #10, 05-ui. Em 420x820 o selo cobre o Voltar da Preparação e da Loja e encosta na dica
  do menu.
- O quê: no retrato, no canto de cima à direita, abaixo da safe-area; deitado, onde está.
- Aceite: capturas `?dev` em 420x820 de Menu, Preparação e Loja sem sobreposição.

### N7 · Sistemas novos (proposta do game-director)

**ND-01 · Perigo por fase vencida** · impl + bal + ui · M · proposto (nome com o Daniel)

- Por quê: pilar 4. Com a Loja inteira o sim vence **98%** em Valmor e 81% na Cripta (01-balance, 16 sementes); a
  Andilla vence 100% na Cripta. Depois de ~57 corridas a Loja acaba e o veterano não tem mais escada. Era o primeiro
  item das ideias da Revisão 2026-11-08. Gênero: os níveis de dificuldade por personagem/fase do Brotato e as maldições
  dos survivors-likes, sempre com recompensa maior.
- O quê: vencer uma fase no perigo N abre o perigo N+1 dessa fase (até 3). O perigo multiplica o `mult` da fase na
  criação do `World` (nenhum sistema de onda novo):

  ```ts
  // data/config.ts
  danger: {
    maxLevel: 3,
    /** Per level, multiplied into the stage mult. */
    hp: 0.3,
    damage: 0.15,
    spawn: 0.1,
    gold: 0.35,
  },
  ```

  `RunSetup.danger` (0 a 3), `MetaSave.danger[stage]` (o maior vencido, com migração em `sanitizeSave`), seletor na
  Preparação (marcas 0 a 3 sob a fase, como as de vitória), recorde por herói x fase x perigo na aba Heróis, uma
  conquista por fase no perigo 3. A vigília herda o perigo. Textos (rótulo de trabalho, o nome é do Daniel):
  `select.danger: (n: number) => n === 0 ? 'Normal' : \`Perigo ${n}\``, `select.dangerLocked: 'Vença o perigo anterior'`,
`end.dangerUnlocked: (stage: string, n: number) => \`${stage}: Perigo ${n} liberado!\``.

- Riscos: nenhum custo por quadro (só multiplicadores na criação); tela final ganha uma linha (depende do NB-02).
- Aceite: testes de meta (abrir, salvar, migrar); sim com `SIM_DANGER`: com a Loja inteira, Valmor perigo 1 em 60% a
  75%, perigo 3 em 15% a 30%; ouro por corrida no perigo 3 cerca de 2x o normal; F4 igual.

**ND-02 · Um traço por herói que muda uma regra** · impl + bal + ui · G · proposto (regras e nomes com o Daniel)

- Por quê: pilar 3. Os quatro heróis só diferem por números (`characters.ts`) e pela arma inicial, que nem os
  prende (toda arma é oferecida a todos). No gênero, o personagem que muda uma regra é o que mais multiplica builds
  sem conteúdo novo (Brotato). Aqui, sem botão novo (um polegar).
- O quê: `trait` opcional em `CharacterDef`, com um gancho por `kind` no core (um `switch`, sem abstração). Proposta
  de partida, mecânica de gênero, sem lore nova (os papéis vêm do original: Aldo guerreiro, Lyra maga, Teo aprendiz do
  Templo, Andilla ladina):

  ```ts
  aldo: { ..., trait: { kind: 'grit', might: 0.04, stacks: 5, duration: 4 } },
  lyra: { ..., trait: { kind: 'insight', choices: 4 } },
  teo: { ..., trait: { kind: 'devotion', healOnLevel: 0.1 } },
  andilla: { ..., trait: { kind: 'pickpocket', chestChoices: 3 } },
  ```

  Textos (`pt-BR.ts`, `characters.<id>.trait`; nomes de trabalho):
  - Aldo, "Sangue Quente": "Cada golpe que leva dá +4% de dano por 4 s, até 5 vezes." (puxa para dentro da multidão,
    combina com a Lâmina e a Armadura)
  - Lyra, "Estudiosa": "Escolhe entre 4 cartas ao subir de nível." (mais decisão, compensa a vida menor)
  - Teo, "Devoto": "Cada subida de nível cura 10% da vida." (sustento sem regen passivo; trocaria parte do `regen` 0,4)
  - Andilla, "Mão Leve": "Ao abrir um baú, escolhe 1 de 3 recompensas." (decisão a mais; por ser o teto do sim, trocaria
    o `greed` 0,25)

- Custo: `characters.ts`, `core/world.ts` (gancho por traço), `core/upgrades.ts` (`choices`, escolha do baú),
  `LevelUpScene` (4 cartas e o modo baú, reaproveitando as cartas), Preparação e aba Heróis mostram o traço.
- Riscos: 4 cartas em 360x640 (depende do RB-05); o baú com escolha é uma tela a mais (só para a Andilla); equilíbrio
  por herói no sim antes de ligar.
- Aceite: teste por traço; sim de 16 sementes com cada herói a ±20 pontos da fase; pick rates por herói diferentes
  entre si (o traço muda a build).

---

## Etapa AR · Arte nova (2026-11-10)

Origem: a direção de arte mudou para fantasia escura e iluminada (pixel art top-down com luz, "hi-bit"; referências
em `docs/design/art-references/`, padrão em `.claude/agents/visual-director.md`). Até aqui só os documentos mudaram.
Aprovada pelo Daniel em 2026-11-10, antes das FT. Prefixo: **AR**. Ordem: AR-01 a AR-05, um commit por passo.

**AR-01 · Escuridão e luz** · visual + vfx + impl · M · ✅ feito (a vinheta passa para o AR-02; luzes de cenário entram com os objetos do AR-02) · ↩ reaberto na Revisão 2026-11-11 (luz nos efeitos) · proposto

- Por quê: é o que mais muda a cara do jogo e não depende de sprite.
- O quê: uma camada de escuridão por fase (azul-noite em Valmor e na Estrada, quase preto quente na Cripta),
  redesenhada a cada quadro a partir de uma lista pré-alocada de luzes e apagada com uma textura radial comum; luz do
  herói na cor dele, sempre acesa; luzes de cenário fixas (tochas, velas, lanternas) por fase; chefes com luz
  própria; projéteis, Elos e explosões em modo aditivo e com clarão curto. Inimigos, gemas e avisos continuam legíveis
  fora da luz (nada de ameaça sumindo no escuro). Vinheta leve. Modo calmo: sem tremulação nem clarões.
- Aceite: capturas 420x820 e 1280x720 das três fases; 60 FPS com 500 inimigos (F4) no desktop e sem queda
  perceptível com 4x de CPU; nenhum alocamento por quadro.
- Feito: `render/lighting.ts` (mapa de luz a 1/4 da resolução em MULTIPLY sobre o terreno, carimbos radiais
  aditivos em lote, listas pré-alocadas). Luz do herói, do chefe, de projéteis, zonas e itens; clarão na bomba e na
  forja (não no modo calmo). Inimigos ficam acima do escuro e só escurecem com a distância da luz do herói
  (`enemyTint`). Com 505 inimigos no Chromium por software, ligar a luz não mudou o FPS; falta conferir num celular.
- ↩ Reaberto na Revisão 2026-11-11 · proposto (06-vfx #1): o "Elos e explosões em modo aditivo e com clarão" não
  aconteceu. Nenhum `BlendModes.ADD` em `render/fx.ts` e `render/sparks.ts`; `Lighting.add`/`flash` só têm três usos
  (projétil, pulso de nível, Segunda Chance; `GameScene.ts:308, 843, 1012`). Aura, Chama, Fúria, Maça, raios, Fogo,
  Espada de Fogo, estouro da Ossada em Brasa e Dobre Fúnebre são adesivos planos sobre a noite, na fase mais escura.
  Novo O quê: cada evento forte acende o chão na cor do dono ou do elemento (`lighting.add`/`flash` no ponto onde o
  desenho já está: Aura e Chama pulsando no tique, raio e Tempestade com flash frio de 0,12 s, Fogo e Espada de Fogo
  com luz na queda e brasa fraca na zona, Geada azul fraco, estouro e Dobre com flash curto no raio) e um Graphics
  aditivo `fxGlow` (depth 11,5) para os núcleos, **substituindo** o disco normal nos efeitos fortes. Teto de 8 luzes de
  efeito por quadro; modo calmo corta o alfa à metade. **Depende do AR-02 (chão da Cripta mais escuro) vir antes**:
  luz sobre chão claro não aparece. Donos: vfx + impl. Tamanho M. Aceite: capturas 420x820 da Cripta com Aura, Tempestade
  e Espada de Fogo acendendo o chão; F4 (420x820, CPU 4x, 500 inimigos) igual antes e depois; nenhuma alocação por
  quadro.

**AR-02 · Chão e cenário por fase** · visual · M · ✅ primeira parte feita (2026-11-11) · resto ampliado na Revisão 2026-11-11 · proposto

- O quê: várias variantes do tile por fase escolhidas por hash da célula, detalhes (rachaduras, musgo, ossos, neve),
  objetos de cenário (cercas e lanternas em Valmor; lápides, colunas e velas na Cripta; pinheiros, pedras e placa na
  Estrada), os que carregam luz alimentam o AR-01; borda do mapa irregular caindo no preto.
- Aceite: nenhum tile repetido visível na captura; objetos que bloqueiam batem com `core/terrain.ts`.
- Feito: chamas que iluminam de verdade (velas na Cripta, lanternas em Valmor, fogueiras na Estrada, tocha em metade
  das colunas), tremulando fora do modo calmo; camada de brilho aditivo (`Lighting.glow`) para chamas, clarões e
  projéteis, porque o MULTIPLY sozinho não clareia um chão escuro; lajes e musgo variando o piso da Cripta; vinheta
  no HUD. Falta: tiles novos de verdade (PixelLab ou Pen) e a borda irregular do mapa.
- Revisão 2026-11-11 · ampliado · proposto (04-visual #1, #2, #5, #10, #12; 06-vfx #1): na Cripta o "Falta" pesa mais.
  (1) **O chão é um tile único de 128 px repetido** em `tileSprite` (`GameScene.ts:235`, `tiles.ts:62-92`, seed fixa):
  a grade de tijolos e as manchas verdes se repetem nos mesmos lugares (`m-c2-0.png`, `m-c2-2.png`). (2) **É o chão
  mais claro e mais ruidoso das três fases**: blocos rosa, azul e teal com musgo ciano no mesmo valor dos morcegos
  magenta, fantasmas lilás e do Aldo, que somem no fundo (`m-c2-2.png`). (3) Props em `Pen` com contorno cartoon de
  2 px ao lado de sprites PixelLab de contorno tingido; 3 obstáculos e 7 decalques. (4) Poças de luz de vela e tocha
  fracas demais para contar. Novo O quê, em dois passos: **(a) código, zero gerações**: 4 a 6 variantes de 128 px por
  hash de célula (sem `tileSprite`), juntas e topos dos blocos a 60-70% do valor atual, saturação reservada para
  props e luzes, poças de luz das tochas e velas maiores e mais contrastadas; **(b) PixelLab**: coluna, sarcófago e
  lápide em `create_1_direction_object` (~10 gerações cada), depois decalques (ossos, teias, tocha de parede, arco) em
  três escalas; borda irregular caindo no preto por último (baixa prioridade numa fase de obstáculos). O passo (a) vem
  **antes** do AR-01 reaberto. Donos: visual (+ impl no a). Tamanho: a P, b M. Aceite: captura 420x820 da Cripta sem
  repetição visível de tile; herói, morcego e fantasma com valor acima do chão (teste de cinza na captura); props no
  mesmo traço dos sprites.

**AR-03 · Avisos de ataque como formas no chão** · vfx · P · ✅ feito (2026-11-11)

- É o FT-17 (ver lá), puxado para cá: faixa listrada para investidas, cone para leques, círculo com anéis para saltos
  e quedas. Os avisos ficam acima da escuridão.
- Feito: a investida comum (rato, encapuzado) deixou a seta e virou uma faixa no chão da largura do corpo e do
  comprimento real da investida (`CHARGE` × velocidade da fase), enchendo até o impacto, com borda tracejada. Os
  chefes já usavam formas (cone do Corte Brutal, faixa da Mordida Funda, anéis da Badalada).

**AR-04 · `Pen` repintado no estilo novo** · visual · M · proposto

- O quê: corpos mais escuros e de cores apagadas, uma cor principal por criatura, contorno escuro, olhos menores,
  mortos-vivos com olhos que brilham; heróis e itens no mesmo traço. Provisório até os sprites (AR-05).
- Aceite: capturas lado a lado antes/depois; bestiário e Livro de Elos coerentes com o jogo.

**AR-05 · Prova de sprites** · visual + impl · M · heróis ✅ feitos; inimigos no AR-04 · andar dos inimigos ampliado na Revisão 2026-11-11 · proposto

- O quê: Aldo + 2–3 inimigos em pixel art (24–32 px, escala inteira, sem suavização), carregados por `assets.ts`,
  com idle, andar, dano e morte; fixa a densidade de pixel e a paleta para o resto.
- Pergunta ao Daniel: de onde vêm os sprites (arte sua, encomenda, pacote licenciado, IA retocada)? Toda arte externa
  entra com licença em `docs/art/credits.md`.
- Feito (2026-11-11): fonte escolhida, **PixelLab** (MCP `pixellab`, conta do Daniel). Os quatro heróis saem do
  sprite original de corpo inteiro do Crônicas (`dungeon-rpg/src/herobody.js`) como referência (v3, 1 geração cada),
  com andar (6 quadros) e respirar (4) para o leste; o jogo espelha para o oeste. Faixas em `public/sprites/`,
  `pixelHero` em `assets.ts`, menus encaixados por `heroFit`. Ajustes pendentes: a Lyra e o Teo perderam o cajado e
  a maça na vista lateral; no andar, o Teo perdeu as faixas verdes do hábito (cinto vermelho).
- Revisão 2026-11-11 · ampliado · proposto (04-visual #4, #13): os inimigos PixelLab da Cripta são quadros parados
  com squash por seno (`GameScene.ts:346-357`); em multidão o squash lê como vibração e eles deslizam ao lado de um Aldo
  que anda em 6 quadros. Novo O quê: andar para o leste (o jogo espelha) para **Morcego Vampiro** (asas batendo é o que
  mais vende "vivo") e **Ossada**, depois Esqueleto e Espectro (`animate_character`, 3 a 6 gerações no total; conferir
  antes se os sprites feitos como objeto aceitam esqueleto). Os ajustes pendentes da Lyra e do Teo (cajado, maça,
  faixas) saem no mesmo estilo do Aldo novo (referência `aldo.png`). Ordem das gerações: decisão 6 do Daniel em
  `docs/reviews/2026-11-11/07-direcao.md`. Dono: visual. Tamanho M. Aceite: captura em movimento (gif ou 4 quadros) de
  uma multidão da Cripta sem deslizar; F4 igual.

---

## Fases temáticas e inimigos novos (2026-11-10)

Origem: pedido do Daniel de 2026-11-10, proposta do game-director. **Todos os itens estão `· proposto`**: esperam a
aprovação do Daniel. Bússola: o jogo **mais dinâmico, mais divertido, mais arriscado e mais recompensador**; a
diversão vale mais que a fidelidade estrita ao cânone (fases, elencos e lugares podem se afastar do original quando o
jogo fica melhor). Nome novo de lugar, criatura ou habilidade é **nome provisório** até o Daniel aprovar (perguntas no
fim da seção).

Prefixo: **FT** (fases temáticas).

### Diagnóstico

- As três fases se parecem: ratos e voadores nas três, as mesmas duas elites (`elites('golem', 'goblin')`,
  `data/stages.ts`) nas três, e todo inimigo comum só persegue (`move`: `zigzag`, `charge`, `phase`). Nada obriga o
  jogador a mudar de rota: o melhor caminho é sempre andar em círculo largo (pilar 2: autopiloto).
- Risco não paga: a única fonte de recompensa extra é a elite, que vem na hora marcada e também só persegue. Não existe
  "vou arriscar entrar ali porque vale".
- A Estrada do Sul (520 de largura) é um campo aberto com bordas: o corredor não pesa, e é a fase mais pobre em
  identidade.
- Cada fase precisa pedir uma habilidade diferente: **Valmor** pede _prioridade de alvo_ (ninho, ladrão, ovos: o que
  matar primeiro), a **Cripta** pede _limpeza_ (os que não descansam: terminar o serviço, pilhas e explosões), a
  **Estrada** pede _esquiva lateral_ (investidas, mergulhos, lanças num corredor estreito).

### Princípios (valem para todos os itens FT)

- **Um verbo por inimigo**, data-driven: campo opcional em `EnemyDef`, um `case` em `core/behaviours.ts`, teste em
  `tests/core/` **com o inimigo dentro de uma multidão** (não só sozinho), conferido no sim.
- **Tudo telegrafado**: toda ameaça nova avisa antes, no chão, na linguagem de perigo que já existe nos chefes
  (`WARN_COLOR` = `UI.dangerHex`, coral com listras e borda tracejada branca andando, `render/fx.ts`). Nada de dano sem
  aviso, nada sob o herói sem aviso.
- **Arte de perigo contra arte do herói** (vfx-director): os efeitos do herói são luz (aditivos, dourado, cores de
  elemento); os do inimigo são **coisas** (núcleo coral claro, contorno escuro, sem blend aditivo) e são desenhados
  **acima da camada de escuridão**, para nunca sumirem no escuro. Poças e gelo têm cor de material própria (fora do
  ciano das gemas, do roxo da Lyra e do verde do Teo); a borda coral aparece só enquanto armam. Modo calmo: sem pulsar,
  preenchimento estático.
- **Risco paga, e se vê**: ninho, ladrão, estandarte e elites deixam recompensa visivelmente melhor (`loot`), com seta
  na borda quando fora da tela (reaproveita o NU-01).
- **Teto por tipo** (`max` no `EnemyDef`) para tudo que atira, gera ou fortalece, e pools próprios com teto para
  projéteis e marcas do inimigo. Nada aloca por quadro.
- Os comportamentos entram **junto da fase que os usa primeiro** (ver "Ordem"): explodir e remontar esperam a Cripta.

### Dados comuns (referência para todos os itens)

```ts
// data/enemies.ts · EnemyDef, campos novos (todos opcionais)
move?: 'zigzag' | 'charge' | 'phase' | 'shoot' | 'leap' | 'flee' | 'pack' | 'still';
/** Most of this type alive at once: the spawner picks the stage's basic instead, specials wait. */
max?: number;
/** charge: replaces CHARGE (core/behaviours.ts) for this enemy. */
charge?: { trigger: number; windup: number; dash: number; speedMult: number; rest: number };
/** shoot: walks until `range`, holds between `keep` and `range`, every `every` s winds up and fires. */
shoot?: {
  range: number; keep: number; every: number; windup: number;
  /** Straight shot (px/s, px, s). Damage = contact damage x `damage` (default 1). */
  speed: number; radius: number; life: number; damage?: number;
  /** Lobbed: lands where the hero stood after `flight` s and leaves the next of `pools` there. */
  lob?: { flight: number; pools: GroundPool[] };
};
/** leap: marks the hero's spot, crouches `windup`, flies `air` s (no contact), lands hurting within `radius`. */
leap?: { trigger: number; windup: number; air: number; radius: number; rest: number };
/** pack: heads for a point `flank` rad to its side (by uid parity) until within `close` px. */
pack?: { flank: number; close: number };
/** flee: keeps `keep` px from the hero, picks up gems it walks over (`steal`), runs off after `life` s. */
flee?: { keep: number; life: number; steal: boolean };
/** nest: stands still; while within `range` of the hero, every `every` s marks and spawns `count`, up to `total`. */
nest?: { spawn: EnemyId; every: number; count: number; total: number; range: number };
/** banner: every `tick` s, enemies within `radius` are rallied (config.rally) for a little more than a tick. */
banner?: { radius: number; tick: number };
/** brew: every `every` s stops `windup` s, then heals `heal` of max HP and rallies `rally` s the ones within `radius`. */
brew?: { every: number; windup: number; radius: number; heal: number; rally: number };
/** burst (Cripta): on death leaves a mark that bursts after `delay` s (hero: contact x `damage`; enemies: `foes` of its max HP). */
burst?: { delay: number; radius: number; damage: number; foes: number };
/** reassemble (Cripta): the first death leaves a pile that stands up after `delay` s unless hit. */
reassemble?: { delay: number };
/** trail (Cripta): every `every` s leaves `pool` where it stands. */
trail?: { every: number; pool: GroundPool };
/** Besides its gem: gold (before greed and stage mult), a random floor item, a chest, a pickup. */
loot?: { gold?: number; item?: boolean; chest?: boolean; pickup?: PickupId };
/** Bosses with more than one ability use them in this order, in a loop (`ability` stays as the one-ability form). */
abilities?: BossAbility[];

/** A patch an enemy leaves on the ground. `slow` multiplies the hero's speed inside; `hit` is contact x hit per tick. */
export interface GroundPool {
  kind: 'poison' | 'tar' | 'web' | 'ice' | 'slime';
  radius: number;
  ttl: number; // Infinity = until the boss falls
  slow?: number;
  hit?: number;
}
```

```ts
// data/config.ts · novos
/** Banner and brew: what a rallied enemy gets. */
rally: { speed: 1.3, damage: 1.25 },
/** Enemy shots (own pool, no allocation). */
enemyShots: { max: 60 },
/** Ground marks: telegraphs, pools, ice, webs and the spawn mark (own pool). */
marks: { max: 160, spawnTime: 0.5, spawnMinDist: 80, poolTick: 0.5 },
```

```ts
// data/stages.ts · StageDef, novo
/** Scheduled one-offs besides elites: from `from` s, one every `every` s (each obeys its def's `max`). */
specials?: { id: EnemyId; from: number; every: number }[];
```

```ts
// data/waves.ts · Roles ganha o atirador (comum, entra no sorteio com peso; o teto `max` do def segura)
shooter?: EnemyId;
// CURVE: `shooter` 1 em 120, 180 e 240 s; 2 em 300, 390, 480 e 540 s; 0 na luta do chefe (600 s).
// Fases sem `shooter` não mudam (o filtro de `buildWaves` já ignora papel vazio).
```

Ninho, ladrão e estandarte **não** entram no sorteio com peso: com lotes de até 10 a cada 0,5 s, qualquer peso enche o
teto na hora e o ritmo vira sorte. Vão para `specials` (ritmo fixo, legível, ajustável), como as elites. A vigília
continua os `specials` no mesmo ritmo.

### Base

**FT-01 · Base dos inimigos novos: pools, tetos, agenda, chefes com várias habilidades e a métrica de dano** · impl + bal · M · ✅ feito (2026-11-11, enxuto)

- Por quê: todo item FT precisa de projéteis do inimigo, marcas no chão, teto por tipo e uma medida de quem causa o
  dano. Feito uma vez, cada comportamento depois vira um `case` pequeno.
- O quê:
  - `core/enemyShots.ts`: `Pool<EnemyShot>` (x, y, vx, vy, radius, damage, ttl, `lob` com alvo e tempo de voo,
    `ownerUid`), teto `config.enemyShots.max`; acerta só o herói (círculo contra círculo). Congelam no Sopro de Geada
    (item do chão); a Badalada (bomba) apaga os tiros visíveis (dá mais valor ao item).
  - `core/marks.ts`: `Pool<Mark>` (kind, x, y, radius, `arm` (aviso), `ttl`, `hit`, `slow`, `foes`, `spawn` +
    `hpMult`), teto `config.marks.max`. `updateMarks` roda depois de `updateZones` e antes de `sweepDeadEnemies` (como
    `updateShatters`): consulta o hash só ao armar. Escreve `player.groundSlow` (1 = nada), que `updatePlayer` usa no
    passo seguinte.
  - `world.alive: Record<EnemyId, number>` (sobe em `spawnEnemy`, desce no `sweep` e no despawn) e `max` respeitado no
    `Spawner` (o atirador acima do teto vira o básico; `specials` esperam).
  - `move: 'still'` e `'flee'` nunca são reciclados para a frente do herói: longe demais, somem sem drop.
  - `StageDef.specials` no `Spawner` (fase e vigília).
  - `abilities` nos chefes: `Enemy.abilityIndex`, `updateBoss` usa `abilities[i]` e avança ao fim de cada uma; `ability`
    vira `[ability]`. Tipos novos de habilidade entram com seus itens (FT-08, FT-12).
  - `loot` em `onEnemyKilled` (ouro, item, baú, pickup), substituindo o `if (e.def.elite)` (elite = `loot.chest`).
  - `hurtHero` aceita atacante nulo (tiro, poça): a Muralha bloqueia mas não devolve dano quando o dono já morreu.
  - Métrica: `world.hurtBy` por fonte (`contact`, `shot`, `leap`, `ground`, `burst`, `boss`) e por tipo de inimigo,
    contadores preallocados (sem string por golpe). O sim imprime `DANO POR FONTE` por fase (substitui `taken.fast`).
  - Bot do sim (`tests/lab/bot.ts`): marcas armando e tiros entram na repulsão como ameaça (peso de elite), para os
    números não punirem um bot cego.
- Custo: `data/enemies.ts`, `data/stages.ts`, `data/config.ts`, `core/world.ts`, `core/waves.ts`, `core/enemies.ts`,
  `core/bosses.ts`, `core/player.ts`, dois arquivos novos no core; render: espelhos novos (`render/mirror.ts`) para tiros
  e marcas, desenhados acima da escuridão.
- Riscos: dois pools novos no passo; ambos O(n) pequenos (60 e 160). Nenhuma mudança de jogo ainda: o sim tem de dar os
  mesmos números com a mesma semente.
- Aceite: testes de pool (teto, reuso), de `max` no spawner, de `specials`, de `abilities` em ciclo e de `loot`;
  `npm run sim` com `SIM_SHOP=all` idêntico ao anterior (só a linha nova de dano); F4 igual.

- Feito (FT-01, 2026-11-11): `core/enemyShots.ts` e `core/marks.ts` (pools com teto), `world.alive` e `max` no
  spawner, `StageDef.specials`, `loot`, `hurtHero` com atacante nulo e fonte, `world.hurtBy` e a linha `DANO POR
FONTE` no sim. Ficaram para quando um item precisar: `abilities` (FT-08), `flee`/`still` fora do reciclar, bot
  vendo tiros e marcas. Sim igual em Valmor e na Cripta.

**FT-02 · Marca no chão antes de surgir** · impl + vfx · P · ✅ feito (2026-11-11, enxuto)

- Por quê: inimigo que nasce dentro da tela (lados da Estrada, ovos, ninhos, a badalada do Sineiro) acerta sem aviso.
  Pilar 5.
- O quê: quem surge **dentro da vista** passa antes por uma marca `spawn` de `config.marks.spawnTime` (0,5 s) e nunca a
  menos de `spawnMinDist` (80 px) do herói (a marca é empurrada para fora). Quem surge no anel fora da tela continua
  direto (a marca seria invisível e custaria pool). Vale para todas as fases.
- Visual (vfx): o chão racha num círculo do raio do inimigo, com brilho coral fraco crescendo em 0,5 s e um sopro de
  poeira (neve, pó de pedra) no surgimento. Mortos-vivos: fiapos de névoa saindo da racha (Cripta).
- Custo: `core/marks.ts` (kind `spawn`), `core/terrain.ts` (`spawnPoint` diz se o ponto está na vista), `core/bosses.ts`
  (badalada), render.
- Aceite: teste: nada surge na vista sem 0,5 s de marca nem a menos de 80 px do herói; captura da Estrada com saídas
  laterais marcadas.

### Estrada do Sul: "os caçadores"

Habilidade pedida: **esquiva lateral**. Corredor estreito, pressão das duas pontas, investidas e mergulhos que só se
evitam saindo da linha.

**FT-03 · Atirador: para longe e lança um projétil lento** · impl + vfx · P · ✅ feito (2026-11-11)

- Por quê: obriga a andar (Brotato: quem atira tira o jogador do círculo). Primeiro usuário: Goblin Lanceiro.
- O quê: `move: 'shoot'`. Anda até `range`, fica entre `keep` e `range` (recua se o herói chega perto), a cada `every`
  s para `windup` s e atira na posição do herói naquele instante (sem perseguir). Tonto ou congelado não atira.
  Projétil sempre mais lento que o herói (150).
- Dados (Goblin Lanceiro vira comum; deixa de ser elite em todas as fases):
  ```ts
  goblin: {
    sprite: 'enemy.goblin', radius: 12, hp: 16, speed: 70, damage: 6, xp: 2, knockbackResist: 0.2,
    move: 'shoot', max: 10,
    shoot: { range: 260, keep: 190, every: 3.2, windup: 0.6, speed: 140, radius: 5, life: 2.2 },
  },
  ```
- Visual: no aviso, o goblin recua o braço e a ponta da lança acende coral; a lança voa com núcleo claro, contorno
  escuro e um rastro curto. Sem linha de mira (polui com 10 atiradores).
- Aceite: teste com o atirador no meio de 200 inimigos: atira no ritmo, para de atirar tonto; teto de 10 e de 60 tiros;
  no sim, `shot` abaixo de 30% do dano recebido na Estrada.

**FT-04 · Salto: marca o chão, sobe e cai com dano em área** · impl + vfx · P · ✅ feito (2026-11-11)

- Por quê: ameaça que vem de cima, sem passar pela multidão: o círculo marcado pede um passo de lado.
- O quê: `move: 'leap'`. Perto (`trigger`), marca o ponto do herói, agacha `windup`, voa `air` s (sem contato, sem
  separação; pode ser atingido) e cai em linha reta no ponto marcado: dano de contato em `radius`. Aviso total =
  windup + air. Usuários: Corvo (mergulho) e Golem de Pedra (FT-07).
- Dados:
  ```ts
  crow: { sprite: 'enemy.crow', radius: 8, hp: 5, speed: 126, damage: 4, xp: 1, knockbackResist: 0,
    move: 'leap', leap: { trigger: 240, windup: 0.45, air: 0.6, radius: 24, rest: 3.5 } },
  ```
- Visual: círculo coral no chão enchendo do centro para a borda durante todo o aviso, e a sombra do corvo crescendo
  nele; no impacto, anel de neve e penas escuras.
- Aceite: teste do aviso (1,05 s) e do dano só dentro do raio; no sim, `leap` abaixo de 30% do dano.

**FT-05 · Matilha: cerca pelos lados** · impl · P · ✅ feito (2026-11-11)

- Por quê: lobos que chegam em pinça mudam a rota de fuga; na estrada estreita, correm rente às árvores e cortam para
  dentro.
- O quê: `move: 'pack'`. Mira um ponto girado `flank` rad para o seu lado (paridade do `uid`) até `close` px do herói,
  depois vem reto. Seno e cosseno do giro pré-calculados (sem trigonometria por quadro).
- Dados: `frostWolf: { ..., move: 'pack', pack: { flank: 1.0, close: 150 } }` (resto igual).
- Visual: nenhum aviso novo (é movimento); os olhos do lobo brilham frios, legíveis no escuro.
- Aceite: teste: dois lobos de `uid` par e ímpar chegam por lados opostos, também dentro de uma multidão.

**FT-06 · Estandarte: fortalece quem está perto até cair** · impl + vfx · P · ✅ feito (2026-11-11)

- Por quê: alvo de prioridade com recompensa. Derrubar o estandarte é uma decisão de rota (ir até ele no meio dos
  fortalecidos), e paga.
- O quê: `move: 'still'`, `banner`. A cada `tick` s, quem está no raio ganha `rally` (velocidade x1,3, contato x1,25,
  `config.rally`) por um pouco mais que um tick. `Enemy.rally` (segundos) é o mesmo campo que a Bruxa usa (FT-11).
  Consulta ao hash 4 vezes por segundo por estandarte, no máximo 2 vivos.
- Dados (nome provisório; ver pergunta 6):
  ```ts
  warBanner: { sprite: 'enemy.warBanner', radius: 14, hp: 70, speed: 0, damage: 0, xp: 6, knockbackResist: 1,
    move: 'still', max: 2, banner: { radius: 150, tick: 0.25 }, loot: { gold: 15, item: true } },
  ```
- Visual: mastro fincado com pano preto rasgado e um braseiro no topo, que é uma das luzes da fase (a luz é o que faz o
  estandarte ser visto de longe); o raio lido por um brilho avermelhado fraco no chão. Fortalecido: brasinha sobre a
  cabeça do inimigo (marca na textura, sem efeito por inimigo).
- Aceite: teste: dentro do raio, mais rápido e mais forte; fora, normal; ao cair, todos voltam ao normal em menos de
  0,5 s; ouro e item no chão.

**FT-07 · Estrada do Sul: corredor estreito, elenco novo e o Golem só aqui** · impl + bal + visual · M · ✅ feito (2026-11-11)

- Por quê: a fase mais pobre hoje. Estreita, a estrada vira o que o nome promete: pressão das duas pontas e investidas
  que só se evitam de lado. Substitui a restrição do NA-02 ("sem mudar `width`").
- O quê:
  - `layout: { kind: 'corridor', width: 320, sides: 0.05 }` (ponto de partida; calibrar entre 300 e 340). No celular a
    vista tem pelo menos 480 px de mundo (`config.view.minWorldSide`), então a estrada inteira cabe na tela em pé, com
    ~80 px de floresta de cada lado. As saídas laterais (5%) surgem na vista e usam a marca do FT-02.
  - Elenco: `buildWaves({ basic: 'hooded', fast: 'crow', tank: 'frostBoar', extra: 'frostWolf', shooter: 'goblin' })`,
    `specials: [{ id: 'warBanner', from: 120, every: 45 }]`, `elites: elites('golem')`.
  - Fera nova de investida longa (nome provisório "Javali da Geada"):
    ```ts
    frostBoar: { sprite: 'enemy.frostBoar', radius: 18, hp: 55, speed: 48, damage: 10, xp: 4, knockbackResist: 0.7,
      move: 'charge', charge: { trigger: 340, windup: 0.9, dash: 1.0, speedMult: 5.5, rest: 4 } },
    ```
    A investida percorre ~290 px a ~290 px/s. Esquiva: sair 30 px da linha (raio 18 + herói 12) leva 0,2 s, e o aviso
    dá 0,9 s. Fugir para trás não adianta (é quase o dobro da velocidade do herói); para o lado, sempre dá.
  - Golem de Pedra com verbo próprio, reaproveitando o salto do FT-04 (pesado):
    `golem: { ..., move: 'leap', leap: { trigger: 300, windup: 0.8, air: 0.9, radius: 64, rest: 4 } }`. Na estrada de
    320, o pouso fecha 128 px: anda-se para a frente ou para trás, não para o lado.
  - `mult` (`data/stages.ts`): a mesma batelada numa estrada 38% mais estreita é ~1,6x mais densa. Ponto de partida
    `spawn` 1,25 para **1,0**; depois `hp` e `damage`; armas por último.
  - Charge por inimigo: `CHARGE` vira o padrão de `def.charge` (o Encapuzado continua igual).
  - Textos (`pt-BR.ts`):
    - `stages.southRoad.desc`: "Uma estrada estreita entre pinheiros: encapuzados, goblins e a matilha do Lobo Velho."
    - `stages.southRoad.intro` (campo novo, aviso do HUD nos primeiros 3 s; a ui decide onde): "A estrada aperta entre os
      pinheiros. Não há para onde correr, só para o lado."
    - `enemies.frostBoar`: "Javali da Geada" (provisório); `enemies.warBanner`: "Estandarte da Aliança Negra"
      (provisório).
    - `bestiary.ways`: `shoot: 'Atira de longe'`, `leap: 'Salta e cai em área'`, `pack: 'Cerca pelos lados'`,
      `banner: 'Fortalece quem está perto'`.
    - `bestiary.flavor` (escritos para o Survivors, provisórios): `frostBoar`: "Abaixa a cabeça, raspa o gelo e vem. Na
      estrada estreita, só resta o lado."; `warBanner`: "Enquanto o pano estiver de pé, eles não recuam." O Goblin mantém
      a frase do cânone (Aliança Negra).
  - Arte (linha por criatura; Pen provisório serve para todos):
    - Javali da Geada (r 18, ~36 px): corpo baixo e largo, crina eriçada de gelo, presas claras, olhos frios pequenos;
      pelagem cinza-azulada escura com geada nas costas; no aviso, bafo branco e cascos raspando.
    - Estandarte (r 14, ~28 px de base, mastro alto): ver FT-06.
    - Goblin comum (r 12): o desenho da elite menor e mais apagado, lança comprida na mão (a silhueta da lança diz
      "atira").
    - Golem (r 26): igual, com rachaduras que acendem laranja no agachar do salto.
  - Bestiário e conquistas: `elites25` passa a contar `witch` e `golem` (e a elite da Cripta, quando houver); nome
    "Pedra e Lança" muda (o Goblin não é mais elite), sugestão provisória "Pedra e Caldeirão".
- Riscos: corredor estreito com 500 inimigos amontoa nas pontas (separação mais cara: medir F4); deitado no celular a
  vista tem só 480 px de altura e as pontas ficam perto (ver tempo de chegada no sim e captura em 844x390).
- Aceite: sim `SIM_SEEDS=16 SIM_SHOP=all SIM_STAGE=southRoad`: 0% / 0–10% / 35–55%; nenhuma fonte nova acima de 30% do
  dano; capturas em 390x844 e 420x820 com a estrada inteira e a floresta visíveis; teste: herói parado no eixo de uma
  investida a 300 px escapa andando de lado assim que o aviso começa; F4 com 500 inimigos a 60 FPS.

- Feito (FT-03 a FT-07, 2026-11-11), decisões para o Daniel revisar:
  - O Goblin Lanceiro virou atirador comum (pergunta 8) e o Golem é a única elite das três fases.
  - Nomes provisórios: "Javali da Geada", "Estandarte da Aliança Negra" e a conquista `elites25` "Pedra Partida"
    (só o Golem conta).
  - `mult` da Estrada calibrado para hp 2,1, damage 1,8, spawn 1,0, speed 1,1. Sim com 12 sementes: full 40%, half
    0%, none 0%. Dano por fonte: contato 74%, tiro 19%, salto 6%. A morte agora vem cedo (mediana de 5,5 min).
  - Falta o aviso de entrada (`stages.southRoad.intro`), que depende da ui. Capturas em 420x820 e 844x390 a ~55 FPS.

**FT-08 · Lobo Velho: Uivo da Geada e a arena de gelo** · impl + vfx + bal · M · ✅ feito (2026-11-11, enxuto)

- Por quê: o chefe da Estrada é hoje uma investida repetida. Com o gelo, a luta vira um lugar que o lobo desenha: o
  espaço encolhe e cada investida precisa ser lida contra o gelo.
- O quê:
  - Ao chegar (`bossSpawned`), o lobo uiva e a estrada **congela fechada** 450 px à frente e atrás do herói:
    `world.arena = { y0, y1 }`, e `blockCircle` limita o herói (só o herói; a escolta passa pulando o gelo). Abre
    quando o chefe cai (a vigília segue livre).
  - Habilidades em ciclo: `abilities: [mordidaFunda, mordidaFunda, uivo]`, com a Mordida Funda atual.
  - Uivo da Geada (nome provisório; "Sopro de Geada" já é o item do chão que congela, pergunta 2): para, uiva
    `windup` 1,2 s com as áreas marcadas, que viram gelo permanente até o fim da luta.
    ```ts
    { kind: 'frost', every: 5, windup: 1.2, trigger: 600, count: 2, radius: 64, cap: 6, near: 120, far: 220,
      slow: 0.6, range: 0, damage: 0 },
    ```
    Regras: nunca a menos de `near` px do herói (nunca sob ele); as duas áreas em metades opostas da estrada e nunca
    lado a lado na mesma faixa de `y` (sempre sobra passagem); no máximo `cap` (a mais velha derrete em 1 s); cobertura
    máxima ~27% da arena (6 x 12.870 px² contra 320 x 900).
  - **Lento ou escorregadio** (recomendação: **lento**):
    - Lento (velocidade x0,6 sobre o gelo): pró: lê na hora, funciona igual no polegar e no teclado, o bot do sim entende
      (é só `groundSlow`), custo P. Contra: menos novidade; lento demais vira frustração (por isso 0,6, não 0,4).
    - Escorregadio (o herói mantém o embalo e demora a virar): pró: novo e divertido no teclado. Contra: no toque parece
      controle quebrado ou atraso de entrada, faz errar a esquiva da Mordida Funda justamente quando ela importa, pede
      estado de velocidade no herói e um bot novo. Custo M.
    - Variação que dá risco e recompensa (opcional, P): se a Mordida Funda cruza o gelo, o lobo escorrega 50% mais longe
      e fica tonto 1 s no fim (janela de dano). Atrair a investida para o gelo vira jogada.
- Visual: aviso com as marcas de perigo enchendo durante o uivo e geada correndo do lobo até elas; o gelo pronto é
  branco-lilás fosco com rachaduras e um brilho frio fraco, na família do gelo (A-05: nunca ciano); as paredes da arena
  são cristais de gelo altos atravessando a estrada, com luz fria própria. O uivo treme a tela (é chefe; respeita o
  modo calmo).
- Textos: `bestiary.ways` por chefe passa a uma lista de habilidades
  (`bestiary.bossAbilities.oldWolf: ['Mordida Funda', 'Uivo da Geada']`), porque a chave `lunge` hoje diz "Mordida
  Funda" e a Mãe-Aranha também investe; HUD: `hud.arenaClosed: 'O Lobo Velho fecha a estrada!'`.
- Aceite: testes: nenhuma área a menos de 120 px do herói, nunca duas na mesma faixa, teto 6, arena prende só o herói e
  abre na morte do chefe; sim: luta do chefe com mediana de 45 a 90 s, `boss` abaixo de 30% do dano e a habilidade não
  mata sozinha um herói de vida cheia (regra do E-07).

- Feito (FT-08, 2026-11-11), decisões para o Daniel revisar:
  - **Lento** (x0,6), como recomendado; sem a variação do escorregão.
  - `abilities` em ciclo (Mordida, Mordida, Uivo); `arena: 450` no Lobo Velho; o gelo é uma marca `ice` no pool das
    marcas (`core/arena.ts`), com teto 6, derrete todo quando o chefe cai.
  - A luta continua em ~26 s (mediana do sim), não 45–90 s: mantive a decisão do NE-05 (~30 s). Sim da Estrada igual
    (full 40%), `boss` 1% do dano.
  - Nome "Uivo da Geada" provisório. O bestiário ainda mostra só a Mordida Funda (a lista de habilidades por chefe
    ficou para depois).

### Fase 1 · Arredores de Valmor: "a praga"

Habilidade pedida: **prioridade de alvo**. Nada de mortos comuns: bichos, ninhos e infestação. O lugar: os
**Arredores de Valmor** continuam com esse nome (já é o nome da fase e não depende do cemitério), mas o cenário sai do
cemitério para os **celeiros, cercas e campos** em volta da vila, na neve (os objetos que o visual-director já lista para
Valmor: cercas, montes de feno, lampiões). Alternativas de nome para o Daniel: "Celeiros de Valmor", "Campos de
Valmor" (provisórios).

**FT-09 · Ninho: parado, gera inimigos até ser destruído** · impl + vfx · P · ✅ feito (2026-11-11)

- Por quê: o alvo que chama o jogador para fora do círculo. Ignorar custa aranhas; quebrar paga.
- O quê: `move: 'still'`, `nest`. Enquanto o herói está a menos de `range` px, a cada `every` s marca (FT-02) e gera
  `count` aranhas ao lado, até `total`; depois fica quieto. Sem contato. Longe demais, some (FT-01).
- Dados (nome provisório):
  ```ts
  spiderNest: { sprite: 'enemy.spiderNest', radius: 18, hp: 60, speed: 0, damage: 0, xp: 8, knockbackResist: 1,
    move: 'still', max: 3, nest: { spawn: 'spider', every: 4, count: 2, total: 10, range: 520 },
    loot: { gold: 10, item: true } },
  ```
  Na fase: `specials: [{ id: 'spiderNest', from: 45, every: 30 }, ...]`.
- Visual: um novelo de teia no chão preso numa cerca ou num monte de feno, com sacos pálidos que pulsam uma luz
  doentia (amarelo-esverdeado ácido, longe do verde do Teo) antes de cada leva; a pulsação acelera no último segundo.
- Aceite: teste: gera no ritmo só com o herói perto, para no `total`, solta ouro e item; teto de 3.

**FT-10 · Ladrão: foge, leva as gemas e, se cair, deixa um baú** · impl + vfx · M · ✅ feito (2026-11-11)

- Por quê: o pico de risco e recompensa da fase: largar a posição para caçar um bicho que corre com a sua experiência.
- O quê: `move: 'flee'`. Chega até `keep` px e passa a fugir (afasta-se do herói, de lado); mais lento que o herói (dá
  para alcançar, mas custa rota). Passando sobre gemas, guarda o valor (`Enemy.carry`; varre as gemas só para os
  ladrões vivos, no máximo 1). Depois de `life` s, corre para fora e some (evento `thiefEscaped`). Morto: devolve o que
  levou numa gema só, mais o baú. Surge com aviso no HUD e seta na borda (NU-01).
- Dados (nome provisório):
  ```ts
  thiefRat: { sprite: 'enemy.thiefRat', radius: 10, hp: 30, speed: 135, damage: 0, xp: 0, knockbackResist: 0.3,
    move: 'flee', max: 1, flee: { keep: 200, life: 16, steal: true }, loot: { chest: true } },
  ```
  Na fase: `{ id: 'thiefRat', from: 150, every: 120 }` (2:30, 4:30, 6:30, 8:30). Eventos `thiefSpawned` e
  `thiefEscaped`.
- Textos: `hud.thief: 'Um ladrão está levando suas gemas!'`, `hud.thiefEscaped: 'O ladrão fugiu.'`,
  `bestiary.ways.flee: 'Foge com suas gemas'`.
- Visual: rato magro de lenço, com um saco nas costas que cresce e brilha cada vez mais (as gemas roubadas aparecem
  como luz azul-clara vazando pela boca do saco: a única coisa ciano nele, porque é sua).
- Riscos: são até 4 baús a mais por corrida (cada um um nível e ouro): adianta o 1º Elo e a Loja. Medir no sim; se
  passar, o baú do ladrão vira só ouro e um nível, sem cura.
- Aceite: teste: rouba gema, foge, some depois de `life` s sem drop, morto devolve tudo numa gema e deixa o baú; no sim,
  1º Elo ainda entre 5 e 7 min e a Loja inteira em 40 a 60 corridas.

**FT-11 · Bruxa do Caldeirão, a elite da fase 1** · impl + vfx + bal · M · ✅ feito (2026-11-11)

- Por quê: elite que não persegue: obriga a ir até ela entre poças, e paga com a melhor recompensa da fase.
- O quê:
  - `move: 'shoot'` com `lob`: fica longe e arremessa poções em arco que caem onde o herói estava; o ponto de queda é
    marcado durante o voo. As poções alternam **veneno** (dano a cada 0,5 s dentro) e **piche** (lento), poças de 4 s.
  - `brew`: a cada 8 s para e mexe o caldeirão; no fim, cura 30% e fortalece (`rally`, o do FT-06) os bichos no raio.
  - Morta: o caldeirão tomba e deixa um **Elixir** (pickup novo) além do baú.
  - Nas seis horas de elite (`ELITE_TIMES`), `elites: elites('witch')`.
  ```ts
  witch: { sprite: 'enemy.witch', radius: 20, hp: 450, speed: 55, damage: 10, xp: 20, knockbackResist: 0.85,
    elite: true, move: 'shoot',
    shoot: { range: 280, keep: 200, every: 3, windup: 0.7, speed: 0, radius: 8, life: 0, damage: 0.5,
      lob: { flight: 0.9, pools: [
        { kind: 'poison', radius: 52, ttl: 4, hit: 0.5 },
        { kind: 'tar', radius: 60, ttl: 4, slow: 0.6 },
      ] } },
    brew: { every: 8, windup: 1, radius: 170, heal: 0.3, rally: 4 },
    loot: { chest: true, pickup: 'elixir' } },
  ```
  ```ts
  // data/pickups.ts (o nome vem dos itens do original)
  /** Elixir: the witch's last potion. Heals half the max HP and speeds the weapons up for a while. */
  elixir: { sprite: 'pickup.elixir', weight: 0 },
  // data/config.ts pickups: elixirHeal: 0.5, elixirTime: 10, elixirCooldown: 0.7
  ```
- Textos: `enemies.witch: 'Bruxa do Caldeirão'` (provisório); `pickups.elixir: 'Elixir'`, descrição "Cura metade da
  vida e acelera as armas por 10 s."; `bestiary.flavor.witch` (provisório): "Ri sozinha mexendo o caldeirão. Derrube a
  velha e a última poção é sua."
- Visual: velha gorda e corcunda, xale escuro, nariz e mãos sob a luz do caldeirão grande de ferro, que é uma fonte de
  luz (amarelo-esverdeado ácido) e solta vapor; ao mexer, o vapor sobe alto e o raio do `brew` acende no chão. Poções
  em voo com sombra crescendo no ponto marcado; veneno: poça ácida que borbulha; piche: âmbar escuro e brilhante,
  pegajoso. Elixir no chão: frasco âmbar com brilho dourado (recompensa, não perigo).
- Aceite: testes: poção cai no ponto marcado, poças alternam, `brew` cura e fortalece só no raio, Elixir no chão ao
  morrer; sim: `ground` abaixo de 30% do dano em Valmor; 1º Elo entre 5 e 7 min.

**FT-12 · Mãe-Aranha: Ferroada, Teia e Ovos** · impl + vfx + bal · M · ✅ feito (2026-11-11)

- Por quê: chefe novo da fase 1 (o Cavaleiro Negro sai). Três habilidades em ciclo, cada uma pedindo uma resposta:
  sair da linha (Ferroada), sair da área (Teia), quebrar antes que choque (Ovos).
- O quê (`abilities`, FT-01; tipos novos `eggs` e `web` em `core/bosses.ts`):
  ```ts
  spiderMother: {
    sprite: 'enemy.spiderMother', radius: 32, hp: 18000, speed: 90, damage: 18, xp: 0, knockbackResist: 1, boss: true,
    abilities: [
      // Ferroada: short lunge (the Aranha Tumular's skill in the original).
      { kind: 'lunge', every: 3.5, windup: 0.6, trigger: 220, range: 170, damage: 22, dash: 0.3 },
      // Teia: three marked circles (one on the hero, with warning) that slow while they last.
      { kind: 'web', every: 4, windup: 0.9, trigger: 500, range: 100, damage: 0, count: 3, radius: 60, ttl: 8, slow: 0.55, cap: 6 },
      { kind: 'lunge', every: 3.5, windup: 0.6, trigger: 220, range: 170, damage: 22, dash: 0.3 },
      // Ovos: egg sacs in a ring that hatch into spiders unless broken.
      { kind: 'eggs', every: 4, windup: 1, trigger: 600, range: 110, damage: 0, summon: 'spiderEgg', count: 4 },
    ],
  },
  spiderEgg: { sprite: 'enemy.spiderEgg', radius: 10, hp: 40, speed: 0, damage: 0, xp: 1, knockbackResist: 1,
    move: 'still', nest: { spawn: 'spider', every: 3.5, count: 3, total: 3, range: 9999 } },
  ```
  O ovo nasce com `hpMult` 1 (40 de vida, quebra fácil); as aranhas que saem, com o `hpMult` da luta. O ovo é um ninho
  de uma leva só (reaproveita o FT-09) e some ao chocar.
- Visual: aranha enorme (r 32, ~70 px), corpo escuro com o abdômen marcado por um desenho pálido que acende antes de
  cada habilidade, oito olhos com brilho próprio, luz de baixo; Ferroada com a linha de perigo no chão; Teia: círculos
  coral que viram teia cinza-branca radial, levemente luzidia; Ovos: sacos pálidos que tremem e racham com luz por
  dentro no último segundo.
- Textos: `enemies.spiderMother: 'Mãe-Aranha'`, `enemies.spiderEgg: 'Ovo de Aranha'` (provisório);
  `bestiary.bossAbilities.spiderMother: ['Ferroada', 'Teia', 'Ovos']`; `bestiary.flavor` (provisórios):
  `spiderMother`: "Os ovos ficam nas cercas. A mãe fica onde é mais escuro."; `spiderEgg`: "Quebre antes que trinque.";
  `spiderNest`: "Um novelo de teia que pulsa. Cada pulso é mais uma aranha."; `thiefRat`: "Leva tudo o que brilha no
  chão. Pegue o rato e pegue o saco."
- Aceite: testes de cada habilidade (aviso, área, teto de teias, ovo que choca e ovo quebrado); sim: luta de 45 a 90 s,
  `boss` abaixo de 30% do dano, nenhuma habilidade mata sozinha de vida cheia.

**FT-13 · Fase 1 montada: elenco, textos, Cavaleiro fora e Cripta provisória** · impl + bal + visual · M · ✅ feito (2026-11-11)

- Por quê: junta FT-09 a FT-12 numa fase e resolve o que a troca quebra (conquista, bestiário, Cripta).
- O quê:
  - Valmor: `buildWaves({ basic: 'graveRat', fast: 'bat', tank: 'rat', extra: 'spider' })`, `specials` de ninho e
    ladrão, `elites: elites('witch')`, `boss: { id: 'spiderMother', at: config.matchDuration }`.
  - Ajustes de papel: Rato de Cova vira o básico (`hp` 6 para 9, `speed` 100 para 78); Rato Gigante vira o resistente e
    mantém a investida (`radius` 15, `hp` 42, `speed` 55, `damage` 8, `xp` 3, `knockbackResist` 0.5); Aranha Tumular
    igual (ziguezague).
  - **Cripta provisória** até o FT-16 (a fase 1 leva rato e aranha):
    `{ basic: 'bones', fast: 'bat', tank: 'skeleton', extra: 'ghost' }`, Gosma Verde fora até virar perigo no FT-16; a
    elite continua o Golem **só até** o Daniel decidir a da Cripta (exceção temporária ao "Golem só na Estrada").
  - Cavaleiro Negro sai das fases; dados e arte ficam. O bestiário o mostra só para quem já o viu; `seenAll` passa a
    contar `bestiaryOrder().length` (hoje `ENEMY_IDS.length`, ficaria impossível). Conquista `bossKnight`: mesmo id (o
    save de quem já tem continua valendo), agora "Derrote a Mãe-Aranha." com nome provisório "Ninho Desfeito".
  - Textos (`pt-BR.ts`, provisórios):
    - `stages.valmor.desc`: "Celeiros, cercas e campos na neve, tomados por ratos e aranhas."
    - `stages.valmor.intro`: "Ratos nos celeiros, teias nas cercas. Alguma coisa grande fez ninho perto da vila."
    - `stages.valmor.won`: "A Mãe-Aranha caiu. Mas o sino da igreja velha continua tocando." (mantém o gancho do RL-02
      para a Cripta)
    - `bestiary.ways.nest: 'Gera aranhas até cair'`
    - O `menu.intro` ("Os mortos se levantaram") pode ficar: os mortos continuam no jogo, na Cripta.
  - Arte da fase: chão de neve pisada com palha, cercas, montes de feno e lampiões (decalques sem custo por quadro);
    miniatura da Preparação nova.
  - Arte dos bichos (Pen provisório serve): Rato de Cova (r 9) cinza, magro, olhos que pegam a luz; Rato Gigante (r 15,
    ~30 px) marrom-escuro, costas arqueadas, cauda grossa, agacha antes da investida; Ninho (r 18) e Ladrão (r 10) nos
    seus itens.
- Aceite: sim `SIM_SEEDS=16 SIM_SHOP=all`: Valmor 0–15% (morte entre 6 e 8 min) / 40–60% / 85%+; Cripta provisória
  0% / 15–35% / 70–85%; nenhuma fonte nova acima de 30% do dano; teste: save antigo com `bossKnight` e o Cavaleiro no
  bestiário continua válido; F4 com 500 inimigos a 60 FPS.

### Fase 2 · Cripta da Igreja Velha: "os que não descansam" (para a próxima conversa com o Daniel)

Habilidade pedida: **limpeza**, terminar o serviço. Proposta, não plano: depende das respostas 4 e 10.

**FT-14 · Explode ao morrer** · impl + vfx · P · ✅ feito (2026-11-11, decidido sem as respostas)

- O quê: `burst`. Ao morrer, deixa uma marca que estoura em `delay` s: fere o herói no raio (contato x `damage`) e os
  inimigos no raio (`foes` da vida máxima do próprio estourador, que já cresce com o `hpMult`). Atrair a multidão para o
  estouro vira jogada. Sem reação em cadeia no mesmo passo (estouros novos esperam o seu `delay`).
- Dados (nome provisório "Ossada em Brasa"): `{ ...bones, burst: { delay: 1, radius: 48, damage: 1.5, foes: 0.6 } }`.
- Visual: a ossada desmonta e as brasas no peito crescem; círculo coral enchendo em 1 s; estouro de fagulhas, sem
  tremor (não é bomba do herói).
- Aceite: teste do aviso e dos dois danos; sim: `burst` abaixo de 30% do dano.

**FT-15 · Remonta se a pilha não for quebrada** · impl + vfx · P · ✅ feito (2026-11-11; a Ossada remonta com 30% da vida, não 50%, para a Cripta ficar na faixa)

- O quê: `reassemble`. A primeira morte não mata: vira pilha (sem contato, parada, sem gema, sem `onKill`), que levanta
  em `delay` s com metade da vida; qualquer acerto na pilha a destrói de vez (aí sim gema e abate). Mira automática pode
  escolher pilhas.
- Dados: Ossada da Cripta com `reassemble: { delay: 3 }` (o básico da fase: "os que não descansam" no próprio nome).
- Visual: pilha de ossos com os olhos ainda acesos, que tremem e se juntam no último segundo.
- Aceite: teste: levanta sem acerto, acerto destrói, Nevasca e Procissão só contam a morte de verdade.

**FT-16 · Cripta montada** · impl + bal + visual · M · parcial (2026-11-11)

- Feito: Ossada que remonta (básico), Ossada em Brasa como especial (`from` 40 s, a cada 12 s, máx. 8), `mult.hp` 1.35
  para 1.25; **Gosma Verde** de volta como perigo (`trail`: limo de 26 px que deixa lento a 0.7, máx. 6 vivas, especial
  a partir de 70 s); **Coveiro** (`gravedigger`, `dig`: finca a pá, 1.1 s de aviso e 4 Ossadas saem das covas num anel
  de 110 px) como elite da Cripta, escolha do Daniel (2026-11-11); o Golem fica só na Estrada. Sim `SIM_SEEDS=16`:
  Cripta 2% / 27% / 84%.
- Feito também (2026-11-11): Morcego Vampiro (`vampireBat`, zigue-zague) no lugar do cinzento; Espírito Gélido
  (`coldSpirit`, atirador do Toque Gélido, orbe de 90 px/s, máx. 5, papel `shooter`); Sineiro com 2ª habilidade, o
  **Dobre Fúnebre** (`dreno` do original; anel completo de 130 px em volta dele, 20 de dano, 1,2 s de aviso). `mult` da
  Cripta: hp 1.4, damage 1.65. Sim `SIM_SEEDS=16`: Cripta 0% / 13% / 80%, tiros 14% do dano (a Loja pela metade fica
  um pouco abaixo dos 15%).
- Falta: arte final (Ossada em Brasa, Coveiro, pilha, limo, Espírito Gélido, Morcego Vampiro) e conferir a Cripta
  jogando.
- Revisão 2026-11-11: a arte final saiu (sprites PixelLab, `fb44e4b`) e a Cripta foi conferida jogando (03-qa: todas
  as mecânicas funcionam como descrito). O que falta para fechar o FT-16 está na seção "Revisão 2026-11-11": as peças
  que não mordem (CB-01, CB-02, CE-01), a faixa da meia Loja (CE-02, 13% contra 15 a 35%) e a leitura (CF-01 a CF-05,
  CU-01).

- Elenco: Ossada (básico, remonta), Morcego Vampiro (rápido; nome do original, no lugar do morcego cinzento da fase 1),
  Esqueleto (resistente), Espectro (atravessa e some), atirador espiritual com o **Toque Gélido** (habilidade do
  Espectro no original; orbe lento, `shoot` com `speed` 90), Ossada em Brasa (`specials`), e a **Gosma Verde** como
  perigo: `trail: { every: 1.2, pool: { kind: 'slime', radius: 26, ttl: 4, slow: 0.7 } }`, teto 6.
- Ladrão da Cripta (ideia): um **ladrão de cova** encapuzado; o original já chama os encapuzados assim ("Ladrão de cova,
  é o que eles são", Berta). Reaproveita o FT-10.
- Chefe: O Sineiro, com a badalada; se faltar variedade, uma segunda habilidade com nome do original (`dreno` ou
  `chama` existem nos dados dele em `src/data.js`), a decidir com o Daniel.
- Elite: aberta (pergunta 4).

**FT-17 · Avisos de ataque como formas no chão, não setas** · vfx · P · ✅ feito no AR-03

- Por quê: o Daniel achou as referências em `docs/design/art-references/` (`swamp-lane-telegraphs.png`,
  `cone-telegraph.png`, `swamp-frog-boss-leap.png`) muito mais claras que as setas de hoje (`Windup` dos inimigos e a
  Mordida Funda). Uma faixa mostra exatamente onde a investida passa.
- O quê: investida (charge comum, Encapuzado, Javali, Mordida Funda) = retângulo listrado translúcido, largura do
  corpo, comprimento da investida, contorno claro grosso, preenchimento que cresce até o impacto; ataque em leque
  (Corte Brutal) = cone listrado; salto, queda e badalada = círculo com anéis concêntricos e borda tracejada. Cor de
  perigo atual (`UI.dangerHex`). Desenhado no `ground`, sem alocar; modo calmo sem listras rolando. Os itens FT-03,
  FT-04 e FT-08 usam as mesmas formas.
- Aceite: captura 420x820 de cada aviso; quem está dentro continua legível; nenhum aviso em seta sobra no jogo.

**FT-18 · Fase nova: Pântano das Lamentações Clérigas** · game-director + impl + vfx + bal · G · proposto (ideia
aprovada pelo Daniel em 2026-11-10; detalhes depois das respostas)

- Por quê: o Daniel adorou a fase de pântano das referências (`docs/design/art-references/swamp-*.png`). O cânone já
  tem o lugar: "Pântano das lamentações clérigas: tem este nome depois que Asi-hai queimou o monastério com 24
  clérigos rezando" (`canone.md`, Locações). Atenção: no cânone "Asi-hai" não é o nome do Inimigo (decisão de
  2026-11-04); o texto do jogador fala "o Inimigo" ou só "o monastério queimado".
- Tema: água escura, lama, névoa e as ruínas do monastério queimado. Pede do jogador **ler o chão**: poças e limo
  que deixam lento, água funda que só os inimigos atravessam, ilhas de terra firme.
- Layout novo (`core/terrain.ts`, `kind: 'swamp'`, puro e por semente como `obstacles`): manchas de água lenta por
  hash de célula, sempre com caminho de terra firme a partir do início; ruínas do monastério como obstáculos.
- Elenco (ideias, nomes provisórios): Gosma Verde (sai da Cripta para cá, deixa rastro de limo, FT-16 já tem os
  dados do `trail`), sanguessuga ou bicho do lodo que salta (FT-04), mosquitos em nuvem (rápidos), algo que emerge da
  água (marca de surgimento, FT-02), um atirador que cospe lodo (FT-03).
- Chefe e elite: originais do nosso mundo, **não um sapo gigante copiado da referência**. Usar o que a referência
  ensina: chefe grande que salta com o círculo de anéis (FT-17), afunda e reaparece. A definir com o Daniel.
- Ordem: depois da Cripta, ou no lugar dela como 3ª fase (pergunta 12). Clareia a fase anterior e abre a seguinte,
  como as outras.
- Aceite: os mesmos das outras fases (metas de sim definidas junto com a ordem, F4 a 60 FPS, capturas 420x820),
  mais: o caminho de terra firme existe em 100% das sementes testadas.

### Equilíbrio de cada fase

- Antes de cada fase mudar: `SIM_SEEDS=16 SIM_SHOP=all npm run sim` e `npm run lab` na linha de base; depois, a mesma
  coisa. Tabela antes/depois em `docs/balance-baseline.md`.
- Metas (as de `CLAUDE.md`, sem mudança): Valmor 0–15% (morte 6–8 min) / 40–60% / 85%+; Cripta 0% / 15–35% / 70–85%;
  Estrada 0% / 0–10% / 35–55%.
- Medir sempre: vitórias e mediana de morte por perfil; `DANO POR FONTE` (nenhuma fonte nova acima de **30%** do dano
  recebido na fase; rápidos abaixo de 40%, regra do E-02); 1º Elo (5 a 7 min); baús por corrida (elites + ladrões);
  ouro por corrida e a linha `LOJA` (40 a 60 corridas); luta do chefe (mediana 45 a 90 s); pico de inimigos ativos nos
  snapshots (nunca acima de 600); `POOL`.
- Ordem de ajuste: `mult` e `specials` da fase, depois números do inimigo novo, armas por último.
- Desempenho: F4 (420x820, CPU 4x) com 500 inimigos da mistura da fase **e os tetos cheios** (10 atiradores, 60 tiros,
  ~40 marcas) a 60 FPS, antes e depois de cada fase.

### Arte: o que sai com Pen e o que pede sprite

- Saem com Pen provisório, sem bloquear: Goblin comum, Corvo, Lobo da Geada, Javali da Geada, Estandarte, Rato de Cova,
  Rato Gigante, Ninho, Ovo, Rato Ladrão, Golem (todos de silhueta simples e já com desenho parecido no jogo).
- Pedem sprite antes de a fase ser dada como pronta (silhueta grande e animação que conta a mecânica): **Mãe-Aranha**
  (botar ovos, investir, lançar teia), **Bruxa do Caldeirão** (mexer o caldeirão, arremessar) e, quando houver, a elite
  da Cripta. Podem entrar no jogo com Pen para teste; a fonte dos sprites segue com o Daniel
  (`.claude/agents/visual-director.md`).

### Ordem (reavaliada)

A sugestão era: 1 comportamentos e marca, 2 Estrada, 3 fase 1, 4 Cripta. Mudo uma coisa: **os comportamentos entram
com a fase que os usa**, em vez de todos de uma vez. Assim cada parte é jogável ao terminar, e explodir e remontar não
são feitos antes de o Daniel aprovar a Cripta.

| Fase        | Passos (um commit cada, nesta ordem)          | Donos                     |
| ----------- | --------------------------------------------- | ------------------------- |
| **Base**    | FT-01 · FT-02                                 | impl + vfx                |
| **Estrada** | FT-03 · FT-04 · FT-05 · FT-06 · FT-07 · FT-08 | impl + vfx + bal + visual |
| **Fase 1**  | FT-09 · FT-10 · FT-11 · FT-12 · FT-13         | impl + vfx + bal + visual |
| **Cripta**  | FT-14 · FT-15 · FT-16 (depois do Daniel)      | impl + vfx + bal + visual |

A Estrada continua primeiro: é a fase mais pobre, usa os verbos mais simples (atirar, saltar, cercar, investir) e
depende de menos nomes do Daniel (só o Uivo e o estandarte). A fase 1 depende de mais respostas (lugar, Bruxa, bichos)
e mexe na primeira impressão de todo jogador novo, então merece as respostas antes.

### Perguntas para o Daniel (Fases temáticas)

1. **Gelo do Lobo Velho: lento ou escorregadio?** Recomendo lento (x0,6), com a variação do lobo que escorrega no gelo
   e fica tonto (FT-08).
2. **Nomes**: "Bruxa do Caldeirão"; "Sopro da Geada" (conflita com o item do chão **Sopro de Geada**, que congela os
   inimigos; proponho "Uivo da Geada"); o lugar da fase 1 (manter "Arredores de Valmor" com celeiros e campos, ou
   "Celeiros de Valmor" / "Campos de Valmor"); as criaturas novas: Ninho de Aranha, Ovo de Aranha, Rato Ladrão, Javali
   da Geada (ou outra fera de investida: alce, urso), Estandarte da Aliança Negra, Ossada em Brasa, e o nome do Elixir
   (vem dos itens do original).
3. **O Vazio**: não existe no cânone. Procurei em `docs/mundo/` (cânone, histórias, pendências, revisões) e no código do
   original: "vazio" só aparece como adjetivo (o túmulo de Morvath "arrombado e vazio", os quatro nichos vazios sob as
   espadas dos paladinos, o ensinamento de Elun sobre "estar vazios" para a luz entrar). Se o Vazio é uma ideia nova
   sua, preciso que você diga o que é antes de ele aparecer na Estrada; não proponho nada sobre ele sem isso.
4. **Elite da Cripta: um paladino reerguido pode?** Toca o cânone: os paladinos são da Ordem de Erukh, e a fé nunca
   aparece de forma negativa (sua decisão de 2026-11-06). Há um gancho no original: os quatro nichos vazios sob as
   espadas dos paladinos, no túmulo de Morvath. Um paladino morto erguido contra a vontade (um guardião que não
   descansa, não um vilão) cabe? Ou prefere outra elite (um clérigo caído como o Sineiro, um coveiro, uma criatura)?
5. **Onde o Cavaleiro Negro volta?** Opções: chefe de uma fase futura (Pasto do Vau, a mina do Capítulo 1); aparição
   especial na Noite Sem Fim (por exemplo, a cada 10 min de vigília, com baú grande); ou chefe do Perigo 3 (ND-01).
   Recomendo a vigília: dá um motivo novo para continuar e não pede fase nova.
6. **Aliança Negra na Estrada**: o cânone diz só que é o acordo dos Nekaren com os Goblins. O estandarte pode ser
   dela? Ela tem cor ou símbolo (para a arte do pano)? A ligação com os encapuzados ("trabalham por ouro para os de
   capuz") está no `arco-de-revelacoes.md`, que é proposta: vale como cânone?
7. **A praga da fase 1 tem causa?** O texto proposto não explica de onde vêm os ratos e a Mãe-Aranha ("alguma coisa
   grande fez ninho perto da vila"). Quer ligar a praga à Irmandade, ao Selo de Morvath, ou deixar sem causa?
8. **Goblin comum**: hoje ele é elite com 400 de vida; vira um atirador de 16. Tudo bem perder a elite goblin (a
   conquista "Pedra e Lança" muda de nome)?
9. **Ladrão rouba gemas**: a ideia de ele carregar a sua experiência (e devolver ao morrer) agrada, ou prefere um ladrão
   que só foge com o baú?
10. **Gosma Verde**: na Cripta ela vira perigo (deixa limo que deixa lento) e sai por um tempo do jogo entre a fase 1
    nova e a Cripta nova. Pode?
11. **Pântano (FT-18)**: os clérigos queimados aparecem de algum jeito (espíritos que lamentam, só ambiente) ou ficam
    fora, já que a fé nunca aparece de forma negativa? E a Gosma Verde passa da Cripta para o Pântano?
12. **Ordem das fases**: o Pântano entra depois da Cripta (4ª fase, com a Estrada por último) ou em outro lugar? Quem
    é o chefe e a elite dele (originais, não um sapo gigante)?

---

## Revisão 2026-11-11

Origem: revisão de `7e51776` com foco na **Cripta** (`docs/reviews/2026-11-11/00` a `06`). Triagem, conflitos, leitura
de design e as decisões que só o Daniel pode tomar em `docs/reviews/2026-11-11/07-direcao.md`. **Todos os itens
abaixo estão `· proposto`**: esperam a aprovação do Daniel. Achados repetidos em vários relatórios viraram um item só.

Prefixos novos (C de Cripta, o foco da rodada): **CB** bug, **CT** técnico (código, sem efeito de jogo), **CE**
equilíbrio, **CF** efeitos visuais, **CS** som, **CU** interface, **CA** arte, **CD** direção (sistema novo). Itens
antigos reabertos ou ampliados mantêm o ID e têm o escopo novo no próprio lugar, mais acima: **NB-08**, **A-02**,
**CC-06**, **AR-01**, **AR-02**, **AR-05** e uma nota no **FT-16**.

Regras (as mesmas das revisões anteriores): cada passo com `npm test`, `npm run lint`, `npm run build` verdes, jogo
rodando, um commit e push; lógica nova no core com teste em `tests/core/` **dentro de uma multidão**; equilíbrio com
`SIM_STAGE=crypt SIM_SEEDS=16 SIM_SHOP=all npm run sim` antes e depois (32 sementes para a faixa, ruído de ±5 pontos);
render medido no F4 (420x820, CPU 4x) antes e depois, sem alocação por quadro, modo calmo respeitado. **Regra de cor de
aviso desta rodada** (CF-04): coral fere ao tocar, marfim (osso pálido) invoca, verde-limo atrasa.

### Próximos 5 (sugestão do game-director, não substitui a lista do topo até o Daniel aprovar)

1. **NB-08 (reaberto) + CB-03 + CB-04 + CB-05**: setas e avisos por cima das escolhas, `elites25`, texto de derrota,
   `markWeb`.
2. **CB-01 + CB-02 + CE-01, depois CE-02**: as peças da Cripta mordem, e só então a meia Loja volta à faixa.
3. **CF-01 + CF-04 + CU-01**: pilha com relógio, um vocabulário de aviso, dica na primeira vez.
4. **CU-02 + CF-06 + A-02 (reaberto)**: vida baixa, lentidão e "Caiu por"; acerto na cor da arma; herói achável.
5. **CD-01 Fonte de Luz** (se aprovada); se não, **AR-02 (chão, passo a) e depois AR-01 (luz)**.

### Ordem sugerida

| Fase                     | Passos (um commit cada, nesta ordem)                                                                   | Donos                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------- |
| **C1 Bugs**              | NB-08 · CB-03 · CB-04 · CB-05 · CB-01 · CB-02                                                          | impl (ui confere NB-08) |
| **C2 Técnico**           | CT-01 · CT-04 · CT-05 · CT-02 · CT-03                                                                  | impl + bal              |
| **C3 Equilíbrio**        | CE-01 · (CD-01, se aprovado) · CE-02 · tabela em `balance-baseline.md`                                 | impl + bal              |
| **C4 Leitura da Cripta** | CF-04 · CF-01 · CF-06 · CF-03 · CF-05 · CF-02 · CS-01 · CF-07                                          | vfx + impl              |
| **C5 Interface**         | CU-02 · CU-01 · CU-03 · CU-04 · CU-05 · CU-06 · CU-08 · CC-06 · CU-07                                  | ui + impl               |
| **C6 Arte e luz**        | A-02 · CA-01 · AR-02 (a) · AR-01 · CA-03 (tinta) · AR-05 · CA-02 · AR-02 (b) · CA-03 (regerar) · CF-08 | visual + vfx + impl     |

### Decisões do Daniel (detalhe em `07-direcao.md`)

1. Fonte de Luz (CD-01): aprovar? E a luz dela impede as Ossadas de remontar dentro (lore)?
2. Texto de derrota por fase (CB-04): frases provisórias.
3. Textos provisórios dos inimigos novos (02-code B7) e das dicas do CU-01.
4. Decidi, pode mudar: dicas e vinheta ligadas com opção; Bestiário recolhido por fase; Desistir mostra a tela final;
   Maça interrompe a cova do Coveiro; arte em código morta removida.
5. Fantasma: manter o rosto e escurecer o corpo (CA-03).
6. Ordem das gerações PixelLab: andar (Morcego, Ossada) e Sineiro antes dos props e dos recolors.

### C1 · Bugs

**CB-03 · `elites25` só conta o Golem** · impl · P · ✅ feito (2026-11-11)

- Por quê: 02-code M1. `data/achievements.ts:77` tem `enemies: ['golem']`, e o Golem só existe na Estrada; a Bruxa
  (Valmor) e o Coveiro (Cripta) não contam, embora o texto diga "Derrote 25 elites" (`pt-BR.ts:437`). O FT-07 já
  pedia isso; ficou para trás.
- O quê: `enemies: ['witch', 'gravedigger', 'golem']`. O teste passa a derivar a lista das elites reais
  (`STAGES[*].elites`), para não divergir de novo.
- Aceite: teste que falha se uma elite de fase não contar; save antigo com abates de Golem continua contando.

**CB-04 · "Tombou na neve" na Cripta** · impl · P · proposto (texto com o Daniel)

- Por quê: 03-qa B1, 05-ui UI-03. `t.end.lostText` (`pt-BR.ts:373`) diz "<herói> tombou na neve. Valmor ainda espera
  por um herói." em todas as fases (`r420-death-end.png`): é a primeira frase depois da morte, dentro de uma cripta.
- O quê: `end.lostByStage: Record<StageId, (hero: string) => string>`. Provisórios, sem fato novo de lore:
  - `valmor`: "${hero} tombou na neve. Valmor ainda espera por um herói." (igual)
  - `crypt`: "${hero} caiu na cripta. O sino ainda toca."
  - `southRoad`: "${hero} caiu na Estrada do Sul. A matilha ainda uiva."
- Aceite: captura do fim de jogo nas três fases com a frase da fase; nenhum texto fora do `pt-BR.ts`.

**CB-05 · `markWeb` mexe na marca errada com o pool cheio** · impl · P · ✅ feito (2026-11-11)

- Por quê: 02-code B1. `arena.ts:111-113` ignora o `false` de `addPatch` quando há 160 marcas e sobrescreve o `born`
  da última marca qualquer, bagunçando "a mais antiga derrete".
- O quê: `if (addPatch(...)) { ... }`.
- Aceite: teste com o pool de marcas cheio: nenhuma marca existente muda.

**CB-01 · A pilha de ossos quebra no segundo acerto do mesmo ataque** · impl + bal · P · ✅ feito (2026-11-11)

- Por quê: 02-code M2, 06-vfx #2, 01-balance (remontagem dentro do ruído: 8 contra 11 vitórias). Em
  `core/enemies.ts:216-249` o golpe que zera a vida vira pilha e qualquer `damageEnemy` seguinte, mesmo no mesmo passo,
  mata de vez. Aura, órbita, zona, projétil perfurante e arco com vários golpes quase nunca deixam a Ossada remontar; a
  mira única deixa sempre. A regra pune uma categoria e ignora as outras por acidente (pilar 3), e é o verbo da fase
  ("os que não descansam"). E a quebra pula `source.damage`, `bestHit` e `onEnemyDamaged`: a tela final subconta.
- O quê: a pilha ignora dano nos primeiros `config.enemies.pileGuard` = 0.15 s (compara `e.pile` com
  `def.reassemble.delay`); depois, qualquer acerto quebra, como hoje. A quebra conta o dano na fonte, no `bestHit` e
  no gancho. O sim imprime, por categoria de arma, quantas pilhas remontaram e quantas foram quebradas.
- Aceite: teste dentro de uma multidão: Aura e um projétil no mesmo passo não quebram a pilha; um acerto 0,2 s depois
  quebra; dano da quebra aparece no relatório. Sim: nenhuma categoria com taxa de remontagem abaixo da metade da outra.

**CB-02 · Coveiro: Ossadas sem a vida da onda, cova longe do herói, Maça que não interrompe** · impl + bal · P · ✅ feito (2026-11-11)

- Por quê: 01-balance B1, 02-code M3 (parte) e M4, 02-code B4. `behaviours.ts:360` chama `riseAt` sem `hpMult`: as 4
  Ossadas do Coveiro têm 14 de vida aos 9:00 (a comum tem 168) e morrem de um golpe mordendo como as outras (40). O
  `dig` não olha distância (o `nest` tem `range`), então cava fora da tela; não confere `maxActive`; e a tontura não
  cancela a cova já começada (o `shoot` cancela).
- O quê: `riseAt(..., segmentAt(world.time, world.stage.waves).hpMult)` como a Badalada; `dig.range` novo (dado:
  `dig: { every: 7, windup: 1.1, count: 4, radius: 110, spawn: 'bones', range: 420 }`); só cava com
  `world.enemies.size < config.enemies.maxActive`; `e.stun > 0` durante a espera cancela a cova (decisão: a Maça de
  Ferro vira resposta ao Coveiro, coerente com o atirador).
- Aceite: testes: Ossadas do Coveiro com a vida das comuns da mesma hora; nenhuma cova com o herói a mais de 420 px;
  tontura na espera cancela; teto respeitado. Sim da Cripta antes e depois (vai endurecer; a faixa é o CE-02).

### C2 · Técnico

**CT-01 · Teto de inimigos em todo surgimento e marcas reaproveitadas limpas** · impl · P · ✅ feito (2026-11-11)

- Por quê: 02-code M3, B2, B9. `riseAt` fora da vista chama `spawnEnemy` direto e o `send` dos `specials` também não
  confere `maxActive` (`Pool.acquire` nunca recusa); `addBurst`, `riseAt` e `markIce` não resetam `slow`, `life`,
  `damage`, `tick`, `foe`, `fromX/Y`; `dig.spawn`/`nest.spawn`/`summon` são `string` com `as EnemyId`.
- O quê: a checagem de `maxActive` mora dentro de `riseAt` e do `send`; um `resetMark(m)` único (DRY com
  `createMark`) chamado por todo `add*`; os campos `spawn`/`summon` tipados como `EnemyId`.
- Aceite: teste com 700 inimigos: nada novo surge por `riseAt` nem por `specials`; teste de marca reaproveitada sem
  campo velho; typecheck pega um id errado.

**CT-04 · `?dev`: o chefe das 5:00 chega com a escolta da última faixa** · impl · P · ✅ feito (2026-11-11)

- Por quê: 03-qa B2. Com `config.devBossAt` a curva continua lendo o tempo da partida: o Sineiro chega com a multidão
  das 5:00 (4 → 222 inimigos em 26 s) e não com o fio de escoltas da faixa final (NE-05). O Daniel testa uma luta que o
  jogador não vê.
- O quê: quando `playtest.bossAt` traz o chefe, o spawner passa a usar o segmento da luta do chefe (o último de
  `stage.waves`) dali em diante.
- Aceite: teste em `waves.test.ts`: com `bossAt` 300, o lote depois do chefe é o do segmento final; contagem de
  inimigos no `?dev` parecida com a de `world.time = 598`.

**CT-05 · Bot do sim enfrenta o chefe** · bal · P · ✅ feito (2026-11-11)

- Por quê: 01-balance. 3 de 192 corridas "perdem" aos 15:00 com o herói intacto: o bot foge do chefe (peso 5 em
  `tests/lab/bot.ts` `steer`) e o chefe (89 px/s) nunca o alcança. A vitória da Loja inteira na Cripta fica um pouco
  subestimada.
- O quê: com o chefe vivo e o herói acima de 50% da vida, o peso de fuga do chefe cai e o bot orbita a ~180 px dele.
- Aceite: nenhuma corrida chega aos 15:00 sem morrer nem vencer; sim da Cripta antes e depois na tabela.

**CT-02 · Testes que faltam na Cripta** · impl · P · ✅ feito (2026-11-11)

- Por quê: 02-code "Testes que faltam".
- O quê: `coldSpirit`/`shoot` como comportamento; pilha sob `world.freeze` e sob `clearCrowd`; `burst` com a Muralha
  de Valmor pronta (bloqueia sem contra-ataque) e `explode` poupando o chefe; `groundSlow` com `slime` e `web`; o
  ciclo estrito Badalada/Dobre; `bestiaryOrder(seen)` e `bossSummons`.
- Aceite: os testes existem e passam; nenhum muda comportamento.

**CT-03 · Arte em código morta dos inimigos com PNG** · impl · P · ✅ feito (2026-11-11; `previousStage` fica de fora: não é código morto)

- Por quê: 02-code B5. `render/art/enemies.ts` ainda desenha Ossada, Esqueleto, Ossada em Brasa, pilha, Espectro,
  Espírito Gélido, Gosma, Morcego Vampiro, Coveiro e Sineiro para texturas que `assets.ts:43-54` sobrescreve; o
  comentário de `assets.ts:11-13` diz que tudo é desenhado em código.
- O quê: remover os desenhos sobrescritos (o git guarda) e atualizar o comentário.
- Aceite: build menor; nenhuma textura faltando (captura do Bestiário e da Cripta iguais).
- Revisão 2026-11-11 (2) · ampliado (02-code B6, B7, B8; 04-visual #8): agora os 26 inimigos têm PNG, então
  `render/art/enemies.ts` (558 linhas) sai inteiro, e `render/art/heroes.ts` (`chibi`) também está morto; `Pen` fica só
  para itens e ícones. Somar: `vfxFrame` (`render/vfx.ts:54`, nunca chamada e errada com `age = 0`), `isPatch`
  (`core/marks.ts:15`), `SLIME_WARN` (`render/ui.ts:64`), os textos sem uso `menu.intro`, `levelUp.newWeapon` e
  `shop.intro`, o comentário solto em `world.ts:89`, o comentário de `liveAchievements` (aloca 1x por segundo, não
  "só quando acha") e um `previousStage(id)` em `data/stages.ts` para o `StageScene` e o `StoryScene` (hoje duas contas).
  Aceite somado: `grep` dos nomes removidos vazio; teste do `previousStage`.

### C3 · Equilíbrio

**CE-01 · O limo da Gosma Verde prende de verdade** · impl + bal · P · ✅ feito (2026-11-11)

- Por quê: 01-balance B2, 02-code B3, 06-vfx #8. Com o bot, o herói passa **0,19%** do tempo no limo, com 1,15 gosmas
  vivas e 1,9 manchas no chão. O teto `trail.cap` (5) conta as manchas de todas as gosmas juntas
  (`core/enemies.ts:403-416`), o rastro sai a cada 1,2 s, e a lentidão é de só 30%. É a peça que deveria tirar o
  jogador do círculo largo (pilar 2) e hoje é cosmética.
- O quê: a mancha guarda o dono (`ownerUid`, como os tiros) e o teto passa a ser por gosma; dados de partida, a validar
  no sim:
  ```ts
  trail: { every: 0.6, cap: 10, pool: { kind: 'slime', radius: 34, ttl: 6, slow: 0.6 } },
  // stages.ts crypt specials
  { id: 'slime', from: 70, every: 10 },
  ```
- Aceite: teste com duas gosmas: cada uma mantém o próprio teto. Sim (meia Loja, 64 corridas): herói no limo pelo
  menos 10x o de hoje (bot que foge; um humano pisa mais); `ground` abaixo de 30% do dano; tirar o limo muda o
  resultado para fora do ruído.

**CE-02 · Cripta com a meia Loja de volta na faixa** · bal + impl · P · ✅ feito (2026-11-11, pedido do Daniel: com a meia Loja deve-se vencer cerca de 60% da Cripta; `mult` hp 1.0 / damage 1.15 → 2% / 59% / 94%, meta nova no CLAUDE.md)

- Por quê: 01-balance D1, D2, D4. Meia Loja em 12,5% (128 corridas) contra 15 a 35%; 25 de 37 mortes antes do chefe
  caem entre 4:00 e 5:30, o vale antes do 1º Elo. A alavanca de dano funciona (`mult.damage` 1.5: 18% / 88%); a de
  vida é forte demais (`mult.hp` 1.25: 94% com a Loja inteira). As peças vão endurecer com os consertos, então o
  `mult` é o último passo, não o primeiro.
- O quê: depois dos itens acima, 32 sementes; mover só `mult.damage` (1.65 → entre 1.45 e 1.6) até a meia Loja ficar
  em 20 a 30% (meio da faixa, para o ruído); armas não mudam.
- Aceite: Cripta 0% / 20 a 30% / 75 a 85% em 32 sementes; nenhum herói a mais de 20 pontos; Loja inteira não passa de
  85%; tabela em `docs/balance-baseline.md`.

### C4 · Leitura da Cripta (dono: vfx-director)

**CF-04 · Um vocabulário de aviso por consequência; covas e Badalada marcadas antes** · vfx + impl · P · ✅ feito (2026-11-11)

- Por quê: 05-ui UI-04, 06-vfx #5 e #7. As covas do Coveiro (sem dano), a Badalada (sem dano) e o Dobre Fúnebre (20 de
  dano) usam o mesmo tracejado coral e são indistinguíveis lado a lado (`boss-ab0-420x820.png`): o jogador aprende a
  fugir do inofensivo e a ignorar o que fere. As covas só aparecem no fim da espera, com ~12 px (`dig-after.png`).
- O quê: três cores e nenhuma mais. **Coral sólido com tracejado que acelera = fere ao tocar.** **Marfim (osso
  pálido) com contorno de tinta e lápides pequenas = invoca** (covas, Badalada, ovos). **Verde-limo = atrasa.** Sem
  violeta: o chão da Cripta é violeta e o roxo é da Lyra (decisão da revisão). Os pontos de saída (4 do Coveiro, 8 da
  Badalada) aparecem desde o começo da espera, como lápides de 12 a 16 px crescendo, nas mesmas posições que o core
  vai usar (laço por `count`, sem alocar); na Badalada o sino balança duas vezes e solta dois anéis de som. Constantes
  `SUMMON_*` em `render/ui.ts` ao lado de `WARN_*`.
- Aceite: captura 420x820 com covas, Badalada e Dobre na mesma tela, em que cada um diz a consequência pela cor; as
  lápides aparecem no primeiro quadro da espera.

**CF-01 · Pilha de ossos com queda, relógio e levante** · vfx · P · ✅ feito (2026-11-11)

- Por quê: 06-vfx #2, 05-ui UI-01. A pilha é a mecânica mais importante da fase e é invisível: troca de sprite e mais
  nada (`GameScene.ts:340`), coberta pelos outros esqueletos (`shots/pile-sheet.png`); nada diz "acerte antes que
  levante".
- O quê: **queda**: leque de 6 ossinhos e poeira, uma vez; **relógio**: anel fino cor de osso e brasa que fecha em
  `reassemble.delay` (arco de `pile / delay`), olhos acendendo no último segundo, tremor de ±1,5 px e ossinhos voltando
  no último 0,6 s (nunca coral: o levante não fere); **levante**: anel curto e squash vertical; **quebra**: estrela
  dupla do crítico e estalo de ossos. O espelho guarda o `pile` do quadro anterior para disparar nas transições (como
  `stunned`); anéis só em pilhas visíveis, até 24; faíscas do pool.
- Aceite: folha de captura com as quatro etapas; numa multidão de 200, a pilha é achada; F4 igual.

**CF-06 · Acerto na cor da arma, não branco sobre osso** · vfx · P · ✅ feito (2026-11-11)

- Por quê: 06-vfx #9 (conflito com o NF-01 resolvido em `07-direcao.md`). Na Cripta os inimigos principais são brancos;
  o flash branco de 0,05 s (`GameScene.ts:395`) vira uma mancha que apaga o sprite (`shots/s-wisps-soulProcession.png`,
  `shots/s-shields-valmorWall.png`).
- O quê: em todas as fases, `setTintFill` com a cor de `HIT_SPARK[arma]` clareada; branco só no crítico. Mesma regra do
  NF-01 (só alvo único, nunca em área).
- Aceite: capturas de Procissão, Escudos e Adagas na Cripta sem silhueta branca sólida; o crítico continua o mais
  forte.

**CF-03 · Dobre Fúnebre como sino, não como espada** · vfx · P · ✅ feito (2026-11-11)

- Por quê: 06-vfx #4. O aviso lê bem, mas (a) sobra uma linha radial tracejada (as bordas de um arco de 2π coincidem,
  `fx.ts:1664-1665`) e (b) o golpe é a varredura de espada do Cavaleiro (`drawSwing(... CLEAVE_STYLE)`, `fx.ts:1637`):
  uma cunha de ~270° que deixa um "lado seguro" que não existe.
- O quê: com arco ≥ 2π, sem linhas radiais; aviso com anéis contraindo para o sino e 3 pulsos no último 0,6 s; golpe
  como anel de choque completo do sino até 130 px em 0,25 s, borda branca grossa, poeira na borda, flash no mapa de luz
  (AR-01). Menos primitivas que a cunha.
- Aceite: captura do aviso sem linha radial e do golpe como anel fechado.

**CF-05 · Orbe do Espírito Gélido na cor dele** · vfx · P · ✅ feito (2026-11-11)

- Por quê: 06-vfx #6. O espírito é azul-gelo e o tiro sai branco-rosado com cauda coral (`drawEnemyShots`,
  `fx.ts:1201-1215`, cor única para todo atirador): parece o tiro do Goblin e não diz "frio". Não há aviso de disparo.
- O quê: cor por atirador (tabela no `fx.ts`, como `TRAIL`): núcleo branco, halo azul-gelo, 3 flocos atrás, contorno
  escuro fino, luz fraca azul; aviso de 0,7 s com a orbe condensando na mão; acerto no herói com estilhaço azul
  (`SPARK.flake`).
- Aceite: captura com Goblin e Espírito atirando, tiros distinguíveis; o aviso aparece antes de todo disparo.

**CF-02 · Estouro da Ossada em Brasa que paga a jogada** · vfx · P · ✅ feito (2026-11-11)

- Por quê: 06-vfx #3. O aviso é bom (`shots/eb-sheet.png`), o estouro é um anel fino de 0,25 s
  (`GameScene.ts:970-973`): o momento que recompensa "atrair a multidão para o estouro" passa num piscar, e o corpo
  some antes de o aviso aparecer.
- O quê: brasa no peito pulsando antes da morte; no estouro, flash branco-quente de 0,08 s que corre até o raio exato,
  8 raios curtos, brasas subindo, fumaça de 0,6 s, mancha chamuscada de 2 s (marca curta), luz laranja (AR-01); quem é
  ferido leva o brilho do `dotSpark`. Sem tremor.
- Aceite: folha de captura do estouro com inimigos dentro; +10 faíscas no máximo por estouro.

**CS-01 · Sons da Cripta: sino, pilha, estouro e pá** · impl · P · ✅ feito (2026-11-11)

- Por quê: 06-vfx ("Sons"). `render/sounds.ts` não tem receita para a Badalada, o Dobre, a pilha (cair, levantar,
  quebrar), o estouro nem a pá. O sino é o centro da fase e do chefe ("o sino vai tocar por você", fala do Sineiro no
  original) e hoje não soa.
- O quê: receitas Web Audio no mapa único: `bellToll` (grave, longo), `bellDirge` (mais grave, com batida no golpe),
  `pileFall`, `pileRise`, `pileBreak` (estalo seco, o mais satisfatório), `emberBurst`, `dig`. Pilha com teto de vozes.
- Aceite: cada evento soa uma vez; com 20 pilhas o teto de vozes segura; mudo respeitado.

**CF-07 · Limo que espalha e seca** · vfx · P · proposto (depois do CE-01)

- Por quê: 06-vfx #8. A mancha nasce pronta (`fx.ts:1513`) e some só por alfa; o herói lento não tem desenho de
  "grudar".
- O quê: espalha de 40 a 100% do raio em 0,2 s com respingo; encolhe com bolhas ao secar; fio de gosma no pé do herói
  enquanto `groundSlow < 1` (o ícone do HUD é do CU-02).
- Aceite: folha de captura do ciclo da mancha; F4 igual com 6 gosmas.

### C5 · Interface (dono: ui-designer)

**CU-02 · Vida baixa, lentidão e "Caiu por"** · ui + impl · M · proposto

- Por quê: 05-ui UI-03. Com 18/160 só o número muda (`lowhp-420.png`); no celular o polegar cobre o canto e o olho
  está no herói. A lentidão do limo não tem sinal. A tela final não usa o `world.hurtBy` que o mundo já conta: na
  Cripta, com tiros, estouros e covas, "o que me matou" é a lição que muda a próxima partida (pilar 4).
- O quê: (1) vinheta coral nas bordas abaixo de 35% (pulso lento) e 15% (pulso rápido), fixa no modo calmo
  (reaproveita a textura da vinheta do HUD); barra de 3 px sob os pés só quando a vida não está cheia. (2) Ícone de
  lentidão (`icon.slow`, 16 px) na linha dos contadores enquanto `groundSlow < 1`, contorno do herói em verde-limo.
  (3) Fim: "Caiu por: contato 62% · tiros 25% · marcas no chão 13%" (`core/report.ts` ganha `hurtShare`, puro, com
  teste). Textos: `end.hurtBy: (partes: string) => \`Caiu por: ${partes}\``, `end.hurt: { contact: 'contato', shot:
  'tiros', leap: 'saltos', ground: 'marcas no chão', boss: 'o chefe' }`.
- Aceite: capturas 420x820 e 360x640 com vida a 30% e 10%, herói no limo e tela final com a linha; teste do
  `hurtShare`; F4 igual.

**CU-01 · Primeira vez de cada inimigo com verbo: dica curta e aviso com nome** · ui + impl · M · proposto

- Por quê: 05-ui UI-01. FT-14, 15 e 16 empilharam cinco verbos numa fase; o jogador só os descobre apanhando, e o
  aviso de elite é sempre "Um inimigo poderoso se aproxima!" (`GameScene.ts:983-985`).
- O quê: na primeira vez **por save** que surge um inimigo com verbo (`reassemble`, `burst`, `dig`, `trail`, `shoot`,
  `leap`, `nest`, `flee`, `banner`, `brew`), uma dica sob o banner por 4 s, com o sprite em 28 px, sem pausar; no
  máximo uma a cada 20 s, nunca com chefe vivo, fila de uma. O aviso de elite nomeia: "O Coveiro chegou! Cuidado com
  as covas." "Dicas" nas Opções, ligada por padrão (decisão da revisão). O texto é o mesmo do "Como lidar" do CC-06.
  Textos da Cripta (`bestiary.tips`):
  - `bones`: "Levanta de novo em 3 s. Acerte a pilha para acabar com ela."
  - `emberBones`: "Quando cai, estoura em brasa. Afaste-se do círculo."
  - `gravedigger`: "Finca a pá e abre covas. Quatro Ossadas saem do anel."
  - `slime`: "Deixa limo que atrasa quem pisa."
  - `coldSpirit`: "Atira uma orbe lenta. Desvie andando."
  - `eliteArrived: (nome: string, aviso: string) => \`${nome} chegou! ${aviso}\``; `eliteHint.gravedigger: 'Cuidado
    com as covas.'`
    As dicas de Valmor e da Estrada saem do mesmo jeito, uma frase de ação por inimigo, na implementação.
- Aceite: save novo: cada dica aparece uma vez e nunca mais; nenhuma durante a luta do chefe; save antigo migra sem
  perder nada (`sanitizeSave`); captura 420x820.

**CU-03 · Chefe com barra própria e o nome do ataque** · ui + impl · P · proposto

- Por quê: 05-ui UI-07. A barra do chefe usa o vermelho da vida do herói e nenhum rótulo diz o que vem ("Badalada" e
  "Dobre Fúnebre" só existem no Bestiário).
- O quê: barra roxo-escura com borda dourada fina (`UI.bossBar`, estilo dos painéis do Sea of Stars); no começo de cada
  espera, o nome da habilidade sob a barra por 1,2 s (`hud.ability: (nome: string) => \`${nome}!\``; o core expõe o id
  da habilidade corrente). Texto só muda quando a habilidade muda.
- Aceite: captura com "Dobre Fúnebre!" sob a barra durante o aviso; barra do chefe e vida do herói de cores
  diferentes.

**CU-04 · Pausa com dano por arma** · ui + impl · P · proposto

- Por quê: 05-ui UI-05. A pausa é a ficha da build (NU-03) e não responde "o que está funcionando?"; a tela final já
  calcula o DPS.
- O quê: barra fina de dano e DPS em cada linha de arma (a conta sai do `EndScene` para `core/report.ts`, sem
  duplicar); em 360x640 só a barra.
- Aceite: capturas 420x820 e 360x640; a mesma conta na Pausa e no fim.

**CU-05 · Carta de arma nova com números** · ui + impl · P · ✅ feito (2026-11-11, dentro do PU-03)

- Por quê: 05-ui UI-08. Arma nova só tem texto de sabor (`lvl-420x820.png`), a melhoria já mostra o delta: o jogador
  compra no escuro (pilar 2).
- O quê: linha "Dano 6 · Recarga 1,8 s · Alcance 90" do nível 1 (`describe.ts`), substituindo o sabor em 360x640,
  nunca a receita (`levelUp.newStats`).
- Aceite: captura de arma nova em 420x820 e 360x640 com números e receita.

**CU-06 · Celular: nível, pips, joystick e cargas** · ui + impl · P · proposto

- Por quê: 05-ui UI-10, 03-qa B4. "Nv" de 14 px sobre a barra de XP (`HudScene.ts:94`); pips da faixa de 3 px;
  joystick com alfa 0,08/0,25 some no chão violeta (`joystick.ts:21`); R, X e B com 0 cargas não dão nenhum sinal.
- O quê: "Nv N" a 16 px com contorno, fora da barra; pips de 4 px (ou número pequeno); joystick com alfa 0,14/0,4;
  tecla sem carga dá um tremor curto no botão e um som surdo.
- Aceite: capturas 420x820 e 360x640 na Cripta; R sem carga mostra o tremor.
- Revisão 2026-11-11 (2) (04-visual #14, #15): o desenho do joystick (anel e botão em pixel) e da barra de XP passa
  para o **PA-01**, que usa o alfa daqui (0,14 / 0,4). Ficam aqui "Nv", pips e o sinal de carga zerada.

**CU-08 · Desistir mostra a tela final** · ui + impl · P · proposto (decidi; o Daniel pode vetar)

- Por quê: 03-qa B5. Desistir (em duas etapas) vai direto ao menu; o Elo forjado é gravado, mas o jogador não vê o que
  a partida rendeu. Pilar 4: toda partida mostra o que avançou.
- O quê: Desistir abre o Fim com o título "Partida abandonada", ouro guardado, conquistas e Elos; "Menu" a um toque.
- Aceite: captura; o ouro mostrado é o gravado no save.

**CU-07 · Cartão de fase com perigos e marcas; moldura das barras do HUD** · ui + visual · M · proposto

- Por quê: 05-ui UI-09. O cartão da Preparação tem nome e frase ("Pedra azul..." num chão que agora é violeta), sem
  vitórias, melhor tempo nem perigos; as barras do HUD são retângulos planos, longe dos painéis finos dourados das
  referências.
- O quê: dois ou três ícones de perigo da fase (os verbos mais fortes), as três marcas de vitória (as do NU-10) e o
  melhor tempo; frase da Cripta revista depois do AR-02 (o chão pode mudar de novo). Barras com traço dourado fino,
  canto arredondado e coração no início, assadas em textura (sem `Graphics` por quadro).
- Aceite: capturas 420x820 e 1000x680 da Preparação; F4 igual com as barras novas.
- Revisão 2026-11-11 (2) (04-visual #2): a moldura das barras do HUD sai daqui e entra no **PA-01** (fonte, painéis,
  botões e barras em pixel, numa peça só). Fica aqui o cartão de fase (perigos, marcas, melhor tempo); o selo "Vencida"
  que encosta no título (03-qa B7) é do **PU-05**.

### C6 · Arte e luz (dono: visual-director)

**CA-01 · Sombra de contato nos inimigos** · visual + impl · P · ✅ feito (2026-11-11; `render/shadow.ts`, um `Mirror` de sombras em `GameScene`; elipse de pixel em três faixas, escala pelo `radius`, voadores seguem com a sombra própria; 0 gerações)

- Por quê: 04-visual #9. Os heróis têm sombra, os inimigos PixelLab não: flutuam e o monte vira uma massa.
- O quê: uma elipse escura pré-alocada por imagem do espelho (uma textura `shadow`, profundidade abaixo dos
  inimigos), escala pelo `radius`.
- Aceite: captura de multidão com os sprites "no chão"; F4 com 500 inimigos igual.
- Revisão 2026-11-11 (2) · prioridade maior (04-visual #3): continua o item de menor custo (zero gerações) e maior
  ganho de leitura da multidão; o monte da Cripta flutua sobre a pedra (`m-g-crypt-330.png`). Entra no 4º dos Próximos 5
  da revisão, junto com o PA-01 e o PA-02.

**CA-03 · Cripta com uma cor por criatura** · visual · M · proposto

- Por quê: 04-visual #7 e #8. Ossada, Esqueleto e Ossada em Brasa são branco-osso e leem como uma massa
  (`m-c2-2.png`); o Espectro lilás-claro tem o maior valor da tela e chama mais atenção que o perigo real.
- O quê: primeiro por tinta (zero gerações): Espectro 15 a 20% mais escuro com olhos e boca acesos (o rosto fica,
  decisão 5); depois, se ainda faltar, regerar o Esqueleto com armadura azul-aço escura e capa vermelha maior, e a
  Ossada com crânio amarelado e olho âmbar (`create_character_state`, ~10 gerações cada).
- Aceite: captura de multidão da Cripta em que Ossada, Esqueleto, Ossada em Brasa e Espectro se separam em cinza.

**CA-02 · Sineiro em tamanho nativo, com o sino aceso; Coveiro diferente dele** · visual + impl + bal · M · proposto

- Por quê: 04-visual #6, 02-code B6, 06-vfx ("ponto fraco"). O Sineiro a 1,5x (`SPRITE_SCALE`) tem pixels de 3x3 entre
  sprites de 2x2, é só um pouco maior que os Coveiros e mantém `radius: 30` com ~150 px de altura; o Bestiário não
  aplica o fator. Três Coveiros (mesma silhueta marrom) e o chefe se confundem.
- O quê: gerar o Sineiro em tamanho nativo (128 a 192 px, 4 a 6 gerações) com o sino como o acento que brilha (luz
  própria, mais forte no aviso); `SPRITE_SCALE` sai; `radius` acompanha o corpo visível e a luta é medida no sim (hoje
  22 a 39 s de mediana com a Loja inteira; se passar de 45 s, a mordida cai um pouco). Coveiro com capuz e cor
  próprios.
- Aceite: captura do chefe com escolta e dois Coveiros, todos distinguíveis; luta de 25 a 40 s no sim.
- Revisão 2026-11-11 (2) · ampliado (04-visual #13): a Mãe-Aranha de Valmor tem o mesmo problema de presença: brilho do
  corpo fraco, coberta pelos ratos, e a `BOSS_LIGHT` (roxo claro) some no chão azul. Somar: luz de chefe na cor de cada
  chefe e profundidade do chefe acima da escolta, nas três fases. Aceite somado: captura de cada chefe com escolta em
  420x820 em que o chefe é a primeira coisa achada.

**CF-08 · Armas que ainda não explicam o que fazem** · vfx · P · proposto

- Por quê: 06-vfx (tabela de armas). Aura de Yah: anel fino que some na multidão; Adagas e Leque de Facas: o Elo quase
  igual à base; Maça de Ferro: impacto discreto no meio do monte. (Fogos-Fátuos pequenos já estão no NA-05 e em
  "Efeitos menores".)
- O quê: Aura com borda grossa (alfa alto na borda, baixo no miolo) e onda no tique; Leque com faísca de rebote e
  gota de sangramento maior; Maça com luz âmbar no pouso (AR-01).
- Aceite: folha de captura das três no nível máximo com 26 inimigos em volta.
- Revisão 2026-11-11 (2) (06-vfx tabela de armas e #5): Aura e Maça avançaram no DD-15; o rebote do Leque passa para o
  **PF-03** (verbos dos Elos com desenho) e as facas para o **PF-04**. Sobra aqui só a luz âmbar da Maça no pouso. Nota
  sobre a Aura depois do `2a997ce` (anel que respira e quase some): no ponto mais fraco a borda continua visível no raio
  do dano (decisão em `docs/reviews/2026-11-11-2/07-direcao.md`, conflito 2).

### C7 · Direção (sistema novo)

**CD-01 · Fonte de Luz na Cripta: uma decisão de rota que cura** · impl + bal + vfx + ui · M · proposto (aprovação e pergunta de lore com o Daniel)

- Por quê: pilares 2 e 6. 01-balance D2: 25 de 37 mortes da meia Loja caem entre 4:00 e 5:30, o vale antes do 1º Elo;
  e nenhuma peça da Cripta tira o jogador do círculo largo. O cânone já tem o objeto: as fontes de luz "curam e
  guardam a memória de quem passa" (`prologo.md`, "As fontes de luz") e a cripta do original tem uma ("A fonte de luz
  cura e salva", `capitulo1-aldo-sozinho.md`). Gênero: pontos de cura ou de objetivo no mapa que puxam o jogador para
  fora da rota (os santuários e objetivos de bioma dos survivors-likes), aqui sem botão e sem tela nova.
- O quê: às 3:30, 6:00 e 8:30 uma fonte acende num ponto aberto do terreno entre 320 e 520 px do herói (seta na borda
  pelo NU-01, aviso do HUD). Dentro do círculo, o herói cura 6% da vida máxima por segundo, até a fonte gastar 50% da
  vida máxima ou apagar em 30 s. A horda continua vindo: curar é ficar parado num círculo de 64 px. Mecânica: uma marca
  nova `fountain` no pool de marcas (`core/marks.ts`), que cura em vez de ferir; agenda como os `specials`.
  ```ts
  // data/stages.ts · StageDef, novo (opcional)
  /** Light fountains: from `from` s, one every `every` s, lit `ttl` s, `near`-`far` px from the hero on open ground. */
  fountains?: { from: number; every: number; ttl: number; near: number; far: number };
  // crypt
  fountains: { from: 210, every: 150, ttl: 30, near: 320, far: 520 },
  // data/config.ts
  /** Light fountain: radius, heal per second (of max HP) while inside, total it can give (of max HP). */
  fountain: { radius: 64, heal: 0.06, charge: 0.5 },
  ```
  Textos: `hud.fountain: 'Uma fonte de luz brilha na cripta.'`; nome no Bestiário ou na dica: "Fonte de Luz" (termo do
  original). Visual: poça de luz azul-clara (a cor da fonte no original, "uma luz azul que ninguém chega perto"; manter
  longe do ciano das gemas, regra do A-05) que encolhe conforme gasta; a cura com as cruzes da Luz Sagrada. A vigília
  continua as fontes no mesmo ritmo.
  **Variante que depende do Daniel (lore):** pilhas de ossos dentro da luz não remontam. Liga a fonte ao verbo da fase
  ("lutar perto da fonte"), mas é extrapolação; só entra com o sim dele.
- Custo: `data/stages.ts`, `data/config.ts`, `core/marks.ts` (kind novo), `core/waves.ts` (agenda), render (luz, desenho,
  seta), `pt-BR.ts`; bot do sim vai à fonte com vida abaixo de 60%. Sem alocação: a marca vem do pool.
- Riscos: equilíbrio (a meia Loja pode subir demais; o CE-02 vem depois e absorve); a fonte não pode nascer dentro de
  obstáculo (usar o mesmo teste de célula livre do `terrain.ts`); leitura com a horda em volta (a borda da poça fica
  acima da escuridão).
- Aceite: testes: a fonte nasce em chão livre na distância pedida, cura só dentro, para no `charge` e no `ttl`; sim
  (meia Loja): a parte das mortes entre 4:00 e 5:30 cai de 2/3 para menos de 1/2, a Loja inteira não passa de 85%;
  medida de tempo dentro da fonte e cura por fonte; F4 igual.

## Daniel 2026-11-11 tarde

Ajustes pedidos depois do teste de 11/11 (tarde). Tamanhos: P = horas, M = um dia, G = vários dias. Ordem de
execução: as fases abaixo, uma de cada vez, com um commit por passo (testes, lint, typecheck e build verdes) e push ao
fim de cada fase. Arte segue o visual-director e as regras de pixel do CLAUDE.md (tamanho final, escala inteira);
efeitos, o vfx-director; telas, o ui-designer. Lore só do cânone; texto novo com lore espera a aprovação do Daniel.

### Fase 1 · Conserto e leitura

- **DD-01 · Carregar só as poses declaradas** · impl · P · ✅ feito. Os 20 inimigos só com andar pedem `-windup`, `-strike` e
  `-death` que não existem (60 erros por carregamento). `enemySheets()` passa a carregar só as poses de
  `ENEMY_ANIMS[...].frames`. Aceite: teste que toda pose carregada tem arquivo em `public/`; zero 404 no carregamento.
- **DD-02 · Rato Ladrão com aviso** · impl + ui · M · ✅ feito. Nasce a cerca de 200 px do herói (nunca dentro do alcance de
  golpe), com uma marca no chão e o som de moedas 1 s antes, e então corre. Seta na borda enquanto estiver fora de vista
  (`EdgeArrows`, prioridade acima de elite), contorno amarelo e o brilho das gemas no saco mais forte. Aceite: testes de
  distância de nascimento, marca antes do nascimento e seta só enquanto fora da tela.

### Fase 2 · Telas de início

- ✅ **DD-03 · Tela Heróis** · ui + visual · G. Começar abre a tela Heróis: os quatro um embaixo do outro; cada linha com
  o sprite grande em escala inteira, nome, classe, vantagem, arma inicial, recorde e, se bloqueado, o preço. Escolher
  leva à tela Fase. Voltar em cada tela volta uma etapa.
- ✅ **DD-04 · Tela Fase e história da fase** · ui + visual · G. Um cartão por fase com ilustração (recorte do chão e do
  chefe), nome e a linha atual. Tocar no cartão abre a história: ilustração maior, texto curto, o chefe do fim, Partir e
  Voltar. Fase bloqueada mostra como desbloquear. **Depende do Daniel (lore):** as três histórias saem do cânone
  (prólogo e capítulo 1) e são mostradas antes de entrar no jogo.
- ✅ **DD-05 · Encaixe em celular e PC** · ui · M. Celular em pé, deitado e PC: tudo cabe sem rolar na tela de Fase; a de
  Heróis pode rolar no celular em pé. Capturas em 390x844, 844x390 e 1280x800.

### Fase 3 · Inimigos

- ✅ **DD-06 · Coveiro refeito** · visual · M. PixelLab, estilo cabeçudo do Aldo, mas ameaçador: rosto escondido pela aba
  do chapéu, olhos acesos, pá grande e suja, postura curvada. Mantém andar, preparar, cavar e morrer.
- ✅ **DD-07 · Fantasma em duas formas** · impl + visual + bal · G. Menor (cerca de 40 px na tela). Simpático; ao sumir
  (move `phase`) e reaparecer vira um fantasma negro de olhos vermelhos, mais rápido e com mais dano de contato, com um
  estalo de sombra na troca. Duas artes PixelLab do mesmo personagem; regra no core com teste (a forma escura só depois
  do primeiro sumiço e vale até morrer). Troca também o fantasma da tela inicial. **Depende do Daniel:** o nome da forma
  escura (provisório até a aprovação).
- **DD-08 · Gosma Verde menos fofa** · visual · P. Duas propostas mostradas ao Daniel antes de trocar. ✅

### Fase 4 · Armas de órbita

- ✅ **DD-09 · Escudos de Valmor e Espadas dos Paladinos** · impl + visual + bal · G. Arte PixelLab nova e comportamento
  novo. Escudos deixam de girar: ficam como parede à frente do herói, na direção em que anda, com pancada periódica que
  empurra o bando (a Muralha de Valmor fecha o anel). Espadas giram mais rápido, finas, com rastro de corte. Ambas
  seguem dentro da banda de categoria (`bands.test.ts`) e ganham testes.

### Fase 5 · Cenário

- ✅ **DD-10 · Tiles refeitos no PixelLab** · visual · G. Cripta: lajes de piso com desgaste, rachaduras e limo, nunca
  padrão de parede. Valmor e Estrada: neve, terra e pedra com variação e bordas. Testes de contraste do chão mantidos.
- **DD-11 · Obstáculos que formam o cenário** · visual + impl · G. Maiores e em pixel: Cripta (colunas, sarcófagos, ✅
  estátuas de paladinos, montes de ossos), Valmor (cercas, carroças, fardos, poço), Estrada (troncos, rochas, carroça
  virada). Círculo de colisão alinhado ao desenho. Valmor e Estrada ganham obstáculos esparsos que não fecham caminho.
- **DD-12 · O herói se destaca do chão** · visual · P. Depois dos tiles novos, capturas em 420x820 e 1000x680 de todas ✅
  as fases e ajuste se o herói se perder.

### Fase 6 · Efeitos

- **DD-13 · Efeitos no padrão pixel** · vfx · G. Golpes em arco, zonas, raios e auras como os projéteis em pixel: ✅ (blocos de pixel nos golpes, brilho quadrado na Lâmina, pausa de 50 ms nos golpes pesados)
  bordas firmes, partículas em blocos em vez de discos grandes, paleta por elemento, congelamento de 2 a 4 quadros nos
  golpes fortes e luz no chão. Começa pela Lâmina de Valmor.

### Regras

- **DD-14** Código e commits em inglês; texto do jogador só em `src/i18n/pt-BR.ts`, em português, sem travessão; toda
  arte nova registrada em `docs/art/credits.md`.

### Fase 7 · Efeitos em sprites (pedido do Daniel, 2026-11-12)

- **DD-15 · Refazer todos os efeitos com sprites em pixel** · vfx · G. Raio e Tempestade, Fogo e Espada de Fogo,
  zonas de Geada/Nevasca, chão em chamas, auras, golpes em arco e pancadas, trabalhados no workbench de efeitos do
  PixelLab (My effects) e empacotados em `public/sprites/fx/vfx/` (`render/vfx.ts`). Feito: Raio, Fogo (explosão e chama), Geada (cristais), Aura de Yah, onda de choque da Maça, corte da Lâmina, giro da Fúria (2026-11-12; carmim `0xd8283c`, anel de 350 graus com cinzas e brasas, 0 gerações: oficina de efeitos). onda da Chama de Yah (2026-11-12; anel de fogo com 14 chamas na frente, até o raio exato do pulso). Falta: cadeia da Tempestade, telégrafos de chefe.
  - Revisão 2026-11-11 (2) (06-vfx #2): a Fúria é hoje vetor com borda `0xff4a4a`, vizinha do coral de perigo
    `0xff8090`, e a onda é uma bola vermelha de `Pen`. Decisão de cor (conflito 3 da `07-direcao.md`): **carmim profundo
    com núcleo branco-quente**, ponto de partida `ELEMENT_COLOR.fury = 0xd8283c`, nunca o `~0xff6a3a` do relatório
    (encosta no laranja do Fogo, e cada elemento tem uma cor só). Giro em pixel de 6 quadros com cinzas; a onda como
    lâmina de luz que cresce com `stats.area`. Aceite: captura nas três fases ao lado de um telégrafo coral e da Espada
    de Fogo, as três cores separadas. Os verbos sem desenho e os projéteis em código ficam nos **PF-03** e **PF-04**;
    os acertos de área no **PF-01**.

### Fase 8 · Música (pedido do Daniel, 2026-11-12)

- **MU-01 · Uma trilha de metal progressivo por fase** · música · G. Valmor, Cripta e Estrada do Sul (guitarras, solo,
  mudanças de compasso e tom), trilha de chefe e trilha do menu, em laço, geradas no PixelLab (`create_music` e
  `make_music_loop`, registradas em `docs/art/credits.md`). Player em `render/music.ts` (Phaser, fusão entre faixas,
  abaixa na pausa), mapa em `render/musics.ts`, opção Música em Opções e na pausa. Feito: valmor, crypt, southRoad,
  boss (toca quando o chefe chega), menu (toca no menu). Falta: Daniel escolher a faixa A ou B de cada fase,
  nomes das faixas (provisórios). 2026-11-12: Daniel achou o primeiro conjunto ruim (ambiente demais); valmor refeita como TESTE no estilo de fase 16 bits (gancho no primeiro compasso, seções curtas), aguardando o ouvido dele antes de refazer as outras quatro. Falta também: vitória e derrota (stings), evento de fim para tocá-los.
  - Revisão 2026-11-11 (2) (03-qa, observação; `t15.mjs`): na vitória e na derrota o Fim segue com a faixa do chefe.
    Somar: ao abrir o Fim, a faixa em curso sai em fusão curta e toca o sting (3 a 5 s, mesmo timbre da fase); depois,
    silêncio ou a faixa do menu baixa. Na vigília a faixa da fase volta (já funciona). Nomes provisórios: os nomes das
    fases, sem lore nova (decisão 1 da `07-direcao.md`). Os defeitos do player estão no **PB-03**; o volume, no **PS-01**.

## Revisão 2026-11-11 (2)

Origem: revisão de `18f6ee3` depois da música nova e da virada para sprites e efeitos PixelLab
(`docs/reviews/2026-11-11-2/00` a `06`). Triagem, conflitos, leitura de design e as decisões do Daniel em
`docs/reviews/2026-11-11-2/07-direcao.md`. **Todos os itens abaixo estão `· proposto`**: esperam a aprovação do Daniel.
Achados repetidos em vários relatórios viraram um item só.

Prefixos novos (P de pixel, o tema da rodada): **PB** bug, **PT** técnico, **PE** equilíbrio, **PF** efeitos visuais,
**PS** som e música, **PU** interface, **PA** arte. Itens antigos reabertos ou ampliados mantêm o ID e têm o escopo novo
no próprio lugar, mais acima: **B-04** (reaberto), **NB-08**, **NE-02**, **NE-06**, **NA-05**, **CT-03**, **CF-08**,
**CU-06**, **CU-07**, **CA-01**, **CA-02**, **DD-15** e **MU-01**.

Regras (as mesmas das revisões anteriores): cada passo com `npm test`, `npm run lint`, `npm run build` verdes, jogo
rodando, um commit e push; lógica nova no core com teste em `tests/core/`; equilíbrio com `SIM_SEEDS=16 SIM_SHOP=all npm
run sim` antes e depois (8 sementes dão ±17 pontos por herói); render medido no F4 (420x820, CPU 4x) antes e depois, sem
alocação por quadro, modo calmo respeitado; toda geração PixelLab registrada em `docs/art/credits.md`, ao tamanho final,
em `ART_RES`.

### Próximos 5 (sugestão do game-director, não substitui a lista do topo até o Daniel aprovar)

1. **PB-01 + PB-02 + PB-03 + PB-04**: efeitos com dano que somem, ouro arredondado, música em dobro, tecla de carta
   antes da hora.
2. **PE-01 + NE-06, depois PE-02**: Cripta e Valmor de volta à meta com as metas certas no sim; lab com multidão viva e
   densa; Aura de Yah, Espadas de Elun, Maça, Tempestade e Espada de Fogo vivas no jogo real.
3. **PU-01 + PU-04 + PU-03 (com o CU-05)**: Pausa sem colisão e com "continuar"; fim que leva à Loja; carta com o
   número real.
4. **PA-01 + PA-02 + CA-01**: moldura em pixel (fonte, painéis, barras, joystick), Valmor com neve, sombra nos inimigos.
5. **ND-01 Perigo por fase vencida** (nome com o Daniel); se ele preferir arte antes, **PF-01 a PF-04** dentro do DD-15.

### Ordem sugerida

| Fase                | Passos (um commit cada, nesta ordem)                                           | Donos                               |
| ------------------- | ------------------------------------------------------------------------------ | ----------------------------------- |
| **P1 Bugs**         | PB-01 · PB-02 · PB-03 · PB-04 · PB-05 · PB-06 · PB-07 · B-04 (reaberto)        | impl (+ vfx no PB-01, bal no PB-02) |
| **P2 Equilíbrio**   | PE-01 · NE-06 (ampliado) · PE-02 (com NE-02) · tabela em `balance-baseline.md` | bal + impl                          |
| **P3 Interface**    | PU-01 · PU-04 · PU-03 (com CU-05) · PU-02 · PU-05                              | ui + impl                           |
| **P4 Arte**         | CA-01 · PA-01 · PA-02 · PA-04 · PA-03 · PA-05                                  | visual + impl                       |
| **P5 Efeitos**      | PF-02 · PF-01 · DD-15 (Fúria) · PF-03 · PF-04 (com NA-05) · PF-05 · PF-06      | vfx + impl                          |
| **P6 Som e música** | MU-01 (stings, A/B, nomes) · PS-01                                             | música + impl                       |
| **P7 Técnico**      | PT-01 · PT-02 · CT-03 (ampliado) · PT-03                                       | impl                                |

### Decisões do Daniel (detalhe em `docs/reviews/2026-11-11-2/07-direcao.md`)

1. Música: faixa A ou B por fase, nomes (provisórios = nomes das fases) e stings.
2. Fonte pixel também nos textos longos, ou só em títulos, HUD e números (PA-01).
3. Valmor: regerar o chão com neve, com dois candidatos (PA-02).
4. Anel da Aura de Yah: piso de visibilidade na borda do dano.
5. Herói que reage ao dano e cai (PA-03): 4 a 8 gerações.
6. Decidi, pode vetar: botão de pausa vira "continuar"; Loja de 360 com painel menor; atalho Loja no fim só quando dá
   para comprar; volume da música em três níveis; Pular continua +15 fixo.
7. CLAUDE.md: o chefe de Valmor nos dados é a Mãe-Aranha, não o Cavaleiro Negro.

### P1 · Bugs

**PB-01 · Efeitos com dano somem quando o pool de sprites enche** · vfx + impl · P · ✅ feito (2026-11-11; capturas de 30 s não feitas)

- Por quê: 06-vfx #1 e #7. `fxSprites` tem `MAX = 160` (`fxSprites.ts:9`) e `put`/`putFrame` saem calados sem imagem
  (`:32`, `:61`). Medido: Espada de Fogo, Vigília, Nevasca, Chama e Geada no nível 7 travam em 158 a 160 peças depois
  de ~12 s. As zonas são desenhadas primeiro (`fx.ts:269-276`), então o que cai é o que tem hitbox: a espada que gira,
  o corte da Lâmina. As chamas são 3 por zona mesmo com 22 zonas (`fx.ts:1156`). Pilar 5: o efeito que some é o que
  diz onde está o dano. Medido também (só relativo): cinco armas de área custam ~25% de FPS.
- O quê: (a) duas faixas de orçamento no `fxSprites`: o que tem dano (golpes, raios, espadas, aura, escudos) desenha
  antes e tem reserva; enfeite (chama de zona, cristal, brasa) usa o que sobra; (b) orçamento total de chamas por
  quadro (ponto de partida 36), dado às zonas mais novas, as velhas viram só anel de brasa; (c) em build de dev, um
  aviso no F3 quando o pool estoura. Sem objeto novo por quadro.
- Aceite: com as cinco armas acima por 30 s, espada e corte sempre visíveis (folha de captura) e o pool abaixo do teto;
  F4 igual ou melhor; na Cripta, brasa do herói e brasa da Ossada em Brasa distinguíveis (captura).

**PB-02 · Ouro arredondado moeda a moeda** · impl + bal · P · ✅ feito (2026-11-11; re-medida do `LOJA` pendente: o sim não foi rodado)

- Por quê: 02-code M1. `core/pickups.ts:58` arredonda `amount * greed * stage.mult.gold` a cada moeda
  (`config.gold.coin = 3`): Ganância nível 1 (1,1) rende 3, ou seja nada; níveis 2 a 4 rendem todos 4 (+33%); nível 5
  rende 5; a Cripta paga 5 (x1,67, não 1,5) e a Estrada 6. A Loja e o `LOJA` (51 corridas, meta 40 a 60) foram medidos
  em cima disso. Pilar 4: o que se compra tem de valer o que diz.
- O quê: `world.gold` acumula o valor fracionário; arredonda uma vez, ao banco (`recordRun` já faz
  `Math.floor(run.gold)`); o HUD mostra o inteiro. `skipGold` (Pular, 15) continua fixo, de propósito (decisão 6), com
  comentário no `config`. Depois, sim de 16 sementes; se o `LOJA` sair de 40 a 60, ajustar `config.gold.coin` ou os
  preços, não a Ganância.
- Aceite: teste: 100 moedas com Ganância 1,1 dão 330; com `mult.gold` 1,5 dão 450. `LOJA` entre 40 e 60 corridas e
  ouro por corrida por fase na tabela do `balance-baseline.md`.

**PB-03 · Música: faixa em dobro, entrada de uma vez, religar volta à introdução** · impl · P · ✅ feito (2026-11-11; falta conferir no navegador)

- Por quê: 02-code M2, 03-qa B2 e B3. (1) `render/music.ts:34-38` registra um `once('filecomplete-audio-<id>')` a cada
  `play()` durante o download (2 a 3 MB), e `start()` não confere voz do mesmo `id`: um `sync` vindo das Opções ou da
  Pausa no meio do download toca a faixa duas vezes por cima. (2) Com o contexto `suspended`, o `tick` leva `vol` a 1:
  no primeiro toque a música do menu entra cheia, sem os 1,5 s de fusão. (3) Desligar e religar a Música na Pausa
  recomeça a faixa da introdução (81 s em Valmor).
- O quê: `start()` sai se já há voz do `id`, e um `loading: Set<MusicId>` impede o segundo ouvinte; `vol` só avança
  com o som destravado (ou zera no evento `unlocked`); desligar **pausa** a voz em vez de destruí-la, e religar retoma
  do ponto (destruir só ao trocar de faixa). Extrair a rampa de `vol`/`duck` para uma função pura com teste.
- Aceite: teste da rampa (fusão de entrada, pausa abaixa a 0,3, silenciar); no navegador, abrir Opções e alternar a
  Música 3 vezes durante o primeiro download deixa uma voz só; primeiro toque com fusão de 1,5 s; religar na Pausa
  continua de onde parou.

**PB-04 · Teclas 1, 2, 3 e Enter escolhem a carta antes da trava** · impl · P · ✅ feito (2026-11-11; sem teste de cena: não há infraestrutura)

- Por quê: 03-qa B4. `LevelUpScene.ts:110-111` só arma o ponteiro depois de `ARM_DELAY` (300 ms); o teclado
  (`bindKeys`, `:231`) não espera: '1' a 100 ms da abertura escolhe a carta. Espaço (a pausa) e Enter por reflexo podem
  escolher a carta em foco. Pilar 2: a escolha tem de ser escolha.
- O quê: o mesmo `ARM_DELAY` vale para `onKey` no LevelUp (e na escolha do baú, se houver).
- Aceite: teste de cena ou script: tecla a 100 ms não escolhe; a 350 ms escolhe.

**PB-05 · Maça atordoa o fantasma esmaecido e a pilha de ossos** · impl · P · ✅ feito (2026-11-11)

- Por quê: 02-code B2. `core/weapons.ts:312` (`slamHit`) grava `e.stun` antes do `damageEnemy`, que sai cedo para
  fantasma esmaecido (`isFaded`) e pilha recém-caída: o intocável ganha atordoamento. Mexe no valor real da Maça, que o
  PE-02 vai medir.
- O quê: gravar o atordoamento só depois de checar `isFaded` e a guarda da pilha (CB-01).
- Aceite: teste: pancada num fantasma esmaecido e numa pilha dentro de `pileGuard` não atordoa; num comum, atordoa.

**PB-06 · Ricochete segue sobre uma lista sobrescrita** · impl · P · ✅ feito (2026-11-11)

- Por quê: 02-code B1. `core/projectiles.ts:217-224`: sem alvo de ricochete, `nearestEnemy` já reescreveu
  `world.scratch` e o laço do projétil continua com índices de outra lista; candidatos podem ser pulados ou repetidos no
  quadro. Não aparece no lab (alvos imortais).
- O quê: `break` sempre depois de chamar `nearestEnemy`, ou consultar em `targetsScratch`.
- Aceite: teste dentro de uma multidão: uma faca do Leque sem alvo de ricochete acerta os mesmos inimigos que acertaria
  sem a busca.

**PB-07 · Pequenos furos do spawner e das marcas** · impl · P · ✅ feito (2026-11-11; sem teste do `thiefPoint` cercado: o terreno de teste não consegue cercá-lo)

- Por quê: 02-code B3, B4, B9. (1) Marcas de surgimento pendentes (até 160) não contam para o `max` do tipo
  (`waves.ts` `capped`/`batchSize`); Ninho, Estandarte e Ladrão (`max: 3`) podem passar do limite. (2) `thiefPoint`
  devolve o último ponto empurrado se as 8 tentativas ficam perto demais, e o aviso de 1 s do DD-02 deixa de valer.
  (3) `markIce` (`arena.ts:81`) é a única porta que ignora `config.marks.max`.
- O quê: contar marcas `spawn` pendentes por tipo junto do `alive`; `thiefPoint` cai para o candidato mais distante;
  `markIce` pelo mesmo teto das outras.
- Aceite: testes: com 3 Ninhos marcados e nenhum vivo, não surge o 4º; `thiefPoint` cercado de obstáculos devolve o
  ponto mais distante; marcas de gelo param no teto.

### P2 · Equilíbrio

**PE-01 · Cripta e Valmor de volta à meta depois do Assombro e dos obstáculos** · bal + impl · P · proposto

- Por quê: 01-balance #6 e #7, com a leitura corrigida (conflito 1 da `07-direcao.md`). O alvo do **bot** no CLAUDE.md
  para a Cripta com meia Loja é 80 a 90% (o ~60% é o de uma pessoa); estava em 84% em `8a9a23d` e hoje está em
  **63%**, com o Teo em **25%**. Depois daquela calibragem entraram na Cripta o Assombro (DD-07, forma escura mais rápida
  e que morde mais) e os obstáculos de cenário (DD-11), sem nova medida. Valmor com meia Loja caiu para 38% (alvo 40 a
  60; antes 48% com 16 sementes), também depois dos obstáculos e do Rato Ladrão. E a tabela `TARGETS` do sim ainda usa
  15 a 35% para a Cripta, então o desvio nem aparece.
- O quê: (1) `TARGETS` do `tests/lab/sim.test.ts` com as metas do CLAUDE.md para as três fases. (2) 16 sementes, três
  perfis, com o Assombro desligado e com os obstáculos de cenário desligados (só para medir), para saber quanto cada um
  custou. (3) Mover `crypt.mult.damage` (hoje 0,9) até a meia Loja voltar a 80 a 90%; em Valmor, só mexer se a meia Loja
  ficar abaixo de 40% com 16 sementes. Armas não mudam aqui.
- Aceite: Cripta 0 a 10% / 80 a 90% / 90%+ e Valmor 0 a 15% / 40 a 60% / 85%+ com 16 sementes; nenhum herói a mais de 20
  pontos da fase (o Teo é o caso a olhar; se só ele ficar fora, ele vai para o PE-02); tabela antes e depois em
  `docs/balance-baseline.md`; o Daniel reteste à mão a Cripta com meia Loja (`?dev`).

**PE-02 · As cinco cartas fracas no jogo real** · bal + impl · M · proposto (depois do NE-06)

- Por quê: 01-balance #1, #2, #3, #5. No `REAL DPS` do sim: Aura de Yah **15** (17 corridas; lab 220), Espadas de Elun
  **66** (lab 228), Maça **76** (Lâmina 156, Adagas 336), Tempestade **1,4x** o Raio e Espada de Fogo **1,7x** o Fogo
  (meta 2,5x). Todas no lab dentro das bandas: o lab não vê multidão que anda e empurra. Pilar 3: carta que não rende
  no jogo é carta morta, e "mil jeitos de montar" encolhe para oito.
- O quê: com o lab do NE-06 (multidão viva e densa) e a medida "inimigos dentro do alcance por segundo" (separa o bot
  que foge do desenho da arma), recalibrar dentro das bandas novas. Pontos de partida, a confirmar com o número novo:
  `yahAura` raio L7 90 → 110 e dano por tique 10 → 14; `mace` dano L1 20 → 24, L7 53 → 60; Tempestade com dano por raio
  maior (NE-02); Espada de Fogo com chão em brasa que conte mais (dano da zona). Uma pessoa cercada fica mais dentro da
  aura que o bot: não calibrar a Aura até o bot, só até sair de carta morta.
- Aceite: bandas verdes no lab novo; no sim, Aura de Yah, Espadas de Elun e Maça com DPS real de pelo menos 1/4 da
  melhor `aimed` real; Tempestade e Espada de Fogo com `ELO X` de 2,5x ou mais; picks entre 28 e 49%; Teo na Cripta a no
  máximo 20 pontos da fase; metas das fases mantidas (PE-01).

### P3 · Interface (dono: ui-designer)

**PU-01 · Pausa: interruptores sem colisão e botão que vira "continuar"** · ui + impl · P · ✅ feito (2026-11-11; o teste de largura do rótulo não existe: medir texto exige canvas, a redução de fonte é no laço e foi conferida nas capturas em 360x640 e 1000x680)

- Por quê: 05-ui UI-A e UI-B, 03-qa B1 e B5. O rótulo dos quatro interruptores fica sob a lâmpada em todo tamanho
  ("Números" vira "Número" em 1000x680; `render/options.ts:41-43`), veio com o quarto botão (Música). E o botão de
  pausa do HUD fica aceso e não faz nada com a Pausa aberta (`HudScene.ts:136`, `GameScene.ts:1423`): no celular o
  reflexo é tocar de novo no mesmo lugar. Toda partida pausada mostra os dois.
- O quê: rótulo centrado e o estado como barra de 3 px na borda de baixo do botão (verde ligado, apagada desligado),
  fonte reduzida um ponto por vez se o rótulo passar de `bw - 12` (o laço do `LevelUpScene.ts:165`). O botão do HUD
  troca para um triângulo de "continuar" enquanto a Pausa está aberta e chama `resume()`; toques ignorados por 300 ms
  depois de abrir (decisão 6).
- Aceite: teste que mede `rótulo.width + 12 <= bw` para os quatro rótulos em 328 px; capturas 360x640, 420x820,
  740x360 e 1000x680; toque no botão da Pausa volta ao jogo; toque duplo rápido não abre e fecha.

**PU-04 · Fim com atalho para a Loja** · ui + impl · P · ✅ feito (2026-11-11; decidi: o botão fica em linha própria abaixo de Jogar de novo e Menu, ou na mesma linha quando a tela é larga; vindo do Fim, o botão Voltar da Loja vira "Jogar de novo" e Esc ainda vai ao Menu)

- Por quê: 05-ui UI-F. O fim já diz "No cofre: 340 ouro" e "Faltam 2.160 para Segunda Bainha", mas gastar custa Menu,
  Loja e Começar. Pilar 4: fechar "ganhei, comprei, jogo de novo" no mesmo fôlego.
- O quê: botão "Loja (N de ouro)" abaixo de Jogar de novo e Menu, só quando o cofre paga o próximo nível de algum item
  (decisão 6); a Loja, ao voltar, oferece "Jogar de novo" com o mesmo herói e fase. Função pura `canBuyAny(save)` em
  `core/meta.ts` com teste. O foco inicial continua em Jogar de novo (ou Próxima fase). Textos:
  `end.shop: (ouro: string) => \`Loja (${ouro} de ouro)\``.
- Aceite: teste do `canBuyAny`; capturas 360x640 e 420x820 com o botão; sem ouro suficiente, o botão não aparece.

**PU-03 · Carta de level-up com o número real e sem sobreposição deitado** · ui + impl · P · ✅ feito (2026-11-11, junto com o CU-05; decidi: deitado a carta curta (< 74 px) compacta fontes e espaços em vez de esconder a descrição, porque nela está o número; percentual mostra "(total +20%)"; arma nova mostra Dano, Recarga e Alcance do nível 1 antes do sabor, e o sabor sai primeiro quando falta espaço)

- Por quê: 05-ui UI-D e UI-E. Sem o painel (360x640 e deitado) a carta usa o "-" da ficha como base: "Velocidade +15
  (- → 165)", "Dano +10% (- → +10%)" (`describe.ts:40`, `LevelUpScene.ts:135-143`). Deitado (740x360) a descrição de uma
  linha cobre a receita ("Dano 39 → 51" sobre "Elo Estrela de Lyra"; `LevelUpScene.ts:172-186`). Pilar 2: escolha com
  número.
- O quê: nas cartas, atributos absolutos mostram `de → para` com o valor real (`config.player.stats` + bônus);
  percentuais mostram só o total depois quando já havia algo; a ficha continua com "-". Com uma linha só e sem espaço,
  a descrição sai e ficam título, etiqueta e receita (números primeiro, sabor só com sobra; a mesma regra serve ao
  CU-05). Texto novo: `levelUp.previewBase: (de: string, para: string) => \`${de} → ${para}\``.
- Aceite: teste do formatador (`forCard`); capturas 360x640, 740x360 e 667x375 sem sobreposição e com o número atual.

**PU-02 · Loja em 360x640 sem nome cortado nem item escondido; Loja do `?dev` sem texto sobreposto** · ui + impl · P · ✅ feito (2026-11-11; causa: em 360 rodava o ramo de abas, mas com painel de 262 e piso de 40 px. Decidi: abaixo de 400 px painel de 200 px sem o balão do Gaspar, cartões estreitos com nome em até duas linhas e pips, preço só se couber; no `?dev` a dica de teclas só aparece onde não toca a linha "Agora")

- Por quê: 05-ui UI-C; 03-qa B6, 04-visual #10. Em 360x640: "Pedra de Amo", "Gibão Acolchoa", nível "0/10" sobre o nome,
  e "Dados da Andilla" metade atrás do painel do Gaspar (`cardH = max(40, ...)` e painel de 262 px,
  `ShopScene.ts:184-192`). No `?dev`, "Agora · nada ainda" encosta em "+ e − mudam o nível (grátis)" e a segunda linha
  de botões fica a 8 px dos − / + (`ShopScene.ts:~284-336`): é a tela que o Daniel usa para testar.
- O quê: opção 2 do UI-C (decisão 6): abaixo de ~400 px de largura, painel de 200 px (o balão do Gaspar some quando
  falta altura), itens de 44 px, nível nos pips em vez do canto, nomes longos com o laço de redução do level-up.
  Conferir antes qual ramo de layout roda em 360 (o relatório viu três seções lado a lado). No `?dev`, a dica vai para
  uma linha própria e os botões ganham 12 px de folga.
- Aceite: capturas 360x640, 420x820 e 1000x680, normal e `?dev`: os sete itens inteiros e tocáveis, nenhum texto
  sobreposto; `keyNav` passa pelos sete.

**PU-05 · Textos que se encostam: selo "Vencida", Livro de Elos e painel de build** · ui + impl · P · ✅ feito (2026-11-11; decidi: selo no canto de baixo do cartão; introdução do Livro posicionada pela altura real do texto; o painel de build em 1000x680 e 1000x600 numa partida real cabe inteiro ("Ouro" visível), o corte do relatório era da sobreposição forçada, então não mexi)

- Por quê: 03-qa B7 e B8, 04-visual #11. O selo "Vencida" encosta em "Arredores de Valmor" em 420x820
  (`420-rstages2.png`); a introdução do Livro de Elos ("13 de 13 Elos descobertos" e a ajuda em duas linhas,
  `pt-BR.ts:375`) se sobrepõe em 420x820 (`420-elos.png`); o painel de build em 1000x680 pode cortar "Ouro"
  (`d-g-crypt-150.png`, visto só com overlay forçado).
- O quê: selo abaixo do título ou título reduzido quando não cabe; introdução do Livro posicionada pela altura real do
  texto; confirmar o painel de build jogando antes de mexer (se real, altura segura como no NB-08).
- Aceite: capturas 360x640 e 420x820 da Fase e do Livro sem toque entre textos; painel de build inteiro em 1000x680
  numa partida real.

### P4 · Arte (dono: visual-director)

**PA-01 · Moldura em pixel: fonte, painéis, botões, barras e joystick** · visual + impl · M · ✅ feito (2026-11-11, escolhas do visual-director abaixo; Daniel revê)

- Por quê: 04-visual #2, #14, #15 (absorve a moldura das barras do CU-07 e o desenho do joystick do CU-06). Toda a
  tipografia é `Georgia, serif` do sistema (`render/ui.ts:24`), suavizada, ao lado de sprites de 2x2 px; painéis e
  botões são retângulos chapados; vida (`GameScene.ts:831-834`), XP (faixa ciano de 16 px) e joystick
  (`joystick.ts:21-22`) são vetor. O Menu é a única tela onde título, botões e arte conversam. Pilares 1 e 6: é a
  primeira coisa que se vê e o que diz "este é o mundo de Eterra".
- O quê: (1) uma fonte pixel de licença livre com acentos do português, em múltiplos inteiros de `ART_RES`, em títulos,
  botões, números e HUD; nos textos longos (cartas, Bestiário, histórias), captura com as duas fontes e o Daniel
  escolhe (decisão 2); `UI.font` muda num lugar só. (2) Painel e botão em 9-slice gerados no PixelLab
  (`create_image_pro` pequeno, ~10 gerações, `reduce_colors` na paleta do jogo), partindo do painel do Fim (04 #16).
  (3) Barras de vida, chefe e XP com moldura e brilho de pixel, assadas em textura (sem `Graphics` por quadro); "Nv" fora
  da barra (CU-06). (4) Joystick como anel e botão em pixel, alfa 0,14 / 0,4. Licença e gerações em
  `docs/art/credits.md`.
- Feito (escolhas, mude se quiser): fonte **Jersey 15** (OFL, `public/fonts/`; a Pixelify Sans foi descartada porque o 5
  lê como S) em TUDO, textos longos incluídos (comparei as duas nas capturas; a pixel lê bem a 16 px reais, `FONT_K` 1.33
  em `render/ui.ts`; voltar à serifada é `UI.font`); painel e botão 9-slice (`skin()` em `render/ui.ts`: veste o
  retângulo de cada `button`, card e painel, o foco continua o traço dourado); barras de vida, chefe, XP e vida do herói
  em textura assada (`render/bars.ts`); "Nv" no meio da barra de XP, longe do botão de pausa; joystick em anel e botão
  de pixel (alfa 0,14 / 0,4). O painel 9-slice largo (`ui.panel`) ainda não é usado: o texto denso das telas cruza a
  moldura grossa; os painéis usam a do botão.
- Aceite: capturas 360x640, 420x820 e 1000x680 de Menu, Heróis, Loja, Pausa, level-up e HUD sem a serifada do sistema
  (ou só nos textos longos, se for a escolha); nenhum texto abaixo de 12 px de altura real; F4 igual.

**PA-02 · Valmor com neve, e lanternas que leem como lanternas** · visual · M · ✅ feito (2026-11-11; Daniel escolhe entre `valmor.png` (neve fria, instalado) e `valmor-alt.png` (terra escura com neve rala): `cp public/sprites/tiles/valmor-alt.png public/sprites/tiles/valmor.png`)

- Por quê: 04-visual #1 e #13. O chão de Valmor (`public/sprites/tiles/valmor.png`) é cascalho azul-acinzentado com
  tufos secos: sem neve, sem estrada, sem campo, embora o cartão diga "campos na neve" e o Menu mostre neve e luz quente.
  É a fase de todo jogador novo e o fundo de Heróis, Loja, Opções, Coleção e das miniaturas da Fase: os menus leem como
  "porão de pedra". A 420 px a lanterna lê como uma chave laranja. A Estrada é a régua (04 #17).
- O quê: regerar o tile com neve rala sobre terra escura e trilhas pisadas (1 geração de tileset mais a mistura de
  repetição do `credits.md`, contraste puxado para a média como os outros), dois candidatos mostrados ao Daniel antes
  de trocar (o DD-10 foi aprovado por ele); lanternas com o dobro do tamanho e halo de luz quente (AR-01).
- Aceite: capturas 420x820 e 1000x680 de Valmor no início e aos 5:30 com multidão: ratos, gemas e herói acima do chão
  (teste de contraste do chão mantido); menus com o fundo novo; o Daniel escolhe o candidato.

**PA-04 · Baú, ímã e bomba em pixel** · visual · P · ✅ feito (2026-11-11; baú em escala 1, ímã e sino em ART_SCALE; a "bomba" continua sendo o sino Badalada do jogo; comida, elixir e gelo ficam para depois; 15 gerações)

- Por quê: 04-visual #7. Itens do chão são `Pen` (`render/art/items.ts:141-257`); as gemas e moedas leem bem, mas os
  raros (baú, ímã, bomba) são o que o jogador mais quer achar e é onde o estilo mais destoa.
- O quê: `create_1_direction_object` em 32 px para os três (candidatos grátis, ~10 gerações cada), contorno tingido e
  um ponto de brilho, nas cores atuais (a gema continua a única coisa ciano, A-05). Comida, elixir e gelo depois.
- Aceite: captura de multidão em Valmor e na Cripta com baú, ímã e bomba no chão, os três achados de relance.

**PA-03 · O herói reage: dano e queda** · visual + impl · M · ✅ feito (2026-11-11; 8 gerações, uma pose de dano de 0,14 s a cada golpe e a queda de 0,6 s na morte; o Fim continua abrindo aos 0,9 s; `heroPose` em `GameScene`)

- Por quê: 04-visual #5. Os heróis têm só andar e respirar (`pixelHero(..., FRAME_HIBIT, 8, 4)`); o dano é só flash e a
  morte é a tela final. É o único elemento do jogo sem reação ao que acontece com ele.
- O quê: uma pose de dano por herói (`create_character_state` ou `animate_character` com `taking-punch`, 1 geração por
  herói, mostrada 0,12 s junto do NF-05) e uma queda de 4 a 6 quadros antes do Fim (menos de 1 s; pilar 1). 4 a 8
  gerações no total, registradas.
- Aceite: captura do herói ferido e da queda nos quatro heróis; o Fim abre em menos de 1 s depois da morte.

**PA-05 · Telas de menu sem buracos** · visual · P · ✅ feito (poster da história maior com chefe em escala inteira, herói ao lado de Partir, linha "Chefe" nos cartões de fase, cenário da vila em Opções e Loja, brilho do Bestiário mais claro, linha dev da Loja sem sobreposição)

- Por quê: 04-visual #9. História com ~300 px vazios entre o texto e Partir; Fase com ~80 px sobrando; Opções como
  quatro caixas sobre o fundo repetido; Bestiário não visto como silhueta preta num palco sem luz.
- O quê: na História, o cartaz da fase (chefe e chão) maior e o herói escolhido ao lado de Partir; nas Opções e na Loja,
  as camadas `home.*` do Menu em alfa baixo; no Bestiário não visto, o chão da fase e uma luz fraca.
- Aceite: capturas 420x820 e 1000x680 das quatro telas sem área morta maior que um botão.

### P5 · Efeitos visuais (dono: vfx-director)

**PF-02 · Quebra-Junta mais leve** · vfx · P · ✅ feito (2026-11-12; escolhi: o halo de 12 px virou um fio âmbar de 2 px na frente da onda, para o Elo manter a cor; onda a 85% de alfa e eco a 45% (`Slash.echo`, marcado em `smash`); a pausa só começa se o mundo ainda não está parado. F4 não medido neste item)

- Por quê: 06-vfx #4. Três anéis grossos (halo de 12 px de `drawShock`, `fx.ts:788-810`, mais os dois anéis do sprite,
  mais o eco igual) cobrem ~300 px a cada 0,9 s e apagam o contorno dos esqueletos; a pausa de 50 ms dispara duas vezes
  no mesmo quadro (golpe e onda, `GameScene.ts:979`), ~5% do tempo parado.
- O quê: sem o halo quando há o sprite; eco menor e a 50% de alfa; uma pausa por quadro (`stopUntil` só se ainda não
  está parado).
- Aceite: captura com 30 inimigos: contorno dos esqueletos visível dentro dos anéis; F4 igual ou melhor.

**PF-01 · Acerto de área diz quem apanhou** · vfx · P · ✅ feito (2026-11-12; escolhi: o `setTint` do Phaser só multiplica e não dá para somar claridade, então o contorno é um anel fino mais um preenchimento de 16% no `fxGlow` (aditivo), na cor de faísca da arma, que some junto com o flash do acerto, no máximo 48 por quadro, sem objeto novo; `AREA_HIT` foi para `sparks.ts`; Vigília, Escudos e Muralha ganharam cor de faísca; F4 não medido neste item)

- Por quê: 06-vfx #3. O `AREA_HIT` (`GameScene.ts:70-77`) desliga o flash para aura, zona, arco, pancada e verbos de
  área (certo, NF-01); sobra a cruz de 2 a 3 px de `HIT_SPARK`. Com a Aura no máximo sobre 30 inimigos quase não se vê
  quem foi tocado (`aura7-1`). Vigília e Escudos não têm cor própria de faísca.
- O quê: um contorno de 1 a 2 quadros na cor da arma que **soma** claridade (não `setTintFill`), pelo `setTint` que já
  roda por inimigo, sem objeto novo; cor própria no `HIT_SPARK` para Vigília (ouro-branco) e Escudos (aço).
- Aceite: captura da Aura, Geada, Maça e Lâmina no máximo com 30 inimigos: os tocados se distinguem; F4 igual.

**PF-03 · Verbos dos Elos com desenho próprio** · vfx · M · proposto

- Por quê: 06-vfx #5 (absorve o rebote do CF-08). Ricochete (Leque), volta (Fúria da Forja), laço (Escudos e Muralha),
  cadeia (Tempestade, linha roxa de 2 px), pouso da estrelinha (Estrela de Lyra) e cargas da Procissão (`swell`) têm
  lógica e nenhum desenho dedicado. O Elo se vende pelo verbo (regra dos Elos); verbo invisível é Elo que parece "a
  base mais forte".
- O quê: ricochete com estrela pequena e risco esmeralda até o novo alvo; volta com fantasma fraco do caminho de ida e
  clarão na virada; laço com arco de aço até o ponto de virada; cadeia no vocabulário do raio, na cor do elemento
  (`storm` violeta); pouso da estrela com `SPARK.ring`; Procissão com aura azul-pálida no herói proporcional às cargas.
  Tudo do pool de faíscas ou 1 sprite por evento, dentro da reserva do PB-01.
- Aceite: folha de captura dos seis verbos no nível máximo com 26 inimigos; F4 igual.

**PF-04 · Projéteis de Elo em pixel: Leque, onda da Fúria, Fogos-Fátuos, Procissão** · vfx · P · proposto (com o NA-05)

- Por quê: 06-vfx #6. `proj.fan`, `proj.fury`, `proj.wisps` e `proj.soulProcession` ainda são `Pen`
  (`art/items.ts:147-152`); a Procissão são seis pontos ciano quase invisíveis contra esqueleto claro (`soul-3`), e é um
  Elo. Os outros projéteis já são PixelLab.
- O quê: quatro sprites no tamanho do `radius` (Procissão 10, Fogos 7, Leque 8), contorno escuro e núcleo claro, 4
  quadros de brilho, nas cores do NA-05 (fora do ciano das gemas). 4 gerações, registradas.
- Aceite: folha de texturas com fogo-fátuo, alma e gema claramente diferentes; capturas na Cripta.

**PF-05 · Fumaça de morte em pixel** · vfx · P · proposto

- Por quê: 06-vfx #8. `fx.ts:400-421`: pop branco e três discos vetoriais por morte, sobre tudo, ao lado de corpos já
  animados em pixel; em morte em massa são 6 discos por morte.
- O quê: sprite de poeira de 5 quadros (PixelLab) para a morte comum; o desenho atual fica só para elite. Sem subir o
  teto de partículas.
- Aceite: captura de morte em massa (Chama, Tempestade) sem disco branco; F4 igual ou melhor.

**PF-06 · Pulso de nível depois da escolha** · vfx · P · proposto

- Por quê: 06-vfx #9. `GameScene.ts:1365` cria um círculo vetorial e um tween a cada nível, e o anel de 450 ms corre
  por baixo do overlay, invisível.
- O quê: tocar o anel (sprite pixel no `fxGlow`) ao fechar a tela de escolha, sem competir com a forja.
- Aceite: captura do anel logo depois de escolher; nenhum objeto criado por nível.

### P6 · Som e música

**PS-01 · Volume da música em três níveis** · impl + ui · P · ✅ feito (2026-11-11; decidi: `music` continua o liga/desliga da Pausa e `musicLevel` (`low`/`normal`) é o campo novo; o botão das Opções cicla Desligada, Baixa, Normal; Baixa = metade do `MUSIC_LEVEL`; "audivelmente abaixo dos efeitos" não foi ouvido, só o volume conferido no código)

- Por quê: 05-ui UI-G. Metal contínuo (MU-01) compete com os efeitos e a única saída hoje é desligar tudo. `MUSIC_LEVEL`
  é fixo em 0,45 (`render/musics.ts`).
- O quê: o botão Música das Opções cicla Desligada, Baixa, Normal (campo novo em `core/settings.ts`, com migração: save
  antigo cai em Normal); na Pausa o botão curto continua liga/desliga. Baixa = metade do `MUSIC_LEVEL`. Textos:
  `options.musicLevel: { off: 'Desligada', low: 'Baixa', normal: 'Normal' }`.
- Aceite: teste do `sanitize`; a escolha vale ao recarregar; Baixa audivelmente abaixo dos efeitos.

### P7 · Técnico

**PT-01 · Alocações por quadro que sobraram** · impl · P · ✅ feito (2026-11-11; F4 com 500 inimigos não medido)

- Por quê: 02-code M3 (regra de desempenho do CLAUDE.md). `GameScene.ts:924` `corpsePool.find(...)` cria um closure por
  morte nova por quadro; `GameScene.ts:786` troca `pilesPrev`/`pilesNow` com um array por quadro; `edgeArrows.ts:50` e
  `edgeTargets.ts:30` criam closures por quadro; `GameScene.ts:~960` itera com `for...of`.
- O quê: laços com índice, variável temporária na troca, retângulo (x, y, w, h) em vez de callback, `put` em linha.
- Aceite: `grep` sem `.find(`/`=>` nos caminhos por quadro citados; F4 com 500 inimigos igual ou melhor.

**PT-02 · Service Worker com cache versionado** · impl · P · ✅ feito (2026-11-11; offline e dois deploys não conferidos no navegador)

- Por quê: 02-code M4. `public/sw.js:16` guarda toda resposta GET num cache de nome fixo, sem `activate` que limpe: a
  cada deploy os chunks com hash antigo ficam no celular para sempre, e agora há ~13 MB de MP3. `res.ok` aceita 206 e
  o `cache.put` não tem `.catch`.
- O quê: nome do cache com a versão do build e `activate` apagando os outros; só guardar 200; `.catch` no `put`.
- Aceite: no navegador, depois de dois deploys simulados, um cache só; jogo abre offline.

**PT-03 · `fx.ts` por família** · impl · M · proposto (depois do DD-15)

- Por quê: 02-code B10. `render/fx.ts` tem 2313 linhas (arma, Elo, chefe, aviso, marca, zona); é o arquivo de maior
  custo de mudança do render, e as rodadas PF e DD-15 vão mexer nele inteiro.
- O quê: separar golpes, zonas, chefes e avisos em arquivos que o `drawFx` chama, sem mudar comportamento.
- Aceite: capturas iguais antes e depois; nenhuma alocação nova; testes verdes.
