import { beforeEach, describe, expect, it, vi } from 'vitest';

// Le helper doit APPENDER les timeouts à l'URL SMTP sans ré-encoder les
// identifiants, et laisser nodemailer les lire depuis les query params.
// `vi.hoisted` : le mock est hoisté au-dessus des déclarations, la factory doit
// donc trouver `createTransport` déjà initialisé.
const { createTransport } = vi.hoisted(() => ({
  createTransport: vi.fn((_url: string) => ({ sendMail: vi.fn() })),
}));
vi.mock('nodemailer', () => ({ default: { createTransport } }));

import { creerTransportSmtp } from './transportSmtp';

function derniereUrl(): string {
  return createTransport.mock.calls.at(-1)?.[0] as string;
}

describe('creerTransportSmtp', () => {
  beforeEach(() => createTransport.mockClear());

  it('appende les trois timeouts (URL sans query) et préserve les identifiants', () => {
    creerTransportSmtp('smtp://user:pass@smtp.example.com:587');
    const url = derniereUrl();
    expect(url).toContain('connectionTimeout=10000');
    expect(url).toContain('greetingTimeout=10000');
    expect(url).toContain('socketTimeout=20000');
    // Séparateur '?' quand il n'y a pas de query, et identifiants intacts (pas de
    // round-trip `new URL` qui les ré-encoderait).
    expect(url).toMatch(/587\?connectionTimeout=/);
    expect(url).toContain('smtp://user:pass@smtp.example.com:587');
  });

  it('utilise « & » quand l’URL porte déjà une query', () => {
    creerTransportSmtp('smtp://h:1?pool=true');
    expect(derniereUrl()).toContain('pool=true&connectionTimeout=10000');
  });
});
