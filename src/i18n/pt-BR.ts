import type { StatKey } from '../data/config';
import type { ElementId } from '../data/evolutions';
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
  title: 'Valmor Resiste',
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
    /** Segunda Chance left, next to its icon. */
    revives: (n: number) => `${n}`,
  },

  levelUp: {
    title: 'Subiu de nível!',
    newWeapon: 'Nova arma',
    newWeaponOf: (category: string) => `Nova arma · ${category}`,
    /** How a weapon fights, on its new-weapon card. */
    category: { aimed: 'Mira', auto: 'Automática', area: 'Em volta' },
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
    /** Under Pular's label: what skipping gives. */
    skipGold: (gold: number) => `+${gold} ouro`,
    /** Several recipe lines on one card. */
    recipeSep: ' · ',
    /** The build and stats panel beside the choices. */
    build: 'Sua build',
    groups: { survive: 'Sobreviver', attack: 'Ataque', collect: 'Coleta' },
    /** A stat still at its base value. */
    untouched: '-',
    preview: (from: string, to: string) => `${from} → ${to}`,
    /** A passive's change with the total it leads to, on cards without the stat panel. */
    withTotal: (change: string, total: string) => `${change} (${total})`,
  },

  /** The Elo moments in a run: the recipe progress and the forge notice. */
  elo: {
    /** An Elo's line on its page, in quotes. */
    quote: (line: string) => `“${line}”`,
    /** The in-run notice when an Elo forms. */
    forged: (elo: string, weapon: string, passive: string) => `Elo forjado: ${elo} · ${weapon} + ${passive}`,
    /** A recipe's progress, after the choice on a level-up card and live on the pause screen. */
    progress: (elo: string, weapon: string, passive: string, passiveLevel: string) =>
      `Elo ${elo}: arma ${weapon}${' · '}${passive} ${passiveLevel}`,
    /** One line per Elo (the Livro de Elos; written for the Survivors, no new lore facts). */
    lines: {
      fury: 'A Lâmina de Valmor não escolhe mais um lado: corta tudo em volta.',
      holyLight: 'A luz de Elun se multiplica e atravessa a escuridão.',
      yahFlame: 'O pequeno halo vira fogueira. Quem chega perto não volta.',
      fan: 'Andilla abre a mão, e as facas se abrem em leque.',
      vigil: 'Quatro espadas, quatro paladinos, nenhuma brecha.',
      blizzard: 'O frio do sul desce inteiro sobre o campo.',
      storm: 'O céu inteiro responde de uma vez.',
      forgeFury: 'Da forja do Gaspar, martelos que não param.',
      soulProcession: 'As luzes seguem em fila, como velas numa procissão.',
      valmorWall: 'Escudo junto de escudo: por aqui ninguém passa.',
      jointBreaker: 'Ferro contra osso: o chão se abre duas vezes.',
      fireSword: 'Aço e chama caem juntos do céu.',
      lyraStar: 'O cajado de Lyra acende uma estrela, e ela não cabe numa só.',
    } as Partial<Record<WeaponId, string>>,
  },

  /** Reward cards (data/rewards.ts): they fill the choice once weapons and passives run short. */
  rewards: {
    goldBag: { name: 'Bolsa de Ouro', desc: (gold: number) => `+${gold} de ouro` },
    feast: { name: 'Banquete', desc: (pct: number) => `Recupera ${pct}% da vida` },
    blessing: { name: 'Bênção de Yah', desc: (pct: number) => `+${pct}% de dano (acumula)` },
  } satisfies Record<RewardId, { name: string; desc: (n: number) => string }>,

  chest: {
    gained: (name: string) => `Baú: ${name}`,
    /** Nothing left to level: only the gold and the heal. */
    plain: 'Baú: ouro e cura',
  },

  pickups: {
    chest: 'Baú',
    gold: 'Moeda',
    food: 'Pão da Berta',
    magnet: 'Pedra-Ímã',
    bomb: 'Badalada!',
    freeze: 'Sopro de Geada!',
    elixir: 'Elixir!',
  } satisfies Record<PickupId, string>,

  eliteWarning: 'Um inimigo poderoso se aproxima!',
  thiefWarning: 'Um ladrão está levando suas gemas!',
  thiefEscaped: 'O ladrão fugiu.',

  pause: {
    title: 'Pausa',
    resume: 'Continuar',
    quit: 'Desistir',
    /** Desistir asks once more (for 2 s) before ending the run. */
    quitConfirm: 'Confirmar desistir',
    build: 'Sua build',
    stats: 'Atributos',
    level: (n: number, max: number) => `Nv ${n}/${max}`,
    /** Each weapon's Elo recipe status. */
    formed: 'Elo formado',
    none: 'Sem Elo',
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
      vigil: 'Noite Sem Fim',
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
      shoot: 'Atira de longe',
      leap: 'Salta e cai em área',
      pack: 'Cerca pelos lados',
      still: 'Não sai do lugar',
      banner: 'Fortalece quem está perto',
      nest: 'Gera aranhas até cair',
      flee: 'Foge com suas gemas',
      elite: 'Deixa um baú',
      cleave: 'Corte Brutal',
      toll: 'Badalada',
      lunge: 'Mordida Funda',
      frost: 'Uivo da Geada',
      web: 'Teia',
      eggs: 'Ovos',
      dig: 'Abre covas ao redor',
      reassemble: 'Levanta se a pilha não for quebrada',
      burst: 'Estoura ao cair',
    },
    /** A boss with several abilities lists them by name (the same kind can have another name in another boss). */
    bossAbilities: {
      oldWolf: ['Mordida Funda', 'Uivo da Geada'],
      spiderMother: ['Ferroada', 'Teia', 'Ovos'],
      bellRinger: ['Badalada', 'Dobre Fúnebre'],
    } as Partial<Record<EnemyId, string[]>>,
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
      // written for the Survivors (provisional, FT-07)
      frostBoar: 'Abaixa a cabeça, raspa o gelo e vem. Na estrada estreita, só resta o lado.',
      warBanner: 'Enquanto o pano estiver de pé, eles não recuam.',
      // written for the Survivors (provisional, FT-09)
      // written for the Survivors (provisional, FT-12)
      spiderMother: 'Os ovos ficam nas cercas. A mãe fica onde é mais escuro.',
      spiderEgg: 'Quebre antes que trinque.',
      // written for the Survivors (provisional, FT-11)
      witch: 'Ri sozinha mexendo o caldeirão. Derrube a velha e a última poção é sua.',
      // written for the Survivors (provisional, FT-14)
      emberBones: 'As brasas no peito não apagam com a queda. Longe dela, quando estourar.',
      // written for the Survivors (provisional, FT-16); the Morcego Vampiro and the Toque Gélido are from the original
      vampireBat: 'Desce da abóbada da cripta e morde de passagem.',
      coldSpirit: 'Um frio que se solta das mãos e vem devagar. Dê a volta.',
      // written for the Survivors (provisional, FT-16)
      gravedigger: 'Cuida das covas da cripta. Quando finca a pá, as covas se abrem.',
      // written for the Survivors (provisional, FT-10)
      thiefRat: 'Leva tudo o que brilha no chão. Pegue o rato e pegue o saco.',
      spiderNest: 'Um novelo de teia que pulsa. Cada pulso é mais uma aranha.',
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
      slime:
        'Escorre do limo da cripta e deixa um rastro que prende os pés. Bater nela é como bater em mingau.',
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
    rule: 'Arma e a passiva da receita no nível máximo: o Elo se forja na hora.',
    recipe: (weapon: string, passive: string) => `${weapon} + ${passive}`,
    hint: (weapon: string) => `Nasce de ${weapon}`,
    /** The recipe drawn as icons: weapon + passive = Elo, the passive a mystery until discovered. */
    plus: '+',
    equals: '=',
    mystery: '?',
    /** A formed Elo's page: its element, what it does, its line, and the way back to the grid. */
    /** The page's element and weapon category: "Elemento: Fúria · Mira". */
    elementAndCategory: (name: string, category: string) => `Elemento: ${name} · ${category}`,
    effect: 'O que faz',
    open: 'Toque num Elo descoberto para ver a página dele.',
    elements: {
      fury: 'Fúria',
      fire: 'Fogo',
      forge: 'Forja',
      shadow: 'Sombra',
      ice: 'Gelo',
      storm: 'Tempestade',
      holy: 'Sagrado',
      arcane: 'Arcano',
      earth: 'Terra',
      soul: 'Alma',
      steel: 'Aço',
    } satisfies Record<ElementId, string>,
  },

  options: {
    title: 'Opções',
    damageNumbers: 'Números de dano',
    calm: 'Tela calma (sem tremor)',
    muted: 'Som',
    /** Short names, for the one-row toggles on the pause screen. */
    soundShort: 'Som',
    numbersShort: 'Números',
    calmShort: 'Calma',
    /** The seal beside each option. */
    on: 'Ligado',
    off: 'Desligado',
  },

  /** Noite Sem Fim: after the boss, the run can go on with ever-growing waves. */
  vigil: {
    start: 'A Noite Sem Fim começou!',
    hint: 'As ondas não param de crescer. Até onde você aguenta?',
  },

  end: {
    /** Offered after a victory: go on into the Noite Sem Fim. */
    continueVigil: 'Continuar a vigília',
    vigilOver: 'A vigília terminou',
    vigilText: (time: string) => `Você aguentou ${time} na Noite Sem Fim.`,
    vigilRecord: 'Novo recorde da vigília!',
    won: 'Vitória!',
    lost: 'Fim de jogo',
    lostText: (hero: string) => `${hero} tombou na neve. Valmor ainda espera por um herói.`,
    unlocked: (stage: string) => `Nova fase liberada: ${stage}`,
    newElo: (name: string, gold: number) => `Elo descoberto: ${name}! +${gold} de ouro. Veja na Coleção.`,
    banked: (gold: number) => `No cofre: ${gold} ouro`,
    /** Packed notes, when the end screen runs out of room. */
    elosFound: (names: string, gold: number) => `Elos descobertos: ${names}! +${gold} de ouro`,
    achievementsFound: (n: number) => `${n} conquistas novas! Veja na Coleção.`,
    bankedGoal: (gold: number, name: string, missing: number) =>
      `No cofre: ${gold} ouro · faltam ${int(missing)} para ${name}`,
    /** The long-term goal: the most expensive thing left in the Loja. */
    toBuy: (name: string, missing: number) => `Faltam ${int(missing)} para ${name}`,
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
    /** "Faltou pouco" names the piece one level short (NU-05): the weapon or the recipe's passive. */
    almostElo: (piece: string, elo: string) => `Faltou 1 nível de ${piece} para forjar ${elo}!`,
    almostEloUnknown: (piece: string, weapon: string) =>
      `Faltou 1 nível de ${piece} para o Elo de ${weapon}!`,
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
      elites25: { name: 'Pedra Partida', desc: (n) => `Derrote ${n} elites.` },
      hit80: { name: 'Golpe Forte', desc: (n) => `Acerte um golpe de arma de ${n} ou mais.` },
      hit120: { name: 'Na Junta', desc: (n) => `Acerte um golpe de arma de ${n} ou mais.` },
      damageRun: { name: 'Forja Acesa', desc: (n) => `Cause ${n} de dano numa partida.` },
      damageTotal: { name: 'Bigorna do Gaspar', desc: (n) => `Cause ${n} de dano no total.` },
      survive5: { name: 'Meia-Noite', desc: 'Sobreviva 5 minutos.' },
      survive10: { name: 'Até o Fim da Noite', desc: 'Sobreviva até o chefe chegar.' },
      untouched: { name: 'Nem um Arranhão', desc: 'Passe 1:30 sem levar dano.' },
      closeWin: { name: 'Por um Fio', desc: 'Vença uma fase com 10% da vida ou menos.' },
      level50: { name: 'Lenda da Taverna', desc: (n) => `Chegue ao nível ${n} numa partida.` },
      vigil5: { name: 'Até o Amanhecer', desc: 'Aguente 5 minutos na Noite Sem Fim.' },
      eloFirst: { name: 'Primeiro Elo', desc: 'Forme um Elo.' },
      elosRun3: { name: 'Corrente Inteira', desc: (n) => `Forme ${n} Elos numa partida.` },
      elosHero: { name: 'Um Herói, Todos os Elos', desc: 'Forme todos os Elos com um mesmo herói.' },
      maxed4: {
        name: 'Mãos de Ferreiro',
        desc: (n) => `Termine uma partida com ${n} armas no nível máximo (Elos contam).`,
      },
      allShared: { name: 'Conhece o Ofício', desc: 'Use cada arma (fora os Elos) pelo menos uma vez.' },
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
      // The id kept from the Cavaleiro Negro's days, so whoever had it still has it (FT-13); the name is provisional.
      bossKnight: { name: 'Ninho Desfeito', desc: 'Derrote a Mãe-Aranha.' },
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
      vigil5: 'Vigia da Noite',
      killsTotal50k: 'Guardião de Valmor',
      soloWin: 'Fiel à Primeira',
      winAll: 'Um dos Quatro',
      seenAll: 'Caçador das Covas',
      elosAll: 'Mestre dos Elos',
      elosHero: 'Forjador de Elos',
    } as Partial<Record<AchievementId, string>>,
    reward: (gold: number) => `+${gold} ouro`,
    /** The in-run notice. */
    toast: 'Conquista!',
    progress: (value: string, goal: string) => `${value} de ${goal}`,
  },

  shop: {
    title: 'Loja do Gaspar',
    intro: 'O ferreiro de Valmor troca ouro por preparo. As compras valem para todas as partidas.',
    /** Gaspar's line on the first visit. */
    greeting: 'Gaspar, o ferreiro de Valmor. Aço simples, mas é o melhor da rua.',
    gold: (n: number) => `Ouro: ${n}`,
    level: (lv: number, max: number) => `${lv}/${max}`,
    cost: (n: number) => `${n} ouro`,
    maxed: 'Completo',
    maxedShort: '✓',
    costShort: (n: number) => int(n),
    back: 'Voltar',
    sections: { stats: 'Atributos', helps: 'Ajudas na escolha', special: 'Especiais' },
    /** Section tabs on small phones, where the whole list doesn't fit. */
    tabs: { stats: 'Atributos', helps: 'Ajudas', special: 'Especiais' },
    /** The detail panel of the selected item. */
    now: 'Agora',
    next: 'Próximo',
    none: 'nada ainda',
    buy: (cost: number) => `Comprar (${int(cost)})`,
    missing: (n: number) => `Faltam ${int(n)} ouro`,
    hintKeys: 'Setas escolhem · Espaço ou Enter compra',
    /** A charge item's total per run: "Trocar +2 por partida". */
    chargeTotal: {
      reroll: (n: number) => `Trocar +${n} por partida`,
      skip: (n: number) => `Pular +${n} por partida`,
      banish: (n: number) => `Banir +${n} por partida`,
    },
    /** Segunda Chance's effect: how many times the hero gets up per run. */
    reviveTotal: (n: number) =>
      n === 1 ? 'Levanta 1 vez com metade da vida' : `Levanta ${n} vezes com metade da vida`,
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
      revive: 'Segunda Chance',
    } satisfies Record<ShopId, string>,
    charges: {
      reroll: 'Trocar +1 por partida',
      skip: 'Pular +1 por partida',
      banish: 'Banir +1 por partida',
    } satisfies Record<ChargeKey, string>,
  },

  /** Test mode (`?dev` in the URL). */
  dev: {
    tag: 'MODO DEV · progresso à parte',
    /** Standing, where the corner is narrow. */
    tagShort: 'MODO DEV',
    down: '−',
    up: '+',
    allMax: 'Tudo no máximo',
    allZero: 'Zerar tudo',
    hint: '+ e − mudam o nível (grátis)',
  },

  bossWarning: (boss: string) => `${boss} chegou!`,
  arenaClosed: (boss: string) => `${boss} fecha a estrada!`,
  /** Segunda Chance used: the hero got up again. */
  revived: 'Segunda Chance! De pé outra vez.',

  /** The hero screen (Começar opens it), then the stage screen and a stage's story. */
  heroes: {
    title: 'Heróis',
    pick: 'Escolha quem vai defender Valmor',
    advantage: 'Vantagem',
    record: (wins: number, best: string) =>
      wins > 0 ? `Vitórias: ${wins} · Melhor: ${best}` : `Sem vitórias · Melhor: ${best}`,
    noRuns: 'Ainda não jogou',
    keys: '↑↓ herói · Enter escolhe · Esc volta',
  },
  /** The story shown before a stage (approved by Daniel, 2026-11-11; from the canon: prólogo and capítulo 1). */
  stageStory: {
    valmor:
      'Valmor fica no sul gelado de Imladrin. De noite, as covas do cemitério aparecem abertas, e os mortos não ficam deitados. Aldo voltou em busca de trabalho, e de Clara. Trabalho é o que não falta. Proteja a vila até o amanhecer.',
    crypt:
      'A igreja velha rachou há cinquenta anos, e o povo passou a rezar na capela nova. Desde então ninguém mais desce à cripta. Agora alguém cavou por baixo dela, e o sino volta a tocar sem ninguém lá dentro. Desça, e não deixe o sino chamar o resto dos mortos.',
    southRoad:
      'A estrada de neve corre entre os pinheiros, e a luz do lampião alcança pouco. A matilha saiu da floresta, e os cavalos fugiram para o pasto. Para chegar a Erukh, é preciso passar por ela.',
  } satisfies Record<StageId, string>,
  stageScreen: {
    title: 'Fase',
    go: 'Partir',
    keys: '↑↓ fase · Enter abre · Esc volta',
    /** The line on a closed stage's card: what opens it. */
    unlockBy: (name: string) => `Vença ${name} para abrir`,
    boss: (name: string) => `Chefe: ${name}`,
  },
  select: {
    title: 'Preparação',
    hero: 'Herói',
    stage: 'Fase',
    go: 'Partir',
    back: 'Voltar',
    gold: (n: number) => `Ouro: ${n}`,
    unlock: (n: number) => `Liberar: ${n} ouro`,
    /** The second step of buying a hero. */
    confirmUnlock: (n: number) => `Confirmar: ${n} ouro`,
    locked: 'Vença a fase anterior',
    /** Seal on a stage already won. */
    cleared: 'Vencida',
    keys: '←→ herói · ↑↓ fase · Enter parte',
    signature: (weapon: string) => `Arma inicial: ${weapon}`,
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
      desc: 'Celeiros, cercas e campos na neve, tomados por ratos e aranhas.',
      won: 'A Mãe-Aranha caiu. Mas o sino da igreja velha continua tocando.',
    },
    crypt: {
      name: 'Cripta da Igreja Velha',
      desc: 'Pedra azul, limo e um sino que não devia tocar.',
      won: 'O Sineiro se calou. O sino não toca mais.',
    },
    southRoad: {
      name: 'Estrada do Sul',
      desc: 'Uma estrada estreita entre pinheiros: encapuzados, goblins e a matilha do Lobo Velho.',
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
    blade: {
      name: 'Lâmina de Valmor',
      desc: 'Golpe largo em arco à frente.',
    },
    elunLight: { name: 'Luz de Elun', desc: 'Uma luz sagrada que busca o inimigo mais próximo.' },
    yahAura: { name: 'Aura de Yah', desc: 'Queima tudo o que chega perto.' },
    daggers: {
      name: 'Adagas de Andilla',
      desc: 'Facas rápidas para onde você anda. Param no primeiro inimigo, e às vezes acertam em cheio.',
    },
    staff: {
      name: 'Cajado de Lyra',
      desc: 'Um orbe disparado para onde você anda, que explode no primeiro inimigo.',
    },
    paladinSwords: { name: 'Espadas dos Paladinos', desc: 'Espadas que giram em volta do herói.' },
    frost: { name: 'Geada de Valmor', desc: 'Manchas de gelo que ferem e atrasam os inimigos.' },
    hammer: {
      name: 'Martelo do Gaspar',
      desc: 'Um martelo pesado lançado à frente, que atravessa e empurra longe.',
    },
    wisps: { name: 'Fogos-Fátuos', desc: 'Luzes lentas que perseguem os mortos por muito tempo.' },
    shields: {
      name: 'Escudos de Valmor',
      desc: 'Escudos girando perto do herói, que empurram quem acertam.',
    },
    lightning: { name: 'Raio', desc: 'Raios caem sobre inimigos ao acaso.' },
    fury: {
      name: 'Fúria',
      desc: 'A espada gira contra todos ao redor e, a cada segundo golpe, solta uma onda cortante à frente.',
    },
    holyLight: {
      name: 'Luz Sagrada',
      desc: 'Um enxame de luzes que atravessa os mortos. Cada abate pela luz cura um pouco.',
    },
    yahFlame: {
      name: 'Chama de Yah',
      desc: 'O halo vira uma fogueira larga que, a cada 3 segundos, solta uma onda que empurra tudo para longe.',
    },
    fan: {
      name: 'Leque de Facas',
      desc: 'Cada faca ricocheteia até 3 vezes no inimigo mais próximo. Acertos em cheio fazem sangrar.',
    },
    vigil: {
      name: 'Vigília dos Quatro',
      desc: 'Espadas em volta do herói que, uma vez por volta, avançam até o inimigo mais perto e voltam.',
    },
    blizzard: {
      name: 'Nevasca',
      desc: 'Geada que deixa os inimigos lentos. Quem morre dentro dela se estilhaça e fere quem está perto.',
    },
    storm: { name: 'Tempestade', desc: 'Raios caem sobre os mortos e cada um pula para mais 2 inimigos.' },
    forgeFury: {
      name: 'Fúria da Forja',
      desc: 'Martelos que atravessam tudo e voltam como bumerangue, acertando de novo na volta.',
    },
    soulProcession: {
      name: 'Procissão das Almas',
      desc: 'Uma fila de luzes caminha pelo campo. Cada abate soma mais uma luz por alguns segundos.',
    },
    valmorWall: {
      name: 'Muralha de Valmor',
      desc: 'Um anel de escudos e uma proteção que segura um golpe a cada 10 segundos e devolve a pancada.',
    },
    mace: {
      name: 'Maça de Ferro',
      desc: 'Uma pancada pesada à frente deixa os inimigos tontos. A cada três golpes, uma onda de choque empurra todos para longe.',
    },
    fire: { name: 'Fogo', desc: 'Chamas caem sobre os inimigos e queimam uma área larga.' },
    jointBreaker: {
      name: 'Quebra-Junta',
      desc: 'Cada pancada solta a onda de choque e logo outra menor, e quem já está tonto leva mais dano.',
    },
    fireSword: {
      name: 'Espada de Fogo',
      desc: 'Espadas em chamas caem sobre o campo, e o chão onde caem queima e põe fogo em quem passa.',
    },
    lyraStar: {
      name: 'Estrela de Lyra',
      desc: 'O orbe explode e se parte em estrelas pequenas, que caem em volta e explodem de novo.',
    },
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
    frostBoar: 'Javali da Geada',
    warBanner: 'Estandarte da Aliança Negra',
    spiderNest: 'Ninho de Aranha',
    thiefRat: 'Rato Ladrão',
    emberBones: 'Ossada em Brasa',
    gravedigger: 'Coveiro',
    vampireBat: 'Morcego Vampiro',
    coldSpirit: 'Espírito Gélido',
    witch: 'Bruxa do Caldeirão',
    spiderEgg: 'Ovo de Aranha',
    spiderMother: 'Mãe-Aranha',
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
    blast: 'Explosão',
    wave: 'Onda',
    waveRadius: 'Alcance da onda',
    waveKnockback: 'Empurrão da onda',
    stun: 'Tontura',
    lifetime: 'Permanência',
  } as Record<string, string>,
} as const;
