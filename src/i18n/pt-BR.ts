import type { StatKey } from '../data/config';
import type { AchievementGroup, AchievementId } from '../data/achievements';
import type { CharacterId } from '../data/characters';
import type { EnemyId } from '../data/enemies';
import type { StageId } from '../data/stages';
import type { PickupId } from '../data/pickups';
import type { ChargeKey, ShopId } from '../data/shop';
import type { PassiveId } from '../data/upgrades';
import type { RewardId } from '../data/rewards';
import type { WeaponId } from '../data/weapons';

/** A whole number with pt-BR thousands dots: 10000 -> "10.000". */
const int = (n: number): string => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Achievement name and description (a goal-dependent one gets the goal already formatted). */
type AchievementText = { name: string; desc: string | ((goal: string) => string) };

/** Every player-facing string lives here. Code never hardcodes UI text. */
export const t = {
  /** Separator between items on one line. */
  sep: ' · ',
  /** Whole numbers shown to the player ("8.240"). */
  int,
  /** Units and signs of numbers shown to the player (the value comes already formatted). */
  units: {
    degrees: (v: string) => `${v}°`,
    seconds: (v: string) => `${v}s`,
    perSecond: (v: string) => `${v}/s`,
    percent: (v: string) => `${v}%`,
    plus: '+',
    minus: '−',
    /** A stat change: "Dano +10%". */
    delta: (stat: string, sign: string, value: string) => `${stat} ${sign}${value}`,
    /** A weapon stat from one level to the next: "Dano 10 → 13". */
    change: (stat: string, from: string, to: string) => `${stat} ${from} → ${to}`,
    /** Current out of max ("Nível 2/7"). */
    of: (a: string, b: number) => `${a}/${b}`,
  },
  title: 'Eterra Survivors',
  subtitle: 'Crônicas de Eterra',

  menu: {
    intro: 'A geada chegou cedo a Valmor. Os mortos se levantaram. Alguém precisa resistir até o amanhecer.',
    start: 'Começar',
    shop: 'Loja do Gaspar',
    options: 'Opções',
    collection: 'Coleção',
    controlsDesktop: 'WASD ou setas para andar · Espaço ou Esc pausa',
    /** Only shown in development builds. */
    debugHint: 'F3 depuração · F4 +100 inimigos',
    controlsTouch: 'Toque e arraste em qualquer lugar para andar',
  },

  hud: {
    level: (n: number) => `Nv ${n}`,
    /** Shown beside a skull and a coin icon. */
    kills: (n: number) => `${n}`,
    gold: (n: number) => `${n}`,
    hp: (hp: number, max: number) => `${hp}/${max}`,
  },

  levelUp: {
    title: 'Subiu de nível!',
    newWeapon: 'Nova arma',
    level: (n: number) => `Nível ${n}`,
    heal: 'Pão e sopa da Berta',
    healDesc: (n: number) => `Recupera ${n} de vida`,
    reward: 'Recompensa',
    hintTouch: 'Toque numa opção',
    hintKeys: 'Clique ou use 1, 2, 3',
    /** Card title with its key on keyboards ("1. Força"). */
    numbered: (n: number, title: string) => `${n}. ${title}`,
    banishHint: 'Escolha o que banir desta partida',
    charges: {
      reroll: (n: number) => `Trocar (${n})`,
      skip: (n: number) => `Pular (${n})`,
      banish: (n: number) => `Banir (${n})`,
    } satisfies Record<ChargeKey, (n: number) => string>,
    chargeKeys: 'R troca · X pula · B bane',
    evolution: 'Elo',
    evolvesWith: (passive: string) => `No máximo, com ${passive} e um baú, vira um Elo.`,
    recipeHave: (passive: string) => `Elo: + ${passive} (você tem)`,
    recipeNeed: (passive: string) => `Elo: + ${passive}`,
    eloReady: 'Elo pronto: pegue um baú',
    recipeFor: (weapon: string) => `Forma o Elo de ${weapon}`,
    /** Several weapons joined with `and` ("Maça de Ferro e Espadas dos Paladinos"). */
    recipeForMany: (weapons: string) => `Forma os Elos de ${weapons}`,
    and: ' e ',
    /** The build and stats panel beside the choices. */
    build: 'Sua build',
    groups: { survive: 'Sobreviver', attack: 'Ataque', collect: 'Coleta' },
    /** A stat still at its base value. */
    untouched: '-',
    preview: (from: string, to: string) => `${from} → ${to}`,
  },

  /** The Elo moments in a run: ready (notice, tip, arrows) and formed (the celebration screen). */
  elo: {
    ready: 'Elo pronto! Derrote uma elite para abrir o baú',
    tip: 'Elo: arma no nível máximo + a passiva da receita. O próximo baú (as elites deixam um) transforma a arma.',
    formed: 'Elo formado!',
    power: (from: string, to: string) => `Dano por segundo: ${from} → ${to}`,
    close: 'Toque, Espaço ou Enter para continuar',
    /** One line per Elo on the celebration screen (written for the Survivors, no new lore facts). */
    lines: {
      fury: 'A Lâmina de Valmor não escolhe mais um lado: corta tudo em volta.',
      holyLight: 'A luz de Elun se multiplica e atravessa a escuridão.',
      yahFlame: 'O pequeno halo vira fogueira. Quem chega perto não volta.',
      fan: 'Andilla abre a mão, e as facas se abrem em leque.',
      vigil: 'Quatro espadas, quatro paladinos, nenhuma brecha.',
      blizzard: 'O frio do sul desce inteiro sobre o campo.',
      storm: 'Lyra chama o céu, e o céu responde.',
      forgeFury: 'Da forja do Gaspar, martelos que não param.',
      soulProcession: 'As luzes seguem em fila, como velas numa procissão.',
      funeralToll: 'Os sinos dobram, e os mortos sabem que é por eles.',
      jointBreaker: 'Ferro contra osso: as juntas cedem primeiro.',
      fireSword: 'Aço e chama caem juntos do céu.',
    } as Partial<Record<WeaponId, string>>,
  },

  /** Reward cards (data/rewards.ts): they fill the choice once weapons and passives run short. */
  rewards: {
    goldBag: { name: 'Bolsa de Ouro', desc: (gold: number) => `+${gold} de ouro` },
    feast: { name: 'Banquete', desc: (pct: number) => `Recupera ${pct}% da vida` },
    blessing: { name: 'Bênção de Yah', desc: (pct: number) => `+${pct}% de dano (acumula)` },
  } satisfies Record<RewardId, { name: string; desc: (n: number) => string }>,

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
    /** Desistir asks once more (for 2 s) before ending the run. */
    quitConfirm: 'Confirmar desistir',
  },

  collection: {
    title: 'Coleção',
    tabs: { bestiary: 'Bestiário', elos: 'Elos', achievements: 'Conquistas', heroes: 'Heróis' },
    /** The Conquistas tab. */
    count: (n: number, total: number) => `${n} de ${total} conquistas`,
    groupCount: (n: number, total: number) => `${n}/${total}`,
    done: 'Feita',
    /** The title an achievement gives, after its reward. */
    titleOf: (name: string) => `Título: ${name}`,
    useTitle: 'Usar título',
    /** The Heróis tab: one card per hero, then the totals of every run. */
    heroes: {
      runs: 'Partidas',
      bestTime: 'Melhor tempo',
      fastestWin: 'Vitória mais rápida',
      bestLevel: 'Nível máximo',
      bestKills: 'Mais abates',
      bestHit: 'Maior golpe',
      favorite: 'Arma favorita',
      elos: 'Elos',
      /** No record yet. */
      none: '-',
      elosOf: (n: number, total: number) => `${n} de ${total}`,
    },
    totals: {
      runs: 'Partidas',
      wins: 'Vitórias',
      kills: 'Abates',
      damage: 'Dano',
      gold: 'Ouro',
      time: 'Tempo',
    },
    /** A total's label and value ("Abates 13.574"). */
    total: (name: string, value: string) => `${name} ${value}`,
    /** Time played: "2h05" (or "45 min" under an hour). */
    hours: (h: number, m: number) => `${h}h${String(m).padStart(2, '0')}`,
    minutes: (m: number) => `${m} min`,
    inUse: 'Em uso',
  },

  /** The Coleção's Bestiário: the sheet of each enemy met, in player terms (core/format.ts `enemyTraits`). */
  bestiary: {
    count: (n: number, total: number) => `${n} de ${total} encontrados`,
    unknown: '???',
    /** Kills on a card ("x1.234"). */
    kills: (n: string) => `x${n}`,
    empty: 'Os inimigos que você encontrar nas partidas aparecem aqui.',
    seenIn: 'Visto em',
    killed: 'Abatidos',
    hp: 'Vida',
    hpGrows: (n: string) => `${n}, cresce com o tempo`,
    speed: 'Velocidade',
    speeds: { slow: 'Lento', medium: 'Médio', fast: 'Rápido', faster: 'Mais rápido que você' },
    damage: 'Dano ao tocar',
    push: 'Empurrão',
    pushes: { none: 'Não recua', little: 'Recua pouco', easy: 'Recua fácil' },
    way: 'Jeito',
    ways: {
      charge: 'Investe em linha',
      zigzag: 'Ziguezague',
      phase: 'Atravessa e some',
      elite: 'Deixa um baú',
      cleave: 'Corte Brutal',
      toll: 'Badalada',
      lunge: 'Mordida Funda',
    },
    /** A line about each enemy: from the original where it has one, else written for the Survivors (docs/design/conquistas.md). */
    quote: (line: string) => `"${line}"`,
    /** A line someone says: "..." (Seu Joaquim). */
    quoteBy: (line: string, who: string) => `"${line}" (${who})`,
    speakers: { rat: 'Seu Joaquim' } as Partial<Record<EnemyId, string>>,
    flavor: {
      // original src/opening.js (the `ossada` fight)
      bones: 'Uma mão de osso rompe a terra. Uma Ossada se levanta!',
      // original src/opening.js (the `morcegos` fight)
      bat: 'Dois morcegos descem do muro!',
      // original src/opening.js (the `rato` and `ratoCova` fights)
      graveRat: 'Um rato do tamanho de um gato sai de uma cova!',
      // historias/capitulo1-aldo-sozinho.md (Seu Joaquim, village talk)
      rat: 'Na minha época, a gente enfrentava rato gigante com uma vassoura!',
      // historias/prologo.md (cast table)
      hooded: 'Capa cinza, lâminas curvas, um olho cortado ao meio.',
      // original src/chapter1.js (the `crow` encounter)
      crow: 'Corvos mergulham do escuro!',
      // original src/chapter1.js (a traveller on the road)
      frostWolf: 'E não andem depois que escurece. Os lobos estão com fome este ano.',
      // canone.md, Criaturas e povos [C]
      goblin: 'Os goblins fizeram um acordo com os Nekaren: a Aliança Negra.',
      // original src/data.js (`sineiro.say.intro`)
      bellRinger: 'O último toque foi há cinquenta anos. Ninguém mais desce.',
      // original src/chapter1.js (the pack battle)
      oldWolf: 'A matilha sai da floresta! O Lobo Velho vem na frente.',
      // written for the Survivors (2026-11-09), not from the original; Daniel may rewrite
      skeleton: 'Saiu de uma cova aberta por dentro. Mais inteiro que uma Ossada, e mais teimoso.',
      // written for the Survivors (2026-11-09), not from the original; Daniel may rewrite
      spider: 'Faz ninho entre as lápides e nunca anda em linha reta.',
      // written for the Survivors (2026-11-09), not from the original; Daniel may rewrite
      slime: 'Escorre do limo da cripta. Bater nela é como bater em mingau.',
      // written for the Survivors (2026-11-09), not from the original; Daniel may rewrite
      ghost: 'Um frio que atravessa as paredes. Às vezes some, e o golpe passa junto.',
      // written for the Survivors (2026-11-09), not from the original; Daniel may rewrite
      golem: 'Pedra que anda. Devagar, mas não para.',
      // written for the Survivors (2026-11-09), not from the original; Daniel may rewrite
      blackKnight: 'Armadura negra e olhos vermelhos. Ninguém em Valmor sabe de onde veio.',
    } as Partial<Record<EnemyId, string>>,
  },

  elos: {
    count: (n: number, total: number) => `${n} de ${total} Elos descobertos`,
    unknown: '???',
    rule: 'Arma no nível máximo + a passiva certa, e depois um baú.',
    recipe: (weapon: string, passive: string) => `${weapon} + ${passive}`,
    hint: (weapon: string) => `Nasce de ${weapon}`,
    owner: (hero: string) => `Só ${hero}`,
    /** The recipe drawn as icons: weapon + passive = Elo, the passive a mystery until discovered. */
    plus: '+',
    equals: '=',
    mystery: '?',
  },

  options: {
    title: 'Opções',
    damageNumbers: 'Números de dano',
    calm: 'Tela calma (sem tremor)',
    muted: 'Som',
    /** The seal beside each option. */
    on: 'Ligado',
    off: 'Desligado',
  },

  end: {
    won: 'Vitória!',
    lost: 'Fim de jogo',
    lostText: (hero: string) => `${hero} tombou na neve. Valmor ainda espera por um herói.`,
    unlocked: (stage: string) => `Nova fase liberada: ${stage}`,
    newElo: (name: string) => `Elo descoberto: ${name}! Veja na Coleção.`,
    banked: (gold: number) => `No cofre: ${gold} ouro`,
    toBuy: (name: string, missing: number) => `Faltam ${missing} de ouro para ${name}`,
    canBuy: (name: string, cost: number) => `Já dá para comprar ${name} (${cost}) na Loja!`,
    run: (stage: string, hero: string) => `${stage} · ${hero}`,
    weapon: 'Arma',
    weaponLevel: 'Nv',
    damage: 'Dano',
    owned: 'Tempo',
    dps: 'DPS',
    passivesLine: (list: string) => `Passivas: ${list}`,
    passiveLevel: (name: string, level: number) => `${name} ${level}`,
    none: 'nenhuma',
    thousand: 'k',
    million: 'M',
    time: 'Tempo',
    kills: 'Abates',
    level: 'Nível',
    gold: 'Ouro',
    again: 'Jogar de novo',
    menu: 'Menu',
    /** After a victory that opened the next stage: play it right away. */
    next: 'Próxima fase',
    passives: 'Passivas',
    /** "Faltou pouco": the Elo closest to forming (an unknown Elo is named by its weapon, not revealed). */
    almostElo: (elo: string) => `Faltou um baú para formar ${elo}!`,
    almostEloUnknown: (weapon: string) => `Faltou um baú para o Elo de ${weapon}!`,
    almostLevel: (weapon: string) => `${weapon} estava a um nível do Elo.`,
    /** An achievement this run unlocked, with its reward ("+50 ouro"). */
    achievement: (name: string, reward: string) => `Conquista: ${name} (${reward})`,
    moreAchievements: (n: number) => (n === 1 ? '+1 conquista' : `+${n} conquistas`),
    /** The locked achievement closest to done, with its progress ("8.240 de 10.000"). */
    near: (name: string, progress: string) => `Perto: ${name} (${progress})`,
  },

  /** Conquistas (docs/design/conquistas.md). The four hero ones are each hero's victory line in the original. */
  achievements: {
    groups: {
      kills: 'Abates',
      damage: 'Dano',
      survival: 'Sobrevivência',
      weapons: 'Armas e Elos',
      heroes: 'Heróis',
      stages: 'Fases',
      collection: 'Coleção',
    } satisfies Record<AchievementGroup, string>,
    items: {
      killsRun1k: { name: 'Mil Covas Fechadas', desc: (n) => `Derrote ${n} inimigos numa partida.` },
      killsRun3k: { name: 'Noite Sem Fim', desc: (n) => `Derrote ${n} inimigos numa partida.` },
      killsTotal10k: { name: 'Coveiro de Valmor', desc: (n) => `Derrote ${n} inimigos no total.` },
      killsTotal50k: { name: 'A Vila Dorme Tranquila', desc: (n) => `Derrote ${n} inimigos no total.` },
      // Seu Joaquim's line in the original (historias/capitulo1-aldo-sozinho.md).
      rats500: {
        name: 'Na Minha Época',
        desc: (n) => `Derrote ${n} ratos. O Seu Joaquim fazia isso com uma vassoura.`,
      },
      elites25: { name: 'Pedra e Lança', desc: (n) => `Derrote ${n} elites.` },
      hit80: { name: 'Golpe Forte', desc: (n) => `Acerte um golpe de arma de ${n} ou mais.` },
      hit120: { name: 'Na Junta', desc: (n) => `Acerte um golpe de arma de ${n} ou mais.` },
      damageRun: { name: 'Forja Acesa', desc: (n) => `Cause ${n} de dano numa partida.` },
      damageTotal: { name: 'Bigorna do Gaspar', desc: (n) => `Cause ${n} de dano no total.` },
      survive5: { name: 'Meia-Noite', desc: 'Sobreviva 5 minutos.' },
      survive10: { name: 'Até o Fim da Noite', desc: 'Sobreviva até o chefe chegar.' },
      untouched: { name: 'Nem um Arranhão', desc: 'Passe 1:30 sem levar dano.' },
      closeWin: { name: 'Por um Fio', desc: 'Vença uma fase com 10% da vida ou menos.' },
      level50: { name: 'Lenda da Taverna', desc: (n) => `Chegue ao nível ${n} numa partida.` },
      eloFirst: { name: 'Primeiro Elo', desc: 'Forme um Elo.' },
      elosRun3: { name: 'Corrente Inteira', desc: (n) => `Forme ${n} Elos numa partida.` },
      maxed4: {
        name: 'Mãos de Ferreiro',
        desc: (n) => `Termine uma partida com ${n} armas no nível máximo (Elos contam).`,
      },
      allShared: { name: 'Conhece o Ofício', desc: 'Use cada arma compartilhada pelo menos uma vez.' },
      soloWin: { name: 'Fiel à Primeira', desc: 'Vença uma fase sem pegar nenhuma arma além da inicial.' },
      winAldo: { name: 'Próximo.', desc: 'Vença uma fase com Aldo.' },
      winLyra: { name: 'Mais uma para o livro.', desc: 'Vença uma fase com Lyra.' },
      winTeo: { name: 'Que descansem em paz.', desc: 'Vença uma fase com Teo.' },
      winAndilla: { name: 'Fácil. Quase.', desc: 'Vença uma fase com Andilla.' },
      // A diary note in the original (src/data.js).
      winAll: {
        name: 'Os Quatro',
        desc: 'Vença com os quatro heróis. Os paladinos que fecharam a cripta eram quatro.',
      },
      heroAllStages: { name: 'De Ponta a Ponta', desc: 'Vença as três fases com o mesmo herói.' },
      bossKnight: { name: 'O Cavaleiro Caiu', desc: 'Derrote o Cavaleiro Negro.' },
      bossRinger: { name: 'Ninguém Mais Desce', desc: 'Derrote O Sineiro.' },
      bossWolf: { name: 'O Velho da Matilha', desc: 'Derrote o Lobo Velho.' },
      bossFast: {
        name: 'Antes do Segundo Golpe',
        desc: (n) => `Derrote um chefe em até ${n} s depois que ele chega.`,
      },
      allStages: { name: 'Caminho de Erukh', desc: 'Vença as três fases.' },
      seen8: { name: 'Diário de Caça', desc: (n) => `Encontre ${n} tipos de inimigo.` },
      seenAll: { name: 'Bestiário Completo', desc: 'Encontre todos os inimigos, elites e chefes.' },
      elosAll: { name: 'Livro Completo', desc: 'Descubra todos os Elos.' },
      shop10: { name: 'Freguês do Gaspar', desc: (n) => `Compre ${n} níveis na Loja.` },
    } satisfies Record<AchievementId, AchievementText> as Record<AchievementId, AchievementText>,
    titles: {
      killsTotal50k: 'Guardião de Valmor',
      soloWin: 'Fiel à Primeira',
      winAll: 'Um dos Quatro',
      seenAll: 'Caçador das Covas',
      elosAll: 'Mestre dos Elos',
    } as Partial<Record<AchievementId, string>>,
    reward: (gold: number) => `+${gold} ouro`,
    /** The in-run notice. */
    toast: 'Conquista!',
    progress: (value: string, goal: string) => `${value} de ${goal}`,
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
    /** Seal on a stage already won. */
    cleared: 'Vencida',
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
      won: 'O Cavaleiro Negro caiu. Mas o sino da igreja velha continua tocando.',
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
    seed: 'semente',
  },

  weapons: {
    blade: { name: 'Lâmina de Valmor', desc: 'Golpe em arco à frente de Aldo.' },
    elunLight: { name: 'Luz de Elun', desc: 'Uma luz sagrada que busca o inimigo mais próximo.' },
    yahAura: { name: 'Aura de Yah', desc: 'Queima tudo o que chega perto.' },
    daggers: { name: 'Adagas de Andilla', desc: 'Facas rápidas lançadas no inimigo mais próximo.' },
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
    fan: {
      name: 'Leque de Facas',
      desc: 'Um leque de facas no inimigo mais próximo, que atravessa fileiras.',
    },
    vigil: { name: 'Vigília dos Quatro', desc: 'Os quatro paladinos montam guarda em volta do herói.' },
    blizzard: { name: 'Nevasca', desc: 'O inverno cobre o campo inteiro.' },
    storm: { name: 'Tempestade', desc: 'O céu inteiro desaba sobre os mortos.' },
    forgeFury: { name: 'Fúria da Forja', desc: 'Martelos que não param, atravessando tudo.' },
    soulProcession: { name: 'Procissão das Almas', desc: 'Uma fila longa de luzes caminha pelo campo.' },
    funeralToll: { name: 'Dobre Fúnebre', desc: 'Os sinos dobram por tudo o que chega perto.' },
    mace: {
      name: 'Maça de Ferro',
      desc: 'Uma maça pesada que esmaga o inimigo mais próximo e faz o chão tremer em volta.',
    },
    fire: { name: 'Fogo', desc: 'Chamas caem sobre os inimigos e queimam uma área larga.' },
    jointBreaker: {
      name: 'Quebra-Junta',
      desc: 'Mira nas juntas: duas pancadas enormes que racham o chão.',
    },
    fireSword: { name: 'Espada de Fogo', desc: 'Uma chuva de espadas em chamas sobre o campo.' },
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
    rat: 'Rato Gigante',
    graveRat: 'Rato de Cova',
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

  /** Short stat names for narrow stat sheets. */
  statsShort: {
    maxHp: 'Vida',
    moveSpeed: 'Veloc.',
    magnet: 'Ímã',
    might: 'Dano',
    cooldown: 'Recarga',
    area: 'Área',
    regen: 'Regen.',
    armor: 'Armad.',
    amount: 'Quant.',
    growth: 'Exp.',
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
