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

describe('lecture — la ligne illisible est mise en quarantaine, pas l’agenda', () => {
  it('écarte la ligne fautive et CONSERVE les autres', async () => {
    // LE CAS QUI DÉPARTAGE. Avec une seule ligne dans le lot, « rejeter la
    // ligne » et « rejeter la collection » sont indiscernables : les deux font
    // disparaître le seul élément. Il faut un lot MIXTE pour que l'assertion
    // porte sur le comportement et non sur son nom.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligne({ id: 'J1' }),
      ligne({ id: 'J2', reponses: { contractVersion: 'agenda-alimentaire-v9', ...REPONSES } }),
      ligne({ id: 'J3' }),
    ]);
    const { jours, illisibles } = await listJours(ENTREE.idPatient);
    expect(jours.map((j) => j.id)).toEqual(['J1', 'J3']);
    expect(illisibles).toBe(1);
  });

  it('remonte le compte plutôt que de l’avaler', async () => {
    // Écarter en silence laisserait un lot tronqué franchir les seuils
    // d'exploitabilité en ayant perdu des journées — un agrégat d'apparence
    // valide. Même règle que « null jamais 0 », côté lecture.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligne({ id: 'J1', reponses: { contractVersion: 'agenda-alimentaire-v9', ...REPONSES } }),
      ligne({ id: 'J2', reponses: { prises: 'pas un tableau' } }),
    ]);
    const { jours, illisibles } = await listJours(ENTREE.idPatient);
    expect(jours).toHaveLength(0);
    expect(illisibles).toBe(2);
  });

  it('NOMME les dates en quarantaine, dédoublonnées', async () => {
    // Le COMPTE seul condamne l'appelant à refuser en bloc. `date_jour` est une
    // COLONNE, lisible même quand le JSONB ne l'est pas : la date est là sans
    // requête supplémentaire, et c'est elle qui permet au chemin d'écriture de
    // borner son refus à la journée réellement illisible.
    const illisible = { contractVersion: 'agenda-alimentaire-v9', ...REPONSES };
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligne({ id: 'J1' }),
      ligne({ id: 'J2', dateJour: '2026-08-02', reponses: illisible }),
      // MÊME date que J2 : append-only, une date peut porter deux lignes.
      ligne({ id: 'J3', dateJour: '2026-08-02', reponses: illisible }),
      ligne({ id: 'J4', dateJour: '2026-08-03', reponses: illisible }),
    ]);
    const { jours, illisibles, datesIllisibles } = await listJours(ENTREE.idPatient);
    expect(jours.map((j) => j.id)).toEqual(['J1']);
    // Le compte et la longueur du tableau NE SONT PAS interchangeables.
    expect(illisibles).toBe(3);
    expect(datesIllisibles).toEqual(['2026-08-02', '2026-08-03']);
  });

  it('remonte, POUR CHAQUE ligne en quarantaine, sa date ET son `soumisLe`', async () => {
    // La DATE seule ne dit pas si la ligne en quarantaine est une supplantée
    // sans conséquence ou la VRAIE tête de chaîne que la lecture n'a pas vue.
    // `soumis_le` est une COLONNE comme `date_jour` : le départage — celui de
    // `resolveJoursActifs` — est disponible sans requête supplémentaire.
    const illisible = { contractVersion: 'agenda-alimentaire-v9', ...REPONSES };
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligne({ id: 'J1' }),
      ligne({
        id: 'J2',
        dateJour: '2026-08-02',
        reponses: illisible,
        soumisLe: new Date('2026-08-02T07:00:00.000Z'),
      }),
    ]);
    const { jours, illisibles, lignesIllisibles, datesIllisibles } = await listJours(
      ENTREE.idPatient,
    );
    expect(jours.map((j) => j.id)).toEqual(['J1']);
    expect(illisibles).toBe(1);
    // Chaîne ISO 8601 UTC, comme `JourRow.soumisLe` : les deux se comparent
    // directement, et lexicographiquement.
    expect(lignesIllisibles).toEqual([
      { dateJour: '2026-08-02', soumisLe: '2026-08-02T07:00:00.000Z' },
    ]);
    expect(datesIllisibles).toEqual(['2026-08-02']);
  });

  it('deux lignes illisibles de MÊME date remontent CHACUNE son `soumisLe`', async () => {
    // Dédoublonner ici perdrait le seul renseignement qui décide du blocage : la
    // PLUS RÉCENTE des lignes en quarantaine. `datesIllisibles` reste, lui,
    // dédoublonné — trois grandeurs distinctes, pas interchangeables.
    const illisible = { contractVersion: 'agenda-alimentaire-v9', ...REPONSES };
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligne({
        id: 'J1',
        dateJour: '2026-08-02',
        reponses: illisible,
        soumisLe: new Date('2026-08-02T07:00:00.000Z'),
      }),
      ligne({
        id: 'J2',
        dateJour: '2026-08-02',
        reponses: illisible,
        soumisLe: new Date('2026-08-02T21:30:00.000Z'),
      }),
    ]);
    const { illisibles, lignesIllisibles, datesIllisibles } = await listJours(ENTREE.idPatient);
    expect(illisibles).toBe(2);
    expect(lignesIllisibles).toEqual([
      { dateJour: '2026-08-02', soumisLe: '2026-08-02T07:00:00.000Z' },
      { dateJour: '2026-08-02', soumisLe: '2026-08-02T21:30:00.000Z' },
    ]);
    expect(datesIllisibles).toEqual(['2026-08-02']);
  });

  it('un `soumisLe` inexploitable remonte `null`, jamais un horodatage inventé', async () => {
    // La ligne est en quarantaine PARCE QU'on n'a pas su la relire : on ne
    // suppose rien de ce qui l'entoure. Un repli fabriqué départagerait des
    // têtes de chaîne avec une valeur qui ne vient pas de la base ; `null` dit
    // « je ne sais pas », et se lit fail-closed chez l'appelant.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligne({
        id: 'J1',
        reponses: { contractVersion: 'agenda-alimentaire-v9', ...REPONSES },
        soumisLe: new Date('pas une date'),
      }),
    ]);
    const { illisibles, lignesIllisibles } = await listJours(ENTREE.idPatient);
    expect(illisibles).toBe(1);
    expect(lignesIllisibles).toEqual([{ dateJour: ENTREE.dateJour, soumisLe: null }]);
  });

  it('tolère une ligne sans version — elle doit rester relisible', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligne({ reponses: REPONSES })]);
    const { jours, illisibles } = await listJours(ENTREE.idPatient);
    expect(jours).toHaveLength(1);
    expect(jours[0].reponses).toEqual(REPONSES);
    expect(illisibles).toBe(0);
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
    const { jours, illisibles } = await listJours(ENTREE.idPatient);
    expect(jours).toEqual([]);
    expect(illisibles).toBe(0);
    const arg = prisma.agendaAlimentaireJour.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect('idAssignation' in arg.where).toBe(false);
  });
});
