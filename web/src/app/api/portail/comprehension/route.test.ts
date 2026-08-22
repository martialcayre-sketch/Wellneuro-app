import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bancs en style « SIGNATURE RÉELLE » : on ne mocke QUE Prisma, et on forge un
// vrai cookie avec `signPatientSession` (patron `ce-qui-compte/route.test.ts`).
// Mocker `@/lib/patient-session` neutraliserait l'authentification, or c'est
// justement l'authentification que cette surface doit prouver.

const { prisma, logger } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    syntheseComprehension: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    desaccordComprehension: {
      findMany: vi.fn(),
      create: vi.fn(),
      // Moqués EXPRÈS bien que jamais appelés : sans eux, l'assertion
      // « append-only » lèverait au lieu de compter zéro.
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({ logger }));

import { signPatientSession } from '@/lib/patient-session';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { LONGUEUR_MAX_DESACCORD } from '@/lib/praticien/syntheseComprehension';
import { GET, POST } from './route';

const PATIENT = { idPatient: 'PAT_TEST', email: 'sophie.nicola@example.test' };
const URL_BASE = 'http://localhost/api/portail/comprehension';

function cookieProprio(): string {
  return signPatientSession({ idPatient: PATIENT.idPatient, email: PATIENT.email });
}

function mockCompteActif(surcharges: Record<string, unknown> = {}): void {
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: PATIENT.idPatient,
    actif: true,
    accessTokenRevoked: false,
    email: PATIENT.email,
    sessionsInvalidesAvant: null,
    ...surcharges,
  });
}

function getRequest(cookie?: string, query = ''): Request {
  return new Request(`${URL_BASE}${query}`, {
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

function postRequest(
  cookie: string | undefined,
  corps: unknown,
  brut?: string,
  entetes: Record<string, string> = {},
): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
      ...entetes,
    },
    body: brut ?? JSON.stringify(corps),
  });
}

const publiee = (partiel: Record<string, unknown> = {}) => ({
  id: 'SYN_1',
  texte: 'Vous venez pour un sommeil qui se casse au milieu de la nuit.',
  redigeeLe: null,
  publieeLe: new Date('2026-08-20T09:00:00.000Z'),
  creeLe: new Date('2026-08-20T09:00:00.000Z'),
  supersedesSyntheseId: null,
  ...partiel,
});

describe('/api/portail/comprehension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.WN_COMPREHENSION = 'true';
    mockCompteActif();
    prisma.syntheseComprehension.findMany.mockResolvedValue([]);
    prisma.syntheseComprehension.findFirst.mockResolvedValue(null);
    prisma.desaccordComprehension.findMany.mockResolvedValue([]);
    prisma.desaccordComprehension.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'DES_NEUF',
        idSynthese: data.idSynthese,
        texte: data.texte ?? null,
        exprimeLe: data.exprimeLe ?? null,
        creeLe: new Date('2026-08-22T10:00:00.000Z'),
      }),
    );
  });

  // ── Drapeau ───────────────────────────────────────────────────────────────

  it('rend 503 sur les DEUX verbes quand la surface est fermée, sans toucher la base', async () => {
    process.env.WN_COMPREHENSION = '';
    expect((await GET(getRequest(cookieProprio()))).status).toBe(503);
    expect((await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1' }))).status).toBe(503);
    // Fail-closed : ni session vérifiée, ni base sollicitée.
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.desaccordComprehension.create).not.toHaveBeenCalled();
  });

  it('fail-closed : seule la chaîne exacte « true » ouvre', async () => {
    for (const valeur of ['1', 'TRUE', 'oui', ' true']) {
      process.env.WN_COMPREHENSION = valeur;
      expect((await GET(getRequest(cookieProprio()))).status).toBe(503);
    }
  });

  // ── Session ───────────────────────────────────────────────────────────────

  it('exige une session patient sur les deux verbes', async () => {
    expect((await GET(getRequest())).status).toBe(401);
    expect((await POST(postRequest(undefined, { idSynthese: 'SYN_1' }))).status).toBe(401);
    expect(prisma.desaccordComprehension.create).not.toHaveBeenCalled();
  });

  it('refuse un compte révoqué', async () => {
    mockCompteActif({ accessTokenRevoked: true });
    expect((await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1' }))).status).toBe(403);
    expect(prisma.desaccordComprehension.create).not.toHaveBeenCalled();
  });

  // ── Lecture ───────────────────────────────────────────────────────────────

  it('ne sert AUCUN brouillon', async () => {
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      publiee({ id: 'SYN_BROUILLON', publieeLe: null }),
    ]);
    const corps = await (await GET(getRequest(cookieProprio()))).json();
    expect(corps.synthese).toBeNull();
  });

  it('CONTINUE de servir la publiée quand un brouillon la supplante', async () => {
    // Enregistrer un brouillon de révision ne retire RIEN au patient : sinon
    // l'écran lui dirait « rien n'a jamais été publié » sur un texte qu'il a pu
    // lire et parfois contester (revue LOT-04, B1).
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      publiee({
        id: 'SYN_2',
        publieeLe: null,
        supersedesSyntheseId: 'SYN_1',
        creeLe: new Date('2026-08-21T09:00:00.000Z'),
      }),
      publiee({ id: 'SYN_1' }),
    ]);
    const corps = await (await GET(getRequest(cookieProprio()))).json();
    expect(corps.synthese.id).toBe('SYN_1');
  });

  it('sert la tête publiée, sans jamais combler la date déclarée', async () => {
    prisma.syntheseComprehension.findMany.mockResolvedValue([publiee()]);
    const corps = await (await GET(getRequest(cookieProprio()))).json();
    expect(corps.synthese.id).toBe('SYN_1');
    // `redigeeLe` absente reste `null` — jamais comblée par `creeLe` (`DC-24`).
    expect(corps.synthese.redigeeLe).toBeNull();
  });

  it('absence de synthèse = `null`, un SILENCE et non une réponse', async () => {
    const corps = await (await GET(getRequest(cookieProprio()))).json();
    expect(corps.synthese).toBeNull();
    expect(corps.desaccords).toEqual([]);
  });

  it('ne rend AUCUN agrégat, aucun décompte, aucune note', async () => {
    prisma.syntheseComprehension.findMany.mockResolvedValue([publiee()]);
    const corps = await (await GET(getRequest(cookieProprio()))).json();
    expect(Object.keys(corps).sort()).toEqual(['desaccords', 'ok', 'synthese']);
  });

  // ── Garde de vocabulaire — BANC DE DÉBRANCHEMENT ──────────────────────────
  //
  // Régime JOURNALISANT : la re-vérification au service consigne et ne bloque
  // pas. Retirer le bloc de la route fait ROUGIR le premier cas.

  it('DÉBRANCHEMENT — journalise un registre anxiogène servi, SANS bloquer', async () => {
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      publiee({ texte: 'Votre situation est grave.' }),
    ]);
    const reponse = await GET(getRequest(cookieProprio()));

    expect(reponse.status).toBe(200);
    expect((await reponse.json()).synthese.texte).toContain('grave');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: EVENT_CODES.PORTAIL_COMPREHENSION_REGISTRE_ANXIOGENE }),
    );
    // Ni le terme, ni le texte, ni l'identifiant du patient dans le log.
    const { message } = logger.warn.mock.calls[0][0];
    expect(message).not.toContain('grave');
    expect(message).not.toContain(PATIENT.idPatient);
  });

  it('ne journalise rien sur un texte au registre neutre', async () => {
    prisma.syntheseComprehension.findMany.mockResolvedValue([publiee()]);
    await GET(getRequest(cookieProprio()));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  // ── Interrupteur ──────────────────────────────────────────────────────────

  it('en mode interrupteur : ne lit RIEN et ne journalise RIEN', async () => {
    // La sonde de l'accueil ne doit ni servir la synthèse, ni émettre
    // « registre anxiogène servi » pour une page jamais ouverte (revue M3).
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      publiee({ texte: 'Votre situation est grave.' }),
    ]);
    const reponse = await GET(getRequest(cookieProprio(), '?interrupteur=1'));

    expect(reponse.status).toBe(200);
    await expect(reponse.json()).resolves.toEqual({ ok: true, ouvert: true });
    expect(prisma.syntheseComprehension.findMany).not.toHaveBeenCalled();
    expect(prisma.desaccordComprehension.findMany).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('l’interrupteur exige la session et le drapeau comme le service', async () => {
    expect((await GET(getRequest(undefined, '?interrupteur=1'))).status).toBe(401);
    process.env.WN_COMPREHENSION = '';
    expect((await GET(getRequest(cookieProprio(), '?interrupteur=1'))).status).toBe(503);
  });

  // ── Chemin d’exception ────────────────────────────────────────────────────

  it('ne journalise NI le texte NI l’e-mail quand Prisma lève', async () => {
    const erreur = new Error(
      'Invalid `prisma.desaccordComprehension.create()` invocation: data: { texte: "Ce que je voulais dire est autre.", idPatient: "PAT_TEST" }',
    );
    erreur.name = 'PrismaClientKnownRequestError';
    (erreur as unknown as { code: string }).code = 'P2003';
    prisma.syntheseComprehension.findFirst.mockResolvedValue({ id: 'SYN_1' });
    prisma.desaccordComprehension.create.mockRejectedValue(erreur);
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});

    const reponse = await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1' }));
    expect(reponse.status).toBe(500);

    const journalise = espion.mock.calls.flat().join(' ');
    expect(journalise).not.toContain('Ce que je voulais dire');
    expect(journalise).not.toContain('PAT_TEST');
    expect(journalise).toContain('P2003');
    espion.mockRestore();
  });

  // ── Dépôt d’un désaccord ──────────────────────────────────────────────────

  it('accepte un désaccord SANS texte — « ce n’est pas exactement ça » suffit', async () => {
    prisma.syntheseComprehension.findFirst.mockResolvedValue({ id: 'SYN_1' });
    const reponse = await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1' }));
    expect(reponse.status).toBe(201);
    const { data } = prisma.desaccordComprehension.create.mock.calls[0][0];
    expect(data.texte).toBeNull();
    expect(data.idPatient).toBe(PATIENT.idPatient);
  });

  it('prend `idPatient` de la SESSION, jamais du corps', async () => {
    prisma.syntheseComprehension.findFirst.mockResolvedValue({ id: 'SYN_1' });
    await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1', idPatient: 'PAT_AUTRE' }));
    const { data } = prisma.desaccordComprehension.create.mock.calls[0][0];
    expect(data.idPatient).toBe(PATIENT.idPatient);
  });

  it('n’exige que la version visée — un désaccord orphelin est refusé', async () => {
    expect((await POST(postRequest(cookieProprio(), {}))).status).toBe(400);
    expect(prisma.desaccordComprehension.create).not.toHaveBeenCalled();
  });

  it('rend le MÊME refus pour une version inexistante, d’un autre dossier, ou NON PUBLIÉE', async () => {
    // Les trois cas retombent sur le même `findFirst` vide : la route ne peut
    // pas les distinguer, donc elle ne les distingue pas.
    prisma.syntheseComprehension.findFirst.mockResolvedValue(null);
    const reponse = await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_X' }));
    expect(reponse.status).toBe(404);
    await expect(reponse.json()).resolves.toMatchObject({ reason: 'synthese_introuvable' });
    expect(prisma.desaccordComprehension.create).not.toHaveBeenCalled();
  });

  it('exige une version PUBLIÉE et du bon dossier dans le prédicat', async () => {
    prisma.syntheseComprehension.findFirst.mockResolvedValue({ id: 'SYN_1' });
    await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1' }));
    expect(prisma.syntheseComprehension.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'SYN_1',
          idPatient: PATIENT.idPatient,
          publieeLe: { not: null },
        },
      }),
    );
  });

  it('refuse un texte trop long sans tronquer', async () => {
    prisma.syntheseComprehension.findFirst.mockResolvedValue({ id: 'SYN_1' });
    const reponse = await POST(
      postRequest(cookieProprio(), {
        idSynthese: 'SYN_1',
        texte: 'a'.repeat(LONGUEUR_MAX_DESACCORD + 1),
      }),
    );
    expect(reponse.status).toBe(400);
    expect(prisma.desaccordComprehension.create).not.toHaveBeenCalled();
  });

  it('refuse un corps trop volumineux, annoncé ou non', async () => {
    const gros = 'a'.repeat(70 * 1024);
    // a) `content-length` annoncé : refus sec.
    expect(
      (
        await POST(
          postRequest(cookieProprio(), null, JSON.stringify({ texte: 'x' }), {
            'content-length': String(70 * 1024),
          }),
        )
      ).status,
    ).toBe(400);
    // b) annonce absente ou mensongère : la même borne s'applique au texte lu.
    expect(
      (await POST(postRequest(cookieProprio(), null, JSON.stringify({ texte: gros })))).status,
    ).toBe(400);
  });

  it('rend 400 — jamais 500 — sur un corps illisible ou non-objet', async () => {
    expect((await POST(postRequest(cookieProprio(), null, 'pas du json'))).status).toBe(400);
    expect((await POST(postRequest(cookieProprio(), null, 'null'))).status).toBe(400);
    expect((await POST(postRequest(cookieProprio(), null, '[]'))).status).toBe(400);
  });

  // ── Append-only ───────────────────────────────────────────────────────────

  it('n’expose AUCUN verbe de retrait et n’écrit jamais par update ou delete', async () => {
    prisma.syntheseComprehension.findFirst.mockResolvedValue({ id: 'SYN_1' });
    await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1' }));
    await GET(getRequest(cookieProprio()));

    expect(prisma.desaccordComprehension.create).toHaveBeenCalledTimes(1);
    expect(prisma.desaccordComprehension.update).not.toHaveBeenCalled();
    expect(prisma.desaccordComprehension.upsert).not.toHaveBeenCalled();
    expect(prisma.desaccordComprehension.delete).not.toHaveBeenCalled();
    expect(prisma.desaccordComprehension.deleteMany).not.toHaveBeenCalled();
    // La route du patient n'écrit AUCUNE synthèse : ce n'est pas son objet.
    expect(prisma.syntheseComprehension.create).not.toHaveBeenCalled();
    expect(prisma.syntheseComprehension.update).not.toHaveBeenCalled();
  });

  it('contester deux fois fait DEUX lignes — rien ne s’écrase', async () => {
    prisma.syntheseComprehension.findFirst.mockResolvedValue({ id: 'SYN_1' });
    await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1' }));
    await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1', texte: 'Et surtout ceci.' }));
    expect(prisma.desaccordComprehension.create).toHaveBeenCalledTimes(2);
  });

  it('ne transmet jamais `creeLe` : la base pose le présent', async () => {
    prisma.syntheseComprehension.findFirst.mockResolvedValue({ id: 'SYN_1' });
    await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1' }));
    const { data } = prisma.desaccordComprehension.create.mock.calls[0][0];
    expect(data).not.toHaveProperty('creeLe');
  });

  it('laisse contester même après clôture du suivi', async () => {
    // Clore un dossier ne doit pas rendre sa synthèse incontestable.
    mockCompteActif({ suiviClotureLe: new Date('2026-08-01T00:00:00.000Z') });
    prisma.syntheseComprehension.findFirst.mockResolvedValue({ id: 'SYN_1' });
    expect((await POST(postRequest(cookieProprio(), { idSynthese: 'SYN_1' }))).status).toBe(201);
  });
});
