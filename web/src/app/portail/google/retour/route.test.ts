import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, ensureActivePortalAccess, logger } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    portailConnexionGoogle: { create: vi.fn(), deleteMany: vi.fn() },
  },
  ensureActivePortalAccess: vi.fn(),
  logger: { security: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({ logger }));
vi.mock('@/lib/consultation/portal-access', async () => {
  const actual = await vi.importActual<typeof import('@/lib/consultation/portal-access')>(
    '@/lib/consultation/portal-access',
  );
  return { ...actual, ensureActivePortalAccess };
});

import { PortalAccessError } from '@/lib/consultation/portal-access';
import { COOKIE_ETAT, creerEtatGoogle } from '@/lib/portail/googleIdentite';
import { verifyPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const CLIENT_ID = 'client-patient-de-test.apps.googleusercontent.example';
const EMAIL = 'michel.dogne@fictif.wellneuro.fr';
const PATIENT = { idPatient: 'PAT_TEST', email: EMAIL, actif: true, accessTokenRevoked: false };

let etatCourant: ReturnType<typeof creerEtatGoogle>;

function jetonIdentite(sur: Record<string, unknown> = {}): string {
  const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const charge = {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 600,
    nonce: etatCourant.etat.nonce,
    email: EMAIL,
    email_verified: true,
    ...sur,
  };
  return `${b64({ alg: 'RS256' })}.${b64(charge)}.signature-inerte`;
}

function repondreGoogle(idToken: string | null, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: async () => (idToken ? { id_token: idToken } : {}) }),
  );
}

function appeler({
  code = 'code-de-test',
  state = () => etatCourant.etat.etat,
  cookie = () => etatCourant.cookie,
  erreur,
}: {
  code?: string | null;
  state?: () => string | null;
  cookie?: () => string | null;
  erreur?: string;
} = {}) {
  const url = new URL('http://localhost:3000/portail/google/retour');
  if (code) url.searchParams.set('code', code);
  const s = state();
  if (s) url.searchParams.set('state', s);
  if (erreur) url.searchParams.set('error', erreur);
  const c = cookie();
  return GET(new Request(url, { headers: c ? { cookie: `${COOKIE_ETAT}=${c}` } : {} }));
}

const REFUS = '/portail/connexion?etat=refus';

describe('GET /portail/google/retour — retour de Google', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    process.env.WN_GOOGLE_PATIENT_CLIENT_ID = CLIENT_ID;
    process.env.WN_GOOGLE_PATIENT_CLIENT_SECRET = 'secret-de-test-non-production';
    etatCourant = creerEtatGoogle(new Date());
    prisma.patient.findUnique.mockResolvedValue(PATIENT);
    prisma.portailConnexionGoogle.create.mockResolvedValue({ id: 'cx_1' });
    prisma.portailConnexionGoogle.deleteMany.mockResolvedValue({ count: 0 });
    ensureActivePortalAccess.mockResolvedValue({
      accessToken: 'TOK_PERMANENT',
      url: 'http://localhost:3000/portail/TOK_PERMANENT',
    });
    repondreGoogle(jetonIdentite());
  });

  it('drapeau éteint : la route n’existe pas', async () => {
    delete process.env.WN_G5_GOOGLE_PATIENT;
    const res = await appeler();
    expect(res.status).toBe(404);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('une adresse vérifiée et connue ouvre la session portail', async () => {
    const res = await appeler();
    expect(res.headers.get('location')).toContain('/portail/TOK_PERMANENT');
    expect(res.headers.get('set-cookie')).toContain('wn_portail=');
  });

  // L'assertion la plus importante du lot, et elle manquait : `toContain(
  // 'wn_portail=')` se contente de constater qu'UN cookie est posé. Signer
  // l'identité issue de Google plutôt que celle résolue en base, ou l'idPatient
  // d'un autre, laissait la suite verte — c'est-à-dire ouvrir l'espace de
  // quelqu'un d'autre sans qu'aucun test ne s'en aperçoive. Relevé en revue
  // adversariale le 2026-07-21.
  it('le cookie signé porte l’identité du patient résolu en base, et pas une autre', async () => {
    const res = await appeler();
    const valeur = /wn_portail=([^;]+)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? '';
    const session = verifyPatientSession(decodeURIComponent(valeur));

    expect(session).not.toBeNull();
    expect(session?.idPatient).toBe(PATIENT.idPatient);
    expect(session?.email).toBe(EMAIL);
  });

  // Le portail est ouvert pour CE patient : si l'argument dérivait, la session
  // serait posée sur un dossier et le jeton d'accès pris sur un autre.
  it('le portail est ouvert pour l’identifiant du patient résolu', async () => {
    await appeler();
    expect(ensureActivePortalAccess).toHaveBeenCalledWith(PATIENT.idPatient);
  });

  // La base est normalisée aujourd'hui (vérifié en production le 2026-07-21 :
  // 0 ligne sur 17 avec `email <> lower(email)`), mais aucune contrainte ne
  // l'impose. Si une ligne historique portait une majuscule, le cookie doit
  // rester cohérent avec ce que `isSessionValideForPatient` compare — lequel
  // met la valeur en base en minuscules avant de la confronter à la session.
  it('une casse différente en base ne casse pas la session ouverte', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...PATIENT, email: 'Michel.Dogne@fictif.wellneuro.fr' });
    const res = await appeler();
    const valeur = /wn_portail=([^;]+)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? '';
    expect(verifyPatientSession(decodeURIComponent(valeur))?.email).toBe(EMAIL);
  });

  // L'invariant de l'option A : le patient n'obtient jamais de session NextAuth.
  it('aucun cookie NextAuth n’est émis, jamais', async () => {
    const cookies = (await appeler()).headers.get('set-cookie') ?? '';
    expect(cookies).not.toContain('next-auth');
    expect(cookies).not.toContain('__Secure-next-auth');
  });

  it('l’adresse est recherchée en minuscules', async () => {
    repondreGoogle(jetonIdentite({ email: EMAIL.toUpperCase() }));
    await appeler();
    expect(prisma.patient.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: EMAIL } }),
    );
  });

  it('le cookie d’aller est effacé, même en cas de succès', async () => {
    const cookies = (await appeler()).headers.get('set-cookie') ?? '';
    expect(cookies).toContain(`${COOKIE_ETAT}=;`);
  });

  it.each([
    ['state absent', { state: () => null }],
    ['cookie d’aller absent', { cookie: () => null }],
    ['state d’un autre aller', { state: () => creerEtatGoogle(new Date()).etat.etat }],
    ['code absent', { code: null }],
    ['consentement refusé chez Google', { erreur: 'access_denied' }],
  ])('%s : refus avant tout échange, et proprement', async (_cas, params) => {
    const res = await appeler(params);
    expect(res.headers.get('location')).toContain(REFUS);
    // Aucun cookie du tout : ni session ouverte, ni effacement de l'aller.
    expect(res.headers.get('set-cookie') ?? '').not.toContain('wn_portail');
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();

    // Le code d'autorisation n'est PAS présenté à Google : un retour forgé ne
    // doit pas nous faire dépenser un code ni ouvrir un échange en notre nom.
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();

    // Et le refus est délibéré, pas un plantage rattrapé par le `catch`. Sans
    // cette ligne, retirer purement et simplement la vérification du `state`
    // laisserait la suite verte — le contrôle disparu, la route refusait
    // quand même, sur une exception. Constaté en falsifiant, le 2026-07-21.
    expect(logger.error).not.toHaveBeenCalled();
  });

  // Sinon n'importe quel site tiers effacerait l'aller d'une personne en cours
  // de connexion, en la faisant frapper cette route avec un `error`.
  it('un refus antérieur à la vérification du state laisse le cookie d’aller intact', async () => {
    const res = await appeler({ erreur: 'access_denied' });
    expect(res.headers.get('set-cookie') ?? '').not.toContain(COOKIE_ETAT);
  });

  it('adresse non vérifiée chez Google : refus', async () => {
    repondreGoogle(jetonIdentite({ email_verified: false }));
    const res = await appeler();
    expect(res.headers.get('location')).toContain(REFUS);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  // Un jeton émis pour le client praticien ne doit pas ouvrir un espace patient.
  it('jeton émis pour une autre application : refus', async () => {
    repondreGoogle(jetonIdentite({ aud: 'client-praticien' }));
    expect((await appeler()).headers.get('location')).toContain(REFUS);
  });

  it('échange de code refusé par Google : refus', async () => {
    repondreGoogle(null, false);
    expect((await appeler()).headers.get('location')).toContain(REFUS);
  });

  // Le cœur du non-oracle : trois situations distinctes, un seul écran.
  it('inconnue, inactif et révoqué atterrissent au même endroit', async () => {
    const destinations: string[] = [];

    prisma.patient.findUnique.mockResolvedValue(null);
    destinations.push((await appeler()).headers.get('location') ?? '');

    prisma.patient.findUnique.mockResolvedValue({ ...PATIENT, actif: false });
    destinations.push((await appeler()).headers.get('location') ?? '');

    prisma.patient.findUnique.mockResolvedValue({ ...PATIENT, accessTokenRevoked: true });
    destinations.push((await appeler()).headers.get('location') ?? '');

    prisma.patient.findUnique.mockResolvedValue(PATIENT);
    ensureActivePortalAccess.mockRejectedValue(new PortalAccessError('portal_revoked'));
    destinations.push((await appeler()).headers.get('location') ?? '');

    expect(new Set(destinations).size).toBe(1);
    expect(destinations[0]).toContain(REFUS);
  });

  it('aucun de ces refus n’ouvre de session', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    const cookies = (await appeler()).headers.get('set-cookie') ?? '';
    expect(cookies).not.toContain('wn_portail=');
  });

  it('même en panne, la destination ne varie pas', async () => {
    prisma.patient.findUnique.mockRejectedValue(new Error('base indisponible'));
    const res = await appeler();
    expect(res.headers.get('location')).toContain(REFUS);
    expect(logger.error).toHaveBeenCalled();
  });

  // `code` et `state` sont dans l'URL : sans route journalisée en dur, chaque
  // retour écrirait un secret d'authentification dans les logs.
  it('ni le code ni le state n’apparaissent dans ce qui est journalisé', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    await appeler({ code: 'code-tres-reconnaissable' });

    const journalise = JSON.stringify([...logger.security.mock.calls, ...logger.error.mock.calls]);
    expect(journalise).not.toContain('code-tres-reconnaissable');
    expect(journalise).not.toContain(etatCourant.etat.etat);
    expect(journalise).not.toContain(EMAIL);
    expect(journalise).toContain('/portail/google/retour');
  });
});

// Trace durable en base — le NO-GO d'activation levé (IDP2 LOT-03c-trace).
// Le lien magique écrit `consomme_le`/`rejeux_refuses` ; ce chemin n'écrivait
// rien. La revue adversariale du 2026-07-21 en a fait un bloquant.
describe('GET /portail/google/retour — la trace durable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    process.env.WN_GOOGLE_PATIENT_CLIENT_ID = CLIENT_ID;
    process.env.WN_GOOGLE_PATIENT_CLIENT_SECRET = 'secret-de-test-non-production';
    etatCourant = creerEtatGoogle(new Date());
    prisma.patient.findUnique.mockResolvedValue(PATIENT);
    prisma.portailConnexionGoogle.create.mockResolvedValue({ id: 'cx_1' });
    prisma.portailConnexionGoogle.deleteMany.mockResolvedValue({ count: 0 });
    ensureActivePortalAccess.mockResolvedValue({
      accessToken: 'TOK_PERMANENT',
      url: 'http://localhost:3000/portail/TOK_PERMANENT',
    });
    repondreGoogle(jetonIdentite());
  });

  const donnees = () => prisma.portailConnexionGoogle.create.mock.calls[0]?.[0]?.data;

  it('une connexion réussie écrit une ligne « consomme » nominative', async () => {
    await appeler();
    expect(prisma.portailConnexionGoogle.create).toHaveBeenCalledTimes(1);
    expect(donnees()).toEqual({ issue: 'consomme', motif: null, idPatient: PATIENT.idPatient });
  });

  it('un refus sur adresse inconnue trace, sans patient à nommer', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    await appeler();
    expect(donnees()).toEqual({ issue: 'refuse', motif: 'sans_espace_eligible', idPatient: null });
  });

  // Un dossier révoqué qu'on tente d'ouvrir par Google laisse une trace
  // nominative — côté serveur seulement. L'écran, lui, reste indifférencié.
  it('un refus sur dossier révoqué trace le patient, mais l’écran ne dit rien', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...PATIENT, accessTokenRevoked: true });
    const res = await appeler();
    expect(donnees()).toEqual({ issue: 'refuse', motif: 'sans_espace_eligible', idPatient: PATIENT.idPatient });
    expect(res.headers.get('location')).toContain(REFUS);
  });

  it('la trace ne jamais porter ni l’adresse ni le jeton', async () => {
    await appeler();
    const ecrit = JSON.stringify(prisma.portailConnexionGoogle.create.mock.calls);
    expect(ecrit).not.toContain(EMAIL);
    expect(ecrit).not.toContain(etatCourant.etat.etat);
    expect(ecrit).not.toContain(etatCourant.etat.nonce);
  });

  // La borne qui protège la table : un retour forgé, qui n'a pas franchi la
  // vérification du `state`, n'écrit rien. Sans elle, marteler la route
  // gonflerait la table sans fin.
  it.each([
    ['state forgé', { state: () => 'state-forge' }],
    ['cookie d’aller absent', { cookie: () => null }],
    ['code absent', { code: null }],
    ['consentement refusé', { erreur: 'access_denied' }],
  ])('un retour non authentifié (%s) n’écrit aucune trace', async (_cas, params) => {
    await appeler(params);
    expect(prisma.portailConnexionGoogle.create).not.toHaveBeenCalled();
  });

  // Fail-open : perdre la trace ne doit pas enfermer dehors le patient dont
  // l'accès vient d'être prouvé.
  it('un échec d’écriture de la trace n’empêche pas la session de s’ouvrir', async () => {
    prisma.portailConnexionGoogle.create.mockRejectedValue(new Error('base indisponible'));
    const res = await appeler();
    expect(res.headers.get('location')).toContain('/portail/TOK_PERMANENT');
    expect(res.headers.get('set-cookie')).toContain('wn_portail=');
    expect(logger.error).toHaveBeenCalled();
  });

  // La trace succès n'est écrite qu'une fois l'accès RÉELLEMENT accordé :
  // tracer « consomme » avant `ensureActivePortalAccess` mentirait sur un accès
  // qui pourrait encore échouer.
  it('la trace « consomme » suit l’octroi d’accès, jamais l’inverse', async () => {
    const ordre: string[] = [];
    ensureActivePortalAccess.mockImplementation(async () => {
      ordre.push('acces');
      return { accessToken: 'TOK_PERMANENT', url: 'http://localhost:3000/portail/TOK_PERMANENT' };
    });
    prisma.portailConnexionGoogle.create.mockImplementation(async () => {
      ordre.push('trace');
      return { id: 'cx_1' };
    });
    await appeler();
    expect(ordre).toEqual(['acces', 'trace']);
  });

  // Portail révoqué entre la résolution et l'octroi (`PortalAccessError`) : la
  // branche `catch` trace un refus nominatif, l'aller ayant été reconnu.
  it('un portail révoqué à l’octroi trace un refus, nominatif', async () => {
    ensureActivePortalAccess.mockRejectedValue(new PortalAccessError('portal_revoked'));
    const res = await appeler();
    expect(res.headers.get('location')).toContain(REFUS);
    expect(donnees()).toEqual({ issue: 'refuse', motif: 'acces_indisponible', idPatient: PATIENT.idPatient });
  });

  // Panne inattendue APRÈS la vérification du `state` : refus tracé.
  it('une panne après vérification du state trace un refus', async () => {
    ensureActivePortalAccess.mockRejectedValue(new Error('panne inattendue'));
    const res = await appeler();
    expect(res.headers.get('location')).toContain(REFUS);
    expect(donnees()).toEqual({ issue: 'refuse', motif: 'exception', idPatient: PATIENT.idPatient });
  });
});

// Purge de la trace — décision de rétention du 2026-07-22 (IDP2 LOT-03e).
// Pas de tâche planifiée dans ce dépôt : la purge se fait à chaque écriture,
// même patron que `portail_demande_tentatives` dans
// `POST /api/portail/lien/demande`.
describe('GET /portail/google/retour — purge des lignes hors rétention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    process.env.WN_GOOGLE_PATIENT_CLIENT_ID = CLIENT_ID;
    process.env.WN_GOOGLE_PATIENT_CLIENT_SECRET = 'secret-de-test-non-production';
    etatCourant = creerEtatGoogle(new Date());
    prisma.patient.findUnique.mockResolvedValue(PATIENT);
    prisma.portailConnexionGoogle.create.mockResolvedValue({ id: 'cx_1' });
    prisma.portailConnexionGoogle.deleteMany.mockResolvedValue({ count: 0 });
    ensureActivePortalAccess.mockResolvedValue({
      accessToken: 'TOK_PERMANENT',
      url: 'http://localhost:3000/portail/TOK_PERMANENT',
    });
    repondreGoogle(jetonIdentite());
  });

  it('purge les lignes antérieures au seuil de 12 mois à chaque écriture', async () => {
    await appeler();
    expect(prisma.portailConnexionGoogle.deleteMany).toHaveBeenCalledTimes(1);
    const seuil = prisma.portailConnexionGoogle.deleteMany.mock.calls[0][0].where.creeLe.lt as Date;
    const ecart = Date.now() - seuil.getTime();
    // 365 jours, à la seconde de calcul près (pas de secret temporel exact ici,
    // juste la fenêtre annoncée par ACTIVATION_RUNBOOK_G5.md).
    expect(Math.abs(ecart - 365 * 24 * 60 * 60 * 1000)).toBeLessThan(5000);
  });

  it('la purge tourne aussi sur un refus tracé, pas seulement sur un succès', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    await appeler();
    expect(prisma.portailConnexionGoogle.deleteMany).toHaveBeenCalledTimes(1);
  });

  // Fail-open, comme l'écriture elle-même : une purge en échec ne doit ni
  // retarder ni empêcher la session de s'ouvrir. Mais — et c'est le point que
  // la falsification a trouvé — elle ne doit pas non plus disparaître sans
  // laisser de trace : un `.catch(() => undefined)` local aurait avalé
  // l'échec en silence, rendant `PORTAIL_GOOGLE_TRACE_ECHEC` inutile pour ce
  // cas précis. Sans cette assertion, retirer le `try/catch` englobant au
  // profit d'un `.catch()` muet local laissait la suite verte.
  it('un échec de purge n’empêche pas la session de s’ouvrir, et reste journalisé', async () => {
    prisma.portailConnexionGoogle.deleteMany.mockRejectedValue(new Error('base indisponible'));
    const res = await appeler();
    expect(res.headers.get('location')).toContain('/portail/TOK_PERMANENT');
    expect(res.headers.get('set-cookie')).toContain('wn_portail=');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'PORTAIL_PATIENT.GOOGLE.TRACE_ECHEC' }),
    );
    // L'intégrité d'audit du lot précédent tient à cet ordre : la trace du
    // jour est écrite AVANT la tentative de purge. Sans cette assertion,
    // inverser l'ordre laisserait la suite verte — même message, même
    // fail-open — alors que la trace du jour aurait sauté. Relevé en revue
    // adversariale le 2026-07-22.
    expect(prisma.portailConnexionGoogle.create).toHaveBeenCalledTimes(1);
  });

  // Même borne que l'écriture : un retour non authentifié ne doit ni écrire
  // ni purger — sinon marteler la route userait quand même la base.
  it('un retour non authentifié ne déclenche aucune purge', async () => {
    await appeler({ state: () => 'state-forge' });
    expect(prisma.portailConnexionGoogle.deleteMany).not.toHaveBeenCalled();
  });
});
