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
