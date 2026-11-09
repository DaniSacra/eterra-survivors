# Revisão de efeitos visuais (vfx-director) · 2026-11-09

- Commit `3b9939c`. Só revisão: nada em `src/`, `tests/` ou `docs/design/` foi alterado.
- Método: li `render/fx.ts`, `render/sparks.ts`, `render/shapes.ts`, `render/art/items.ts`, `scenes/GameScene.ts`,
  `data/weapons.ts`, `core/weapons.ts`, `core/projectiles.ts`, `core/elos.ts` e `core/enemies.ts`. Rodei o jogo em
  `localhost:4177/?dev` com Playwright. Para cada arma (L1, L7 e Elo) capturei uma rajada de 6 quadros (~90 ms) com
  30 inimigos imortais em volta do herói. Golpes rápidos (Lâmina, estocada, Fúria, Maça, Quebra-Junta, escudos)
  foram capturados em câmera lenta de 0.1x (passo do `World` multiplicado) e zoom 2x. Nas armas de alcance desenhei
  círculos magenta no raio real de acerto para comparar com o efeito.
- Capturas (scratchpad, fora do repo):
  `/tmp/claude-1000/-home-dani-games-eterra-survivors/fa0bf9c7-8ee4-4a47-a092-cca892969417/scratchpad/vfx/`
  (`sheet-<arma>-p.png` = folhas 420x820; `full-*-w.png` = 1000x680; scripts `vfx.mjs` e `perf.mjs`).
- Fora desta lista porque já foram feitos: RF-01 a RF-11, A-04, A-05, A-06, A-07, A-14, CC-09, a Rodada UI de
  2026-11-09 e os efeitos dos Elos (commits `1b039d7`, `e173cbb`, `3621033`, `71124a8`). A L-01 (medir num celular
  real) continua aberta e vale para todas as propostas.

## Feedback do Daniel: as versões novas leem bem?

| Pedido                                  | Hoje                                                                                                                                                                                                                                                                            | Veredito                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Estocada da Lâmina com cara de estocada | Losango dourado comprido saindo do herói, miolo branco, estrela na ponta, linhas de velocidade (`fx.ts:758-797`). No L7 a ponta chega ao alcance real (195 px, conferido com o círculo magenta). `sheet-blade-p.png`                                                            | **Lê bem.** Dois ajustes pequenos (#9)                            |
| Escudos que dizem "empurra" e empurram  | Funciona: no L7 os escudos abrem um anel vazio em volta do herói, no raio da órbita (`sheet-shieldPush-p.png`). Mas cada batida individual mostra só o flash branco e a estrela, sem nada de "empurrão"                                                                         | **A mecânica lê pelo padrão que forma, o golpe não.** Proposta #2 |
| Maça: golpe que atordoa, onda a cada 3  | Atordoamento claro (estrelinhas, `fx.ts:1016`). Onda de choque legível (anel de poeira até o raio exato, inimigos jogados longe). Já a pancada é só uma sombra e depois uma meia-lua de poeira bege: **a maça nunca aparece**, e o dano chega ~70 ms antes do impacto desenhado | **A onda lê bem, a pancada é fraca.** Proposta #3                 |
| Nenhuma arma treme a tela               | Conferido: `shake` só em herói ferido, chefe, Badalada, Corte Brutal e forja (`GameScene.ts:514, 606, 713, 812, 820, 844`)                                                                                                                                                      | **Ok**                                                            |

## Ranking por impacto

| #   | Achado                                                                                                                                   | Onde                                                              | Custo da correção                          | Core                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------ | ------------------------------------ |
| 1   | Espada de Fogo vira um tapete laranja: 20 a 28 chãos em brasa somados, a multidão inteira laranja e o branco das 7 espadas cobrindo tudo | `fx.ts:946-968`, `GameScene.ts:333, 338`, `TINT.burn` `fx.ts:168` | baixo; reduz o custo atual                 | nenhum                               |
| 2   | Empurrão sem forma: o golpe que empurra parece igual ao que não empurra                                                                  | `GameScene.ts:322-327`, `sparks.ts:132-139`                       | baixo (teto como as estrelas de atordoado) | nenhum (`e.kbx`/`e.kby` já existem)  |
| 3   | Maça sem maça: sombra, depois poeira, e o dano chega antes do impacto; nada avisa qual golpe trará a onda                                | `fx.ts:682-721`, `fx.ts:132`                                      | baixo                                      | nenhum (`w.swings` já existe)        |
| 4   | O acerto não diz quão forte foi; o crítico (Adagas, Leque) some se os números estiverem desligados                                       | `sparks.ts:132-139`, `GameScene.ts:302`                           | zero por quadro                            | 1 campo: `Enemy.hitAmount` (+ teste) |
| 5   | Onda da Fúria desenhada com metade do tamanho do acerto; nenhum projétil cresce com Área                                                 | `items.ts:147`, `weapons.ts:442`, `GameScene.ts:258`              | zero (escala já é posta por quadro)        | nenhum                               |
| 6   | Sangramento pinta o esqueleto de verde-esmeralda: vira "Gosma"                                                                           | `fx.ts:167`, `GameScene.ts:338`                                   | zero                                       | nenhum                               |
| 7   | Nevasca: ~15 zonas de 85 px a 0.22 tingem a tela inteira de azul                                                                         | `fx.ts:891-892`                                                   | zero                                       | nenhum                               |
| 8   | Verbos de Elo sem aviso: o pulso da Chama (1 a cada 10 ticks) e o acúmulo da Procissão não aparecem antes de acontecer                   | `fx.ts:813-876`, `weapons.ts:466, 558`                            | baixo                                      | nenhum (`w.swings`, `w.stacks`)      |
| 9   | Estocada e Fogo pousam depois do dano; o comentário da estocada fala em "recolher", o código não recolhe                                 | `fx.ts:768-770`, `fx.ts:148` com `boltTtl 0.22`                   | zero                                       | nenhum                               |
| 10  | Quebra-Junta quase sem o âmbar do elemento: a borda bege a 0.95 cobre o brilho a 0.45                                                    | `fx.ts:706-711`, `fx.ts:739-744`                                  | zero                                       | nenhum                               |
| 11  | Chama de Yah: línguas pequenas (raio 5) num círculo de 150 px parecem velinhas, não fogueira                                             | `fx.ts:862-875`                                                   | igual ao atual                             | nenhum                               |
| 12  | Procissão quase invisível com a multidão colada: as 9 luzes gastam o alvo e somem sob o herói                                            | `GameScene.ts:248`, `weapons.ts:552-570`                          | zero                                       | nenhum                               |
| 13  | Formas que ainda passam pelos círculos de 100 pontos do Phaser (escudos, luz do herói, baú)                                              | `fx.ts:233-235, 340-342, 1401, 1407`                              | ganho pequeno                              | nenhum                               |
| 14  | Reviver ainda usa `cameras.main.flash` de tela inteira (o RF-04 tirou todos os outros)                                                   | `GameScene.ts:872`                                                | zero                                       | nenhum                               |

---

## 1. Espada de Fogo: o chão em brasa encobre a luta (alto)

- **Faz** (`weapons.ts:532-536`, `core/weapons.ts:511-518`): a cada 0.8 s caem 7 espadas de raio 70. Cada uma
  deixa o chão queimando por 2.5 s e incendeia quem passa (`burn`).
- **Hoje** (`sheet-fireSword-p.png`, `full-fireSword-L1-w.png`): ficam 20 a 28 zonas ao mesmo tempo (medido:
  21 a 28), cada uma com dois discos marrom-laranja e 7 chamas (`fx.ts:950-967`). Juntas formam um tapete
  marrom-alaranjado que cobre a tela. A tinta `TINT.burn 0xffa070` multiplicada sobre o esqueleto branco deixa a
  multidão inteira laranja chapada, e ninguém distingue mais esqueleto, morcego ou elite. No quadro do impacto,
  as 7 espadas pintam de branco (`setTintFill`) todo inimigo dentro de 70 px: em dois dos seis quadros a multidão
  vira uma única mancha branca. `strike` não está em `AREA_HIT` (`GameScene.ts:56-58`), então o RF-06 não vale aqui.
- **Deve mostrar**: "onde a espada caiu, o chão queima". Uma marca por espada, legível, que não esconda quem pisa.
  1. Alfa do chão dividido pela quantidade de zonas de fogo ativas: `fade * min(1, 6 / n)`, com `n` contado uma vez
     por quadro antes do laço de zonas. A borda (`ring`) continua a 0.6: as bordas dizem "onde", o recheio não precisa
     se somar.
  2. Chamas por zona: 7 até 8 zonas, 3 acima disso (o mesmo teto por contagem). Isso também baixa o custo.
  3. `TINT.burn` mais claro (`~0xffd8c0`), para o inimigo seguir reconhecível. O "está pegando fogo" fica com as
     brasas que já sobem (`dotSpark`, `GameScene.ts:638-644`).
  4. Flash branco só nos `strikeNumbers` primeiros acertos de cada raio, aproveitando `world.numberBudget`, ou
     tratar `fireSword` e `storm` como área no `AREA_HIT`. Os demais mostram faísca e squash.
- **Custo**: menos que hoje. No F4 a 4x (Chromium headless, 500 inimigos) a Espada de Fogo ficou entre as piores:
  24 a 30 FPS contra 35 a 43 sem armas, com o `World.step` em ~6 ms contra ~4 ms (a queima no core pesa tanto
  quanto o desenho). A máquina oscila ±8 FPS entre leituras iguais, então leia esses números como relativos.

## 2. Empurrão com forma: rastro de empurrão lido do `kbx/kby` (alto)

- **Faz**: escudos (600 a 750), ondas da Maça e do Quebra-Junta (700 a 800), pulso da Chama (320), Martelo e Fúria
  da Forja (260 a 400) jogam inimigos a ~knockback / 10 px.
- **Hoje**: o empurrão acontece de verdade (os escudos limpam um anel, o Quebra-Junta esvazia a tela), mas o golpe
  que empurra tem a mesma cara de qualquer acerto: flash branco e estrela (`sparks.hit`). Num quadro parado, o
  inimigo empurrado parece só ter andado.
- **Deve mostrar**: enquanto `hypot(e.kbx, e.kby)` passar de ~250, o inimigo deixa 2 riscos curtos de poeira atrás
  de si, na direção contrária à do empurrão (comprimento proporcional à velocidade). E um puff de poeira nos pés
  (`SPARK.ring` pequeno) no quadro em que o empurrão começa. O jogador vê "foi arremessado", vindo de qualquer arma,
  sem código por arma.
- **Custo**: um laço sobre os inimigos em `drawFx`, do jeito do `drawStuns` (`fx.ts:1016-1039`), com teto de ~40
  por quadro. Duas `lineBetween` por inimigo empurrado, sem alocação. O laço já existe duas vezes (`drawStuns`,
  `drawCharges`): dá para juntar os três num laço só e ganhar desempenho.

## 3. Maça de Ferro: mostrar a maça, pousar com o dano e anunciar a onda (alto)

- **Faz** (`weapons.ts:395-418`, `core/weapons.ts:214-227`): pancada à frente, raio 48 a 60, atordoa 0.4 s. A cada
  3 golpes, onda de raio 105 a 125 que arremessa.
- **Hoje** (`sheet-mace-p.png`, zoom 2x a 0.1x): nos primeiros 18% dos 0.4 s (~72 ms) só aparece uma sombra crescendo
  (`fx.ts:690-696`). O dano, o flash e as estrelinhas de atordoado chegam no quadro 0, **antes** do impacto
  desenhado. Depois vem uma meia-lua de poeira bege de 216° com seixos. A maça em si nunca aparece, e a meia-lua clara
  sobre o chão de neve azul tem pouco contraste: o golpe lê como "caiu algo" e não como "Aldo desceu a maça". Nada
  diz que o terceiro golpe vem com a onda. A onda em si lê muito bem.
- **Deve mostrar**:
  1. **A cabeça da maça** cravada no ponto de impacto no quadro 0 (um `drawMace` simples: cabo e cabeça redonda com
     cravos, tinta INK, como o `drawSword`). Ela afunda com squash 1.2 x 0.8 e some em ~0.15 s. O impacto (amassado
     escuro, poeira, seixos) começa no quadro 0, junto com o dano. A sombra de "descida" sai, porque a antecipação
     não pode vir depois do dano.
  2. Um **anel de impacto mais escuro** (`DENT` a ~0.5, 3 px) exatamente no raio, além da poeira clara: "aqui
     acertou" com contraste nos três chãos.
  3. **Contagem para a onda**: 2 pontinhos âmbar sob o herói (ao lado da barrinha de vida) que acendem com
     `w.swings % waveEvery`. No golpe da onda, a cabeça da maça brilha branca. O jogador aprende o ritmo
     "pá, pá, BUM" sem ler nada.
- **Custo**: igual ao de hoje (troca a sombra pela cabeça); os pontinhos são 2 `disc` por quadro.

## 4. O acerto diz quão forte foi; crítico visível (médio-alto)

- **Faz**: um acerto de 13 da Lâmina L1 e um de 161 da estocada L7 têm a mesma faísca (`sparks.hit`, tamanho por
  `e.def.radius`, `sparks.ts:132-139`) e o mesmo squash 0.15 (`GameScene.ts:302-305`). O crítico de Adagas e Leque
  (x2 e x3) só aparece pelo número amarelo, e com a opção "números de dano" desligada ele some.
- **Deve mostrar**: faixas de força. Comum: a estrela de hoje. Forte (`>= config.effects.strongHit`): estrela 1.5x,
  squash 0.25 e um anelzinho branco. Crítico: estrela dupla em cruz na cor da arma (vermelho de Andilla nas Adagas,
  esmeralda no Leque) e um "tic" de 2 linhas de corte cruzando o inimigo.
- **Core**: um campo `Enemy.hitAmount` (número) atribuído em `damageEnemy` (`enemies.ts:174`), igual ao `hitBy`, mais
  um booleano `hitCrit` setado em `projectiles.ts:186`. Zero alocação, com teste unitário. O render compara com
  `strongHit`.
- **Custo**: nenhum por quadro além do que `sparks.hit` já faz; o crítico usa 1 a 2 faíscas a mais do mesmo pool.

## 5. Projéteis no tamanho do acerto (médio)

- **Faz**: a onda da Fúria acerta num raio de 34 x Área (`weapons.ts:442`, `core/weapons.ts:199`), ou seja, ~68 px
  de largura mais o raio do inimigo.
- **Hoje**: o sprite `crescent(18)` (`items.ts:147`) tem 36 px. A onda mostra metade do que corta
  (`sheet-fury-p.png`, a meia-lua vermelha pequena à direita). O mesmo vale, em menor grau, para a Fúria da Forja
  (raio 18, martelo de ~31 x 26) e para todo projétil quando o herói pega Área: o `radius` cresce, o sprite não
  (`GameScene.ts:258`, escala fixa `ART_SCALE`).
- **Deve mostrar**: uma tabela `SPRITE_RADIUS` (raio de desenho de cada `proj.*`) e
  `setScale(ART_SCALE * p.radius / SPRITE_RADIUS[p.sprite])` no lugar da escala fixa. A meia-lua da Fúria passa a ter
  o tamanho do corte e a ganhar um rastro curto (já existe `TRAIL`; falta a entrada `fury`).
- **Custo**: zero (o `setScale` já roda por quadro para o giro).

## 6. Sangramento não pode virar "Gosma" (médio)

- `TINT.bleed 0x8ef0b4` (`fx.ts:167`) multiplicado sobre esqueleto, Ossada e rato deixa o corpo verde-menta, a mesma
  família da Gosma Verde da Cripta e dos slimes de Valmor (`sheet-fan-p.png`: metade da multidão verde ao lado das
  gosmas). Com o Leque, 30% de crítico, quase todo inimigo perto de Andilla fica verde.
- **Deve mostrar**: tinta quase branca (`~0xe0f4e8`), deixando o "sangra" para as gotas esmeralda que já pingam
  (`dotSpark`), mais uma gotinha fixa sobre a cabeça enquanto `e.dot > 0` (como as estrelas do atordoado, com o mesmo
  teto). Fofo, nunca sangue vermelho, e o inimigo continua reconhecível.
- **Custo**: zero, ou uma forma por inimigo sangrando dentro do teto.

## 7. Nevasca lava a tela de azul (médio)

- **Faz**: 5 zonas de 85 px a cada 1.4 s, duração 4 s (`weapons.ts:502-503`): ~15 zonas vivas.
- **Hoje** (`sheet-blizzard-p.png`): os discos a 0.22 se somam. Onde três se cruzam o chão chega a ~0.5 de azul, e
  a tela inteira fica azul-clara com bordas azul forte por toda parte. As gemas continuam visíveis (A-05 cumprido),
  mas os inimigos tingidos de branco-lilás somem no fundo claro.
- **Deve mostrar**: o mesmo divisor por contagem do #1 (`0.22 * min(1, 5 / n)` só no recheio). Bordas e flocos ficam
  como estão. A borda azul forte (`BLIZZARD_EDGE`, 4 px) cai para 3 px a 0.6 quando `n > 8`.
- **Custo**: zero. No F4 a Nevasca também ficou entre as mais caras de desenhar (23 a 35 FPS com o `step` igual ao
  base), então desenhar menos ajuda.

## 8. Os verbos dos Elos precisam ser anunciados (médio)

- **Chama de Yah `pulse`** (`weapons.ts:466`): a cada 10 ticks (3 s) vem uma onda 1.25x mais longe que empurra. Hoje
  ela chega sem aviso. Proposta: o anel de borda esquenta conforme `w.swings % pulse.every` se aproxima do pulso
  (alfa e espessura sobem, as línguas crescem nos 3 últimos ticks) e, no tick anterior, um círculo fino tracejado
  aparece no raio do pulso (`radius * 1.25`). O jogador vê até onde vai e quando. Custo: 1 `ring` a mais.
- **Procissão `swell`** (`weapons.ts:558`): cada abate soma uma alma (até 4) por 4 s. Hoje nada mostra o acúmulo.
  Proposta: `w.stacks` luzinhas cor de alma girando juntinho do herói (raio ~22), que se apagam quando
  `w.stackTime` passa. Custo: até 4 `disc`.
- **Luz Sagrada `mend`**: as cruzes de cura no herói já aparecem (`healSpark`). Está bom; não precisa de mais nada.

## 9. Sincronia: o desenho pousa depois do dano (baixo-médio)

- Estocada: o dano é instantâneo e o losango leva 30% de 0.18 s (~54 ms) para chegar à ponta (`fx.ts:768-770`): no
  quadro do acerto os inimigos já piscam branco e a lâmina ainda não chegou neles (`sheet-blade-p.png`, quadros 2
  e 3 do L7). Proposta: chegar a 80% do comprimento no quadro 0 e esticar o resto em 0.1 da vida. O comentário diz
  que ela "recolhe enquanto some" (`fx.ts:756`); o código só desbota. Ou recolher de verdade (o comprimento volta a
  ~70% no fim), o que fica mais bonito, ou corrigir o comentário.
- Fogo e Espada de Fogo: `FALL 0.25` de `boltTtl 0.22` dá ~55 ms de bola caindo depois do dano. É curto demais para
  ler a queda e longo o bastante para a faísca de acerto chegar antes do fogo. Proposta: queda de 0.12 da vida, ou
  `FALL` desenhado antes do dano (exigiria atraso no core, não vale).

## 10. Quebra-Junta sem o âmbar do elemento (baixo-médio)

- Na pancada e na onda, o brilho do elemento (`SLAM_GLOW`, âmbar `0xe0a030`) está a 0.45 por baixo de uma borda bege a
  0.95 (`fx.ts:706-711`, `fx.ts:739-744`). Nas capturas (`sheet-jointBreaker-p.png`) o Elo lê como a Maça maior,
  bege. Proposta: no Elo, a borda principal em âmbar e o bege como fio interno; as rachaduras (que o Daniel não
  queria) continuam fora. O tremor de segunda onda (`aftershock`) já aparece e lê bem.

## 11. Chama de Yah: fogueira, não velinhas (baixo)

- As 16 línguas têm base de 5 px e altura de 9 a 20 px num círculo de 150 px (`fx.ts:862-875`). Em 420x820 parecem
  uma cerca de velas (`sheet-yahFlame-p.png`). Proposta: 10 línguas maiores (base 9, altura 16 a 30) em dois tons e
  com contorno claro, o mesmo número de triângulos. O "pulso" do #8 cresce a partir delas.

## 12. Procissão some com a multidão colada (baixo)

- Com os inimigos encostados no herói, as 9 luzes atravessam os alvos em poucos quadros e ficam sob o sprite do herói
  (projéteis na profundidade 12, herói na 13). Nas capturas, nenhuma aparece (`sheet-soulProcession-p.png`). Numa
  partida real com espaço em volta ela aparece; mesmo assim, um rastro (`TRAIL.soulProcession` já existe) com
  `len` 0.3 e um halo maior que o do Fogo-Fátuo a separariam melhor. Não é bug de efeito, é o caso extremo da
  mecânica; registro para o teste de jogo.

## 13. Formas com 100 pontos que sobraram (baixo, desempenho)

- `drawShield` usa `strokeCircle` duas vezes por escudo (`fx.ts:1401, 1407`): a Muralha (6 escudos) monta 12
  caminhos de 100 pontos por quadro. A luz do herói usa `fillEllipse` e dois `strokeEllipse` (`fx.ts:233-235`), e o baú
  `strokeEllipse` (`fx.ts:340-342`). Trocar por `ring`/`disc` de `render/shapes.ts` (uma elipse é um `ring` com
  escala em y; dá para criar `ellipseRing` com a mesma tabela). Ganho pequeno, mas de graça, e coerente com a medição
  F4 da R3.

## 14. Reviver com flash de tela inteira (baixo)

- `GameScene.ts:872`: `cameras.main.flash(400, 255, 240, 200)`. Fica fora no modo calmo, mas o RF-04 tirou todos os
  outros. Proposta: reaproveitar o momento do baú (raios na cor do herói, `m.chest`) e o anel de nível que já existe,
  sem o véu.

---

## Arma por arma (o que não entrou no ranking)

| Arma (base, L7, Elo)      | Faz                                                  | Hoje                                                                                                            | Veredito                                                                                      |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Lâmina / Fúria            | leque à frente, estocada a cada 2; Fúria gira + onda | varredura com borda âmbar no alcance exato; Fúria com volta inteira no raio 134 (magenta)                       | bom; #5 e #9                                                                                  |
| Luz de Elun / Luz Sagrada | luzes que buscam alvo                                | rastro verde-dourado de Teo; Luz Sagrada com estrela                                                            | bom                                                                                           |
| Aura de Yah / Chama       | tick de área em volta                                | onda no tick até o raio; no L1 a onda (4 px até 1 px) quase some sob a multidão                                 | ok; #8 e #11                                                                                  |
| Adagas / Leque            | facas à frente, crítico; Leque ricocheteia e sangra  | traço vermelho; o ricochete lê pela mudança de direção do traço                                                 | #4 e #6                                                                                       |
| Cajado / Estrela de Lyra  | orbe que explode; Estrela solta estrelinhas          | estouro lilás no raio exato; as estrelinhas voam retas, sem "cair"                                              | ok; um pulinho em arco (`sin(pi*k)`) no y das estrelinhas daria o "cair" do verbo, custo zero |
| Espadas / Vigília         | órbita; Vigília avança no alvo                       | rastro em setor, anel dourado com marcas, investida visível (`sheet-vigil-p.png`)                               | muito bom                                                                                     |
| Escudos / Muralha         | órbita que arremessa; Muralha guarda um golpe        | anel limpo pela mecânica; bolha e arco de recarga                                                               | #2                                                                                            |
| Geada / Nevasca           | zonas que lentificam; Nevasca estilhaça              | pouso, tick e borda partida; estilhaço com lascas                                                               | #7                                                                                            |
| Raio / Tempestade         | raios em inimigos; Tempestade encadeia               | zigue-zague próprio, roxo de Lyra; com alvos juntos, os 8 raios viram uma cortina roxa sobre o herói por 0.22 s | aceitável (curto)                                                                             |
| Fogo / Espada de Fogo     | área no alvo; Espada queima o chão                   | flor de pétalas no raio exato; Espada: #1                                                                       | #1 e #9                                                                                       |
| Martelo / Fúria da Forja  | atravessa; Forja volta                               | gira, rastro largo, brasas; a volta lê                                                                          | bom; #5 (tamanho)                                                                             |
| Fogos-Fátuos / Procissão  | luzes lentas                                         | fila ondulante                                                                                                  | #8 e #12                                                                                      |
| Maça / Quebra-Junta       | pancada que atordoa, onda                            | ver o quadro do feedback                                                                                        | #3 e #10                                                                                      |

Acertos, mortes, coleta, estados e avisos de chefe não mudaram desde a R3 e continuam lendo bem: pop, nuvenzinhas e
estrelas, confete da elite, anéis do chefe, estrelas de atordoado, gotas e brasas, lascas do congelado, setas de
investida, aviso coral listrado. O único achado novo nesse grupo é o verde do sangramento (#6).

## Desempenho (medição desta revisão)

Chromium headless com GL por software, 420x820, CPU 4x, 500 inimigos imortais, média de 10 leituras de `actualFps`.
A máquina varia até ±8 FPS entre duas rodadas iguais, então os números são relativos:

| Conjunto                                                            | FPS     | `World.step` |
| ------------------------------------------------------------------- | ------- | ------------ |
| sem armas                                                           | 32 a 43 | ~4.0 ms      |
| Espada de Fogo                                                      | 24 a 30 | ~6.1 ms      |
| Nevasca                                                             | 23 a 35 | ~3.8 ms      |
| Tempestade                                                          | 25 a 37 | ~4.2 ms      |
| Chama de Yah                                                        | 26 a 31 | ~5.6 ms      |
| 6 Elos (Espada de Fogo, Nevasca, Tempestade, Chama, Vigília, Fúria) | 18 a 21 | ~3.7 ms      |

Os itens 1, 7 e 13 reduzem o custo de desenho. Os itens 2, 3, 4, 8 e 10 custam no máximo algumas formas por quadro,
com teto. Nenhuma proposta aloca por quadro, e só o #4 toca o core (dois campos numa entidade que já existe, mais um
teste). Antes de aceitar, medir no F4 lado a lado com o commit atual, como na R3.

## Ordem sugerida

1. #1 e #7 juntos (divisor por contagem nas zonas, tinta de queima, flash só nos primeiros): legibilidade e FPS.
2. #3 (Maça) e #2 (rastro de empurrão): respondem direto ao feedback do Daniel sobre a Maça e os escudos.
3. #4 e #5: "quão forte" e "onde", para todas as armas.
4. #6, #8, #9, #10, #11: acabamento dos Elos.
5. #12, #13, #14: quando der.
