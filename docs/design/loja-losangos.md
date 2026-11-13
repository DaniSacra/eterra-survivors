# Loja: níveis em losangos (spec)

Pedido de Daniel: mostrar o nível máximo como losangos, os comprados cheios, o que está sendo comprado em verde, o resto vazio. Veredito: **fazer, com ajustes**.

## Estado atual (lido em ShopScene.ts)
- Balcão de detalhe (`select`): texto "Nível 3 de 7" + barra de segmentos (dourado = tem, contorno dourado = próximo).
- Tile e cartão curto (`levelPips`): bolinhas douradas, ou barra de 44 px acima de 5 níveis.
- O carrinho (`ShopCart`) guarda **um** item e compra **um** nível por vez. Não existem "vários passos no carrinho": o único nível em compra é sempre `nível + 1`. Isso simplifica tudo.
- Máximos reais: 1 (Segunda Chance), 2 (Quantidade), 3 (Velocidade, Ímã), 5 (maioria), 10 (Força, Vida). Nunca 7 hoje, e 10 é o pior caso.

## O que dá certo
A ideia é boa: mostra a "distância até o topo" e o próximo passo de uma vez, como os pips do build e do Heróis. Substitui "4/7" em leitura rápida.

## O que pode dar errado, e o ajuste
1. **Daltonismo (verde x dourado).** `UI.ok` (0x7cc46a) e `UI.goldHex` (0xffd870) têm brilho parecido e confundem em deuteranopia. Não depender só da cor: o nível em compra muda de **forma e posição**: é um pouco maior (+2 px), tem contorno claro (`UI.textHex`) e fica **vazado por dentro com miolo verde menor**, com um pequeno triângulo "▲" ou pulso de brilho opcional. Owned = losango cheio dourado sem contorno claro. Vazio = só contorno `UI.border`. Assim os três estados diferem por preenchimento, não só por matiz.
2. **Máximo 10 em tela estreita.** 10 losangos de 14 px + 4 de vão = 178 px: cabe no balcão (largura útil >= 300 em 390 px). Mas **no tile de 96 a 120 px** não cabe (10 x 9 = 90 px de pips, apertado, e sem espaço para o verde). Regra: tiles e cartões curtos **mantêm** `levelPips` (bolinhas até 5, barra acima); só o balcão ganha losangos. O verde aparece nos tiles apenas como a bolinha seguinte quando o item está selecionado (opcional, fase 2).
3. **Máximo 1.** Um losango só, centrado ao lado do texto. Mostrar sozinho é pobre: manter o texto "Nível 0 de 1" e o efeito. Para Segunda Chance o losango verde vira "você está comprando a única".
4. **Itens de carga e revive** (Rerrolar, Pular, Banir, Segunda Chance): cada nível é "+1 uso por partida", não um número de atributo. O losango continua valendo (1 losango = 1 uso). Texto fixo: "Agora: 2 usos · Próximo: 3 usos" já existe via `effectAt`; manter.
5. **Perder a leitura do valor.** Os losangos não dizem quanto vale. Manter sempre: título "Nível 3 de 7" (já é `t.shop.levelOf`) e as linhas Agora/Próximo com o ganho (`effectAt`). Os losangos são ajuda visual, não substituem o número.
6. **Estados sem compra:** item **sem seleção** (tile) não tem verde. **Sem ouro suficiente:** o losango "em compra" fica verde apagado (contorno verde, miolo `UI.borderOff`), junto do texto vermelho "faltam X", para não prometer o que não dá. **Maxado:** todos cheios dourados, nenhum verde, selo "Completo" (`seal`) como hoje; sem "próximo".
7. **Toque.** Os losangos **não são alvos de toque** (só informação). Alvo continua sendo o botão Comprar (44 px de altura). Não tornar losango clicável para comprar.
8. **Acabou de comprar:** o verde vira dourado e o próximo vira verde, com um pulso curto (120 ms, escala 1.0 a 1.25). Respeitar "tela calma": sem pulso se a opção estiver ligada.

## Especificação visual (balcão)
Tokens: cheio `UI.goldHex`; em compra `UI.ok` + contorno `UI.textHex`; vazio contorno `UI.border` (fundo `UI.panel`); sem ouro: contorno `UI.ok` e miolo `UI.borderOff`.

| Máximo | Lado do losango | Vão | Largura total |
|---|---|---|---|
| 1 a 3 | 18 px | 6 | até 66 |
| 4 a 7 | 16 px | 5 | até 131 |
| 8 a 10 | 14 px | 4 | até 176 |
| > 10 | 12 px, e se não couber em `w - 24` cai para a barra atual | 3 | ver regra |

O losango "em compra" desenha +2 px de lado, sobe 1 px. Regra geral: `lado = min(18, (larguraÚtil - (max-1)*vão)/max)`, mínimo 10; abaixo disso usa a barra de segmentos atual (já existe). Alinhar à esquerda sob o nome, na linha onde hoje está a barra (`cy`), altura 20 px. Desenhar com uma única `Graphics` por seleção (já recriada em `select`), sem alocar por quadro.

```
[ícone]  Força
         Nível 3 de 7
 ◆ ◆ ◆ ◈ ◇ ◇ ◇        (◈ = verde, maior, miolo vazado)
 Agora    +15% de dano
 Próximo  +20% de dano
 faltam 40            [ Comprar 240 ]
```

## Consistência
- Pips do fim de partida e do build usam bolinhas/pips pequenos; manter. O losango é só da Loja (a Loja é o único lugar com um "próximo nível a comprar"). O dourado cheio é o mesmo "tenho" em todo lugar.
- Aba Heróis: sem mudança.

## Textos (pt-BR.ts)
Nenhum novo obrigatório. Opcional para leitor de tela/legenda: `shop.buyingNext: 'Comprando: nível N'` (sem traço longo). Manter `levelOf`.

## Para o visual-director
1. Nova função `levelDiamonds(scene, x, y, level, max, state)` perto de `levelPips` em ShopScene.ts, usada só em `select` no lugar da barra de segmentos (linhas ~484 a 493). Estados: `affordable`, `short` (sem ouro), `maxed`.
2. Fallback para a barra se `lado < 10`.
3. Teste (vitest) puro para a função de tamanho (`diamondSize(max, width)`) se extraída para `render/ui.ts`.
4. Verificar com screenshots em 390x844 e 1000x680, com `?dev`, itens de máximo 1, 3, 5 e 10; e simular daltonismo (filtro deuteranopia) para confirmar que o em-compra se distingue só pelo formato.
5. Sem novos ícones. Quando houver o passe de pixel art, trocar o desenho por um sprite de 7x7 art px, mantendo `ART_RES`.
