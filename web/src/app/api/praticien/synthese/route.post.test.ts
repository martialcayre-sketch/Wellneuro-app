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
  sanitizeAuditError: (m: string) => m,
  CORPUS_CLINIQUE_ACTIF: '',
}));
vi.mock('@/lib/clinical/corpusSyntheseV1', () => ({ CORPUS_CLINIQUE_METADATA: {}, CORPUS_CLINIQUE_SHA256: 'sha' }));
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
    { idQuestionnaire: 'Q_ALI_03', titre: 'BDI', dateReponse: new Date('2026-07-10'), scoresJson: {}, scorePrincipal: 12, interpretation: null },
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
      expect.objectContaining({ max_tokens: 8192 }),
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
    expect(message).toContain('"idQuestionnaire": "Q_ALI_03"');
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

  it('un questionnaire courant garde ses chiffres (contrôle négatif)', async () => {
    // Sans lui, vider inconditionnellement scores et interprétation ferait
    // passer le test ci-dessus au vert.
    await POST(req(CORPS));
    const message: string = anthropicCreate.mock.calls[0][0].messages[0].content;
    expect(message).toContain('"scorePrincipal": 12');
    expect(message).not.toContain('mesureNonInterpretable');
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

  it('borne l’appel Anthropic (timeout 2 min, 1 reprise) — SSE seulement', async () => {
    await POST(req(CORPS));
    expect(anthropicCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ timeout: 120_000, maxRetries: 1 }),
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
