import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, logger } = vi.hoisted(() => {
  const client = {
    cabinetInstrument: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      // NF-7 : la publication et l'édition des métadonnées sont des écritures gardées.
      updateMany: vi.fn(),
    },
    // Gel du contenu : le PATCH compte les assignations non verrouillées.
    assignation: { count: vi.fn() },
    // NF-7, lot 3 (P2-3) : la modification du contenu verrouille
    // la ligne, recompte et écrit dans une transaction — ici le client lui-même.
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((op: (tx: typeof client) => unknown) => op(client));
  // [[D-533]] : le journal du PATCH est observé, jamais émis.
  return { prisma: client, logger: { error: vi.fn() } };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({ logger }));
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));

import { Prisma } from '@/generated/prisma';
import { GET, PATCH, POST } from './route';

const DEFINITION_VALIDE = {
  instructions: 'Répondez spontanément.',
  sections: [
    {
      id: 'S1',
      questions: [
        {
          id: 'Q1',
          texte: 'Je dors bien.',
          type: 'likert',
          options: [
            { v: 0, l: 'Jamais' },
            { v: 1, l: 'Parfois' },
            { v: 2, l: 'Souvent' },
          ],
        },
        {
          id: 'Q2',
          texte: 'Je me réveille reposé(e).',
          type: 'likert',
          options: [
            { v: 0, l: 'Jamais' },
            { v: 1, l: 'Parfois' },
            { v: 2, l: 'Souvent' },
          ],
        },
      ],
    },
  ],
};

const SCORING_VALIDE = {
  type: 'sum',
  interpretation: [
    { min: 0, max: 2, label: 'Faible', color: 'success' },
    { min: 3, max: 4, label: 'Modéré', color: 'warning' },
  ],
};

const INSTRUMENT = {
  idInstrument: 'CAB_1',
  praticienEmail: 'praticien@wellneuro.fr',
  titre: 'Sommeil cabinet',
  categorie: 'Cabinet',
  description: null,
  definitionJson: DEFINITION_VALIDE,
  scoringJson: { ...SCORING_VALIDE, maxTotal: 4 },
  statutRelecture: 'brouillon',
  actif: true,
  updatedAt: new Date('2026-07-24T10:00:00Z'),
};

function postRequest(body: unknown) {
  return new Request('http://localhost/api/praticien/instruments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/praticien/instruments', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('instruments GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('liste les instruments du praticien avec nbQuestions et scoreMax', async () => {
    prisma.cabinetInstrument.findMany.mockResolvedValue([INSTRUMENT]);
    const res = await GET(new Request('http://localhost/api/praticien/instruments'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.instruments).toHaveLength(1);
    expect(json.instruments[0]).toMatchObject({
      idInstrument: 'CAB_1',
      titre: 'Sommeil cabinet',
      statutRelecture: 'brouillon',
      nbQuestions: 2,
      scoreMax: 4,
    });
    const where = prisma.cabinetInstrument.findMany.mock.calls[0][0].where;
    expect(where.praticienEmail.equals).toBe('praticien@wellneuro.fr');
    expect(where.actif).toBe(true);
  });

  it('détail par id — cloisonné au praticien en session', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue(INSTRUMENT);
    const res = await GET(new Request('http://localhost/api/praticien/instruments?id=CAB_1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.instrument.definition.sections).toHaveLength(1);
    expect(json.instrument.scoring.type).toBe('sum');
    const where = prisma.cabinetInstrument.findFirst.mock.calls[0][0].where;
    expect(where.praticienEmail.equals).toBe('praticien@wellneuro.fr');
  });
});

describe('instruments POST (création)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.cabinetInstrument.create.mockResolvedValue({});
    prisma.cabinetInstrument.findFirst.mockResolvedValue(null); // pas de doublon
  });

  it('crée un brouillon valide, scopé praticien, maxTotal dérivé', async () => {
    const res = await POST(
      postRequest({
        titre: 'Sommeil cabinet',
        categorie: 'Sommeil',
        definition: DEFINITION_VALIDE,
        scoring: SCORING_VALIDE,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, idInstrument: 'CAB_TEST_12345678' });
    const data = prisma.cabinetInstrument.create.mock.calls[0][0].data;
    expect(data.statutRelecture).toBe('brouillon');
    expect(data.praticienEmail).toBe('praticien@wellneuro.fr');
    expect(data.scoringJson.maxTotal).toBe(4);
  });

  it('refuse un scoring.type interdit avec des erreurs en français', async () => {
    const res = await POST(
      postRequest({
        titre: 'Sommeil cabinet',
        definition: DEFINITION_VALIDE,
        scoring: { ...SCORING_VALIDE, type: 'psqi' },
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.reason).toBe('invalid_payload');
    expect(json.erreurs.join(' ')).toContain('Type de scoring non pris en charge');
    expect(prisma.cabinetInstrument.create).not.toHaveBeenCalled();
  });

  it('refuse des bandes non contiguës', async () => {
    const res = await POST(
      postRequest({
        titre: 'Sommeil cabinet',
        definition: DEFINITION_VALIDE,
        scoring: {
          type: 'sum',
          interpretation: [
            { min: 0, max: 1, label: 'Faible', color: 'success' },
            { min: 3, max: 4, label: 'Modéré', color: 'warning' },
          ],
        },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).erreurs.join(' ')).toContain('contiguës');
    expect(prisma.cabinetInstrument.create).not.toHaveBeenCalled();
  });

  it('refuse (409) un titre déjà porté par un instrument actif du cabinet', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue({ idInstrument: 'CAB_EXISTANT' });
    const res = await POST(
      postRequest({
        titre: 'Sommeil cabinet',
        definition: DEFINITION_VALIDE,
        scoring: SCORING_VALIDE,
      }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('doublon_titre');
    expect(json.error).toContain('porte déjà ce titre');
    expect(prisma.cabinetInstrument.create).not.toHaveBeenCalled();
    // La détection ignore la casse : « PHQ-9 » et « phq-9 » sont le même titre.
    expect(prisma.cabinetInstrument.findFirst.mock.calls[0][0].where.titre).toEqual({
      equals: 'Sommeil cabinet',
      mode: 'insensitive',
    });
  });
});

describe('instruments PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.cabinetInstrument.findFirst.mockResolvedValue(INSTRUMENT);
    prisma.cabinetInstrument.update.mockResolvedValue({});
    prisma.cabinetInstrument.updateMany.mockResolvedValue({ count: 1 });
    prisma.assignation.count.mockResolvedValue(0); // aucun envoi en cours
  });

  it('publier sans relecture demandée : 409, statut inchangé', async () => {
    const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'publier' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('conflit_statut');
    expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
  });

  it('demander_relecture puis publier : le cycle complet aboutit à valide', async () => {
    const resRelecture = await PATCH(
      patchRequest({ idInstrument: 'CAB_1', action: 'demander_relecture' }),
    );
    expect(resRelecture.status).toBe(200);
    expect(prisma.cabinetInstrument.update.mock.calls[0][0].data.statutRelecture).toBe(
      'grille_a_relire',
    );

    prisma.cabinetInstrument.findFirst.mockResolvedValue({
      ...INSTRUMENT,
      statutRelecture: 'grille_a_relire',
    });
    const resPublication = await PATCH(
      patchRequest({ idInstrument: 'CAB_1', action: 'publier', poseQuestionSuicide: false }),
    );
    expect(resPublication.status).toBe(200);
    expect(prisma.cabinetInstrument.updateMany.mock.calls[0][0].data.statutRelecture).toBe('valide');
  });

  it('édition de la définition : repasse TOUJOURS en brouillon', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue({
      ...INSTRUMENT,
      statutRelecture: 'valide',
    });
    const res = await PATCH(
      patchRequest({
        idInstrument: 'CAB_1',
        definition: DEFINITION_VALIDE,
        scoring: SCORING_VALIDE,
      }),
    );
    expect(res.status).toBe(200);
    const data = prisma.cabinetInstrument.update.mock.calls[0][0].data;
    expect(data.statutRelecture).toBe('brouillon');
  });

  it('demander_relecture depuis un statut publié : 409, pas de dépublication silencieuse', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue({
      ...INSTRUMENT,
      statutRelecture: 'valide',
    });
    const res = await PATCH(
      patchRequest({ idInstrument: 'CAB_1', action: 'demander_relecture' }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('conflit_statut');
    expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
  });

  it('demander_relecture avec des envois en cours : 409, message chiffré', async () => {
    prisma.assignation.count.mockResolvedValue(2);
    const res = await PATCH(
      patchRequest({ idInstrument: 'CAB_1', action: 'demander_relecture' }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('envoi_en_cours');
    expect(json.error).toContain('2 envoi(s) en cours');
    expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
    // Le compte ne porte que sur les assignations NON verrouillées.
    const where = prisma.assignation.count.mock.calls[0][0].where;
    expect(where).toEqual({
      idQuestionnaire: 'CAB_1',
      statutReponses: { not: 'verrouille' },
    });
  });

  it('édition du contenu avec des envois en cours : 409, contenu gelé', async () => {
    prisma.assignation.count.mockResolvedValue(1);
    const res = await PATCH(
      patchRequest({
        idInstrument: 'CAB_1',
        definition: DEFINITION_VALIDE,
        scoring: SCORING_VALIDE,
      }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('envoi_en_cours');
    expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
  });

  it('édition des métadonnées seules avec des envois en cours : permise', async () => {
    prisma.assignation.count.mockResolvedValue(3);
    const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Titre corrigé' }));
    expect(res.status).toBe(200);
    // Le gel ne porte que sur le contenu : aucun comptage nécessaire ici.
    expect(prisma.assignation.count).not.toHaveBeenCalled();
    expect(prisma.cabinetInstrument.updateMany.mock.calls[0][0].data.titre).toBe('Titre corrigé');
  });

  it('édition du titre seul : le statut de relecture est conservé', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue({
      ...INSTRUMENT,
      statutRelecture: 'valide',
    });
    const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Nouveau titre' }));
    expect(res.status).toBe(200);
    const data = prisma.cabinetInstrument.updateMany.mock.calls[0][0].data;
    expect(data.titre).toBe('Nouveau titre');
    expect(data.statutRelecture).toBeUndefined();
  });

  it('cloisonnement : instrument d’un autre praticien introuvable, 404', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue(null);
    const res = await PATCH(patchRequest({ idInstrument: 'CAB_AUTRE', action: 'publier' }));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toBe('not_found');
    const where = prisma.cabinetInstrument.findFirst.mock.calls[0][0].where;
    expect(where.praticienEmail.equals).toBe('praticien@wellneuro.fr');
  });

  it('desactiver : actif passe à false', async () => {
    const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'desactiver' }));
    expect(res.status).toBe(200);
    expect(prisma.cabinetInstrument.update).toHaveBeenCalledWith({
      where: { idInstrument: 'CAB_1' },
      data: { actif: false },
    });
  });
});

// EVA — la voie cabinet, du brouillon à la publication, sans jamais classer
// (`D-088`). Le cycle `brouillon → grille_a_relire → valide` ne se contourne
// pas : ce qui change est ce qu'on relit, pas qu'on relise.
describe('instruments — EVA sans interprétation (D-088)', () => {
  const EVA_DEFINITION = {
    instructions: 'Placez le curseur là où vous vous situez aujourd’hui.',
    sections: [
      {
        id: 'S1',
        questions: [
          {
            id: 'EVA1',
            texte: 'Où en êtes-vous de votre fatigue aujourd’hui ?',
            type: 'number',
            min: 0,
            max: 10,
            unit: '/10',
          },
        ],
      },
    ],
  };
  const EVA_SCORING = { type: 'sum_no_interpretation' };
  const EVA = {
    ...INSTRUMENT,
    idInstrument: 'CAB_EVA',
    titre: 'EVA fatigue — cabinet',
    definitionJson: EVA_DEFINITION,
    scoringJson: { ...EVA_SCORING, maxTotal: 10 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.cabinetInstrument.create.mockResolvedValue({});
    prisma.cabinetInstrument.update.mockResolvedValue({});
    prisma.cabinetInstrument.updateMany.mockResolvedValue({ count: 1 });
    prisma.cabinetInstrument.findFirst.mockResolvedValue(null);
    prisma.assignation.count.mockResolvedValue(0);
  });

  it('création : brouillon accepté, maxTotal dérivé des bornes, aucune bande stockée', async () => {
    const res = await POST(
      postRequest({
        titre: 'EVA fatigue — cabinet',
        categorie: 'Pilotage',
        definition: EVA_DEFINITION,
        scoring: EVA_SCORING,
      }),
    );
    expect(res.status).toBe(200);
    const data = prisma.cabinetInstrument.create.mock.calls[0][0].data;
    expect(data.statutRelecture).toBe('brouillon');
    expect(data.scoringJson.type).toBe('sum_no_interpretation');
    expect(data.scoringJson.maxTotal).toBe(10);
    expect(data.scoringJson.interpretation ?? []).toEqual([]);
    // Aucun libellé interprétatif n'a été fabriqué au passage — ni « à
    // définir », ni couleur de sévérité.
    expect(JSON.stringify(data.scoringJson)).not.toContain('Grille à définir');
    expect(JSON.stringify(data.scoringJson)).not.toContain('warning');
  });

  it('création avec une bande : 400, rien n’entre en base', async () => {
    const res = await POST(
      postRequest({
        titre: 'EVA fatigue — cabinet',
        definition: EVA_DEFINITION,
        scoring: {
          ...EVA_SCORING,
          interpretation: [{ min: 0, max: 10, label: 'Fatigue élevée', color: 'danger' }],
        },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).erreurs.join(' ')).toContain('aucune bande n’est admise');
    expect(prisma.cabinetInstrument.create).not.toHaveBeenCalled();
  });

  it('cycle complet : demander_relecture puis publier aboutit à valide', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue(EVA);
    const resRelecture = await PATCH(
      patchRequest({ idInstrument: 'CAB_EVA', action: 'demander_relecture' }),
    );
    expect(resRelecture.status).toBe(200);
    expect(prisma.cabinetInstrument.update.mock.calls[0][0].data.statutRelecture).toBe(
      'grille_a_relire',
    );

    prisma.cabinetInstrument.findFirst.mockResolvedValue({
      ...EVA,
      statutRelecture: 'grille_a_relire',
    });
    const resPublication = await PATCH(
      patchRequest({ idInstrument: 'CAB_EVA', action: 'publier', poseQuestionSuicide: false }),
    );
    expect(resPublication.status).toBe(200);
    expect(prisma.cabinetInstrument.updateMany.mock.calls[0][0].data.statutRelecture).toBe('valide');
  });

  it('édition qui glisse une bande : 400, l’instrument publié n’est pas touché', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...EVA, statutRelecture: 'valide' });
    const res = await PATCH(
      patchRequest({
        idInstrument: 'CAB_EVA',
        definition: EVA_DEFINITION,
        scoring: {
          ...EVA_SCORING,
          interpretation: [{ min: 0, max: 10, label: 'Repère', color: 'warning' }],
        },
      }),
    );
    expect(res.status).toBe(400);
    expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
  });

  it('détail : la grille servie à l’écran ne porte aucune bande', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue(EVA);
    const res = await GET(new Request('http://localhost/api/praticien/instruments?id=CAB_EVA'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.instrument.scoring.type).toBe('sum_no_interpretation');
    expect(json.instrument.scoring.interpretation ?? []).toEqual([]);
    expect(json.instrument.definition.sections[0].questions[0]).toMatchObject({
      type: 'number',
      min: 0,
      max: 10,
      unit: '/10',
    });
  });
});

// ── NF-7 ([[D-303]] §2 et §4, [[D-493]] §3) ─────────────────────────────────
// La publication exige la déclaration « question sur le suicide », et « oui »
// exige une désignation vérifiée contre la définition. Une modification des
// questions efface la déclaration. Sans drapeau depuis [[D-528]].
describe('instruments — déclaration « question sur le suicide » (NF-7)', () => {
  const A_RELIRE = { ...INSTRUMENT, statutRelecture: 'grille_a_relire' };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.cabinetInstrument.findFirst.mockResolvedValue(A_RELIRE);
    prisma.cabinetInstrument.update.mockResolvedValue({});
    prisma.cabinetInstrument.updateMany.mockResolvedValue({ count: 1 });
    prisma.assignation.count.mockResolvedValue(0);
  });

  function publier(declaration: Record<string, unknown> = {}) {
    return PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'publier', ...declaration }));
  }

  describe('publication et modification', () => {

    // [[D-303]] §4 : aucun instrument `valide` sans déclaration.
    for (const [cas, declaration] of [
      ['sans réponse', {}],
      ['réponse nulle', { poseQuestionSuicide: null }],
      ['réponse en chaîne', { poseQuestionSuicide: 'oui' }],
    ] as const) {
      it(`publier ${cas} : 400, rien n’est écrit`, async () => {
        const res = await publier(declaration);
        expect(res.status).toBe(400);
        expect((await res.json()).reason).toBe('invalid_payload');
        expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
        expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
      });
    }

    for (const [cas, designation] of [
      ['sans désignation', {}],
      ['désignation vide', { questionSuicideId: '', questionSuicideOptionNon: 0 }],
      ['désignation blanche', { questionSuicideId: '  ', questionSuicideOptionNon: 0 }],
      ['question inconnue', { questionSuicideId: 'Q9', questionSuicideOptionNon: 0 }],
      ['valeur « non » absente', { questionSuicideId: 'Q1' }],
      ['valeur « non » hors des options', { questionSuicideId: 'Q1', questionSuicideOptionNon: 7 }],
      ['valeur « non » en chaîne', { questionSuicideId: 'Q1', questionSuicideOptionNon: '0' }],
    ] as const) {
      it(`« oui » ${cas} : 400, rien n’est écrit`, async () => {
        const res = await publier({ poseQuestionSuicide: true, ...designation });
        expect(res.status).toBe(400);
        expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
        expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
      });
    }

    it('« oui » désigné : publié, déclaration et désignation écrites avec le statut', async () => {
      const res = await publier({ poseQuestionSuicide: true, questionSuicideId: 'Q2', questionSuicideOptionNon: 0 });
      expect(res.status).toBe(200);
      expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
      expect(prisma.cabinetInstrument.updateMany.mock.calls[0][0].data).toEqual({
        statutRelecture: 'valide',
        poseQuestionSuicide: true,
        questionSuicideId: 'Q2',
        questionSuicideOptionNon: 0,
      });
    });

    it('« non » : publié, toute désignation envoyée est effacée (CHECK de cohérence)', async () => {
      const res = await publier({ poseQuestionSuicide: false, questionSuicideId: 'Q1', questionSuicideOptionNon: 0 });
      expect(res.status).toBe(200);
      expect(prisma.cabinetInstrument.updateMany.mock.calls[0][0].data).toEqual({
        statutRelecture: 'valide',
        poseQuestionSuicide: false,
        questionSuicideId: null,
        questionSuicideOptionNon: null,
      });
    });

    // Revue CodeRabbit de #2010 (P1) : la désignation est vérifiée contre la
    // définition lue ; l'écriture n'a lieu que si l'instrument n'a pas bougé.
    it('publication gardée : l’écriture exige le statut et la date de mise à jour relus', async () => {
      await publier({ poseQuestionSuicide: false });
      expect(prisma.cabinetInstrument.updateMany.mock.calls[0][0].where).toEqual({
        idInstrument: 'CAB_1',
        statutRelecture: 'grille_a_relire',
        updatedAt: A_RELIRE.updatedAt,
      });
    });

    it('instrument modifié entre la lecture et l’écriture : 409, rien n’est publié', async () => {
      prisma.cabinetInstrument.updateMany.mockResolvedValue({ count: 0 });
      const res = await publier({ poseQuestionSuicide: true, questionSuicideId: 'Q1', questionSuicideOptionNon: 0 });
      expect(res.status).toBe(409);
      expect((await res.json()).reason).toBe('conflit_statut');
      expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
    });

    it('la désignation se vérifie contre la définition RELUE en base, pas contre le corps', async () => {
      const res = await publier({
        poseQuestionSuicide: true,
        questionSuicideId: 'QX',
        questionSuicideOptionNon: 0,
        definition: {
          sections: [{ id: 'S', questions: [{ id: 'QX', texte: 'x', type: 'likert', options: [{ v: 0, l: 'Non' }, { v: 1, l: 'Oui' }] }] }],
        },
      });
      expect(res.status).toBe(400);
      expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
      expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
    });

    it('une saisie chiffrée ne se désigne pas : 400', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue({
        ...A_RELIRE,
        definitionJson: { sections: [{ id: 'S', questions: [{ id: 'N1', texte: 'Douleur', type: 'number', min: 0, max: 10 }] }] },
      });
      const res = await publier({ poseQuestionSuicide: true, questionSuicideId: 'N1', questionSuicideOptionNon: 0 });
      expect(res.status).toBe(400);
      expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
      expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
    });

    it('modifier les questions efface la déclaration et repasse en brouillon ([[D-303]] §2)', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue({
        ...INSTRUMENT,
        statutRelecture: 'valide',
        poseQuestionSuicide: true,
        questionSuicideId: 'Q1',
        questionSuicideOptionNon: 0,
      });
      await PATCH(patchRequest({ idInstrument: 'CAB_1', definition: DEFINITION_VALIDE }));
      expect(prisma.cabinetInstrument.update.mock.calls[0][0].data).toMatchObject({
        statutRelecture: 'brouillon',
        poseQuestionSuicide: null,
        questionSuicideId: null,
        questionSuicideOptionNon: null,
      });
    });

    it('modifier la grille seule l’efface aussi', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'valide', poseQuestionSuicide: false });
      await PATCH(patchRequest({ idInstrument: 'CAB_1', scoring: SCORING_VALIDE }));
      expect(prisma.cabinetInstrument.update.mock.calls[0][0].data.poseQuestionSuicide).toBeNull();
    });

    it('modifier le titre seul garde la déclaration, par une écriture gardée sur la date relue (20261114-1217-a)', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'valide', poseQuestionSuicide: true });
      await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Nouveau titre' }));
      expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
      const appel = prisma.cabinetInstrument.updateMany.mock.calls[0][0];
      expect(appel.where).toEqual({ idInstrument: 'CAB_1', updatedAt: INSTRUMENT.updatedAt });
      expect('poseQuestionSuicide' in appel.data).toBe(false);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // Passe Codex du lot 3, P1-1 : l'édition des métadonnées échappe au
    // verrou et au recomptage ; elle ne doit donc rien réécrire du contenu.
    // Entrelacement rejoué sur une ligne en mémoire partagée par les deux
    // séquences.
    it('titre modifié pendant une modification, une publication et un envoi : l’ancien contenu n’est pas réinstallé', async () => {
      const V2 = { ...DEFINITION_VALIDE, instructions: 'Version 2.' };
      const GRILLE_V2 = { ...SCORING_VALIDE, maxTotal: 4, version: 2 };
      const base: Record<string, unknown> = {
        ...INSTRUMENT,
        statutRelecture: 'valide',
        poseQuestionSuicide: true,
        questionSuicideId: 'Q1',
        questionSuicideOptionNon: 0,
      };
      // 1. Le PATCH du titre lit la V1 déclarée « oui », puis attend.
      prisma.cabinetInstrument.findFirst.mockResolvedValueOnce({ ...base });
      prisma.cabinetInstrument.updateMany.mockImplementationOnce(async ({ where, data }: {
        where: { updatedAt: Date };
        data: Record<string, unknown>;
      }) => {
        // 2. Entre-temps : V2, publiée avec « non », puis un envoi commité.
        Object.assign(base, {
          definitionJson: V2,
          scoringJson: GRILLE_V2,
          statutRelecture: 'valide',
          poseQuestionSuicide: false,
          questionSuicideId: null,
          questionSuicideOptionNon: null,
          updatedAt: new Date('2026-07-24T11:00:00Z'),
        });
        prisma.assignation.count.mockResolvedValue(1);
        // 3. Le PATCH reprend : son écriture est gardée sur la date relue
        // (20261114-1217-a), la ligne a bougé, rien n'est écrit.
        if ((base.updatedAt as Date).getTime() !== where.updatedAt.getTime()) return { count: 0 };
        Object.assign(base, data);
        return { count: 1 };
      });
      const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Nouveau titre' }));
      expect(res.status).toBe(409);
      expect((await res.json()).reason).toBe('conflit_statut');
      // Ce que l'écriture aurait porté : les seules métadonnées.
      expect(Object.keys(prisma.cabinetInstrument.updateMany.mock.calls[0][0].data).sort()).toEqual([
        'categorie',
        'description',
        'titre',
      ]);
      expect(base.titre).toBe(INSTRUMENT.titre);
      expect(base.definitionJson).toBe(V2);
      expect(base.scoringJson).toBe(GRILLE_V2);
      expect(base.statutRelecture).toBe('valide');
      expect(base.poseQuestionSuicide).toBe(false);
    });

    // Lot 3, P2-3 (revue `wn-reviewer`, P1) : le gel du contenu se juge sous
    // le verrou de la ligne, en conflit avec le `FOR SHARE` de l'envoi.
    it('modifier les questions : verrou FOR UPDATE, envois recomptés sous verrou, puis écriture', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'valide', poseQuestionSuicide: false });
      const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', definition: DEFINITION_VALIDE }));
      expect(res.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const sql = (prisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
      expect(sql).toMatch(/FROM cabinet_instruments WHERE id_instrument = \? FOR UPDATE/);
      expect(prisma.$queryRaw.mock.calls[0][1]).toBe('CAB_1');
      // Le comptage hors verrou, puis celui sous verrou.
      expect(prisma.assignation.count).toHaveBeenCalledTimes(2);
      const ordreVerrou = prisma.$queryRaw.mock.invocationCallOrder[0];
      expect(prisma.assignation.count.mock.invocationCallOrder[1]).toBeGreaterThan(ordreVerrou);
      expect(prisma.cabinetInstrument.update.mock.invocationCallOrder[0]).toBeGreaterThan(
        prisma.assignation.count.mock.invocationCallOrder[1],
      );
    });

    it('un envoi commité entre le premier comptage et le verrou : 409, rien n’est écrit', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'valide', poseQuestionSuicide: false });
      prisma.assignation.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', definition: DEFINITION_VALIDE }));
      expect(res.status).toBe(409);
      expect((await res.json()).reason).toBe('envoi_en_cours');
      expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
    });
  });
});

// ── NF-7, lot 3 — P2-1 : le geste « Déclarer » est retiré ──────────────────
// Le CHECK `cabinet_instruments_valide_declare` (#2156) rend son état d'entrée
// impossible ; l'action et le marqueur de liste sont retirés avec le drapeau
// (réponse 20261116-0826-a, [[D-528]]).
describe('instruments — geste « Déclarer » retiré (NF-7, P2-1)', () => {
  const PUBLIE = {
    ...INSTRUMENT,
    statutRelecture: 'valide',
    poseQuestionSuicide: false,
    questionSuicideId: null,
    questionSuicideOptionNon: null,
    createdAt: new Date('2026-07-24T09:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.cabinetInstrument.findFirst.mockResolvedValue(PUBLIE);
    prisma.cabinetInstrument.findMany.mockResolvedValue([PUBLIE]);
    prisma.cabinetInstrument.updateMany.mockResolvedValue({ count: 1 });
  });

  it('« declarer » est une action inconnue : 400, rien n’est écrit', async () => {
    const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'declarer', poseQuestionSuicide: false }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Action inconnue.');
    expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
    expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
  });

  it('la liste ne porte pas `declarationRequise`, ni le détail `declarationSuicideRequise`', async () => {
    const liste = await (await GET(new Request('http://localhost/api/praticien/instruments'))).json();
    expect('declarationRequise' in liste.instruments[0]).toBe(false);
    const detail = await (await GET(new Request('http://localhost/api/praticien/instruments?id=CAB_1'))).json();
    expect('declarationSuicideRequise' in detail.instrument).toBe(false);
  });
});

// ── Réponse 20261114-1217-a : les libellés que la lettre citera ─────────────
// Sous « oui », le nom de l'instrument, l'énoncé de la question désignée et
// les libellés de ses options passent la garde du rendu médecin, à la
// publication et à la modification d'un instrument publié. Le refus nomme le champ. L'identité de la garde avec
// celle de la lettre est tenue par `lib/securite/libellesCitables.guard.test.ts`.
describe('instruments — libellés citables par la lettre (20261114-1217-a)', () => {
  const OUI = { poseQuestionSuicide: true, questionSuicideId: 'Q1', questionSuicideOptionNon: 0 };
  const NON = { poseQuestionSuicide: false };

  function definitionAvec(q1: { texte?: string; options?: { v: number; l: string }[] }) {
    const [section] = DEFINITION_VALIDE.sections;
    const [premiere, ...autres] = section.questions;
    return { ...DEFINITION_VALIDE, sections: [{ ...section, questions: [{ ...premiere, ...q1 }, ...autres] }] };
  }

  const MOTIF_NOM =
    'Le nom de l’instrument contient un terme de prescription, que la lettre d’adressage au médecin refuse : reformulez-le.';
  const MOTIF_ENONCE =
    'L’énoncé de la question désignée contient un terme de prescription, que la lettre d’adressage au médecin refuse : reformulez-le.';
  const motifOption = (l: string) =>
    `La réponse « ${l} » de la question désignée contient un terme de prescription, que la lettre d’adressage au médecin refuse : reformulez-la.`;

  const CAS_FAUTIFS: [string, Record<string, unknown>, string[]][] = [
    ['le nom', { titre: 'Ordonnance du sommeil' }, [MOTIF_NOM]],
    ['l’énoncé', { definitionJson: definitionAvec({ texte: 'Posologie de votre sommeil ?' }) }, [MOTIF_ENONCE]],
    [
      'une option',
      { definitionJson: definitionAvec({ options: [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Selon le dosage' }, { v: 2, l: 'Souvent' }] }) },
      [motifOption('Selon le dosage')],
    ],
    [
      'l’option « non »',
      { definitionJson: definitionAvec({ options: [{ v: 0, l: 'Sans prescription' }, { v: 1, l: 'Parfois' }, { v: 2, l: 'Souvent' }] }) },
      [motifOption('Sans prescription')],
    ],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.cabinetInstrument.update.mockResolvedValue({});
    prisma.cabinetInstrument.updateMany.mockResolvedValue({ count: 1 });
    prisma.assignation.count.mockResolvedValue(0);
  });

  describe('les gestes', () => {
    describe('publier', () => {
      for (const [champ, surcharge, motifs] of CAS_FAUTIFS) {
        it(`« oui », ${champ} porte un terme refusé : 400, le champ est nommé, rien n’est écrit`, async () => {
          prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'grille_a_relire', ...surcharge });
          const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'publier', ...OUI }));
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.reason).toBe('invalid_payload');
          expect(json.erreurs).toEqual(motifs);
          expect(json.error).toBe(motifs.join(' '));
          expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
          expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
        });
      }

      it('« oui », plusieurs champs fautifs : un motif par champ', async () => {
        prisma.cabinetInstrument.findFirst.mockResolvedValue({
          ...INSTRUMENT,
          statutRelecture: 'grille_a_relire',
          titre: 'Ordonnance',
          definitionJson: definitionAvec({ texte: 'Dosage ?' }),
        });
        const json = await (await PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'publier', ...OUI }))).json();
        expect(json.erreurs).toEqual([MOTIF_NOM, MOTIF_ENONCE]);
      });

      it('« oui », libellés propres : publié', async () => {
        prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'grille_a_relire' });
        const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'publier', ...OUI }));
        expect(res.status).toBe(200);
        expect(prisma.cabinetInstrument.updateMany).toHaveBeenCalledTimes(1);
      });

      it('« non » : rien n’est cité, rien n’est jugé — publié malgré le terme', async () => {
        prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'grille_a_relire', titre: 'Ordonnance du sommeil' });
        const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'publier', ...NON }));
        expect(res.status).toBe(200);
      });

      it('une question non désignée n’est pas jugée', async () => {
        const [section] = DEFINITION_VALIDE.sections;
        const definition = {
          ...DEFINITION_VALIDE,
          sections: [{ ...section, questions: [section.questions[0], { ...section.questions[1], texte: 'Une ordonnance ?' }] }],
        };
        prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'grille_a_relire', definitionJson: definition });
        const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'publier', ...OUI }));
        expect(res.status).toBe(200);
      });
    });

    describe('modifier un instrument publié', () => {
      const PUBLIE_OUI = { ...INSTRUMENT, statutRelecture: 'valide', ...OUI };

      it('déclaré « oui », nom modifié vers un terme refusé : 400, le champ est nommé, rien n’est écrit', async () => {
        prisma.cabinetInstrument.findFirst.mockResolvedValue(PUBLIE_OUI);
        const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Ordonnance du sommeil' }));
        expect(res.status).toBe(400);
        expect((await res.json()).erreurs).toEqual([MOTIF_NOM]);
        expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
        expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
      });

      it('déclaré « oui », description seule modifiée sur un énoncé fautif déjà publié : refusé, l’énoncé est nommé', async () => {
        prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...PUBLIE_OUI, definitionJson: definitionAvec({ texte: 'Posologie ?' }) });
        const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', description: 'Nouvelle description' }));
        expect(res.status).toBe(400);
        expect((await res.json()).erreurs).toEqual([MOTIF_ENONCE]);
      });

      it('déclaré « oui », nom propre : écrit, gardé sur la date relue', async () => {
        prisma.cabinetInstrument.findFirst.mockResolvedValue(PUBLIE_OUI);
        const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Sommeil, version 2' }));
        expect(res.status).toBe(200);
        expect(prisma.cabinetInstrument.updateMany.mock.calls[0][0]).toMatchObject({
          where: { idInstrument: 'CAB_1', updatedAt: INSTRUMENT.updatedAt },
          data: { titre: 'Sommeil, version 2' },
        });
      });

      it('déclaré « oui », instrument modifié entre la lecture et l’écriture : 409, rien n’est écrit', async () => {
        prisma.cabinetInstrument.findFirst.mockResolvedValue(PUBLIE_OUI);
        prisma.cabinetInstrument.updateMany.mockResolvedValue({ count: 0 });
        const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Sommeil, version 2' }));
        expect(res.status).toBe(409);
        expect((await res.json()).reason).toBe('conflit_statut');
      });

      // La course que l'écriture gardée ferme : la garde a jugé le nom sur un
      // instrument non déclaré ; une déclaration « oui » concurrente touche
      // `updatedAt`, et le nom non jugé n'est pas écrit.
      it('non déclaré à la lecture, déclaré « oui » avant l’écriture : 409, le nom non jugé n’est pas écrit', async () => {
        const ligne: Record<string, unknown> = { ...INSTRUMENT, statutRelecture: 'valide', poseQuestionSuicide: null };
        prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...ligne });
        prisma.cabinetInstrument.updateMany.mockImplementationOnce(async ({ where, data }: {
          where: { updatedAt: Date };
          data: Record<string, unknown>;
        }) => {
          Object.assign(ligne, OUI, { updatedAt: new Date('2026-07-24T11:00:00Z') });
          if ((ligne.updatedAt as Date).getTime() !== where.updatedAt.getTime()) return { count: 0 };
          Object.assign(ligne, data);
          return { count: 1 };
        });
        const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Ordonnance du sommeil' }));
        expect(res.status).toBe(409);
        expect(ligne.titre).toBe(INSTRUMENT.titre);
      });

      it('déclaré « non » : le nom n’est pas cité, pas jugé', async () => {
        prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'valide', ...NON });
        const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Ordonnance du sommeil' }));
        expect(res.status).toBe(200);
      });

      it('questions modifiées : la déclaration est effacée, rien n’est jugé ici — la publication suivante repasse par la garde', async () => {
        prisma.cabinetInstrument.findFirst.mockResolvedValue(PUBLIE_OUI);
        const res = await PATCH(
          patchRequest({ idInstrument: 'CAB_1', titre: 'Ordonnance du sommeil', definition: DEFINITION_VALIDE }),
        );
        expect(res.status).toBe(200);
        expect(prisma.cabinetInstrument.update.mock.calls[0][0].data).toMatchObject({
          statutRelecture: 'brouillon',
          poseQuestionSuicide: null,
        });
      });
    });
  });
});

// [[D-533]] (amende [[D-528]] §3) : une erreur technique du PATCH se
// journalise, et la réponse reste le 500 « Erreur inattendue. ». Le journal
// ne porte que le code d'événement, le code Prisma et le nom de la
// contrainte. Les erreurs sont façonnées comme les rend l'adaptateur pg :
// `meta.driverAdapterError.cause` porte le message Postgres et le `detail`,
// qui recopie la ligne refusée entière.
describe('instruments PATCH — journal d’une erreur technique (D-533)', () => {
  const VALEUR_DE_LIGNE = 'VALEUR_DE_LIGNE_SENTINELLE';
  const DETAIL = `Failing row contains (CAB_1, praticien@wellneuro.fr, ${VALEUR_DE_LIGNE}, {"type":"sum","interpretation":[{"label":"Faible"}]}, valide, null).`;

  // `@prisma/adapter-pg` 7.8 : `originalCode` et `originalMessage` sur toute
  // erreur du pilote ; un 23514 tombe dans la branche `postgres` (avec
  // `detail`, la ligne refusée), un 23505 / 23503 dans leur `kind` propre.
  function erreurPg(code: string, sqlstate: string, messagePg: string, kind: Record<string, unknown>) {
    const cause = { originalCode: sqlstate, originalMessage: messagePg, ...kind };
    return new Prisma.PrismaClientKnownRequestError(
      `Database error. Code: \`${sqlstate}\`. Message: \`${messagePg}\` ${VALEUR_DE_LIGNE}`,
      { code, clientVersion: '7.8.0', meta: { driverAdapterError: { name: 'DriverAdapterError', cause } } },
    );
  }

  const CHECK = erreurPg(
    'P2039',
    '23514',
    'new row for relation "cabinet_instruments" violates check constraint "cabinet_instruments_valide_declare"',
    { kind: 'postgres', code: '23514', severity: 'ERROR', message: 'violation', detail: DETAIL },
  );
  const UNIQUE = erreurPg('P2002', '23505', 'duplicate key value violates unique constraint "cabinet_instruments_pkey"', {
    kind: 'UniqueConstraintViolation',
    constraint: { fields: ['id_instrument'] },
  });
  const CLE_ETRANGERE = erreurPg(
    'P2003',
    '23503',
    'insert or update on table "cabinet_instruments" violates foreign key constraint "cabinet_instruments_fk"',
    { kind: 'ForeignKeyConstraintViolation', constraint: { index: 'cabinet_instruments_fk' } },
  );

  const CHAMPS_PERMIS = ['context', 'domain', 'event', 'message', 'metadata'];

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.cabinetInstrument.findFirst.mockResolvedValue(INSTRUMENT);
    prisma.assignation.count.mockResolvedValue(0);
  });

  async function patchEnEchec(erreur: unknown) {
    prisma.cabinetInstrument.updateMany.mockRejectedValueOnce(erreur);
    return PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Sommeil, version 2' }));
  }

  async function attendre500(res: Response) {
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, reason: 'exception', error: 'Erreur inattendue.' });
  }

  it('violation du CHECK « valide ⇒ déclaré » : 500 inchangé, code d’événement propre, seuls les champs permis', async () => {
    await attendre500(await patchEnEchec(CHECK));

    expect(logger.error).toHaveBeenCalledTimes(1);
    const entree = logger.error.mock.calls[0][0];
    expect(Object.keys(entree).sort()).toEqual(CHAMPS_PERMIS);
    expect(entree.event).toBe('PRATICIEN.INSTRUMENTS_CABINET.CHECK_VALIDE_DECLARE_VIOLE');
    expect(entree.domain).toBe('PRATICIEN');
    expect(entree.metadata).toEqual({ codePrisma: 'P2039', contrainte: 'cabinet_instruments_valide_declare' });
    expect(entree.context.statusCode).toBe(500);
  });

  it.each([
    ['P2002', UNIQUE, 'cabinet_instruments_pkey'],
    ['P2003', CLE_ETRANGERE, 'cabinet_instruments_fk'],
  ])('%s : 500 inchangé, code d’événement générique, code Prisma et contrainte seuls', async (code, erreur, contrainte) => {
    await attendre500(await patchEnEchec(erreur));

    const entree = logger.error.mock.calls[0][0];
    expect(Object.keys(entree).sort()).toEqual(CHAMPS_PERMIS);
    expect(entree.event).toBe('PRATICIEN.INSTRUMENTS_CABINET.PATCH_ECHEC');
    expect(entree.metadata).toEqual({ codePrisma: code, contrainte });
  });

  it('aucune valeur de ligne, aucun message ni objet d’erreur n’atteint le journal', async () => {
    for (const erreur of [CHECK, UNIQUE, CLE_ETRANGERE]) {
      await attendre500(await patchEnEchec(erreur));
    }
    expect(logger.error).toHaveBeenCalledTimes(3);
    const journal = JSON.stringify(logger.error.mock.calls);
    for (const interdit of [VALEUR_DE_LIGNE, 'Failing row', 'praticien@wellneuro.fr', 'Faible', 'Sommeil', 'violates', 'Database error', '23514', 'driverAdapterError']) {
      expect(journal).not.toContain(interdit);
    }
    for (const [entree] of logger.error.mock.calls) {
      expect(entree).not.toHaveProperty('error');
    }
  });

  // La ligne réellement émise, par le vrai logger : `sanitizeLogData` masque
  // en `[id]` un identifiant de 24 caractères ou plus — d'où le code
  // d'événement propre à la violation du CHECK, qui la nomme sans lui.
  it('ligne émise par le vrai logger : le code d’événement nomme la violation, aucune donnée de ligne', async () => {
    const { logger: vrai } = await vi.importActual<typeof import('@/lib/observability/logger')>('@/lib/observability/logger');
    logger.error.mockImplementationOnce((entree: Parameters<typeof vrai.error>[0]) => vrai.error(entree));
    const sortie = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await attendre500(await patchEnEchec(CHECK));
      expect(sortie).toHaveBeenCalledTimes(1);
      const ligne = String(sortie.mock.calls[0][0]);
      const emise = JSON.parse(ligne);
      expect(emise.event).toBe('PRATICIEN.INSTRUMENTS_CABINET.CHECK_VALIDE_DECLARE_VIOLE');
      expect(emise.metadata).toEqual({ codePrisma: 'P2039', contrainte: '[id]' });
      expect(emise.error).toBeUndefined();
      for (const interdit of [VALEUR_DE_LIGNE, 'Failing row', 'praticien@wellneuro.fr', 'Faible', 'violates']) {
        expect(ligne).not.toContain(interdit);
      }
    } finally {
      sortie.mockRestore();
    }
  });

  it('une erreur qui n’est pas de Prisma : 500 inchangé, ni code ni contrainte', async () => {
    await attendre500(await patchEnEchec(new TypeError(`lecture impossible ${VALEUR_DE_LIGNE}`)));

    const entree = logger.error.mock.calls[0][0];
    expect(entree.event).toBe('PRATICIEN.INSTRUMENTS_CABINET.PATCH_ECHEC');
    expect(entree.metadata).toEqual({ codePrisma: null, contrainte: null });
    expect(JSON.stringify(entree)).not.toContain(VALEUR_DE_LIGNE);
  });

  it('un journal en panne ne change pas la réponse', async () => {
    logger.error.mockImplementationOnce(() => {
      throw new Error('journal indisponible');
    });
    await attendre500(await patchEnEchec(CHECK));
  });

  it('le 409 de l’écriture gardée reste un 409, et rien n’est journalisé', async () => {
    prisma.cabinetInstrument.updateMany.mockResolvedValueOnce({ count: 0 });
    const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Sommeil, version 2' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('conflit_statut');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
