import { beforeEach, describe, expect, it, vi } from 'vitest';

// Ligne t61, [[D-471]] — ce que la génération fait des règles d'orientation non
// évaluées. Le patron est celui de `besoins.generation.test.ts` : le message
// réellement envoyé au modèle, et la trace réellement persistée.

const { getServerSession, prisma, anthropicCreate, validateSyntheseSchema, evaluerOrientationPourPatient } =
  vi.hoisted(() => ({
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
    evaluerOrientationPourPatient: vi.fn(),
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
  SYSTEM_PROMPT_SYNTHESE: 'Consigne de test.',
  VERSION_CORPUS_SYNTHESE: 'v',
  VERSION_PROMPT_SYNTHESE: 'v',
  VERSION_SCHEMA_SYNTHESE: 'v',
  validateSyntheseSchema,
  analyserSortieSynthese: (o: unknown) => ({ ok: true, synthese: validateSyntheseSchema(o) }),
  sanitizeAuditError: (m: string) => m,
  CORPUS_CLINIQUE_ACTIF: '',
}));
vi.mock('@/lib/clinical/corpusSyntheseV1', () => ({
  CORPUS_CLINIQUE_METADATA: {},
  CORPUS_CLINIQUE_SHA256: 'sha',
  sha256: (texte: string) => `sha256(${texte.length})`,
}));
// `orientationActive` explicite ([[D-511]] §6.2) : absent du mock, son appel
// levait et la levée passait pour un corpus illisible. Éteint : la lecture
// partagée n'a pas lieu, et ce banc ne porte que sur `reglesNonEvaluees`.
vi.mock('@/lib/clinical/orientationService', () => ({ evaluerOrientationPourPatient, orientationActive: () => false }));
vi.mock('@/lib/scoring/miniSynthese', () => ({ buildMiniSynthese: () => ({}) }));
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), security: vi.fn() },
}));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { POST } from './route';

const TITRE = "## Règles d'orientation non évaluées";

function req(): Request {
  return new Request('http://x/api/praticien/synthese', {
    method: 'POST',
    body: JSON.stringify({ idPatient: 'PAT_SEED_01' }),
  });
}

function messageEnvoye(): string {
  return anthropicCreate.mock.calls[0][0].messages[0].content as string;
}

function donneesEntree(): { blocReglesNonEvaluees: string; reglesNonEvaluees: string[] } {
  return prisma.syntheseIA.create.mock.calls[0][0].data.donneesEntree;
}

const NON_EVALUEES = [
  {
    regleId: 'R2-STR-01',
    passations: [{ idQuestionnaire: 'Q_STR_02', dateReponse: '2026-03-12T09:30:00.000Z', fenetreJours: 30 }],
  },
  {
    regleId: 'R2-STR-02',
    passations: [{ idQuestionnaire: 'Q_STR_02', dateReponse: '2026-03-12T09:30:00.000Z', fenetreJours: 30 }],
  },
];

const RECOMMANDATION = {
  cible: { type: 'questionnaire' as const, questionnaireId: 'Q_SOM_02' },
  priorite: 1,
  niveau: 'approfondissement' as const,
  objectifs: [],
  needIds: [5],
  dejaAssigne: false,
  dejaRepondu: false,
  motifs: [{ regleId: 'R-SOM-01', conditions: ['condition'], claims: [] }],
};

function orientation(recommandations: unknown[], reglesNonEvaluees: unknown[]) {
  return {
    actif: true as const,
    version: 'orientation-nnpp2-v1',
    sha256: 'abc',
    recommandations,
    ecartees: [],
    reglesNonEvaluees,
    arret: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com', actif: true, suiviClotureLe: null });
  prisma.questionnaireReponse.findMany.mockResolvedValue([
    {
      idQuestionnaire: 'Q_STR_02',
      titre: 'Échelle de stress perçu (PSS-10)',
      dateReponse: new Date('2026-03-12T09:30:00.000Z'),
      scoresJson: {},
      scorePrincipal: 30,
      interpretation: null,
      statutValidite: null,
    },
  ]);
  prisma.consultation.findFirst.mockResolvedValue(null);
  validateSyntheseSchema.mockReturnValue({ points_de_vigilance: [], narratif_patient: 'Texte.' });
  anthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: '{"resume_praticien":"ok"}' }],
    stop_reason: 'end_turn',
    usage: {},
  });
  prisma.syntheseIA.create.mockResolvedValue({ idSynthese: 'SYN_1', dateGeneration: new Date('2026-11-09T00:00:00Z') });
  prisma.auditSynthese.create.mockResolvedValue({});
});

describe('le bloc des règles non évaluées part au modèle (D-471)', () => {
  it('même quand aucune recommandation ne sort : c’est là qu’il compte', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(orientation([], NON_EVALUEES));
    await POST(req());
    const message = messageEnvoye();
    expect(message).not.toContain("## Recommandation d'exploration déterministe");
    expect(message).toContain(
      `${TITRE}\nVersion: orientation-nnpp2-v1\n\nQ_STR_02 — Échelle de stress perçu (PSS-10), passation du 2026-03-12 : au-delà de sa fenêtre de 30 jours.`,
    );
    expect(message.indexOf(TITRE)).toBeLessThan(message.indexOf('## Résultats des questionnaires'));
  });

  it('juste après le bloc de recommandation, avant celui des besoins', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(orientation([RECOMMANDATION], NON_EVALUEES));
    await POST(req());
    const message = messageEnvoye();
    const recommandation = message.indexOf("## Recommandation d'exploration déterministe");
    const nonEvaluees = message.indexOf(TITRE);
    const besoins = message.indexOf('## Besoins mesurés et non mesurés');
    expect(recommandation).toBeGreaterThan(-1);
    expect(nonEvaluees).toBeGreaterThan(recommandation);
    expect(besoins).toBeGreaterThan(nonEvaluees);
  });

  it('les identifiants des règles restent dans la trace, jamais dans le message', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(orientation([], NON_EVALUEES));
    await POST(req());
    expect(messageEnvoye()).not.toContain('R2-STR-0');
    expect(donneesEntree().reglesNonEvaluees).toEqual(['R2-STR-01', 'R2-STR-02']);
    expect(messageEnvoye()).toContain(donneesEntree().blocReglesNonEvaluees);
  });

  it('absent quand aucune règle n’est restée non évaluée, et la trace le dit', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(orientation([RECOMMANDATION], []));
    await POST(req());
    expect(messageEnvoye()).not.toContain(TITRE);
    expect(donneesEntree().blocReglesNonEvaluees).toBe('');
    expect(donneesEntree().reglesNonEvaluees).toEqual([]);
  });

  it('absent quand l’orientation est inactive ou indisponible', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({ actif: false, version: 'v', message: 'm' });
    await POST(req());
    expect(messageEnvoye()).not.toContain(TITRE);
    vi.clearAllMocks();
    evaluerOrientationPourPatient.mockRejectedValue(new Error('panne'));
    anthropicCreate.mockResolvedValue({ content: [{ type: 'text', text: '{}' }], stop_reason: 'end_turn', usage: {} });
    prisma.syntheseIA.create.mockResolvedValue({ idSynthese: 'SYN_2', dateGeneration: new Date() });
    await POST(req());
    expect(messageEnvoye()).not.toContain(TITRE);
    expect(donneesEntree().blocReglesNonEvaluees).toBe('');
    expect(donneesEntree().reglesNonEvaluees).toEqual([]);
  });
});

describe('le garde de restitution ne reproche pas au modèle ce que le bloc lui a transmis', () => {
  it('un instrument du bloc absent des résultats reste citable ; un instrument jamais transmis ne l’est pas', async () => {
    // Le moteur lit toutes les passations ; `reponsesInput` ne porte que les
    // administrables. `Q_INF_03` n'est que dans le bloc.
    evaluerOrientationPourPatient.mockResolvedValue(orientation([RECOMMANDATION], [
      {
        regleId: 'R2-INF-01',
        passations: [{ idQuestionnaire: 'Q_INF_03', dateReponse: '2026-06-01T09:30:00.000Z', fenetreJours: 14 }],
      },
    ]));
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'Q_INF_03 hors de sa fenêtre de 14 jours : certaines règles qui le lisent n’ont pas été évaluées. Le Q_ZZZ_09 serait utile.',
      narratif_patient: 'Texte.',
    });
    await POST(req());
    expect(messageEnvoye()).toContain('Q_INF_03');
    const ecarts = JSON.stringify(
      (prisma.syntheseIA.create.mock.calls[0][0].data.donneesEntree as { metadonneesPrompt: { orientationEcartsRestitution: unknown } })
        .metadonneesPrompt.orientationEcartsRestitution,
    );
    expect(ecarts).toContain('Q_ZZZ_09');
    expect(ecarts).not.toContain('Q_INF_03');
  });
});
