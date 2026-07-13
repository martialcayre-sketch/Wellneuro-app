import { describe, expect, it } from 'vitest';
import { sanitizeError, sanitizeMetadata, sanitizeUrl } from './sanitizeLogData';

describe('sanitizeLogData', () => {
  it('supprime les query params des URLs', () => {
    expect(sanitizeUrl('https://app.wellneuro.fr/portail/abc?token=secret&email=x@y.fr'))
      .toBe('https://app.wellneuro.fr/portail/abc');
  });

  it('masque les clés sensibles dans metadata', () => {
    const out = sanitizeMetadata({
      email: 'test@wellneuro.fr',
      token: 'abc123',
      nested: { authorization: 'Bearer qwerty' },
      ok: true,
    });

    expect(out).toEqual({
      email: '[redacted]',
      token: '[redacted]',
      nested: { authorization: '[redacted]' },
      ok: true,
    });
  });

  it('sérialise les erreurs de manière sûre', () => {
    const err = new Error('timeout on api for test@wellneuro.fr');
    const out = sanitizeError(err);
    expect(out.type).toBe('Error');
    expect(out.message).not.toContain('test@wellneuro.fr');
  });
});
