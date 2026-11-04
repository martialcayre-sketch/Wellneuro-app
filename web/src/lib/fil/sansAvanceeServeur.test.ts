import { beforeEach, describe, expect, it, vi } from 'vitest';

// [[D-440]] — les lectures de la carte « Sans avancée ». Patients fictifs
// autorisés uniquement (CLAUDE.md).
const { prisma, preconditionsT0PourPatient } = vi.hoisted(() => ({
  prisma: {
    patient: { findMany: vi.fn() },
    questionnaireReponse: { groupBy: vi.fn() },
    assignation: { findMany: vi.fn() },
    syntheseIA: { groupBy: vi.fn() },
    consultation: { groupBy: vi.fn() },
    assessmentEpisode: { groupBy: vi.fn() },
    decisionPrioritySelection: { groupBy: vi.fn() },
    objectifNegocie: { groupBy: vi.fn() },
    protocolDraft: { groupBy: vi.fn() },
    bookletEnvoi: { groupBy: vi.fn() },
    protocolDiffusionApproval: { groupBy: vi.fn() },
    rendezVous: { groupBy: vi.fn() },
  },
  preconditionsT0PourPatient: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/clinical-engine/preconditionsT0Prisma', () => ({ preconditionsT0PourPatient }));

import { ceQuiRetientT0, lireDossiersParcours } from './sansAvanceeServeur';

const MAINTENANT = new Date('2026-11-04T12:00:00.000Z');
const d = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('lireDossiersParcours', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const modele of Object.values(prisma)) {
      for (const fn of Object.values(modele)) (fn as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    }
    prisma.patient.findMany.mockResolvedValue([
      { idPatient: 'P-SOPHIE', prenom: 'Sophie', nom: 'Nicola', actif: true, suiviClotureLe: null },
    ]);
  });

  it('bornée aux dossiers du praticien, inactifs et clos compris (le module pur les exclut)', async () => {
    await lireDossiersParcours('p@wellneuro.fr', MAINTENANT);
    expect(prisma.patient.findMany.mock.calls[0][0].where).toEqual({
      praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' },
    });
    expect(prisma.assignation.findMany.mock.calls[0][0].where).toEqual({ idPatient: { in: ['P-SOPHIE'] } });
    // Rendez-vous À VENIR et planifiés seulement.
    expect(prisma.rendezVous.groupBy.mock.calls[0][0].where).toEqual({
      idPatient: { in: ['P-SOPHIE'] }, statut: 'planifie', dateHeure: { gt: MAINTENANT },
    });
  });

  it('aucun dossier : aucune autre lecture', async () => {
    prisma.patient.findMany.mockResolvedValue([]);
    expect(await lireDossiersParcours('p@wellneuro.fr', MAINTENANT)).toEqual({ dossiers: [], noms: new Map() });
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('chaque source alimente son pas ; T0, diffusion et rendez-vous sont lus', async () => {
    prisma.questionnaireReponse.groupBy.mockImplementation(async (args: { by: string[] }) =>
      args.by[0] === 'idPatient' ? [{ idPatient: 'P-SOPHIE', _max: { dateReponse: d('2026-09-01') } }] : []);
    prisma.syntheseIA.groupBy.mockResolvedValue([
      { idPatient: 'P-SOPHIE', _max: { dateGeneration: d('2026-09-02'), dateValidation: d('2026-09-03') } },
    ]);
    prisma.consultation.groupBy.mockResolvedValue([{ idPatient: 'P-SOPHIE', _max: { dateValidation: d('2026-09-04') } }]);
    prisma.assessmentEpisode.groupBy.mockImplementation(async (args: { where: { milestone?: string } }) =>
      args.where.milestone === 'T0'
        ? [{ idPatient: 'P-SOPHIE', _min: { confirmedAt: d('2026-09-05') } }]
        : [{ idPatient: 'P-SOPHIE', _max: { confirmedAt: d('2026-09-06') } }]);
    prisma.decisionPrioritySelection.groupBy.mockResolvedValue([{ idPatient: 'P-SOPHIE', _max: { createdAt: d('2026-09-07') } }]);
    prisma.objectifNegocie.groupBy.mockResolvedValue([{ idPatient: 'P-SOPHIE', _max: { creeLe: d('2026-09-08') } }]);
    prisma.protocolDraft.groupBy.mockResolvedValue([{ idPatient: 'P-SOPHIE', _max: { updatedAt: d('2026-09-09') } }]);
    prisma.bookletEnvoi.groupBy.mockResolvedValue([{ idPatient: 'P-SOPHIE', _max: { dateEnvoi: d('2026-09-10') } }]);
    prisma.protocolDiffusionApproval.groupBy.mockResolvedValue([{ idPatient: 'P-SOPHIE', _count: { _all: 1 } }]);
    prisma.rendezVous.groupBy.mockResolvedValue([{ idPatient: 'P-SOPHIE', _count: { _all: 1 } }]);

    const { dossiers, noms } = await lireDossiersParcours('p@wellneuro.fr', MAINTENANT);
    expect(noms.get('P-SOPHIE')).toBe('Sophie Nicola');
    expect(dossiers[0]).toMatchObject({
      aDesReponses: true,
      t0ConsigneLe: d('2026-09-05'),
      diffuse: true,
      rendezVousAVenir: true,
      pas: {
        reponse: d('2026-09-01'),
        synthese_generee: d('2026-09-02'),
        synthese_validee: d('2026-09-03'),
        consultation_validee: d('2026-09-04'),
        episode_confirme: d('2026-09-06'),
        priorite_choisie: d('2026-09-07'),
        objectif_negocie: d('2026-09-08'),
        brouillon_protocole: d('2026-09-09'),
        livret_envoye: d('2026-09-10'),
      },
    });
    // Le livret ne compte que s'il est parti.
    expect(prisma.bookletEnvoi.groupBy.mock.calls[0][0].where.statut).toBe('Envoye');
  });

  it('annulée : ni pas ni questionnaire attendu ; complétée ou répondue : un pas, pas un questionnaire ouvert', async () => {
    prisma.assignation.findMany.mockResolvedValue([
      { idAssignation: 'A-ANNULEE', idPatient: 'P-SOPHIE', dateAssignation: d('2026-10-20'), dateLimite: null, statut: 'Annulée' },
      { idAssignation: 'A-COMPLETE', idPatient: 'P-SOPHIE', dateAssignation: d('2026-08-01'), dateLimite: null, statut: 'Complété' },
      { idAssignation: 'A-REPONDUE', idPatient: 'P-SOPHIE', dateAssignation: d('2026-08-02'), dateLimite: null, statut: 'En attente' },
      { idAssignation: 'A-OUVERTE', idPatient: 'P-SOPHIE', dateAssignation: d('2026-08-03'), dateLimite: '2026-08-20', statut: 'En attente' },
    ]);
    prisma.questionnaireReponse.groupBy.mockImplementation(async (args: { by: string[] }) =>
      args.by[0] === 'idAssignation' ? [{ idAssignation: 'A-REPONDUE' }] : []);

    const { dossiers } = await lireDossiersParcours('p@wellneuro.fr', MAINTENANT);
    expect(dossiers[0].pas.assignation).toEqual(d('2026-08-03'));
    expect(dossiers[0].questionnairesSansReponse).toEqual([
      { dateAssignation: d('2026-08-03'), dateLimite: '2026-08-20' },
    ]);
    expect(dossiers[0].aDesReponses).toBe(false);
    expect(dossiers[0].t0ConsigneLe).toBeNull();
  });
});

describe('ceQuiRetientT0', () => {
  beforeEach(() => vi.clearAllMocks());

  it('les libellés des conditions DURES non satisfaites, par le chemin unique, jalon T0', async () => {
    preconditionsT0PourPatient.mockResolvedValue({
      dures: [
        { id: 'a', libelle: 'Anamnèse consignée', satisfaite: false, detail: null },
        { id: 'b', libelle: 'Premier rideau renseigné et cotable', satisfaite: true, detail: null },
      ],
      souples: [{ id: 'c', libelle: 'Souple', satisfaite: false, detail: null }],
      bloquant: true,
      contournementsRequis: [],
    });
    const resultat = await ceQuiRetientT0(['P-SOPHIE']);
    expect(resultat.get('P-SOPHIE')).toEqual(['Anamnèse consignée']);
    expect(preconditionsT0PourPatient).toHaveBeenCalledWith('P-SOPHIE', 'T0');
  });

  it('un échec ne touche que son dossier : `null`, les autres sont évalués', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    preconditionsT0PourPatient.mockImplementation(async (id: string) => {
      if (id === 'P-MICHEL') throw new Error('base indisponible');
      return { dures: [], souples: [], bloquant: false, contournementsRequis: [] };
    });
    const resultat = await ceQuiRetientT0(['P-SOPHIE', 'P-MICHEL']);
    expect(resultat.get('P-SOPHIE')).toEqual([]);
    expect(resultat.get('P-MICHEL')).toBeNull();
    erreur.mockRestore();
  });

  it('aucune carte affichée : aucune évaluation', async () => {
    expect((await ceQuiRetientT0([])).size).toBe(0);
    expect(preconditionsT0PourPatient).not.toHaveBeenCalled();
  });
});
