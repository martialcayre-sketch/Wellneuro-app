import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, journaliserAccesDossier } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  journaliserAccesDossier: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    syntheseIA: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    bookletEnvoi: { findFirst: vi.fn() },
    correspondancePatient: { findFirst: vi.fn() },
    auditSynthese: { create: vi.fn() },
    documentMedecinImprime: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/ids', () => ({ createPublicId: () => 'SYN_MANUEL_1' }));
vi.mock('@/lib/praticien/journalAcces', () => ({ journaliserAccesDossier }));
vi.mock('@/generated/prisma', () => ({ Prisma: { DbNull: {} } }));
vi.mock('@/lib/anthropic', () => ({
  anthropic: {},
  CLAUDE_MODEL: 'claude-test',
  SYSTEM_PROMPT_SYNTHESE: '',
  VERSION_CORPUS_SYNTHESE: 'v-test',
  VERSION_PROMPT_SYNTHESE: 'v-test',
  VERSION_SCHEMA_SYNTHESE: 'v-test',
  validateSyntheseSchema: (value: unknown) => value,
  // Délégation au mock historique : voir la note de `route.post.test.ts`.
  analyserSortieSynthese: (value: unknown) => ({ ok: true, synthese: value }),
  sanitizeAuditError: (message: string) => message,
  CORPUS_CLINIQUE_ACTIF: '',
}));
// `sha256` : depuis le LOT-06 la route atteint `orientationRulesV1`, qui signe
// sa table avec cette fonction. Un mock qui ne l'expose pas casse l'import.
vi.mock('@/lib/clinical/corpusSyntheseV1', () => ({
  CORPUS_CLINIQUE_METADATA: {},
  CORPUS_CLINIQUE_SHA256: 'sha-test',
  sha256: (texte: string) => `sha256(${texte.length})`,
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), security: vi.fn() },
}));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_context: unknown, value: unknown) => value,
  withCorrelationHeader: (response: unknown) => response,
}));

import { PATCH, PUT } from './route';
import {
  MODELE_REDACTION_PRATICIEN,
  VERSION_SYNTHESE_PRATICIEN,
  nouveauBrouillonPraticien,
} from '@/lib/synthese-praticien';

const brouillon = {
  ...nouveauBrouillonPraticien(),
  resume_praticien: 'Résumé clinique interne',
  narratif_patient: 'Texte clair destiné au patient.',
};

function requete(method: 'PUT' | 'PATCH', body: unknown): Request {
  return new Request('http://localhost/api/praticien/synthese', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function ligneSynthese() {
  return {
    idSynthese: 'SYN_MANUEL_1',
    idPatient: 'PAT_SEED_01',
    emailPatient: 'sophie.nicola@example.test',
    dateGeneration: new Date('2026-07-25T10:00:00.000Z'),
    modele: MODELE_REDACTION_PRATICIEN,
    versionPrompt: VERSION_SYNTHESE_PRATICIEN,
    donneesEntree: {},
    syntheseJson: brouillon,
    statut: 'Brouillon_Praticien',
    dateValidation: null,
    notesPraticien: null,
    updatedAt: new Date('2026-07-25T10:05:00.000Z'),
  };
}
const VERSION_LUE = '2026-07-25T10:05:00.000Z';
const MESSAGE_MODIFIEE = 'La synthèse a été modifiée entre-temps. Rechargez-la avant de recommencer.';

describe('brouillon praticien /api/praticien/synthese', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findFirst.mockResolvedValue({
      idPatient: 'PAT_SEED_01',
      email: 'sophie.nicola@example.test',
      actif: true,
      suiviClotureLe: null,
    });
    prisma.syntheseIA.create.mockResolvedValue(ligneSynthese());
    prisma.syntheseIA.findFirst.mockResolvedValue(ligneSynthese());
    prisma.syntheseIA.update.mockResolvedValue(ligneSynthese());
    // Relue sous le verrou : par défaut, la synthèse n'a pas changé depuis la
    // lecture d'entrée (la dernière que `findFirst` a rendue).
    prisma.syntheseIA.findUnique.mockImplementation(async () => prisma.syntheseIA.findFirst.mock.results.at(-1)?.value);
    prisma.bookletEnvoi.findFirst.mockResolvedValue(null);
    prisma.correspondancePatient.findFirst.mockResolvedValue(null);
    prisma.auditSynthese.create.mockResolvedValue({});
    prisma.documentMedecinImprime.findFirst.mockResolvedValue(null);
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
    journaliserAccesDossier.mockResolvedValue(undefined);
  });

  it('crée une rédaction praticien sans dépendre de la configuration Anthropic', async () => {
    const response = await PUT(requete('PUT', { idPatient: 'PAT_SEED_01', synthese: brouillon }));
    expect(response.status).toBe(200);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: {
        idPatient: 'PAT_SEED_01',
        praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' },
      },
    });
    expect(prisma.syntheseIA.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        modele: MODELE_REDACTION_PRATICIEN,
        versionPrompt: VERSION_SYNTHESE_PRATICIEN,
        statut: 'Brouillon_Praticien',
      }),
    });
    const corps = await response.json();
    expect(corps.success).toBe(true);
    // Version optimiste : sans elle, le premier enregistrement du brouillon
    // créé partirait sans version (wn-reviewer, P3-4).
    expect(corps.synthese.updatedAt).toBe(VERSION_LUE);
  });

  it('masque comme introuvable le patient d’un autre praticien', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    const response = await PUT(requete('PUT', { idPatient: 'PAT_AUTRE', synthese: brouillon }));
    expect(response.status).toBe(404);
    expect(prisma.syntheseIA.create).not.toHaveBeenCalled();
  });

  describe('dossier fermé (t63, arbitrage d61)', () => {
    const OUVERT = {
      idPatient: 'PAT_SEED_01',
      email: 'sophie.nicola@example.test',
      actif: true,
      suiviClotureLe: null,
    };
    const CLOS = { ...OUVERT, suiviClotureLe: new Date('2026-11-01T00:00:00.000Z') };

    function rienNEstEcrit() {
      expect(prisma.syntheseIA.create).not.toHaveBeenCalled();
      expect(prisma.auditSynthese.create).not.toHaveBeenCalled();
      expect(journaliserAccesDossier).not.toHaveBeenCalled();
    }

    it('PUT sur dossier clos : 409 au texte validé, aucune écriture', async () => {
      prisma.patient.findFirst.mockResolvedValue(CLOS);
      const response = await PUT(requete('PUT', { idPatient: 'PAT_SEED_01', synthese: brouillon }));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: 'Le suivi de ce dossier est clôturé : aucune synthèse ne peut être générée ni rédigée. Rouvrez le suivi pour reprendre.',
        reason: 'dossier_cloture',
      });
      rienNEstEcrit();
    });

    it('PUT sur dossier désactivé non clos : 409 à son propre message, aucune écriture', async () => {
      prisma.patient.findFirst.mockResolvedValue({ ...OUVERT, actif: false });
      const response = await PUT(requete('PUT', { idPatient: 'PAT_SEED_01', synthese: brouillon }));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: 'Ce dossier est désactivé : rien de nouveau ne peut y être enregistré. Réactivez le dossier pour reprendre.',
        reason: 'dossier_desactive',
      });
      rienNEstEcrit();
    });

    it('PUT sur dossier ouvert ou suivi rouvert : le brouillon se crée', async () => {
      prisma.patient.findFirst.mockResolvedValue(OUVERT);
      const response = await PUT(requete('PUT', { idPatient: 'PAT_SEED_01', synthese: brouillon }));
      expect(response.status).toBe(200);
      expect(prisma.syntheseIA.create).toHaveBeenCalledOnce();
    });

    it.each(['enregistrer', 'valider', 'rejeter', 'annoter', 'effacer'])(
      'PATCH %s reste ouvert : le dossier n’est pas même consulté',
      async (action) => {
        // La ligne de synthèse ne porte pas l'état du dossier, et la route ne le lit pas :
        // l'ouverture vaut donc pour un dossier clos comme pour un dossier ouvert.
        prisma.patient.findFirst.mockResolvedValue(CLOS);
        const response = await PATCH(requete('PATCH', {
          idSynthese: 'SYN_MANUEL_1',
          action,
          notes: 'Note du praticien',
          synthese: brouillon,
        }));
        expect(response.status).toBe(200);
        expect(prisma.patient.findFirst).not.toHaveBeenCalled();
        expect(prisma.syntheseIA.update).toHaveBeenCalledOnce();
      },
    );
  });

  it('enregistre uniquement après avoir scopé la synthèse par son patient', async () => {
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'enregistrer',
      synthese: { ...brouillon, narratif_patient: 'Texte patient corrigé.' },
    }));
    expect(response.status).toBe(200);
    expect(prisma.syntheseIA.findFirst).toHaveBeenCalledWith({
      where: {
        idSynthese: 'SYN_MANUEL_1',
        patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      },
    });
    expect(prisma.syntheseIA.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        statut: 'Brouillon_Praticien',
        syntheseJson: expect.objectContaining({ narratif_patient: 'Texte patient corrigé.' }),
      }),
    }));
  });

  it('refuse la mise à jour d’une synthèse hors périmètre', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue(null);
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_AUTRE',
      action: 'valider',
    }));
    expect(response.status).toBe(404);
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  it('vide une synthèse non envoyée et la remet en brouillon praticien', async () => {
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'effacer',
    }));

    expect(response.status).toBe(200);
    expect(prisma.bookletEnvoi.findFirst).toHaveBeenCalledWith({
      where: { idSynthese: 'SYN_MANUEL_1', statut: 'Envoye' },
      select: { id: true },
    });
    // Les deux lectures du booklet se font SOUS LE VERROU du dossier, avant
    // l'écriture (P3-3 de wn-reviewer sur #2226).
    const verrou = prisma.$queryRaw.mock.invocationCallOrder[0];
    expect(String((prisma.$queryRaw.mock.calls[0] as unknown[])[0])).toContain('FOR UPDATE');
    expect(prisma.correspondancePatient.findFirst.mock.invocationCallOrder[0]).toBeGreaterThan(verrou);
    expect(prisma.bookletEnvoi.findFirst.mock.invocationCallOrder[0]).toBeGreaterThan(verrou);
    expect(prisma.syntheseIA.update.mock.invocationCallOrder[0]).toBeGreaterThan(prisma.bookletEnvoi.findFirst.mock.invocationCallOrder[0]);
    expect(prisma.syntheseIA.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        statut: 'Brouillon_Praticien',
        modele: MODELE_REDACTION_PRATICIEN,
        versionPrompt: VERSION_SYNTHESE_PRATICIEN,
        dateValidation: null,
        notesPraticien: null,
        syntheseJson: expect.objectContaining({
          resume_praticien: '',
          narratif_patient: '',
        }),
      }),
    }));
    expect(prisma.auditSynthese.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ statut: 'Brouillon_Efface_Praticien' }),
    });
  });

  it('refuse de vider une synthèse dont le booklet a déjà été envoyé, contrôlé sous le verrou du dossier', async () => {
    prisma.bookletEnvoi.findFirst.mockResolvedValue({ id: 'BE_1' });
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'effacer',
    }));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('Impossible de vider une synthèse dont le booklet a déjà été envoyé.');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(String((prisma.$queryRaw.mock.calls[0] as unknown[])[0])).toContain('FOR UPDATE');
    expect(prisma.bookletEnvoi.findFirst.mock.invocationCallOrder[0])
      .toBeGreaterThan(prisma.$queryRaw.mock.invocationCallOrder[0]);
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
    expect(prisma.auditSynthese.create).not.toHaveBeenCalled();
  });

  // L'envoi du booklet réserve sa ligne de journal sous le même verrou, AVANT
  // l'e-mail (`/api/praticien/booklet`) : un envoi en partance compte. Sans
  // cette lecture, un vidage passait entre la réservation et le solde, et le
  // booklet partait d'une synthèse vidée (P3-3 de wn-reviewer sur #2226).
  it('refuse de vider une synthèse dont le booklet part en ce moment ou est parti au journal', async () => {
    prisma.correspondancePatient.findFirst.mockResolvedValue({ id: 'COR_1' });
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'effacer',
    }));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('Impossible de vider une synthèse dont le booklet a déjà été envoyé.');
    expect(prisma.correspondancePatient.findFirst).toHaveBeenCalledWith({
      where: {
        idPatient: 'PAT_SEED_01',
        type: 'booklet',
        referenceId: 'SYN_MANUEL_1',
        OR: [{ statut: 'Envoye' }, { statut: 'Non_envoye', erreurCourte: 'réservé : envoi en cours' }],
      },
      select: { id: true },
    });
    expect(prisma.correspondancePatient.findFirst.mock.invocationCallOrder[0])
      .toBeGreaterThan(prisma.$queryRaw.mock.invocationCallOrder[0]);
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
    expect(prisma.auditSynthese.create).not.toHaveBeenCalled();
  });

  it.each(['enregistrer', 'valider', 'rejeter', 'annoter'])(
    '« %s » ne consulte pas le booklet : seul « effacer » le garde',
    async (action) => {
      prisma.correspondancePatient.findFirst.mockResolvedValue({ id: 'COR_1' });
      prisma.bookletEnvoi.findFirst.mockResolvedValue({ id: 'BE_1' });
      await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action, synthese: {} }));
      expect(prisma.correspondancePatient.findFirst).not.toHaveBeenCalled();
      expect(prisma.bookletEnvoi.findFirst).not.toHaveBeenCalled();
    },
  );

  // D-307 (F38), arbitrage du 2026-10-19 : une synthèse imprimée pour le
  // médecin ne se vide ni ne se rejette — contrôlé sous le verrou du dossier.
  it.each([['effacer'], ['rejeter']])('refuse de %s une synthèse imprimée pour le médecin, sous le verrou du dossier', async (action) => {
    prisma.documentMedecinImprime.findFirst.mockResolvedValue({ id: 'IMP_1' });
    const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action }));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('synthese_imprimee_pour_medecin');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(String((prisma.$queryRaw.mock.calls[0] as unknown[])[0])).toContain('FOR UPDATE');
    expect(prisma.documentMedecinImprime.findFirst).toHaveBeenCalledWith({
      where: { idSynthese: 'SYN_MANUEL_1' },
      select: { id: true },
    });
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
    expect(prisma.auditSynthese.create).not.toHaveBeenCalled();
  });

  it('rejette une synthèse jamais imprimée, sous le verrou du dossier', async () => {
    const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action: 'rejeter' }));
    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.syntheseIA.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ statut: 'Rejetee' }),
    }));
  });

  // « valider » passe sous le verrou et relit le statut, sans entrer au
  // contrôle d'impression : il n'atteint qu'un brouillon, jamais imprimé
  // (lot synthese-valider-annoter-conditionnels).
  it('valider relit le statut sous le verrou, sans entrer au contrôle d’impression', async () => {
    prisma.documentMedecinImprime.findFirst.mockResolvedValue({ id: 'IMP_1' });
    prisma.syntheseIA.findFirst.mockResolvedValue({ ...ligneSynthese(), statut: 'Brouillon_IA', modele: 'claude-test' });
    const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action: 'valider' }));
    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(String((prisma.$queryRaw.mock.calls[0] as unknown[])[0])).toContain('FOR UPDATE');
    expect(prisma.syntheseIA.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.documentMedecinImprime.findFirst).not.toHaveBeenCalled();
  });

  it.each(['Validee_Praticien', 'Corrigee_Praticien', 'Rejetee', 'Inconnu'])('refuse de valider une synthèse au statut %s (onglet périmé)', async (statut) => {
    prisma.syntheseIA.findFirst.mockResolvedValue({ ...ligneSynthese(), statut });
    const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action: 'valider' }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('Seul un brouillon (IA ou praticien) peut être validé.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  it.each([
    ['valider', { statut: 'Brouillon_IA', modele: 'claude-test' }, { statut: 'Validee_Praticien', modele: 'claude-test' }],
    ['annoter', { statut: 'Brouillon_Praticien' }, { statut: 'Validee_Praticien', modele: MODELE_REDACTION_PRATICIEN }],
    ['annoter', { statut: 'Validee_Praticien' }, null],
    ['rejeter', { statut: 'Brouillon_Praticien' }, { statut: 'Validee_Praticien', modele: MODELE_REDACTION_PRATICIEN }],
  ])('refuse de %s une synthèse changée entre la lecture et le verrou', async (action, lue, sousVerrou) => {
    prisma.syntheseIA.findFirst.mockResolvedValue({ ...ligneSynthese(), ...lue });
    prisma.syntheseIA.findUnique.mockResolvedValue(sousVerrou);
    const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action, notes: 'Note.' }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('La synthèse a été modifiée entre-temps. Rechargez-la avant de recommencer.');
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  it('annote une synthèse imprimée pour le médecin : la note va au booklet', async () => {
    prisma.documentMedecinImprime.findFirst.mockResolvedValue({ id: 'IMP_1' });
    prisma.syntheseIA.findFirst.mockResolvedValue({ ...ligneSynthese(), statut: 'Validee_Praticien' });
    const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action: 'annoter', notes: 'Note.' }));
    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.documentMedecinImprime.findFirst).not.toHaveBeenCalled();
    expect(prisma.syntheseIA.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ statut: 'Corrigee_Praticien', notesPraticien: 'Note.' }),
    }));
  });

  it('refuse de valider un brouillon praticien vide', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue({
      ...ligneSynthese(),
      syntheseJson: nouveauBrouillonPraticien(),
    });

    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'valider',
    }));

    expect(response.status).toBe(400);
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  it('enregistre l’édition d’un brouillon IA sans repasser par les contraintes du brouillon praticien', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue({
      ...ligneSynthese(),
      idSynthese: 'SYN_IA_1',
      modele: 'claude-test',
      statut: 'Brouillon_IA',
      syntheseJson: { ...brouillon, limites: 'Limites générées par le modèle.' },
    });

    // Dépasse la limite de 12000 caractères du brouillon praticien : une
    // édition d'un contenu IA déjà long ne doit pas être rejetée pour autant.
    const syntheseModifiee = {
      ...brouillon,
      narratif_patient: 'x'.repeat(13000),
      limites: 'Limites générées par le modèle.',
    };

    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_IA_1',
      action: 'enregistrer',
      synthese: syntheseModifiee,
    }));

    expect(response.status).toBe(200);
    expect(prisma.syntheseIA.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ syntheseJson: syntheseModifiee }),
    }));
  });

  it('refuse d’enregistrer une synthèse déjà validée, IA ou praticien', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue({ ...ligneSynthese(), statut: 'Validee_Praticien' });

    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'enregistrer',
      synthese: brouillon,
    }));

    expect(response.status).toBe(409);
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  // Ce refus est la SEULE chose qui fige le narratif servi au portail patient :
  // contrairement à la note (`booklet_envois.noteTransmise`), `syntheseJson`
  // n'est pas snapshotté à l'envoi — la page « Mon bilan » le lit vivant sur la
  // synthèse. Si `enregistrer` redevenait possible après validation, le texte
  // lu par le patient changerait sous ses yeux, sans nouvel envoi. Les deux
  // statuts post-validation doivent donc être couverts, pas seulement le
  // premier : `Corrigee_Praticien` est celui d'une synthèse rouverte puis
  // revalidée, et c'est le plus susceptible d'être réédité.
  it('refuse d’enregistrer une synthèse corrigée puis revalidée (Corrigee_Praticien)', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue({ ...ligneSynthese(), statut: 'Corrigee_Praticien' });

    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'enregistrer',
      synthese: { ...brouillon, narratif_patient: 'Réécriture après validation.' },
    }));

    expect(response.status).toBe(409);
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  // Course relevée par wn-reviewer sur #2215 : le brouillon est lu hors verrou ;
  // une validation puis une impression peuvent passer avant l'écriture.
  it('enregistre sous le verrou du dossier', async () => {
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'enregistrer',
      synthese: brouillon,
    }));
    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(String((prisma.$queryRaw.mock.calls[0] as unknown[])[0])).toContain('FOR UPDATE');
    expect(prisma.syntheseIA.findUnique).toHaveBeenCalledWith({
      where: { idSynthese: 'SYN_MANUEL_1' },
      select: { statut: true, modele: true, updatedAt: true },
    });
    expect(prisma.syntheseIA.update).toHaveBeenCalledTimes(1);
  });

  it('refuse d’enregistrer un brouillon validé entre la lecture et le verrou', async () => {
    prisma.syntheseIA.findUnique.mockResolvedValue({ statut: 'Validee_Praticien', modele: MODELE_REDACTION_PRATICIEN });
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'enregistrer',
      synthese: brouillon,
    }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('Seul un brouillon (IA ou praticien) non encore validé peut être modifié.');
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  it.each([
    ['un brouillon IA validé', { statut: 'Brouillon_IA', modele: 'claude-test' }, { statut: 'Validee_Praticien', modele: 'claude-test' }],
    ['une synthèse supprimée', { statut: 'Brouillon_Praticien', modele: MODELE_REDACTION_PRATICIEN }, null],
  ])('refuse d’enregistrer %s entre la lecture et le verrou, avant le contrôle d’impression', async (_cas, lue, sousVerrou) => {
    prisma.syntheseIA.findFirst.mockResolvedValue({ ...ligneSynthese(), ...lue });
    prisma.syntheseIA.findUnique.mockResolvedValue(sousVerrou);
    prisma.documentMedecinImprime.findFirst.mockResolvedValue({ id: 'IMP_1' });
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'enregistrer',
      synthese: brouillon,
    }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('Seul un brouillon (IA ou praticien) non encore validé peut être modifié.');
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  it('refuse d’enregistrer une synthèse imprimée pour le médecin', async () => {
    prisma.documentMedecinImprime.findFirst.mockResolvedValue({ id: 'IMP_1' });
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'enregistrer',
      synthese: brouillon,
    }));
    expect(response.status).toBe(409);
    const corps = await response.json();
    expect(corps.reason).toBe('synthese_imprimee_pour_medecin');
    expect(corps.error).toContain('Impossible de modifier');
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  // VERSION OPTIMISTE (lot synthese-version-optimiste ; P3 de wn-reviewer sur
  // #2221, P3-2 sur #2226). Statut et modèle inchangés ne suffisent pas : un
  // « enregistrer » concurrent garde le brouillon brouillon.
  describe('version optimiste', () => {
    const CORPS: Record<string, Record<string, unknown>> = {
      enregistrer: { action: 'enregistrer', synthese: brouillon },
      valider: { action: 'valider' },
      annoter: { action: 'annoter', notes: 'Note.' },
      rejeter: { action: 'rejeter' },
      effacer: { action: 'effacer' },
    };

    it.each(Object.keys(CORPS))('refuse %s si la synthèse a été réécrite, même statut, entre la lecture et le verrou', async (action) => {
      prisma.syntheseIA.findUnique.mockResolvedValue({
        statut: 'Brouillon_Praticien',
        modele: MODELE_REDACTION_PRATICIEN,
        updatedAt: new Date('2026-07-25T10:06:00.000Z'),
      });
      const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', ...CORPS[action] }));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: MESSAGE_MODIFIEE, code: 'synthese_modifiee' });
      expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
      expect(prisma.auditSynthese.create).not.toHaveBeenCalled();
    });

    it.each(Object.keys(CORPS))('refuse %s sur une version d’écran périmée, avant tout verrou', async (action) => {
      const response = await PATCH(requete('PATCH', {
        idSynthese: 'SYN_MANUEL_1',
        ...CORPS[action],
        version: '2026-07-25T10:04:59.999Z',
      }));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: MESSAGE_MODIFIEE, code: 'synthese_modifiee' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
    });

    it.each(Object.keys(CORPS))('passe %s sur la version affichée, et rend la nouvelle version', async (action) => {
      prisma.syntheseIA.update.mockResolvedValue({ ...ligneSynthese(), updatedAt: new Date('2026-07-25T10:07:00.000Z') });
      const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', ...CORPS[action], version: VERSION_LUE }));
      expect(response.status).toBe(200);
      expect(prisma.syntheseIA.update).toHaveBeenCalledTimes(1);
      expect((await response.json()).updatedAt).toBe('2026-07-25T10:07:00.000Z');
    });

    it.each([['une chaîne qui n’est pas une date', 'hier'], ['un nombre', 42], ['un objet', {}]])('refuse une version qui est %s (400)', async (_cas, version) => {
      const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action: 'valider', version }));
      expect(response.status).toBe(400);
      expect(prisma.syntheseIA.findFirst).not.toHaveBeenCalled();
    });

    it('vider une synthèse disparue sous le verrou répond 409, pas une erreur technique', async () => {
      prisma.syntheseIA.findUnique.mockResolvedValue(null);
      const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action: 'effacer' }));
      expect(response.status).toBe(409);
      expect((await response.json()).code).toBe('synthese_modifiee');
      expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
    });

    it('un enregistrer dont le brouillon a été validé entre-temps porte aussi le code de rechargement', async () => {
      prisma.syntheseIA.findUnique.mockResolvedValue({ statut: 'Validee_Praticien', modele: MODELE_REDACTION_PRATICIEN, updatedAt: new Date() });
      const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', ...CORPS.enregistrer }));
      expect(response.status).toBe(409);
      expect((await response.json()).code).toBe('synthese_modifiee');
    });
  });
});

// [[D-513]] §5 et §11 : une synthèse suspecte ne se valide pas, quel que soit
// l'auteur ; une correction lève le blocage. Données entièrement fictives.
describe('validation — contrôle de contamination (D-513 §5)', () => {
  const TRACE = {
    blocBiologie: {
      texte: '## Résultats de biologie\nFerritine — 1 prélèvement.',
      formes: { valeursUnites: [{ valeur: '32', unite: 'µg/L' }], intervalles: ['30 - 400'] },
    },
    metadonneesPrompt: { versionSchema: 'synthese-json-v4' },
  };
  const JSON_IA = {
    resume_praticien: 'Résumé sans biologie.',
    axes_prioritaires: [],
    points_de_vigilance: [],
    questions_entretien: [],
    narratif_patient: 'Votre praticien a reçu votre bilan biologique du 12 mars 2026.',
    limites: 'À valider par le praticien.',
    resume_biologie_praticien: 'Ferritine le 2026-03-12 : 32 µg/L.',
    points_de_vigilance_biologie: [],
  };
  function ligneIA(patch: Record<string, unknown>, donneesEntree: unknown = TRACE) {
    return { ...ligneSynthese(), modele: 'claude-test', statut: 'Brouillon_IA', donneesEntree, syntheseJson: { ...JSON_IA, ...patch } };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.syntheseIA.update.mockResolvedValue(ligneSynthese());
    // « enregistrer » passe sous le verrou du dossier : ce bloc pose ses
    // propres mocks, sans hériter de ceux du bloc précédent (wn-reviewer).
    prisma.syntheseIA.findUnique.mockImplementation(async () => prisma.syntheseIA.findFirst.mock.results.at(-1)?.value);
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
    prisma.auditSynthese.create.mockResolvedValue({});
    prisma.documentMedecinImprime.findFirst.mockResolvedValue(null);
    journaliserAccesDossier.mockResolvedValue(undefined);
  });

  it('refuse de valider une synthèse dont `limites` porte un intervalle du bloc', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue(ligneIA({ limites: 'Intervalle 30 - 400 à relire.' }));
    const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action: 'valider' }));
    expect(response.status).toBe(409);
    const corps = await response.json();
    expect(corps.code).toBe('synthese_suspecte');
    expect(corps.error).not.toContain('30 - 400');
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  it('refuse une ancienne synthèse qui porte un bloc sous un schéma antérieur à v4', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue(ligneIA({}, { ...TRACE, metadonneesPrompt: { versionSchema: 'synthese-json-v3' } }));
    const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action: 'valider' }));
    expect(response.status).toBe(409);
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });

  it('valide une fois le champ corrigé : la restitution dans les champs dédiés est permise', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue(ligneIA({}));
    const response = await PATCH(requete('PATCH', { idSynthese: 'SYN_MANUEL_1', action: 'valider' }));
    expect(response.status).toBe(200);
    expect(prisma.syntheseIA.update).toHaveBeenCalled();
    // Le texte validé est celui qui vient d'être contrôlé, réécrit tel quel.
    expect(prisma.syntheseIA.update.mock.calls[0][0].data.syntheseJson).toEqual(JSON_IA);
  });

  it('enregistrer rend le verdict recalculé : suspect, puis levé après correction', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue(ligneIA({}));
    prisma.syntheseIA.update.mockImplementation(async ({ data }: { data: { syntheseJson: unknown } }) => ({
      ...ligneIA({}), syntheseJson: data.syntheseJson,
    }));
    const contamine = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1', action: 'enregistrer', synthese: { ...JSON_IA, limites: 'Intervalle 30 - 400.' },
    }));
    expect((await contamine.json()).motifSuspecte).toContain('limites');
    const corrige = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1', action: 'enregistrer', synthese: JSON_IA,
    }));
    expect((await corrige.json()).motifSuspecte).toBeNull();
  });
});
