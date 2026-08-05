import { beforeEach, describe, expect, it, vi } from 'vitest';

// `@/lib/anthropic` instancie un client à l'import : stub obligatoire. Seul le
// GET (liste des synthèses) est testé ici — la génération (POST) et la mise à
// jour (PATCH) restent hors périmètre de ce fichier.
const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    syntheseIA: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    // Le GET qualifie chaque synthèse : porte-t-elle sur un dossier qui
    // contient une passation dont l'interprétation a été retirée ? D'où cette
    // seconde lecture, en sélection minimale (`idQuestionnaire` seul).
    questionnaireReponse: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/generated/prisma', () => ({ Prisma: {} }));
vi.mock('@/lib/anthropic', () => ({
  anthropic: {},
  CLAUDE_MODEL: 'claude-test',
  SYSTEM_PROMPT_SYNTHESE: '',
  VERSION_CORPUS_SYNTHESE: 'v-test',
  VERSION_PROMPT_SYNTHESE: 'v-test',
  VERSION_SCHEMA_SYNTHESE: 'v-test',
  validateSyntheseSchema: () => ({ ok: true }),
  sanitizeAuditError: (m: string) => m,
  CORPUS_CLINIQUE_ACTIF: '',
}));
// `sha256` : depuis le LOT-06 la route atteint `orientationRulesV1`, qui signe
// sa table avec cette fonction. Un mock qui ne l'expose pas casse l'import.
vi.mock('@/lib/clinical/corpusSyntheseV1', () => ({
  CORPUS_CLINIQUE_METADATA: {},
  CORPUS_CLINIQUE_SHA256: 'sha-test',
  sha256: (texte: string) => `sha256(${texte.length})`,
}));
vi.mock('@/lib/observability/logger', () => ({ logger: { error: vi.fn(), security: vi.fn() } }));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { GET } from './route';

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/synthese?${query}`);
}

function syntheseRow() {
  return {
    idSynthese: 'SYN_1',
    idPatient: 'PAT_1',
    dateGeneration: new Date('2026-07-18T00:00:00.000Z'),
    modele: 'claude-test',
    statut: 'Validee_Praticien',
    dateValidation: null,
    notesPraticien: null,
    syntheseJson: {},
  };
}

describe('GET /api/praticien/synthese', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.syntheseIA.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.syntheseIA.findMany).not.toHaveBeenCalled();
  });

  it('idPatient vide → 200 liste vide, sans lecture ni journalisation', async () => {
    const res = await GET(request(''));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ syntheses: [] });
    expect(prisma.syntheseIA.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('scope la liste par la relation patient', async () => {
    await GET(request());
    expect(prisma.syntheseIA.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          idPatient: 'PAT_1',
          patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
        },
      }),
    );
  });

  it('liste non vide → 200 et lecture journalisée au gabarit littéral', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([syntheseRow()]);
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/synthese',
        methode: 'GET',
      },
    });
  });

  it('liste vide (patient inconnu OU d’un autre praticien) → 200 sans journalisation (limite assumée)', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ syntheses: [] });
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
    // Aucune synthèse à qualifier : on ne lit pas les passations pour rien.
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  // Les 3 synthèses de production sont toutes VALIDÉES et alimentent le booklet
  // patient : elles précèdent le retrait, elles ne sont pas réécrites, elles
  // sont donc qualifiées à la lecture.
  it('synthèse antérieure au retrait, dossier concerné → avertissement', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([syntheseRow()]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([{ idQuestionnaire: 'Q_SOM_07' }]);
    const { syntheses } = await (await GET(request())).json();
    expect(syntheses[0].avertissementMesureRetiree).toBeTruthy();
    expect(syntheses[0].avertissementMesureRetiree).toContain('régénérer');
  });

  it('même dossier, mais synthèse POSTÉRIEURE au retrait → aucun avertissement', async () => {
    // Sans ce contrôle, la mention ne s'effacerait jamais et l'on apprendrait
    // à ne plus la lire.
    prisma.syntheseIA.findMany.mockResolvedValue([
      { ...syntheseRow(), dateGeneration: new Date('2026-08-01T00:00:00.000Z') },
    ]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([{ idQuestionnaire: 'Q_SOM_07' }]);
    const { syntheses } = await (await GET(request())).json();
    expect(syntheses[0].avertissementMesureRetiree).toBeNull();
  });

  it('synthèse ancienne mais dossier SAIN → aucun avertissement', async () => {
    // Le second contrôle négatif : sans lui, marquer toutes les synthèses
    // anciennes ferait passer le premier test au vert.
    prisma.syntheseIA.findMany.mockResolvedValue([syntheseRow()]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([{ idQuestionnaire: 'Q_SOM_06' }]);
    const { syntheses } = await (await GET(request())).json();
    expect(syntheses[0].avertissementMesureRetiree).toBeNull();
  });
});
