import { describe, expect, it } from 'vitest';
import { formatTime } from '../../src/core/format';

describe('formatTime', () => {
  it('formats mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(125.7)).toBe('02:05');
    expect(formatTime(600)).toBe('10:00');
    expect(formatTime(-3)).toBe('00:00');
  });
});
