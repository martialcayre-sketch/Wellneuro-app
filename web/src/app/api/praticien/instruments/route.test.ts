import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => {
  const client = {
    cabinetInstrument: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      // NF-7, drapeau allumé : la publication est une écriture gardée.
      updateMany: vi.fn(),
    },
    // Gel du contenu : le PATCH compte les assignations non verrouillées.
    assignation: { count: vi.fn() },
    // NF-7, lot 3 (P2-3) : drapeau allumé, la modification du contenu verrouille
    // la ligne, recompte et écrit dans une transaction — ici le client lui-même.
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((op: (tx: typeof client) => unknown) => op(client));
  return { prisma: client };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));

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
    const resPublication = await PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'publier' }));
    expect(resPublication.status).toBe(200);
    expect(prisma.cabinetInstrument.update.mock.calls[1][0].data.statutRelecture).toBe('valide');
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
    expect(prisma.cabinetInstrument.update.mock.calls[0][0].data.titre).toBe('Titre corrigé');
  });

  it('édition du titre seul : le statut de relecture est conservé', async () => {
    prisma.cabinetInstrument.findFirst.mockResolvedValue({
      ...INSTRUMENT,
      statutRelecture: 'valide',
    });
    const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Nouveau titre' }));
    expect(res.status).toBe(200);
    const data = prisma.cabinetInstrument.update.mock.calls[0][0].data;
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
    const resPublication = await PATCH(patchRequest({ idInstrument: 'CAB_EVA', action: 'publier' }));
    expect(resPublication.status).toBe(200);
    expect(prisma.cabinetInstrument.update.mock.calls[1][0].data.statutRelecture).toBe('valide');
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
// Drapeau `WN_ENABLE_DECLARATION_SUICIDE_CAB` allumé : la publication exige la
// déclaration « question sur le suicide », et « oui » exige une désignation
// vérifiée contre la définition. Une modification des questions efface la
// déclaration. Drapeau éteint : la route d'avant NF-7, à l'identique.
describe('instruments — déclaration « question sur le suicide » (NF-7)', () => {
  const A_RELIRE = { ...INSTRUMENT, statutRelecture: 'grille_a_relire' };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
    prisma.cabinetInstrument.findFirst.mockResolvedValue(A_RELIRE);
    prisma.cabinetInstrument.update.mockResolvedValue({});
    prisma.cabinetInstrument.updateMany.mockResolvedValue({ count: 1 });
    prisma.assignation.count.mockResolvedValue(0);
  });

  afterEach(() => {
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
  });

  function publier(declaration: Record<string, unknown> = {}) {
    return PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'publier', ...declaration }));
  }

  describe('drapeau éteint : rien ne change', () => {
    it('publier sans déclaration : 200, la donnée écrite est exactement celle d’avant NF-7', async () => {
      const res = await publier();
      expect(res.status).toBe(200);
      expect(prisma.cabinetInstrument.update.mock.calls[0][0].data).toEqual({ statutRelecture: 'valide' });
      expect(prisma.cabinetInstrument.update.mock.calls[0][0].where).toEqual({ idInstrument: 'CAB_1' });
      expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
    });

    it('une déclaration envoyée quand même est ignorée', async () => {
      await publier({ poseQuestionSuicide: true, questionSuicideId: 'Q1', questionSuicideOptionNon: 0 });
      expect(prisma.cabinetInstrument.update.mock.calls[0][0].data).toEqual({ statutRelecture: 'valide' });
    });

    it('modifier les questions n’efface rien, et s’écrit sans transaction ni verrou, comme avant', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'valide' });
      await PATCH(patchRequest({ idInstrument: 'CAB_1', definition: DEFINITION_VALIDE }));
      expect('poseQuestionSuicide' in prisma.cabinetInstrument.update.mock.calls[0][0].data).toBe(false);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('modifier le titre seul réécrit la définition et la grille lues, comme avant', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'valide' });
      await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Nouveau titre' }));
      const data = prisma.cabinetInstrument.update.mock.calls[0][0].data;
      expect(data.definitionJson).toEqual(DEFINITION_VALIDE);
      expect(data.scoringJson).toEqual({ ...SCORING_VALIDE, maxTotal: 4 });
    });

    it('le détail ne demande pas la déclaration', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue(INSTRUMENT);
      const json = await (await GET(new Request('http://localhost/api/praticien/instruments?id=CAB_1'))).json();
      expect('declarationSuicideRequise' in json.instrument).toBe(false);
    });
  });

  describe('drapeau allumé', () => {
    beforeEach(() => {
      process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    });

    it('le détail annonce la déclaration requise', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue(INSTRUMENT);
      const json = await (await GET(new Request('http://localhost/api/praticien/instruments?id=CAB_1'))).json();
      expect(json.instrument.declarationSuicideRequise).toBe(true);
    });

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

    it('modifier le titre seul garde la déclaration', async () => {
      prisma.cabinetInstrument.findFirst.mockResolvedValue({ ...INSTRUMENT, statutRelecture: 'valide', poseQuestionSuicide: true });
      await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Nouveau titre' }));
      expect('poseQuestionSuicide' in prisma.cabinetInstrument.update.mock.calls[0][0].data).toBe(false);
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
      prisma.cabinetInstrument.update.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => {
        // 2. Entre-temps : V2, publiée avec « non », puis un envoi commité.
        Object.assign(base, {
          definitionJson: V2,
          scoringJson: GRILLE_V2,
          statutRelecture: 'valide',
          poseQuestionSuicide: false,
          questionSuicideId: null,
          questionSuicideOptionNon: null,
        });
        prisma.assignation.count.mockResolvedValue(1);
        // 3. Le PATCH reprend et écrit.
        Object.assign(base, data);
        return base;
      });
      const res = await PATCH(patchRequest({ idInstrument: 'CAB_1', titre: 'Nouveau titre' }));
      expect(res.status).toBe(200);
      expect(Object.keys(prisma.cabinetInstrument.update.mock.calls[0][0].data).sort()).toEqual([
        'categorie',
        'description',
        'titre',
      ]);
      expect(base.titre).toBe('Nouveau titre');
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

// ── NF-7, lot 3 — P2-1 (arbitrage du 2026-11-12) ────────────────────────────
// Drapeau allumé, un instrument `valide` sans déclaration reste visible mais
// porte `declarationRequise` ; le geste « Déclarer » recueille la seule
// déclaration, sans toucher aux questions ni au statut. Drapeau éteint :
// l'action n'existe pas, la liste est celle d'avant.
describe('instruments — geste « Déclarer » (NF-7, P2-1)', () => {
  const PUBLIE_NON_DECLARE = {
    ...INSTRUMENT,
    statutRelecture: 'valide',
    poseQuestionSuicide: null,
    questionSuicideId: null,
    questionSuicideOptionNon: null,
    createdAt: new Date('2026-07-24T09:00:00Z'),
  };

  function declarer(declaration: Record<string, unknown> = {}) {
    return PATCH(patchRequest({ idInstrument: 'CAB_1', action: 'declarer', ...declaration }));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
    prisma.cabinetInstrument.findFirst.mockResolvedValue(PUBLIE_NON_DECLARE);
    prisma.cabinetInstrument.findMany.mockResolvedValue([PUBLIE_NON_DECLARE]);
    prisma.cabinetInstrument.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
  });

  describe('drapeau éteint : rien ne change', () => {
    it('« declarer » est une action inconnue : 400, rien n’est écrit', async () => {
      const res = await declarer({ poseQuestionSuicide: false });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Action inconnue.');
      expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
      expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
    });

    it('la liste ne porte pas `declarationRequise`', async () => {
      const json = await (await GET(new Request('http://localhost/api/praticien/instruments'))).json();
      expect('declarationRequise' in json.instruments[0]).toBe(false);
    });
  });

  describe('drapeau allumé', () => {
    beforeEach(() => {
      process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    });

    it('la liste marque le publié non déclaré, et lui seul', async () => {
      prisma.cabinetInstrument.findMany.mockResolvedValue([
        PUBLIE_NON_DECLARE,
        { ...PUBLIE_NON_DECLARE, idInstrument: 'CAB_2', poseQuestionSuicide: false },
        { ...PUBLIE_NON_DECLARE, idInstrument: 'CAB_3', statutRelecture: 'brouillon' },
      ]);
      const json = await (await GET(new Request('http://localhost/api/praticien/instruments'))).json();
      expect(json.instruments.map((i: { declarationRequise?: true }) => i.declarationRequise === true)).toEqual([
        true,
        false,
        false,
      ]);
    });

    it('« non » : seule la déclaration est écrite, gardée sur ce qui a été relu', async () => {
      const res = await declarer({ poseQuestionSuicide: false, questionSuicideId: 'Q1', questionSuicideOptionNon: 0 });
      expect(res.status).toBe(200);
      const appel = prisma.cabinetInstrument.updateMany.mock.calls[0][0];
      expect(appel.data).toEqual({ poseQuestionSuicide: false, questionSuicideId: null, questionSuicideOptionNon: null });
      expect(appel.where).toEqual({
        idInstrument: 'CAB_1',
        actif: true,
        statutRelecture: 'valide',
        poseQuestionSuicide: null,
        updatedAt: PUBLIE_NON_DECLARE.updatedAt,
      });
      expect(prisma.cabinetInstrument.update).not.toHaveBeenCalled();
    });

    it('« oui » désigné : déclaration et désignation, sans le statut', async () => {
      await declarer({ poseQuestionSuicide: true, questionSuicideId: 'Q2', questionSuicideOptionNon: 0 });
      const data = prisma.cabinetInstrument.updateMany.mock.calls[0][0].data;
      expect(data).toEqual({ poseQuestionSuicide: true, questionSuicideId: 'Q2', questionSuicideOptionNon: 0 });
      expect('statutRelecture' in data).toBe(false);
    });

    for (const [cas, declaration] of [
      ['sans réponse', {}],
      ['réponse nulle', { poseQuestionSuicide: null }],
      ['« oui » sans désignation', { poseQuestionSuicide: true }],
      ['« oui » sur une question inconnue', { poseQuestionSuicide: true, questionSuicideId: 'QX', questionSuicideOptionNon: 0 }],
    ] as const) {
      it(`${cas} : 400, rien n’est écrit`, async () => {
        const res = await declarer(declaration);
        expect(res.status).toBe(400);
        expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
      });
    }

    for (const [cas, instrument] of [
      ['un brouillon', { ...PUBLIE_NON_DECLARE, statutRelecture: 'brouillon' }],
      ['une grille à relire', { ...PUBLIE_NON_DECLARE, statutRelecture: 'grille_a_relire' }],
      ['un publié déjà déclaré', { ...PUBLIE_NON_DECLARE, poseQuestionSuicide: true, questionSuicideId: 'Q1', questionSuicideOptionNon: 0 }],
    ] as const) {
      it(`${cas} n’attend aucune déclaration : 409, rien n’est écrit`, async () => {
        prisma.cabinetInstrument.findFirst.mockResolvedValue(instrument);
        const res = await declarer({ poseQuestionSuicide: false });
        expect(res.status).toBe(409);
        expect((await res.json()).reason).toBe('conflit_statut');
        expect(prisma.cabinetInstrument.updateMany).not.toHaveBeenCalled();
      });
    }

    it('instrument modifié entre la lecture et l’écriture : 409', async () => {
      prisma.cabinetInstrument.updateMany.mockResolvedValue({ count: 0 });
      const res = await declarer({ poseQuestionSuicide: false });
      expect(res.status).toBe(409);
      expect((await res.json()).reason).toBe('conflit_statut');
    });
  });
});
