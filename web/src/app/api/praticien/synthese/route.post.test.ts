import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readEventStream, type SseEvent } from '@/lib/sse/readEventStream';

// Génération de synthèse (POST) — les DEUX transports. Le flag WN_SYNTHESE_STREAM
// (défaut off) sélectionne JSON (historique, Vercel) ou SSE (Scalingo).
const { getServerSession, prisma, anthropicCreate, validateSyntheseSchema } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
    syntheseIA: { create: vi.fn() },
    auditSynthese: { create: vi.fn() },
  },
  anthropicCreate: vi.fn(),
  validateSyntheseSchema: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/generated/prisma', () => ({ Prisma: { DbNull: Symbol('DbNull') } }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: (s: { user?: { email?: string } } | null) => s?.user?.email?.toLowerCase() ?? null,
  filtrePatientsDuPraticien: (email: string) => ({ praticienEmail: { equals: email, mode: 'insensitive' } }),
}));
vi.mock('@/lib/praticien/journalAcces', () => ({ journaliserAccesDossier: vi.fn() }));
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: anthropicCreate } },
  CLAUDE_MODEL: 'claude-test',
  SYSTEM_PROMPT_SYNTHESE: '',
  VERSION_CORPUS_SYNTHESE: 'v',
  VERSION_PROMPT_SYNTHESE: 'v',
  VERSION_SCHEMA_SYNTHESE: 'v',
  validateSyntheseSchema,
  // La route lit désormais la sortie du modèle par `analyserSortieSynthese`
  // (LOT-01 étape 4). Ce mock DÉLÈGUE au mock historique : chaque test garde
  // son `validateSyntheseSchema.mockReturnValue(...)` et son intention, sans
  // qu'aucun n'ait à connaître la nouvelle enveloppe.
  analyserSortieSynthese: (o: unknown) => ({ ok: true, synthese: validateSyntheseSchema(o) }),
  sanitizeAuditError: (m: string) => m,
  CORPUS_CLINIQUE_ACTIF: '',
}));
// `sha256` : depuis le LOT-06 la route atteint `orientationRulesV1`, qui signe
// sa table avec cette fonction. Un mock qui ne l'expose pas casse l'import.
vi.mock('@/lib/clinical/corpusSyntheseV1', () => ({
  CORPUS_CLINIQUE_METADATA: {},
  CORPUS_CLINIQUE_SHA256: 'sha',
  sha256: (texte: string) => `sha256(${texte.length})`,
}));
vi.mock('@/lib/scoring/miniSynthese', () => ({ buildMiniSynthese: () => ({}) }));
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), security: vi.fn() } }));
vi.mock('@/lib/observability/eventCodes', () => ({ EVENT_CODES: {} }));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { POST } from './route';

function req(body: unknown): Request {
  return new Request('http://x/api/praticien/synthese', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const CORPS = { idPatient: 'PAT_SEED_01' };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com' });
  prisma.questionnaireReponse.findMany.mockResolvedValue([
    // `idQuestionnaire` fait partie de la charge utile depuis le 2026-07-27 :
    // la consigne système désigne les questionnaires alimentaires par leur
    // identifiant. La fixture doit le porter, sinon `JSON.stringify` élide la
    // clé et aucun test n'observe jamais l'identifiant réellement transmis.
    //
    // L'identifiant porté ici est `Q_ALI_02`. Il portait `Q_ALI_03` jusqu'au
    // 2026-07-31 : cet instrument est depuis inscrit au registre des passations
    // non interprétables pour ses passations ANTÉRIEURES à sa reconstruction, et
    // la fixture est datée du 2026-07-10 — le contrôle négatif d'en bas
    // (« un questionnaire courant garde ses chiffres ») se serait donc mis à
    // observer une mesure retirée, c'est-à-dire l'inverse de ce qu'il garde.
    { idQuestionnaire: 'Q_ALI_02', titre: 'Diète méditerranéenne', dateReponse: new Date('2026-07-10'), scoresJson: {}, scorePrincipal: 12, interpretation: null },
  ]);
  prisma.consultation.findFirst.mockResolvedValue(null);
  validateSyntheseSchema.mockReturnValue({ points_de_vigilance: [] });
  anthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: '{"resume_praticien":"ok"}' }],
    stop_reason: 'end_turn',
    usage: {},
  });
  prisma.syntheseIA.create.mockResolvedValue({ idSynthese: 'SYN_1', dateGeneration: new Date('2026-07-20T00:00:00Z') });
  prisma.auditSynthese.create.mockResolvedValue({});
});

afterEach(() => {
  delete process.env.WN_SYNTHESE_STREAM;
});

describe('POST /api/praticien/synthese — gardes (indépendantes du transport)', () => {
  it('sans session : 401 JSON', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(req(CORPS));
    expect(res.status).toBe(401);
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('patient d’un autre praticien : 404 JSON, aucun appel modèle', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    const res = await POST(req(CORPS));
    expect(res.status).toBe(404);
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('aucun questionnaire : 422', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    const res = await POST(req(CORPS));
    expect(res.status).toBe(422);
  });
});

describe('POST /api/praticien/synthese — transport JSON (défaut, Vercel)', () => {
  it('cas nominal : 200 JSON avec la synthèse persistée', async () => {
    const res = await POST(req(CORPS));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const d = await res.json();
    expect(d.success).toBe(true);
    expect(d.idSynthese).toBe('SYN_1');
    expect(prisma.syntheseIA.create).toHaveBeenCalledOnce();
  });

  it('laisse assez de sortie pour consolider un dossier riche sans troncature', async () => {
    await POST(req(CORPS));
    expect(anthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 16384 }),
      undefined,
    );
  });

  it('transmet l’identifiant du questionnaire dans le message envoyé au modèle', async () => {
    // La consigne système interdit de conclure à une carence « pour les
    // identifiants commençant par Q_ALI ». Le critère de déclenchement doit
    // donc atteindre le modèle : c'est le seul test qui l'observe **après**
    // `JSON.stringify`, là où une clé absente du type disparaît sans bruit.
    await POST(req(CORPS));
    const message = anthropicCreate.mock.calls[0][0].messages[0].content;
    expect(message).toContain(`"idQuestionnaire": "Q_ALI_02"`);
  });

  it('ne passe AUCUNE option Anthropic (défauts SDK inchangés, Vercel intact)', async () => {
    await POST(req(CORPS));
    expect(anthropicCreate).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('une passation non interprétable part sans le moindre chiffre', async () => {
    // Réservoir `Q_SOM_07` : 4 passations en production, toutes porteuses d'un
    // score et d'une bande que le lot #406 a déclarés invalides. Ce test
    // observe la charge utile APRÈS `JSON.stringify` — le seul endroit où l'on
    // voit ce que le modèle reçoit vraiment.
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      {
        idQuestionnaire: 'Q_SOM_07',
        titre: 'MFI-20 — Échelle multidimensionnelle de fatigue',
        dateReponse: new Date('2026-07-22'),
        scoresJson: {
          type: 'sum',
          total: 33,
          maxTotal: 80,
          interpretation: { label: 'Fatigue dans les limites normales' },
          rawAnswers: { M1: 2 },
        },
        scorePrincipal: 33,
        interpretation: 'Fatigue dans les limites normales',
      },
    ]);
    await POST(req(CORPS));
    const message: string = anthropicCreate.mock.calls[0][0].messages[0].content;
    // La passation reste NOMMÉE — la faire disparaître laisserait croire
    // qu'elle n'a pas été remplie.
    expect(message).toContain('"idQuestionnaire": "Q_SOM_07"');
    expect(message).toContain('"mesureNonInterpretable"');
    // …mais vidée de toute mesure.
    expect(message).toContain('"scorePrincipal": null');
    expect(message).toContain('"scores": null');
    expect(message).not.toContain('Fatigue dans les limites normales');
    expect(message).not.toContain('"total"');
    expect(message).not.toContain('33');
    // La mini-synthèse est le second canal par lequel l'orientation atteint le
    // modèle (lot #389). Elle doit être muette ici, sinon le retrait des
    // scores ne protège de rien. Le mock la rend truthy (`{}`) : ce test
    // échouerait si la route la portait quand même.
    expect(message).toContain('"miniSynthese": ""');
  });

  it('une réponse alimentaire part en TRANCHE COCHÉE, jamais en code de barème', async () => {
    // Le code enregistré n'est pas la quantité : `MO1: 2` vaut « 3-4 » portions
    // de viande par semaine. Livré nu sous une consigne autorisant la
    // restitution « dans l'unité de la question », il faisait écrire au modèle
    // « 2 portions » — une déclaration que le patient n'a jamais faite.
    //
    // Fixture sur `Q_ALI_02`, indépendante de `WN_ALI_01_SIIN57` : ce test
    // observe le BRANCHEMENT de la route, qui ne doit dépendre d'aucun drapeau.
    // Elle portait sur `Q_ALI_03` jusqu'au 2026-07-31 ; reconstruit depuis sa
    // feuille de calcul source, cet instrument ne pose plus de tranches mais des
    // nombres de portions, et ne peut donc plus témoigner d'une tranche cochée.
    // La charge produite pour `Q_ALI_03` — quantité déclarée, unité, libellé
    // qui nomme encore l'aliment — est éprouvée par
    // `apportsPonderesReconstruit.guard.test.ts`, et non « juste en dessous » :
    // le test qui suit ici est le contrôle négatif sur `Q_ALI_02`.
    // Les libellés des deux formes de `Q_ALI_01` sont gardés séparément, dans
    // les deux positions, par `promptAlimentaire.guard.test.ts`.
    //
    // Ce test observe la charge APRÈS `JSON.stringify` : c'est le seul endroit
    // où l'on voit ce que le modèle reçoit vraiment. Un module de traduction
    // parfait que la route n'appellerait pas passerait tous les autres tests —
    // c'est exactement « l'interdiction dont le critère n'arrive jamais » (#408).
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      {
        idQuestionnaire: 'Q_ALI_02',
        titre: 'Diète méditerranéenne',
        dateReponse: new Date('2026-07-22'),
        scoresJson: { type: 'sum', total: 7, maxTotal: 14, rawAnswers: { MD1: 1 } },
        scorePrincipal: 7,
        interpretation: null,
      },
    ]);
    await POST(req(CORPS));
    const message: string = anthropicCreate.mock.calls[0][0].messages[0].content;
    expect(message).toContain('"question"');
    // Et le code nu ne doit plus être ce que porte la réponse.
    expect(message).not.toMatch(/"MD1":\s*1/);
  });

  it('un questionnaire courant garde ses chiffres (contrôle négatif)', async () => {
    // Sans lui, vider inconditionnellement scores et interprétation ferait
    // passer le test ci-dessus au vert.
    await POST(req(CORPS));
    const message: string = anthropicCreate.mock.calls[0][0].messages[0].content;
    expect(message).toContain('"scorePrincipal": 12');
    expect(message).not.toContain('mesureNonInterpretable');
  });

  it('n’envoie pas un questionnaire suspendu au modèle quand une mesure administrable existe', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      {
        idQuestionnaire: 'Q_PED_03',
        titre: 'Conners Parent',
        dateReponse: new Date('2026-07-20'),
        scoresJson: { total: 108 },
        scorePrincipal: 108,
        interpretation: null,
      },
      {
        idQuestionnaire: 'Q_ALI_02',
        titre: 'Diète méditerranéenne',
        dateReponse: new Date('2026-07-22'),
        scoresJson: { total: 7 },
        scorePrincipal: 7,
        interpretation: null,
      },
    ]);

    await POST(req(CORPS));
    const message: string = anthropicCreate.mock.calls[0][0].messages[0].content;
    expect(message).toContain('"idQuestionnaire": "Q_ALI_02"');
    expect(message).not.toContain('"idQuestionnaire": "Q_PED_03"');
  });

  it('retourne 422 si toutes les réponses du dossier sont non administrables', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      {
        idQuestionnaire: 'Q_PED_03',
        titre: 'Conners Parent',
        dateReponse: new Date('2026-07-20'),
        scoresJson: { total: 108 },
        scorePrincipal: 108,
        interpretation: null,
      },
    ]);

    const res = await POST(req(CORPS));
    expect(res.status).toBe(422);
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('échec du modèle : 500, aucune synthèse persistée', async () => {
    anthropicCreate.mockRejectedValue(new Error('API indisponible'));
    const res = await POST(req(CORPS));
    expect(res.status).toBe(500);
    expect(prisma.syntheseIA.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/praticien/synthese — transport SSE (Scalingo, flag ON)', () => {
  beforeEach(() => {
    process.env.WN_SYNTHESE_STREAM = 'true';
  });

  it('répond en text/event-stream et émet un event: done avec la synthèse', async () => {
    const res = await POST(req(CORPS));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const events: SseEvent[] = [];
    await readEventStream(res, e => events.push(e));
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('done');
    const payload = JSON.parse(events[0].data);
    expect(payload.success).toBe(true);
    expect(payload.idSynthese).toBe('SYN_1');
    expect(prisma.syntheseIA.create).toHaveBeenCalledOnce();
  });

  it('borne l’appel Anthropic (timeout 4 min, 1 reprise) — SSE seulement', async () => {
    await POST(req(CORPS));
    expect(anthropicCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ timeout: 240_000, maxRetries: 1 }),
    );
  });

  it('échec du modèle : event: error, aucune synthèse persistée', async () => {
    anthropicCreate.mockRejectedValue(new Error('API indisponible'));
    const res = await POST(req(CORPS));
    expect(res.status).toBe(200);
    const events: SseEvent[] = [];
    await readEventStream(res, e => events.push(e));
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('error');
    expect(prisma.syntheseIA.create).not.toHaveBeenCalled();
  });
});
