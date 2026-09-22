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
  // LE DÉFAUT QU'ON CRAINT N'EST PAS « le cookie n'est pas effacé » — c'est
  // « l'effacement ne correspond pas à la pose ». Un navigateur n'écrase un
  // cookie que si ses attributs correspondent : un `Path` ou un `Domain`
  // divergent laisserait l'original en place et la déconnexion mentirait, SANS
  // la moindre erreur nulle part.
  //
  // ON BALAIE `PORTAIL_COOKIE_OPTIONS` EN ENTIER, ON NE NOMME PAS QUATRE
  // ATTRIBUTS. Une version antérieure de ce banc en vérifiait quatre, nommés à
  // la main : la revue adversariale a ajouté un `domain` à la pose, et le banc
  // est resté VERT. Un banc qui n'énumère que ce qu'il connaît ne garde rien
  // contre l'attribut suivant. La table ci-dessous est donc fermée : une clé
  // qu'elle ignore fait rougir, ce qui force à traiter le cas plutôt qu'à le
  // manquer.
  const RENDU: Record<string, { attribut: string; drapeau: boolean }> = {
    httpOnly: { attribut: 'httponly', drapeau: true },
    secure: { attribut: 'secure', drapeau: true },
    sameSite: { attribut: 'samesite', drapeau: false },
    path: { attribut: 'path', drapeau: false },
    domain: { attribut: 'domain', drapeau: false },
    maxAge: { attribut: 'max-age', drapeau: false },
  };

  it('efface avec les mêmes attributs que la pose, TOUS balayés', async () => {
    const attrs = attributs(await POST(requete(signPatientSession({ idPatient: 'PAT_TEST', email: EMAIL }))));

    for (const [cle, valeur] of Object.entries(PORTAIL_COOKIE_OPTIONS)) {
      const forme = RENDU[cle];
      // Clé neuve dans les options : ce banc ne sait pas la vérifier, donc il
      // refuse de prétendre le contraire.
      expect(forme, `attribut de cookie non couvert par ce banc : ${cle}`).toBeDefined();

      // `maxAge` est le SEUL écart admis, et il est l'objet même du geste.
      if (cle === 'maxAge') {
        expect(attrs.get('max-age')).toBe('0');
        continue;
      }
      if (forme.drapeau) expect(attrs.has(forme.attribut)).toBe(valeur);
      else expect(attrs.get(forme.attribut)?.toLowerCase()).toBe(String(valeur).toLowerCase());
    }
  });

  // La route AFFIRME, en commentaire, n'accepter que POST — « un `<img src>` sur
  // un site tiers déconnecterait les patients au passage ». Rien ne tenait cette
  // affirmation : ajouter `export const GET = POST` laissait les bancs verts.
  it('n’expose que POST — aucun autre verbe', async () => {
    // `module` est un nom INTERDIT ici : `@next/next/no-assign-module-variable`
    // refuse la liaison, y compris dans un banc — vert en Vitest, rouge au lint
    // de T3. D'où `routeModule`.
    const routeModule = await import('./route');
    const verbes = ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    expect(verbes.filter((v) => v in routeModule)).toEqual([]);
    expect('POST' in routeModule).toBe(true);
  });

  it('reste une réussite sans session ouverte', async () => {
    const res = await POST(requete());
    expect(res.status).toBe(200);
    expect(enteteCookie(res)).toMatch(/Max-Age=0/i);
  });

  // LE CAS QUI FAISAIT ÉCHOUER LA DÉCONNEXION EN SILENCE (revue Copilot).
  // `readPatientSession` fait un `decodeURIComponent` non protégé : `%` seul
  // lève `URIError`. La route sortait en 500 AVANT de poser le `Set-Cookie`, et
  // le bouton redirigeait sans regarder la réponse — le patient lisait
  // « déconnecté » en gardant sa session. Un cookie illisible est exactement le
  // cas où l'effacement doit aboutir.
  it('efface même quand le cookie est illisible (URIError)', async () => {
    const req = new Request('http://localhost/api/portail/deconnexion', {
      method: 'POST',
      headers: { cookie: 'wn_portail=%' },
    });
    const res = await POST(req);
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
