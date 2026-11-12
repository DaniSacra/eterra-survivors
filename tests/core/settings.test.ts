import { describe, expect, it } from 'vitest';
import { defaultSettings, musicScale, nextMusic, sanitizeSettings } from '../../src/core/settings';

describe('settings', () => {
  it('fall back to defaults for missing or broken data', () => {
    expect(sanitizeSettings(null)).toEqual(defaultSettings());
    expect(sanitizeSettings('x')).toEqual(defaultSettings());
    expect(sanitizeSettings({ damageNumbers: 'no', calm: 3 })).toEqual(defaultSettings());
  });

  it('keep valid stored values and ignore unknown keys', () => {
    const s = sanitizeSettings({ damageNumbers: false, muted: true, extra: 1 });
    expect(s).toEqual({
      damageNumbers: false,
      calm: false,
      muted: true,
      music: false,
      musicLevel: 'normal',
      tips: true,
      stats: true,
      statsNoticed: false,
      gasparMet: false,
    });
    expect(sanitizeSettings({ gasparMet: true }).gasparMet).toBe(true);
    expect(sanitizeSettings({ music: false }).music).toBe(false);
  });

  it('an old save without a music level plays at Normal, and a bad one too', () => {
    expect(sanitizeSettings({ music: true }).musicLevel).toBe('normal');
    expect(sanitizeSettings({ music: false, musicLevel: 'loud' }).musicLevel).toBe('normal');
    expect(sanitizeSettings({ musicLevel: 'low' }).musicLevel).toBe('low');
  });

  it('the music button cycles Desligada, Baixa, Normal, and Baixa is half the volume', () => {
    let s = { music: false, musicLevel: 'normal' } as const;
    expect(musicScale(s)).toBe(0);
    s = nextMusic(s) as typeof s;
    expect(s).toEqual({ music: true, musicLevel: 'low' });
    expect(musicScale(s)).toBe(0.5);
    s = nextMusic(s) as typeof s;
    expect(s).toEqual({ music: true, musicLevel: 'normal' });
    expect(musicScale(s)).toBe(1);
    expect(nextMusic(s)).toEqual({ music: false, musicLevel: 'normal' });
  });
});
