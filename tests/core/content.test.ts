import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/render/assets';
import { config } from '../../src/data/config';
import { ENEMIES, ENEMY_IDS } from '../../src/data/enemies';
import { PASSIVE_IDS } from '../../src/data/upgrades';
import { WEAPON_IDS } from '../../src/data/weapons';
import { describeUpgrade, formatStatDelta } from '../../src/render/describe';
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

  it('every gem tier and projectile has an asset', () => {
    for (const tier of config.gems.tiers) expect(ASSETS).toHaveProperty(tier.sprite);
    expect(ASSETS).toHaveProperty('proj.elunLight');
  });
});

describe('upgrade descriptions', () => {
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
  });
});
