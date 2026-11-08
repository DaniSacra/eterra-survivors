import { describe, expect, it } from 'vitest';
import { t } from '../../src/i18n/pt-BR';

describe('i18n', () => {
  it('has a title', () => expect(t.title).toBe('Eterra Survivors'));
});
