import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/render/assets';
import { config } from '../../src/data/config';
import { ENEMIES, ENEMY_IDS } from '../../src/data/enemies';
import { PASSIVE_IDS } from '../../src/data/upgrades';
import { PICKUPS, PICKUP_IDS } from '../../src/data/pickups';
import { CHARACTERS, CHARACTER_IDS } from '../../src/data/characters';
import { STAGES, STAGE_IDS } from '../../src/data/stages';
import { WEAPONS, WEAPON_IDS } from '../../src/data/weapons';
import {
  describeUpgrade,
  formatCompact,
  formatDecimal,
  formatStatDelta,
  formatStatValue,
} from '../../src/render/describe';
import { t } from '../../src/i18n/pt-BR';

/** Guards the data-driven contract: every content entry has its text and its asset. */
describe('content integrity', () => {
  it('every enemy has a name and an existing sprite', () => {
    for (const id of ENEMY_IDS) {
      expect(t.enemies[id]).toBeTruthy();
      expect(ASSETS).toHaveProperty(ENEMIES[id].sprite);
    }
  });

  it('every weapon and passive has a name', () => {
    for (const id of WEAPON_IDS) expect(t.weapons[id].name).toBeTruthy();
    for (const id of PASSIVE_IDS) expect(t.passives[id]).toBeTruthy();
  });

  it('every hero and stage has its texts and assets', () => {
    for (const id of CHARACTER_IDS) {
      expect(t.characters[id].name).toBeTruthy();
      expect(ASSETS).toHaveProperty(CHARACTERS[id].sprite);
    }
    for (const id of STAGE_IDS) {
      expect(t.stages[id].name).toBeTruthy();
      expect(ASSETS).toHaveProperty(STAGES[id].tile);
    }
  });

  it('every gem tier and projectile has an asset', () => {
    for (const tier of config.gems.tiers) expect(ASSETS).toHaveProperty(tier.sprite);
    for (const id of WEAPON_IDS)
      if (WEAPONS[id].kind === 'homing' || WEAPONS[id].kind === 'thrown')
        expect(ASSETS).toHaveProperty(`proj.${id}`);
    for (const id of PICKUP_IDS) expect(ASSETS).toHaveProperty(PICKUPS[id].sprite);
  });
});

describe('upgrade descriptions', () => {
  it('formats report numbers compactly, pt-BR style', () => {
    expect(formatCompact(980.4)).toBe('980');
    expect(formatCompact(19_240)).toBe('19,2k');
    expect(formatCompact(25_000)).toBe('25k');
    expect(formatCompact(1_260_000)).toBe('1,3M');
    expect(formatDecimal(28.34)).toBe('28,3');
    expect(formatDecimal(0)).toBe('0,0');
  });

  it('formats stat deltas in Portuguese', () => {
    expect(formatStatDelta('maxHp', 20)).toBe('Vida máxima +20');
    expect(formatStatDelta('cooldown', -0.08)).toBe('Recarga −8%');
    expect(formatStatDelta('regen', 0.3)).toBe('Regeneração +0,3/s');
  });

  it('describes new weapons, weapon levels, passives and heal', () => {
    expect(describeUpgrade({ kind: 'weapon', id: 'elunLight', level: 1 }).tag).toBe(t.levelUp.newWeapon);
    expect(describeUpgrade({ kind: 'weapon', id: 'blade', level: 2 }).desc).toMatch(/^Dano 10 → 13/);
    expect(describeUpgrade({ kind: 'weapon', id: 'blade', level: 3 }).desc).toBe('Golpes 1 → 2');
    expect(describeUpgrade({ kind: 'passive', id: 'might', level: 2 }).desc).toBe('Dano +10%');
    expect(describeUpgrade({ kind: 'heal' }).title).toBe(t.levelUp.heal);
    expect(describeUpgrade({ kind: 'weapon', id: 'blade', level: 7 }).recipe).toContain('Força');
    expect(describeUpgrade({ kind: 'weapon', id: 'blade', level: 7 }).icon).toBe('icon.blade');
    expect(describeUpgrade({ kind: 'passive', id: 'might', level: 1 }, ['blade']).recipe).toContain('Lâmina');
    expect(describeUpgrade({ kind: 'passive', id: 'might', level: 1 }, ['frost']).recipe).toBe('');
  });

  it('stat sheet values: "-" at base, percent changes, plain numbers, and the preview pair', () => {
    expect(formatStatValue('might', 1, 1)).toBe('-');
    expect(formatStatValue('might', 1.2, 1)).toBe('+20%');
    expect(formatStatValue('cooldown', 0.92, 1)).toBe('−8%');
    expect(formatStatValue('armor', 0, 0)).toBe('-');
    expect(formatStatValue('armor', 2, 0)).toBe('2');
    expect(formatStatValue('maxHp', 100, 100)).toBe('100');
    expect(formatStatValue('regen', 0.3, 0)).toBe('0,3/s');
    expect(formatStatValue('amount', 1, 0)).toBe('+1');
    expect(formatStatValue('magnet', 100, 70)).toBe('100');
    // Força 1 → 2 on the sheet: "+10% → +20%".
    const from = formatStatValue('might', 1.1, 1);
    const to = formatStatValue('might', 1.1 + 0.1, 1);
    expect(t.levelUp.preview(from, to)).toBe('+10% → +20%');
  });

  it('recipes tell whether the passive is owned, and when the Elo is ready', () => {
    const blade7 = { kind: 'weapon', id: 'blade', level: 7 } as const;
    const blade3 = { kind: 'weapon', id: 'blade', level: 3 } as const;
    expect(describeUpgrade(blade3, ['blade']).recipe).toBe(t.levelUp.recipeNeed(t.passives.might));
    expect(describeUpgrade(blade3, ['blade']).recipeMissing).toBe(true);
    expect(describeUpgrade(blade3, ['blade'], { might: 1 }).recipe).toBe(
      t.levelUp.recipeHave(t.passives.might),
    );
    expect(describeUpgrade(blade7, ['blade'], { might: 2 }).recipe).toBe(t.levelUp.eloReady);
    expect(describeUpgrade(blade7, ['blade']).recipeIcon).toBe('icon.might');
    // Armor completes both the mace and the paladin swords: the card names both.
    const armor = describeUpgrade({ kind: 'passive', id: 'armor', level: 1 }, ['mace', 'paladinSwords']);
    expect(armor.recipe).toBe(
      t.levelUp.recipeForMany(`${t.weapons.mace.name}${t.levelUp.and}${t.weapons.paladinSwords.name}`),
    );
    expect(describeUpgrade({ kind: 'evolution', id: 'fury', from: 'blade' }).tag).toBe(t.levelUp.evolution);
  });
});

describe('icons', () => {
  it('every weapon, Elo and passive has a level-up icon', () => {
    for (const id of [...WEAPON_IDS, ...PASSIVE_IDS]) expect(ASSETS[`icon.${id}`], id).toBeDefined();
  });
});
