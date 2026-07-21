import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logger } = vi.hoisted(() => ({ logger: { security: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/observability/logger', () => ({ logger }));

import { GET } from './route';

const CLIENT_ID = 'client-patient-de-test.apps.googleusercontent.example';

function appeler() {
  return GET(new Request('http://localhost:3000/portail/google'));
}

describe('GET /portail/google — départ du chemin Google', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    process.env.WN_GOOGLE_PATIENT_CLIENT_ID = CLIENT_ID;
    process.env.WN_GOOGLE_PATIENT_CLIENT_SECRET = 'secret-de-test-non-production';
  });

  // Ce qui rend l'activation (03d) réelle : merger 03c n'ouvre rien.
  it('drapeau éteint : la route n’existe pas', async () => {
    delete process.env.WN_G5_GOOGLE_PATIENT;
    const res = await appeler();
    expect(res.status).toBe(404);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('envoie chez Google avec le client patient, un state et un nonce', async () => {
    const res = await appeler();
    const cible = new URL(res.headers.get('location') ?? '');
    expect(cible.origin).toBe('https://accounts.google.com');
    expect(cible.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(cible.searchParams.get('scope')).toBe('openid email');
    expect(cible.searchParams.get('state')).toBeTruthy();
    expect(cible.searchParams.get('nonce')).toBeTruthy();
  });

  it('pose l’état d’aller dans un cookie httpOnly, éphémère', async () => {
    const cookie = (await appeler()).headers.get('set-cookie') ?? '';
    expect(cookie).toContain('wn_portail_google=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Max-Age=600');
    // `lax` et non `strict` : le retour vient de Google, donc d'un autre site.
    // En `strict`, le cookie ne reviendrait jamais et rien n'aboutirait.
    expect(cookie.toLowerCase()).toContain('samesite=lax');
  });

  // Ni le secret client, ni le nonce (qui vit dans le cookie signé) n'ont à
  // traverser l'écran de la personne autrement que sous la forme prévue.
  it('le secret client ne part pas vers le navigateur', async () => {
    const res = await appeler();
    const tout = `${res.headers.get('location')}${res.headers.get('set-cookie')}`;
    expect(tout).not.toContain('secret-de-test-non-production');
  });

  // État normal de la production entre le merge de 03c et l'activation : le
  // drapeau peut précéder l'existence du client OAuth.
  it('drapeau allumé sans client OAuth : refus propre, pas de 500', async () => {
    delete process.env.WN_GOOGLE_PATIENT_CLIENT_ID;
    const res = await appeler();
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/portail/connexion?etat=refus');
    expect(logger.security).toHaveBeenCalled();
  });
});
