import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

const { getServerSession, prisma, jourZeroDuCycleCourant } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  jourZeroDuCycleCourant: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
// [[D-397]] : le momentum part de l'ancre du cycle courant et exige son jour 0.
vi.mock('@/lib/protocol/calendriersPersistes', () => ({ jourZeroDuCycleCourant }));

// Le plafond des fondations critiques ne se fabrique pas sans une fixture
// clinique complète : le banc force le seul booléen que la route recopie.
const plafond = vi.hoisted(() => ({ force: false }));
vi.mock('@/lib/equilibre/objetsCliniques', async importOriginal => {
  const reel = await importOriginal<typeof import('@/lib/equilibre/objetsCliniques')>();
  return {
    ...reel,
    calculerObjetsCliniques: (...args: Parameters<typeof reel.calculerObjetsCliniques>) => {
      const objets = reel.calculerObjetsCliniques(...args);
      return plafond.force ? { ...objets, indiceGlobal: { ...objets.indiceGlobal, plafondApplique: true } } : objets;
    },
  };
});

import { GET } from './route';

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/equilibre?${query}`);
}

describe('GET /api/praticien/equilibre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    plafond.force = false;
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    jourZeroDuCycleCourant.mockResolvedValue(null);
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findFirst.mockResolvedValue({
      idPatient: 'PAT_1',
      prenom: 'Sophie',
      nom: 'Nicola',
      email: 'sophie.nicola@fictif.wellneuro.fr',
    });
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
  });

  it('rejette une requête sans idPatient (400)', async () => {
    const res = await GET(request(''));
    expect(res.status).toBe(400);
  });

  it('scope la recherche du patient au praticien en session', async () => {
    await GET(request());
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_1', praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
    });
  });

  it('patient d’un autre praticien : 404 indistinguable, sans journalisation', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    const json = (await res.json()) as { reason: string };
    expect(json.reason).toBe('patient_not_found');
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    // Un refus ne se journalise jamais : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('patient accessible → 200, et la lecture est journalisée au gabarit littéral', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { patient: { idPatient: string } };
    expect(json.patient.idPatient).toBe('PAT_1');
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/equilibre',
        methode: 'GET',
      },
    });
  });
  it('dit sur combien de besoins l’indice est établi ([[D-329]] §3)', async () => {
    // Fixture : un versant dépressif de la HAD complet seul — un besoin mesuré.
    const axeD = Object.fromEntries(['D2', 'D4', 'D6', 'D8', 'D10', 'D12', 'D14'].map(id => [id, '1']));
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idQuestionnaire: 'Q_NEU_11', dateReponse: new Date('2026-10-01T10:00:00Z'), scoresJson: { rawAnswers: axeD }, statutValidite: null },
    ]);
    const json = (await (await GET(request())).json()) as { objetsCliniques: { besoinsMesures: number; besoinsTotal: number } };
    expect(json.objetsCliniques.besoinsMesures).toBe(1);
    expect(json.objetsCliniques.besoinsTotal).toBe(12);
  });

  // [[D-333]] §3 : la route dit quelles sources de la stabilité sont là, pour
  // que le cockpit nomme la présente et celle qui manque — la présence seule,
  // aucun chiffre par source.
  describe('sources de la stabilité métabolique', () => {
    const toutes = (prefixe: string, n: number, valeur: string) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefixe}${i + 1}`, valeur]));
    const reponse = (idQuestionnaire: string, rawAnswers: Record<string, string>) => ({
      idQuestionnaire,
      dateReponse: new Date('2026-10-01T10:00:00Z'),
      scoresJson: { rawAnswers },
      statutValidite: null,
    });
    type Objets = { objetsCliniques: { stabiliteMetabolique: number | null; stabiliteMetaboliqueSources: unknown } };

    it('aucune réponse : les deux sources manquent, la valeur reste nulle', async () => {
      const json = (await (await GET(request())).json()) as Objets;
      expect(json.objetsCliniques.stabiliteMetabolique).toBeNull();
      expect(json.objetsCliniques.stabiliteMetaboliqueSources).toEqual([
        { idQuestionnaire: 'Q_INF_01', presente: false },
        { idQuestionnaire: 'Q_INF_02', presente: false },
      ]);
    });

    it('Q_INF_01 seule : présente, Q_INF_02 manquante', async () => {
      prisma.questionnaireReponse.findMany.mockResolvedValue([reponse('Q_INF_01', toutes('H', 24, '1'))]);
      const json = (await (await GET(request())).json()) as Objets;
      expect(json.objetsCliniques.stabiliteMetabolique).not.toBeNull();
      expect(json.objetsCliniques.stabiliteMetaboliqueSources).toEqual([
        { idQuestionnaire: 'Q_INF_01', presente: true },
        { idQuestionnaire: 'Q_INF_02', presente: false },
      ]);
    });

    it('Q_INF_02 seule : Q_INF_01 manquante, l’ordre de la liste tient', async () => {
      prisma.questionnaireReponse.findMany.mockResolvedValue([reponse('Q_INF_02', toutes('M', 13, '2'))]);
      const json = (await (await GET(request())).json()) as Objets;
      expect(json.objetsCliniques.stabiliteMetabolique).not.toBeNull();
      expect(json.objetsCliniques.stabiliteMetaboliqueSources).toEqual([
        { idQuestionnaire: 'Q_INF_01', presente: false },
        { idQuestionnaire: 'Q_INF_02', presente: true },
      ]);
    });

    // La présence dite et la valeur lisent la même chose : une passation
    // invalidée n'est ni comptée dans la moyenne, ni dite présente. Le filtre
    // de validité vit derrière son drapeau (`validite.ts`) : on l'allume.
    it('Q_INF_02 invalidée : dite manquante, la valeur est celle de Q_INF_01 seule', async () => {
      vi.stubEnv('WN_ENABLE_VALIDITE_PASSATIONS', '1');
      onTestFinished(() => {
        vi.unstubAllEnvs();
      });
      prisma.questionnaireReponse.findMany.mockResolvedValue([reponse('Q_INF_01', toutes('H', 24, '1'))]);
      const seule = (await (await GET(request())).json()) as Objets;
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        reponse('Q_INF_01', toutes('H', 24, '1')),
        { ...reponse('Q_INF_02', toutes('M', 13, '2')), statutValidite: 'INVALID' },
      ]);
      const json = (await (await GET(request())).json()) as Objets;
      expect(json.objetsCliniques.stabiliteMetabolique).toBe(seule.objetsCliniques.stabiliteMetabolique);
      expect(json.objetsCliniques.stabiliteMetaboliqueSources).toEqual([
        { idQuestionnaire: 'Q_INF_01', presente: true },
        { idQuestionnaire: 'Q_INF_02', presente: false },
      ]);
    });

    it('Q_INF_01 incomplète, donc non scorée : dite manquante, valeur nulle', async () => {
      prisma.questionnaireReponse.findMany.mockResolvedValue([reponse('Q_INF_01', { H1: '1' })]);
      const json = (await (await GET(request())).json()) as Objets;
      expect(json.objetsCliniques.stabiliteMetabolique).toBeNull();
      expect(json.objetsCliniques.stabiliteMetaboliqueSources).toEqual([
        { idQuestionnaire: 'Q_INF_01', presente: false },
        { idQuestionnaire: 'Q_INF_02', presente: false },
      ]);
    });

    it('les deux sources : toutes deux présentes', async () => {
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        reponse('Q_INF_01', toutes('H', 24, '1')),
        reponse('Q_INF_02', toutes('M', 13, '2')),
      ]);
      const json = (await (await GET(request())).json()) as Objets;
      expect(json.objetsCliniques.stabiliteMetaboliqueSources).toEqual([
        { idQuestionnaire: 'Q_INF_01', presente: true },
        { idQuestionnaire: 'Q_INF_02', presente: true },
      ]);
    });
  });

  it('un axe partiel ne compte pas parmi les besoins mesurés', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idQuestionnaire: 'Q_NEU_11', dateReponse: new Date('2026-10-01T10:00:00Z'), scoresJson: { rawAnswers: { D2: '0' } }, statutValidite: null },
    ]);
    const json = (await (await GET(request())).json()) as { objetsCliniques: { indiceGlobal: number | null; besoinsMesures: number } };
    expect(json.objetsCliniques.besoinsMesures).toBe(0);
    expect(json.objetsCliniques.indiceGlobal).toBeNull();
  });

  // [[D-333]] §2 règle 1 : chaque chiffre porte les questionnaires que la
  // formule a lus, à la date de la passation retenue, et la version du calcul.
  describe('provenance datée', () => {
    // L'étiquette de version suit le drapeau de la forme servie : l'importer
    // rangerait ce banc parmi les specs qui en dépendent
    // (`specs-drapeau-ali01.test.mjs`). Sa forme suffit ici.
    const VERSION_DU_CALCUL = expect.stringMatching(/^v\d+$/);
    const axeD = (valeur: string) =>
      Object.fromEntries(['D2', 'D4', 'D6', 'D8', 'D10', 'D12', 'D14'].map(id => [id, valeur]));
    const had = (date: Date, valeur = '1', statutValidite: string | null = null) => ({
      idQuestionnaire: 'Q_NEU_11',
      dateReponse: date,
      scoresJson: { rawAnswers: axeD(valeur) },
      statutValidite,
    });
    type Provenance = {
      objetsCliniques: {
        plafondApplique: boolean;
        provenance: Record<string, unknown>;
      };
    };

    it('aucun chiffre : aucune provenance, aucun plafond', async () => {
      const json = (await (await GET(request())).json()) as Provenance;
      expect(json.objetsCliniques.plafondApplique).toBe(false);
      expect(json.objetsCliniques.provenance).toEqual({
        indiceGlobal: null,
        stabiliteMetabolique: null,
        reserveAdaptation: null,
        clarte: null,
        momentum: null,
      });
    });

    it('indice global : la source lue, sa date, la version du calcul', async () => {
      prisma.questionnaireReponse.findMany.mockResolvedValue([had(new Date('2026-10-01T10:00:00Z'))]);
      const json = (await (await GET(request())).json()) as Provenance;
      expect(json.objetsCliniques.provenance.indiceGlobal).toEqual({
        sources: [{ idQuestionnaire: 'Q_NEU_11', dateReponse: '2026-10-01T10:00:00.000Z' }],
        versionCalcul: VERSION_DU_CALCUL,
      });
    });

    it('la date est celle de la passation que la formule retient — la plus récente exploitable', async () => {
      vi.stubEnv('WN_ENABLE_VALIDITE_PASSATIONS', '1');
      onTestFinished(() => {
        vi.unstubAllEnvs();
      });
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        had(new Date('2026-09-01T10:00:00Z')),
        had(new Date('2026-10-01T10:00:00Z')),
        had(new Date('2026-10-05T10:00:00Z'), '1', 'INVALID'),
      ]);
      const json = (await (await GET(request())).json()) as Provenance;
      expect(json.objetsCliniques.provenance.indiceGlobal).toMatchObject({
        sources: [{ idQuestionnaire: 'Q_NEU_11', dateReponse: '2026-10-01T10:00:00.000Z' }],
      });
    });

    it('une source incomplète n’est pas nommée : elle n’a rien nourri', async () => {
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        had(new Date('2026-10-01T10:00:00Z')),
        {
          idQuestionnaire: 'Q_INF_01',
          dateReponse: new Date('2026-10-02T10:00:00Z'),
          scoresJson: { rawAnswers: { H1: '1' } },
          statutValidite: null,
        },
      ]);
      const json = (await (await GET(request())).json()) as Provenance;
      expect(json.objetsCliniques.provenance.stabiliteMetabolique).toBeNull();
      expect(json.objetsCliniques.provenance.indiceGlobal).toMatchObject({
        sources: [{ idQuestionnaire: 'Q_NEU_11' }],
      });
    });

    it('stabilité métabolique : sa source datée, et aucune version empruntée', async () => {
      const h = Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`H${i + 1}`, '1']));
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { idQuestionnaire: 'Q_INF_01', dateReponse: new Date('2026-10-02T10:00:00Z'), scoresJson: { rawAnswers: h }, statutValidite: null },
      ]);
      const json = (await (await GET(request())).json()) as Provenance;
      expect(json.objetsCliniques.provenance.stabiliteMetabolique).toEqual({
        sources: [{ idQuestionnaire: 'Q_INF_01', dateReponse: '2026-10-02T10:00:00.000Z' }],
        versionCalcul: null,
      });
    });

    it('momentum ([[D-397]]) : de la lecture d’ancre à la dernière remesure, à leur date', async () => {
      const jour = 24 * 60 * 60 * 1000;
      const premiere = new Date(Date.now() - 60 * jour);
      const ancre = new Date(premiere.getTime() + 60_000);
      const remesure = new Date(Date.now() - 45 * jour);
      prisma.assessmentEpisode.findMany.mockResolvedValue([
        { id: 'EP_T0', cycleId: 'CY_1', confirmedAt: ancre, milestone: 'T0' },
      ]);
      jourZeroDuCycleCourant.mockResolvedValue(new Date(ancre.getTime() + jour));
      prisma.questionnaireReponse.findMany.mockResolvedValue([had(premiere, '0'), had(remesure, '3')]);
      const json = (await (await GET(request())).json()) as Provenance;
      expect(json.objetsCliniques.provenance.momentum).toEqual({
        depart: { jalon: 'T0', date: ancre.toISOString() },
        // Sept jours avant le centre du J21 (jour 0 + 21 j), dans sa fenêtre de
        // ± 8 j : l'arrivée porte le nom du jalon.
        arrivee: { jalon: 'J21', date: remesure.toISOString() },
        versionCalcul: VERSION_DU_CALCUL,
      });
    });

    it('momentum ([[D-397]] §2) : sans jour 0, aucun momentum, et le motif le dit', async () => {
      const jour = 24 * 60 * 60 * 1000;
      const premiere = new Date(Date.now() - 60 * jour);
      prisma.assessmentEpisode.findMany.mockResolvedValue([
        { id: 'EP_T0', cycleId: 'CY_1', confirmedAt: new Date(premiere.getTime() + 60_000), milestone: 'T0' },
      ]);
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        had(premiere, '0'),
        had(new Date(Date.now() - 45 * jour), '3'),
      ]);
      const json = (await (await GET(request())).json()) as {
        objetsCliniques: { momentum: unknown; motifMomentum: string | null; ancreMomentum: string | null };
      };
      expect(json.objetsCliniques.momentum).toBeNull();
      expect(json.objetsCliniques.motifMomentum).toBe('sans_jour_zero');
      expect(json.objetsCliniques.ancreMomentum).toBe('T0');
    });

    it('réserve d’adaptation : les sources du besoin que la formule lit', async () => {
      const pss = { P1: '2', P2: '2', P3: '3', P4: '3', P5: '3', P6: '2', P7: '3', P8: '3', P9: '2', P10: '3' };
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-09-12T08:00:00Z'), scoresJson: { rawAnswers: pss }, statutValidite: null },
      ]);
      const json = (await (await GET(request())).json()) as Provenance;
      expect(json.objetsCliniques.provenance.reserveAdaptation).toEqual({
        sources: [{ idQuestionnaire: 'Q_STR_02', dateReponse: '2026-09-12T08:00:00.000Z' }],
        versionCalcul: VERSION_DU_CALCUL,
      });
      // Le même questionnaire nourrit l'indice global, une seule fois nommé.
      expect(json.objetsCliniques.provenance.indiceGlobal).toMatchObject({
        sources: [{ idQuestionnaire: 'Q_STR_02' }],
      });
      expect(json.objetsCliniques.provenance.clarte).toBeNull();
    });

    // r3_08 : chaque ligne du tableau porte sa provenance, ou son motif, et
    // B9/B10 nomment la carte qui sert la même valeur.
    it('lignes des 12 besoins : provenance datée si mesuré, motif sinon, carte liée pour B9 et B10', async () => {
      const pss = { P1: '2', P2: '2', P3: '3', P4: '3', P5: '3', P6: '2', P7: '3', P8: '3', P9: '2', P10: '3' };
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-09-12T08:00:00Z'), scoresJson: { rawAnswers: pss }, statutValidite: null },
      ]);
      type Ligne = { besoin: number; couverture: number | null; motifNonMesure: unknown; provenance: unknown; carteLiee: unknown };
      const json = (await (await GET(request())).json()) as { priorites: Ligne[] };
      const par = new Map(json.priorites.map(l => [l.besoin, l]));

      expect(par.get(9)).toMatchObject({
        motifNonMesure: null,
        provenance: { sources: [{ idQuestionnaire: 'Q_STR_02', dateReponse: '2026-09-12T08:00:00.000Z' }], versionCalcul: VERSION_DU_CALCUL },
        carteLiee: 'reserveAdaptation',
      });
      expect(par.get(10)).toMatchObject({
        couverture: null,
        provenance: null,
        carteLiee: 'clarte',
        motifNonMesure: [{ motif: 'aucune_passation', idsQuestionnaire: ['Q_INF_03'], dateDernierePassation: null }],
      });
      expect(par.get(2)?.motifNonMesure).toEqual([{ motif: 'hors_score', idsQuestionnaire: [], dateDernierePassation: null }]);
      expect(par.get(1)?.carteLiee).toBeNull();
      expect((json as unknown as { objetsCliniques: { versionCalcul: string } }).objetsCliniques.versionCalcul).toEqual(
        VERSION_DU_CALCUL
      );
      // Égalité null ⇔ motif sur la réponse servie.
      for (const l of json.priorites) expect(l.motifNonMesure === null).toBe(l.couverture !== null);
    });

    // r3_09 (Q1) : ordre fixe, B1 à B12. Seul B9 est mesuré ici : le tri
    // « creux d'abord » le mettait en tête ([[D-333]] §2 règle 4).
    it('lignes des 12 besoins : ordre fixe B1 à B12, jamais un tri sur la valeur', async () => {
      const pss = { P1: '2', P2: '2', P3: '3', P4: '3', P5: '3', P6: '2', P7: '3', P8: '3', P9: '2', P10: '3' };
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-09-12T08:00:00Z'), scoresJson: { rawAnswers: pss }, statutValidite: null },
      ]);
      const json = (await (await GET(request())).json()) as { priorites: { besoin: number; couverture: number | null }[] };
      expect(json.priorites.find(l => l.besoin === 9)?.couverture).not.toBeNull();
      expect(json.priorites.map(l => l.besoin)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('plafond appliqué : le booléen seul, ni besoin ni valeur avant plafond (Q9)', async () => {
      plafond.force = true;
      prisma.questionnaireReponse.findMany.mockResolvedValue([had(new Date('2026-10-01T10:00:00Z'))]);
      const json = (await (await GET(request())).json()) as Provenance;
      expect(json.objetsCliniques.plafondApplique).toBe(true);
      const texte = JSON.stringify(json.objetsCliniques);
      expect(texte).not.toContain('scoreGlobalAvantPlafond');
      expect(texte).not.toContain('fondationsCritiquesDeclenchees');
    });
  });
});
