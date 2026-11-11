# 06 · Efeitos visuais (vfx-director), 2026-11-11, commit 7e51776

Foco: **Cripta da Igreja Velha** (prioridade, não limite). Somente revisão: nada em `src/`, `tests/` ou `docs/design/`
foi tocado.

## Método

- Li `CLAUDE.md`, `docs/design/backlog.md` (RF-01..11, NF-01..10, AR-01/03, FT-02..16) e as referências Sea of Stars.
- Subi `npx vite --port 4177 --strictPort` com `?dev` (já parado; as portas 4174 e 4176 são de outros agentes) e dirigi
  o jogo com Playwright em 420x820: Cripta, Aldo, sem inimigos da onda, mundo em câmera lenta (`world.step` a 0,2 a 0,5)
  só para dar tempo de capturar. Não mexi em nenhum arquivo do repositório.
- Cripta: pilha, Ossada em Brasa, limo, Coveiro, Espírito Gélido, Badalada, Dobre Fúnebre, uma captura por moment.
- Armas: as 13 bases e os 13 Elos no **nível máximo**, cada um com 26 inimigos parados em volta (Ossadas e
  Esqueletos, vida infinita), 6 quadros por arma. Limite honesto: um herói, um cenário estático, e algumas folhas têm
  resto de zonas da arma anterior (Geada, Espada de Fogo), o que apenas exagera a sobreposição. Não medi FPS (revisão);
  os custos abaixo são estimativas pelo código, a medir com F4 a 420x820 e 4x de CPU antes de aceitar cada item.
- Capturas (scratchpad):
  `/tmp/claude-1000/-home-dani-games-eterra-survivors/65a2d29d-24a3-46ee-8b2b-e862c2b93e2f/scratchpad/shots/`
  (abreviado `shots/` abaixo).

## O achado que atravessa tudo: os efeitos não são luz

`grep` por `BlendModes`/`ADD` em `render/fx.ts` e `render/sparks.ts`: **nenhum resultado**. Todo efeito de arma, chefe e
acerto é vetor de mistura normal desenhado **por cima** da camada escura (`GameScene.ts:279-280`, depth 4 e 11; a camada
escura fica em 2,9, `lighting.ts:24`). A API de luz existe (`Lighting.add` e `flash`, `lighting.ts:145,175`), mas só tem
**três** usos: projétil voando (`GameScene.ts:308`), pulso de nível (`:843`) e Segunda Chance (`:1012`). Resultado na
Cripta, que é a fase mais escura (`crypt.ambient 0x3c3260`): aura, onda, estouro, raio, fogo e Dobre Fúnebre são
adesivos planos sobre a noite; nada **ilumina o chão** nem **brilha**. Isso contradiz o padrão do vfx
("luz sobre a escuridão, núcleo branco quente, os fortes acendem o chão") e a referência Sea of Stars
("os efeitos são luz": ref-03, 04, 07; poças de luz quente contra o escuro frio).

Regra que sai daqui para todos os itens: um evento forte = **uma luz no mapa de luz** (`Lighting.add`/`flash`, que já
tem 320 luzes e 16 flashes pré-alocados, sem alocar) + **um Graphics aditivo** (`fxGlow`, depth 11,5) para os núcleos.

---

## Propostas ordenadas por impacto

### 1. Luz nos efeitos de arma e de chefe (transversal) · impacto muito alto · custo baixo-médio

- O que faz hoje: ver acima. Aura, Chama, Fúria, Maça, raios, Fogo, Espada de Fogo, Estouro, Dobre: sem luz.
- O que deveria mostrar: cada uma acende o chão na cor do dono/elemento: Aura de Yah e Chama = poça âmbar que
  **pulsa no tique** (já há o tique, `drawAura` `fx.ts:851`, RF-06); raio/Tempestade = flash frio de 0,12 s no ponto;
  Fogo e Espada de Fogo = luz laranja na queda e brasa fraca enquanto a zona vive; Geada = azul fraco; estouro da Ossada
  em Brasa e Dobre Fúnebre = flash curto no raio.
- Como: `lighting.add(x, y, raio, cor, alfa, brilho)` na hora em que o desenho já sabe a posição (mesmo ponto onde hoje
  se desenha o disco); um Graphics novo `fxGlow` com `setBlendMode(ADD)` para miolo branco-quente e halo (substitui o
  disco de mistura normal nos efeitos fortes, não soma).
- Custo: uma luz = um estampo no `rt` (a 0,25 de resolução, barato); um segundo Graphics aditivo = +1 lote por quadro.
  Limitar a **8 luzes de efeito por quadro** (orçamento como o NF-02) e `calm` corta o alfa à metade. Medir F4 antes e
  depois; o risco real é o fill-rate do aditivo em tela cheia, então halos grandes ficam com alfa baixo.

### 2. Pilha de ossos que remonta (FT-15) · impacto alto · custo baixo

- O que faz: a primeira morte da Ossada vira pilha por 3 s (`core/enemies.ts:242-248`), qualquer acerto a quebra de vez,
  senão levanta com 30% da vida (`:271-282`). Sem evento no núcleo.
- O que o jogador vê hoje: troca de sprite (`GameScene.ts:340`) e mais nada. Nada marca a **queda** (sem poeira, sem
  estrelinhas, sem som), nada mostra o **relógio** dos 3 s, e o levante é um corte seco de volta para o esqueleto. Na
  captura `shots/pile-sheet.png` a pilha é um crânio pequeno com olhos vermelhos, quase igual ao chão violeta, e
  durante o combate ela fica coberta pelos outros esqueletos. É a mecânica nova mais importante da fase ("os que não
  descansam") e ela é invisível: o jogador não entende que deve **acertar a pilha**.
- O que deveria mostrar:
  - **Queda**: leque de 6 ossinhos (faísca `SPARK.star` na cor osso) e uma nuvem de poeira ao colapsar, 1 vez.
  - **Relógio**: um anel fino de brasa/osso ao redor da pilha que **fecha** em 3 s (arco de `pile / delay`), na cor de
    perigo suave, e os dois olhos que **acendem mais** no último segundo; no último 0,6 s a pilha **treme** (±1,5 px) e
    ossinhos voam de volta para ela (poucas faíscas retornando, `sparks.add` com velocidade para o centro).
  - **Levante**: anel curto + poeira no instante em que `e.rose` vira verdadeiro, e o esqueleto surge com squash
    vertical (já há squash no espelho).
  - **Quebra definitiva**: a mesma estrela dupla do crítico, mais um "estalo" de ossos; é o acerto que o jogador
    deve ter vontade de repetir.
- Como (sem tocar a regra): o render lê `e.pile` e `e.def.reassemble.delay` (já expostos). Para a queda e o levante,
  guardar no espelho o `pile` do quadro anterior (campo no `EnemyImage`, como `stunned` já faz) e disparar a faixa de
  faíscas na transição 0→>0 e >0→0. Sem evento novo e sem alocação.
- Custo: o anel é uma linha no `ground` por pilha visível (limitar a 24); faíscas saem do pool (cap 96, `sparks.ts:42`).
  Desprezível.

### 3. Estouro da Ossada em Brasa (FT-14) · impacto alto · custo baixo

- O que faz: ao morrer deixa uma marca; 1 s depois fere o herói no raio 48 e os inimigos com 0,6 da vida do estourador
  (`core/marks.ts:97-173`).
- O que o jogador vê hoje: **aviso bom** (`drawMarks` `fx.ts:1116-1124`: disco coral enchendo até o raio exato e rim
  tracejado, ver `shots/eb-sheet.png`, quadros 1 a 5). O **estouro** é fraco: um anel laranja fino mais ~14 brasas, por
  ~0,25 s (`GameScene.ts:970-973`), sem miolo, sem luz, sem marca no chão, sem fumaça; os inimigos feridos só mostram o
  número. O momento é a recompensa da jogada ("atrair a multidão") e passa em um piscar. Mais: na hora da morte da
  Ossada em Brasa não há rastro dela (o corpo some e só fica o disco), então nem sempre se liga o aviso ao inimigo.
- O que deveria mostrar: a "brasa no peito" cresce **antes** da morte (a Ossada em Brasa já deveria pulsar o peito;
  `enemy.emberBones` é sprite estático) e a marca fica com o miolo quente acendendo no mesmo ritmo da borda; no estouro:
  flash branco-quente de 0,08 s com disco que corre até o raio exato, 8 raios curtos, brasas que sobem, fumaça pálida
  que fica 0,6 s e uma **mancha chamuscada** no chão por ~2 s; luz laranja forte no mapa (item 1). Quem é ferido (herói
  ou inimigo) leva o brilho de queimadura de `dotSpark`, e inimigos pegos recuam um pouco (já se desenha empurrão).
  Sem tremor (regra: não é bomba do herói).
- Custo: sparks do pool (+10 por estouro, cap 96, no máximo 8 Ossadas vivas `max`), 1 luz, 1 disco; mancha como mark
  curto no `ground` (usar `marks`, `ttl` 2 s). Desprezível.

### 4. Dobre Fúnebre (Sineiro, 2ª habilidade) · impacto alto · custo baixo

- O que faz: anel completo de raio 130 em volta do Sineiro, 20 de dano, 1,2 s de aviso
  (`data/enemies.ts:483`, é um `cleave` de arco 2π).
- O que o jogador vê hoje (`shots/dobre-sheet.png`): o **aviso lê bem** (círculo com anéis e rim tracejado, ele mesmo
  usa a forma do AR-03). Dois defeitos: (a) sobra uma **linha radial tracejada** vertical (as duas bordas do arco
  coincidem, `fx.ts:1664-1665`); (b) o **golpe** é desenhado como a mesma varredura de espada do Cavaleiro
  (`drawSwing(... CLEAVE_STYLE)`, `fx.ts:1637`): uma cunha de ~270 graus que gira, branca e translúcida. Um sino que
  toca não corta como espada; e a cunha deixa buraco, então parece que há um lado seguro. Além disso o `bossMoments`
  faz 6 faíscas num "arco" (`GameScene.ts:750-759`) e treme a tela, sem anel de som.
- O que deveria mostrar: o aviso fecha para dentro como som (anéis **contraindo** para o sino, 3 pulsos nos últimos
  0,6 s, sincronizados com o som se houver); no golpe, um **anel de choque completo** que corre do sino até o raio 130
  em 0,25 s (borda branca grossa, preenchimento violeta-âmbar translúcido, 12 notas/ondas), o sino balança e solta
  poeira de pó na borda do raio; luz branco-violeta no mapa. Se arco ≥ 2π: sem linhas radiais.
- Custo: troca de desenho no mesmo lugar (menos primitivas que a cunha). Zero em orçamento.

### 5. Badalada (Sineiro, invoca 8 Ossadas) · impacto médio-alto · custo baixo

- O que faz: sem dano; 1,1 s depois 8 Ossadas surgem num anel de raio 80 (`data/enemies.ts:61-70`, `core/bosses.ts`).
- O que o jogador vê hoje (`shots/toll-sheet.png`): um disco do vermelho de perigo, de 40% a 100% do raio 80, bolinhas
  brancas em volta, o chefe balança o corpo todo (`GameScene.ts:375-377`), depois marcas de cova rosadas e as Ossadas.
  Problemas: (a) é a **mesma cor e forma de perigo do Dobre Fúnebre**, mas não causa dano: o jogador aprende a fugir de
  um anel inofensivo (e a ignorar o que machuca); (b) nada de "badalar": o sino não balança separado do corpo, nenhuma
  onda sai dele; (c) as covas só aparecem quando a invocação já foi decidida (`drawMarks`), e são pequenas
  (`mr` 6 a 12 px, `fx.ts:1726-1733`); (d) o puff de terra e osso no surgimento (`GameScene.ts:763-773`) é pequeno.
- O que deveria mostrar: a Badalada **não é perigo**; usar a cor "invocação" (violeta-osso, pálido) em vez do vermelho,
  deixando o coral só para o que fere. Mostrar as 8 covas desde o início do aviso, crescendo, e **ondas de som**
  saindo do sino a cada batida (2 batidas: o sino balança duas vezes). Na invocação: coluna curta de poeira e
  luz fria em cada cova, as Ossadas sobem com squash vertical.
- Custo: 8 ovais + 2 anéis no `ground` por quadro (só 1,1 s a cada 8 s). Desprezível.

### 6. Orbe do Espírito Gélido (Toque Gélido) · impacto médio-alto · custo muito baixo

- O que faz: atirador que mantém 220 px, orbe lento de 90 px/s, raio 6, vida 4 s, dano de contato 4 (`data/enemies.ts:212-221`,
  `core/enemyShots.ts`).
- O que o jogador vê hoje (`shots/spirit-sheet.png`): o espírito é **azul gelo**, mas o tiro sai **branco-rosado com
  cauda coral** (`drawEnemyShots`, `fx.ts:1201-1215`: cor única `WARN_COLOR`/`0xffd8c8` para todo atirador). Um orbe
  rosa saindo de uma mão azul quebra a leitura de elemento (e parece o tiro do Goblin Lanceiro). O aviso de disparo é uma
  pontinha coral na lança (`fx.ts:1190-1197`, vale para o Goblin) e não existe para o espírito: o espírito só pisca.
  A cauda tem 22 px no máximo e some em fundo claro. O orbe também não explica a consequência: não há desenho de geada
  no herói se ele **deixa lento** (se o Toque Gélido só dá dano, o nome promete frio que não aparece).
- O que deveria mostrar: orbe com **cor por atirador** (campo de estilo no `shoot` da data ou tabela no `fx.ts` como
  `TRAIL`): núcleo branco, halo azul-gelo, 3 a 4 flocos que ficam para trás e uma luz fraca azul no mapa
  (`lighting.add`, como já se faz com projéteis do herói, `GameScene.ts:308`); contorno escuro fino para continuar
  legível (regra "inimigo é legível": manter o contorno de tinta). Aviso: o orbe se condensa na mão por 0,7 s (esfera
  crescendo + 3 faíscas azuis entrando). Se acertar o herói: estilhaço azul e contorno gelado por 0,4 s (reaproveitar
  `SPARK.flake`).
- Custo: igual ao que há (máx. 16 tiros no pool). Zero.

### 7. Covas do Coveiro (elite, `dig`) · impacto médio · custo baixo

- O que faz: finca a pá, 1,1 s de aviso, 4 Ossadas saem das covas num anel de raio 110 (`data/enemies.ts:453-466`,
  `core/behaviours.ts:349`).
- O que o jogador vê hoje (`shots/dig-sheet.png`): durante o aviso um disco rosado quase invisível (alfa 0,06 a 0,16) com
  anel tracejado de raio 110 (`fx.ts:1166-1172`); **as covas só aparecem no fim** como quatro ovais pequenos. O
  Coveiro não tem animação de pá (não há rotação nem poeira: o balanço só vale para chefe, `GameScene.ts:375`). O anel
  de 110 de raio não diz **onde** as Ossadas saem, e o desenho dele pode ser lido como dano (é o coral de perigo) quando
  não fere.
- O que deveria mostrar: as 4 covas marcadas desde o começo do aviso (anéis de terra rachando no chão), crescendo;
  o Coveiro abaixa a pá (squash para baixo no espelho) e solta poeira na pá; no fim, mãos de osso e terra voando em
  cada cova. É um elite: precisa de um miolo que o torne "o que fazer em seguida" (matar o Coveiro antes do próximo
  ciclo, 7 s).
- Custo: reaproveita marcas `spawn` (FT-02), só começam antes. Zero.

### 8. Rastro de limo da Gosma Verde (`trail`) · impacto médio · custo muito baixo

- O que faz: a cada 1,2 s deixa uma poça de raio 26, 4 s, que deixa o herói lento a 0,7; máx. 5 a 6 vivas
  (`data/enemies.ts:279`, `core/marks.ts`).
- O que o jogador vê hoje (`shots/slime-sheet.png`, quadro 2): três discos verdes com pintas, bem legíveis, e o herói
  fica com contorno verde. O que falta: a poça **nasce pronta** (`if (m.ttl > 0 && m.kind === 'slime') continue;`
  `fx.ts:1513`), sem gota que cai e sem borda; o fim também é seco (só alfa por `life`); e o herói lento não tem
  desenho de "grudando" (só o contorno).
- O que deveria mostrar: a poça espalha de 40% a 100% do raio em 0,2 s com um respingo, brilha (halo verde fraco, luz
  verde mínima, a Cripta é o único lugar onde verde quente funciona como "perigo do chão"), e o herói dentro dela deixa
  um fio de gosma no pé e pés pesados (o espelho do herói já faz squash, falta o gatilho `slow`). Ao secar, a poça
  **encolhe** com bolhas.
- Custo: o mesmo desenho, sem coisas novas. Zero.

### 9. Acerto branco sobre sprite branco (Cripta) · impacto médio-alto · custo baixo

- O que faz: acerto em alvo único pinta o inimigo de branco total por 0,05 s (`GameScene.ts:395`, `setTintFill(TINT.hit)`,
  NF-01).
- O que o jogador vê hoje: na Cripta os inimigos principais são **brancos** (Ossada, Esqueleto) e o flash vira uma
  mancha branca achatada que apaga o sprite sem informar nada; aparece em quase toda captura de Procissão, Escudos e
  Adagas (`shots/s-wisps-soulProcession.png`, `shots/s-shields-valmorWall.png`: silhuetas brancas sólidas).
  O jogador nota o acerto, não **qual arma**: o que informa é a faísca por arma (`sparks.hit`, `HIT_SPARK`).
- O que deveria mostrar: nos sprites claros, flash na **cor da arma** (tinta de preenchimento com a cor do
  `HIT_SPARK` ou um brilho aditivo curto) ou, mais barato, trocar para uma **faísca de arma** um pouco maior e manter a
  tinta branca só no crítico. Nunca alfa total em inimigo claro.
- Custo: nenhum (troca a cor da tinta). Alterar o alfa só no crítico ainda economiza leitura quando houver 500.

---

## Armas, uma a uma (nível máximo, Cripta, quadros em `shots/w-<id>-<n>.png`; folhas `shots/s-*.png`)

Leitura: "hoje" é o que vi nas capturas; a regra do vfx (onde, quando, quem, o que além do dano, quão forte, de quem).

| Arma                                                             | O que faz                                               | Hoje                                                                                                                                                                 | Deveria                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Lâmina de Valmor** (`blade`)                                   | arco largo à frente, 2 golpes no nível 3+               | cunha dourada e translúcida que varre (`drawSwing` `fx.ts:629`, RF-07) e some em 0,2 s; sobre Ossadas brancas tem **pouco contraste** (`s-blade-fury.png`, quadro 3) | contorno claro e uma sombra escura atrás do arco, para ler sobre osso branco; luz dourada curta                       |
| **Fúria** (Elo, `wave`)                                          | golpe + onda que sai                                    | meia-lua rosada grande e um crescente vermelho voando, legíveis (`s-blade-fury.png`, 2ª linha); verbo `wave` aparece                                                 | luz vermelha ao longo da onda; poeira no alcance                                                                      |
| **Luz de Elun** (`elunLight`) / **Luz Sagrada** (`mend`)         | motes teleguiados / cura ao acertar                     | mote verde pequeno, cruz de faísca verde; a cura aparece como cruzes (já feito)                                                                                      | halo e rastro com luz no mapa (item 1)                                                                                |
| **Adagas** (`daggers`) / **Leque de Facas** (`ricochet/bleed`)   | lâminas lançadas, saltam e fazem sangrar                | lâminas **pequenas**; pouca diferença entre base e Elo na captura (`s-daggers-fan.png`); gotas esmeralda do sangramento já existem                                   | Elo: leque com 3 pulsos de brilho, faísca de rebote ao saltar, gota mais visível                                      |
| **Aura de Yah** (`yahAura`)                                      | aura que fere no tique                                  | **anel fino e pálido** que some no meio da multidão (`s-yahAura-yahFlame.png`, 1ª linha); a pulsação existe (RF-06) mas o raio exato só é lido no quadro do tique    | o item 1: poça âmbar acendendo o chão e **onda no tique**, borda mais grossa (alfa alto na borda, baixo no miolo)     |
| **Chama de Yah** (Elo, `pulse`)                                  | aura + onda a cada N tiques                             | anel dourado grande com línguas na borda: legível e bonito (2ª linha); é o melhor Elo visual                                                                         | luz laranja no chão, brasas subindo                                                                                   |
| **Espadas do Paladino** (`paladinSwords`) / **Vigília** (`dart`) | orbitam, o Elo dispara                                  | espadas legíveis; anel guardado do Elo e marcas girando (já feito)                                                                                                   | rastro com brilho e faísca no corte; luz no mapa                                                                      |
| **Geada** (`frost`) / **Nevasca** (`shatter`)                    | zona de gelo que lentifica / estilhaça                  | zona branco-azulada com cristais; Nevasca com aro azul vivo (`s-frost-blizzard.png`)                                                                                 | tique visível com flocos subindo, cristais nos inimigos lentos                                                        |
| **Raio de Lyra** (`lightning`) / **Tempestade** (`chain`)        | raio do céu / cadeia                                    | Tempestade: raios violeta verticais legíveis (`s-lightning-storm.png`, quadro 10); o halo frio e o núcleo branco são do desenho, mas **sem luz no chão**             | flash frio no ponto e entre inimigos                                                                                  |
| **Martelo** (`hammer`) / **Fúria da Forja** (`boomerang`)        | arremesso e retorno                                     | martelos laranja girando, legíveis (`s-wisps-soulProcession.png`, fim)                                                                                               | rastro de brasa; ao voltar, faísca na mão                                                                             |
| **Fogos-Fátuos** (`wisps`) / **Procissão** (`swell`)             | luzes lentas que perseguem / almas que crescem          | base: **motes ciano muito pequenos**, difíceis de seguir; Elo: almas em arco e silhuetas brancas dos acertos                                                         | motes maiores com halo e rastro (já listado no backlog como "Fogos-Fátuos com rastro", `docs/design/backlog.md:1353`) |
| **Escudos** (`shields`) / **Muralha de Valmor** (`ward`)         | órbita que empurra ~60 px                               | discos cinza bem legíveis; empurrão com riscos de poeira (NF-04); na Muralha o aro aparece perto do herói                                                            | onda curta e clangor visível quando empurra, arco de recarga já existe                                                |
| **Maça de Ferro** (`mace`) / **Quebra-Junta** (`aftershock`)     | golpe pesado que atordoa, onda a cada 3º golpe          | golpe é um **disco pálido pequeno** ao lado do herói; a onda anuncia-se pelas pips âmbar (NF-03); o Elo faz anéis grandes legíveis (`s-mace-jointBreaker.png`)       | o impacto da base ainda lê pouco no meio da multidão; luz âmbar no pouso, estrelas de atordoamento (já feito)         |
| **Bola de Fogo** (`fire`) / **Espada de Fogo** (`ground`)        | bola do céu / espadas cravadas que queimam              | Espada de Fogo: poças âmbar com línguas, legíveis; sobreposição de 8 vira mancha quente mas o orçamento (NF-02) segura (`s-fire-fireSword.png`)                      | luz laranja forte na queda, brasas subindo das zonas                                                                  |
| **Cajado de Lyra** (`staff`) / **Estrela de Lyra** (`split`)     | orbe que estoura / estrelas que caem e estouram de novo | estouro violeta/dourado com flash; verbo `split` aparece                                                                                                             | luz no estouro, faíscas que acompanham a queda                                                                        |

Resumo por arma: as que **já cumprem** a regra "o efeito explica a mecânica": Chama de Yah, Fúria, Quebra-Junta,
Tempestade, Espada de Fogo. As que **ainda não**: Aura de Yah (raio some), Fogos-Fátuos (pequenos), Adagas/Leque (pouco
brilho, Elo quase igual à base), Maça base (impacto discreto). Todas sofrem o item 1 (nenhuma ilumina o chão).

## Acertos, mortes, itens, status

- **Acerto**: ver item 9. Resto resolvido (NF-01, NF-05, NF-06). Pendente de fora: o acerto no chefe e a barra do
  chefe não têm marcação de **ponto fraco** (Sea of Stars ref-05: "chefe com ponto fraco brilhante"). Sugestão menor:
  um brilho mais forte no sino do Sineiro (é o objeto do chefe) quando ele está em aviso.
- **Mortes**: puffs e estrelas já (RF-05). Pontos novos da Cripta: a morte da Ossada comum **não é morte** (vira
  pilha, item 2): precisa de um desenho de **colapso** distinto do desenho de **morte final**; a morte do Esqueleto e do
  Espírito Gélido deveria ter flocos azuis (o Espírito some como névoa, não como poof branco) e a do Morcego Vampiro
  poucas penas vinho. Custo: faíscas do pool, por `def`.
- **Itens** (gemas, baú, pickups): feito (RF-03, RF-04, RF-05). Sem novos achados na Cripta.
- **Status**: gelado, lento, queimando, sangrando, atordoado já têm marcas (CLAUDE.md). Falta: **lento pelo limo** e
  pelo Toque Gélido no herói (itens 6 e 8) e **Frozen/Slowed dos inimigos** com a cor Cripta (o `TINT.slowed` sobre
  sprite branco praticamente não se vê).
- **Avisos de chefe**: já seguem o AR-03 (círculos com anéis, rim tracejado). Os pontos do Sineiro estão nos itens
  4 e 5. O aviso do Cavaleiro Negro, do Lobo Velho e da Mãe-Aranha **não foram revistos** aqui (fora da Cripta).

## Já feito ou planejado (não repetir)

RF-01 a RF-11, NF-01 a NF-10, AR-01 (escuridão e luz, **mas ver o achado: a luz dos efeitos ficou só em projéteis**),
AR-03 (avisos como forma no chão), FT-02, FT-14, FT-15, FT-16 (parcial: a arte final dos novos é do visual-director),
"Fogos-Fátuos com rastro, sinos balançando, rastro e faísca de gema coletada, Tempestade escurecendo a tela"
(`docs/design/backlog.md:1353`, parado em "Efeitos menores"; o item 5 retoma "sino balançando"). Sons: não existe receita
para estouro, pilha, escavar nem sino (`render/sounds.ts` sem entradas); é decisão do ui/sound, mas o item 4 se apoia
nela.

## Custo de desempenho (resumo)

| #   | Item                      | Novo por quadro                                          | Risco                                                             |
| --- | ------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Luz e aditivo nos efeitos | ≤8 estampos de luz, +1 Graphics aditivo                  | fill-rate dos halos grandes; manter alfa baixo e raio ≤ área real |
| 2   | Pilha                     | 1 anel por pilha visível (≤24), ≤8 faíscas por transição | nenhum                                                            |
| 3   | Estouro                   | ≤10 faíscas, 1 luz, 1 mark de mancha                     | nenhum                                                            |
| 4   | Dobre Fúnebre             | troca a cunha por um anel (menos primitivas)             | nenhum                                                            |
| 5   | Badalada                  | 8 ovais + 2 anéis por 1,1 s a cada 8 s                   | nenhum                                                            |
| 6   | Orbe frio                 | mesmo número de tiros (≤16), + luz fraca                 | nenhum                                                            |
| 7   | Covas                     | marcas já existentes, começam antes                      | nenhum                                                            |
| 8   | Limo                      | mesmo desenho                                            | nenhum                                                            |
| 9   | Acerto em cor             | só muda a cor da tinta                                   | nenhum                                                            |

Regras de respeito: nenhum item usa tremor de tela (só o Dobre mantém o tremor que já tem, que é de chefe), todos
param no `calm` (menos luz, menos faíscas, sem faixa rolando), e nenhuma informação depende só de piscar
(sempre forma no chão ou cor).

## Ordem sugerida

1. Item 2 e 3 (a mecânica nova da Cripta fica visível: custo mínimo, ganho alto de leitura).
2. Item 4, 5 e 6 (chefe e atirador: leitura e cor corretas).
3. Item 9 (acerto branco sobre branco).
4. Item 1 (luz nos efeitos): maior ganho de identidade, mas o único que muda a forma de todo o `fx.ts`; medir com F4
   antes e depois.
5. Itens 7 e 8.
