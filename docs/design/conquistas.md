# Coleção e conquistas: Bestiário, Conquistas e Registros por herói

Data: 2026-11-09 · Autor: game-director · Situação: aprovado pelo Daniel (pedido direto), pronto para implementar.

## Recomendações principais

1. **Uma tela "Coleção" com quatro abas (Bestiário · Elos · Conquistas · Heróis)** no lugar do botão "Livro de
   Elos" do menu. O Livro vira uma aba; o menu continua com quatro botões. Tudo que já foi visto aparece; o que falta
   aparece como silhueta ou cadeado. Os espaços vazios visíveis são o motor (pilar 4).
2. **35 conquistas avaliadas só a partir do save, no fim da partida**, com recompensa pequena em ouro (e cinco
   títulos cosméticos). Toda conquista é uma função pura de `MetaSave` + resumo da partida: barata de checar, testável,
   e retroativa para quem já tem progresso.
3. **Na tela final, a conquista mais perto** ("Coveiro de Valmor: 8.240 de 10.000 abates") ao lado da meta da Loja.
   É o "só mais uma" que já funciona com a Loja, agora com metas que pedem outro herói, outra fase, outra build.

## 1. O que o gênero ensina (pesquisa)

O que cada jogo faz, em uma linha, e o princípio que tiramos. Nada de conteúdo copiado.

| Jogo                                       | Como faz                                                                                                                                                                                                                                        | Princípio para nós                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Vampire Survivors                          | Bestiário como "pokédex" com contagem de abates que nunca zera; Coleção com espaços vazios; conquistas que liberam personagens, armas e fases; marcos em degraus (60, 70... 100 itens da Coleção), com a taxa de conclusão caindo a cada degrau | **Espaços vazios visíveis** e contadores que só crescem. Degraus curtos, um sempre perto        |
| Brotato                                    | Cada personagem guarda em quais Perigos já venceu (cor de fundo no seletor); vencer um Perigo abre o próximo                                                                                                                                    | **Metas por personagem** à vista no seletor. Uma grade herói x fase marcada é suficiente        |
| Halls of Torment                           | Missões por fase listadas na fogueira; personagens e traços liberados por desafios concretos (sobreviver X, matar N numa partida, vencer um chefe)                                                                                              | **Desafios concretos e mensuráveis**, sempre listados, cada um com um porquê de jogar diferente |
| HoloCure                                   | Conquistas gerais e por personagem; recompensa em moedas (a primeira vitória dá moedas) ou em itens; coleções ligadas a inimigos                                                                                                                | **Recompensa pequena e frequente em moeda**; a primeira conquista chega na primeira partida     |
| Deep Rock Galactic: Survivor               | Maestria de arma: partida restrita a uma arma, recompensa permanente pequena, de propósito "boa sem ser obrigatória"                                                                                                                            | **Desafio que muda o jeito de jogar** (uma arma só) com recompensa modesta                      |
| Death Must Die                             | Conjunto de conquistas por personagem; liberar personagens com conquistas                                                                                                                                                                       | Uma conquista por herói puxa a **variedade de heróis**                                          |
| 20 Minutes Till Dawn / Soulstone Survivors | Conquistas por arma e por personagem; algumas liberam habilidades                                                                                                                                                                               | No máximo poucas conquistas mexem no jogo; o resto é marco                                      |

Princípios que adotamos:

1. **Espaço vazio visível.** Inimigo não visto = silhueta; conquista = cadeado com barra de progresso; herói = três
   marcas de fase, acesas ao vencer. O jogador vê o tamanho do que falta.
2. **Uma meta sempre perto.** Degraus curtos (1.000 e 3.000 abates numa partida; 10.000 e 50.000 no total). A
   primeira conquista sai na primeira partida (sobreviver 5:00 ou formar um Elo).
3. **Metas por herói.** Cada herói tem a sua vitória (com a fala de vitória dele do original) e um registro próprio.
   "Os Quatro" pede vencer com todos: puxa a variedade que o pilar 3 quer.
4. **Desafios que mudam a build**, não só "jogue mais": "Fiel à Primeira" (vencer só com a arma inicial), "Nem um
   Arranhão", "Corrente Inteira" (três Elos). Cada um é um jeito diferente de jogar uma partida de 10 minutos.
5. **Recompensa pequena e honesta.** Ouro (25 a 300) e cinco títulos. Total de 3.550 de ouro, cerca de 14% do que a
   Loja e os heróis custam (~25.400): acelera, não substitui. Nada obrigatório para vencer.
6. **Barato de checar.** Tudo sai de contadores que já existem ou de três novos baratos; a avaliação acontece no fim
   da partida (e, para o aviso na partida, uma vez por segundo). Nada por frame além de um incremento por abate.
7. **Contra a fadiga de lista:** sem conquista de "jogue 100 horas"; a mais longa (50.000 abates) dá umas 12 a 15
   vitórias, e todas aparecem com o progresso, nenhuma secreta.

## 2. Bestiário

### O que mostra

- Todos os 16 inimigos de `ENEMIES`, agrupados por fase e depois elites e chefes, na ordem:
  Valmor (Ossada, Morcego, Esqueleto, Rato de Cova), Cripta (Rato Gigante, Aranha Tumular, Gosma Verde, Espectro),
  Estrada (Encapuzado, Corvo, Lobo da Geada), Elites (Goblin Lanceiro, Golem de Pedra), Chefes (Cavaleiro Negro,
  O Sineiro, Lobo Velho). A ordem vem dos `waves` de cada fase (`basic`, `fast`, `tank`, `extra`), então um
  inimigo novo entra no lugar certo sem lista à mão.
- **Não visto:** o sprite em silhueta (mesmo `setTint(UI.border)` do Livro de Elos) e "???". Nada mais.
- **Visto** ("visto" = surgiu numa partida, mesmo sem ser abatido):
  - nome; **Abatidos: N** (no total); **Visto em:** nome da primeira fase onde apareceu;
  - características em termos de jogador (calculadas dos dados, função pura testada):
    - **Vida:** o número base de `hp` e a nota "cresce com o tempo" (o `hpMult` das ondas);
    - **Velocidade** contra a do herói (150): até 50% = "Lento", até 75% = "Médio", até 95% = "Rápido",
      acima = "Mais rápido que você";
    - **Dano ao tocar:** `damage`;
    - **Empurrão:** `knockbackResist` 0.9 ou mais = "Não recua", 0.5 ou mais = "Recua pouco", senão "Recua fácil";
    - **Jeito:** `move` charge = "Investe em linha", zigzag = "Ziguezague", phase = "Atravessa e some";
      elite = "Deixa um baú"; chefe = o nome da habilidade (Corte Brutal, Badalada, Mordida Funda);
  - **frase do mundo** (só onde o original tem; tabela abaixo).

### Frases (somente do original; onde não há, fica sem frase)

| Inimigo                         | Frase no jogo (pt-BR)                                                             | Fonte                                                 |
| ------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Ossada (`bones`)                | "Uma mão de osso rompe a terra. Uma Ossada se levanta!"                           | original `src/opening.js` (luta `ossada`)             |
| Morcego (`bat`)                 | "Dois morcegos descem do muro!"                                                   | original `src/opening.js` (luta `morcegos`)           |
| Esqueleto (`skeleton`)          | (sem frase)                                                                       | só existe na tabela de dados                          |
| Rato de Cova (`graveRat`)       | "Um rato do tamanho de um gato sai de uma cova!"                                  | original `src/opening.js` (luta `rato`, `ratoCova`)   |
| Rato Gigante (`rat`)            | "Na minha época, a gente enfrentava rato gigante com uma vassoura!" (Seu Joaquim) | `historias/capitulo1-aldo-sozinho.md` (falas da vila) |
| Aranha Tumular (`spider`)       | (sem frase)                                                                       | só dados (habilidade Ferroada)                        |
| Gosma Verde (`slime`)           | (sem frase)                                                                       | só dados                                              |
| Espectro (`ghost`)              | (sem frase)                                                                       | só dados (habilidade Toque Gélido)                    |
| Encapuzado (`hooded`)           | "Capa cinza, lâminas curvas, um olho cortado ao meio."                            | `historias/prologo.md` (tabela de personagens)        |
| Corvo (`crow`)                  | "Corvos mergulham do escuro!"                                                     | original `src/chapter1.js` (encontro `crow`)          |
| Lobo da Geada (`frostWolf`)     | "E não andem depois que escurece. Os lobos estão com fome este ano."              | original `src/chapter1.js` (viajante da estrada)      |
| Goblin Lanceiro (`goblin`)      | "Os goblins fizeram um acordo com os Nekaren: a Aliança Negra."                   | `canone.md`, Criaturas e povos [C]                    |
| Golem de Pedra (`golem`)        | (sem frase)                                                                       | só dados                                              |
| Cavaleiro Negro (`blackKnight`) | (sem frase)                                                                       | só dados (habilidade Corte Brutal)                    |
| O Sineiro (`bellRinger`)        | "O último toque foi há cinquenta anos. Ninguém mais desce."                       | original `src/data.js` (`sineiro.say.intro`)          |
| Lobo Velho (`oldWolf`)          | "A matilha sai da floresta! O Lobo Velho vem na frente."                          | original `src/chapter1.js` (batalha da matilha)       |

As frases ficam em `pt-BR.ts` (`bestiary.flavor`, `Partial<Record<EnemyId, string>>`), com a fonte num comentário.
**Pergunta aberta para o Daniel:** seis inimigos não têm texto no original (Esqueleto, Aranha Tumular, Gosma Verde,
Espectro, Golem de Pedra, Cavaleiro Negro). Ele quer escrever uma linha para cada um? Até lá, ficam sem frase.

## 3. Conquistas (35)

Regras gerais: nenhuma secreta; todas mostram o progresso; o ouro cai no cofre na hora em que a conquista é
registrada (fim da partida). Nomes em pt-BR, sem travessão. "Partida" = uma corrida; "no total" = somando todas.
Os limites marcados com **(calibrado)** saíram do sim no passo CC-04 (alvo: cerca de metade das vitórias do bot
veterano consegue; números em `docs/balance-baseline.md`).

### Abates

| id              | Nome                   | Descrição (pt-BR)                                             | Condição exata                        | Recompensa                             |
| --------------- | ---------------------- | ------------------------------------------------------------- | ------------------------------------- | -------------------------------------- |
| `killsRun1k`    | Mil Covas Fechadas     | Derrote 1.000 inimigos numa partida.                          | `runKills >= 1000`                    | 50 ouro                                |
| `killsRun3k`    | Noite Sem Fim          | Derrote 3.000 inimigos numa partida.                          | `runKills >= 3000`                    | 100 ouro                               |
| `killsTotal10k` | Coveiro de Valmor      | Derrote 10.000 inimigos no total.                             | `totals.kills >= 10000`               | 100 ouro                               |
| `killsTotal50k` | A Vila Dorme Tranquila | Derrote 50.000 inimigos no total.                             | `totals.kills >= 50000`               | 250 ouro + título "Guardião de Valmor" |
| `rats500`       | Na Minha Época         | Derrote 500 ratos. O Seu Joaquim fazia isso com uma vassoura. | `kills(rat) + kills(graveRat) >= 500` | 50 ouro                                |
| `elites25`      | Pedra e Lança          | Derrote 25 elites.                                            | `kills(goblin) + kills(golem) >= 25`  | 100 ouro                               |

### Dano

| id            | Nome              | Descrição                               | Condição exata                    | Recompensa |
| ------------- | ----------------- | --------------------------------------- | --------------------------------- | ---------- |
| `hit80`       | Golpe Forte       | Acerte um golpe de arma de 80 ou mais.  | `bestHit >= 80`                   | 50 ouro    |
| `hit120`      | Na Junta          | Acerte um golpe de arma de 100 ou mais. | `bestHit >= 100` (calibrado)      | 100 ouro   |
| `damageRun`   | Forja Acesa       | Cause 260.000 de dano numa partida.     | `runDamage >= 260000` (calibrado) | 100 ouro   |
| `damageTotal` | Bigorna do Gaspar | Cause 1.000.000 de dano no total.       | `totals.damage >= 1000000`        | 150 ouro   |

Conta do golpe: o maior dano de arma por acerto é 75 (Quebra-Junta) e 70 (Fúria da Forja); com Força 5 (+50%) e a
Loja (+25%), 75 x 1,75 = 131. Então 80 pede uma arma pesada com um pouco de Força, e 120 pede a build de Força
inteira. Bombas não contam (só golpe de arma, para o recorde falar da build).

### Sobrevivência

| id          | Nome               | Descrição                                | Condição exata              | Recompensa |
| ----------- | ------------------ | ---------------------------------------- | --------------------------- | ---------- |
| `survive5`  | Meia-Noite         | Sobreviva 5 minutos.                     | `bestTime >= 300`           | 25 ouro    |
| `survive10` | Até o Fim da Noite | Sobreviva até o chefe chegar.            | `bestTime >= 600`           | 50 ouro    |
| `untouched` | Nem um Arranhão    | Passe 1:30 sem levar dano.               | `untouched >= 90`           | 75 ouro    |
| `closeWin`  | Por um Fio         | Vença uma fase com 10% da vida ou menos. | vitória com `hpLeft <= 0.1` | 75 ouro    |
| `level50`   | Lenda da Taverna   | Chegue ao nível 50 numa partida.         | `bestLevel >= 50`           | 75 ouro    |

### Armas e Elos

| id          | Nome             | Descrição                                                      | Condição exata                                                                   | Recompensa                                |
| ----------- | ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------- |
| `eloFirst`  | Primeiro Elo     | Forme um Elo.                                                  | `save.elos.length >= 1`                                                          | 50 ouro (opcional: +1 Trocar por partida) |
| `elosRun3`  | Corrente Inteira | Forme 3 Elos numa partida.                                     | `runElos >= 3`                                                                   | 100 ouro                                  |
| `maxed4`    | Mãos de Ferreiro | Termine uma partida com 4 armas no nível máximo (Elos contam). | `runMaxed >= 4`                                                                  | 75 ouro                                   |
| `allShared` | Conhece o Ofício | Use cada arma compartilhada pelo menos uma vez.                | todas as armas base sem dono em `SIGNATURE_OWNER` aparecem em algum `weaponRuns` | 100 ouro                                  |
| `soloWin`   | Fiel à Primeira  | Vença uma fase sem pegar nenhuma arma além da inicial.         | vitória com `weapons` = só a arma do herói (ou o Elo dela)                       | 150 ouro + título "Fiel à Primeira"       |

### Heróis

As quatro primeiras usam a fala de vitória de cada herói no original (`src/data.js`, `win`).

| id              | Nome                   | Descrição                                                                   | Condição exata                                  | Recompensa                        |
| --------------- | ---------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------- |
| `winAldo`       | Próximo.               | Vença uma fase com Aldo.                                                    | `records.aldo` com alguma vitória               | 100 ouro                          |
| `winLyra`       | Mais uma para o livro. | Vença uma fase com Lyra.                                                    | idem `lyra`                                     | 100 ouro                          |
| `winTeo`        | Que descansem em paz.  | Vença uma fase com Teo.                                                     | idem `teo`                                      | 100 ouro                          |
| `winAndilla`    | Fácil. Quase.          | Vença uma fase com Andilla.                                                 | idem `andilla`                                  | 100 ouro                          |
| `winAll`        | Os Quatro              | Vença com os quatro heróis. Os paladinos que fecharam a cripta eram quatro. | 4 heróis com alguma vitória                     | 200 ouro + título "Um dos Quatro" |
| `heroAllStages` | De Ponta a Ponta       | Vença as três fases com o mesmo herói.                                      | algum herói com vitória em todas as `STAGE_IDS` | 150 ouro                          |

(A frase "Os paladinos que fecharam a cripta eram quatro." é uma nota do diário do original, `src/data.js`.)

### Fases

| id           | Nome                   | Descrição                                          | Condição exata                                                                                     | Recompensa |
| ------------ | ---------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------- |
| `bossKnight` | O Cavaleiro Caiu       | Derrote o Cavaleiro Negro.                         | `kills(blackKnight) >= 1`                                                                          | 50 ouro    |
| `bossRinger` | Ninguém Mais Desce     | Derrote O Sineiro.                                 | `kills(bellRinger) >= 1`                                                                           | 75 ouro    |
| `bossWolf`   | O Velho da Matilha     | Derrote o Lobo Velho.                              | `kills(oldWolf) >= 1`                                                                              | 75 ouro    |
| `bossFast`   | Antes do Segundo Golpe | Derrote um chefe em até 40 s depois que ele chega. | alguma vitória com `time - matchDuration <= 40` (calibrado: mediana 49 s no sim, 34 s no veterano) | 100 ouro   |
| `allStages`  | Caminho de Erukh       | Vença as três fases.                               | `save.cleared.length === STAGE_IDS.length`                                                         | 150 ouro   |

### Coleção

| id        | Nome               | Descrição                                    | Condição exata                               | Recompensa                                                             |
| --------- | ------------------ | -------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `seen8`   | Diário de Caça     | Encontre 8 tipos de inimigo.                 | `keys(bestiary).length >= 8`                 | 25 ouro                                                                |
| `seenAll` | Bestiário Completo | Encontre todos os inimigos, elites e chefes. | `keys(bestiary).length === ENEMY_IDS.length` | 150 ouro + título "Caçador das Covas" (opcional: +1 Pular por partida) |
| `elosAll` | Livro Completo     | Descubra todos os Elos.                      | `save.elos.length === EVOLVED_IDS.length`    | 300 ouro + título "Mestre dos Elos" (opcional: +1 Banir por partida)   |
| `shop10`  | Freguês do Gaspar  | Compre 10 níveis na Loja.                    | soma de `save.shop` >= 10                    | 50 ouro                                                                |

Totais: 35 conquistas, 3.550 de ouro, 5 títulos. **Recompensas que mexem no jogo (opcionais, desligadas por
padrão):** `eloFirst` +1 Trocar, `seenAll` +1 Pular, `elosAll` +1 Banir. São cargas, como as da Loja: dão mais
controle da build (pilar 3) sem dar dano. Ligar só se o Daniel quiser; custam uma linha em `shopBonuses`.

### Títulos

Um título conquistado pode ser escolhido na aba Conquistas (tocar na conquista). Aparece embaixo do nome do herói no
cabeçalho da tela final ("Aldo · Mestre dos Elos") e no topo da aba Heróis. Sem título escolhido, nada aparece.

## 4. Registros por herói

Por herói (`records[heroId]`):

| Registro                                                 | Campo                                                        | Como se mede                                                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partidas                                                 | `runs`                                                       | +1 por partida registrada (morte, vitória ou sair)                                                                                                         |
| Vitórias por fase                                        | `wins[stageId]`                                              | +1 por vitória na fase; na tela, três marcas (acesa = venceu)                                                                                              |
| Melhor tempo                                             | `bestTime`                                                   | maior `world.time` (vitórias passam de 10:00)                                                                                                              |
| Vitória mais rápida                                      | `fastestWin`                                                 | menor `world.time` entre as vitórias (0 = nenhuma)                                                                                                         |
| Nível máximo                                             | `bestLevel`                                                  | maior `world.level`                                                                                                                                        |
| Mais abates numa partida                                 | `bestKills`                                                  | maior `world.kills`                                                                                                                                        |
| Maior golpe                                              | `bestHit`                                                    | maior acerto de arma (novo contador)                                                                                                                       |
| Mais dano numa partida                                   | `bestDamage`                                                 | maior soma de `OwnedWeapon.damage`                                                                                                                         |
| Arma favorita                                            | `weaponRuns[weaponId]`                                       | +1 por partida em que a arma (base) esteve na mão; favorita = a de mais partidas, empate pela ordem de `WEAPON_IDS`                                        |
| Elos formados                                            | `elos`                                                       | lista sem repetição dos Elos que o herói já formou (mostra "n de m possíveis": a assinatura dele + os 8 compartilhados)                                    |
| Desafios (não aparecem como linha, alimentam conquistas) | `untouched`, `closestWin`, `maxElos`, `maxMaxed`, `soloWins` | maior tempo sem dano; menor fração de vida numa vitória (1 = nenhuma); mais Elos numa partida; mais armas no máximo ao fim; vitórias só com a arma inicial |

Totais globais (`totals`): partidas, vitórias, abates, dano, ouro ganho, tempo jogado (segundos). Mostrados no pé da
aba Heróis.

## 5. Contadores: o que medir e onde

Princípio: quase tudo já existe no `World` ao fim da partida. Só três contadores são novos, e nenhum aloca.

| Dado                         | Onde é medido                                                                                                                                                                                      | Custo                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| tempo, nível, abates, ouro   | já existem (`world.time`, `level`, `kills`, `gold`)                                                                                                                                                | zero                                          |
| dano por arma                | já existe (`OwnedWeapon.damage`, mantido no Elo)                                                                                                                                                   | zero; somado no fim                           |
| armas, Elos, armas no máximo | lidos de `world.weapons` no fim (armas nunca saem da mão; o Elo guarda a base em `EVOLUTIONS[id].from`)                                                                                            | zero                                          |
| vida no fim                  | `player.hp / player.stats.maxHp` no fim                                                                                                                                                            | zero                                          |
| **abates por tipo**          | novo `world.killsBy: Partial<Record<EnemyId, number>>`, criado uma vez; `onEnemyKilled` faz `killsBy[e.type] = (killsBy[e.type] ?? 0) + 1`                                                         | um incremento por abate (já há `kills++` ali) |
| **tipos vistos**             | novo `world.seen: Partial<Record<EnemyId, true>>`; `spawnEnemy` marca `seen[type] = true`                                                                                                          | uma escrita por surgimento                    |
| **maior golpe**              | novo `world.bestHit`; em `damageEnemy`, `if (source && amount > world.bestHit) world.bestHit = amount`                                                                                             | uma comparação por acerto                     |
| **primeiro dano levado**     | novo `player.hitsTaken` (+1 em `hurtPlayer` quando acerta) e `world.firstHitAt` (`-1` até o primeiro); no fim de `step`: `if (this.firstHitAt < 0 && p.hitsTaken > 0) this.firstHitAt = this.time` | uma comparação por step                       |

No fim da partida, uma função pura em `core/records.ts` monta o resumo:

```ts
/** Everything the save needs from one finished (or live) run. Built from World, no per-frame cost. */
export interface RunSummary {
  hero: CharacterId;
  stage: StageId;
  won: boolean;
  time: number;
  level: number;
  kills: number;
  gold: number;
  /** Sum of every weapon's damage. */
  damage: number;
  /** Biggest single weapon hit. */
  bestHit: number;
  /** Seconds before the first hit taken (the run time if never hit). */
  untouched: number;
  /** Hero HP fraction at the end. */
  hpLeft: number;
  /** Base weapons owned (an Elo counts as its base), for favourite weapon and "Conhece o Ofício". */
  weapons: WeaponId[];
  elos: WeaponId[];
  /** Weapons at max level at the end (an Elo counts). */
  maxed: number;
  killsBy: Partial<Record<EnemyId, number>>;
  seen: EnemyId[];
}

export function summarizeRun(world: World, out?: RunSummary): RunSummary;
```

O parâmetro `out` deixa o aviso na partida (seção 7) reaproveitar um único objeto, checado uma vez por segundo.

## 6. Save: versão 2 e migração

`SAVE_VERSION` passa de 1 para 2. Campos novos em `MetaSave` (o nome `heroes` já é a lista de heróis comprados,
então os registros se chamam `records`):

```ts
export interface HeroRecord {
  runs: number;
  wins: Partial<Record<StageId, number>>;
  bestTime: number;
  fastestWin: number; // 0 = never won
  bestLevel: number;
  bestKills: number;
  bestHit: number;
  bestDamage: number;
  weaponRuns: Partial<Record<WeaponId, number>>;
  elos: WeaponId[];
  untouched: number;
  closestWin: number; // 1 = no win yet
  maxElos: number;
  maxMaxed: number;
  soloWins: number;
}

export interface BestiaryEntry {
  kills: number;
  /** The stage where it was first seen. */
  stage: StageId;
}

// New in MetaSave (version 2):
records: Partial<Record<CharacterId, HeroRecord>>;
bestiary: Partial<Record<EnemyId, BestiaryEntry>>;
totals: { runs: number; wins: number; kills: number; damage: number; gold: number; time: number };
achievements: AchievementId[];
/** Unlocked but not yet seen in the Coleção (the menu button shows a dot). */
fresh: AchievementId[];
title?: AchievementId;
```

Regras de `sanitizeSave` (a mesma postura de hoje: aceita qualquer coisa, devolve um save válido):

- Todo número passa por `finite >= 0` (e `Math.floor` nos contadores); `closestWin` entre 0 e 1; ids desconhecidos
  (herói, fase, inimigo, arma, conquista) são descartados, como já acontece com `known()`.
- **Migração v0/v1 para v2 (nunca perde nada):** ouro, Loja, heróis, fases vencidas e Elos ficam como estão. Os
  campos novos começam vazios, com duas sementes que o save antigo permite afirmar com certeza:
  - para cada fase em `cleared`: o elenco da fase (as quatro funções de `waves`, as elites e o chefe) entra no
    Bestiário como visto naquela fase, com 0 abates, e o chefe com 1 abate (ele foi derrotado);
  - `totals.wins` = `cleared.length` (pelo menos isso aconteceu).
  - Não dá para saber com qual herói as fases foram vencidas, então os `records` começam vazios.
- Depois de sanear, `checkAchievements` roda uma vez (no carregamento do menu): quem já tinha Elos e fases ganha as
  conquistas e o ouro correspondentes, e elas aparecem como novas na Coleção.
- `serializeSave` com save de versão futura: `records`, `bestiary` e `totals` do futuro são mesclados campo a campo
  pelo maior valor (abates e recordes só crescem; `fastestWin` e `closestWin` pelo menor diferente de zero);
  `achievements` por união. Mesma ideia da mescla de `cleared` e `elos` de hoje.
- Tamanho: 4 heróis x ~20 campos + 16 inimigos + 35 ids, menos de 4 kB em JSON.

Registro da partida: `recordRun(save, summary)` (puro, em `core/meta.ts`) atualiza ouro, `cleared`, Elos,
`records[hero]`, `bestiary` (soma `killsBy`; um tipo visto pela primeira vez guarda `summary.stage`), `totals`, e então
chama `checkAchievements(save, null)`, que devolve as conquistas novas e já somou o ouro delas. O `render/save.ts`
só faz `loadSave`, chama isso e `writeSave`.

## 7. Telas

### Coleção (menu)

- O botão "Livro de Elos" do menu vira **"Coleção"** (mesmo lugar e tamanho). Um ponto dourado no canto do botão
  quando `fresh` não está vazio (ou há inimigo novo no Bestiário desde a última visita).
- `CollectionScene` substitui `EloBookScene`: título, linha de abas, conteúdo, botão Voltar (o mesmo `backButton`).
  Trocar de aba = `scene.restart({ tab })`, como o `restartOnResize` já faz; setas esquerda/direita trocam de aba,
  Esc volta. Abas: **Bestiário · Elos · Conquistas · Heróis**; abre na última aba usada (no `registry`).
- **Elos:** o conteúdo atual do `EloBookScene` movido para uma função de desenho, sem mudar nada.
- **Bestiário:** grade de cartões pequenos (ícone 32 px, nome, "x1.234"); contagem "11 de 16 encontrados". Focar ou
  tocar um cartão abre a ficha numa faixa embaixo (nome, Visto em, Abatidos, as características da seção 2 e a frase).
  No celular deitado, a ficha vai para a direita da grade. Silhueta para os não vistos, como o Elo desconhecido.
- **Conquistas:** uma página por grupo (7 chips de grupo no topo, cada um com "3/6"); cada linha tem ícone (troféu
  aceso ou cadeado), nome, descrição, recompensa ("+50 ouro") e, se trancada, barra de progresso com "8.240 /
  10.000". Contagem geral "12 de 35". Abrir a aba esvazia `fresh`; as novas piscam uma vez. Tocar numa conquista
  com título escolhe o título.
- **Heróis:** quatro cartões (2 x 2 em pé, 4 lado a lado deitado): retrato, as três marcas de fase (vazias até
  vencer), Partidas, Melhor tempo, Vitória mais rápida, Nível máximo, Mais abates, Maior golpe, Arma favorita (ícone),
  Elos "n de m". Herói não comprado: silhueta com o preço (convite para a Loja). No pé: os totais globais.

### Aviso na partida

- Uma vez por segundo, o `GameScene` chama `summarizeRun(world, this.live)` e `liveAchievements(save, live, shown)`,
  que testa só as conquistas ainda trancadas e devolve as que a partida acabou de cumprir (a lista é alocada só quando
  algo acontece, ou seja, quase nunca).
- O HUD mostra um aviso pequeno no alto, embaixo do relógio e da barra do chefe: ícone de troféu, "Conquista!" e o
  nome, 2,5 s, um por vez (fila). Não pausa, não cobre o centro da tela (pilar 5). Som curto novo em
  `render/sounds.ts` (`achievement`).
- O registro de verdade continua no fim da partida (`recordRun`): o aviso é só o anúncio.

### Tela final

Em `EndScene.notes()`, depois dos Elos novos:

- até 3 linhas "Conquista: Mil Covas Fechadas (+50 ouro)" e, se houver mais, "+2 conquistas";
- a **conquista mais perto**: a trancada com maior fração de progresso entre 50% e 99%, "Perto: Coveiro de Valmor
  (8.240 de 10.000)". Só aparece se não houver conquista nova nesta tela, para não lotar.

## 8. Passos de implementação (cada um pequeno, testado e com commit)

1. **CC-01 · Contadores da partida** (core): `killsBy`, `seen`, `bestHit`, `player.hitsTaken` + `firstHitAt`;
   `core/records.ts` com `summarizeRun`. Testes em `tests/core/records.test.ts` (abate conta por tipo; bomba não
   conta golpe; Elo conta a base). F4 com 700 inimigos: FPS igual. Commit `feat: run counters and run summary`.
2. **CC-02 · Save v2** (core/meta): tipos, `newSave`, `sanitizeSave` com migração, `serializeSave` com mescla,
   `recordRun` puro. Testes em `tests/core/meta.test.ts`: save v1 real mantém tudo e semeia o Bestiário pelas fases
   vencidas; v0; lixo; versão futura preserva campos. `render/save.ts` passa a usar o `recordRun` puro.
   Commit `feat: save v2 with hero records, bestiary and totals`.
3. **CC-03 · Conquistas** (data + core): `src/data/achievements.ts` (declarativo: `group`, `metric`, `goal`,
   parâmetros `hero`/`enemies`/`at`, `gold`, `title?`, `charge?`), `core/achievements.ts` (`METRICS`, `progress`,
   `checkAchievements`, `liveAchievements`, `closestAchievement`), nomes e descrições em `pt-BR.ts`. Testes: ids
   únicos e com texto; cada conquista destrancável com um save sintético; ouro somado uma vez só; retroativas num save
   migrado. Commit `feat: achievements`.
4. **CC-04 · Fim da partida e calibração** (scene + bal): `GameScene.bank()` usa `summarizeRun` + `recordRun`;
   `EndScene` mostra conquistas novas e a mais perto. O bot do sim passa a imprimir `damage` e `bestHit`; ajustar
   `damageRun`, `bossFast` e `hit120` para cerca de metade das vitórias do bot. Resultado em
   `docs/balance-baseline.md`. Commit `feat: achievements on the end screen` + `chore: calibrate achievement goals`.
5. **CC-05 · Coleção com abas** (scene): `CollectionScene`, aba Elos com o desenho atual do Livro, botão "Coleção"
   no menu com o ponto de novidade; `EloBookScene` sai. Commit `feat: Coleção screen with tabs`.
6. **CC-06 · Aba Bestiário**: `enemyTraits(def)` puro em `core/format.ts` (com teste das faixas), frases em
   `pt-BR.ts`, grade e ficha. Commit `feat: bestiary tab`.
7. **CC-07 · Aba Conquistas**: páginas por grupo, progresso, `fresh`, escolha de título. Commit
   `feat: achievements tab`.
8. **CC-08 · Aba Heróis**: cartões, marcas de fase, arma favorita, totais; título na tela final. Commit
   `feat: hero records tab`.
9. **CC-09 · Aviso na partida**: checagem por segundo, aviso no HUD, som. Commit `feat: in-run achievement toast`.
10. **CC-10 · Revisão visual e documentação**: visual-director confere as três abas e o aviso em celular em pé e
    deitado; `CLAUDE.md` (arquitetura: `core/records.ts`, `core/achievements.ts`, `data/achievements.ts`,
    `CollectionScene`); backlog marcado. Commit `docs: collection and achievements`.

Cada passo termina com `npm test`, `npm run lint`, `npm run build` verdes e o jogo rodando, como sempre.

## 9. Riscos

- **Desempenho:** um incremento por abate, uma escrita por surgimento, uma comparação por acerto e uma por step. A
  checagem ao vivo roda uma vez por segundo reaproveitando o mesmo `RunSummary`. Medir com F4 no CC-01.
- **Save:** campo quebrado não pode derrubar o save inteiro; cada campo é saneado sozinho. Teste com o save v1 real
  do navegador do Daniel (copiar do localStorage) antes do commit do CC-02.
- **Balanceamento:** 3.550 de ouro é cerca de 14% da economia da Loja e dos heróis. Conquistas fáceis dão ouro cedo
  (primeiras partidas), o que encurta a compra do segundo herói em mais ou menos uma partida; aceitável e até bom.
  As cargas opcionais ficam desligadas até o Daniel decidir.
- **Legibilidade:** o aviso fica no alto, pequeno, 2,5 s, um por vez. Nunca no centro, nunca durante o level-up
  (espera fechar).
- **Fadiga de lista:** nenhuma conquista pede mais que algumas noites de jogo; nada secreto; nada que só se faz
  jogando mal (exceto "Por um Fio", que é sobre virar uma partida quase perdida).

## 10. Como saber se funcionou

- Primeira conquista na primeira partida (quase todo jogador sobrevive 5:00 ou forma um Elo).
- Na tela final, sempre uma meta de conquista visível (nova ou "perto") em pelo menos 80% das partidas (testar com o
  sim gerando saves sintéticos).
- Variedade de heróis: depois de "Os Quatro" estar visível, as partidas se espalham mais entre os heróis
  (registro `runs` por herói no save do Daniel).
- O Daniel abre a Coleção sem precisar de motivo e sabe dizer qual a próxima conquista que quer.

## Perguntas abertas para o Daniel

1. Seis inimigos sem frase no original (Esqueleto, Aranha Tumular, Gosma Verde, Espectro, Golem de Pedra,
   Cavaleiro Negro): quer escrever uma linha para cada?
2. As três recompensas opcionais (+1 Trocar, +1 Pular, +1 Banir por partida): ligar ou deixar só ouro?
3. Os nomes que citam o original (Seu Joaquim, as falas de vitória dos heróis, "Os paladinos que fecharam a cripta
   eram quatro", "Ninguém mais desce"): tudo bem usar assim?

## Fontes da pesquisa

- [Vampire Survivors: conquistas (Epic Games)](https://store.epicgames.com/achievements/vampire-survivors-f699a1?lang=en-US)
- [Vampire Survivors: Bestiário e Ars Gouda](https://mediumpurpletron.pages.dev/posts/vampire-survivors-how-to-find-the-ars-gouda-and-unlock-the-bestiary)
- [Vampire Survivors: todas as conquistas (Prima Games)](https://primagames.com/tips/all-achievements-in-vampire-survivors-listed)
- [Brotato: Perigos por personagem (Steam)](https://steamcommunity.com/app/1942280/discussions/0/3389546207212026349)
- [Brotato: walkthrough (TrueAchievements)](https://www.trueachievements.com/game/Brotato/walkthrough)
- [Halls of Torment: como liberar personagens](https://commonsensegamer.com/halls-of-torment-how-to-unlock-all-characters/)
- [Halls of Torment: atualização com Class Marks](https://fullcleared.com/news/halls-of-torment-update-adds-two-new-characters-and-more/)
- [HoloCure: lista de conquistas (GameSkinny)](https://www.gameskinny.com/tips/holocure-save-the-fans-full-achievement-list/)
- [HoloCure: fan letters (Siliconera)](https://www.siliconera.com/what-are-fan-letters-in-holocure-and-how-to-get-them/)
- [Deep Rock Galactic: Survivor, Maestria (wiki)](https://deeprockgalactic.wiki.gg/wiki/Survivor:Mastery)
- [Deep Rock Galactic: Survivor, atualização Masteries](https://godisageek.com/2024/06/deep-rock-galactic-survivor-adds-more-content-in-masteries-update/)
- [Death Must Die: conquistas (Prima Games)](https://primagames.com/tips/all-death-must-die-achievements-and-how-to-unlock-them)
- [20 Minutes Till Dawn: guia de conquistas](https://re-actor.net/20-minutes-till-dawn-achievement-guide-with-tips/)
- [Soulstone Survivors: conquistas no jogo e na Steam](https://www.gamepressure.com/newsroom/soulstone-survivors-steam-and-in-game-achievements-list-explanati/z44c76)
- [Conquistas e diversão contra engajamento (Wayline)](https://www.wayline.io/blog/achievement-lie-fun-vs-engagement)
