# Valmor Resiste (repo and code name: Eterra Survivors)

Spin-off de sobrevivência das **Crônicas de Eterra**. A geada chegou cedo a Valmor e os mortos se
levantaram. Aldo precisa resistir por 10 minutos e derrotar o **Cavaleiro Negro**.

**Jogar:** https://danisacra.github.io/eterra-survivors/

## Como jogar

- **Desktop:** WASD ou setas para andar · Esc/P pausa · 1, 2, 3 (ou setas + Enter) escolhem o upgrade.
- **Celular:** toque e arraste em qualquer lugar da tela (joystick flutuante). O botão II pausa.
- As armas atacam sozinhas. Colete as gemas para subir de nível e escolher entre 3 melhorias.
- **F3** mostra FPS e entidades ativas. Com o F3 ligado, **F4** cria 100 inimigos (teste de estresse).

## Armas

| Arma             | Comportamento                                                      |
| ---------------- | ------------------------------------------------------------------ |
| Lâmina de Valmor | golpe em arco à frente de Aldo (a partir do nível 3, também atrás) |
| Luz de Elun      | luzes que buscam o inimigo mais próximo                            |
| Aura de Yah      | dano contínuo em área ao redor                                     |

## Desenvolvimento

Requer Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173/eterra-survivors/
npm test           # testes unitários (Vitest)
npm run lint       # ESLint
npm run build      # build de produção em dist/
```

Arquitetura e convenções estão em [CLAUDE.md](CLAUDE.md). O resumo: a lógica pura fica em `src/core`
(sem Phaser, toda testada), o conteúdo fica em `src/data` (armas, inimigos, ondas, upgrades), todo texto fica
em `src/i18n/pt-BR.ts` e os gráficos ficam no mapa único `src/render/assets.ts`.

## Créditos

Mundo, história e personagens de Eterra: Daniel. Todos os direitos reservados sobre o mundo e a história.
