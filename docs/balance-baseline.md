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
