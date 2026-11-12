# 08 · Reavaliação do backlog depois da virada para pixel art

Data: 2026-11-12 · commit conferido: `e1bff09` · autor: game-director.

Pedido do Daniel: antes de qualquer implementação nova, conferir se os itens abertos do backlog já foram resolvidos
de tabela pela virada para pixel art (fonte, painéis, barras, joystick, chãos, itens, sombras, efeitos, reação do herói,
consertos de interface, música, bugs) ou deixaram de fazer sentido.

Método: para cada item sem ✅ (proposto, parcial, reaberto, adiado, em espera), li o código e os dados de hoje
(`src/`, `tests/`, `public/`, `docs/art/credits.md`) e, nos itens visuais, abri o jogo em `?dev` (Vite na porta 4181,
Playwright, 420x820): tela Fase, Coleção com save zerado, início da Estrada do Sul e multidões da Cripta e de Valmor
avançadas por script (capturas no scratchpad da sessão: `stages.png`, `collection.png`, `road-start.png`,
`r-crypt.png`, `r-valmor.png`). Nenhum código foi tocado.

Classes: **FEITO** (resolvido por outro item, marcado ✅), **OBSOLETO** (perdeu o sentido, foi para "Descartados"),
**REESCREVER** (vale, mas a premissa mudou), **MANTER** (vale como está), **MESCLAR** (duplicado).

## Resumo

| Classe     | Itens | IDs                                                                                                                        |
| ---------- | ----- | -------------------------------------------------------------------------------------------------------------------------- |
| FEITO      | 7     | A-02, NA-02, NA-05, AR-02, AR-05, FT-16, DD-15                                                                             |
| OBSOLETO   | 1     | NA-04 (e a parte "borda do mapa" do AR-02)                                                                                 |
| MESCLAR    | 2     | NE-02 → PE-02, CF-08 → AR-01                                                                                               |
| REESCREVER | 9     | NB-08, CC-06, AR-01, AR-04, CF-07, CU-06, CU-07, CA-02, CA-03                                                              |
| MANTER     | 18    | A-04, L-01, RF-04, NU-02, NE-06, ND-01, ND-02, FT-18, CB-04, CU-01, CU-02, CU-03, CU-04, CU-08, CD-01, PE-01, PE-02, MU-01 |

Depois: 228 itens feitos e 27 abertos (bugs 2, interface 9, efeitos 4, arte 3, equilíbrio 3 em espera, sistemas e
conteúdo 4, música 1, lançamento 1). O topo do backlog ganhou "Estado atual" e "Próximos 10".

## Itens que mudaram de classe

| ID    | Estado antigo                         | Estado novo                            | Evidência                                                                                                                                                                                                                                                                                                                  |
| ----- | ------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-02  | reaberto 2026-11-11 · proposto        | FEITO                                  | DD-12 (`7112ba4`): halo claro atrás do herói (`heroRim`, `0xb4d0ff`, profundidade 13,05); sombra de contato sob os pés (`GameScene`, `shadows`); multidão no tamanho final (Esqueleto 108x124 → 68x76 art px). O contorno âmbar não foi feito; só volta se o Daniel ainda perder o herói.                                  |
| NA-02 | proposto                              | FEITO                                  | `tile.road` e `tile.forest` PixelLab (DD-10, `e014c73`), troncos e rochas (DD-11, `fb4a4db`); em 420x820 a floresta aparece dos dois lados (`road-start.png`). As miniaturas viraram os cartões da tela Fase com chão e chefe (DD-04), todos diferentes.                                                                   |
| NA-05 | proposto (sair junto com o PF-04)     | FEITO                                  | PF-04 (`7365b3b`): fogo-fátuo violeta (`sprites/fx/wisp.png`), alma com sprite próprio. A alma e `ELEMENT_COLOR.soul` (`0x7af0dc`) ficaram ciano-pálido de propósito (comentário em `render/ui.ts`).                                                                                                                       |
| AR-02 | primeira parte feita · resto proposto | FEITO (borda: OBSOLETO)                | Chãos regerados com mistura de repetição e contraste puxado (DD-10; Valmor com neve, PA-02 `f5595e6`); a Cripta é de lajes escuras (`r-crypt.png`); props e obstáculos em sprite (DD-11). Borda irregular: o mundo é aberto em Valmor e na Cripta, a Estrada termina na floresta.                                          |
| AR-05 | heróis feitos · andar proposto        | FEITO                                  | `ENEMY_ANIMS` (`render/enemyAnims.ts`): toda a multidão das três fases com andar de 5 quadros, inclusive Ossada, Morcego Vampiro, Esqueleto e Espectro; chefes e elites com quatro poses. Lyra, Teo e Andilla andam com a arma (`credits.md`, linha "com arma").                                                           |
| FT-16 | parcial                               | FEITO                                  | CB-01, CB-02, CE-01, CE-02, CF-01 a CF-06 fechados; Assombro (DD-07), Coveiro novo (DD-06), obstáculos (DD-11). O que sobrava tem item: CU-01 e PE-01.                                                                                                                                                                     |
| DD-15 | sem marca (texto diz "Nada falta")    | FEITO (marcado)                        | O próprio item, depois de `f995892`, `f838d4e`, `72e8e90`, `fb9195f`. O limo da Gosma, que ficou em vetor, está no CF-07.                                                                                                                                                                                                  |
| NA-04 | proposto                              | OBSOLETO                               | O elenco da Cripta mudou (`data/stages.ts`: Ossada, Morcego Vampiro, Esqueleto, Espectro, Ossada em Brasa, Gosma); aranha e rato estão em Valmor, como sprites PixelLab de cor e silhueta próprias. A separação da multidão da Cripta ficou no CA-03.                                                                      |
| NE-02 | ⏸ medido, falta calibrar              | MESCLAR → PE-02                        | O PE-02 já cobre Tempestade e Espada de Fogo, com a mesma causa (lab esparso) e o mesmo aceite (`ELO X` ≥ 2,5x).                                                                                                                                                                                                           |
| CF-08 | proposto (só sobrava a luz da Maça)   | MESCLAR → AR-01                        | Rebote e facas saíram no PF-03 e PF-04, Aura e Maça no DD-15; a luz âmbar no pouso é o que o AR-01 reescrito pede para todas as armas.                                                                                                                                                                                     |
| NB-08 | reaberto · proposto                   | REESCREVER (só a e b)                  | (c) feito: o aviso grande fica abaixo da barra do chefe (`HudScene` `layout`). (a) e (b) abertos: `quiet()` não esconde as setas e `nextToast` não olha o chefe nem a vida. Captura `r-crypt.png`: seta coral sobre o painel de atributos do level-up e toast de conquista sobre o título.                                 |
| CC-06 | reaberto · ampliado · proposto        | REESCREVER (P)                         | O Bestiário vivo (`aa79c14`) fez palco com silhueta, "Como enfrentar" com 28 dicas e retratos de ~50 px. Falta: `portrait()` usa `setTint(UI.border)` e os 28 "?" mostram cor e olhos (`collection.png`, save zerado); "De pé" nos chefes. Grupos por fase viram opcionais.                                                |
| AR-01 | reaberto (luz nos efeitos) · proposto | REESCREVER (P, absorve o CF-08)        | Efeitos agora são sprites de pixel com brilho próprio (DD-15, PF-01 a PF-06), há `fxGlow` aditivo e o chão da Cripta escureceu. Já acendem o chão: projétil, gema, chefe, forja, Badalada, estouro da Ossada em Brasa, Dobre. Falta só luz nos golpes de arma (nenhum `lighting` em Aura, Chama, raio, Fogo, Geada, Maça). |
| AR-04 | proposto ("Pen repintado")            | REESCREVER: últimos desenhos em código | Repintar o `Pen` perdeu o sentido (tudo virou sprite; CT-03 apagou a arte em código de heróis e inimigos). Sobram em `Pen` (`render/art/items.ts`, `icons.ts`): gemas, moeda, comida, elixir, Sopro de Geada e ícones. O item vira esses itens em pixel, gemas no azul do Daniel.                                          |
| CF-07 | proposto                              | REESCREVER                             | O limo melhorou em vetor (`drawSlime`: borda irregular, bolhas), mas nasce pronto e some por alfa, e é dos poucos chãos de inimigo ainda em código. Vira animação de pixel no `vfx_workbench` (espalhar, viver, secar) mais o fio no pé.                                                                                   |
| CU-06 | proposto                              | REESCREVER (P)                         | PA-01 fez joystick em pixel com o alfa novo e "Nv" no meio da barra de XP; B-03 já desabilita botão sem carga. Sobram: tecla R/X/B sem carga sem sinal (`useCharge` só retorna) e pips de 4 px.                                                                                                                            |
| CU-07 | proposto                              | REESCREVER (P)                         | A Preparação virou a tela Fase (DD-04) com chão, chefe, "Chefe: …" e "Vencida" (`stages.png`); a moldura das barras saiu no PA-01. Sobram: melhor marca por fase, perigos (se couber) e a frase da Cripta ("Pedra azul…") que não bate com as lajes cinza do DD-10.                                                        |
| CA-02 | proposto · ampliado                   | REESCREVER (P)                         | Sineiro já em escala 1 (`SPRITE_SCALE` vazio), com quatro poses (95x102 art px); Coveiro refeito (DD-06); chefe acima da escolta (RF-03). Sobram: luz por chefe (hoje `BOSS_LIGHT = 0xd8b0ff` única, some no azul de Valmor) e o sino aceso.                                                                               |
| CA-03 | proposto                              | REESCREVER                             | Espectro refeito em duas formas (DD-07), então sai do item. Ossada, Esqueleto e Ossada em Brasa seguem osso-claro e viram massa (`r-crypt.png`): primeiro tinta, regerar o Esqueleto só se faltar.                                                                                                                         |

Os 18 MANTER ganharam uma linha "Reavaliação 2026-11-12 · mantido" com o que foi conferido (por exemplo: o flash da
Segunda Chance continua em `GameScene`, evento `revived`; a `zone` ainda mostra número; `PauseScene.quit` vai ao
Menu; `t.end.lostText` é um só; a barra do chefe usa o mesmo visual `hp` da vida; as dicas do CU-01 já existem em
`t.bestiary.tips` e só falta mostrá-las na partida; o NE-06 precisa medir de novo os Escudos, que viraram arremesso
em laço no DD-09). Também marquei na lista "Fora de escopo" o que já virou item feito (música por fase, Noite Sem Fim,
Menu e Loja sem buracos).

## Decisões que precisam do Daniel

Nada de lore foi inventado nesta reavaliação. Estas continuam abertas ou nasceram dela:

1. **Equilíbrio em espera (PE-01, PE-02, NE-06 e as simulações).** Quando liberar, a primeira rodada mede junto tudo
   que fechou com "sim pendente" (B-04, PB-02 e a linha `LOJA`, PB-05, PB-07) antes de mexer no `mult` da Cripta.
2. **Música (MU-01).** Veredito da Valmor de teste (`817f81a`); depois, refazer Cripta, Estrada, chefe e menu no mesmo
   estilo e os stings de vitória e derrota.
3. **Nome do Elo antes da forja (NU-02, decisão 2 antiga).** Recomendo nome secreto até a primeira forja em todas as
   telas, passiva sempre visível.
4. **Textos provisórios:** frase de derrota por fase (CB-04) e a frase nova do cartão da Cripta (CU-07), ambos sem
   lore nova.
5. **Sistemas novos:** nome do Perigo (ND-01, recomendado como o próximo sistema grande, depois do PE-01); regras e
   nomes dos traços por herói (ND-02).
6. **Lore:** Fonte de Luz na Cripta (CD-01: aprovar, e se a luz impede as Ossadas de remontar); Pântano das
   Lamentações Clérigas (FT-18: os clérigos aparecem ou não, a Gosma vai para lá ou fica na Cripta, ordem das fases,
   chefe e elite).
7. **Vetáveis que decidi aqui:** grupos por fase no Bestiário ficam opcionais (CC-06); o aviso de chefe dura 3 s, não
   1,5 (NB-08); a alma da Procissão fica ciano-pálido (NA-05); o contorno âmbar do herói não entra (A-02); o aviso
   grande e a barrinha de vida sob os pés ficam como estão (CU-02).
8. **CLAUDE.md desatualizado (não editei):** diz que o cemitério tem o Cavaleiro Negro como chefe às 10:00; nos dados,
   Valmor tem a Mãe-Aranha e o Cavaleiro Negro está fora de fase (decisão 7 da `07-direcao.md`, ainda não aplicada). A
   frase "Ossadas, morcegos cinzentos e Ratos de Cova" também já não é o elenco de Valmor (hoje Rato de Cova, Morcego,
   Rato Gigante e Aranha; as Ossadas estão na Cripta).
9. **Onde volta o Cavaleiro Negro** (pergunta 5 das Fases temáticas): segue aberta; recomendação antiga, a vigília.
