import { beforeEach, describe, expect, it, vi } from 'vitest';

// LOT-06 — ce que la synthèse reçoit de l'orientation déterministe, et ce
// qu'elle en journalise. Le contrat tient en une phrase : le modèle restitue,
// il ne produit pas. Deux gestes le soutiennent, et les deux sont testés ici :
// quand il n'y a rien à restituer, RIEN n'est injecté (on ne compte pas sur la
// consigne pour tenir un bloc vide) ; et si un pack est cité hors de ceux
// transmis, l'écart est journalisé sous son propre code.

const { getServerSession, prisma, anthropicCreate, validateSyntheseSchema, evaluerOrientationPourPatient, loggerWarn } =
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
    loggerWarn: vi.fn(),
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
vi.mock('@/lib/clinical/corpusSyntheseV1', () => ({
  CORPUS_CLINIQUE_METADATA: {},
  CORPUS_CLINIQUE_SHA256: 'sha',
  sha256: (texte: string) => `sha256(${texte.length})`,
}));
// Le service est mocké ICI, et seulement ici : c'est ce qui permet d'exercer le
// chemin `actif: true`, impossible autrement tant que la table n'est pas signée.
vi.mock('@/lib/clinical/orientationService', () => ({ evaluerOrientationPourPatient }));
vi.mock('@/lib/scoring/miniSynthese', () => ({ buildMiniSynthese: () => ({}) }));
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: loggerWarn, security: vi.fn() },
}));
vi.mock('@/lib/observability/eventCodes', () => ({
  EVENT_CODES: {
    SYNTHESE_ORIENTATION_RESTITUTION_INFIDELE: 'SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE',
    SYNTHESE_ORIENTATION_INDISPONIBLE: 'SYNTHESE_IA.ORIENTATION.INDISPONIBLE',
    SYNTHESE_POST_CONTEXT_UNAVAILABLE: 'SYNTHESE_IA.GENERATION.CONTEXT_UNAVAILABLE',
  },
}));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { POST } from './route';

function req(): Request {
  return new Request('http://x/api/praticien/synthese', {
    method: 'POST',
    body: JSON.stringify({ idPatient: 'PAT_SEED_01' }),
  });
}

/** Le message user réellement envoyé au modèle. */
function messageEnvoye(): string {
  return anthropicCreate.mock.calls[0][0].messages[0].content as string;
}

function metadonneesPersistees(): Record<string, unknown> {
  const data = prisma.syntheseIA.create.mock.calls[0][0].data;
  return (data.donneesEntree as { metadonneesPrompt: Record<string, unknown> }).metadonneesPrompt;
}

const ORIENTATION_ACTIVE = {
  actif: true as const,
  version: 'orientation-nnpp2-v1',
  sha256: 'abc123def456',
  recommandations: [
    {
      cible: { type: 'pack' as const, packId: 'pack_sommeil_chronobiologie' },
      idPackBase: 'PACK_SOMMEIL_CHRONO',
      priorite: 1,
      niveau: 'approfondissement' as const,
      objectifs: ['Caractériser la fragmentation'],
      needIds: [3],
      dejaAssigne: false,
      dejaRepondu: false,
      motifs: [
        {
          regleId: 'R-SOM-01',
          conditions: ['PSQI au-dessus de son seuil publié'],
          claims: [{ claimId: 'WN-CLM-0001', versionClaim: 'v1.0' }],
        },
      ],
    },
  ],
};

const INACTIVE = {
  actif: false as const,
  version: 'orientation-nnpp2-v1',
  message: 'Orientation en cours de constitution — les règles NNPP2 ne sont pas encore validées.',
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com' });
  prisma.questionnaireReponse.findMany.mockResolvedValue([
    {
      idQuestionnaire: 'Q_ALI_02',
      titre: 'Diète méditerranéenne',
      dateReponse: new Date('2026-07-10'),
      scoresJson: {},
      scorePrincipal: 12,
      interpretation: null,
    },
  ]);
  prisma.consultation.findFirst.mockResolvedValue(null);
  validateSyntheseSchema.mockReturnValue({ points_de_vigilance: [] });
  anthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: '{"resume_praticien":"ok"}' }],
    stop_reason: 'end_turn',
    usage: {},
  });
  prisma.syntheseIA.create.mockResolvedValue({
    idSynthese: 'SYN_1',
    dateGeneration: new Date('2026-08-03T00:00:00Z'),
  });
  prisma.auditSynthese.create.mockResolvedValue({});
  evaluerOrientationPourPatient.mockResolvedValue(INACTIVE);
});

describe('bloc d’orientation transmis au modèle', () => {
  it('n’injecte AUCUN bloc quand la table n’est pas signée', async () => {
    await POST(req());
    const message = messageEnvoye();
    // Pas d'en-tête vide : un titre sans contenu invite le modèle à le remplir.
    expect(message).not.toContain("Recommandation d'exploration déterministe");
  });

  it('n’injecte AUCUN bloc quand la table est signée mais ne recommande rien', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({ ...ORIENTATION_ACTIVE, recommandations: [] });
    await POST(req());
    expect(messageEnvoye()).not.toContain("Recommandation d'exploration déterministe");
  });

  it('injecte le bloc, sa provenance et ses motifs quand la table recommande', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    await POST(req());
    const message = messageEnvoye();

    expect(message).toContain("## Recommandation d'exploration déterministe");
    expect(message).toContain('SHA-256: abc123def456');
    expect(message).toContain('Version: orientation-nnpp2-v1');
    // Le titre de doctrine, pas le slug : c'est ce que le modèle doit citer.
    expect(message).toContain('Sommeil et chronobiologie');
    expect(message).toContain('R-SOM-01');
    expect(message).toContain('PSQI au-dessus de son seuil publié');
    // Numéroté : l'ordre est calculé, la numérotation lui retire toute raison
    // de le refaire.
    expect(message).toContain('1. pack');
  });

  it('place le bloc avant les résultats de questionnaires', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    await POST(req());
    const message = messageEnvoye();
    expect(message.indexOf("## Recommandation d'exploration déterministe")).toBeLessThan(
      message.indexOf('## Résultats des questionnaires'),
    );
  });

  it('ne fait pas échouer la synthèse si l’orientation est indisponible', async () => {
    evaluerOrientationPourPatient.mockRejectedValue(new Error('base indisponible'));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(messageEnvoye()).not.toContain("Recommandation d'exploration déterministe");
  });
});

describe('métadonnées d’audit', () => {
  it('persiste la version, le sha256 et les packs transmis', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    await POST(req());
    const meta = metadonneesPersistees();

    expect(meta.orientationInjectee).toBe(true);
    expect(meta.orientationSha256).toBe('abc123def456');
    expect(meta.orientationVersion).toBe('orientation-nnpp2-v1');
    expect(meta.orientationPacksTransmis).toEqual(['pack_sommeil_chronobiologie']);
  });

  it('n’inscrit ni version ni sha256 quand aucun bloc n’est parti', async () => {
    await POST(req());
    const meta = metadonneesPersistees();
    expect(meta.orientationInjectee).toBe(false);
    expect(meta.orientationSha256).toBeNull();
    // Une version sans bloc laisserait croire qu'un bloc est parti.
    expect(meta.orientationVersion).toBeNull();
  });

  it('n’inscrit rien non plus sur une table signée qui ne recommande rien', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({ ...ORIENTATION_ACTIVE, recommandations: [] });
    await POST(req());
    const meta = metadonneesPersistees();
    expect(meta.orientationInjectee).toBe(false);
    expect(meta.orientationSha256).toBeNull();
  });
});

function codesJournalises(): string[] {
  return loggerWarn.mock.calls.map(appel => appel[0].event);
}

describe('garde de restitution', () => {
  it('ne journalise rien quand la synthèse restitue fidèlement', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'Le pack Sommeil et chronobiologie est proposé par la table.',
    });

    await POST(req());

    expect(codesJournalises()).not.toContain('SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE');
  });

  it('journalise l’écart quand un pack non transmis est cité', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'J’ajoute aussi le pack Stress chronique et burnout.',
    });

    await POST(req());

    const ecart = loggerWarn.mock.calls.find(
      appel => appel[0].event === 'SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE',
    );
    expect(ecart).toBeTruthy();
    expect(ecart?.[0].message).toContain('pack:pack_stress_chronique_burnout');
  });

  it('rend tout de même la synthèse : on journalise, on ne censure pas', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'J’ajoute aussi le pack Stress chronique et burnout.',
    });

    const res = await POST(req());

    // L'objet actionnable — la carte et son bouton — vient de la route
    // déterministe, jamais d'ici : un pack cité à tort ne peut rien déclencher.
    expect(res.status).toBe(200);
    expect(prisma.syntheseIA.create).toHaveBeenCalledOnce();
    expect(metadonneesPersistees().orientationEcartsRestitution).toEqual([
      { type: 'pack', identifiant: 'pack_stress_chronique_burnout' },
    ]);
  });

  // Le défaut trouvé à la revue adversariale, et le chemin que la production
  // exécute réellement tant que la table n'est pas signée.
  it('NE TOURNE PAS quand aucun bloc n’a été injecté, même sur une prose évocatrice', async () => {
    // Orientation inactive : allowlist vide. Un garde qui tournerait quand même
    // comparerait cette phrase aux seize titres et accuserait une synthèse à
    // qui aucune recommandation n'a jamais été présentée.
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien:
        "Prioriser l'axe digestif et intestin-cerveau ; un stress chronique et burnout débutant sont évoqués.",
    });

    await POST(req());

    expect(codesJournalises()).not.toContain('SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE');
    expect(metadonneesPersistees().orientationEcartsRestitution).toEqual([]);
  });

  it('ne tourne pas non plus sur une table signée sans recommandation', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({ ...ORIENTATION_ACTIVE, recommandations: [] });
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'Je propose le pack Stress chronique et burnout.',
    });

    await POST(req());

    expect(codesJournalises()).not.toContain('SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE');
  });

  it('ne signale pas les questionnaires du dossier, qui sont au prompt', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      // Q_ALI_02 est la fixture du dossier : le citer est le travail du modèle.
      resume_praticien: 'Le Q_ALI_02 montre une exposition faible aux légumineuses.',
    });

    await POST(req());

    expect(codesJournalises()).not.toContain('SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE');
  });

  it('signale en revanche un questionnaire absent du dossier et de la recommandation', async () => {
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);
    validateSyntheseSchema.mockReturnValue({
      points_de_vigilance: [],
      resume_praticien: 'Faire passer Q_NEU_11 en complément.',
    });

    await POST(req());

    const ecart = loggerWarn.mock.calls.find(
      appel => appel[0].event === 'SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE',
    );
    expect(ecart?.[0].message).toContain('questionnaire:Q_NEU_11');
  });
});

describe('transport SSE (WN_SYNTHESE_STREAM)', () => {
  it('transmet le même bloc d’orientation que le transport JSON', async () => {
    process.env.WN_SYNTHESE_STREAM = 'true';
    evaluerOrientationPourPatient.mockResolvedValue(ORIENTATION_ACTIVE);

    const res = await POST(req());
    // Le corps est un flux : on n'assert pas dessus, mais l'appel modèle a bien
    // eu lieu avec le même message — les deux transports partagent `genererArgs`.
    await res.text();

    expect(messageEnvoye()).toContain("## Recommandation d'exploration déterministe");
    expect(messageEnvoye()).toContain('SHA-256: abc123def456');
  });
});
