import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    questionnaireReponse: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

function request(query = 'email=sophie.nicola%40fictif.wellneuro.fr'): Request {
  return new Request(`http://localhost/api/praticien/reponses?${query}`);
}

function reponseRow() {
  return {
    idReponse: 'REP_1',
    idPatient: 'PAT_1',
    emailPatient: 'sophie.nicola@fictif.wellneuro.fr',
    idAssignation: 'ASS_1',
    idQuestionnaire: 'Q_SOM_06',
    titre: 'Sommeil',
    dateReponse: new Date('2026-07-01T00:00:00.000Z'),
    scoresJson: {},
    scorePrincipal: 3,
    interpretation: 'Faible',
  };
}

describe('GET /api/praticien/reponses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('rejette une requête sans email (400)', async () => {
    const res = await GET(request(''));
    expect(res.status).toBe(400);
  });

  it('scope la liste par la relation patient (l’e-mail seul est devinable)', async () => {
    await GET(request());
    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalledWith({
      where: {
        emailPatient: 'sophie.nicola@fictif.wellneuro.fr',
        patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      },
      orderBy: { dateReponse: 'desc' },
    });
  });

  it('liste non vide → lecture journalisée, idPatient issu de la ligne (pas de l’e-mail)', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([reponseRow()]);
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/reponses',
        methode: 'GET',
      },
    });
  });

  it('liste vide (e-mail inconnu OU patient d’un autre praticien) → 200 sans journalisation (limite assumée)', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reponses: [] });
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});

// Réservoir des passations non interprétables — le retrait a lieu DANS la
// route, jamais dans l'écran. C'est la leçon du lot #406 : `actif: false` n'y
// gardait que les écrans, et les trois chemins d'assignation sont passés à
// côté. Une donnée que la route livre encore est une donnée qu'un appelant
// affichera un jour.
describe('GET /api/praticien/reponses — passation non interprétable', () => {
  function ligneSom07(surcharge: Record<string, unknown> = {}) {
    return {
      ...reponseRow(),
      idReponse: 'REP_SOM07',
      idQuestionnaire: 'Q_SOM_07',
      titre: 'MFI-20 — Échelle multidimensionnelle de fatigue',
      // Forme réellement en base le 2026-07-27 (relevée par execute_sql).
      scoresJson: {
        type: 'sum',
        total: 45,
        maxTotal: 80,
        interpretation: { label: 'Fatigue notable', color: 'warning' },
        certification: null,
        rawAnswers: { M1: 2, M2: 3 },
      },
      scorePrincipal: 45,
      interpretation: 'Fatigue notable',
      ...surcharge,
    };
  }

  beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  });

  it('ne livre ni score principal ni interprétation, et donne le motif', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([ligneSom07()]);
    const { reponses } = await (await GET(request())).json();
    expect(reponses).toHaveLength(1);
    expect(reponses[0].scorePrincipal).toBeNull();
    expect(reponses[0].interpretation).toBe('');
    expect(reponses[0].nonInterpretable).toBeTruthy();
    // Le motif est ce qui distingue « retiré » de « manquant » à l'écran.
    expect(reponses[0].nonInterpretable).toContain('MFI-20');
  });

  it('ne laisse subsister aucune valeur de score dans la charge utile sérialisée', async () => {
    // Preuve sur le JSON réellement transmis, pas sur l'objet intermédiaire :
    // c'est ce que le navigateur reçoit. Un total oublié sous une clé
    // imprévue serait attrapé ici même si aucune assertion ne le nomme.
    //
    // Le motif est retiré AVANT le balayage, et pas par confort : il cite
    // « 3 bandes sur /80 » et « échelle 1→5 ». Chercher des nombres nus dans
    // un texte qui explique des nombres rend un faux positif — la première
    // version de ce test échouait sur son propre motif.
    prisma.questionnaireReponse.findMany.mockResolvedValue([ligneSom07()]);
    const charge = await (await GET(request())).json();
    const motif = charge.reponses[0].nonInterpretable;
    expect(motif, 'motif absent : le balayage ci-dessous ne prouverait rien').toBeTruthy();
    const { nonInterpretable: _motif, ...sansMotif } = charge.reponses[0];
    const brut = JSON.stringify(sansMotif);
    for (const fuite of ['Fatigue notable', '"total"', '"maxTotal"', '45', '80']) {
      expect(brut, `« ${fuite} » a fui vers le client`).not.toContain(fuite);
    }
  });

  it('conserve les réponses brutes du patient — marquer n’est pas effacer', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([ligneSom07()]);
    const { reponses } = await (await GET(request())).json();
    expect(reponses[0].scoresParsed).toEqual({ rawAnswers: { M1: 2, M2: 3 } });
    expect(reponses[0].titre).toBe('MFI-20 — Échelle multidimensionnelle de fatigue');
  });

  it('retire aussi les bornes de sous-scores (elles dessineraient une échelle non servie)', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([ligneSom07()]);
    const { reponses } = await (await GET(request())).json();
    expect(reponses[0].subScoreRanges).toBeNull();
  });

  it('ne touche à rien sur un instrument courant (contrôle négatif)', async () => {
    // Sans ce contrôle, vider inconditionnellement score et interprétation
    // ferait passer les quatre tests ci-dessus au vert.
    prisma.questionnaireReponse.findMany.mockResolvedValue([reponseRow()]);
    const { reponses } = await (await GET(request())).json();
    expect(reponses[0].nonInterpretable).toBeNull();
    expect(reponses[0].scorePrincipal).toBe(3);
    expect(reponses[0].interpretation).toBe('Faible');
  });
});
