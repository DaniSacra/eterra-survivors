# Revisão 2026-11-11 (2) · Direção (game-director)

Commit revisado `18f6ee3` (o `HEAD` já está em `2a997ce`, que só muda a respiração do anel da Aura de Yah). Li o
CLAUDE.md, os relatórios 00 a 06 desta pasta, o `docs/design/backlog.md` inteiro nos pontos abertos, a direção anterior
(`docs/reviews/2026-11-11/07-direcao.md`), os dados (`characters`, `evolutions`, `shop`, `rewards`, `stages`,
`render/ui.ts` `ELEMENT_COLOR`, `render/musics.ts`) e o histórico de commits desde a última calibragem da Cripta
(`8a9a23d`). Nada de código foi tocado. Nenhuma proposta desta rodada traz lore nova.

Os itens aceitos estão no `docs/design/backlog.md`, seção **"Revisão 2026-11-11 (2)"**, todos `· proposto` (esperam o
Daniel). Prefixo novo **P** (de pixel, o tema desta rodada): **PB** bug, **PT** técnico, **PE** equilíbrio, **PF**
efeitos, **PS** som e música, **PU** interface, **PA** arte. Itens antigos que esta rodada reabre ou amplia mantêm o ID
e ganharam uma nota "Revisão 2026-11-11 (2)" no próprio lugar: **B-04**, **NB-08**, **NE-02**, **NE-06**, **NA-05**,
**CT-03**, **CF-08**, **CU-06**, **CU-07**, **CA-01**, **CA-02**, **DD-15** e **MU-01**.

## As 3 recomendações que mais importam

1. **Medir antes de somar conteúdo: há duas regressões silenciosas e cinco cartas fracas no jogo real.**
   A Cripta com meia Loja estava em 84% no bot quando o Daniel a deixou "tão leve quanto Valmor" (`8a9a23d`); hoje está
   em **63%** (01 #6), com o Teo em **25%**. O relatório de balanço leu isso como "no alvo (~60%)", mas o alvo do bot no
   CLAUDE.md é **80 a 90%** (o 60% é o que o Daniel quer para uma pessoa, e o bot corre muito à frente das pessoas
   aqui). Entre a calibragem e hoje entraram na Cripta o Assombro (DD-07, forma escura mais rápida e que morde mais) e
   os obstáculos de cenário (DD-11), e ninguém mediu de novo. Ao mesmo tempo, cinco armas rendem pouco no jogo real e
   bem no lab: Aura de Yah 15 de DPS real (lab 220), Espadas de Elun 66, Maça 76, Tempestade 1,4x o Raio e Espada de
   Fogo 1,7x o Fogo (01 #1, #2, #3, #5). É um ponto cego só: o lab mede bonecos parados e esparsos. Ordem: **PB-02**
   (o ouro está arredondado errado, então a economia precisa ser medida com o número certo), **PE-01** (Cripta e Valmor
   de volta à meta, com as metas do sim iguais às do CLAUDE.md), **NE-06** (lab com multidão viva e densa) e só então
   **PE-02** (as cinco cartas). Pilar 3: "mil jeitos de montar" só vale se as 13 armas forem cartas vivas.
2. **Terminar a moldura em pixel onde o olho passa o tempo todo: HUD, menus e Valmor.** O mundo virou hi-bit; a
   moldura não. A fonte é a serifada do sistema, suavizada, ao lado de sprites de 2x2 px; painéis e botões são
   retângulos; a barra de vida, a de XP e o joystick são vetor (04 #2, #14, #15). E Valmor, a fase onde todo jogador
   começa e cujo chão é o fundo de quase todos os menus, não parece neve nem vila (04 #1). São o primeiro minuto do
   jogo (pilar 1) e o que diz "isto é Eterra" (pilar 6). Custo baixo: a fonte não gasta geração, o painel e o botão
   são ~10 gerações, o chão de Valmor é uma. Itens **PA-01** e **PA-02**, com o **CA-01** (sombra nos inimigos, zero
   gerações) subindo junto. No efeito, o primeiro é um bug: o pool de 160 sprites de efeito estoura com cinco armas de
   área e corta justo o que tem dano (a espada que gira, o corte), **PB-01**.
3. **Fechar o laço do "só mais uma" no fim da partida e dar escada ao veterano.** A tela final já diz "No cofre: 340
   ouro, faltam 2.160 para Segunda Bainha", mas gastar custa três toques (UI-F); a vitória e a derrota terminam com a
   faixa do chefe ainda tocando (03, observação), sem um momento sonoro de fim. **PU-04** (botão Loja no fim quando dá
   para comprar) e os stings do **MU-01** são pequenos e mexem direto no pilar 4. Depois, o próximo sistema grande
   continua sendo o **ND-01 (Perigo por fase vencida)**: Valmor com a Loja inteira vence **97%** e a Loja acaba em
   ~51 corridas; depois disso o veterano não tem degrau.

---

## Leitura de design: onde o jogo está

**O que funciona.** Base verde (437 testes, lint, typecheck, build). As 13 armas e os 13 Elos estão dentro das bandas
do lab (aimed 87 a 100%, auto 55 a 57%, área 44 a 46%; Elos 3,8x a 4,6x). Todo Elo é forjado no sim; o primeiro sai aos
5,0 / 6,2 / 5,7 min (sem / meia / Loja inteira) e são 0,8 / 2,8 / 4,6 por corrida: a forja é conquista, como o E-08
quis. Nenhuma arma passa de 50% de escolha. A Loja inteira custa 51 corridas médias (meta 40 a 60) e a corrida rende
791 de ouro. O QA não achou erro de console em ~35 sessões, nem tecla dupla, e a música nova funciona de ponta a ponta
(troca de faixa, fusão, pausa, salvar). A Estrada é hoje a fase mais bem composta (04 #17) e serve de régua para as
outras duas.

**Contra os pilares:**

| Pilar                   | Diagnóstico                                                                                                                                                                                                            | O que move mais            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1 Rápido de entrar      | Bom no fluxo (Enter a Enter chega à partida). Atrito no celular pequeno: Loja de 360x640 corta nomes e esconde o 7º item (UI-C); "Nv" pequeno; joystick quase invisível.                                               | PU-02, PA-01, CU-06        |
| 2 Decisão a cada 30 s   | As cartas de melhoria em 360x640 mostram "(- → 165)" em vez do número atual; a carta de arma nova ainda é só sabor. Escolha sem número é chute.                                                                        | PU-03 com CU-05            |
| 3 Profundidade de build | O que pesa é o jogo real: Aura de Yah (15 de DPS real), Espadas de Elun, Maça (e o Teo junto), Tempestade e Espada de Fogo abaixo do que o lab promete. Os heróis ainda só diferem por números (ND-02 segue proposto). | NE-06, PE-02, depois ND-02 |
| 4 Progressão que puxa   | Economia certa, mas o ouro é arredondado moeda a moeda: Ganância nível 1 não rende nada e a Cripta paga 5 por moeda em vez de 4,5. O fim não leva à Loja. Sem escada depois da Loja.                                   | PB-02, PU-04, ND-01        |
| 5 Caos legível          | Peças de efeito com dano somem quando o pool estoura; Quebra-Junta cobre a multidão com três anéis; acertos de área não dizem quem apanhou; inimigos sem sombra flutuam.                                               | PB-01, PF-02, PF-01, CA-01 |
| 6 Eterra de verdade     | O mundo em pixel chegou ao campo; a moldura (fonte, painéis) e Valmor ainda não. Nomes das faixas de música esperam o Daniel.                                                                                          | PA-01, PA-02, MU-01        |

**Elos.** Estão sãos no desenho e na forja. Os dois que ficam abaixo de 2,5x no sim (Tempestade 1,4x, Espada de Fogo
1,7x) dependem de multidão densa (cadeia, chão em brasa) e caem no mesmo ponto cego do lab: entram no NE-02 e no
PE-02 depois do NE-06. Fúria (3,0x), Estrela de Lyra (2,7x) e Procissão (2,5x) estão no limite: observar, sem mudar.
O que falta aos Elos é **ler como transformação**: quatro verbos ainda não têm desenho (ricochete, volta, laço, cadeia;
06 #5) e quatro projéteis de Elo ainda são `Pen` (06 #6). Para um jogo que vende "um Elo é um verbo novo", o verbo
invisível é o defeito, não o número. Isso é PF-03 e PF-04, dentro da rodada de sprites do DD-15.

**Conteúdo novo.** Não proponho arma, Elo nem inimigo novo nesta rodada. Uma 14ª arma agora entraria num grupo em que
cinco cartas já são fracas no jogo real: primeiro as 13 vivas (PE-02), depois conteúdo. O próximo conteúdo grande
continua sendo o Pântano (FT-18), que depende das respostas do Daniel.

**Retenção.** Três camadas, da mais barata para a mais cara: (a) o fim que leva à Loja (PU-04) e soa como fim
(MU-01); (b) o ouro certo (PB-02), para que a Ganância comprada valha o que diz; (c) a escada do veterano (ND-01) e o
traço por herói (ND-02), que são os dois sistemas que o backlog já tem e que continuo recomendando, nessa ordem.

**Arte e música.** A direção pixel acertou onde chegou (inimigos, chão da Estrada e da Cripta, projéteis, raio, aura).
A falta de coerência agora é da moldura e de três buracos de estilo: Valmor sem neve, itens raros em `Pen` (baú, ímã,
bomba; 04 #7) e o herói, o único elemento sem reação ao dano além do flash (04 #5). A música é nova e boa de fluxo; os
pontos abertos são técnicos (pode tocar em dobro, entra de uma vez no primeiro toque, recomeça da introdução ao religar)
e de decisão (faixa A ou B, nomes, stings).

**Documentação.** O CLAUDE.md diz que o chefe de Valmor é o Cavaleiro Negro; os dados dizem Mãe-Aranha
(`stages.ts:71`), e o Cavaleiro Negro não está em nenhuma fase. Não mexo no CLAUDE.md: fica para o Daniel atualizar.

---

## Triagem dos relatórios

### Mesclados (o mesmo problema em mais de um relatório)

| Problema                                                                                    | Relatórios                    | Item                              |
| ------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------- |
| Interruptores da Pausa com rótulo sob a lâmpada                                             | 03 B1, 05 UI-A                | PU-01                             |
| Botão de pausa do HUD aceso e morto na Pausa                                                | 03 B5, 05 UI-B                | PU-01                             |
| Loja `?dev` com texto sobreposto                                                            | 03 B6, 04 #10, 05 (Menus)     | PU-02                             |
| Pool de sprites de efeito estoura; chamas sem orçamento total                               | 06 #1, 06 #7                  | PB-01                             |
| Música: som em dobro, entrada sem fusão, religar volta à introdução                         | 02 M2, 03 B2, 03 B3           | PB-03                             |
| Fim de partida com a faixa do chefe, sem sting                                              | 03 (observação), MU-01        | MU-01 (nota)                      |
| Aura, Espadas, Maça, Tempestade, Espada de Fogo fracas no real                              | 01 #1, #2, #3, #5             | NE-06 (nota), NE-02 (nota), PE-02 |
| Arte em código morta; comentários falsos; helper duplicado                                  | 02 B6, B7, B8, 04 #8          | CT-03 (ampliado)                  |
| HUD e menus fora do pixel: fonte, painéis, barras, XP, joystick                             | 04 #2, #14, #15, CU-06, CU-07 | PA-01 (CU-06 e CU-07 com nota)    |
| Projéteis de Elo em código e no ciano das gemas                                             | 06 #6, NA-05                  | PF-04 (NA-05 com nota)            |
| Leque sem rebote visível                                                                    | 06 #5, CF-08                  | PF-03 (CF-08 com nota)            |
| Texto que encosta: selo "Vencida", introdução do Livro de Elos, painel de build em 1000x680 | 03 B7, B8, 04 #11             | PU-05                             |
| Pequenos furos do spawner e das marcas                                                      | 02 B3, B4, B9                 | PB-07                             |

### Aceitos (um relatório só)

- 01 #6, #7: PE-01 (com a leitura corrigida da meta, ver conflito 1). 01 #3, Espada de Fogo 1,7x: nota no NE-02.
- 02 M1: PB-02. M3: PT-01. M4: PT-02. B1: PB-06. B2: PB-05. B5: B-04 reaberto. B10: PT-03.
- 03 B4: PB-04.
- 04 #1 (e #13, a lanterna): PA-02. #3: CA-01 sobe de prioridade. #4: CA-03 confirmado. #5: PA-03. #6: já é o AR-02 (a).
  #7: PA-04. #9: PA-05. #12: nota no NB-08. #13 (Mãe-Aranha sem luz): nota no CA-02.
- 05 UI-C: PU-02. UI-D e UI-E: PU-03 (com o CU-05). UI-F: PU-04. UI-G: PS-01.
- 06 #2: nota no DD-15 (com a cor decidida, conflito 3). #3: PF-01. #4: PF-02. #5: PF-03. #8: PF-05. #9: PF-06.

### Rejeitados ou adiados (e por quê)

| Proposta                                                   | Relatório       | Decisão                                                                                                                                                                                                                                             |
| ---------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subir raio e dano da Aura de Yah agora (90 → 110, 10 → 14) | 01 #1           | **Adiado para o PE-02.** O próprio relatório diz que estoura a banda sem o NE-06. E o bot foge: uma pessoa cercada fica mais tempo dentro da aura. Antes de mexer, o sim mede "inimigos dentro da aura por segundo", para separar o bot do desenho. |
| Subir o dano da Maça (L1 20 → 24, L7 53 → 60) agora        | 01 #5           | **Adiado para o PE-02.** O lab da Maça está em 91% da melhor `aimed`; +13% passa de 100%. Primeiro o NE-06 (a Maça empurra) e o PB-05 (o atordoamento não pode ir para o fantasma esmaecido), depois o número.                                      |
| Elos limítrofes (Procissão 2,5x, Estrela 2,7x, Fúria 3,0x) | 01 #4           | **Sem ação.** Dentro da meta; o PE-02 mede de novo no fim.                                                                                                                                                                                          |
| `damageRun` em 11%; cartas acabando no nível 56            | 01 #9, #10      | **Sem ação.** 11% inclui derrotas; as cartas de recompensa cobrem o fim.                                                                                                                                                                            |
| `skipGold` (Pular +15) sem Ganância nem `mult.gold`        | 02 M1           | **Decidi: é de propósito.** Pular é uma escolha, não um item do chão; com Ganância e o ouro da fase ele viraria a carta certa na Estrada (x2). Fica fixo, com comentário no `config`.                                                               |
| Enter à frente pula telas                                  | 03 (observação) | **Sem ação.** É o foco inicial certo e a última escolha salva; pilar 1.                                                                                                                                                                             |
| Herói anda ~30 px depois de soltar o joystick              | 03 (observação) | **Adiado para o L-01.** Pode ser o relógio lento do SwiftShader; conferir no celular real antes de abrir item.                                                                                                                                      |
| Fim de jogo como molde; Estrada como régua                 | 04 #16, #17     | **Sem ação** (são referências): o PA-01 parte do painel do Fim, o PA-02 da densidade da Estrada.                                                                                                                                                    |
| Comparação de heróis em barrinhas                          | 05 UI-G (nota)  | **Adiado para o ND-02.** Com o traço por herói a tela Heróis muda de qualquer jeito; fazer as duas juntas.                                                                                                                                          |
| Coluna da Pausa cobre o herói em 1000x680                  | 05 (Pausa)      | **Rejeitado.** Aceitável para o próprio relatório; a Pausa é para a ficha.                                                                                                                                                                          |
| Cristal sobre o inimigo congelado                          | 06 (Estados)    | **Adiado.** Mais peças no pool que acabou de estourar; volta depois do PB-01, se a tinta não bastar.                                                                                                                                                |
| Gema coletada com rastro e cintilar                        | 06 #10          | **Já está** em "Efeitos menores" (Fora de escopo).                                                                                                                                                                                                  |
| Telégrafos de chefe em sprite pixel                        | 06 #11          | **Adiado.** O telégrafo é por função e já lê; o vetor nítido é a forma mais segura de ler área. Volta quando o PA-01 tiver as peças de borda (tracejado e listra em pixel). Os anéis no salto (`drawLeapMark`) entram junto.                        |

### Conflitos entre relatórios e minha decisão

| #   | Conflito                                                                                                                                                                                                                            | Decisão                                                                                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Meta da Cripta com meia Loja.** 01 #6: 63% "está no alvo novo (~60%)" e pede alinhar a tabela do sim a isso. CLAUDE.md: alvo do **bot** 80 a 90% (o ~60% é o de uma pessoa; o bot corre à frente).                                | **Vale o CLAUDE.md.** 63% está **abaixo** do alvo e é regressão: 84% em `8a9a23d`, e depois entraram o Assombro (DD-07) e os obstáculos de cenário (DD-11) na Cripta. A tabela `TARGETS` do sim passa a usar as metas do CLAUDE.md (as três fases), e a Cripta volta à faixa pelo `mult` depois de medir o efeito de cada mudança (PE-01).         |
| 2   | **Aura de Yah.** 01: carta morta no real (15). 06: "lê bem e leve". Commit posterior à revisão (`2a997ce`): o anel "respira, brilhante e quase sumindo".                                                                            | **A respiração fica (pedido do Daniel), com piso:** no ponto mais fraco a borda continua visível no raio exato do dano, porque é a única informação de onde a aura fere (pilar 5). O número só muda no PE-02, depois do NE-06. Pergunta ao Daniel no `?dev`: o anel no mínimo ainda mostra onde a aura acerta?                                     |
| 3   | **Cor da Fúria.** 06 #2: tirar do vermelho `0xff4a4a` para escarlate quente `~0xff6a3a`, longe do coral de perigo `0xff8090`. Mas `ELEMENT_COLOR` exige uma cor por elemento, e o Fogo é `0xff8c2a`: `0xff6a3a` fica entre os dois. | **Carmim profundo com núcleo branco-quente** (ponto de partida `0xd8283c`): separa do coral de perigo pelo valor e pela saturação (o coral é claro e rosado) e não encosta no laranja do Fogo. A forma (giro em pixel com cinzas) faz o resto. O vfx confere em captura nas três fases ao lado de um telégrafo e da Espada de Fogo. Nota no DD-15. |
| 4   | **Interruptores da Pausa.** 03 B1: texto à esquerda e lâmpada à direita, ou fonte menor. 05 UI-A: estado como barra na borda de baixo.                                                                                              | **UI-A.** A barra não depende da largura do texto, cabe em 360 e serve a qualquer rótulo futuro. A fonte só reduz se ainda faltar.                                                                                                                                                                                                                 |
| 5   | **Botão de pausa na Pausa.** 03 B5: esmaecer ou esconder. 05 UI-B: virar "continuar".                                                                                                                                               | **Decidi: vira "continuar" (triângulo)**, com 300 ms de trava depois de abrir. No celular o reflexo é tocar no mesmo lugar para voltar. O Daniel pode vetar.                                                                                                                                                                                       |
| 6   | **Maça e Teo.** 01: subir dano. NE-01 (feito) tinha baixado o dano por mais alcance, e o lab está a 91%.                                                                                                                            | **NE-06 primeiro, PB-05 junto, número depois (PE-02).** Também conta o papel novo da Maça na Cripta (interromper a cova do Coveiro, CB-02): medir o Teo na Cripta antes de mexer.                                                                                                                                                                  |
| 7   | **Joystick.** 04 #14: anel e botão em pixel. CU-06: só subir o alfa.                                                                                                                                                                | **Os dois, num lugar só:** o desenho em pixel entra no PA-01 com o alfa novo do CU-06 (0,14 / 0,4); o CU-06 fica com "Nv", pips e cargas.                                                                                                                                                                                                          |
| 8   | **Chão de Valmor.** 04 #1 pede regerar; o DD-10 (feito, aprovado pelo Daniel) já regerou com "neve, terra e pedra".                                                                                                                 | **Regerar, mostrando dois candidatos ao Daniel antes de trocar**, como foi com a Gosma. O tile atual lê como cascalho, e a promessa do Menu e do cartão ("campos na neve") não chega à partida. Decisão dele.                                                                                                                                      |
| 9   | **Fonte pixel.** 04 #2: "sem custo". Mas o jogo tem descrições longas (cartas, Bestiário, histórias) em 12 px no mínimo (NA-06) e acentos do português.                                                                             | **Fonte pixel com acentos completos em títulos, botões, números e HUD; nos textos longos, captura com as duas e o Daniel escolhe** (decisão 2). Licença livre registrada em `docs/art/credits.md`.                                                                                                                                                 |
| 10  | **Ouro certo contra economia calibrada.** 02 M1 conserta o arredondamento; a Loja (51 corridas) foi medida com o arredondamento errado.                                                                                             | **Consertar e medir.** Na conta: a Cripta cai de 5 para 4,5 por moeda (-10%), Ganância 2 a 4 perde um pouco, Ganância 5 e a Andilla com Loja ganham um pouco. Espero a Loja entre 51 e ~55 corridas, ainda na meta; se sair de 40 a 60, ajustar `config.gold.coin` ou os preços, não a Ganância.                                                   |

---

## Decisões que só o Daniel pode tomar

Seguindo "decido e você revisa": onde marquei "decidi", o item já está escrito assim e basta vetar.

| #   | Decisão                                   | Opções                                                                               | Minha recomendação                                                                                                                                                                                                                                             |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Música** (MU-01)                        | faixa A ou B por fase; nomes; stings de vitória e derrota                            | Escolher A/B ouvindo no `?dev` (o chefe vem aos 5:00). Nomes provisórios iguais aos das fases ("Arredores de Valmor", "Cripta da Igreja Velha", "Estrada do Sul"), sem inventar lore; stings curtos (3 a 5 s) no mesmo timbre, e a faixa do chefe para no fim. |
| 2   | **Fonte pixel nos textos longos** (PA-01) | pixel em tudo; pixel em títulos, HUD e números e a atual nos textos longos           | Ver as duas capturas em 360x640. Recomendo pixel em tudo se a descrição da carta continuar legível em 12 px; senão, a mista.                                                                                                                                   |
| 3   | **Chão de Valmor** (PA-02)                | manter o atual; regerar com neve                                                     | Regerar, com dois candidatos para ele escolher.                                                                                                                                                                                                                |
| 4   | **Anel da Aura de Yah**                   | como está; piso de visibilidade na borda                                             | Piso: a borda nunca some no raio do dano (conflito 2).                                                                                                                                                                                                         |
| 5   | **Herói que reage** (PA-03)               | 4 a 8 gerações para dano e queda                                                     | Aprovar: é o único elemento do jogo sem reação. A queda dura menos de 1 s antes do Fim (pilar 1).                                                                                                                                                              |
| 6   | **Decidi, pode vetar**                    |                                                                                      | Botão de pausa vira "continuar" (PU-01); Loja de 360 com painel menor, não lista (PU-02, opção 2 do UI-C); atalho Loja no fim só quando dá para comprar algo (PU-04); volume da música em três níveis (PS-01); Pular continua +15 fixo (02 M1).                |
| 7   | **CLAUDE.md**                             | atualizar                                                                            | O chefe de Valmor nos dados é a Mãe-Aranha, não o Cavaleiro Negro.                                                                                                                                                                                             |
| 8   | Perguntas que seguem abertas              | CD-01 Fonte de Luz e o gancho de lore; nome do ND-01; regras e nomes do ND-02; FT-18 | Sem mudança. O ND-01 é o próximo sistema grande depois do PE-02.                                                                                                                                                                                               |

---

## Próximos 5 (sugestão; a lista do topo do backlog só muda com o Daniel)

1. **PB-01 + PB-02 + PB-03 + PB-04**: efeitos com dano que somem, ouro arredondado, música em dobro, tecla de carta
   antes da hora. Bugs pequenos, um dia.
2. **PE-01 + NE-06, depois PE-02**: a Cripta e Valmor de volta à meta com as metas certas no sim; lab com multidão viva;
   as cinco cartas fracas vivas.
3. **PU-01 + PU-04 + PU-03 (com o CU-05)**: Pausa sem colisão e com "continuar"; fim que leva à Loja; carta com o
   número real.
4. **PA-01 + PA-02 + CA-01**: moldura em pixel, Valmor com neve, sombra nos inimigos.
5. **ND-01 Perigo por fase vencida** (com o nome do Daniel); se ele preferir arte antes, **PF-01 a PF-04** dentro do
   DD-15 (Fúria, acertos de área, verbos dos Elos, projéteis de Elo).

## Como saber se funcionou

- **Regressão da Cripta** (16 sementes, `SIM_SHOP=all`): meia Loja de volta a 80 a 90%, Teo a no máximo 20 pontos da
  fase; a tabela `TARGETS` sem `!` falso. Valmor meia Loja em 40 a 60% com 16 sementes.
- **Cartas vivas**: no `REAL DPS` do sim, Aura de Yah, Espadas de Elun e Maça com pelo menos 1/4 da melhor `aimed`
  real; Tempestade e Espada de Fogo com `ELO X` de 2,5x ou mais; picks de 28 a 49% mantidos; bandas verdes.
- **Ouro**: teste de 100 moedas com Ganância 1,1 dando 330; `LOJA` entre 40 e 60 corridas.
- **Efeitos**: com Espada de Fogo, Vigília, Nevasca, Chama e Geada no máximo por 30 s, a espada e o corte nunca somem
  (contagem do pool abaixo do teto); F4 igual ou melhor.
- **Moldura**: capturas 360x640, 420x820 e 1000x680 do Menu, Loja, Pausa, level-up e HUD sem a serifada do sistema; o
  Daniel reconhece Valmor como neve na primeira tela de jogo.
- **Retenção**: no playtest do Daniel, quantas vezes o botão Loja do fim é usado; tempo do fim de partida até a
  próxima partida (menos toques).
