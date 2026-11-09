import { describe, expect, it } from 'vitest';
import { defaultSettings, sanitizeSettings } from '../../src/core/settings';

describe('settings', () => {
  it('fall back to defaults for missing or broken data', () => {
    expect(sanitizeSettings(null)).toEqual(defaultSettings());
    expect(sanitizeSettings('x')).toEqual(defaultSettings());
    expect(sanitizeSettings({ damageNumbers: 'no', calm: 3 })).toEqual(defaultSettings());
  });

  it('keep valid stored values and ignore unknown keys', () => {
    const s = sanitizeSettings({ damageNumbers: false, muted: true, extra: 1 });
    expect(s).toEqual({ damageNumbers: false, calm: false, muted: true, eloTipSeen: false, gasparMet: false });
    expect(sanitizeSettings({ eloTipSeen: true }).eloTipSeen).toBe(true);
    expect(sanitizeSettings({ gasparMet: true }).gasparMet).toBe(true);
  });
});
