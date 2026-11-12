# 01 Balanço (commit 18f6ee3)

Como medi: `npm run lab` (determinístico) e `SIM_SHOP=all npm run sim` (4 heróis x 3 fases x 8 sementes x 3 perfis de Loja = 288 corridas;
saída bruta no scratchpad da sessão). Comparado com `docs/balance-baseline.md` (seções NE-01, NE-05, FT-09 a FT-13). Nenhum arquivo fora
deste foi editado. Bot lê-se como relativo; 8 sementes dão ±17 pontos por célula de herói.

## 1. Bugs

Nenhum bug novo de função. `npm test` verde (437), nenhuma arma com 0 de dano, nenhuma Elo sem ser forjada: no sim as 13 Elos aparecem em
`REAL DPS` com amostra (jointBreaker 73 corridas, yahFlame 39, fury 81, lyraStar 81...). Defesas, passivas e Segunda Chance seguem cobertas
pelos testes (`tests/core/upgrades.test.ts`, `player.test.ts`, `pickups.test.ts`); não encontrei regressão.

## 2. Desequilíbrios (por gravidade)

| #   | Item                                     | Medido                                                                                                      | Esperado                                                                                                            | Sugestão (`src/data`)                                                                                                                                                                                                                                         |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Aura de Yah** no jogo real             | `REAL DPS` **15** (17 corridas) contra lab 220 (44%); Lâmina 156, Raio 613. Baseline já mostrava 17 a 45    | ao menos 1/4 a 1/3 do `aimed` real (40 a 60)                                                                        | Carta morta fora do lab. Em `weapons.ts:229` o dano por tick é 10 e o raio 90, mas o herói foge e quase nada fica dentro. Subir raio L7 90 → 110 e dano 10 → 14 só vale se o lab usar multidão viva (NE-06). Sem isso, qualquer ajuste estoura a banda 40–55% |
| 2   | **Espadas de Elun (paladinSwords)** real | **66** (4 amostras) contra lab 228 (46%)                                                                    | idem                                                                                                                | Mesma causa (arma de `area` com alcance curto). Entra no NE-06                                                                                                                                                                                                |
| 3   | **Tempestade** (storm) ELO X             | **1,4x** do Raio (793 contra 613 real)                                                                      | >= 2,5x                                                                                                             | Já é o **NE-02** (⏸, lab esparso). Continua aberto. **Espada de Fogo** também baixou para **1,7x** (600 contra 298), nova abaixo do alvo; não está no NE-02. Sugestão: tratar as duas juntas e medir com o lab denso do NE-06                                 |
| 4   | Elos limítrofes                          | Procissão 2,5x, Estrela de Lyra 2,7x, Fúria 3,0x                                                            | >= 2,5x                                                                                                             | No limite do alvo; observar, sem mudança                                                                                                                                                                                                                      |
| 5   | **Maça de Ferro** real                   | **76** (7 amostras) contra Lâmina 156 e Adagas 336; Teo Cripta meia Loja **25%** contra 63 a 88% dos outros | `aimed` real próximo dos pares                                                                                      | O NE-01 (✅) deixou o lab em 91%, mas o real continua em metade da Lâmina. Teo é o outlier de Cripta. Subir `mace` dano L7 53 → 60 e L1 20 → 24, ou raio; rever depois do NE-06                                                                               |
| 6   | **Cripta, meia Loja**                    | **63%** (Aldo 75, Lyra 88, Teo 25, Andilla 63). Baseline da Etapa 6 e FT-13: 22% / 16%                      | CLAUDE.md pede ~60% com meia Loja (decisão do Daniel de 2026-11-11, "retestar à mão"); a tabela antiga pedia 15–35% | Está no alvo novo, mas **a tabela `TARGETS` do sim ainda usa 15–35%**; alinhar a meta no código/baseline para não aparecer como desvio. Variância: 4 de 4 heróis mudam +-25                                                                                   |
| 7   | Valmor meia Loja                         | 38% (alvo 40–60). Lyra 25%, Andilla 25%                                                                     | 40–60%                                                                                                              | Dentro do ruído de 8 sementes (FT-09 deu 48% com 16). Sem ação; rodar 16 sementes antes de mexer em `mult`                                                                                                                                                    |
| 8   | Estrada                                  | none 0% / half 0% / full **38%** (alvo 0 / 0–10 / 35–55). Teo full 25% (morre 6:38, 1,8 Elos/run)           | no alvo                                                                                                             | No alvo. Teo e Aldo cheio têm cauda curta por causa do tiro de 23% do dano; ok                                                                                                                                                                                |
| 9   | Conquista `damageRun`                    | mediana de dano 860 mil; só **11%** das corridas passam 1 milhão (baseline NE-05: 48% das vitórias)         | ~50% das vitórias                                                                                                   | 11% de todas as corridas inclui derrotas; entre vitórias deve estar perto. Sem ação                                                                                                                                                                           |
| 10  | Carta pool                               | faltaram 3 cartas em 135/288 corridas (nível médio 56)                                                      | só no fim                                                                                                           | Normal para Loja cheia; tem as cartas de recompensa (`rewards.ts`)                                                                                                                                                                                            |

Lab (crowd, nível máximo): todas as 13 armas dentro das bandas (aimed 87 a 100%, área 44 a 46%, auto 55 a 57%); Elos 2,5x+ em todas
(3,8x a 4,6x) e dentro das bandas contra a melhor `aimed`. Só a precisão do lab (Raio/Tempestade, fogo) diverge do real, como já documentado.
Solo L1 e Lmax não saíram da faixa saudável nas armas de `aimed`; Quebra-Junta solo 193, Maça 63.

## 3. Ok (verificado)

- Vitórias por fase x perfil, todos os heróis (8 sementes por célula): Valmor 13% / 38% / 97%; Cripta 0% / 63% / 91%; Estrada 0% / 0% / 38%.
  Valmor none e full e Estrada inteira batem as metas do `CLAUDE.md`.
- Chefe: mediana 33 s com Loja cheia (`bossFast` <=30 s em 46% das vitórias; NE-05); chegada aos 10:00 (reached10): Valmor e Cripta meia/cheia
  6 a 8 de 8; Estrada cheia 3 a 7 de 8. Sem Loja nunca passa de 5 min em Cripta/Estrada, como esperado.
- Fonte do dano: Valmor contato 90% / poças 8% / chefe 2%; Cripta contato 85% / tiro 10%; Estrada contato 70% / tiro 23% / salto 6%.
- Economia: `LOJA` = 51 corridas médias (alvo 40–60); 791 de ouro por corrida; ouro/min por herói 20 a 219 conforme perfil e fase.
- Elos: primeira Elo mediana 5,0 / 6,2 / 5,7 min (none / half / full), 0,8 / 2,8 / 4,6 por corrida, ou seja, formam a tempo.
- Picks: 28% a 49%, nenhuma arma acima de 50% (maça e Lâmina nos 48 e 49% por serem as iniciais).
- `levelDps`: crescimento de L1 para Lmax coerente com a curva (4x a 8x) nas armas de `aimed`; as de `area` ficam rasas no real (itens 1 e 2).

## Prioridade sugerida

1. NE-06 (lab com multidão viva): destrava itens 1, 2, 3 e 5, todos reflexo do mesmo ponto cego do lab.
2. Em seguida, calibrar Aura de Yah, Espadas de Elun, Maça, Tempestade e Espada de Fogo com o número novo.
3. Alinhar a meta de Cripta/meia Loja (item 6) para a decisão de 2026-11-11 do Daniel.
