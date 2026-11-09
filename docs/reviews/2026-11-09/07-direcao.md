# Revisão 2026-11-09 · Direção (game-director)

Commit `3b9939c`. Li o CLAUDE.md, os relatórios 00 a 06 desta pasta, o backlog, os dados atuais (`config.ts`,
`stages.ts`, `weapons.ts`, `evolutions.ts`, `upgrades.ts`, `shop.ts`, `characters.ts`, `enemies.ts`) e o cânone do
original para os heróis. Nada de código foi tocado. Os itens aceitos estão em `docs/design/backlog.md`, seção
"Revisão 2026-11-09", todos marcados `· proposto` (esperando a aprovação do Daniel).

## Decisões que só o Daniel pode tomar

| #   | Decisão                                                                                                             | Opções                                                                                                                                                                      | Minha recomendação                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Desligar `unlockAllHeroes` e `unlockAllStages` no jogo publicado** (D-06; 02 #9, 03 #3, 05)                       | (a) desligar agora; (b) esperar mais testes                                                                                                                                 | **(a), logo depois de NB-09 (comprar herói com confirmação) e NB-02 (tela final que cabe).** O `?dev` já libera tudo com save próprio, então os interruptores não servem mais para testar, e enquanto estiverem ligados a compra de herói, "Nova fase liberada" e "Próxima fase" (RU-05) não existem para ninguém. Atenção: o save real do Daniel passa a mostrar só o que ele comprou e venceu; para testar, `?dev`. |
| 2   | **Nome do Elo: segredo até a primeira forja, ou revelado em todo lugar** (05 #4)                                    | (a) segredo até a primeira forja em todas as telas; (b) nome sempre visível                                                                                                 | **(a).** Combina com o Livro de Elos ("???") e com o momento da forja, que vira a revelação. O que nunca é segredo é a **passiva** da receita: a carta diz "Elo de Lâmina de Valmor: + Força" antes de forjar e "Elo Fúria: + Força" depois. A dica de combinação fica; só o nome é surpresa.                                                                                                                         |
| 3   | **Escudos (e toda arma que empurra): medidos na faixa com o empurrão, ou aceitos como defesa** (01, desequilíbrios) | (a) o lab passa a medir com bonecos que são empurrados e voltam andando, e os escudos são ajustados na faixa `area`; (b) os escudos ficam fora da faixa como arma de defesa | **(a).** Hoje os escudos não matam (DPS real 24, a menor do jogo) e quase não salvam (Cripta Loja inteira 53 contra 52 de 64 com o empurrão de 150 e de 600): não são defesa de verdade, são uma carta morta. Medir com empurrão corrige também Martelo, Chama de Yah e Muralha. Até o lab novo, nenhuma mudança de dados nos escudos (NE-06).                                                                        |
| 4   | **Correção da Maça de Ferro: mais alcance e menos dano** (01, NE-01)                                                | (a) `radius` 48–60 para 60–75 e `damage` x0,75; (b) só raio (fica fora da faixa, lab 601); (c) deixar                                                                       | **(a).** O que falta é alcance, não dano: o bot acerta alguém em só 62% das pancadas e o Teo caiu de 56% para 31% em Valmor com meia Loja. Com (a) o lab fica em 91% (na faixa) e a variante sobe Valmor meia Loja de 9 para 13 de 24. A arte nova da pancada (NF-03) desenha esse raio.                                                                                                                              |
| 5   | **Luta do chefe: corrida de 15 s ou luta de 30 a 45 s** (01, NE-05; já perguntado na "Rodada UI e features")        | (a) subir a vida dos chefes até a mediana dar 30 a 45 s com Loja inteira; (b) deixar como está                                                                              | **(a).** O chefe é o clímax dos 10 minutos e hoje cai em 13 s (Loja inteira) e 16 s (meia), a meta da R2 era 45 a 90 s. Não peço 90 s porque 18 de 49 corridas de meia Loja em Valmor já morrem com a onda das 9:00 em campo. Recalibrar `bossFast` e `hit120` junto.                                                                                                                                                 |
| 6   | **Regra do esmagamento do Quebra-Junta** (02 #2)                                                                    | (a) esmaga só quem estava tonto **antes** do golpe; (b) "a onda esmaga o que a pancada acabou de atordoar"                                                                  | **(a), dentro do NB-01.** O verbo fica "a pancada atordoa, o tremor esmaga": dá ritmo e um motivo para ficar perto. Com (b) o esmagamento vira +21% fixo, sem verbo. O dano é reajustado para a faixa depois.                                                                                                                                                                                                         |
| 7   | **Dois sistemas novos para retenção e profundidade** (ND-01, ND-02)                                                 | aprovar, adiar ou recusar cada um; nomes                                                                                                                                    | **Aprovar ND-01 (perigo por fase vencida) primeiro**, depois ND-02 (um traço por herói). Os nomes são do Daniel: "Perigo" e os nomes dos traços abaixo são só rótulos de trabalho.                                                                                                                                                                                                                                    |

As perguntas de lore abertas no backlog (Yah numa arma de fogo, Cavaleiro Negro, lore sem uso) continuam abertas;
nada nesta revisão depende delas.

## As 3 recomendações que mais importam

1. **Fechar os furos que quebram a partida antes de qualquer coisa nova.** O Quebra-Junta deixa o herói imortal na
   Noite Sem Fim (27 de 39 vigílias batem o teto de 30 min, zero golpes por minuto com Pressa e Alcance no máximo);
   a tela final de uma vitória boa empurra os botões para fora da tela e trava o toque (360x640, 820x420, e o mouse em
   1000x680); Desistir na vigília joga fora tudo o que ela rendeu. Os três atacam o pilar 4 justamente no melhor
   momento da partida: a vitória, a vigília e o recorde. São NB-01, NB-02 e NB-03, todos pequenos.
2. **Os Elos precisam render e ler como prometem.** Metade do que foi feito ontem só aparece pela metade: as rajadas
   de alvo aleatório perdem até 70% dos tiros (a Tempestade rende 1,2x a base no sim, o lab diz 4,2x), a investida
   da Vigília acontece em 6% dos passos, um baú que forja apaga o momento da forja, e os Elos de área pintam a
   multidão de branco e de laranja. Consertar (NB-04, NB-07, NB-05, NE-02) e tornar legível (NF-01, NF-02, A-04) é
   o que faz o redesenho dos Elos valer.
3. **Depois, o próximo passo de design é dar ao veterano e a cada herói uma razão própria para voltar.** Com a Loja
   inteira o sim vence 98% em Valmor e a Andilla vence 100% na Cripta; e os quatro heróis só diferem por números e
   pela arma inicial. Um nível de perigo por fase vencida (ND-01) e um traço que muda uma regra por herói (ND-02) são
   os dois sistemas que mais movem os pilares 3 e 4, sem conteúdo novo de lore.

---

## Leitura de design: onde o jogo está

**O que já funciona.** As nove metas de fase x Loja estão dentro (16 sementes: Valmor 13/48/98, Cripta 0/17/81,
Estrada 0/0/52), o primeiro Elo sai na mediana aos 5,6 min, a Loja inteira custa 57 corridas (meta 40 a 60), os 13
Elos têm verbo próprio e todos acontecem (menos a investida da Vigília), nenhum erro de console em nenhum fluxo do QA,
e a identidade visual se manteve. O redesenho dos Elos (forja na hora, elemento, verbo, momento, Livro) é o maior
salto de profundidade do jogo até aqui.

**Contra os pilares:**

| Pilar                   | Diagnóstico                                                                                                                                                                                                                                                          | O que move mais                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1 Rápido de entrar      | Bom no fluxo; o atrito é de tela: Loja em 360 px com itens inalcançáveis, celular deitado pequeno cortando Pausa e level-up, chão quadriculado na primeira tela.                                                                                                     | RB-05 (reaberto), NA-01                  |
| 2 Decisão a cada 30 s   | Subidas de nível frequentes, mas: o baú da elite morre fora da tela sem aviso (as setas saíram em `fb215a6`), a carta de arma nova esconde a receita quando a descrição é longa, avisos do HUD cobrem as cartas, Trocar e Banir mentem quando só sobram recompensas. | NU-01, NU-02, NB-08, NB-11               |
| 3 Profundidade de build | Os Elos são o ponto forte, mas três deles rendem menos do que mostram (Tempestade, Vigília, Quebra-Junta de jeito errado), os escudos são uma carta morta, a maça caiu e levou o Teo junto. Os heróis não mudam regras, só números.                                  | NB-01, NB-04, NB-07, NE-01, NE-06, ND-02 |
| 4 Progressão que puxa   | Economia certa e Coleção completa. Mas a vitória boa trava a tela, a vigília pode ser perdida pela pausa e farmada pelo Quebra-Junta, e o veterano não tem mais desafio.                                                                                             | NB-02, NB-03, NB-01, ND-01               |
| 5 Caos legível          | O ponto fraco desta rodada: os verbos novos trouxeram de volta o branco em massa, as pilhas de números e o chão somado (Espada de Fogo, Nevasca); o sangramento pinta inimigos de verde de Gosma; o herói ferido perde a cor.                                        | NF-01, NF-02, A-04, NF-05                |
| 6 Eterra de verdade     | Sem problema novo. A Estrada do Sul não tem cara de estrada no celular (arte, não lore).                                                                                                                                                                             | NA-02                                    |

**Elos (evoluções).** O sistema está certo; o que falta é que cada Elo cumpra a promessa no jogo de verdade, não só
no lab. Regra que eu quero daqui para frente: **todo verbo de Elo tem um teste que o exercita dentro da multidão**
(o teste da Vigília passava com um inimigo sozinho fora do círculo, e o do Quebra-Junta só fora da pancada), e o sim
imprime quantas vezes cada verbo aconteceu, como o `t/controlled.test.ts` do balance-tester fez. Isso vira o aceite
do NB-07 e do NB-01. Também vale ler o resultado da regra de forja: três passivas servem a dois Elos cada (Força,
Armadura, Crescimento). É um bom conflito de build (quem leva Lâmina e Fogo disputa a Força), e não proponho mudar.

**Conteúdo novo.** Ainda não é o gargalo. Com 13 armas, 13 Elos e 3 fases, o próximo conteúdo de valor é uma quarta
fase do Capítulo 1 (Pasto do Vau, Vau do Corvo, caminho de Erukh estão na lista de ideias), e ela depende de lore do
Daniel. Fica como pergunta, não como item.

**Retenção.** A Loja fecha em ~57 corridas e a Coleção dá metas de longo prazo, mas depois da Loja inteira o jogo
vira passeio (98% em Valmor, 81% na Cripta). O sistema que mais rende aqui, e que já era o primeiro da lista de
ideias de ontem, é o **perigo por fase vencida** (ND-01): reaproveita o `mult` das fases, paga mais ouro e dá ao
veterano uma escada visível na Preparação. O segundo é o **traço por herói** (ND-02): hoje escolher o herói é escolher
a arma inicial e um número; com uma regra própria, cada herói pede outra build, o que multiplica a profundidade sem
arma nova.

---

## Triagem dos relatórios

Formato: relatório e achado → item no backlog. "Mesclado" quer dizer que vários achados viraram um item só. No 05-ui, os números
são os das seções de proposta (#1 a #11), não os da tabela de achados.

### Mesclados (o mesmo problema em mais de um relatório)

| Item                         | Achados                                                                                                             | Notas                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| NB-01 Quebra-Junta trava     | 01 B1 (alta: herói imortal na vigília), 02 #2 (esmagamento sempre no centro), 02 #6 (tontura e habilidade do chefe) | uma correção de mecânica para os três; ver conflito 2                |
| NB-02 Tela final             | 03 #1 (alta), 05 #1 (alta), 04 "não capturado"                                                                      | regra de encaixe do 05 + duas colunas em 1000x680 do 03              |
| NB-03 Desistir na vigília    | 02 #1, 03 #2                                                                                                        | mesma correção nos dois                                              |
| NB-08 HUD sobre a escolha    | 03 #9, 05 #2                                                                                                        | `quiet()` do 05                                                      |
| NB-10 Textos de ritmo        | 01 B5, 02 #7, 03 #5, 04 #16                                                                                         | Lâmina e Fúria "a cada dois"; comentários; `slamImpact` morto        |
| D-06 Travas abertas          | 02 #9, 03 #3, 05 (lateral)                                                                                          | decisão 1; o teste do `playtest.unlockAll` vira NT-02                |
| RB-05 Celular pequeno        | 03 #4, 04 #2, 04 #15                                                                                                | Loja em 360 px em pé e em 640x360 deitado, level-up e Pausa          |
| NF-01 Flash só em alvo único | 04 #3, 06 #1 (parte 4)                                                                                              | regra única por tipo de acerto                                       |
| NF-02 Chão e tintas          | 06 #1, 06 #6, 06 #7                                                                                                 | divisor por contagem; tintas de queima e sangramento claras          |
| NF-03 Maça visível           | 06 #3, 06 #10, 04 #16 (cor das faíscas)                                                                             | depois do NE-01, para desenhar o raio novo                           |
| RF-04 Reviver sem véu        | 04 #16, 06 #14                                                                                                      | reaberto                                                             |
| CC-06 Bestiário silhueta     | 04 #8, 05 (lateral)                                                                                                 | reaberto: o aceite "não vistos sem nenhum dado" não foi cumprido     |
| NA-08 Selo MODO DEV          | 04 #11, 03 #10, 05 (lateral)                                                                                        |                                                                      |
| NU-03 Pausa                  | 05 #5, 05 #6, 04 #15                                                                                                | lista compacta, interruptores numa linha, atributos, larguras iguais |
| NU-08 Página do Elo          | 04 #10, 03 #11                                                                                                      | painel, um Voltar só, Esc volta ao Livro                             |
| NU-09 Loja com nível         | 05 #11, 04 #16                                                                                                      | promove "Loja com ícones, grupos e pips" das ideias                  |
| NU-04 Carta completa         | 05 #6, 02 #10 (Fogos-Fátuos nível 4)                                                                                |                                                                      |
| NT-03 Código morto           | 02 #7, 02 #8, 02 #10 (aspas), 04 #16 (comentário do `buildPanel`)                                                   |                                                                      |

### Aceitos (um relatório só)

- **01-balance**: B2 → NB-04; B3 → NB-07; B4 → NE-03; maça → NE-01 (decisão 4); Tempestade → NE-02; Badalada 600 →
  NE-04; luta do chefe → NE-05 (decisão 5); escudos → NE-06 (decisão 3).
- **02-code**: #3 → NB-06; #4 → NB-05; #5 → NB-12; #10 (alocação por quadro) → NT-01.
- **03-qa**: #6 → NB-09; #7 → NB-11; #8 → NB-13; #10 (opções divididas com o `?dev`) → NT-04.
- **04-visual**: #1 → NA-01; #4 (sem mudar a largura) → NA-02; #5 → A-04 reaberto; #6 → NA-03; #7 → NF-05; #9 → NA-06;
  #12 → NA-04; #13 → NA-05; #14 e o resto do #16 → NA-07.
- **05-ui**: #3 → NU-01 (regressão, promovido das ideias); #4 → NU-02 (decisão 2); #7 → NU-07; #8 → NU-06; #9 →
  NU-05; #10 e #11 (Preparação) → NU-10.
- **06-vfx**: #2 → NF-04; #4 → NF-06; #5 → NF-07; #8 e #11 e a Estrela em arco da tabela → NF-08; #9 → NF-09; #13 →
  NF-10.

### Rejeitados ou adiados (e por quê)

| Proposta                                                               | Decisão                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 B1, paliativo `jointBreaker.stun` 0,5 → 0,15 só com dados           | **Só como plano B.** Esconde a trava sem consertar a regra (com 0,3 ainda dá 0 golpes por minuto). A correção é mecânica (NB-01).                                                                                                                                            |
| 02 #6, parar a habilidade do chefe enquanto ele está tonto             | **Rejeitado como código; aceito como documentação** (dentro do NB-01). Com `bossStun` 0,1 s o efeito é mínimo, e um chefe que congela no meio da investida telegrafada lê pior do que um que a completa. O CLAUDE.md passa a dizer que a tontura não interrompe habilidades. |
| 04 #4, Estrada com `width` 520 → 440                                   | **Rejeitado.** Muda o equilíbrio de uma fase que está no limite da meta (52% com a Loja inteira, meta 35 a 55%). A identidade da estrada se resolve com arte (banco de neve na borda, tile próprio): NA-02.                                                                  |
| 04 #5 (c), `maxDamageNumbers` 24 no retrato                            | **Adiado.** Primeiro (a) zona sem número e (b) orçamento por quadro; só se ainda empilhar.                                                                                                                                                                                   |
| 06 #12, Procissão some com a multidão colada                           | **Não é item.** O próprio relatório diz que é o caso extremo da mecânica; vai para o teste de jogo do Daniel.                                                                                                                                                                |
| 01, Aura de Yah e Espadas com DPS real baixo; heróis fora de 20 pontos | **Sem mudança.** O bot não entra na multidão (RE-03) e ±12 pontos é ruído com 16 corridas; a maça (Teo) é o único desvio com causa, e tem item.                                                                                                                              |
| 05 (lateral), barras do HUD redesenhadas a cada quadro                 | **Só medir**, dentro do L-01. Sem alocação, não é regra quebrada; vira item se o F4 no celular mostrar custo.                                                                                                                                                                |
| 03 #12, FPS no stress test em software                                 | **Sem item novo**: L-01 continua aberto e é onde isso se mede.                                                                                                                                                                                                               |
| 05 #7, rótulo "Sozinha" para a categoria `auto`                        | **Trocado** por "Automática" (NU-07): "Sozinha" lê como "sem companhia".                                                                                                                                                                                                     |

### Conflitos entre relatórios e minha decisão

1. **Tela final (03 #1 contra 05 #1).** O 03 sugere botões no rodapé, Elos numa linha e duas colunas em 1000x680; o
   05 traz uma regra de encaixe em etapas. **Decisão:** a regra do 05 (rodapé fixo fora do bloco que recebe o
   `offset`, compactar em etapas até caber), com o layout de duas colunas do 03 sempre que a largura permitir, não só
   quando `isShort`. Um item, NB-02.
2. **Quebra-Junta (01 B1 contra 02 #2).** O 01 propõe "só a pancada atordoa" ou imunidade depois da tontura; o 02
   pede uma decisão sobre o esmagamento no centro. **Decisão:** só a pancada atordoa; a onda e o tremor batem e
   empurram, mas não atordoam nem renovam; uma tontura em curso não é renovada; o esmagamento conta só a tontura de
   antes deste golpe. Assim o verbo fica "pancada atordoa, tremor esmaga" e a trava some na raiz. A imunidade fica de
   reserva se a medição da vigília ainda der menos de 60 golpes por minuto.
3. **Flash branco (04 #3 contra 06 #1.4).** O 04 quer flash só em golpe de um alvo, ou uma tinta em gradiente; o
   06 quer flash só nos primeiros acertos de cada raio, pelo `numberBudget`. **Decisão:** uma regra por tipo, não por
   orçamento: flash branco só em acerto de alvo único (projétil, arremesso, raio sem corrente); todo acerto de área ou
   de vários alvos (arc, slam, aura, zone, strike em rajada e os verbos split, chain, wave, ricochet, ward, ground) usa
   squash e faísca. O vfx-director escolhe o desenho.
4. **Números de dano (04 #5 contra a regra atual do A-04).** O orçamento por disparo só cobre `arc` e `strike`.
   **Decisão:** orçamento por quadro, que cobre todos os verbos de uma vez, e zona sem número como aura.
5. **Reviver (04 #16 contra 06 #14).** Anel de nível ou raios de baú. **Decisão:** o vfx-director escolhe; a regra é
   só "nenhum véu de tela inteira".
6. **Pausa (04 #15 contra 05 #5).** Um pede larguras iguais, o outro um layout compacto. **Decisão:** um item só
   (NU-03), com as duas coisas.
7. **Loja em telas pequenas (04 #2 em pé contra 03 #4 deitado).** Regras de colunas diferentes. **Decisão:** o RB-05
   reaberto cobre as duas orientações com um critério só: largura mínima do card 150, altura mínima 40, um degrau a
   mais abaixo de ~380 px de altura, e o detalhe encolhe antes de sobrepor.
8. **Maça (01 contra 06 #3).** Não é conflito, é ordem: primeiro NE-01 (o raio muda), depois NF-03 (a arte desenha o
   raio novo).

---

## Próximos 5 (sugestão)

1. **NB-01** Quebra-Junta trava todos os inimigos (vigília imortal)
2. **NB-02** Tela final sempre cabe, ações presas no rodapé
3. **NB-03** Desistir na Noite Sem Fim grava o que a vigília rendeu
4. **NB-04 + NE-02** Rajadas completas, e a Tempestade medida de novo
5. **NF-01 + NF-02** Multidão legível sob os Elos de área (flash e chão somado)

Logo atrás: NB-05 (baú que forja), NB-06 (cura com 0 de vida), RB-05 (celular pequeno), NE-01 (maça, decisão 4) e
NU-01 (setas para baú e elite). Depois das correções, o primeiro sistema novo é ND-01.

## Como saber se funcionou

- `SIM_SHOP=full SIM_VIGIL=1 npm run sim`: vigílias com Quebra-Junta com a mesma distribuição das sem ele (mediana de
  2 a 4 min, nenhuma no teto de 30 min); `t/stunlock` com 60 golpes por minuto ou mais.
- `ELO X` da Tempestade ≥ 2,5x no sim de 16 sementes depois do NB-04; Vigília com investida em pelo menos 30% dos
  passos com inimigos fora do círculo.
- Teo em Valmor meia Loja de volta à faixa da fase (±20 pontos de 48%).
- Luta do chefe com mediana de 30 a 45 s com a Loja inteira, sem tirar Valmor meia Loja da meta de 40 a 60%.
- QA: tela final com 6 armas, 2 Elos, fase liberada e 4 conquistas tocável em 360x640, 820x420, 640x360 e 1000x680.
- Capturas do visual e do vfx com Espada de Fogo, Nevasca, Estrela de Lyra e Quebra-Junta sobre 400 inimigos, onde dá
  para contar os inimigos dentro do golpe.
- Para o Daniel testar: `?dev` (todos os heróis e fases, Loja grátis), Teo com a maça nova e o Quebra-Junta na
  vigília.
