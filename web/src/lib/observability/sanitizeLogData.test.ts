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
      emailPatient: 'patient@wellneuro.fr',
      token: 'abc123',
      access_token: 'snake-access-secret',
      accessToken: 'access-secret',
      rawAnswers: { q1: 'oui' },
      raw_answers: { q2: 'non' },
      systemPrompt: 'secret clinical prompt',
      system_prompt: 'secret clinical prompt 2',
      secret: 'super-secret',
      nested: { authorization: 'Bearer qwerty', 'Set-Cookie': 'sid=abc' },
      ok: true,
    });

    expect(out).toEqual({
      email: '[redacted]',
      emailPatient: '[redacted]',
      token: '[redacted]',
      access_token: '[redacted]',
      accessToken: '[redacted]',
      rawAnswers: '[redacted]',
      raw_answers: '[redacted]',
      systemPrompt: '[redacted]',
      system_prompt: '[redacted]',
      secret: '[redacted]',
      nested: { authorization: '[redacted]', 'Set-Cookie': '[redacted]' },
      ok: true,
    });
  });

  it('sérialise les erreurs de manière sûre', () => {
    const err = new Error('timeout on api for test@wellneuro.fr');
    const out = sanitizeError(err);
    expect(out.type).toBe('Error');
    expect(out.message).not.toContain('test@wellneuro.fr');
  });

  it('masque les secrets encodés dans une chaîne libre', () => {
    const err = new Error('token=abc123 secret=qwerty password=letmein');
    const out = sanitizeError(err);
    expect(out.message).toContain('token=[redacted]');
    expect(out.message).toContain('secret=[redacted]');
    expect(out.message).toContain('password=[redacted]');
    expect(out.message).not.toContain('abc123');
    expect(out.message).not.toContain('qwerty');
    expect(out.message).not.toContain('letmein');
  });
});
