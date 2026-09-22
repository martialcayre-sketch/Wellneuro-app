import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logger } = vi.hoisted(() => ({
  logger: { warn: vi.fn(), security: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/observability/logger', () => ({ logger }));
// La route ne touche pas la base ; `patient-session` importe néanmoins le client
// Prisma. Même mock que `api/portail/session/route.test.ts` : un banc d'unité ne
// doit pas exiger un client généré.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { PORTAIL_COOKIE_OPTIONS, signPatientSession } from '@/lib/patient-session';
import { POST } from './route';

const EMAIL = 'sophie.nicola@example.test';

function requete(cookie?: string): Request {
  return new Request('http://localhost/api/portail/deconnexion', {
    method: 'POST',
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

/** L'en-tête `set-cookie` posé pour `wn_portail`, brut. */
function enteteCookie(res: Response): string {
  const entetes = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? ''];
  const ligne = entetes.find((e) => e.startsWith('wn_portail='));
  expect(ligne).toBeDefined();
  return ligne as string;
}

/**
 * Découpe l'en-tête en attributs, clés en minuscules.
 *
 * ON NE COMPARE PAS PAR `toContain`, et ce n'est pas du zèle : `Path=/portail`
 * CONTIENT `Path=/`. Une assertion par sous-chaîne laissait passer un chemin
 * divergent — exactement le défaut que ce banc existe pour attraper. Constaté
 * en mutant la route : la première version du banc restait verte.
 */
function attributs(res: Response): Map<string, string> {
  const [, ...reste] = enteteCookie(res).split(';');
  return new Map(
    reste.map((morceau) => {
      const eq = morceau.indexOf('=');
      return eq < 0
        ? ([morceau.trim().toLowerCase(), ''] as [string, string])
        : ([morceau.slice(0, eq).trim().toLowerCase(), morceau.slice(eq + 1).trim()] as [string, string]);
    }),
  );
}

describe('POST /api/portail/deconnexion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  });

  it('efface le cookie de session', async () => {
    const res = await POST(requete(signPatientSession({ idPatient: 'PAT_TEST', email: EMAIL })));
    expect(res.status).toBe(200);

    const cookie = enteteCookie(res);
    expect(cookie).toMatch(/^wn_portail=;/);
    expect(cookie).toMatch(/Max-Age=0/i);
  });

  // LE DÉFAUT QU'ON CRAINT N'EST PAS « le cookie n'est pas effacé » — c'est
  // « l'effacement ne correspond pas à la pose ». Un navigateur n'écrase un
  // cookie que si le trio nom/domaine/chemin correspond : un `Path` divergent
  // laisserait l'original en place et la déconnexion mentirait, SANS la moindre
  // erreur nulle part. Ce banc compare donc à la source de vérité de la pose.
  it('efface avec les mêmes attributs que la pose, sans quoi le navigateur garde l’original', async () => {
    const attrs = attributs(await POST(requete(signPatientSession({ idPatient: 'PAT_TEST', email: EMAIL }))));

    expect(attrs.get('path')).toBe(PORTAIL_COOKIE_OPTIONS.path);
    expect(attrs.get('samesite')?.toLowerCase()).toBe(PORTAIL_COOKIE_OPTIONS.sameSite);
    expect(attrs.has('httponly')).toBe(PORTAIL_COOKIE_OPTIONS.httpOnly);
    expect(attrs.has('secure')).toBe(PORTAIL_COOKIE_OPTIONS.secure);
  });

  it('reste une réussite sans session ouverte', async () => {
    const res = await POST(requete());
    expect(res.status).toBe(200);
    expect(enteteCookie(res)).toMatch(/Max-Age=0/i);
  });

  // `auth-securite.md` : jamais d'e-mail patient ni de cookie dans un journal.
  // La route ne journalise qu'un booléen — ce banc le tient.
  it('ne journalise ni l’adresse ni la valeur du cookie', async () => {
    const valeur = signPatientSession({ idPatient: 'PAT_TEST', email: EMAIL });
    await POST(requete(valeur));

    expect(logger.security).toHaveBeenCalledTimes(1);
    const journalise = JSON.stringify(logger.security.mock.calls[0][0]);
    expect(journalise).not.toContain(EMAIL);
    expect(journalise).not.toContain(valeur);
    expect(journalise).not.toContain('PAT_TEST');
  });
});
