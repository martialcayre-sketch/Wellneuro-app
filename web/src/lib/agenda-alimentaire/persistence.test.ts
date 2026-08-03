import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    agendaAlimentaireJour: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

import { listJours, saveJour } from './persistence';
import { AGENDA_ALI_CONTRACT_VERSION } from './types';

const REPONSES = {
  prises: [
    { heure: '07:30', nature: 'repas' as const },
    { heure: '12:30', nature: 'repas' as const },
    { heure: '19:30', nature: 'repas' as const },
  ],
  premierePriseProteines: true,
  legumesDeuxPrises: true,
  fruitsOuOleagineux: false,
  ultraTransformes: false,
};

const ENTREE = {
  idPatient: 'PAT_SEED_03',
  idAssignation: 'ASS_TEST_001',
  dateJour: '2026-08-04',
  reponses: REPONSES,
};

/** Ce que Prisma rendrait pour la ligne écrite. */
function ligne(over: Record<string, unknown> = {}) {
  return {
    id: 'JOUR_1',
    idPatient: ENTREE.idPatient,
    idAssignation: ENTREE.idAssignation,
    dateJour: ENTREE.dateJour,
    reponses: { contractVersion: AGENDA_ALI_CONTRACT_VERSION, ...REPONSES },
    canal: 'portail',
    supersedesJourId: null,
    soumisLe: new Date('2026-08-04T09:15:00.000Z'),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('saveJour — append-only', () => {
  it('crée, ne met jamais à jour, et injecte la version de contrat', async () => {
    prisma.agendaAlimentaireJour.create.mockResolvedValue(ligne());
    const row = await saveJour(ENTREE);

    expect(prisma.agendaAlimentaireJour.create).toHaveBeenCalledTimes(1);
    const arg = prisma.agendaAlimentaireJour.create.mock.calls[0][0] as {
      data: { reponses: Record<string, unknown>; canal: string; supersedesJourId: string | null };
    };
    expect(arg.data.reponses).toMatchObject({ contractVersion: AGENDA_ALI_CONTRACT_VERSION });
    expect(arg.data.canal).toBe('portail');
    expect(arg.data.supersedesJourId).toBeNull();
    // La version est rangée dans le JSONB, pas rendue au domaine : `JourRow`
    // ne la porte pas.
    expect(row.reponses).toEqual(REPONSES);
    // Le DateTime Prisma devient une chaîne ISO, et ici seulement.
    expect(row.soumisLe).toBe('2026-08-04T09:15:00.000Z');
  });

  it('écrit une abstention telle quelle', async () => {
    const avecNull = { ...REPONSES, legumesDeuxPrises: null };
    prisma.agendaAlimentaireJour.create.mockResolvedValue(
      ligne({ reponses: { contractVersion: AGENDA_ALI_CONTRACT_VERSION, ...avecNull } }),
    );
    const row = await saveJour({ ...ENTREE, reponses: avecNull });
    expect(row.reponses.legumesDeuxPrises).toBeNull();
  });

  it('refuse un identifiant hors format, sans toucher la base', async () => {
    await expect(saveJour({ ...ENTREE, idPatient: 'PAT SEED 03' })).rejects.toThrow(TypeError);
    await expect(saveJour({ ...ENTREE, dateJour: '04/08/2026' })).rejects.toThrow(TypeError);
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse un canal hors de la liste fermée', async () => {
    await expect(saveJour({ ...ENTREE, canal: 'sms' })).rejects.toThrow(TypeError);
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('exige le contrat complet en écriture', async () => {
    const sansContenu = { prises: REPONSES.prises };
    await expect(saveJour({ ...ENTREE, reponses: sansContenu })).rejects.toThrow(TypeError);
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });
});

describe('saveJour — la correction ne traverse pas les dossiers', () => {
  // Sans cette garde, un identifiant deviné permettrait de chaîner une
  // correction sur la journée d'un AUTRE patient : la ligne supplantée
  // sortirait de son agenda d'origine sans que rien ne le dise.
  it.each([
    ['un autre patient', { idPatient: 'PAT_AUTRE' }],
    ['une autre assignation', { idAssignation: 'ASS_AUTRE' }],
    ['une autre date', { dateJour: '2026-08-03' }],
    ['une ligne inexistante', null],
  ])('refuse de se chaîner sur %s', async (_libelle, over) => {
    prisma.agendaAlimentaireJour.findUnique.mockResolvedValue(
      over === null
        ? null
        : {
            idPatient: ENTREE.idPatient,
            idAssignation: ENTREE.idAssignation,
            dateJour: ENTREE.dateJour,
            ...over,
          },
    );
    await expect(saveJour({ ...ENTREE, supersedesJourId: 'JOUR_0' })).rejects.toThrow(TypeError);
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('accepte le chaînage quand patient, assignation ET date concordent', async () => {
    prisma.agendaAlimentaireJour.findUnique.mockResolvedValue({
      idPatient: ENTREE.idPatient,
      idAssignation: ENTREE.idAssignation,
      dateJour: ENTREE.dateJour,
    });
    prisma.agendaAlimentaireJour.create.mockResolvedValue(ligne({ supersedesJourId: 'JOUR_0' }));
    const row = await saveJour({ ...ENTREE, supersedesJourId: 'JOUR_0' });
    expect(row.supersedesJourId).toBe('JOUR_0');
  });
});

describe('lecture — la version de contrat est vérifiée avant le contenu', () => {
  it('refuse une ligne écrite sous une version inconnue, en la nommant', async () => {
    // Le trou qu'on ne reproduit pas : côté sommeil, la liste des versions lues
    // n'est consultée nulle part, si bien qu'une ligne v2 serait relue sous les
    // règles v1 sans un bruit.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligne({ reponses: { contractVersion: 'agenda-alimentaire-v9', ...REPONSES } }),
    ]);
    await expect(listJours(ENTREE.idPatient)).rejects.toThrow(/agenda-alimentaire-v9/);
  });

  it('tolère une ligne sans version — elle doit rester relisible', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligne({ reponses: REPONSES })]);
    const rows = await listJours(ENTREE.idPatient);
    expect(rows).toHaveLength(1);
    expect(rows[0].reponses).toEqual(REPONSES);
  });
});

describe('listJours', () => {
  it('trie par ordre d’écriture et borne à l’assignation quand elle est fournie', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligne()]);
    await listJours(ENTREE.idPatient, ENTREE.idAssignation);
    expect(prisma.agendaAlimentaireJour.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idPatient: ENTREE.idPatient, idAssignation: ENTREE.idAssignation },
        orderBy: { soumisLe: 'asc' },
      }),
    );
  });

  it('sans assignation, ne borne pas', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([]);
    await listJours(ENTREE.idPatient);
    const arg = prisma.agendaAlimentaireJour.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect('idAssignation' in arg.where).toBe(false);
  });
});
