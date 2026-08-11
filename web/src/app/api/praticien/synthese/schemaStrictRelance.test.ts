import { beforeEach, describe, expect, it, vi } from 'vitest';

// Chemin de REJET + UNE RELANCE de la sortie du modèle (LOT-01, étape 4).
//
// Ce banc utilise le VRAI `analyserSortieSynthese` — un mock qui répondrait
// `{ ok: false }` sur commande prouverait que la route sait lire un booléen,
// pas qu'une sortie réellement non conforme est rejetée. Seul le client
// Anthropic est simulé, et c'est lui qu'on veut piloter.

const { getServerSession, prisma, anthropicCreate, loggerWarn, loggerError } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
    syntheseIA: { create: vi.fn() },
    auditSynthese: { create: vi.fn() },
  },
  anthropicCreate: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
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

// Le module réel, SAUF le client HTTP. `analyserSortieSynthese`,
// `SYSTEM_PROMPT_SYNTHESE` et les versions restent ceux de production.
vi.mock('@/lib/anthropic', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/anthropic')>();
  return { ...reel, anthropic: { messages: { create: anthropicCreate } } };
});

vi.mock('@/lib/scoring/miniSynthese', () => ({ buildMiniSynthese: () => ({}) }));
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: loggerError, warn: loggerWarn, security: vi.fn() },
}));
vi.mock('@/lib/observability/eventCodes', () => ({
  EVENT_CODES: {
    SYNTHESE_SCHEMA_REJETE_RELANCE: 'SYNTHESE_IA.SCHEMA.REJETE_RELANCE',
    SYNTHESE_SCHEMA_RELANCE_ECHOUEE: 'SYNTHESE_IA.SCHEMA.RELANCE_ECHOUEE',
    SYNTHESE_POST_EXCEPTION: 'SYNTHESE_IA.GENERATION.FAILED',
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

/** Sortie conforme au schéma strict. */
const CONFORME = JSON.stringify({
  resume_praticien: 'Synthèse concise pour le praticien.',
  axes_prioritaires: [],
  points_de_vigilance: ['Un point'],
  questions_entretien: ['Une question ?'],
  narratif_patient: 'Un texte accessible.',
  limites: 'À valider par le praticien.',
});

/**
 * Sortie NON conforme : `niveau_priorite` hors énumération. C'est exactement ce
 * que l'ancien cast laissait passer jusqu'à l'écran praticien.
 */
const HORS_SCHEMA = JSON.stringify({
  resume_praticien: 'Synthèse concise pour le praticien.',
  axes_prioritaires: [
    { axe: 'Stress', niveau_priorite: 'critique', arguments: ['a'], points_a_confirmer: ['b'] },
  ],
  points_de_vigilance: ['Un point'],
  questions_entretien: ['Une question ?'],
  narratif_patient: 'Un texte accessible.',
  limites: 'À valider par le praticien.',
});

function reponseModele(texte: string, usage: Record<string, number> = {}) {
  return { content: [{ type: 'text', text: texte }], stop_reason: 'end_turn', usage };
}

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
  prisma.syntheseIA.create.mockResolvedValue({
    idSynthese: 'SYN_1',
    dateGeneration: new Date('2026-08-11T00:00:00Z'),
  });
  prisma.auditSynthese.create.mockResolvedValue({});
});

describe('sortie conforme du premier coup', () => {
  it('n’appelle le modèle qu’UNE fois et ne journalise aucun rejet', async () => {
    anthropicCreate.mockResolvedValue(reponseModele(CONFORME));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(anthropicCreate).toHaveBeenCalledTimes(1);
    expect(loggerWarn).not.toHaveBeenCalled();
    // Contrôle négatif : sans lui, une route qui relancerait TOUJOURS passerait
    // les deux cas suivants sans qu'on le voie.
  });
});

describe('sortie hors schéma — rejet puis UNE relance', () => {
  it('relance une fois et sert la sortie conforme de la relance', async () => {
    anthropicCreate
      .mockResolvedValueOnce(reponseModele(HORS_SCHEMA))
      .mockResolvedValueOnce(reponseModele(CONFORME));

    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(anthropicCreate).toHaveBeenCalledTimes(2);
    expect(prisma.syntheseIA.create).toHaveBeenCalledTimes(1);

    const journal = loggerWarn.mock.calls[0][0];
    expect(journal.event).toBe('SYNTHESE_IA.SCHEMA.REJETE_RELANCE');
    expect(journal.message).toContain('niveau_priorite');
  });

  it('la relance nomme la violation au modèle, sans toucher au prompt système', async () => {
    anthropicCreate
      .mockResolvedValueOnce(reponseModele(HORS_SCHEMA))
      .mockResolvedValueOnce(reponseModele(CONFORME));
    await POST(req());

    const premier = anthropicCreate.mock.calls[0][0];
    const second = anthropicCreate.mock.calls[1][0];
    // La garde d'empreinte du prompt (`promptAlimentaire.guard.test.ts`) reste
    // valide parce que la relance passe par un tour UTILISATEUR : aucun bump de
    // version de prompt n'est dû à l'étape 4.
    expect(second.system).toEqual(premier.system);
    expect(second.messages.length).toBeGreaterThan(premier.messages.length);
    const dernier = second.messages[second.messages.length - 1];
    expect(dernier.role).toBe('user');
    expect(dernier.content).toContain('niveau_priorite');
  });

  it('cumule les métriques des DEUX appels, sans effacer le coût de la relance', async () => {
    anthropicCreate
      .mockResolvedValueOnce(reponseModele(HORS_SCHEMA, { input_tokens: 100, output_tokens: 20 }))
      .mockResolvedValueOnce(reponseModele(CONFORME, { input_tokens: 130, output_tokens: 30 }));
    await POST(req());

    const donnees = prisma.syntheseIA.create.mock.calls[0][0].data.donneesEntree;
    expect(donnees.metriquesAnthropic.input_tokens).toBe(230);
    expect(donnees.metriquesAnthropic.output_tokens).toBe(50);
  });
});

describe('la relance échoue à son tour — RIEN n’est servi', () => {
  it('ne persiste aucune synthèse et n’appelle pas le modèle une troisième fois', async () => {
    anthropicCreate.mockResolvedValue(reponseModele(HORS_SCHEMA));

    const res = await POST(req());
    expect(res.status).toBeGreaterThanOrEqual(400);
    // UNE relance, pas deux : la borne est celle du lot.
    expect(anthropicCreate).toHaveBeenCalledTimes(2);
    // Le point central du critère 3 : jamais servi dégradé.
    expect(prisma.syntheseIA.create).not.toHaveBeenCalled();

    const codes = loggerError.mock.calls.map((c: unknown[]) => (c[0] as { event: string }).event);
    expect(codes).toContain('SYNTHESE_IA.SCHEMA.RELANCE_ECHOUEE');
  });
});
