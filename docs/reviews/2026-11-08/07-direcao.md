# Revisão 2026-11-08 · Direção (game-director)

Commit `16d126a`. Li o CLAUDE.md, os relatórios 00 a 06 desta pasta, o backlog e os dados atuais (`config.ts`,
`stages.ts`, `weapons.ts`, `enemies.ts`, `shop.ts`) e a `docs/balance-baseline.md`. Nada de código foi tocado. O
plano aprovado para esta noite está em `docs/design/backlog.md`, seção "Revisão 2026-11-08".

## As 3 recomendações que mais importam

1. **A build tem que aparecer durante a partida.** Hoje o jogador só vê armas e passivas na tela final. Sem a faixa da
   build no HUD (RU-02), sem a receita dizer "você tem" ou "falta" (RU-01) e sem o painel de atributos na subida de
   nível (RU-04), a profundidade de build (pilar 3) existe nos dados mas não chega à cabeça do jogador, e a escolha a
   cada 30 s (pilar 2) vira palpite. As duas referências que o Daniel trouxe (`docs/design/ui-references/`) apontam
   exatamente para isso.
2. **O caos tem que ficar legível e fofo de novo.** A multidão inteira fica vermelha quando a aura ou a geada batem,
   o vermelho é o da Andilla, o baú, a Badalada e o Sopro de Geada pintam a tela inteira por um quadro, chefes ficam por
   baixo da escolta e as gemas azul-claras se confundem com a família do gelo. São trocas baratas no render (RF-01 a
   RF-04, A-05) com o maior ganho por hora da noite (pilar 5).
3. **A primeira partida de todo jogador tem que ser justa, e o Elo tem que chegar antes do fim.** Aldo em Valmor vence
   5 de 12 no sim (o pior par do jogo), a Cripta é mais fácil que Valmor, e o primeiro Elo chega em média entre 7:33 e
   8:19 (o aceite do E-08 pedia antes das 7:00). Ajustes só de dados (RE-01, RE-02, E-08, RE-05) e uma regra pequena
   de mira no chefe (RE-06) corrigem isso sem sistema novo (pilares 3 e 4).

---

## Leitura de design: onde o jogo está

**O que já funciona.** O laço básico está de pé e medido: 4 heróis com arma própria, 3 fases com chefe telegrafado,
12 armas e 12 Elos, Loja, Livro de Elos, som, opções. O sim de 12 sementes vence 97 de 144 corridas, a luta de chefe
tem mediana de ~60 s, a economia fecha Loja e heróis em ~53 corridas (dentro da meta de 40 a 80), nenhuma arma deixa
de causar dano e os 12 Elos são formados. Zero erros de console no QA. A identidade visual (contorno, olhos grandes,
cor por herói) é sólida. A base é boa; o que falta é **mostrar** o que já existe e **aparar** três pontas.

**Contra os pilares:**

| Pilar                   | Diagnóstico                                                                                                                                                                                                 | O que move mais                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1 Rápido de entrar      | Bom. Fricção pequena: a escolha de herói e fase se perde ao recarregar; depois de liberar uma fase, "Jogar de novo" repete a antiga; no celular deitado há botões fora da tela.                             | RU-07 (lembrar escolha), RU-05 (Próxima fase), RB-05 (paisagem)                 |
| 2 Decisão a cada 30 s   | As subidas de nível são frequentes, mas o jogador escolhe sem ver a própria build nem o que falta para o Elo; o toque acidental escolhe por ele. O baú é automático e quase invisível.                      | RU-01, RU-02, RU-04, RF-04 (baú com ícone)                                      |
| 3 Profundidade de build | Os Elos corpo a corpo e de aura rendem 3 a 5x menos que os de distância na prática; o Leque (Elo da Andilla) é mais fraco que a base contra um alvo (0,53x); o Elo chega tarde porque só 6 elites dão baú.  | RE-03, RE-04, E-08                                                              |
| 4 Progressão que puxa   | Economia saudável e tela final com meta. Mas a tela final não mostra o "quase" (Elo a um baú) e, com a Loja inteira, o jogo vira passeio (47/48).                                                           | RU-05 agora; "dificuldade por fase vencida" é o próximo sistema grande (Ideias) |
| 5 Caos legível          | O ponto mais fraco hoje: tinta vermelha em massa, flashes de tela inteira, discos opacos de Maça e Fogo, números em bloco, chefe coberto, aviso do chefe no laranja do fogo do jogador, gema igual ao gelo. | Fase R3 inteira e A-05, A-04                                                    |
| 6 Eterra de verdade     | Sem problemas. Nada nesta revisão pede lore nova.                                                                                                                                                           | Nenhuma ação                                                                    |

**Evoluções (Elos).** O desenho (arma no máximo + passiva + baú) é bom e já tem o Livro. Os dois problemas são de
tempo (o baú certo chega tarde) e de forma (vários Elos não parecem melhores que a base, em número ou em efeito).
Esta noite: elites mais cedo (E-08), alcance dos Elos corpo a corpo (RE-03), Leque consertado (RE-04), slot "Elo
pronto" na faixa da build (RU-02) e um momento de baú que se vê (RF-04). Depois: uma revelação pausada só para o Elo
formado, se o Daniel sentir falta (Ideias).

**Conteúdo novo.** Não é o gargalo. Com 12 armas e 3 fases, mais conteúdo agora só aumentaria o que o jogador não
consegue ler. Primeiro legibilidade e leitura da build; conteúdo novo depois, e com lore do Daniel.

**Retenção.** A curva de ouro está certa. O que falta é o depois da Loja: o veterano vence 47 de 48. O próximo sistema
grande que eu proporia é um nível de dificuldade por fase vencida, com recompensa de ouro maior, mas não cabe numa
noite autônoma (Ideias para depois).

---

## Triagem dos relatórios

Legenda: **aceito** (vira item aprovado), **fundido** (entra num item de outro relatório), **reaberto** (item antigo
do backlog volta com escopo novo), **depois** (vai para "Ideias para depois"), **rejeitado**.

### 00 · Verificações

Tudo verde. Bundle de 1,30 MB num chunk só (357 kB gzip): **depois** (medir tempo de carga em 4G antes de mexer).

### 01 · Balanceamento

| Achado                                     | Decisão                                                       | Item            |
| ------------------------------------------ | ------------------------------------------------------------- | --------------- |
| B1 fantasma esmaecido gasta perfuração     | fundido com 02 #1                                             | RB-02           |
| B2 Sopro de Geada deixa fantasma intocável | aceito                                                        | RB-03           |
| D1 Leque fraco contra um alvo              | aceito (conflito com B-01, ver abaixo), dano 15 e não 18      | RE-04           |
| D2 Andilla acima dos outros                | rejeitado como nerf; condicional                              | RE-08           |
| D3 Aldo fraco, Aldo em Valmor pior par     | aceito (alcance da Lâmina e da Fúria)                         | RE-01           |
| D4 Elos corpo a corpo e aura fracos        | aceito                                                        | RE-03           |
| D5 parede dos 6:30                         | aceito                                                        | RE-05           |
| D6 Cripta mais fácil que Valmor            | aceito (a) e (b); `rat.hp` 24 rejeitado (medido, não resolve) | RE-02           |
| D7 Lobo Velho e armas de alvo aleatório    | aceita a mecânica; HP 10500 só como reserva                   | RE-06           |
| D8 Loja inteira zera o dano                | aceito via `minDamage` 2; `SHOP.armor` 1 rejeitado            | E-09 reaberto   |
| D9 Elos tarde                              | aceito `ELITE_TIMES`; `xp.step` 6,5 só como reserva           | E-08 reaberto   |
| D10 Fogo cresce pouco                      | aceito                                                        | RE-07           |
| D11 Mãos Ligeiras óbvia                    | aceito                                                        | RE-07           |
| Pick rate abaixo de 40% inaplicável ao bot | aceito como ajuste de aceite                                  | D-05 atualizado |

### 02 · Código

| Achado                                           | Decisão                                                            | Item  |
| ------------------------------------------------ | ------------------------------------------------------------------ | ----- |
| 1 fantasma come projéteis                        | aceito                                                             | RB-02 |
| 2 vitória e derrota no mesmo passo               | aceito, o bug mais grave (a fase não é liberada)                   | RB-01 |
| 3 áudio no iOS                                   | aceito                                                             | RB-04 |
| 4 teclado da Loja                                | aceito                                                             | RB-07 |
| 5 alocação por quadro                            | aceito                                                             | RT-02 |
| 6 F3/F4 em produção                              | B-06 reaberto                                                      | B-06  |
| 7 efeito consome o `Rng`, semente não registrada | aceito, **antes** do balanceamento (muda todas as sementes do sim) | RT-01 |
| 8 `sanitizeSave` com `Infinity` e versão futura  | aceito                                                             | RT-03 |
| 9 e 10 estado vazando e LevelUp duplicada        | aceito juntos                                                      | RB-08 |
| 11 textos fora do i18n                           | aceito, fundido com 03 #7 e 04 #19                                 | RT-04 |
| 12 código morto                                  | aceito                                                             | RT-05 |
| 13 lacunas de teste                              | fundido: cada correção traz o seu teste                            |       |

### 03 · QA

| Achado                             | Decisão                    | Item  |
| ---------------------------------- | -------------------------- | ----- |
| 1, 2, 4, 5, 6 celular deitado      | aceito como um item        | RB-05 |
| 3 toque duplo na Loja              | aceito                     | RB-06 |
| 7 dica do level-up por dispositivo | fundido                    | RT-04 |
| 8 F3/F4 em produção                | B-06 reaberto              | B-06  |
| 9 escolha some ao recarregar       | aceito (pilar 1)           | RU-07 |
| 10 favicon                         | aceito                     | RT-06 |
| 11, 12 heróis grátis, FPS          | já no backlog (D-06, L-01) |       |
| Sugestão "Próxima fase"            | aceito                     | RU-05 |
| Sugestão confirmar Desistir        | aceito                     | RU-06 |

### 04 · Visual

| Achado                              | Decisão                                              | Item          |
| ----------------------------------- | ---------------------------------------------------- | ------------- |
| 1 gema igual ao gelo                | aceito com a regra do Daniel (gema segue azul-clara) | A-05 reaberto |
| 2 Maça e Fogo lavam a multidão      | fundido com 06 #3 e #4                               | RF-07, RF-08  |
| 3 números em bloco                  | aceito                                               | A-04 reaberto |
| 4 vermelho de acerto e herói ferido | fundido com 06 #1                                    | RF-02         |
| 5 chefes e elites por baixo         | aceito                                               | RF-03         |
| 6 elites sem destaque               | fundido com 06 #17                                   | RF-03         |
| 7 chão da Estrada                   | aceito                                               | A-10 reaberto |
| 8 rato pequeno, investida ilegível  | arte em RA-01; preparo da investida em RF-10         | RA-01, RF-10  |
| 9 faixa clara no level-up           | aceito, fundido com a guarda de toque                | RU-01         |
| 10 Pausa                            | aceito, fundido com a confirmação do QA              | RU-06         |
| 11 Opções só em texto               | aceito                                               | RA-04         |
| 12 vida em duas cores               | aceito                                               | RA-02         |
| 13 tremor mostra a borda            | aceito                                               | RA-03         |
| 14 aranha com olho vermelho         | aceito                                               | RA-01         |
| 15 gema grande demais               | fundido                                              | A-05          |
| 16 Livro de Elos com discos lisos   | fundido com 05 #11                                   | RA-05         |
| 17 Preparação                       | aceito, fundido com 05 #12                           | RA-06         |
| 18 menu e Loja com sobra            | depois (baixo)                                       | Ideias        |
| 19 ícone de pausa e dica            | fundido                                              | RT-04         |

### 05 · UI

| Proposta                                       | Decisão                                                                                     | Item            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- |
| 1 faixa da build                               | aceito, a mais importante da UI                                                             | RU-02           |
| 2 painel de atributos no level-up              | aceito (referência do Daniel)                                                               | RU-04           |
| 3 escolha segura e receita com estado          | aceito                                                                                      | RU-01           |
| 4 Pausa como ficha                             | depois: reaproveita o painel de RU-04 quando ele estiver testado                            | Ideias          |
| 5 revelação do baú (cena que pausa)            | depois: esta noite o baú ganha efeito no mundo (RF-04); a pausa só se o Daniel sentir falta | Ideias          |
| 6 setas na borda                               | depois                                                                                      | Ideias          |
| 7 tela final com "faltou pouco"                | aceito (pilar 4)                                                                            | RU-05           |
| 8 barra do chefe no topo                       | aceito                                                                                      | RU-03           |
| 9 ajustes do HUD                               | aceito                                                                                      | RU-03           |
| 10 Loja com ícones e grupos                    | depois (B-03 acabou de entrar e o QA diz que os estados se distinguem)                      | Ideias          |
| 11 Livro de Elos com silhueta                  | aceito                                                                                      | RA-05           |
| 12 selo de fase vencida                        | aceito                                                                                      | RA-06           |
| 13 joystick                                    | raio por tela aceito (RU-08); joystick fixo depois                                          | RU-08, Ideias   |
| Achado lateral: ouro difere do E-10            | conferido: foi decisão da Etapa 2 (baseline), só o texto do backlog estava velho            | E-10 atualizado |
| Achado lateral: Cota de Malha cita uma arma só | fundido                                                                                     | RU-01           |

### 06 · VFX

| Item                                                   | Decisão                                                        | Item no backlog |
| ------------------------------------------------------ | -------------------------------------------------------------- | --------------- |
| 1 acerto em flash branco, squash, faísca               | aceito (flash e squash em RF-02, faíscas em RF-05)             | RF-02, RF-05    |
| 2 aura no ritmo do tick                                | aceito                                                         | RF-06           |
| 3 golpes que varrem, Fúria anel                        | aceito, fundido com 04 #2                                      | RF-07           |
| 4 Fogo e Espada de Fogo                                | aceito, fundido com 04 #2                                      | RF-08           |
| 5 sem flash de tela inteira                            | aceito                                                         | RF-04           |
| 6 Luz de Elun visível                                  | aceito                                                         | RF-09           |
| 7 raio variado e no chão                               | aceito                                                         | RF-08           |
| 8 mortes de desenho animado                            | aceito (câmera lenta do chefe rejeitada: só explosão e tremor) | RF-05           |
| 9 aviso do chefe em coral                              | aceito, custo zero, primeiro passo                             | RF-01           |
| 10 órbitas com rastro, Vigília sem disco               | aceito                                                         | RF-09           |
| 11 Geada com pouso e tick                              | aceito                                                         | RF-11           |
| 12 congelado e lento                                   | aceito                                                         | RF-04           |
| 13 investidas, Corte Brutal, Ossadas                   | aceito                                                         | RF-10, RF-07    |
| 14 Martelo gira, Adagas com rastro                     | aceito                                                         | RF-09           |
| 15 sinos balançam                                      | depois (baixo)                                                 | Ideias          |
| 16 coleta de gema e pulso de nível                     | pulso de nível aceito em RU-01; rastro e faísca de gema depois | RU-01, Ideias   |
| 17 elite e baú com destaque                            | aceito                                                         | RF-03           |
| 18 cores de assinatura                                 | fundido em RF-07, RF-08, RF-09                                 |                 |
| Fogos-Fátuos com rastro, Tempestade escurecendo a tela | depois                                                         | Ideias          |

---

## Conflitos entre relatórios e decisão

1. **Leque de Facas: anel (B-01) contra leque à frente (01 D1).** No B-01 o Daniel escolheu girar o anel meio passo
   em vez de 11 facas; as duas opções eram anel. O problema agora é outro: o Elo da Andilla rende 0,53x da própria base
   contra um alvo, e um Elo pior que a base quebra o pilar 3. **Decisão: leque à frente** (`spread` 0.16, mirando no
   mais próximo, dano 15, sem subir para 18 porque a Andilla já é a heroína mais forte). A correção do B-01 continua no
   core e testada para qualquer arremesso que cubra o círculo. É uma linha de dado para voltar atrás: está na lista do
   que o Daniel deve conferir.
2. **Gemas azul-claras (decisão do Daniel) contra "gema igual ao gelo" (04 #1).** A gema fica azul-clara. Quem muda é
   o resto: a gema vira a **única coisa ciano saturada e cintilante** da tela (tom puxado levemente para ciano, brilho
   que pisca, tamanhos menores), e a família do gelo (flor de gelo, poça, tinta de lento e congelado, Geada, olho do
   fantasma) migra para branco, branco-lilás e cinza-azulado dessaturado. Nunca verde.
3. **Acerto: branco (04 #4) e branco com faísca e squash (06 #1).** Mesma direção. Flash branco curto + squash agora
   (RF-02); a faísca por tipo vem com o pool de faíscas (RF-05). Herói ferido: tinta multiplicada (mantém o rosto) e o
   contorno piscando, nunca silhueta chapada.
4. **Baú: cena que pausa (05 #5) contra efeito no mundo (06).** Esta noite: efeito no mundo (raios, ícone da
   recompensa subindo do herói, anel na cor do herói, sem flash opaco). Pausar só para o Elo formado fica em Ideias:
   cada pausa custa ritmo, e o Daniel decide depois de jogar.
5. **Subida de nível: faixa clara (04 #9), guarda de toque com fade (05 #3) e pulso que não se vê (06 #16).** Um item
   só (RU-01): o escuro cobre a tela inteira, o HUD vem para cima, as cartas entram com fade de ~300 ms sem aceitar
   toque nesse tempo, e esse mesmo intervalo deixa ver o pulso de nível.
6. **Pausa: reordenar (04 #10), ficha da build (05 #4), confirmar Desistir (03).** Esta noite: reordenar e confirmar
   (RU-06). A ficha da build entra depois, reaproveitando o painel do RU-04.
7. **Números de dano: deslocamento aleatório (hoje) contra semente limpa (02 #7) e números em coluna (04 #3).** O
   deslocamento passa a ser determinístico pelo `uid` (resolve o `Rng` e a pilha numa coluna de uma vez), em RT-01; o
   limite por golpe de área e a fonte por zoom ficam em A-04.
8. **Andilla forte (pedido do Daniel no E-03) contra "Andilla domina" (01 D2).** Não nerfar. Subir Aldo e os Elos
   corpo a corpo primeiro; só se o sim de 12 sementes, depois da R2, mostrar a Andilla em 34 de 36 vitórias ou mais,
   Adagas L1 recarga 0,8 para 0,9 (RE-08).
9. **Armadura da Loja: `SHOP.armor` 1 contra `minDamage` 2 (01 D8).** `minDamage` 2: uma regra global que vale para
   herói, passiva e Loja, sem tirar uma compra que o jogador já pode ter.
10. **Lobo Velho: HP 10500 contra mira no chefe (01 D7).** Mira no chefe: conserta a causa (alvo aleatório) para Raio,
    Fogo e Geada nas três fases. HP só se o sim ainda mostrar mortes por tempo na Estrada.

## Ordem da noite e por quê

R1 (bugs e integridade) vem primeiro e **termina com nova linha de base** do sim, porque o RT-01 muda o fluxo do `Rng`
e todas as sementes mudam: os números "antes" da R2 têm que ser os da R1. R2 (balanceamento, só dados e uma regra de
mira) antes dos efeitos, para que as capturas da R3 já mostrem os alcances novos. R3 (VFX) e R4 (UI) são independentes
e podem ir em sequência com o vfx-director e o ui-designer. R5 (arte e polimento) fecha com itens pequenos do
visual-director. Detalhes, aceites e passos no backlog.

## O que o Daniel deve conferir de manhã

- **Leque de Facas** agora é um leque à frente (RE-04): gostou ou volta ao anel?
- **Gemas** continuam azul-claras; o gelo ficou branco-lilás. Ainda confunde?
- **Acertos brancos** no lugar do vermelho e herói ferido com rosto visível.
- **Faixa da build** no topo esquerdo e **painel de atributos** na subida de nível: poluem a tela do celular?
- **Guarda de ~300 ms** nas cartas: incomoda quem escolhe rápido?
- **Golpes e explosões novos** (Lâmina varrendo, Maça com anel de choque, bola de fogo, Espada de Fogo cravando).
- **Valmor com o Golem como primeira elite** e Aldo com mais alcance: a primeira partida ficou justa?
- No iPhone: entrar no jogo, trocar de app, voltar: o som continua (RB-04)?
