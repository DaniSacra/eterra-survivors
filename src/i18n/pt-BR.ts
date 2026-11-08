import type { StatKey } from '../data/config';
import type { CharacterId } from '../data/characters';
import type { EnemyId } from '../data/enemies';
import type { StageId } from '../data/stages';
import type { PickupId } from '../data/pickups';
import type { ChargeKey, ShopId } from '../data/shop';
import type { PassiveId } from '../data/upgrades';
import type { WeaponId } from '../data/weapons';

/** Every player-facing string lives here. Code never hardcodes UI text. */
export const t = {
  title: 'Eterra Survivors',
  subtitle: 'Crônicas de Eterra',

  menu: {
    intro: 'A geada chegou cedo a Valmor. Os mortos se levantaram. Alguém precisa resistir até o amanhecer.',
    start: 'Começar',
    shop: 'Loja do Gaspar',
    controlsDesktop: 'WASD ou setas para andar · Esc pausa · F3 depuração',
    controlsTouch: 'Toque e arraste em qualquer lugar para andar',
  },

  hud: {
    level: (n: number) => `Nv ${n}`,
    kills: (n: number) => `${n} abates`,
    gold: (n: number) => `${n} ouro`,
  },

  levelUp: {
    title: 'Subiu de nível!',
    newWeapon: 'Nova arma',
    level: (n: number) => `Nível ${n}`,
    heal: 'Pão e sopa da Berta',
    healDesc: (n: number) => `Recupera ${n} de vida`,
    hint: 'Toque numa opção ou use 1, 2, 3',
    banishHint: 'Escolha o que banir desta partida',
    charges: {
      reroll: (n: number) => `Trocar (${n})`,
      skip: (n: number) => `Pular (${n})`,
      banish: (n: number) => `Banir (${n})`,
    } satisfies Record<ChargeKey, (n: number) => string>,
    chargeKeys: 'R troca · X pula · B bane',
    evolution: 'Elo',
    evolvesWith: (passive: string) => `No máximo, com ${passive} e um baú, vira um Elo.`,
  },

  chest: {
    evolved: (name: string) => `Elo: ${name}!`,
    gained: (name: string) => `Baú: ${name}`,
  },

  pickups: {
    chest: 'Baú',
    gold: 'Moeda',
    food: 'Pão da Berta',
    magnet: 'Pedra-Ímã',
    bomb: 'Badalada!',
    freeze: 'Sopro de Geada!',
  } satisfies Record<PickupId, string>,

  eliteWarning: 'Um inimigo poderoso se aproxima!',

  pause: {
    title: 'Pausa',
    resume: 'Continuar',
    quit: 'Desistir',
  },

  end: {
    won: 'Vitória!',
    lost: 'Fim de jogo',
    lostText: (hero: string) => `${hero} tombou na neve. Valmor ainda espera por um herói.`,
    unlocked: (stage: string) => `Nova fase liberada: ${stage}`,
    run: (stage: string, hero: string) => `${stage} · ${hero}`,
    weapon: 'Arma',
    weaponLevel: 'Nv',
    damage: 'Dano',
    owned: 'Tempo',
    dps: 'DPS',
    passives: 'Passivas',
    none: 'nenhuma',
    thousand: 'k',
    million: 'M',
    time: 'Tempo',
    kills: 'Abates',
    level: 'Nível',
    gold: 'Ouro',
    again: 'Jogar de novo',
    menu: 'Menu',
  },

  shop: {
    title: 'Loja do Gaspar',
    intro: 'O ferreiro de Valmor troca ouro por preparo. As compras valem para todas as partidas.',
    gold: (n: number) => `Ouro: ${n}`,
    level: (lv: number, max: number) => `${lv}/${max}`,
    cost: (n: number) => `${n} ouro`,
    maxed: 'Completo',
    back: 'Voltar',
    items: {
      might: 'Pedra de Amolar',
      maxHp: 'Sopa Quente',
      armor: 'Gibão Acolchoado',
      regen: 'Erva de Cura',
      moveSpeed: 'Botas de Couro',
      cooldown: 'Treino com Gaspar',
      area: 'Cabo Longo',
      magnet: 'Bolsa Funda',
      growth: 'Livros de Lyra',
      greed: 'Dados da Andilla',
      amount: 'Segunda Bainha',
      reroll: 'Conselho do Ancião',
      skip: 'Paciência',
      banish: 'Bênção do Templo',
    } satisfies Record<ShopId, string>,
    charges: {
      reroll: 'Trocar +1 por partida',
      skip: 'Pular +1 por partida',
      banish: 'Banir +1 por partida',
    } satisfies Record<ChargeKey, string>,
  },

  bossWarning: (boss: string) => `${boss} chegou!`,

  select: {
    title: 'Preparação',
    hero: 'Herói',
    stage: 'Fase',
    go: 'Partir',
    back: 'Voltar',
    gold: (n: number) => `Ouro: ${n}`,
    unlock: (n: number) => `Liberar: ${n} ouro`,
    locked: 'Vença a fase anterior',
    keys: '←→ herói · ↑↓ fase · Enter parte',
    signature: (weapon: string) => `Arma própria: ${weapon}`,
  },

  characters: {
    aldo: { name: 'Aldo', role: 'Guerreiro', desc: 'Resistente. Vida e armadura a mais.' },
    lyra: { name: 'Lyra', role: 'Maga', desc: 'Magias largas, mas pouca vida.' },
    teo: { name: 'Teo', role: 'Clérigo', desc: 'As feridas se fecham sozinhas.' },
    andilla: { name: 'Andilla', role: 'Ladina', desc: 'Pés ligeiros e sorte com o ouro.' },
  } satisfies Record<CharacterId, { name: string; role: string; desc: string }>,

  stages: {
    valmor: {
      name: 'Arredores de Valmor',
      desc: 'O cemitério da vila, na neve do sul.',
      won: 'O Cavaleiro Negro caiu. Os mortos de Valmor voltam a dormir.',
    },
    crypt: {
      name: 'Cripta da Igreja Velha',
      desc: 'Pedra azul, limo e um sino que não devia tocar.',
      won: 'O Sineiro se calou. O sino não toca mais.',
    },
    southRoad: {
      name: 'Estrada do Sul',
      desc: 'Gelo, encapuzados e a matilha do Lobo Velho.',
      won: 'O Lobo Velho caiu. A estrada para Erukh está aberta.',
    },
  } satisfies Record<StageId, { name: string; desc: string; won: string }>,

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
    daggers: { name: 'Adagas de Andilla', desc: 'Facas lançadas em linha reta à frente.' },
    paladinSwords: { name: 'Espadas dos Paladinos', desc: 'Espadas que giram em volta do herói.' },
    frost: { name: 'Geada de Valmor', desc: 'Manchas de gelo que ferem e atrasam os inimigos.' },
    hammer: {
      name: 'Martelo do Gaspar',
      desc: 'Um martelo pesado lançado à frente, que atravessa e empurra longe.',
    },
    wisps: { name: 'Fogos-Fátuos', desc: 'Luzes lentas que perseguem os mortos por muito tempo.' },
    bells: { name: 'Sinos de Bronze', desc: 'Sinos pesados girando largo em volta do herói.' },
    lightning: { name: 'Raio de Lyra', desc: 'Raios caem sobre inimigos ao acaso.' },
    fury: { name: 'Fúria', desc: 'Aldo gira a espada contra todos ao redor.' },
    holyLight: { name: 'Luz Sagrada', desc: 'Um enxame de luzes que atravessa os mortos.' },
    yahFlame: { name: 'Chama de Yah', desc: 'O halo vira uma fogueira larga.' },
    fan: { name: 'Leque de Facas', desc: 'Facas para todos os lados, que atravessam fileiras.' },
    vigil: { name: 'Vigília dos Quatro', desc: 'Os quatro paladinos montam guarda em volta do herói.' },
    blizzard: { name: 'Nevasca', desc: 'O inverno cobre o campo inteiro.' },
    storm: { name: 'Tempestade', desc: 'O céu inteiro desaba sobre os mortos.' },
    forgeFury: { name: 'Fúria da Forja', desc: 'Martelos que não param, atravessando tudo.' },
    soulProcession: { name: 'Procissão das Almas', desc: 'Uma fila longa de luzes caminha pelo campo.' },
    funeralToll: { name: 'Dobre Fúnebre', desc: 'Os sinos dobram por tudo o que chega perto.' },
  } satisfies Record<WeaponId, { name: string; desc: string }>,

  passives: {
    vigor: 'Vigor',
    swiftness: 'Pés Ligeiros',
    might: 'Força',
    haste: 'Pressa',
    reach: 'Alcance',
    attraction: 'Atração',
    recovery: 'Recuperação',
    armor: 'Cota de Malha',
    amount: 'Mãos Ligeiras',
    growth: 'Sabedoria',
  } satisfies Record<PassiveId, string>,

  enemies: {
    skeleton: 'Esqueleto',
    spider: 'Aranha Tumular',
    slime: 'Gosma Verde',
    bones: 'Ossada',
    bat: 'Morcego',
    ghost: 'Espectro',
    hooded: 'Encapuzado',
    crow: 'Corvo',
    frostWolf: 'Lobo da Geada',
    goblin: 'Goblin Lanceiro',
    golem: 'Golem de Pedra',
    bellRinger: 'O Sineiro',
    oldWolf: 'Lobo Velho',
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
    armor: 'Armadura',
    amount: 'Quantidade',
    growth: 'Experiência',
    greed: 'Ouro',
  } satisfies Record<StatKey, string>,

  /** Labels for weapon level stats (level-up card diffs). Unknown keys are not shown. */
  weaponStats: {
    damage: 'Dano',
    cooldown: 'Recarga',
    range: 'Alcance',
    arc: 'Largura',
    swings: 'Golpes',
    count: 'Quantidade',
    orbitRadius: 'Distância',
    duration: 'Duração',
    spin: 'Giro',
    pierce: 'Perfuração',
    speed: 'Velocidade',
    radius: 'Raio',
  } as Record<string, string>,
} as const;
