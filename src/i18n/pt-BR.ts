import type { StatKey } from '../data/config';
import type { EnemyId } from '../data/enemies';
import type { PassiveId } from '../data/upgrades';
import type { WeaponId } from '../data/weapons';

/** Every player-facing string lives here. Code never hardcodes UI text. */
export const t = {
  title: 'Eterra Survivors',
  subtitle: 'Crônicas de Eterra',
  hero: 'Aldo',

  menu: {
    intro: 'A geada chegou cedo a Valmor. Os mortos se levantaram. Aldo precisa resistir até o amanhecer.',
    start: 'Começar',
    controlsDesktop: 'WASD ou setas para andar · Esc pausa · F3 depuração',
    controlsTouch: 'Toque e arraste em qualquer lugar para andar',
  },

  hud: {
    level: (n: number) => `Nv ${n}`,
    kills: (n: number) => `${n} abates`,
    boss: 'Cavaleiro Negro',
  },

  levelUp: {
    title: 'Subiu de nível!',
    newWeapon: 'Nova arma',
    level: (n: number) => `Nível ${n}`,
    heal: 'Pão e sopa da Berta',
    healDesc: (n: number) => `Recupera ${n} de vida`,
    hint: 'Toque numa opção ou use 1, 2, 3',
    evolution: 'Elo',
    evolvesWith: (passive: string) => `No máximo, com ${passive} e um baú, vira um Elo.`,
  },

  chest: {
    evolved: (name: string) => `Elo: ${name}!`,
    gained: (name: string) => `Baú: ${name}`,
  },

  eliteWarning: 'Um inimigo poderoso se aproxima!',

  pause: {
    title: 'Pausa',
    resume: 'Continuar',
    quit: 'Desistir',
  },

  end: {
    won: 'Vitória!',
    wonText: 'O Cavaleiro Negro caiu. Os mortos de Valmor voltam a dormir.',
    lost: 'Fim de jogo',
    lostText: 'Aldo tombou na neve. Valmor ainda espera por um herói.',
    time: 'Tempo',
    kills: 'Abates',
    level: 'Nível',
    again: 'Jogar de novo',
    menu: 'Menu',
  },

  bossWarning: 'O Cavaleiro Negro chegou!',

  debug: {
    fps: 'FPS',
    enemies: 'inimigos',
    projectiles: 'projéteis',
    gems: 'gemas',
    numbers: 'números',
  },

  weapons: {
    blade: { name: 'Lâmina de Valmor', desc: 'Golpe em arco à frente de Aldo.' },
    elunLight: { name: 'Luz de Elun', desc: 'Uma luz sagrada que busca o inimigo mais próximo.' },
    yahAura: { name: 'Aura de Yah', desc: 'Queima tudo o que chega perto.' },
    fury: { name: 'Fúria', desc: 'Aldo gira a espada contra todos ao redor.' },
    holyLight: { name: 'Luz Sagrada', desc: 'Um enxame de luzes que atravessa os mortos.' },
    yahFlame: { name: 'Chama de Yah', desc: 'O halo vira uma fogueira larga.' },
  } satisfies Record<WeaponId, { name: string; desc: string }>,

  passives: {
    vigor: 'Vigor',
    swiftness: 'Pés Ligeiros',
    might: 'Força',
    haste: 'Pressa',
    reach: 'Alcance',
    attraction: 'Atração',
    recovery: 'Recuperação',
  } satisfies Record<PassiveId, string>,

  enemies: {
    skeleton: 'Esqueleto',
    spider: 'Aranha Tumular',
    slime: 'Gosma Verde',
    oldWolf: 'Lobo Velho',
    golem: 'Golem de Pedra',
    blackKnight: 'Cavaleiro Negro',
  } satisfies Record<EnemyId, string>,

  /** Labels for player stats (passives). */
  stats: {
    maxHp: 'Vida máxima',
    moveSpeed: 'Velocidade',
    magnet: 'Raio de coleta',
    might: 'Dano',
    cooldown: 'Recarga',
    area: 'Área',
    regen: 'Regeneração',
  } satisfies Record<StatKey, string>,

  /** Labels for weapon level stats (level-up card diffs). Unknown keys are not shown. */
  weaponStats: {
    damage: 'Dano',
    cooldown: 'Recarga',
    range: 'Alcance',
    arc: 'Largura',
    swings: 'Golpes',
    count: 'Luzes',
    pierce: 'Perfuração',
    speed: 'Velocidade',
    radius: 'Raio',
  } as Record<string, string>,
} as const;
