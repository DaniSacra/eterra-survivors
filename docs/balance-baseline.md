# Linha de base de balanceamento

Cada etapa acrescenta aqui sua tabela antes/depois. `npm run sim` (48 partidas, bot de `tests/lab/bot.ts`) e
`npm run lab` (DPS por arma). Os números do sim são relativos: o bot não é um humano.

## Etapa 0 · linha de base (2026-11-08, commit 09e4092)

### Sim (resumo por herói e fase, 4 sementes)

```
SUMMARY  hero    stage     wins  avg time  avg lvl  reached10  elos/run  gold/min  fast dmg
         aldo    valmor    1/4       6:43     21.8          1       0.8      23.3       25%
         aldo    crypt     0/4       5:20     15.0          0       0.0      11.7       41%
         aldo    southRoad 0/4       5:49     15.5          0       0.0      13.1       32%
         lyra    valmor    0/4       5:05     15.5          0       0.0      20.7       48%
         lyra    crypt     1/4       6:40     22.8          1       0.5      24.6       55%
         lyra    southRoad 0/4       2:58      9.0          0       0.0      10.8       44%
         teo     valmor    0/4       5:38     17.8          0       0.0      11.9       27%
         teo     crypt     0/4       6:42     19.0          0       0.0      16.2       37%
         teo     southRoad 0/4       5:54     18.0          0       0.0      15.3       52%
         andilla valmor    0/4       4:48     12.8          0       0.0      19.0       46%
         andilla crypt     1/4       6:43     25.0          1       0.8      33.7       39%
         andilla southRoad 0/4       4:36     14.3          0       0.0      25.4       52%
```

### Lab (DPS solo contra um alvo e em multidão; L1, nível máximo e Elo)

```
  solo blade          L1    11.5  Lmax    52.2  Elo     74.4
arc     blade          L1    80.5  Lmax  1983.6  Elo(fury)   4092.0
  solo elunLight      L1     7.2  Lmax    72.0  Elo    194.4
homing  elunLight      L1     7.2  Lmax   216.0  Elo(holyLight)    970.8
  solo yahAura        L1     5.8  Lmax    24.8  Elo     38.4
aura    yahAura        L1    46.8  Lmax   569.3  Elo(yahFlame)   1881.6
  solo daggers        L1     8.0  Lmax    92.8  Elo      0.0
thrown  daggers        L1     8.0  Lmax   278.4  Elo(fan)   1720.0
  solo paladinSwords  L1     5.0  Lmax    46.0  Elo     63.8
orbit   paladinSwords  L1    86.5  Lmax  1242.0  Elo(vigil)   2066.9
  solo frost          L1     8.0  Lmax    24.4  Elo     42.3
zone    frost          L1    64.8  Lmax   848.8  Elo(blizzard)   3146.8
  solo lightning      L1     9.0  Lmax    22.8  Elo     50.0
strike  lightning      L1    41.4  Lmax   431.3  Elo(storm)   2432.5
  solo hammer         L1     9.9  Lmax    79.2  Elo    168.0
thrown  hammer         L1    39.6  Lmax   475.2  Elo(forgeFury)   2352.0
  solo wisps          L1     7.8  Lmax    44.0  Elo    144.0
homing  wisps          L1    15.6  Lmax   130.9  Elo(soulProcession)    720.0
  solo bells          L1     4.2  Lmax    32.0  Elo     69.8
orbit   bells          L1   147.7  Lmax  1384.0  Elo(funeralToll)   3944.3
```

## Etapa 2 · balanceamento (2026-11-08)

Mudanças: curva E-01 com o fim um pouco mais duro (390 s hpMult 2.8, 480 s 3.5, 540 s 4.1); rápidos a 120–126;
Adagas mirando no mais próximo e mais fortes no começo (L1: 2 facas, dano 12, atravessa 1, recarga 0.8);
Leque com mira (dano 15, recarga 0.55); Luz de Elun, Fogos-Fátuos, Aura, Martelo e Lâmina L1 mais fortes; primeiro
raio da Lyra no mais próximo, Lyra vida -10; chefes 12–14 mil de HP, cada um com uma mecânica telegrafada;
Golem 650; Cripta alterna Golem e Goblin; xp step 7; Fúria 60, Vigília 28; armadura até 3; ouro: moeda 3,
chance 0.03, baú 25; Andilla velocidade +20 → +10 (com o Leque consertado, ela vencia 28 de 30).

Antes (Etapa 0): 3 vitórias em 48, nenhum herói com média de 6 min em Valmor (Andilla 4:48).
Depois: 34 vitórias em 48; todos os heróis com média de 8:19 ou mais em todas as fases; luta de chefe com
mediana de cerca de 50 s. Snapshots acima de 600 inimigos só em 3 corridas com build que não mata.
Andilla ganha mais ouro por causa da Ganância própria (+25%).

### Sim

```
SUMMARY  hero    stage     wins  avg time  avg lvl  reached10  elos/run  gold/min  fast dmg
         aldo    valmor    3/4       8:55     39.3          3       1.5      38.0       11%
         aldo    crypt     1/4       8:19     29.8          1       0.5      24.0       12%
         aldo    southRoad 3/4       9:14     41.5          3       2.0      40.3       10%
         lyra    valmor    4/4      10:00     49.0          4       2.5      45.2       27%
         lyra    crypt     2/4       7:43     34.5          2       1.5      31.6       30%
         lyra    southRoad 3/4      10:00     50.0          4       2.3      47.0       46%
         teo     valmor    3/4       9:34     42.5          3       1.5      40.3       15%
         teo     crypt     2/4       8:47     37.8          2       1.3      32.4       17%
         teo     southRoad 3/4       9:02     40.0          3       2.3      42.7       38%
         andilla valmor    4/4      10:00     47.3          4       2.8      63.2      100%
         andilla crypt     3/4      10:00     48.8          4       2.8      60.8        9%
         andilla southRoad 3/4      10:00     48.5          4       3.3      58.6       21%
```

### Lab

```
  solo blade          L1    11.5  Lmax    52.2  Elo     93.0
arc     blade          L1   115.0  Lmax  1983.6  Elo(fury)   5115.0
  solo elunLight      L1    14.4  Lmax   125.0  Elo    194.4
homing  elunLight      L1    14.4  Lmax   375.0  Elo(holyLight)    970.8
  solo yahAura        L1     7.8  Lmax    30.3  Elo     44.8
aura    yahAura        L1    62.4  Lmax   695.8  Elo(yahFlame)   2195.2
  solo daggers        L1    30.0  Lmax   121.8  Elo     27.0
thrown  daggers        L1    60.0  Lmax   487.2  Elo(fan)   1064.3
  solo paladinSwords  L1     5.0  Lmax    46.0  Elo     81.2
orbit   paladinSwords  L1    86.5  Lmax  1242.0  Elo(vigil)   2630.6
  solo frost          L1     8.0  Lmax    24.4  Elo     42.3
zone    frost          L1    72.0  Lmax   895.2  Elo(blizzard)   3171.2
  solo lightning      L1     9.0  Lmax    22.8  Elo     50.0
strike  lightning      L1    36.0  Lmax   427.5  Elo(storm)   2527.5
  solo hammer         L1    12.1  Lmax    93.6  Elo    168.0
thrown  hammer         L1    48.4  Lmax   556.8  Elo(forgeFury)   2352.0
  solo wisps          L1    10.4  Lmax    81.0  Elo    144.0
homing  wisps          L1    20.8  Lmax   328.5  Elo(soulProcession)    720.0
  solo bells          L1     4.2  Lmax    32.0  Elo     69.8
orbit   bells          L1   147.7  Lmax  1384.0  Elo(funeralToll)   3944.3
```

## Etapa 5 · conteúdo novo (2026-11-08)

- D-04: comportamentos novos. A Aranha Tumular anda em zigue-zague, o Espectro atravessa a multidão e às vezes
  some (inofensivo e intocável por 1,2 s), o Encapuzado e o Rato Gigante (novo, na Cripta a partir dos 2:00)
  agacham e dão um bote em linha reta. Custo do passo: 0,47 ms com 700 inimigos desses (0,39 ms só esqueletos).
- D-05: armas compartilhadas novas nos dois `kind` que faltavam no grupo: Maça de Ferro (arc), com o Elo
  Quebra-Junta (+ Armadura), e Fogo (strike), com o Elo Espada de Fogo (+ Dano). O PICKS do sim é a parte das
  corridas que terminaram com a arma; o bot pega 4 das 8 compartilhadas, então a média esperada é perto de 50%.
  As novas ficam no nível das outras (nenhuma se destaca).
- D-06: heróis custam 800 (Lyra, Teo) e 1200 (Andilla). O bot com Aldo em Valmor compra o segundo herói depois de
  4 corridas (um jogador novo, que morre antes, leva umas 5 ou 6). `unlockAllHeroes` segue true até o fim dos testes.
- Zigue-zague da aranha suavizado (8 sementes em Valmor: 22/32 com ele, 23/32 sem). O contador de `uid` dos
  inimigos passou a ser por `World`: antes ele vazava de uma corrida para a outra e a mesma semente dava
  resultados diferentes.
- L-01 (medir num celular de verdade) fica com o Daniel: F4 no celular, ver se segura 60 FPS com 500 inimigos.

### Sim

```
SUMMARY  hero    stage     wins  avg time  avg lvl  reached10  elos/run  gold/min  fast dmg
         aldo    valmor    2/4       8:41     37.8          3       2.0      36.6       21%
         aldo    crypt     3/4       9:54     47.5          3       2.8      40.2        7%
         aldo    southRoad 2/4      10:00     47.5          4       2.3      48.4        4%
         lyra    valmor    3/4       8:56     42.0          3       2.0      37.2       22%
         lyra    crypt     3/4      10:00     47.8          4       2.0      42.7       12%
         lyra    southRoad 3/4       8:58     42.3          3       2.0      41.8       24%
         teo     valmor    2/4       8:29     33.3          2       1.0      31.7       12%
         teo     crypt     3/4      10:00     44.3          4       2.3      40.6       13%
         teo     southRoad 1/4       8:15     31.8          1       0.8      26.9       15%
         andilla valmor    4/4      10:00     47.3          4       3.0      60.0        0%
         andilla crypt     4/4      10:00     50.8          4       2.8      66.1       27%
         andilla southRoad 3/4       9:16     40.8          3       2.0      46.3       19%
PICKS    yahAura 44% · paladinSwords 35% · frost 48% · hammer 58% · wisps 44% · bells 60% · mace 50% · fire 50%
UNLOCK   second hero (800 gold) after 4 runs of Aldo in Valmor
```

### Lab

```
  solo blade          L1    11.5  Lmax    52.2  Elo     93.0
arc     blade          L1   115.0  Lmax  1983.6  Elo(fury)   5115.0
  solo elunLight      L1    14.4  Lmax   125.0  Elo    194.4
homing  elunLight      L1    14.4  Lmax   375.0  Elo(holyLight)    970.8
  solo yahAura        L1     7.8  Lmax    30.3  Elo     44.8
aura    yahAura        L1    62.4  Lmax   695.8  Elo(yahFlame)   2195.2
  solo daggers        L1    30.0  Lmax   121.8  Elo     27.0
thrown  daggers        L1    60.0  Lmax   487.2  Elo(fan)   1064.3
  solo paladinSwords  L1     5.0  Lmax    46.0  Elo     81.2
orbit   paladinSwords  L1    86.5  Lmax  1242.0  Elo(vigil)   2630.6
  solo frost          L1     8.0  Lmax    24.4  Elo     42.3
zone    frost          L1    72.0  Lmax   895.2  Elo(blizzard)   3171.2
  solo lightning      L1     9.0  Lmax    22.8  Elo     50.0
strike  lightning      L1    36.0  Lmax   427.5  Elo(storm)   2517.5
  solo hammer         L1    12.1  Lmax    93.6  Elo    168.0
thrown  hammer         L1    48.4  Lmax   556.8  Elo(forgeFury)   2352.0
  solo wisps          L1    10.4  Lmax    81.0  Elo    144.0
homing  wisps          L1    20.8  Lmax   328.5  Elo(soulProcession)    720.0
  solo bells          L1     4.2  Lmax    32.0  Elo     69.8
orbit   bells          L1   147.7  Lmax  1384.0  Elo(funeralToll)   3944.3
  solo mace           L1    12.0  Lmax    43.7  Elo     75.0
arc     mace           L1    72.0  Lmax  1136.2  Elo(jointBreaker)   3150.0
  solo fire           L1     7.0  Lmax    19.2  Elo     36.1
strike  fire           L1    49.0  Lmax   667.2  Elo(fireSword)   2114.7
```

## Revisão 2026-11-08 · R1, nova linha de base (2026-11-09, commit 0eb1666)

Linha de base da R2, com **12 sementes** (`SIM_SEEDS=12 npm run sim`, 144 corridas). As sementes mudaram de
desenrolar em relação às tabelas acima por dois motivos, sem mudança de dados: RT-01 (o número de dano não sorteia
mais com o `Rng` da partida, o desvio vem do `uid`) e RB-02/RB-03 (o fantasma esmaecido não come projéteis nem atrai
a mira, e fica sólido no Sopro de Geada). Compare a R2 com esta tabela, não com as anteriores.

Resumo: 109 de 144 vitórias (Aldo 18/36, Lyra 28/36, Teo 30/36, Andilla 33/36). Por fase: Valmor 31/48, Cripta
42/48, Estrada 36/48. 1º Elo em média aos 7:49 (116 corridas com Elo; 32 formam o primeiro antes das 7:00). Luta de
chefe com mediana de 67 s nas vitórias. Das 35 derrotas, 14 entre 6 e 8 min.

### Sim

```
SUMMARY  hero    stage     wins  avg time  avg lvl  reached10  elos/run  gold/min  fast dmg
         aldo    valmor    4/12      7:39     29.6          5       1.0      21.1       14%
         aldo    crypt     10/12     9:21     41.3         10       1.9      38.3       11%
         aldo    southRoad 4/12      8:31     36.1          7       1.1      27.9       11%
         lyra    valmor    8/12      8:48     39.0          8       1.5      38.0       23%
         lyra    crypt     10/12     9:24     44.3         10       1.9      42.1       26%
         lyra    southRoad 10/12     9:36     45.5         11       2.4      46.1       31%
         teo     valmor    9/12      9:13     41.1          9       1.6      32.3       14%
         teo     crypt     11/12    10:00     47.6         12       2.3      45.5       12%
         teo     southRoad 10/12     9:47     41.8         10       2.1      43.1       13%
         andilla valmor    10/12    10:00     47.8         12       2.2      58.5       44%
         andilla crypt     11/12    10:00     48.5         12       2.7      60.3       16%
         andilla southRoad 12/12    10:00     47.3         12       2.3      67.0       18%

PICKS    yahAura 52% · paladinSwords 49% · frost 47% · hammer 53% · wisps 51% · bells 41% · mace 49% · fire 51%
UNLOCK   second hero (800 gold) after 2 runs of Aldo in Valmor
```

### Lab

```
  solo blade          L1    11.5  Lmax    52.2  Elo     93.0
arc     blade          L1   115.0  Lmax  1983.6  Elo(fury)   5115.0
  solo elunLight      L1    14.4  Lmax   125.0  Elo    194.4
homing  elunLight      L1    14.4  Lmax   375.0  Elo(holyLight)    970.8
  solo yahAura        L1     7.8  Lmax    30.3  Elo     44.8
aura    yahAura        L1    62.4  Lmax   695.8  Elo(yahFlame)   2195.2
  solo daggers        L1    30.0  Lmax   121.8  Elo     27.0
thrown  daggers        L1    60.0  Lmax   487.2  Elo(fan)   1064.3
  solo paladinSwords  L1     5.0  Lmax    46.0  Elo     81.2
orbit   paladinSwords  L1    86.5  Lmax  1242.0  Elo(vigil)   2630.6
  solo frost          L1     8.0  Lmax    24.4  Elo     42.3
zone    frost          L1    67.2  Lmax   914.8  Elo(blizzard)   3314.7
  solo lightning      L1     9.0  Lmax    22.8  Elo     50.0
strike  lightning      L1    36.0  Lmax   423.7  Elo(storm)   2512.5
  solo hammer         L1    12.1  Lmax    93.6  Elo    168.0
thrown  hammer         L1    48.4  Lmax   556.8  Elo(forgeFury)   2352.0
  solo wisps          L1    10.4  Lmax    81.0  Elo    144.0
homing  wisps          L1    20.8  Lmax   328.5  Elo(soulProcession)    720.0
  solo bells          L1     4.2  Lmax    32.0  Elo     69.8
orbit   bells          L1   147.7  Lmax  1384.0  Elo(funeralToll)   3944.3
  solo mace           L1    12.0  Lmax    43.7  Elo     75.0
arc     mace           L1    72.0  Lmax  1136.2  Elo(jointBreaker)   3150.0
  solo fire           L1     7.0  Lmax    19.2  Elo     36.1
strike  fire           L1    49.0  Lmax   670.4  Elo(fireSword)   2124.2
```

## Revisão 2026-11-08 · R2, balanceamento (2026-11-09, commit d967f5f)

Sim com **12 sementes** (`SIM_SEEDS=12 npm run sim`, 144 corridas) depois de cada lote; compare com a seção "R1"
acima. Itens: RE-01, RE-02, RE-05 (lote 1) · RE-03, RE-04, RE-07 (lote 2) · E-08, RE-06 (lote 3) · E-09 (lote 4) ·
RE-08 e ajuste final (curva +5% de 5:00 em diante, Cripta com mais vida, Aldo com +30 de vida e armadura 2, Lobo
Velho 10500, armas que miram vão no chefe). Detalhes e números de cada item no backlog. 1º Elo, mediana do chefe,
tempo esgotado e mortes por faixa saem das linhas por corrida do sim.

### Antes e depois

| Herói / fase                        |          R1 |      lote 1 |      lote 2 |      lote 3 |      lote 4 |       **final** |
| ----------------------------------- | ----------: | ----------: | ----------: | ----------: | ----------: | --------------: |
| Aldo · Valmor                       |           4 |          10 |           8 |           6 |           6 |           **8** |
| Aldo · Cripta                       |          10 |           8 |          11 |           9 |           8 |           **6** |
| Aldo · Estrada                      |           4 |           6 |           8 |           6 |           8 |           **8** |
| Lyra · Valmor                       |           8 |           8 |           7 |           8 |          10 |          **10** |
| Lyra · Cripta                       |          10 |           7 |           9 |          11 |          11 |           **8** |
| Lyra · Estrada                      |          10 |           9 |          10 |          10 |          12 |          **12** |
| Teo · Valmor                        |           9 |           8 |           9 |          10 |          10 |           **9** |
| Teo · Cripta                        |          11 |          11 |          12 |          11 |          11 |           **9** |
| Teo · Estrada                       |          10 |          11 |          11 |           8 |          11 |          **10** |
| Andilla · Valmor                    |          10 |          12 |          11 |          11 |          11 |          **11** |
| Andilla · Cripta                    |          11 |          11 |          12 |          11 |          12 |          **11** |
| Andilla · Estrada                   |          12 |          11 |          12 |          11 |          12 |          **10** |
| **Total** (de 144)                  |         109 |         112 |         120 |         112 |         122 |         **112** |
| Aldo / Lyra / Teo / Andilla (de 36) | 18/28/30/33 | 24/24/30/34 | 27/26/32/35 | 21/29/29/33 | 22/33/32/35 | **22/30/28/32** |
| Valmor / Cripta / Estrada (de 48)   |    31/42/36 |    38/37/37 |    35/44/41 |    35/42/35 |    37/42/43 |    **38/34/40** |
| 1º Elo médio (antes das 7:00)       |   7:48 (32) |   8:01 (25) |   8:08 (24) |   8:01 (37) |   7:41 (44) |   **8:09 (35)** |
| Mediana da luta de chefe (vitórias) |        67 s |        64 s |        64 s |        56 s |        57 s |        **50 s** |
| Tempo esgotado na Estrada (Lyra)    |       1 (1) |       3 (1) |       2 (1) |       1 (0) |       1 (0) |       **2 (0)** |
| Mortes entre 6 e 8 min              |          14 |          12 |           9 |           8 |          11 |          **12** |

Confirmação com **48 sementes** (576 corridas) do estado final: 459/576; Aldo 95/144 (66%), Lyra 113 (78%), Teo 118
(82%), Andilla 133 (92%); Valmor 152, Cripta 152, Estrada 155 de 192; Aldo em Valmor 30/48; 1º Elo 7:52; chefe 51 s;
tempo esgotado na Estrada 9 em 192 (2,3 por 12); mortes entre 6 e 8 min 41 (10,3 por 144).

### Meta da R2

- Todo herói entre 55% e 85%: **Aldo 61%, Lyra 83%, Teo 78% sim; Andilla 89% não** (92% com 48 sementes). RE-08
  aplicado e medido; nerfs maiores testados não mexem nela (as derrotas dela são tempo esgotado no chefe) e tirariam a
  força do começo pedida no E-03.
- Aldo em Valmor pelo menos 7 de 12: **sim, 8** (30/48 com 48 sementes).
- Valmor ≥ Cripta ≥ Estrada com folga de 3: **sim com 48 sementes** (152 / 152 / 155); nas 12 sementes oficiais
  38 / 34 / 40 (a Estrada passa a Cripta por 6, ruído dessas sementes).
- 1º Elo em média antes das 7:00: **não** (8:09; 7:52 com 48). A receita fica pronta em média aos 6:50 porque o robô
  sobe as quatro armas por igual; ver E-08.
- Luta de chefe com mediana de 45 a 90 s: **sim, 50 s**. No máximo 3 tempos esgotados na Estrada: **sim, 2**.

### Sim

```
SUMMARY  hero    stage     wins  avg time  avg lvl  reached10  elos/run  gold/min  fast dmg
         aldo    valmor    8/12      8:55     39.1          8       1.4      32.0        9%
         aldo    crypt     6/12      9:26     37.2          8       1.2      27.7        8%
         aldo    southRoad 8/12      9:24     44.3         10       1.9      37.9       11%
         lyra    valmor    10/12     9:35     45.8         10       2.2      40.6       29%
         lyra    crypt     8/12      9:10     39.5          8       1.6      40.1       27%
         lyra    southRoad 12/12    10:00     48.8         12       2.3      49.5       27%
         teo     valmor    9/12      9:11     41.4          9       1.4      37.4       13%
         teo     crypt     9/12      9:41     41.8          9       1.5      35.1       16%
         teo     southRoad 10/12     9:36     44.5         10       1.9      40.7       19%
         andilla valmor    11/12     9:48     46.5         11       2.3      59.6       16%
         andilla crypt     11/12    10:00     46.3         12       2.2      58.8        9%
         andilla southRoad 10/12    10:00     48.2         12       2.2      62.0        9%

PICKS    yahAura 56% · paladinSwords 55% · frost 47% · hammer 51% · wisps 50% · bells 46% · mace 52% · fire 51%
REAL DPS blade:max 63 · elunLight:max 121 · yahAura:max 12 · daggers:max 109 · paladinSwords:max 41 · frost:max 108 · lightning:max 87 · hammer:max 90 · wisps:max 117 · bells:max 69 · mace:max 27 · fire:max 103 · fury 79 · holyLight 202 · yahFlame 41 · fan 173 · vigil 51 · blizzard 181 · storm 121 · jointBreaker 55 · fireSword 155 · forgeFury 153 · soulProcession 229 · funeralToll 90
UNLOCK   second hero (800 gold) after 2 runs of Aldo in Valmor
```

### Lab

```
  solo blade          L1    11.5  Lmax    52.2  Elo     93.0
arc     blade          L1   138.0  Lmax  2349.0  Elo(fury)   7254.0
  solo elunLight      L1    14.4  Lmax   125.0  Elo    194.4
homing  elunLight      L1    14.4  Lmax   375.0  Elo(holyLight)    970.8
  solo yahAura        L1     7.8  Lmax    30.3  Elo     44.8
aura    yahAura        L1    62.4  Lmax   695.8  Elo(yahFlame)   3046.4
  solo daggers        L1    27.6  Lmax   121.8  Elo    162.0
thrown  daggers        L1    55.2  Lmax   487.2  Elo(fan)   1068.0
  solo paladinSwords  L1     5.0  Lmax    46.0  Elo     81.2
orbit   paladinSwords  L1    86.5  Lmax  1242.0  Elo(vigil)   2630.6
  solo frost          L1     8.0  Lmax    24.4  Elo     42.3
zone    frost          L1    67.2  Lmax   914.8  Elo(blizzard)   3314.7
  solo lightning      L1     9.0  Lmax    22.8  Elo     50.0
strike  lightning      L1    36.0  Lmax   423.7  Elo(storm)   2512.5
  solo hammer         L1    12.1  Lmax    93.6  Elo    168.0
thrown  hammer         L1    48.4  Lmax   556.8  Elo(forgeFury)   2352.0
  solo wisps          L1    10.4  Lmax    81.0  Elo    144.0
homing  wisps          L1    20.8  Lmax   328.5  Elo(soulProcession)    720.0
  solo bells          L1     4.2  Lmax    32.0  Elo     69.8
orbit   bells          L1   147.7  Lmax  1384.0  Elo(funeralToll)   3944.3
  solo mace           L1    12.0  Lmax    43.7  Elo     75.0
arc     mace           L1   120.0  Lmax  1485.8  Elo(jointBreaker)   4650.0
  solo fire           L1     7.0  Lmax    22.8  Elo     36.1
strike  fire           L1    49.0  Lmax   796.1  Elo(fireSword)   2124.2
```

## CC-04 · calibração das conquistas (2026-11-09)

`SIM_SEEDS=12 npm run sim` (144 partidas) e o mesmo com `SIM_SHOP=full` (veterano: Loja inteira). O sim agora
imprime `dmg` (dano total das armas) e `hit` (maior golpe de arma) por partida e uma linha `ACHIEVE` com as medianas
entre as vitórias. Alvo do `conquistas.md`: cerca de metade das vitórias do veterano consegue.

```
ACHIEVE  wins 112/144 · run damage median 254049 · best hit median 70 · boss time median 49s
ACHIEVE  veteran wins 135/144 · run damage median 256102 · best hit median 88 · boss time median 34s
```

| Conquista   | Proposta | Sim (vitórias que conseguem) | Veterano | Decisão                                  |
| ----------- | -------- | ---------------------------- | -------- | ---------------------------------------- |
| `damageRun` | 200.000  | 98%                          | 100%     | **260.000**: 32% no sim, 43% no veterano |
| `hit120`    | 120      | 0%                           | 19%      | **100**: 10% no sim, 39% no veterano     |
| `bossFast`  | 40 s     | 34%                          | 56%      | **40 s** mantido                         |

Notas: o dano por partida se concentra entre 250 e 256 mil (o que uma vitória mata), então qualquer limite nessa
faixa é sensível; 260 mil pede uma partida acima da média. Golpe de 90 daria 44% no veterano, mas ficaria colado
no "Golpe Forte" (80); 100 mantém os dois degraus distintos. O id `hit120` ficou (o save guarda ids).

## Rodada UI e features · Etapas 1–3 (2026-11-09)

`SIM_SEEDS=12 npm run sim` (144 partidas). **Métrica nova:** o sim agora mede o DPS real **só enquanto a arma está
naquele nível** (`levelDps`, mínimo 30 s no nível) e compara cada Elo com a própria arma base no nível 7 na mesma
partida (linha `ELO X`). A métrica antiga (dano total ÷ tempo desde que pegou a arma) diluía o nível 7 com os níveis
baixos, e o Elo herdava o histórico da base; os números antigos ficam abaixo como "métrica antiga".

### Etapa 1: Maça de Ferro e Quebra-Junta

Mudanças: golpe em arco com `aim: 'nearest'` (espera alguém ao alcance), onda de choque na ponta do alcance (`shock`
0,5 do dano, raio 40→46; quem a pancada já atingiu não toma a onda), `combo: 0.2` (no nível 3 o segundo golpe é uma
segunda pancada na mesma direção), empurrão 230→120, alcance 88→105 (125 no nível 7), dano 16/21/27/35/46 →
21/28/36/47/72 (nível 7 com recarga 1,0). Quebra-Junta: 150 de dano, 2 pancadas, alcance 160, arco 3,4, onda 0,6 / 72.

| Métrica antiga (dano ÷ tempo com a arma) | Antes | Depois |
| ---------------------------------------- | ----- | ------ |
| Maça nível 7                             | 30    | **95** |
| Quebra-Junta                             | 59    | 182    |
| Martelo nível 7 (referência)             | 94    | 96     |

| Métrica nova (só no nível)           | Depois    |
| ------------------------------------ | --------- |
| Maça nível 7                         | 205       |
| Martelo nível 7 / Geada nível 7      | 204 / 171 |
| Quebra-Junta ÷ Maça na mesma partida | 3,1×      |

Lab (solo, alvo sempre ao alcance): Maça Lmax 43,7 → 144; Quebra-Junta 75 → 400.

### Etapa 2: força dos Elos (meta ≥ 2,5× a base no nível 7)

| Elo            | Antes (`ELO X`) | Depois | Mudança principal                          |
| -------------- | --------------- | ------ | ------------------------------------------ |
| Fúria          | 1,6×            | 4,3×   | dano 60→110, recarga 0,65→0,5, alcance 165 |
| Luz Sagrada    | 2,1×            | 2,6×   | dano 24→36, 6→8 luzes, recarga 0,65        |
| Chama de Yah   | 3,7×            | 4,4×   | sem mudança                                |
| Leque de Facas | 1,5×            | 2,5×   | dano 15→36, 12 facas, atravessa 5          |
| Vigília        | 2,5×            | 6,1×   | dano 28→40                                 |
| Nevasca        | 1,3×            | 3,2×   | dano 9→20, 5 manchas, raio 85, recarga 1,4 |
| Tempestade     | 2,0×            | 2,9×   | dano 50→75, 8 raios, recarga 0,8           |
| Quebra-Junta   | 3,2×            | 3,1×   | Etapa 1                                    |
| Espada de Fogo | 1,6×            | 3,0×   | dano 38→80, 7 espadas, raio 70             |
| Fúria da Forja | 1,7×            | 2,4×   | dano 70→115, 4 martelos, recarga 1,0       |
| Procissão      | 2,1×            | 2,8×   | dano 18→28, 9 luzes, recarga 0,9           |
| Dobre Fúnebre  | 1,8×            | 2,5×   | dano 45→70, 6 sinos, recarga 0,5           |

(O "Depois" é a rodada anterior ao último ajuste fino de Leque, Forja e Dobre, que subiu os três mais um pouco.)

Vitórias: 112/144 → 122/144. Aldo 27→29/36, Lyra 27→31, Teo 25→29, Andilla 33→33. O chefe morre mais rápido
(mediana 49 s → 31 s), então `bossFast` (40 s) e `hit120` (100) ficaram mais fáceis: 70% e 59% das vitórias.

### Etapa 3: pool de cartas

O sim registra o nível em que o pool (armas + passivas) fica com menos de 3 cartas: só 1 em 144 partidas de 10
minutos chega lá, no nível 58. O problema aparece em partidas longas e na Noite Sem Fim; agora as cartas de
recompensa (Bolsa de Ouro, Banquete, Bênção de Yah) completam a escolha.

### Fechamento da rodada (2026-11-09, `SIM_SEEDS=12`)

```
ELO X    fury 4.2x · holyLight 2.6x · yahFlame 5.8x · fan 2.6x · vigil 5.8x · blizzard 2.8x · storm 2.8x · jointBreaker 3.1x · fireSword 3.2x · forgeFury 2.7x · soulProcession 2.7x · funeralToll 3.0x
POOL     ran short of 3 cards in 1/144 runs, at level 58.0 on average
ACHIEVE  wins 126/144 · run damage median 251616 (>=260000: 32%) · best hit median 112 (>=100: 60%) · boss time median 28s (<=40s: 73%)
```

Vitórias por herói (36 partidas cada): Aldo 27→29, Lyra 27→32, Teo 25→29, Andilla 33→**36**. Maça nível 7: 206 de
DPS real no nível (Martelo 198, Geada 191); Quebra-Junta 528 (3,1× a Maça).

Noite Sem Fim (`SIM_VIGIL=1 SIM_SEEDS=4`, `config.vigil` HP +200%/min, dano de contato +150%/min): o bot aguenta
em média 11:30 de vigília e 68% das vitórias passam dos 5:00 (Até o Amanhecer). Curvas mais suaves testadas: +50%
de HP sem dano → 31 min (todas), +80%/+40% → 24 min, +150%/+100% → 15:40.

---

# Rodada de balanceamento e identidade (2026-11-09)

Metas por fase × perfil de loja (bot, 8 sementes por herói): ver `CLAUDE.md`. Perfis: `none` (nenhuma compra),
`half` (cada item da loja na metade dos níveis, arredondado para baixo), `full` (tudo comprado). `SIM_SHOP=all
npm run sim` roda os três (288 partidas, ~2 min). "death (median)" é a mediana do minuto em que o herói caiu nas
derrotas; 15 min = o chefe não caiu até o limite do sim.

## Etapa 0 · linha de base (antes de tudo)

### Vitórias por fase e perfil de loja

```
TARGETS  stage     shop  wins        death(median)  gold/run  heroes (win % vs stage)
         valmor    none  29/32 91%         7.1 min       516  aldo 75% · lyra 100% · teo 88% · andilla 100%
         valmor    half  31/32 97%        15.0 min       699  aldo 88% · lyra 100% · teo 100% · andilla 100%
         valmor    full  28/32 88%        12.7 min       879  aldo 75% · lyra 88% · teo 100% · andilla 88%
         crypt     none  23/32 72%         6.8 min       421  aldo 75% · lyra 63% · teo 50%! · andilla 100%!
         crypt     half  31/32 97%         9.3 min       684  aldo 100% · lyra 88% · teo 100% · andilla 100%
         crypt     full  31/32 97%        15.0 min       888  aldo 100% · lyra 100% · teo 88% · andilla 100%
         southRoad none  32/32 100%              -       535  aldo 100% · lyra 100% · teo 100% · andilla 100%
         southRoad half  31/32 97%        15.0 min       696  aldo 100% · lyra 100% · teo 100% · andilla 88%
         southRoad full  31/32 97%        15.0 min       892  aldo 100% · lyra 100% · teo 100% · andilla 88%

```

Total: 267/288. Sem loja: Valmor 91%, Cripta 72%, Estrada 100%. A Estrada do Sul, que devia ser a mais
difícil, é a mais fácil.

### DPS real nas partidas (nível máximo e Elos)

```
REAL DPS blade:max 121 (63) · elunLight:max 370 (63) · yahAura:max 22 (99) · daggers:max 230 (68) · paladinSwords:max 39 (108) · frost:max 156 (107) · lightning:max 167 (64) · hammer:max 134 (115) · wisps:max 274 (101) · bells:max 79 (110) · mace:max 133 (100) · fire:max 179 (101) · fury 364 (39) · holyLight 907 (50) · yahFlame 92 (67) · fan 661 (51) · vigil 91 (77) · blizzard 442 (64) · storm 453 (46) · jointBreaker 402 (36) · fireSword 438 (43) · forgeFury 387 (61) · soulProcession 706 (60) · funeralToll 207 (56)
ELO X    fury 3.9x · holyLight 2.5x · yahFlame 8.0x · fan 3.0x · vigil 4.7x · blizzard 3.2x · storm 2.7x · jointBreaker 3.4x · fireSword 2.7x · forgeFury 3.8x · soulProcession 2.7x · funeralToll 3.4x
```

### Lab por categoria (multidão a cada 64 px, nível máximo; % da melhor arma `aimed`)

```
cat    weapon          crowd L1   Lmax  solo Lmax   %best  band     | Elo            crowd  solo  %best  x base
aimed  mace                  55    576        144    100%  85-100%  | jointBreaker     5520   400   100%  9.6x
aimed  blade                 35    418         52     73%! 85-100%  | fury             4290   215    78%  10.3x
aimed  daggers               54    361        122     63%! 85-100%  | fan              2308   619    42%  6.4x
aimed  hammer                48    360         94     63%! 85-100%  | forgeFury        1840   460    33%  5.1x
area   paladinSwords         39    372         47     65%! 40-55%  | vigil             872   116    16%  2.3x
area   bells                 29    370         32     64%! 40-55%  | funeralToll      1596   133    29%  4.3x
area   frost                  8    346         24     60%! 40-55%  | blizzard         5026   120    91%  14.5x
area   yahAura                0    242         30     42%  40-55%  | yahFlame          896    45    16%  3.7x
auto   fire                   7    308         23     53%  50-65%  | fireSword        3256   100    59%  10.6x
auto   elunLight             14    275        125     48%! 50-65%  | holyLight        1537   446    28%  5.6x
auto   wisps                 20    207         81     36%! 50-65%  | soulProcession   1026   284    19%  5.0x
auto   lightning              9     91         23     16%! 50-65%  | storm            3499    94    63%  38.4x

```

## Etapa 1 · armas livres e faixas por categoria

Mudanças: fim das armas exclusivas (qualquer herói recebe qualquer arma e Elo); `category` em cada arma
(`aimed`/`auto`/`area`) e teste `tests/core/bands.test.ts` com as faixas do lab (multidão a 64 px com um leve
desalinhamento fixo, para o raio não pular de um anel da grade para o outro). Dano reescalado por arma até
cada uma ficar no meio da sua faixa: área caiu ~30%, Raio e Fogos-Fátuos subiram, e os Elos foram puxados para
perto de 2000 (aimed), 1160 (auto) e 960 (área) de DPS em multidão. Nevasca, Tempestade, Espada de Fogo e
Quebra-Junta perderam 60–80%.

### Lab depois

```
cat    weapon          crowd L1   Lmax  solo Lmax   %best  band     | Elo            crowd  solo  %best  x base
aimed  mace                  47    504        126    100%  85-100%  | jointBreaker     1860   153    88%  3.7x
aimed  daggers               86    474        191     94%  85-100%  | fan              1910   482    91%  4.0x
aimed  hammer                64    465        121     92%  85-100%  | forgeFury        1854   412    88%  4.0x
aimed  blade                 38    464         58     92%  85-100%  | fury             2106   117   100%  4.5x
area   bells                 17    246         17     49%  40-55%  | funeralToll       953    80    45%  3.9x
area   frost                  8    242         25     48%  40-55%  | blizzard          957    28    45%  3.9x
area   yahAura                0    242         30     48%  40-55%  | yahFlame          960    48    46%  4.0x
area   paladinSwords         26    241         31     48%  40-55%  | vigil             958   165    45%  4.0x
auto   fire                   8    295         26     58%  50-65%  | fireSword        1178    33    56%  4.0x
auto   lightning             25    294         63     58%  50-65%  | storm            1152    45    55%  3.9x
auto   elunLight             13    290        113     58%  50-65%  | holyLight        1166   397    55%  4.0x
auto   wisps                 23    289        122     57%  50-65%  | soulProcession   1175   365    56%  4.1x

```

### Vitórias por fase e perfil de loja (depois)

```
TARGETS  stage     shop  wins        death(median)  gold/run  heroes (win % vs stage)
         valmor    none  26/32 81%         9.8 min       549  aldo 63% · lyra 88% · teo 75% · andilla 100%
         valmor    half  29/32 91%        10.2 min       702  aldo 88% · lyra 88% · teo 100% · andilla 88%
         valmor    full  32/32 100%              -       887  aldo 100% · lyra 100% · teo 100% · andilla 100%
         crypt     none  27/32 84%         6.8 min       510  aldo 75% · lyra 88% · teo 75% · andilla 100%
         crypt     half  30/32 94%         8.7 min       675  aldo 100% · lyra 100% · teo 75% · andilla 100%
         crypt     full  32/32 100%              -       862  aldo 100% · lyra 100% · teo 100% · andilla 100%
         southRoad none  31/32 97%        15.0 min       558  aldo 88% · lyra 100% · teo 100% · andilla 100%
         southRoad half  32/32 100%              -       705  aldo 100% · lyra 100% · teo 100% · andilla 100%
         southRoad full  30/32 94%        15.0 min       896  aldo 100% · lyra 75% · teo 100% · andilla 100%

REAL DPS blade:max 85 (104) · elunLight:max 374 (134) · yahAura:max 15 (86) · daggers:max 279 (122) · paladinSwords:max 29 (89) · frost:max 146 (83) · lightning:max 250 (116) · hammer:max 148 (69) · wisps:max 346 (66) · bells:max 58 (77) · mace:max 103 (85) · fire:max 169 (68) · fury 136 (75) · holyLight 946 (74) · yahFlame 86 (51) · fan 608 (73) · vigil 108 (49) · blizzard 235 (38) · storm 369 (51) · jointBreaker 280 (27) · fireSword 383 (32) · forgeFury 500 (26) · soulProcession 723 (29) · funeralToll 179 (35)
ELO X    fury 2.3x · holyLight 2.8x · yahFlame 10.3x · fan 2.4x · vigil 5.8x · blizzard 1.5x · storm 1.5x · jointBreaker 3.4x · fireSword 2.0x · forgeFury 3.9x · soulProcession 2.4x · funeralToll 3.9x
```

Antes 267/288, depois 271/288: os Elos ficaram mais fracos, mas as armas automáticas cresceram. O DPS real das
partidas não acompanha o lab: as teleguiadas (Luz Sagrada 946, Procissão 723) passam longe das que dependem da
mira do bot (Lâmina 85, Fúria 136). A Etapa 6 calibra pelo DPS real; o lab segura a ordem entre categorias.

## Etapa 2 · armas iniciais temáticas

Mudanças: Lâmina com estocada a cada 3 golpes (1,6x de alcance, 2,2x de dano, arco estreito); Cajado de Lyra
(orbe para onde ela anda, explode no primeiro inimigo; Elo Estrela de Lyra com Sabedoria); Maça de Ferro do Teo
vira `slam` (fenda retangular à frente, tremor 0,8 s depois no ponto de impacto, atordoa 0,4 s, chefes 0,1 s);
Adagas para onde Andilla anda, sem atravessar, 20% de crítico 2x (Leque: 30% de crítico 3x); Raio e Luz de Elun
viram armas gerais. Código do arco com mira, combo e onda de choque removido (nenhuma arma usa mais).

### Lab depois

```
cat    weapon          crowd L1   Lmax  solo Lmax   %best  band     | Elo            crowd  solo  %best  x base
aimed  hammer                62    450        117    100%  85-100%  | forgeFury        1854   412    96%  4.1x
aimed  daggers               42    449        449    100%  85-100%  | fan              1875  1875    97%  4.2x
aimed  mace                  59    447        104     99%  85-100%  | jointBreaker     1853   266    96%  4.1x
aimed  staff                 37    443        221     98%  85-100%  | lyraStar         1853   296    96%  4.2x
aimed  blade                 43    439         80     98%  85-100%  | fury             1934   121   100%  4.4x
area   bells                 16    231         16     51%  40-55%  | funeralToll       953    80    49%  4.1x
area   frost                  8    231         24     51%  40-55%  | blizzard          957    28    49%  4.1x
area   paladinSwords         26    223         28     49%  40-55%  | vigil             958   165    50%  4.3x
area   yahAura                0    220         28     49%  40-55%  | yahFlame          960    48    50%  4.4x
auto   fire                   8    281         25     63%  50-65%  | fireSword        1178    33    61%  4.2x
auto   wisps                 23    278        117     62%  50-65%  | soulProcession   1175   365    61%  4.2x
auto   lightning             23    277         59     62%  50-65%  | storm            1152    45    60%  4.2x
auto   elunLight             13    274        106     61%  50-65%  | holyLight        1166   397    60%  4.3x

```

### Vitórias por fase e perfil de loja (depois)

```
TARGETS  stage     shop  wins        death(median)  gold/run  heroes (win % vs stage)
         valmor    none  25/32 78%        10.2 min       560  aldo 88% · lyra 38%! · teo 100%! · andilla 88%
         valmor    half  27/32 84%        10.2 min       692  aldo 100% · lyra 75% · teo 88% · andilla 75%
         valmor    full  32/32 100%              -       884  aldo 100% · lyra 100% · teo 100% · andilla 100%
         crypt     none  23/32 72%         3.5 min       445  aldo 75% · lyra 75% · teo 100%! · andilla 38%!
         crypt     half  32/32 100%              -       697  aldo 100% · lyra 100% · teo 100% · andilla 100%
         crypt     full  30/32 94%        12.6 min       879  aldo 100% · lyra 75% · teo 100% · andilla 100%
         southRoad none  24/32 75%        10.2 min       532  aldo 88% · lyra 50%! · teo 100%! · andilla 63%
         southRoad half  31/32 97%        10.2 min       702  aldo 100% · lyra 88% · teo 100% · andilla 100%
         southRoad full  32/32 100%              -       866  aldo 100% · lyra 100% · teo 100% · andilla 100%

REAL DPS blade:max 112 (123) · elunLight:max 351 (69) · yahAura:max 17 (78) · daggers:max 280 (105) · staff:max 256 (135) · paladinSwords:max 25 (71) · frost:max 181 (70) · lightning:max 265 (74) · hammer:max 148 (80) · wisps:max 356 (74) · bells:max 52 (83) · mace:max 85 (126) · fire:max 193 (75) · fury 169 (83) · holyLight 954 (49) · yahFlame 118 (48) · fan 789 (66) · vigil 109 (33) · blizzard 282 (37) · storm 352 (43) · jointBreaker 253 (46) · fireSword 359 (21) · forgeFury 487 (34) · soulProcession 877 (34) · funeralToll 201 (25) · lyraStar 518 (51)
ELO X    fury 1.6x · holyLight 3.1x · yahFlame 8.7x · fan 3.2x · vigil 4.7x · blizzard 1.7x · storm 1.4x · jointBreaker 2.9x · fireSword 1.9x · forgeFury 3.9x · soulProcession 2.7x · funeralToll 3.4x · lyraStar 3.1x
```

259/288 (antes 271). Teo com a Maça vence tudo sem loja (100%); Lyra cai a 38–50% sem loja, quase sempre por
não derrubar o chefe até o limite (chega aos 10 min em 8 de 8). Andilla na Cripta sem loja 3/8: as facas param
no primeiro inimigo. A Etapa 6 equilibra os heróis.

## Etapa 3 · ajustes de armas

Mudanças: Martelo do Gaspar desenhado a 1,2x e com raio 9 (11 no máximo), dano reajustado à faixa; Sinos viram
**Escudos de Valmor** (órbita 80, raio 11, empurrão 150) e o Elo vira **Muralha de Valmor**; saves antigos levam
`bells`/`funeralToll` para os ids novos. Pular dá +15 de ouro (`config.skipGold`), mostrado no botão.

### Lab depois

```
cat    weapon          crowd L1   Lmax  solo Lmax   %best  band     | Elo            crowd  solo  %best  x base
aimed  daggers               42    449        449    100%  85-100%  | fan              1875  1875   100%  4.2x
aimed  mace                  59    447        104    100%  85-100%  | jointBreaker     1853   266    99%  4.1x
aimed  staff                 37    443        221     99%  85-100%  | lyraStar         1853   296    99%  4.2x
aimed  blade                 43    439         80     98%  85-100%  | fury             1872   117   100%  4.3x
aimed  hammer                81    438        154     98%  85-100%  | forgeFury        1854   412    99%  4.2x
area   frost                  8    231         24     51%  40-55%  | blizzard          957    28    51%  4.1x
area   shields               27    230         29     51%  40-55%  | valmorWall        963   198    51%  4.2x
area   paladinSwords         26    223         28     50%  40-55%  | vigil             958   165    51%  4.3x
area   yahAura                0    220         28     49%  40-55%  | yahFlame          960    48    51%  4.4x
auto   fire                   8    281         25     63%  50-65%  | fireSword        1178    33    63%  4.2x
auto   wisps                 23    278        117     62%  50-65%  | soulProcession   1175   365    63%  4.2x
auto   lightning             23    277         59     62%  50-65%  | storm            1152    45    61%  4.2x
auto   elunLight             13    274        106     61%  50-65%  | holyLight        1166   397    62%  4.3x

```

### Vitórias por fase e perfil de loja (depois)

```
TARGETS  stage     shop  wins        death(median)  gold/run  heroes (win % vs stage)
         valmor    none  22/32 69%        10.2 min       569  aldo 50% · lyra 63% · teo 88% · andilla 75%
         valmor    half  27/32 84%        10.2 min       693  aldo 100% · lyra 63%! · teo 88% · andilla 88%
         valmor    full  32/32 100%              -       906  aldo 100% · lyra 100% · teo 100% · andilla 100%
         crypt     none  25/32 78%         3.5 min       465  aldo 100%! · lyra 63% · teo 100%! · andilla 50%!
         crypt     half  30/32 94%        10.2 min       695  aldo 100% · lyra 75% · teo 100% · andilla 100%
         crypt     full  31/32 97%        10.2 min       873  aldo 100% · lyra 100% · teo 88% · andilla 100%
         southRoad none  25/32 78%         5.2 min       488  aldo 88% · lyra 75% · teo 88% · andilla 63%
         southRoad half  31/32 97%        10.3 min       692  aldo 100% · lyra 100% · teo 100% · andilla 88%
         southRoad full  32/32 100%              -       876  aldo 100% · lyra 100% · teo 100% · andilla 100%

REAL DPS blade:max 113 (114) · elunLight:max 336 (63) · yahAura:max 24 (81) · daggers:max 292 (104) · staff:max 238 (122) · paladinSwords:max 24 (71) · frost:max 189 (77) · lightning:max 292 (76) · hammer:max 183 (77) · wisps:max 368 (84) · shields:max 33 (75) · mace:max 96 (121) · fire:max 183 (69) · fury 166 (73) · holyLight 990 (43) · yahFlame 119 (54) · fan 726 (65) · vigil 120 (29) · blizzard 287 (37) · storm 406 (38) · jointBreaker 265 (49) · fireSword 366 (15) · forgeFury 502 (43) · soulProcession 880 (35) · valmorWall 114 (33) · lyraStar 495 (53)
ELO X    fury 1.5x · holyLight 3.0x · yahFlame 10.0x · fan 3.1x · vigil 6.6x · blizzard 1.7x · storm 1.5x · jointBreaker 3.0x · fireSword 1.8x · forgeFury 4.1x · soulProcession 2.6x · valmorWall 4.7x · lyraStar 2.9x
```

266/288 (antes 259): pouca mudança, como esperado. A dificuldade de verdade vem das Etapas 4 e 6.

## Etapa 4 · fases com identidade

Mudanças: Cripta com obstáculos por semente (lápides, colunas, ossos; célula 170, 40%, nada a 260 px do início) que
barram herói e inimigos, mas não os tiros; Estrada do Sul vira um corredor de 520 px entre florestas, com inimigos
vindo das duas pontas e 20% saindo da mata pelos lados. Multiplicadores por fase (`StageDef.mult`: vida, dano,
velocidade, densidade, ouro): Valmor 1; Cripta 1,6 / 1,4 / 1,05 / 1,15 / 1,5; Estrada 2,3 / 1,8 / 1,1 / 1,25 / 2. A
vigília herda os multiplicadores. Lab sem mudança (as armas não mudaram).

### Vitórias por fase e perfil de loja (depois)

```
TARGETS  stage     shop  wins        death(median)  gold/run  heroes (win % vs stage)
         valmor    none  24/32 75%        10.2 min       565  aldo 88% · lyra 75% · teo 75% · andilla 63%
         valmor    half  27/32 84%        10.3 min       704  aldo 75% · lyra 75% · teo 88% · andilla 100%
         valmor    full  32/32 100%              -       883  aldo 100% · lyra 100% · teo 100% · andilla 100%
         crypt     none  4/32 13%          3.6 min       269  aldo 0% · lyra 25% · teo 25% · andilla 0%
         crypt     half  18/32 56%         5.0 min       787  aldo 38% · lyra 50% · teo 75% · andilla 63%
         crypt     full  28/32 88%        10.2 min      1415  aldo 100% · lyra 88% · teo 75% · andilla 88%
         southRoad none  0/32 0%           1.7 min        95  aldo 0% · lyra 0% · teo 0% · andilla 0%
         southRoad half  2/32 6%           2.6 min       285  aldo 0% · lyra 0% · teo 13% · andilla 13%
         southRoad full  22/32 69%        10.1 min      1850  aldo 63% · lyra 50% · teo 75% · andilla 88%


REAL DPS blade:max 127 (72) · elunLight:max 446 (65) · yahAura:max 25 (59) · daggers:max 399 (96) · staff:max 413 (76) · paladinSwords:max 30 (49) · frost:max 306 (65) · lightning:max 482 (59) · hammer:max 260 (58) · wisps:max 438 (56) · shields:max 43 (69) · mace:max 117 (84) · fire:max 300 (52) · fury 208 (54) · holyLight 1516 (40) · yahFlame 167 (33) · fan 1117 (60) · vigil 184 (25) · blizzard 643 (30) · storm 660 (35) · jointBreaker 349 (31) · fireSword 671 (19) · forgeFury 704 (24) · soulProcession 1000 (29) · valmorWall 204 (21) · lyraStar 628 (22)
ELO X    fury 1.5x · holyLight 3.2x · yahFlame 7.8x · fan 2.8x · vigil 8.2x · blizzard 1.6x · storm 1.6x · jointBreaker 3.3x · fireSword 1.8x · forgeFury 3.0x · soulProcession 2.8x · valmorWall 4.5x · lyraStar 1.9x
```

157/288 (antes 266). A curva por fase já aparece: Cripta sem loja 13% (morte em 3,6 min) e Estrada sem loja 0% (1,7
min), enquanto Valmor quase não muda. Valmor sem loja segue alto (75%, alvo 0–15%) e a Estrada com loja inteira
fica perto do alvo (69%, alvo 35–55%). Isso fica para a Etapa 6.

## Etapa 5 · Loja que decide a vitória

Mudanças: tetos novos (Pedra de Amolar e Sopa Quente 10 níveis; Gibão, Treino com Gaspar e Cabo Longo 5; Erva de
Cura 5 níveis de +0,2; Segunda Bainha 2 níveis), item **Segunda Chance** (2000 ouro: levanta uma vez por partida com
metade da vida e 2 s intocável), preços de base reduzidos para a Loja inteira custar 40.300 de ouro. Gaspar ganha
retrato e bigorna no cabeçalho e a fala na primeira visita (`settings.gasparMet`). O perfil `half` da sim compra
metade dos níveis (Segunda Chance fica de fora, 1 nível); `full` compra tudo.

### Vitórias por fase e perfil de loja (depois)

```
TARGETS  stage     shop  wins        death(median)  gold/run  heroes (win % vs stage)
         valmor    none  24/32 75%        10.2 min       565  aldo 88% · lyra 75% · teo 75% · andilla 63%
         valmor    half  32/32 100%              -       716  aldo 100% · lyra 100% · teo 100% · andilla 100%
         valmor    full  31/32 97%        15.0 min       884  aldo 100% · lyra 100% · teo 88% · andilla 100%
         crypt     none  4/32 13%          3.6 min       269  aldo 0% · lyra 25% · teo 25% · andilla 0%
         crypt     half  28/32 88%        10.3 min      1080  aldo 88% · lyra 88% · teo 88% · andilla 88%
         crypt     full  31/32 97%        15.0 min      1381  aldo 100% · lyra 100% · teo 88% · andilla 100%
         southRoad none  0/32 0%           1.7 min        95  aldo 0% · lyra 0% · teo 0% · andilla 0%
         southRoad half  14/32 44%         8.6 min      1214  aldo 38% · lyra 38% · teo 50% · andilla 50%
         southRoad full  32/32 100%              -      1981  aldo 100% · lyra 100% · teo 100% · andilla 100%


REAL DPS blade:max 128 (98) · elunLight:max 547 (79) · yahAura:max 25 (78) · daggers:max 428 (104) · staff:max 441 (102) · paladinSwords:max 44 (70) · frost:max 311 (67) · lightning:max 546 (62) · hammer:max 235 (75) · wisps:max 583 (75) · shields:max 32 (76) · mace:max 110 (96) · fire:max 354 (70) · fury 188 (66) · holyLight 1748 (43) · yahFlame 151 (48) · fan 1158 (67) · vigil 178 (39) · blizzard 524 (39) · storm 799 (35) · jointBreaker 357 (33) · fireSword 740 (21) · forgeFury 723 (25) · soulProcession 1300 (32) · valmorWall 179 (22) · lyraStar 760 (35)
ELO X    fury 1.6x · holyLight 3.1x · yahFlame 9.2x · fan 2.9x · vigil 7.5x · blizzard 1.6x · storm 1.5x · jointBreaker 3.3x · fireSword 1.9x · forgeFury 4.3x · soulProcession 2.6x · valmorWall 5.1x · lyraStar 2.5x
LOJA     everything costs 40300 gold = 44 average runs (909 gold/run)
```

196/288 (antes 157). A Loja agora separa os perfis: a Estrada vai de 6% para 44% com meia loja e de 69% para 100% com a
loja inteira, e a Cripta com meia loja vai de 56% para 88%. Loja inteira = **44 partidas médias** (alvo 40–60); vai
subir quando a Etapa 6 apertar as fases (menos ouro por partida).

## Etapa 6 · calibração aos alvos

Mudanças:

- **Curva de ondas** (`data/waves.ts`, comum às três fases): vida dos inimigos bem mais alta a partir do minuto 2
  (x1,6 aos 2 min, x4,2 aos 5 min, x12 aos 9 min, antes x1,3 / x2,2 / x4,3) e uma coluna nova, `damage`, que
  multiplica o dano de contato de todos em campo (x1,2 aos 2 min, x2,1 aos 5 min, x4,8 aos 9 min e no chefe). A
  vigília cresce a partir dessa mesma onda (`seg.damage` x crescimento por minuto) e herda os multiplicadores.
- **Multiplicadores de fase:** Valmor 1 / 1,05 de dano; Cripta vida 1,6 para 1,15 e dano 1,4 para 1,65; Estrada
  dano 1,8 para 2,1 (velocidade, densidade e ouro como na Etapa 4).
- **Chefes:** Cavaleiro Negro 10.500 para 18.000 de vida, Sineiro 13.000 para 20.000, Lobo Velho 10.500 para 14.000.
- **Heróis:** Aldo +60 de vida e armadura 4 (era +30 e 2); Lyra área +5% (era +10%); Andilla velocidade +5 (era
  +10). A estocada da Lâmina vem a cada 2 golpes, mais estreita e mais forte (alvo único 92 para 147, multidão
  igual); a Fúria acompanha (66); adagas -4%.
- **Conquistas:** Na Junta 100 para 250, Forja Acesa 260 mil para 750 mil, dano total 1 para 5 milhões, chefe rápido
  40 s para 15 s (metade das vitórias do bot, como antes).

### Lab depois

```
cat    weapon          crowd L1   Lmax  solo Lmax   %best  band     | Elo            crowd  solo  %best  x base
aimed  blade                 48    501        147    100%  85-100%  | fury             2059   129   100%  4.1x
aimed  mace                  59    447        104     89%  85-100%  | jointBreaker     1853   266    90%  4.1x
aimed  staff                 37    443        221     88%  85-100%  | lyraStar         1853   296    90%  4.2x
aimed  hammer                81    438        154     87%  85-100%  | forgeFury        1854   412    90%  4.2x
aimed  daggers               40    435        435     87%  85-100%  | fan              1875  1875    91%  4.3x
area   frost                  8    231         24     46%  40-55%  | blizzard          957    28    46%  4.1x
area   shields               27    230         29     46%  40-55%  | valmorWall        963   198    47%  4.2x
area   paladinSwords         26    223         28     44%  40-55%  | vigil             958   165    47%  4.3x
area   yahAura                0    220         28     44%  40-55%  | yahFlame          960    48    47%  4.4x
auto   fire                   8    281         25     56%  50-65%  | fireSword        1178    33    57%  4.2x
auto   wisps                 23    278        117     55%  50-65%  | soulProcession   1175   365    57%  4.2x
auto   lightning             23    277         59     55%  50-65%  | storm            1152    45    56%  4.2x
auto   elunLight             13    274        106     55%  50-65%  | holyLight        1166   397    57%  4.3x

```

### Vitórias por fase e perfil de loja (depois, 16 sementes = 576 partidas)

```
TARGETS  stage     shop  wins        death(median)  gold/run  heroes (win % vs stage)
         valmor    none  4/64 6%           6.1 min       197  aldo 6% · lyra 13% · teo 6% · andilla 0%
         valmor    half  37/64 58%        10.1 min       747  aldo 69% · lyra 44% · teo 50% · andilla 69%
         valmor    full  63/64 98%        10.2 min      1011  aldo 100% · lyra 100% · teo 94% · andilla 100%
         crypt     none  0/64 0%           3.6 min       144  aldo 0% · lyra 0% · teo 0% · andilla 0%
         crypt     half  10/64 16%         6.8 min       695  aldo 6% · lyra 44%! · teo 13% · andilla 0%
         crypt     full  55/64 86%         8.2 min      1547  aldo 81% · lyra 88% · teo 94% · andilla 81%
         southRoad none  0/64 0%           1.7 min        55  aldo 0% · lyra 0% · teo 0% · andilla 0%
         southRoad half  1/64 2%           4.3 min       329  aldo 0% · lyra 0% · teo 0% · andilla 6%
         southRoad full  30/64 47%         8.6 min      1930  aldo 56% · lyra 50% · teo 44% · andilla 38%


REAL DPS blade:max 350 (140) · elunLight:max 783 (93) · yahAura:max 45 (81) · daggers:max 775 (149) · staff:max 1042 (157) · paladinSwords:max 63 (101) · frost:max 737 (101) · lightning:max 1260 (124) · hammer:max 579 (114) · wisps:max 1042 (103) · shields:max 94 (104) · mace:max 257 (138) · fire:max 728 (105) · fury 680 (112) · holyLight 3219 (60) · yahFlame 382 (49) · fan 2634 (91) · vigil 523 (52) · blizzard 1495 (53) · storm 1733 (60) · jointBreaker 896 (45) · fireSword 1788 (21) · forgeFury 1836 (37) · soulProcession 3137 (42) · valmorWall 602 (25) · lyraStar 1978 (36)
ELO X    fury 2.3x · holyLight 4.6x · yahFlame 12.6x · fan 3.4x · vigil 10.4x · blizzard 2.1x · storm 1.5x · jointBreaker 3.9x · fireSword 2.9x · forgeFury 3.9x · soulProcession 3.5x · valmorWall 8.8x · lyraStar 2.7x
ACHIEVE  veteran wins 200/576 · run damage median 753849 (>=750000: 51%) · best hit median 258 (>=200: 80%) · boss time median 15s (<=15s: 52%)
LOJA     everything costs 40300 gold = 54 average runs (739 gold/run)
VIGIL    36 victories went on: average 243 s of vigil, 9 reached 5:00 (Até o Amanhecer)
```

Todos os alvos de fase batem (a Cripta com loja inteira está no limite, 86% para 70–85%). O espalhamento entre heróis
ficou dentro de 20 pontos em todas as células menos uma: Lyra na Cripta com meia loja (44% contra 16%). Essa célula
oscilou de 13% a 44% entre rodadas com mudanças pequenas; com 16 partidas por herói o ruído é de ±12 pontos, então
vale olhar de novo com mais sementes ou em jogo. ELO X abaixo de 2,5x em Nevasca (2,1x) e Tempestade (1,5x), e a
Fúria em 2,3x: as bases ficaram fortes no jogo real com a curva nova.

## Antes e depois da rodada

### Vitórias do bot por fase x perfil de loja

| Fase    | Loja    | Antes (Etapa 0) | Depois (Etapa 6)       | Alvo                     |
| ------- | ------- | --------------- | ---------------------- | ------------------------ |
| Valmor  | nenhuma | 91%             | 6% (morte aos 6,1 min) | 0–15%, morte 6–8 min     |
| Valmor  | metade  | 97%             | 58%                    | 40–60%                   |
| Valmor  | inteira | 88%             | 98%                    | 85%+                     |
| Cripta  | nenhuma | 72%             | 0% (morte aos 3,6 min) | 0%, morte antes de 6 min |
| Cripta  | metade  | 97%             | 16%                    | 15–35%                   |
| Cripta  | inteira | 97%             | 86%                    | 70–85%                   |
| Estrada | nenhuma | 100%            | 0% (morte aos 1,7 min) | 0%, morte antes de 5 min |
| Estrada | metade  | 97%             | 2%                     | 0–10%                    |
| Estrada | inteira | 97%             | 47%                    | 35–55%                   |

### DPS por categoria no lab (multidão, nível máximo, % da melhor `aimed`)

| Categoria                  | Faixa               | Antes   | Depois  |
| -------------------------- | ------------------- | ------- | ------- |
| aimed                      | 85–100%             | 63–100% | 87–100% |
| auto                       | 50–65%              | 16–53%  | 55–56%  |
| area                       | 40–55%              | 42–65%  | 44–46%  |
| Elos (vs melhor Elo aimed) | mesma faixa da base | 16–100% | 46–100% |

### Loja

|                                   | Antes  | Depois          |
| --------------------------------- | ------ | --------------- |
| Custo da Loja inteira             | 21.650 | 40.300          |
| Ouro médio por partida (sim)      | 689    | 739             |
| Partidas médias para comprar tudo | 31     | 54 (alvo 40–60) |

# Rodada dos Elos

## Etapa 1 · nova regra de formação

Mudanças: o Elo se forja na hora em que a arma (7/7) e a passiva da receita estão no nível máximo; não há mais
carta de Elo nem Elo pelo baú. O baú de elite dá ouro (25), um nível de algo que o herói já tem e 25% de cura
(`CHEST` em `data/pickups.ts`). As cartas que avançam uma receita do herói saem 3x mais (`config.xp.recipeWeight`)
e mostram o progresso ("Elo Fúria: arma 6/7 · Força 5/5"). O bot passou a perseguir a passiva da receita.

### Elos no sim (antes = regra do baú, 288 partidas por lado)

| Loja    | 1º Elo (mediana) antes | depois  | partidas com Elo antes | depois | Elos/partida antes | depois |
| ------- | ---------------------- | ------- | ---------------------- | ------ | ------------------ | ------ |
| nenhuma | 9,0 min                | 4,6 min | 2%                     | 7%     | 0,0                | 0,2    |
| metade  | 6,7 min                | 5,8 min | 47%                    | 52%    | 1,1                | 2,5    |
| inteira | 6,7 min                | 5,8 min | 93%                    | 89%    | 2,6                | 4,3    |

Meta do primeiro Elo (5–7 min na mediana) cumprida com loja. Sem loja quase ninguém chega lá: o herói morre antes
(Valmor sem loja morre aos ~6 min, como pede a meta de dificuldade).

```
TARGETS  stage     shop  wins        death(median)  gold/run  heroes (win % vs stage)
         valmor    none  0/32 0%           6.1 min       181  aldo 0% · lyra 0% · teo 0% · andilla 0%
         valmor    half  19/32 59%        10.1 min       702  aldo 38%! · lyra 63% · teo 38%! · andilla 100%!
         valmor    full  30/32 94%        12.6 min      1007  aldo 88% · lyra 100% · teo 88% · andilla 100%
         crypt     none  0/32 0%           4.1 min       132  aldo 0% · lyra 0% · teo 0% · andilla 0%
         crypt     half  6/32 19%          9.0 min       829  aldo 13% · lyra 13% · teo 38% · andilla 13%
         crypt     full  27/32 84%        10.1 min      1476  aldo 63%! · lyra 88% · teo 88% · andilla 100%
         southRoad none  0/32 0%           1.7 min        41  aldo 0% · lyra 0% · teo 0% · andilla 0%
         southRoad half  0/32 0%           4.3 min       435  aldo 0% · lyra 0% · teo 0% · andilla 0%
         southRoad full  15/32 47%         5.5 min      1660  aldo 13%! · lyra 63% · teo 50% · andilla 63%


ELOS     none: first Elo median 4.6 min (7% of runs), 0.2/run · half: first Elo median 5.8 min (52% of runs), 2.5/run · full: first Elo median 5.8 min (89% of runs), 4.3/run
ELO X    fury 1.4x · holyLight 5.8x · yahFlame 1.6x · vigil 0.4x · blizzard 1.2x · storm 1.8x · jointBreaker 1.7x · fireSword 3.8x · forgeFury 5.4x · soulProcession 4.1x · valmorWall 3.4x · lyraStar 4.8x
```

O ELO X do sim (Elo contra a base no máximo, nas mesmas partidas) ficou instável: com a regra nova a base fica
pouco tempo no nível máximo. A Etapa 7 passa a garantir o 2,5x pelo lab.

## Etapa 4 · efeitos novos das Elos iniciais

- **Fúria**: redemoinho em volta do herói; a cada 3º golpe, uma onda cortante à frente que atravessa tudo
  (`wave`: 1,5x o golpe, 460 px/s por 0,7 s).
- **Estrela de Lyra**: a explosão solta 5 estrelinhas que caem a 70 px e explodem de novo a 50% (uma geração,
  `split`).
- **Quebra-Junta**: uma fenda que se ramifica em três na ponta (`branch`), cada tremor acorda um menor 0,35 s
  depois (`aftershock`, 60%), e o atordoado leva 1,5x (`crush`, "esmagar").
- **Leque de Facas**: cada faca ricocheteia para o inimigo mais próximo até 3 vezes (`ricochet`); o crítico faz
  sangrar (`bleed`: 50% do golpe por segundo por 3 s, dano contínuo genérico em `applyDot`, tom esmeralda).

Com os efeitos, o Leque ia a 8091 de DPS em multidão (18,6x a base) e a Estrela a 3315. Os números foram
recalibrados para cada Elo ficar onde estava (lab, multidão, % da melhor Elo `aimed`):

| Elo          | antes       | só efeitos   | depois (recalibrado)                                       |
| ------------ | ----------- | ------------ | ---------------------------------------------------------- |
| fury         | 2059 · 4,1x | 2312 · 4,6x  | 2066 · 4,1x (dano 66 → 59)                                 |
| jointBreaker | 1853 · 4,1x | 2046 · 4,6x  | 1855 · 4,1x (dano 118 → 107, 1 fenda)                      |
| lyraStar     | 1853 · 4,2x | 3315 · 7,5x  | 1886 · 4,3x (dano 58 → 33)                                 |
| fan          | 1875 · 4,3x | 8091 · 18,6x | 2002 · 4,6x (dano 52 → 22, 7 → 5 facas, recarga 0,3 → 0,4) |

O Leque perde contra um alvo só (solo 1875 → 485): antes era fora da curva; hoje fica perto das outras `aimed`.

## Etapa 5 · efeitos novos das outras nove Elos

| Elo            | efeito novo (dado em `data/weapons.ts`)                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Luz Sagrada    | `mend`: cada abate pela luz cura 1 de vida, no máximo 4 por segundo                              |
| Chama de Yah   | `pulse`: a cada 10 pulsos (3 s) uma onda até 1,25x o raio, 4x o dano, empurrando tudo            |
| Vigília        | `dart`: cada espada avança até o inimigo mais próximo (até 120 px) ao passar pela direção dele   |
| Nevasca        | `shatter`: quem morre dentro da geada estilhaça, 8x o dano do tique em 55 px                     |
| Tempestade     | `chain`: cada raio pula para mais 2 inimigos a até 170 px, 70% do dano                           |
| Fúria da Forja | `boomerang`: o martelo volta na metade do caminho e acerta de novo na volta                      |
| Procissão      | `swell`: cada abate soma uma alma às próximas levas, até +4, por 4 s depois do último abate      |
| Muralha        | `ward`: uma proteção absorve um golpe a cada 10 s e devolve 3x o dano do escudo a quem bateu     |
| Espada de Fogo | `ground`: o chão queima 2,5 s onde a espada cai e põe fogo em quem passa (`burn`, dano contínuo) |

Lab em multidão, % da melhor Elo `aimed` (antes da etapa → só efeitos → recalibrado):

| Elo                                             | antes                                                                 | só efeitos  | depois                                          |
| ----------------------------------------------- | --------------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| forgeFury                                       | 1854 · 4,2x                                                           | 3543 · 8,1x | 1858 · 4,2x (dano 103 → 54)                     |
| vigil                                           | 958 · 4,3x                                                            | 1397 · 6,3x | 941 · 4,2x (dano 57 → 56, investida até o alvo) |
| yahFlame                                        | 960 · 4,4x                                                            | 1446 · 6,6x | 964 · 4,4x (dano 15 → 10)                       |
| fireSword                                       | 1178 · 4,2x                                                           | 2549 · 9,1x | 1176 · 4,2x (dano 26 → 12)                      |
| storm                                           | 1152 · 4,2x                                                           | 1660 · 6,0x | 1153 · 4,2x (dano 36 → 25)                      |
| holyLight, blizzard, soulProcession, valmorWall | sem mudança no lab (os efeitos dependem de abates ou de levar golpes) |             |                                                 |

O lab usa alvos imortais, então cura, estilhaço, almas e a proteção não aparecem nele; o sim mede o efeito real
na Etapa 7.

## Etapa 6 · Livro de Elos

- Cada Elo forjado pela primeira vez rende **40 de ouro** (`ELO_DISCOVERY_GOLD` em `data/evolutions.ts`), avisado
  na tela final.
- O Livro (Coleção → Elos) mostra a corrente na cor do elemento entre a passiva e o Elo; um Elo descoberto abre a
  página dele: elemento, receita acorrentada, o que faz (o texto novo de cada Elo) e a frase dele.
- Conquistas: Primeiro Elo (`eloFirst`), Corrente Inteira (3 Elos numa partida, `elosRun3`), Livro Completo
  (`elosAll`) já existiam; nova **Um Herói, Todos os Elos** (`elosHero`, 200 de ouro, título "Forjador de Elos").

## Etapa 7 · balanceamento

- **Lab**: `tests/core/bands.test.ts` garante que cada Elo fica na faixa da categoria (contra a melhor Elo `aimed`)
  e rende pelo menos 2,5x a base no nível máximo. Todas ficam entre 3,8x e 4,6x.
- **Cripta**: com os efeitos novos (cura, proteção, estilhaço) a loja inteira vencia 92% (alvo 70–85%). `mult` de
  HP 1,15 → 1,3 e de dano 1,65 → 1,75: 83%.
- **Fúria da Forja**: o bumerangue voltava na metade de uma ida de 270 px; nas partidas o martelo rendia 1,0x a
  base (sem bumerangue, 3,3x). Vida 1,8 → 3,4 s: vai tão longe quanto antes e volta. Real 360 → 1342 (4,1x o
  martelo nas mesmas partidas).
- **Fúria**: a onda passa a sair a cada 2 golpes (3x o dano, 0,8 s), o giro cai para 45. No lab 3,8x; nas partidas
  do bot fica perto da lâmina (1,3x), como já ficava depois da Etapa 1 (1,4x): o bot anda fugindo, então "à frente"
  costuma ser longe dos inimigos. Fica para o teste com gente.

### Lab final (multidão, nível máximo)

| Elo            | DPS  | x base | % da melhor Elo da categoria |
| -------------- | ---- | ------ | ---------------------------- |
| fan            | 2002 | 4,6x   | 100% (aimed)                 |
| fury           | 1917 | 3,8x   | 96%                          |
| lyraStar       | 1886 | 4,3x   | 94%                          |
| jointBreaker   | 1855 | 4,1x   | 93%                          |
| forgeFury      | 1836 | 4,2x   | 92%                          |
| holyLight      | 1166 | 4,3x   | 58% (auto)                   |
| fireSword      | 1176 | 4,2x   | 59%                          |
| soulProcession | 1175 | 4,2x   | 59%                          |
| storm          | 1153 | 4,2x   | 58%                          |
| yahFlame       | 964  | 4,4x   | 48% (area)                   |
| valmorWall     | 963  | 4,2x   | 48%                          |
| blizzard       | 957  | 4,1x   | 48%                          |
| vigil          | 941  | 4,2x   | 47%                          |

## Antes e depois da rodada dos Elos (sim, 16 sementes = 576 partidas)

| Fase    | Loja    | Vitórias antes | depois | Alvo   |
| ------- | ------- | -------------- | ------ | ------ |
| Valmor  | nenhuma | 6%             | 11%    | 0–15%  |
| Valmor  | metade  | 58%            | 55%    | 40–60% |
| Valmor  | inteira | 98%            | 98%    | 85%+   |
| Cripta  | nenhuma | 0%             | 0%     | 0%     |
| Cripta  | metade  | 16%            | 16%    | 15–35% |
| Cripta  | inteira | 86%            | 83%    | 70–85% |
| Estrada | nenhuma | 0%             | 0%     | 0%     |
| Estrada | metade  | 2%             | 2%     | 0–10%  |
| Estrada | inteira | 47%            | 52%    | 35–55% |

| Loja    | 1º Elo (mediana) antes | depois  | partidas com Elo antes | depois | Elos/partida antes | depois |
| ------- | ---------------------- | ------- | ---------------------- | ------ | ------------------ | ------ |
| nenhuma | 9,0 min                | 5,6 min | 2%                     | 10%    | 0,0                | 0,4    |
| metade  | 6,7 min                | 5,7 min | 47%                    | 46%    | 1,1                | 2,1    |
| inteira | 6,7 min                | 5,8 min | 93%                    | 91%    | 2,6                | 4,5    |

```
antes  ELO X fury 1.7x · holyLight 4.5x · yahFlame 14.8x · fan 3.6x · vigil 12.8x · blizzard 2.4x · storm 1.4x · jointBreaker 4.2x · fireSword 3.2x · forgeFury 4.1x · soulProcession 3.9x · valmorWall 8.7x · lyraStar 2.8x
depois ELO X fury 1.5x · holyLight 5.5x · yahFlame 30.9x · vigil 7.5x · blizzard 3.6x · storm 1.3x · jointBreaker 4.5x · fireSword 1.7x · forgeFury 7.4x · soulProcession 3.9x · valmorWall 7.7x · lyraStar 2.3x
```

O ELO X do sim compara a base no nível máximo com o Elo nas mesmas partidas; com a regra nova a base fica pouco
tempo no máximo, então o número oscila muito entre rodadas. Fúria e Tempestade já ficavam abaixo de 2x antes
desta rodada. O lab é a medida estável.

## Ajustes depois do teste do Daniel (2026-11-09)

- **Lâmina de Valmor**: a estocada (a cada 2 golpes) era desenhada como uma fatia fininha do arco e parecia bug.
  Agora é uma estocada: um losango longo do herói até a ponta, com brilho na ponta (forma `thrust`).
- **Escudos de Valmor / Muralha**: o empurrão de 150 sumia em ~15 px (o knockback decai 10x por segundo). 150 → 600
  e 200 → 750: cerca de 60 px.
- **Maça de Ferro** refeita: em vez de fenda + tremor atrasado, uma pancada à frente (raio 48–60) que atordoa e,
  a cada 3 golpes, uma onda de choque (105–125 px, 80% do dano) que empurra forte. **Quebra-Junta**: a onda em
  todo golpe, um eco a 70% logo depois e esmagar. Lab: maça 468 (93% da melhor `aimed`), Quebra-Junta 1890 (4,0x).
- **Tela**: nenhuma arma treme mais a tela.
- **Cripta**: com os escudos empurrando, a loja inteira voltou a 91%. `mult` HP 1,3 → 1,35, dano 1,75 → 1,85: 81%.

Sim (16 sementes): Valmor 13% / 48% / 98%, Cripta 0% / 17% / 81%, Estrada 0% / 0% / 52%; 1º Elo 5,7–5,8 min.
Nas partidas do bot a maça nova rende menos que a antiga (DPS real ~80 contra ~130): a pancada é curta e o bot anda
de costas para os inimigos. Vale sentir na mão.

## Revisão 2026-11-09: bugs e quick wins

`SIM_SEEDS=16 SIM_SHOP=all npm run sim` depois da N1 (Quebra-Junta sem trava de tontura, rajadas completas, investida da
Vigília, cura que não levanta herói caído) e dos ajustes NE-03 (Martelo 500, onda da Chama de Yah 650) e NE-04
(Badalada 600).

| Fase    | Sem Loja | Meia Loja | Loja inteira | Meta               |
| ------- | -------- | --------- | ------------ | ------------------ |
| Valmor  | 13%      | 56%       | 94%          | 0–15 / 40–60 / 85+ |
| Cripta  | 0%       | 23%       | 86%          | 0 / 15–35 / 70–85  |
| Estrada | 0%       | 2%        | 45%          | 0 / 0–10 / 35–55   |

Todas dentro, exceto a Cripta com a Loja inteira, 1 ponto acima (ruído). ELO X: Tempestade 1,6x (antes 1,2x), ainda abaixo
de 2,5x (NE-02, proposto); as outras de 2,6x (Fúria) a 17,8x. Vigília com Loja inteira (8 sementes): média de 353 s e
nenhuma travada pelo Quebra-Junta. Primeiro Elo aos 5,6 min com a Loja inteira; Loja inteira em 57 corridas.

## Lâmina de Valmor sem estocada (2026-11-10)

O Daniel não gostou de a arma do Aldo ter dois ataques: ficou só o golpe em arco (meia-lua). Sem a estocada, a
multidão ganha (o golpe largo acerta mais que a estocada estreita: 501 para 534 no lab) e o alvo único perde (147 para
62, a estocada dava 3,5x). Dano no nível máximo 46 para 43 (multidão de volta a 499, todas as faixas iguais) e níveis
iniciais mais fortes (13/17/22/28 para 16/21/25/28), porque sem a estocada o Aldo começava fraco (Valmor sem Loja
13% para 0%, meia Loja 56% para 31%).

Sim só com o Aldo (16 sementes; Valmor com 24 deu 8% / 50% / 96%):

| Fase    | Antes           | Depois          | Meta               |
| ------- | --------------- | --------------- | ------------------ |
| Valmor  | 13% / 56% / 94% | 13% / 50% / 94% | 0–15 / 40–60 / 85+ |
| Cripta  | 0% / 6% / 81%   | 0% / 0% / 75%   | 0 / 15–35 / 70–85  |
| Estrada | 0% / 0% / 50%   | 0% / 0% / 50%   | 0 / 0–10 / 35–55   |

## Maça de Ferro: mais alcance, menos dano (NE-01, 2026-11-11)

Decisão 4 do Daniel. `radius` 48/48/52/52/56/56/60 → 60/60/65/65/70/70/75 e `damage` 27/34/34/43/43/54/70 →
20/26/26/32/32/41/53. Lab (multidão, nível máximo): 468 (94%) → 455 (91%), L1 74 → 100; Quebra-Junta 1832 (4,0x).
Sim só com o Teo (24 sementes, nenhuma / meia / inteira):

| Fase    | Antes           | Depois          | Meta               |
| ------- | --------------- | --------------- | ------------------ |
| Valmor  | 13% / 50% / 88% | 8% / 54% / 100% | 0–15 / 40–60 / 85+ |
| Cripta  | 0% / 21% / 71%  | 0% / 21% / 67%  | 0 / 15–35 / 70–85  |
| Estrada | 0% / 4% / 21%   | 0% / 0% / 33%   | 0 / 0–10 / 35–55   |

Sim completo depois (8 sementes, 288 corridas): Valmor 16% / 50% / 94%, Cripta 0% / 22% / 69%, Estrada 0% / 0% /
44%; luta do chefe mediana 14 s (NE-05 continua aberto).

## Luta do chefe de ~30 s (NE-05, 2026-11-11)

Só subir a vida não servia: com x2,5 a luta ia a 37 s, mas as vitórias com Loja inteira caíam (Valmor 94% → 53%,
Cripta 69% → 31%, Estrada 44% → 3%). Sondando o dano recebido na luta, quem mata é o próprio chefe: a mordida pegava a
rampa de dano da onda (4,8x às 9:00, ~96 por toque). Decisão tomada sem o Daniel (ele revê):

- Quando o chefe chega, a multidão comum sai do campo (`clearCrowd` em `core/waves.ts`): sem XP, sem drop, sem
  contar abate; elites ficam. A escolta do chefe continua (segmento das 10:00, dano 4,8 → 3).
- O chefe morde sempre com o mesmo dano (`def.damage` x `mult.damage`, sem a rampa): Sineiro e Lobo Velho 18 → 12,
  Cavaleiro Negro 20 → 13; o perigo do chefe é a habilidade com aviso.
- Vida: Cavaleiro Negro 20000 → 81000, Lobo Velho 18000 → 63000, Sineiro 14000 → 49000 (x3,5; ele invoca ossadas a
  cada 8 s e uma luta longa pesa mais nele).
- Conquistas: `bossFast` 15 → 30 s (54% das vitórias com Loja inteira); `damageRun` 750 mil → 1 milhão (48%).

Sim completo (8 sementes, 288 corridas), nenhuma / meia / inteira:

| Fase    | Depois          | Meta               |
| ------- | --------------- | ------------------ |
| Valmor  | 13% / 47% / 97% | 0–15 / 40–60 / 85+ |
| Cripta  | 0% / 22% / 75%  | 0 / 15–35 / 70–85  |
| Estrada | 0% / 0% / 47%   | 0 / 0–10 / 35–55   |

Luta do chefe (Loja inteira, 12 sementes): mediana 29 s em cada fase (meia Loja 64 s).

## FT-09 a FT-13 (2026-11-11): Valmor com ratos e aranhas

`SIM_SEEDS=16 SIM_SHOP=all`, Valmor depois do ajuste do `mult` (hp 0.9, damage 0.95; antes 1 e 1.05):

| Perfil | Vitórias | Meta   |
| ------ | -------- | ------ |
| none   | 3%       | 0–15%  |
| half   | 48%      | 40–60% |
| full   | 97%      | 85%+   |

Fonte de dano em Valmor: contato 92%, chão (poças) 6%, chefe 2%. Primeiro Elo mediano em 5,7 min (half). Cripta provisória
(Ossada, Morcego, Esqueleto, Espectro): 0% / 16% / 84%. Estrada: sem mudança. Linha `LOJA`: 55 corridas médias.

## PE-01 (2026-11-12): primeira rodada depois de B-04, PB-02, PB-05, PB-07, verbos novos e escudos em laço

`SIM_SEEDS=16 SIM_SHOP=all` (64 corridas por célula). Antes, sem mexer em nada:

| Fase    | Antes (none / half / full) | Meta               |
| ------- | -------------------------- | ------------------ |
| Valmor  | 13% / 50% / 92%            | 0–15 / 40–60 / 85+ |
| Cripta  | 2% / 53% / 94%             | 0–10 / 80–90 / 90+ |
| Estrada | 0% / 0% / 44%              | 0 / 0–10 / 35–55   |

Valmor e Estrada já estavam na meta; só a Cripta com meia Loja (53%, Teo 31%, Lyra 75%) ficou fora. A Cripta passou de
`mult` hp 0,85 / damage 0,9 para **hp 0,78 / damage 0,42** (a nota abaixo explica o tamanho do corte). Sensibilidade
(meia Loja): damage 0,75 → 63%, 0,62 (hp 0,8) → 66%, 0,5 (hp 0,7) → 84% mas nenhuma Loja 14%, 0,42 (hp 0,78) → 84%.
Depois:

| Fase    | Depois (none / half / full) | Meta               |
| ------- | --------------------------- | ------------------ |
| Valmor  | 13% / 50% / 92% (igual)     | 0–15 / 40–60 / 85+ |
| Cripta  | 9% / 84% / 94%              | 0–10 / 80–90 / 90+ |
| Estrada | 0% / 0% / 44% (igual)       | 0 / 0–10 / 35–55   |

Heróis fora de 20 pontos: Cripta half Teo 63% contra 84% da fase (21 pontos; vai para o PE-02). Valmor half: Lyra 13% contra
50% (era assim antes; Lyra), Estrada full Aldo 69% e Teo 6%.
Nota: o corte de dano é grande porque o bot é bem mais forte que uma pessoa; o Daniel disse que com meia Loja uma pessoa
deve ganhar ~60% na Cripta e que o bot está à frente. **Precisa de reteste à mão** (`?dev`, Cripta, meia Loja).
A tabela `TARGETS` do sim agora imprime `ok` ou `OFF lo-hi` por célula.

## NE-06 (2026-11-12): lab com multidão viva e "inimigos no alcance"

- `tests/lab/measure.ts`: modo `live` (160 inimigos imortais `bones` andando até o herói, com empurrão, repostos no anel de
  420 px quando encostam); `npm run lab` ganhou as colunas `live Lmax`, `live Elo` e `x base`.
- `tests/lab/bot.ts` e `sim.test.ts`: linha `REACH` (média de inimigos dentro do alcance, por segundo, das armas `aura` e
  `orbit` no nível máximo/Elo).
- Leitura: o número `live` é bem maior que o do sim (blade 3053 contra 158 de DPS real), porque o fluxo constante chega
  todo ao herói; serve para **comparar armas**, não para as bandas, que continuam no campo congelado (`bands.test.ts`).
  Em `live`, em relação à Lâmina (3053): Maça 83%, Martelo 30%, Adagas 14%, Geada 25%, Espadas de Elun 24%, Aura de Yah 26%,
  Escudos 37%, Fogo 26%, Tempestade 44%, Luz de Elun 10%. Elos `live` sobre a base: Fúria 3,2x, Quebra-Junta 2,5x,
  Estrela 3,7x, Nevasca 3,2x, Chama 3,6x, Muralha 3,6x, Espada de Fogo 3,5x, Tempestade 1,6x.
- `REACH` (meia Loja, 8 sementes): Aura de Yah 0,2 inimigos no alcance, Espadas de Elun 0,1, Chama de Yah 1,3, Vigília 0,4.
  Ou seja, o bot mata a multidão antes de ela chegar a 90 px: a Aura e as Espadas quase nunca têm alvo (DPS real 6 e 3 com
  meia Loja); o problema é alcance, não dano por golpe.
