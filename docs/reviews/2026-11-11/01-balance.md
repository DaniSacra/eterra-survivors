# 01-balance · Cripta da Igreja Velha (commit 7e51776, 2026-11-11)

Texto escrito pelo `balance-tester` (que só podia gravar no scratchpad) e salvo aqui pela sessão principal, sem
alterações de conteúdo.

**Como medi** (tudo reproduzível):

- `npm run lab`.
- `SIM_STAGE=crypt SIM_SHOP=all SIM_SEEDS=16 npm run sim` (192 corridas). Repeti com `SIM_RUNS=1` para ler as corridas
  uma a uma.
- `SIM_SHOP=all SIM_SEEDS=8` nas três fases, para comparar.
- Cópia do bot no scratchpad (`bot2.ts`, com rastreio) para seguir o chefe tick a tick, medir o limo e rodar variantes
  que mudam `STAGES.crypt` em memória: sem Ossada em Brasa, sem limo, sem Espírito, sem remontagem, sem Coveiro, sem
  Espectro, e `mult.damage` e `mult.hp` alterados.
- As variantes usam 64 corridas por célula (4 heróis x 16 sementes). A célula do `mult.damage` 1.5 foi repetida com as
  sementes 17 a 32.
- O ruído entre conjuntos de 16 sementes é de cerca de ±5 pontos de vitória: a Cripta Loja inteira deu 80% nas sementes
  1 a 16 e 89% nas 17 a 32.

Já está no backlog, então não repito como achado:

- Cripta 0% / 13% / 80% (FT-16).
- Tempestade com ELO X 1,1x a 1,2x (NE-02, aguardando lab com coluna densa).
- Fúria 1,8x e Espada de Fogo 2,1x no sim (`balance-baseline.md` linha 945: "o lab é a medida estável").

## 1. Bugs

Nenhum bug que quebre arma, passiva, Elo ou defesa nesta rodada. `npm test` verde (395), lab sem arma em 0, bandas
todas verdes. Há duas inconsistências de dados na Cripta (B1 e B2) em que o código não faz o que o texto do FT-16 diz.

**B1 · O anel do Coveiro nasce sem o multiplicador de vida da onda** (baixa).

- `src/core/behaviours.ts:360`: `riseAt(world, d.spawn, x, y)` não passa `hpMult`, então vale 1.
- A Badalada do chefe passa o `hpMult` do segmento (`src/core/bosses.ts`, case `'toll'`), e o spawner dos especiais
  também.
- Resultado: as Ossadas do Coveiro têm 14 de vida em qualquer minuto (10 x 1,4). A ossada comum tem 91 aos 7:00 e 168
  aos 9:00 (medido em `hits.test.ts`).
- O dano de contato delas acompanha a rampa da onda (40 aos 9:00): mordem como as outras e morrem de um golpe.
- Conserto: passar `segmentAt(world.time, world.stage.waves).hpMult` ao `riseAt` do `dig`, ou documentar que o anel é
  de propósito fraco. Impacto pequeno: 4 ossadas a cada 7 s por Coveiro.

**B2 · O limo da Gosma Verde quase não existe no jogo** (média; é o ponto do FT-16 "Gosma Verde com rastro").

- Medido com o bot, Aldo, Loja inteira, 8 sementes, até 10:00: o herói passou **0,19% do tempo** dentro do limo; havia
  em média **1,15 gosmas vivas** (teto 6) e **1,9 manchas** no chão (teto 5).
- Causas: `src/data/stages.ts:80` (o especial `slime` vem a cada 15 s, mas a gosma morre rápido);
  `src/data/enemies.ts:279` (`trail` com `radius 26`, `ttl 4`, `slow 0.7`, só 30% de lentidão);
  `src/core/enemies.ts:403-416` (`leaveTrail`: o `cap` conta as manchas **de todas as gosmas juntas**, não por gosma, e
  o rastro só vem a cada 1,2 s).
- Sobra um perigo cosmético. O bot foge, então um humano pisará mais, mas a mecânica não "prende" ninguém.
- Sugestão de dados, a validar com o sim: `trail` `every` 0.6, `cap` 10, `radius` 34, `ttl` 6, `slow` 0.6; `slime`
  especial `every` 10.

## 2. Desequilíbrios

| #   | Item                                           | Medido                                                                                                                                                               | Esperado                                        | Sugestão                                                                                                                                                                                                                  |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Cripta, Loja pela metade                       | 8/64 = 13% (16 sementes). Sementes 17 a 32: 8/64. Em 128 corridas: 12,5%.                                                                                            | 15 a 35%                                        | Opcional. `stages.ts:69` `mult.damage` 1.65 → 1.5: meia Loja 23/128 = 18%, Loja inteira 113/128 = 88%. O ganho cabe no ruído (±3 pontos) e a Loja inteira passa dos 85%. Não mexer sem playtest.                          |
| D2  | Parede das 4:00 às 5:30 na Cripta (meia Loja)  | 25 das 37 mortes antes do chefe caem entre 240 e 330 s. Aldo 6 de 8, Lyra 7 de 11, Teo 12 de 12 e Andilla 3 de 6 morrem antes das 5:35. Só 27 de 64 chegam ao chefe. | Morte mediana de 6 a 8 min                      | A causa não é um inimigo só. É o segmento 240 a 390 do `waves.ts` (lote 6 a 7, hpMult 3,4 a 4,2, dano 1,8 a 2,1) sem Elo ainda: o 1º Elo da meia Loja sai aos 5:00. Para tirar a parede, mexer em `mult` antes das armas. |
| D3  | Cripta sem Loja                                | Morte mediana 3,4 min; Lyra 2:41, Teo 3:18, Aldo 3:56, Andilla 3:08. Ouro por corrida: 67 (Valmor sem Loja: 432).                                                    | A meta só pede 0% de vitória                    | Ok pela meta. O jogador novo ganha pouco ouro lá e deve voltar a Valmor.                                                                                                                                                  |
| D4  | Chefe com meia Loja                            | Dos que chegam às 10:00, 8 de 27 vencem. Ao morrer, o chefe ainda tem 6% a 67% da vida, aos 10 a 39 s de luta.                                                       | Luta de ~30 s com Loja inteira (mediana 32 s ✓) | Fica na D1. Com a Loja inteira, 51/64 vencem e a mediana de luta é 22 a 39 s por herói.                                                                                                                                   |
| D5  | DPS real das armas de área corpo a corpo (sim) | yahAura 24, paladinSwords 13, shields 23, mace 105, blade 256. No lab o máximo é 220 a 499.                                                                          | Auto e aimed em 600 a 920                       | Padrão antigo (baseline linha 650: 25 / 30 / 43 / 117). O bot foge e a arma de área fica sem alvo. Parece artefato do bot (não verificado); não retocar sem teste humano.                                                 |
| D6  | Escudos dos Elos pelo sim                      | valmorWall 199, yahFlame 260, fury 369, jointBreaker 387 contra holyLight 3015 e soulProcession 3270.                                                                | Cada Elo ≥ 2,5x a base                          | Mesma causa da D5. Só o lab é medida confiável (bandas verdes).                                                                                                                                                           |

**Cada peça especial da Cripta** (64 corridas por célula, meia Loja, sementes 1 a 16; vitórias / mortes antes do
chefe):

| Variante            | Vitórias / mortes antes do chefe |
| ------------------- | -------------------------------- |
| base                | 8 / 37                           |
| sem Ossada em Brasa | 10 / 42                          |
| sem limo            | 4 / 38                           |
| sem Espírito Gélido | 10 / 41                          |
| sem remontagem      | 11 / 36                          |
| sem Coveiro (`dig`) | 11 / 44                          |
| sem Espectro        | 14 / 30                          |

- Nenhuma peça isolada sai do ruído. A mais pesada é o Espectro (+6 vitórias).
- O dano (D1) é a alavanca de dano. A de vida é forte demais: `mult.hp` 1.25 dá 10/64 (16%) na meia Loja e **60/64
  (94%)** na inteira.
- Tamanho de cada golpe (`hits.test.ts`, Cripta, dano de contato por mordida, rampa x mult 1,65): Ossada 8 aos 1:00, 17
  aos 5:00, 40 aos 9:00; Esqueleto, Espectro e Gosma 13, 28 e 63; Coveiro 20, 42 e 95; estouro da Ossada em Brasa 12,
  26 e **59**; tiro do Espírito Gélido 7, 14 e 32.
- Aldo tem 160 de vida e armadura 4. Armadura plana corta 70% da Ossada aos 1:00 e só 10% aos 9:00: perde valor
  justamente na parte dura da curva. Já era o caso, só registro.

**Dobre Fúnebre e Badalada** (`enemies.ts:469`; dano em `bosses.ts`):

- Ciclo medido: Badalada, 8 s, Dobre, 5 s, Badalada... O Dobre cai 2 vezes numa luta de 30 s, com 33 de dano (20 x
  1,65), 1,2 s de aviso e 130 px de alcance.
- A fonte `boss` do sim é 0% a 1% nas três fases. Quem mata o herói na luta é a mordida do corpo do chefe: em 13 s de
  luta com o herói em cima dele (Aldo, meia Loja, semente 6), 258 de dano de contato e 0 do ataque `boss`.
- Consequência do bot ficar colado ao chefe. As duas habilidades do Sineiro pesam pouco no número e valem mais como
  leitura. O aviso de 1,2 s e o anel de 130 px dão tempo de sobra para sair.
- Se quiser que o Dobre pese, reduzir `every` de 5 para 3,5, e só validar com o sim.

**Corridas que "perdem" aos 15:00 sem morrer** (3 de 192: Aldo semente 10 com Loja inteira, Andilla semente 8 com Loja
inteira, Aldo semente 1 com meia Loja):

- Na semente 10 do Aldo, o herói termina com 360 de vida, intacto, e o chefe fica entre 400 e 900 px dele durante 300
  s, com 92% da vida.
- Causa: o bot foge do chefe e circula (peso 5 em `tests/lab/bot.ts` `steer`); o chefe tem velocidade 89 e o herói é
  mais rápido. Não é bug do jogo, mas a vitória "Loja inteira" na Cripta (80%) é um pouco subestimada. Não há limite de
  tempo na luta do chefe para o jogador.

## 3. Ok

- **Lab (`npm run lab`):** todas as bandas dentro. Aimed 87% a 100% (blade 100%, mace 91%, staff 89%, hammer 88%,
  daggers 87%). Auto 55% a 56%. Área 44% a 46%. Elos 3,8x a 4,6x as bases. Nenhuma arma com DPS zero.
- **Metas das fases (sim `SHOP=all`, 8 sementes):** Valmor 3% / 47% / 97%. Cripta 0% / 13% / 84% (192 corridas: 0 / 13
  / 80), nenhum herói a mais de 20 pontos da fase com 16 sementes. Estrada 0% / 0% / 38%. Cripta Loja inteira por herói:
  Aldo 75%, Lyra 81%, Teo 75%, Andilla 88%.
- **Ossada que remonta (`enemies.ts:241-249`, pilha em `:217-224`):** testes em `undead.test.ts`. Na Cripta há em média
  só 2,6 pilhas no campo. Remover a remontagem muda de 8 para 11 vitórias, ou seja, ruído. Pilha parada, sem contato
  (`:391`), e o mundo congelado a espera.
- **Ossada em Brasa (`world.ts:311-315`, `marks.ts:161-171`):** dano ao herói 12 a 59, mas só 8% do dano total vem do
  chão (estouro + poças + manchas), abaixo dos 30% pedidos pelo FT-14. O chefe é poupado do estouro. Sem reação em
  cadeia.
- **Espírito Gélido:** 13% do dano da Cripta vem de tiros (meta do FT-16: ~14%). Aldo toma 49 por corrida (meia Loja),
  Lyra 94 e Andilla 99, porque a armadura 4 do Aldo corta os tiros pequenos (de 9 para 5).
- **Chefe alcançável:** Loja inteira 57 de 64 chegam às 10:00 (89%); meia Loja 27 de 64 (42%); sem Loja 0. Luta mediana
  de 22 a 39 s com a Loja inteira, perto dos ~30 s do NE-05.
- **HP do Sineiro:** 49000 x 1,4 = 68600. O Lobo Velho tem 63000 x 2,1 = 132300 e a Mãe-Aranha 81000 x 0,9 = 72900. A
  escala segue as mesmas regras.
- **Economia:** ouro por corrida na Cripta 67 / 720 / 1444 (sem / meia / inteira Loja). Linha `LOJA`: 40300 de ouro =
  52 a 54 corridas médias (meta 40 a 60 ✓).
- **Elos:** 4,0 por corrida com a Loja inteira; o 1º Elo aos 5:30 em mediana (5:00 na meia Loja); ELO X normal exceto o
  que o NE-02 já cobre.
- **POOL:** o baralho de cartas esgota em 86 de 192 corridas na Cripta, por volta do nível 58,6. As cartas de
  recompensa seguram os 3 cartões.
- **Passivas, regen, bomba, congelamento, ímã e Segunda Chance:** não auditadas de novo uma a uma; os 395 testes cobrem
  e nada no sim ou no rastreio apontou falha.
- **Conferência visual:** não feita nesta rodada (o pedido era números e lógica).
