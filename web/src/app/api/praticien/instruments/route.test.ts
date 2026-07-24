import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    cabinetInstrument: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // Gel du contenu : le PATCH compte les assignations non verrouillées.
    assignation: { count: vi.fn() },
  },
}));

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
