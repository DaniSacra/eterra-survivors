# Revisão 2026-11-11 · Direção (game-director)

Commit `7e51776`. Li o CLAUDE.md, os relatórios 00 a 06 desta pasta, o `docs/design/backlog.md`, o
`docs/art/references/sea-of-stars/README.md`, os dados da Cripta (`data/stages.ts`, `data/enemies.ts`) e, para o que
toca lore, `dungeon-rpg/docs/mundo/` (`pendencias.md` sobre o Sineiro, `historias/prologo.md` e
`historias/capitulo1-aldo-sozinho.md` sobre as fontes de luz). Nada de código foi tocado. Os itens aceitos estão em
`docs/design/backlog.md`, seção **"Revisão 2026-11-11"**, todos `· proposto` (esperando a aprovação do Daniel). Itens
antigos que esta revisão reabre ou amplia mantêm o ID e ganharam um parágrafo "Revisão 2026-11-11" no próprio lugar.

## As 3 recomendações que mais importam

1. **Fazer as peças da Cripta morderem de verdade antes de mexer no `mult`.** A Cripta tem sete peças novas e
   nenhuma muda o resultado fora do ruído (01-balance: tirar qualquer uma muda de 8 para 4 a 14 vitórias em 64). Não é
   porque o desenho está errado: é porque três delas estão quebradas pela metade. A pilha da Ossada morre no segundo
   acerto do mesmo ataque, então contra aura, órbita e zona ela quase nunca remonta (02 M2); as Ossadas do Coveiro
   nascem com 14 de vida aos 9:00, quando a comum tem 168 (01 B1, 02 M4); o limo da Gosma prende o herói 0,19% do tempo
   porque o teto de 5 manchas é da fase toda, não de cada gosma (01 B2, 02 B3). Consertar essas três (CB-01, CB-02,
   CE-01) e **só depois** recalibrar a meia Loja (CE-02). Ajustar o `mult` antes seria calibrar um bug.
2. **Ensinar a Cripta na tela, não no Bestiário.** A fase pede "limpeza" (acabar o serviço) e o jogador não tem como
   saber: a pilha não tem relógio, a Badalada e as covas usam a mesma cor de perigo do Dobre Fúnebre (que fere) mas não
   ferem, o orbe do Espírito Gélido sai rosa de uma mão azul, a tela final diz "tombou na neve" dentro de uma cripta e
   não diz o que matou. Um vocabulário só (coral fere, osso pálido invoca, verde atrasa), a pilha com relógio, uma dica
   na primeira vez de cada inimigo e "Caiu por" no fim (CF-01, CF-04, CU-01, CU-02) transformam cinco mecânicas
   confusas numa fase que se aprende entre uma partida e a outra. É o pilar 5 e também o 4: a derrota que ensina é a
   que pede "só mais uma".
3. **Dar à Cripta uma decisão de rota: a Fonte de Luz (CD-01).** O cânone já tem o objeto: as fontes de luz "curam e
   guardam a memória de quem passa", e há uma na cripta do original ("A fonte de luz cura e salva"). Hoje a parede da
   Cripta cai entre 4:00 e 5:30 (25 de 37 mortes da meia Loja), logo antes do primeiro Elo. Uma fonte que acende longe
   do herói às 3:30, 6:00 e 8:30 e cura quem fica dentro (enquanto a horda fecha o círculo) responde a essa parede com
   uma escolha arriscada em vez de um corte de dano, e quebra o círculo largo de autopiloto (pilar 2). É o único sistema
   novo que proponho nesta rodada, e é pequeno: uma marca nova no pool que já existe.

---

## Leitura de design: onde o jogo está

**O que já funciona.** Base verde (395 testes, lint, typecheck, build). As bandas do lab estão todas dentro (aimed 87 a
100%, auto 55 a 56%, área 44 a 46%; Elos 3,8x a 4,6x as bases). Metas: Valmor 3/47/97, Cripta 0/13/80 (192 corridas),
Estrada 0/0/38; a Loja inteira custa 52 a 54 corridas (meta 40 a 60). Nenhum erro de console em ~30 sessões do QA,
nenhuma tecla dupla. As quatro fases temáticas do plano de ontem (FT-01 a FT-16) estão no jogo, e os sprites PixelLab
da Cripta ficaram da mesma família do Aldo (04-visual: "Morcego, Espírito Gélido e Gosma são os melhores exemplos").
Em dois dias o jogo passou de três fases parecidas para três fases com verbos próprios. A Cripta é a primeira fase
que tem cara do alvo do Daniel (Sea of Stars).

**Contra os pilares, olhando a Cripta:**

| Pilar                   | Diagnóstico                                                                                                                                                                                                                                                                                | O que move mais                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| 1 Rápido de entrar      | Bom. Atrito só no celular: "Nv" de 14 px sobre a barra, joystick quase invisível no chão violeta.                                                                                                                                                                                          | CU-06                            |
| 2 Decisão a cada 30 s   | A Cripta pede limpeza, mas a melhor rota continua sendo o círculo largo: o limo não prende, a pilha não ameaça quem tem arma de área, nada no mapa vale um desvio. As cartas de arma nova chegam sem números.                                                                              | CB-01, CE-01, CD-01, CU-05       |
| 3 Profundidade de build | Bandas e Elos saudáveis. A pilha que só remonta contra mira única é uma regra que pune uma categoria e ignora as outras por acidente. Observação para a próxima rodada: a armadura plana corta 70% da mordida às 1:00 e só 10% às 9:00 (01-balance), perde valor justo na parte dura.      | CB-01                            |
| 4 Progressão que puxa   | Economia certa. Faltam a lição da derrota ("Caiu por") e a escada do veterano (ND-01 continua proposto). Desistir pula a tela final.                                                                                                                                                       | CU-02, CU-08, ND-01              |
| 5 Caos legível          | O ponto fraco desta rodada. Efeitos não são luz na fase mais escura (só 3 usos de `Lighting`), o chão da Cripta é o mais claro e o mais ruidoso das três fases, o herói se perde no monte, a cor de perigo é a mesma para o que fere e o que invoca, o flash branco apaga sprites brancos. | AR-01, AR-02, A-02, CF-04, CF-06 |
| 6 Eterra de verdade     | Sineiro, Badalada e Dobre vêm do original; a Fonte de Luz também. Textos provisórios de inimigos novos esperam o Daniel (02 B7).                                                                                                                                                           | CD-01, decisões 2 e 3            |

**Elos (evoluções).** Nada quebrado nesta rodada: ELO X normal no lab, 4,0 Elos por corrida com a Loja inteira, 1º Elo
aos 5:30 (5:00 na meia Loja). O único aberto continua o NE-02 (Tempestade). O que a Cripta revela sobre os Elos: a
parede das 4:00 às 5:30 é exatamente o vale antes do primeiro Elo. Não proponho adiantar o Elo (o E-08 fixou 5 a 7 min
de propósito, a forja precisa ser conquista); proponho dar ao jogador uma ferramenta para atravessar o vale (CD-01) e
medir, depois do CB-01, quantas pilhas remontam por categoria de arma: se só as builds de mira sofrem a pilha, a Cripta
vira "a fase das armas de área" e a escolha de build some. A medida vai no aceite do CB-01.

**Conteúdo novo.** Não proponho inimigo nem Elo novo. A Cripta tem conteúdo de sobra para o que ensina; falta ela
funcionar e se explicar. O próximo conteúdo grande segue sendo o Pântano (FT-18), que depende das respostas do Daniel,
e a Gosma Verde pode migrar para lá quando ele existir.

**Retenção.** A Cripta sem Loja rende 67 de ouro por corrida contra 432 em Valmor: o jogador novo volta para Valmor, o
que é certo. O que falta é que a derrota na Cripta ensine (CU-01, CU-02, Bestiário com "Como lidar" no CC-06) e que o
veterano tenha escada (ND-01, ainda o próximo sistema grande depois desta rodada).

**Arte e referência Sea of Stars.** Os sprites acertaram; o gargalo é o cenário, a animação e a luz. A regra 4 do
README ("luz quente contra escuridão fria") não está cumprida na Cripta por dois lados ao mesmo tempo: o chão é claro
demais e os efeitos não acendem nada. A ordem certa é escurecer o chão primeiro (código, zero gerações) e depois
acender os efeitos (AR-01 reaberto): luz sobre um chão claro não aparece.

---

## Triagem dos relatórios

### Mesclados (o mesmo problema em mais de um relatório)

| Problema                                                                            | Relatórios                         | Item                                                         |
| ----------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Ossadas do Coveiro sem `hpMult`, cava longe, sem teto de `maxActive`                | 01 B1, 02 M3 (parte), 02 M4, 02 B4 | CB-02                                                        |
| Limo da Gosma que quase não existe; teto global de manchas                          | 01 B2, 02 B3, 06 #8 (visual)       | CE-01 (regra e dados), CF-07 (desenho)                       |
| Pilha de ossos: quebra no 2º acerto, sem relógio, invisível                         | 02 M2, 05 UI-01 (anel), 06 #2      | CB-01 (regra), CF-01 (desenho)                               |
| Mesma cor para o que fere e o que invoca; covas aparecem tarde; Badalada sem "sino" | 05 UI-04, 06 #5, 06 #7             | CF-04                                                        |
| "Tombou na neve" na Cripta; tela final sem a causa                                  | 03 B1, 05 UI-03                    | CB-04 (texto), CU-02 (causa)                                 |
| Sineiro a 1,5x: densidade de pixel errada e raio de contato que não acompanha       | 04 #6, 02 B6, 06 ("ponto fraco")   | CA-02                                                        |
| Efeitos sem luz; chão da Cripta claro demais; poças de luz fracas                   | 06 #1, 04 #2, 04 #10               | AR-01 (reaberto), AR-02 (ampliado)                           |
| Herói some no monte; vida baixa sem sinal perto do herói                            | 04 #3, 05 UI-03                    | A-02 (reaberto: contorno e sombra), CU-02 (barra sob os pés) |
| Bestiário: silhueta, grupos, "como lidar"                                           | 05 UI-06, CC-06 (aberto)           | CC-06 (ampliado)                                             |

### Aceitos (um relatório só)

- 02 M1 `elites25` só conta o Golem: CB-03.
- 02 B1 `markWeb` mexe na marca errada com o pool cheio: CB-05.
- 02 M3 (geral), B2, B9: CT-01. 02 "testes que faltam": CT-02. 02 B5 arte em código morta: CT-03 (decidi remover; o git
  guarda).
- 03 B2 chefe do `?dev` com a multidão errada: CT-04.
- 03 B4 R, X e B sem sinal com 0 cargas: dentro do CU-06.
- 03 B5 Desistir pula a tela final: CU-08.
- 01 corridas que não terminam (bot rodeando o chefe): CT-05 (ferramenta, não jogo).
- 04 #1, #5, #12: AR-02 ampliado. 04 #4: AR-05 ampliado. 04 #7 e #8: CA-03. 04 #9: CA-01.
- 05 UI-01: CU-01. UI-02: NB-08 reaberto. UI-05: CU-04. UI-07: CU-03. UI-08: CU-05. UI-09: CU-07. UI-10: CU-06.
- 06 #3: CF-02. #4: CF-03. #6: CF-05. #9: CF-06. Tabela de armas (Aura de Yah, Adagas e Leque, Maça base): CF-08. Sons
  que faltam (sino, pilha, estouro, pá): CS-01.

### Rejeitados ou adiados (e por quê)

| Proposta                                                                    | Relatório               | Decisão                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baixar `mult.damage` 1.65 para 1.5 agora                                    | 01 D1                   | **Adiado para o CE-02.** O ganho cabe no ruído e as peças vão ficar mais duras com CB-01, CB-02 e CE-01. Calibrar depois, com 32 sementes.                                                                                              |
| Dobre Fúnebre `every` 5 para 3,5                                            | 01 (Dobre)              | **Adiado.** Primeiro o Dobre precisa ler como sino (CF-03) e ter nome na barra (CU-03). Quem mata na luta é a mordida do corpo; acelerar o Dobre antes de ele ser legível é dano sem aviso claro. Reavaliar depois do CS-01 e do CF-03. |
| Limite de tempo na luta do chefe                                            | 01 (corridas aos 15:00) | **Rejeitado.** É o bot que foge; um humano que rodeia o chefe para sempre não é problema de design. O bot muda (CT-05).                                                                                                                 |
| Mexer em armas de área por DPS real baixo no sim                            | 01 D5, D6               | **Rejeitado.** Artefato do bot que foge; o NE-06 já cobre a medida certa.                                                                                                                                                               |
| Preparação recriada a cada seta                                             | 03 B3                   | **Rejeitado por ora.** Sem efeito visível; volta se o L-01 mostrar piscada no celular.                                                                                                                                                  |
| Herói 10% maior                                                             | 04 #3                   | **Rejeitado.** Muda a leitura de hitbox; contorno, sombra e barra resolvem sem mexer no tamanho.                                                                                                                                        |
| Moldura do HUD e ícones fora do estilo Pen                                  | 04 #14                  | Já no AR-04; a moldura das barras entra no CU-07.                                                                                                                                                                                       |
| Painel de atributos grande no level-up em 420x820, cabeçalho sobre inimigos | 04 #11, #15             | **Sem ação.** Decisão já tomada (A-11, RU-04); os próprios relatórios dizem aceitável.                                                                                                                                                  |
| Pausa por toque duplo de dois dedos                                         | 05 UI-10                | **Adiado** até o L-01 (celular real) mostrar o incômodo.                                                                                                                                                                                |
| Mortes com desenho por criatura (névoa do Espírito, penas do Morcego)       | 06 "Mortes"             | **Adiado.** Bonito, mas depois do colapso da pilha (CF-01), que é a morte que muda o jogo.                                                                                                                                              |
| Ponto fraco brilhante nos chefes                                            | 06 "Acertos"            | Entra no CA-02 como parte do sprite novo do Sineiro (o sino), sem sistema de ponto fraco.                                                                                                                                               |
| `bossKnight` com outro sentido                                              | 02 B8                   | **Sem ação.** Decisão já registrada; o save continua válido.                                                                                                                                                                            |

### Conflitos entre relatórios e minha decisão

| #   | Conflito                                                                                                                                         | Decisão                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Cor do relógio da pilha.** 05 UI-01: anel que vira coral no último segundo. 06 #2: "cor de perigo suave".                                      | **Osso e brasa, nunca coral.** A pilha não fere ao levantar; coral fica só para o que machuca ao tocar (regra do CF-04). O último segundo se lê pelo tremor, pelos olhos acesos e pelos ossinhos voltando.                  |
| 2   | **Cor da invocação.** 05 UI-04 e 06 #5: violeta-osso. 04 #2: o chão da Cripta já é violeta; e o roxo é a cor canônica da Lyra (`#d070e0`, A-02). | **Osso pálido (marfim) com contorno de tinta escura e lápides pequenas**, sem violeta. Violeta sobre chão violeta some, e roxo saturado é da Lyra. Ficam três cores de aviso: coral fere, marfim invoca, verde-limo atrasa. |
| 3   | **Flash de acerto.** NF-01 (feito): branco total em alvo único. 06 #9: na Cripta os inimigos são brancos e o flash vira mancha.                  | **Tinta na cor da faísca da arma (`HIT_SPARK`), clareada; branco só no crítico.** Vale para todas as fases (KISS, uma regra), e informa qual arma acertou.                                                                  |
| 4   | **Mais luz aditiva (06 #1) contra chão já claro demais por causa do brilho aditivo (04 #2).**                                                    | **Ordem: primeiro escurecer o chão (AR-02, valor das juntas e topos a 60-70%), depois as luzes dos efeitos (AR-01) com teto de 8 por quadro e halos de alfa baixo.** Medir F4 nas duas etapas.                              |
| 5   | **Limo: mais forte (01 B2) ou só mais bonito (06 #8)? E a Gosma vai para o Pântano (FT-18)?**                                                    | **Fica na Cripta e fica forte:** teto por gosma e os dados do 01, medidos no sim. Se o Pântano vier, ela migra com o rastro pronto. O desenho (CF-07) só entra depois de o limo pesar.                                      |
| 6   | **Dificuldade da meia Loja: baixar dano (01 D1) contra as peças que vão endurecer (CB-01, CB-02, CE-01).**                                       | Peças primeiro, `mult` por último (CE-02), alvo no meio da faixa (20 a 30%) para absorver o ruído de ±5 pontos.                                                                                                             |
| 7   | **Sineiro maior (04 #6) e raio de contato (02 B6).** Um corpo maior com raio 30 mente; raio maior morde mais.                                    | Sprite nativo maior e o `radius` acompanha o corpo visível; a luta é medida no sim (mediana de 22 a 39 s hoje) e a mordida pode cair um pouco para compensar.                                                               |
| 8   | **Dica de primeira vez (05 UI-01) contra o pilar 1 "sem paredes de tutorial".**                                                                  | **Aceita, sem pausar:** uma vez por save, no máximo uma a cada 20 s, nunca com chefe vivo, e "Dicas" nas Opções (ligada por padrão). É mostrar o verbo na hora em que ele aparece, não um tutorial.                         |
| 9   | **Conferir o chefe no `?dev` (chefe aos 5:00) contra a luta real (03 B2).**                                                                      | O `?dev` passa a trazer a escolta da última faixa quando o chefe vem cedo (CT-04). O teste do Daniel tem de ver a luta que o jogador vê.                                                                                    |
| 10  | **Coveiro: a Maça interrompe a cova (02 B4)?**                                                                                                   | **Sim.** Tontura cancela a espera, como já faz no atirador. Dá à Maça de Ferro (arma do Teo) um papel claro na Cripta e é coerente com a regra "um stun corre, não se renova". Entra no CB-02.                              |

---

## Decisões que só o Daniel pode tomar

Seguindo a regra "decido e você revisa": onde marquei "decidi", o item já está escrito assim e basta ele vetar.

| #   | Decisão                                                                                                                                                       | Opções                                                                                                         | Minha recomendação                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Fonte de Luz na Cripta (CD-01)**                                                                                                                            | (a) aprovar; (b) só depois do ND-01; (c) não                                                                   | **(a).** É do cânone, cura (como no original) e responde à parede das 4:00 com uma escolha. Pergunta de lore junto: **a luz da fonte pode impedir que as Ossadas remontem dentro dela?** É o gancho mais bonito (a fonte "salva") e liga a fonte ao verbo da fase, mas é extrapolação minha: só entra se o Daniel disser que cabe. Sem isso, a fonte só cura. |
| 2   | **Texto de derrota por fase (CB-04)**                                                                                                                         | aprovar ou reescrever                                                                                          | Provisórios, sem fato novo: Valmor fica como está; Cripta "<herói> caiu na cripta. O sino ainda toca." (eco do `stages.valmor.won` e do Sineiro do original, "o sino vai tocar por você"); Estrada "<herói> caiu na Estrada do Sul. A matilha ainda uiva."                                                                                                    |
| 3   | **Textos provisórios dos inimigos novos** (02 B7: Mãe-Aranha, Coveiro, Ossada em Brasa, Espírito Gélido, Morcego Vampiro) e das dicas de primeira vez (CU-01) | aprovar ou reescrever                                                                                          | As dicas do CU-01 são instrução de jogo, não lore; as frases do Bestiário continuam esperando a revisão dele.                                                                                                                                                                                                                                                 |
| 4   | **Dicas de primeira vez e vinheta de vida baixa**                                                                                                             | ligadas com opção; desligadas                                                                                  | **Decidi:** as duas ligadas, "Dicas" nas Opções, vinheta fixa (sem pulso) no modo calmo.                                                                                                                                                                                                                                                                      |
| 5   | **Fantasma com rosto sorridente** (04 #8)                                                                                                                     | manter o rosto e escurecer o corpo; redesenhar mais ameaçador                                                  | **Manter o rosto** (a regra "um pouco cômico" do Sea of Stars) e escurecer o corpo 15 a 20%, olhos e boca acesos.                                                                                                                                                                                                                                             |
| 6   | **Ordem das gerações PixelLab** (40 + 5 por dia)                                                                                                              | a ordem do 04 (props ~30 antes de animação e chefe)                                                            | **Animação de andar do Morcego e da Ossada (3 a 6) e o Sineiro nativo (4 a 6) antes dos props (~30) e dos recolors (10 cada).** Movimento e chefe são o que o jogador olha; o chão melhora primeiro por código (AR-02, zero gerações).                                                                                                                        |
| 7   | **Bestiário: recolher por fase ou rolar** (05)                                                                                                                | recolher; rolar                                                                                                | **Decidi: recolher** (fase atual aberta, as outras com toque); arrastar para rolar briga com o toque.                                                                                                                                                                                                                                                         |
| 8   | **Desistir mostra a tela final** (CU-08)                                                                                                                      | sim; não (sair rápido é o ponto)                                                                               | **Decidi: sim**, com "Partida abandonada" e o ouro guardado. Quem desiste também deve ver o que levou (pilar 4); "Menu" fica a um toque.                                                                                                                                                                                                                      |
| 9   | Perguntas antigas que seguem abertas                                                                                                                          | Gosma no Pântano (FT pergunta 11), ordem das fases (12), nomes provisórios (2), Vazio (3), Cavaleiro Negro (5) | Sem mudança; nada desta revisão depende delas.                                                                                                                                                                                                                                                                                                                |

---

## Próximos 5 (sugestão; a lista do topo do backlog só muda com o Daniel)

1. **NB-08 (reaberto) + CB-03 + CB-04 + CB-05**: setas e avisos por cima das escolhas, `elites25`, texto de derrota,
   `markWeb`. Bugs pequenos, um dia.
2. **CB-01 + CB-02 + CE-01, depois CE-02**: as peças da Cripta funcionam, e só então a meia Loja volta à faixa.
3. **CF-01 + CF-04 + CU-01**: pilha com relógio, um vocabulário de aviso, dica na primeira vez.
4. **CU-02 + CF-06 + A-02 (reaberto)**: vida baixa, lentidão e "Caiu por"; acerto na cor da arma; herói achável no monte.
5. **CD-01 Fonte de Luz** (se aprovada); se não, **AR-02 (chão) e depois AR-01 (luz)**.

## Como saber se funcionou

- **Peças da Cripta** (sim, meia Loja, 64 corridas por variante): pelo menos uma peça sai do ruído (±5 vitórias) ao ser
  removida; limo com o herói dentro 2 a 5% do tempo; pilhas que remontam medidas por categoria de arma, sem nenhuma
  categoria abaixo da metade da outra.
- **Faixa** (32 sementes): Cripta 0% / 20 a 30% / 75 a 85%; morte mediana da meia Loja deixa de concentrar 2/3 entre
  4:00 e 5:30.
- **Leitura**: capturas 420x820 de pilha, estouro, covas, Badalada e Dobre ao mesmo tempo, em que cada aviso diz a
  consequência pela cor; o herói achado em menos de 1 s com 500 inimigos; F4 igual ou melhor depois da luz.
- **Aprendizado**: no playtest do Daniel, a segunda partida na Cripta quebra pilhas de propósito (ele conta se entendeu
  sem o Bestiário).
- **Fonte de Luz**: tempo dentro da fonte por corrida, curado por fonte, e a parede das 4:00 a 5:30 mais baixa sem a
  Loja inteira passar de 85%.
