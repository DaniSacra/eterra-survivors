# Revisão 2026-11-08 · Balanceamento (balance-tester)

Commit `97e273a`. Nada em `src/`, `tests/` ou `docs/design/` foi alterado; os scripts de medição ficam no
scratchpad da sessão (`.../scratchpad/bal/*.test.ts`, rodados com uma config própria do Vitest).

## Como medi

| Medição                                    | Comando / script                                                                                                             | Resultado                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Lab (DPS solo e multidão)                  | `npm run lab`                                                                                                                | idêntico, número a número, à tabela da Etapa 5 em `docs/balance-baseline.md`                                          |
| Sim padrão (48 corridas, sementes 1–4)     | `npm run sim`                                                                                                                | idêntico à Etapa 5 (33/48 vitórias); o sim é determinístico                                                           |
| Sim ampliado (144 corridas, sementes 1–12) | `SIM=1 SIM_SEEDS=12 npx vitest run tests/lab/sim.test.ts`                                                                    | base de quase todos os números abaixo: 4 sementes são pouco (ex.: Teo parecia o pior e com 12 sementes é o 2º melhor) |
| Lab de chefe                               | `bal/bosslab.test.ts`: um Cavaleiro Negro preso (raio 34) a 60 px, 20 s, mundo congelado, `amount` 0 e 1                     | DPS no chefe por arma no nível máximo e no Elo                                                                        |
| Fantasma esmaecido                         | `bal/ghost.test.ts`: cenários mínimos com `World(1)`                                                                         | prova dos bugs 1 e 2                                                                                                  |
| Veterano                                   | `bal/veteran.test.ts`: o sim com a Loja inteira comprada (`shopBonuses` com tudo no máximo), 4 heróis x 3 fases x 4 sementes | 47/48 vitórias                                                                                                        |
| Velocidade isolada                         | `bal/speed.test.ts`: Andilla com -10 de velocidade, Teo e Aldo com +10, 12 corridas cada                                     | a velocidade não explica a Andilla                                                                                    |
| Variantes de dados                         | `bal/fan.test.ts` e `bal/variants.test.ts`: troca de valores em tempo de execução, sem tocar em `src/data`                   | números das sugestões                                                                                                 |

O bot foge e se mantém longe dos inimigos, então armas corpo a corpo e auras rendem menos no sim do que renderiam
nas mãos de um jogador que entra na multidão. Leia as conclusões sobre corpo a corpo com isso em mente.

## Resumo do sim de 12 sementes

```
herói    vitórias   chegou às 10:00   mata o chefe em (média/mediana)   1º Elo (média)   ouro/corrida
aldo     18/36      22                102 s / 92 s                       8:08            364
lyra     22/36      26                 67 s / 55 s                       7:44            410
teo      25/36      27                 53 s / 45 s                       8:19            382
andilla  32/36      34                107 s / 77 s                       7:33            687

fase       vitórias  nível médio  mortes na luta do chefe  mortes 6–8 min
valmor     29/48     37.9         2                        9
crypt      38/48     43.6         3                        5
southRoad  30/48     42.1         7                        4
```

Das 47 derrotas: 11 entre 4 e 6 min, **18 entre 6 e 8 min**, 6 entre 8 e 10 min, 3 mortes na luta do chefe e
**9 em que o chefe não morreu em 5 min** (o sim para aos 15:00). 15 corridas passaram de 600 inimigos vivos e 11
bateram no teto de 700.

---

## 1. Bugs

### B1 · Fantasma esmaecido gasta a perfuração dos projéteis (média)

- **O que acontece**: enquanto o Espectro está esmaecido, `damageEnemy` ignora o golpe
  (`src/core/enemies.ts:197`, `isFaded`), mas o laço de colisão dos projéteis registra o acerto e gasta a
  perfuração mesmo assim (`src/core/projectiles.ts:127-137`: `p.hits.push` e `--p.pierce` depois do
  `damageEnemy`). O fantasma "intocável" vira um escudo que come facas, luzes e martelos. `nearestEnemy`
  (`src/core/projectiles.ts:69`) também escolhe fantasmas esmaecidos como alvo das Adagas, da Luz de Elun e do
  primeiro raio do Raio e do Fogo.
- **Prova** (`bal/ghost.test.ts`): Adagas L1 (2 facas, atravessa 1), fantasma a 60 px e dois esqueletos atrás.
  Fantasma sólido: fantasma 24, esqueleto 1 24, esqueleto 2 0. **Fantasma esmaecido: fantasma 0, esqueleto 1 24,
  esqueleto 2 0**. O segundo alvo deveria levar os 24; metade do dano da arma se perde.
- **Correção (mecânica, implementador)**: em `updateProjectiles`, tratar `isFaded(e)` como `e.dead` (pular sem
  registrar o acerto), e pular esmaecidos em `nearestEnemy` e `randomEnemyNear`. Também
  `src/core/weapons.ts:215` grava `orbitReady` antes do `damageEnemy`, então uma lâmina que passa por um fantasma
  esmaecido gasta a janela de novo acerto (efeito pequeno, mesma correção).

### B2 · Sopro de Geada deixa o fantasma esmaecido e intocável pelos 6 s inteiros (baixa)

- **O que acontece**: com o mundo congelado o `behaviourStep` não roda (`src/core/enemies.ts:244`,
  `e.def.move && !frozen`), então o temporizador de fase para. Um fantasma que estava esmaecido quando o jogador
  pegou o item fica esmaecido, imune a dano, até o gelo acabar. O item que deveria ser a janela para limpar a tela
  protege justamente esse inimigo.
- **Prova** (`bal/ghost.test.ts`): fantasma esmaecido dentro da Aura de Yah, Geada de 6 s: o congelamento durou
  6,02 s, o fantasma seguia esmaecido no fim e levou 0 de dano.
- **Correção (mecânica)**: ao congelar, devolver o fantasma ao estado sólido (`act = Idle`), ou deixar o
  temporizador de fase correr durante o gelo. O mesmo vale para a Badalada (`src/core/pickups.ts:97-100`), que
  também ignora esmaecidos, mas isso é aceitável pelo desenho.

Nenhuma arma deixa de causar dano, nenhuma passiva fica sem efeito e os 12 Elos foram formados no sim de 12
sementes (de 14 a 39 vezes cada; a Fúria é o mais raro, com 14).

---

## 2. Desequilíbrios

Ordenados por impacto. "Faixa esperada" é a forma saudável descrita no papel do balance-tester.

| #   | Item                                                                              | Medido                                                                                                                                                                                                                                                                                                                                                                                                                                          | Esperado                                                                   | Sugestão (`src/data/*`)                                                                                                                                                                                                                                                                                                                                                 | Por quê                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Leque de Facas (Elo da Andilla) contra um alvo**                                | No chefe a 60 px: **81 DPS** contra Adagas L7 152 (com `amount` 1, que a receita exige); a 90 px ou mais: **27 DPS** (0,18x da base). Lab solo: 27 contra 121,8. A Andilla é a que demora mais no chefe (média de 107 s, contra 53 s do Teo)                                                                                                                                                                                                    | Elo claramente acima do nível máximo                                       | `fan` (`src/data/weapons.ts:327-343`): `spread` de `TAU/10` para **0.16**, `damage` 15 para **18**. Medido com 0.16 e 15: chefe 243 / 135 / 79 DPS a 60 / 90 / 140 px, multidão 1175 (igual à atual, 1174). Com dano 18: cerca de 162 a 90 px                                                                                                                           | Num anel de 10 facas, só a do centro pega um alvo; num leque de cerca de 100° à frente o dano na multidão fica igual. Isso desfaz a escolha de B-01 (anel girado meio passo), então quem decide é o game-director |
| D2  | **Andilla muito acima dos outros heróis**                                         | 32/36 vitórias (89%) contra Aldo 18/36 (50%), Lyra 22/36, Teo 25/36; ouro por corrida 687 contra 364 a 410. Com -10 de velocidade ainda vence 10/12 e leva 0,8 de dano por minuto                                                                                                                                                                                                                                                               | Nenhum herói 2x acima dos outros                                           | Não nerfar (o Daniel pediu a Andilla forte no começo, E-03). Subir o Aldo (D3) e deixar a Andilla como teto. Se precisar mexer: Adagas L1 `cooldown` 0.8 para **0.9** (solo L1 de 30 para cerca de 27; hoje é 2,5x o teto de 12 da faixa)                                                                                                                               | O que faz a Andilla dominar é a Adaga L1 mirando no mais próximo, não a velocidade (`bal/speed.test.ts`)                                                                                                          |
| D3  | **Aldo, o herói inicial, é o mais fraco, e Aldo em Valmor é a pior dupla**        | Aldo 18/36; Aldo em Valmor **5/12**, nível médio 33,5, ouro 27,9/min (a primeira partida de todo jogador novo). Na prática a Lâmina L7 rende 67 DPS e a Fúria 59, contra 166 a 171 de Nevasca e Luz Sagrada                                                                                                                                                                                                                                     | O herói inicial na fase inicial deve ser a corrida mais justa              | `blade` (`src/data/weapons.ts:100-111`): `range` +10 em todos os níveis (L1 95 ... L7 122); `fury` (`:300-303`): `range` 125 para **150**. Alternativa: Aldo `maxHp` +20 para **+30** (`src/data/characters.ts:133`)                                                                                                                                                    | O alcance é o que um golpe corpo a corpo perde quando o herói foge; o lab subestima isso porque os bonecos ficam parados (fury 5115 no lab, 59 na corrida)                                                        |
| D4  | **Elos corpo a corpo e de aura rendem 3 a 5x menos que os de distância**          | DPS real médio no sim (relatório de armas, 144 corridas): Chama de Yah **34**, Fúria 59, Quebra-Junta **59**, Vigília 73, contra Luz Sagrada 171, Nevasca 166, Tempestade 163, Espada de Fogo 155. A Maça L7 rende **37** (a pior base no máximo; Fogo L7 94)                                                                                                                                                                                   | Um Elo nunca abaixo das bases boas                                         | `yahFlame` (`:322-325`): `radius` 125 para **150**; `jointBreaker` (`:362-365`): `range` 120 para **145**, `arc` 2.6 para **3.0**; `mace` (`:271-282`): `range` L1 78 para **88**, L5 88 para **100**, L7 96 para **110**                                                                                                                                               | Mesmo motivo de D3. A Maça é nova e rende abaixo da Lâmina, que já é fraca na prática. Verificar com o sim; um humano que entra na multidão vai sentir menos diferença do que o bot                               |
| D5  | **Parede dos 6:30 (segmento de 390 s)**                                           | 18 das 47 derrotas acontecem entre 6 e 8 min (9 em Valmor). HP por segundo gerado (taxa x hpMult): 300 s 8,6 x 2,1 = 18,0; **390 s 11,7 x 2,8 = 32,7 (1,8x de uma vez)**; 480 s 44,5 (1,36x); 540 s 65,6 (1,47x)                                                                                                                                                                                                                                | Degraus de 1,3 a 1,5x                                                      | `CURVE` (`src/data/waves.ts:212`): 390 s `hpMult` 2.8 para **2.5** (degrau de 1,6x). Medido (12 sementes): Estrada de 30 para **35/48**; Valmor fica em 29/48, mas as mortes entre 6 e 8 min caem de 9 para 6                                                                                                                                                           | Era o pico que o E-01 quis aparar; continua sendo o maior degrau da curva. Em Valmor o problema principal é outro (D6)                                                                                            |
| D6  | **A Cripta (2ª fase) é mais fácil que Valmor (1ª), que é a mais difícil**         | Cripta 38/48 e nível médio 43,6; Valmor 29/48 e 37,9; Estrada 30/48 e 42,1. O Rato Gigante dá 2 de XP com 16 de HP (0,125 XP por HP, contra 0,083 dos Ossos), passa metade do tempo agachado ou descansando (preparo de 0,5 s e descanso de 3,5 s em `src/core/behaviours.ts:11`) e só existe na Cripta (`src/data/stages.ts:261`, papel `extra`)                                                                                               | Cada fase destravada pelo menos tão difícil quanto a anterior              | (a) Valmor com o Golem como primeira elite: `elites('golem', 'goblin')` em `src/data/stages.ts:255`. Medido: Valmor de 29 para **33/48**, nível 37,9 para 39,9, mortes antes das 10:00 de 17 para 13. (b) `rat.xp` 2 para **1** (`src/data/enemies.ts:79`). Medido: Cripta de 38 para **36/48**, nível 43,6 para 40,7. (`rat.hp` 24 **não** resolve: 39/48, nível 44,3) | Em Valmor o Goblin (440 de HP, velocidade 100, dano 12) chega às 1:40 e mata as builds fracas; na Cripta a primeira elite é o Golem lento. O rato é XP fácil                                                      |
| D7  | **Lobo Velho e armas de alvo aleatório**                                          | A Estrada tem 7 das 12 derrotas na luta do chefe; a Lyra perdeu 3 vezes por tempo esgotado ali (chefe com 27 a 74% da vida depois de 300 s, ou seja, 20 a 30 DPS no chefe). Raio, Fogo e Geada caem em inimigos aleatórios da escolta (`src/core/weapons.ts:227` e `:245`) e o chefe, a 115 de velocidade, nunca fica parado numa zona. Lab de chefe: Fogo L7 19 DPS (388 s para 14 mil de HP), Geada 24, Raio 23                               | Luta de chefe de 45 a 90 s (aceite de E-06) para quem chega às 10:00       | Dados: `oldWolf` `hp` 12000 para **10500** (`src/data/enemies.ts:151`). Mecânica (melhor): o primeiro raio, chama ou zona de cada disparo mira o chefe quando ele estiver na tela                                                                                                                                                                                       | Builds de Lyra chegam ao chefe e não conseguem matá-lo; o problema é de mira, não de dano total                                                                                                                   |
| D8  | **A Loja inteira anula o jogo (e a armadura volta a zerar o dano, como em E-09)** | Veterano com a Loja inteira: **47/48** vitórias, 0 a 5,6 de dano por minuto (sem Loja: 0,3 a 30,7). Aldo chega a armadura **7** (1 do herói + 3 da passiva + 3 da Loja): todo inimigo comum (4 a 8 de dano) passa a dar 1 (`minDamage`, `src/data/config.ts:29`). Com no máximo 2 golpes por segundo (i-frames de 0,5 s), entram no máximo 2 HP/s, contra 2,0 HP/s de regeneração com Recuperação 5 e a Loja, ou seja, imortal contra os comuns | Armadura máxima ainda leva dano relevante depois das 6:00 (aceite de E-09) | `SHOP.armor` (`src/data/shop.ts:166`): `maxLevel` 3 para **1**; ou `config.player.minDamage` 1 para **2**. Fazer a Loja inteira demora cerca de 53 corridas, então o "fim fácil" é esperado, mas pede uma dificuldade extra por fase vencida ("Ideias para depois" no backlog)                                                                                          | A Loja repete o problema que E-09 resolveu na passiva                                                                                                                                                             |
| D9  | **Elos chegam tarde**                                                             | 1º Elo em média entre 7:33 e 8:19; só **29 de 144** corridas formam um Elo antes das 7:00                                                                                                                                                                                                                                                                                                                                                       | Aceite de E-08: o primeiro Elo antes das 7:00                              | `ELITE_TIMES` (`src/data/stages.ts:245`): `[100, 220, 330, 420, 500, 570]` para **`[90, 200, 300, 390, 480, 560]`**, ou `config.xp.step` 7 para **6.5**                                                                                                                                                                                                                 | O baú certo chega antes de a arma estar no máximo; 6 elites é a única fonte de Elo                                                                                                                                |
| D10 | **Fogo cresce pouco contra um alvo**                                              | Solo L1 7,0 e Lmax 19,2 (**2,7x**; a menor DPS solo no máximo do jogo). No sim é escolhido em 48% das corridas e a Espada de Fogo rende 155 de DPS real, então na prática está bem                                                                                                                                                                                                                                                              | Lmax de 4 a 8x o L1                                                        | `fire` (`src/data/weapons.ts:286-295`): L7 `damage` 32 para **38** (solo de cerca de 23, como o Raio)                                                                                                                                                                                                                                                                   | Prioridade baixa; corrige a forma da curva sem mexer na multidão                                                                                                                                                  |
| D11 | **Mãos Ligeiras na Loja é a melhor compra, de longe**                             | `SHOP.amount` (+1 projétil, lâmina, zona ou raio em todas as armas) por 2000, contra Recarga -9% por 1500 no total (`src/data/shop.ts:169,174`). No lab, +1 de `amount` dá +25% (Adagas L7 121,8 para 152,3) a +100% (armas de contagem 1). Também ultrapassa o limite da passiva (2), chegando a 3                                                                                                                                             | Compras com valor parecido por ouro                                        | `amount` `baseCost` 2000 para **3000**                                                                                                                                                                                                                                                                                                                                  | Prioridade baixa; é o último item de longo prazo, só convém que não seja óbvio demais                                                                                                                             |

Variantes medidas com `bal/variants.test.ts` e `bal/valmor.test.ts` (4 heróis x 12 sementes por fase, valores trocados em tempo de execução). Aplicar (a) e (b) de D6 e o D5 juntos deixaria Valmor, Cripta e Estrada perto de 33 a 36 de 48, na ordem certa de dificuldade, mas isso precisa ser medido junto depois da mudança.

---

## 3. Ok (verificado, sem ação)

- **Lab**: igual à linha de base; as Lmax em multidão, com mediana de 681, estão todas acima da metade da mediana,
  menos os Fogos-Fátuos (328,5), que são uma arma de alvo único, então passa. A Lâmina em multidão (1984, 2,9x a
  mediana) é um teto inflado pelos bonecos sem recuo; no sim ela rende 67, sem dominância.
- **Maça de Ferro e Quebra-Junta**: funcionam (solo 12,0 / 43,7 / 75,0; multidão 72 / 1136 / 3150), Elo 1,7x acima
  da base no chefe; o problema é só de alcance na prática (D4). Escolhida em 49% das corridas (esperado perto de 50%,
  o bot pega 4 de 8 armas compartilhadas; o aceite "abaixo de 40%" do D-05 não cabe com o bot atual).
- **Fogo e Espada de Fogo**: funcionam; Elo 1,9x a base no chefe; a Espada de Fogo é formada em 21 corridas com 155
  de DPS real, no grupo dos melhores Elos sem se destacar.
- **Elos x base no chefe** (lab de chefe, `amount` 1): todos de 1,5 a 2,2x a base, menos o Leque (0,53x, D1).
- **Regra do Elo** (base no máximo + passiva + baú, `src/core/upgrades.ts:398-407`): os 12 Elos foram formados no
  sim; Quebra-Junta e Vigília dividem a Armadura, Fúria e Espada de Fogo dividem a Força, o que economiza vagas.
- **Limite de passivas** (`config.weapons.maxPassives` 6, `src/core/upgrades.ts:382-386`): com 6 cheias só sobem
  as que já existem; baú sem Elo pronto só sobe o que existe; com tudo no máximo vira cura. Correto. Um jogador
  pode fechar as 6 vagas sem a passiva da receita, mas a carta mostra a receita (A-11), então é escolha, não bug.
- **Defesas**: armadura respeita `minDamage` (`src/core/player.ts:36`); Vigor, Recuperação e Pão funcionam; a
  Badalada (250) mata qualquer comum até as 10:00 (o mais forte é a Gosma com 45 x 4,1 = 184); Geada congela
  6 s; Pedra-Ímã puxa todas as gemas.
- **Aranha em zigue-zague**: sem efeito mensurável na dificuldade (a Etapa 5 já mediu 22/32 contra 23/32).
- **Encapuzado e Rato com bote**: o bote (2,6x da velocidade por 0,55 s, cerca de 105 a 115 px) é desviável e
  não aparece como causa de morte; a fatia de dano dos rápidos ficou de 10% a 28% em todas as duplas (meta < 40%).
- **Preço dos heróis** (800 / 800 / 1200): o bot com Aldo em Valmor libera o segundo herói em 4 corridas (meta de
  3 a 5 do D-06). Continua sem efeito no jogo enquanto `config.unlockAllHeroes` for `true`
  (`src/data/config.ts:5`), como planejado no D-06.
- **Economia**: 461 de ouro por corrida em média (582 nas vitórias, 210 nas derrotas). Loja inteira + heróis =
  24.450, ou seja, cerca de 53 corridas, dentro da meta de 40 a 80 do E-10. A Andilla ganha quase o dobro (687) por
  causa da Ganância própria e das vitórias.
- **Chefe alcançável**: 109 de 144 corridas chegam às 10:00 e 97 vencem; a luta tem mediana de cerca de 60 s
  (meta de 45 a 90 s), com as exceções de D7.
- **Teto de inimigos**: 11 de 144 corridas batem nos 700, sempre com build que não mata (sem Elo às 8:00).
