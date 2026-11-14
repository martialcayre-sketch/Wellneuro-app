import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// PARITÉ COCKPIT ↔ FIL SUR UNE PASSATION POSITIVE — [[D-275]], reste nommé au
// handoff du 2026-10-10 (« tests suggérés non écrits », dette t05).
//
// Le Fil (`lireSignauxSecuriteOuverts`) lit en groupe les MÊMES trois sources
// que la chaîne C1 du cockpit, et dit ce qui reste ouvert par la même
// composition. Ce banc pose une même passation positive des deux côtés et exige
// les MÊMES constats : si l'un des deux cessait de lire les réponses aux
// questions sur le suicide, ou les lisait autrement, la carte du Fil et la
// suspension du cockpit diraient deux choses différentes du même dossier.

const { prisma } = vi.hoisted(() => ({
  prisma: {
    consultation: { findFirst: vi.fn(), findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    assignation: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({ filtrePatientsDuPraticien: () => ({}) }));
vi.mock('@/lib/clinical-engine/adressagesSignalAlertePrisma', () => ({
  lireCouverturesAdressage: vi.fn(async () => undefined),
  lireCouverturesAdressageGroupees: vi.fn(async () => undefined),
}));
vi.mock('@/lib/clinical-engine/selectionPrioritePrisma', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/clinical-engine/selectionPrioritePrisma')>()),
  lireSelectionPriorite: vi.fn(async () => null),
}));

import {
  ANAMNESE_C1_FIXTURE,
  ANAMNESE_C1_FIXTURE_AVEC_SIGNAL,
  chaineC1DeReference,
  retablirTablePriorites,
  signerTablePriorites,
} from '@/lib/clinical-engine/chaineC1Fixture';
import { estFindingQuestionnaire } from '@/lib/clinical-engine/safetyFindingSource';
import { designationDeLAssignation } from '@/lib/clinical-engine/designationsCabinetPrisma';
import {
  SAFETY_QUESTIONNAIRE_CABINET_METADATA,
  SAFETY_QUESTIONNAIRE_CABINET_SHA256,
} from '@/lib/clinical/safetyQuestionnaireCabinetV1';
import { lireSignauxSecuriteOuverts } from './signauxSecurite';

const POSITIF = {
  idReponse: 'REP_BDI_POSITIF',
  idQuestionnaire: 'Q_NEU_01',
  dateReponse: new Date('2026-02-01T09:00:00.000Z'),
  scoresJson: { rawAnswers: { B7: 2 } },
  statutValidite: 'VALID',
};
const NON = { ...POSITIF, idReponse: 'REP_BDI_NON', scoresJson: { rawAnswers: { B7: 0 } } };

/** Une passation du banc : catalogue ou cabinet ([[D-515]]), réponses quelconques. */
type PassationParite = Omit<typeof POSITIF, 'scoresJson'> & { scoresJson: unknown };

function poserDossier(anamnese: typeof ANAMNESE_C1_FIXTURE, passations: PassationParite[]) {
  prisma.consultation.findMany.mockResolvedValue([
    { id: 'CONS_PORTEUSE', idPatient: 'PAT_1', dateValidation: new Date('2026-01-15T09:00:00.000Z'), ...anamnese },
  ]);
  prisma.questionnaireReponse.findMany.mockResolvedValue(passations.map(p => ({ ...p, idPatient: 'PAT_1' })));
}

function constatsDuCockpit(anamnese: typeof ANAMNESE_C1_FIXTURE, passations: PassationParite[]): string[] {
  const chaine = chaineC1DeReference({ anamnese, passationsSecurite: passations });
  return chaine.review.safetyFindings.map(f => f.findingId).sort();
}

beforeEach(() => signerTablePriorites());
afterEach(() => {
  retablirTablePriorites();
  vi.clearAllMocks();
});

describe('parité cockpit ↔ Fil — les mêmes constats de sécurité ouverts', () => {
  it('passation positive : le Fil porte EXACTEMENT les constats que le cockpit suspend', async () => {
    poserDossier(ANAMNESE_C1_FIXTURE, [POSITIF]);
    const cockpit = constatsDuCockpit(ANAMNESE_C1_FIXTURE, [POSITIF]);
    expect(cockpit.filter(estFindingQuestionnaire)).toHaveLength(1);

    const fil = await lireSignauxSecuriteOuverts('praticien@wellneuro.fr');
    expect(fil).toHaveLength(1);
    expect(fil[0].findingIds).toEqual(cockpit);
  });

  it('positive ET signal d’alerte d’anamnèse : les deux sources, des deux côtés', async () => {
    poserDossier(ANAMNESE_C1_FIXTURE_AVEC_SIGNAL, [POSITIF]);
    const cockpit = constatsDuCockpit(ANAMNESE_C1_FIXTURE_AVEC_SIGNAL, [POSITIF]);
    expect(cockpit.length).toBeGreaterThan(1);

    const fil = await lireSignauxSecuriteOuverts('praticien@wellneuro.fr');
    expect(fil[0].findingIds).toEqual(cockpit);
  });

  it('contre-épreuve : une réponse « non » n’ouvre rien, ni au cockpit ni au Fil', async () => {
    poserDossier(ANAMNESE_C1_FIXTURE, [NON]);
    expect(constatsDuCockpit(ANAMNESE_C1_FIXTURE, [NON])).toEqual([]);
    expect(await lireSignauxSecuriteOuverts('praticien@wellneuro.fr')).toEqual([]);
  });
});

// [[D-515]] (PR 3 du lot de code, demande routée de la revue de la PR 2) : la
// même parité sur un instrument du cabinet. Le Fil lit la passation `CAB_` et
// joint la désignation copiée par `joindreDesignationsCabinet` ; le cockpit
// reçoit la même passation, jointe de la même désignation. Les deux doivent
// porter les mêmes constats — celui de `SAF-QUEST-02` compris, table signée.
describe('parité cockpit ↔ Fil — un instrument du cabinet ([[D-515]])', () => {
  const ASSIGNATION = {
    idAssignation: 'ASS_CAB_PARITE',
    titre: 'Humeur du cabinet',
    poseQuestionSuicide: true,
    questionSuicideId: 'Q2',
    questionSuicideOptionNon: 0,
    questionSuicideCopie: { instrument: 'Humeur du cabinet', enonce: 'Idées noires', options: [{ v: 0, l: 'Jamais' }, { v: 2, l: 'Souvent' }] },
  };
  const CAB_POSITIF = {
    idReponse: 'REP_CAB_POSITIF',
    idQuestionnaire: 'CAB_PARITE',
    dateReponse: new Date('2026-02-02T09:00:00.000Z'),
    scoresJson: { rawAnswers: { Q1: 2, Q2: 2 } },
    statutValidite: 'VALID',
    idAssignation: ASSIGNATION.idAssignation,
  };
  const CAB_NON = { ...CAB_POSITIF, idReponse: 'REP_CAB_NON', scoresJson: { rawAnswers: { Q1: 2, Q2: 0 } } };
  const ETAT_LIVRE = { ...SAFETY_QUESTIONNAIRE_CABINET_METADATA };

  function signer(): void {
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.validationExterne = true;
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.dateValidation = '2026-11-14T00:00:00.000Z';
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.sourceReference = 'Signature simulée par le banc — jamais servie en production.';
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.shaPerimetre = SAFETY_QUESTIONNAIRE_CABINET_SHA256;
  }

  /** La passation que le cockpit reçoit : jointe de la même désignation. */
  const jointe = <T extends object>(passation: T) => ({ ...passation, designationCabinet: designationDeLAssignation(ASSIGNATION) });

  beforeEach(() => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    prisma.assignation.findMany.mockResolvedValue([ASSIGNATION]);
  });
  afterEach(() => {
    Object.assign(SAFETY_QUESTIONNAIRE_CABINET_METADATA, ETAT_LIVRE);
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
  });

  it('table signée, passation positive : le Fil porte EXACTEMENT les constats du cockpit, celui du cabinet compris', async () => {
    signer();
    poserDossier(ANAMNESE_C1_FIXTURE, [CAB_POSITIF]);
    const cockpit = constatsDuCockpit(ANAMNESE_C1_FIXTURE, [jointe(CAB_POSITIF)]);
    expect(cockpit.filter(estFindingQuestionnaire)).toHaveLength(1);

    const fil = await lireSignauxSecuriteOuverts('praticien@wellneuro.fr');
    expect(fil).toHaveLength(1);
    expect(fil[0].findingIds).toEqual(cockpit);
    expect(prisma.assignation.findMany).toHaveBeenCalledTimes(1);
  });

  it('table signée, catalogue ET cabinet positifs : les deux constats, des deux côtés', async () => {
    signer();
    poserDossier(ANAMNESE_C1_FIXTURE, [POSITIF, CAB_POSITIF]);
    const cockpit = constatsDuCockpit(ANAMNESE_C1_FIXTURE, [POSITIF, jointe(CAB_POSITIF)]);
    expect(cockpit.filter(estFindingQuestionnaire)).toHaveLength(2);

    const fil = await lireSignauxSecuriteOuverts('praticien@wellneuro.fr');
    expect(fil[0].findingIds).toEqual(cockpit);
  });

  it('contre-épreuves : la valeur « non » copiée, ou la table non signée, n’ouvrent rien, ni au cockpit ni au Fil', async () => {
    signer();
    poserDossier(ANAMNESE_C1_FIXTURE, [CAB_NON]);
    expect(constatsDuCockpit(ANAMNESE_C1_FIXTURE, [jointe(CAB_NON)])).toEqual([]);
    expect(await lireSignauxSecuriteOuverts('praticien@wellneuro.fr')).toEqual([]);

    Object.assign(SAFETY_QUESTIONNAIRE_CABINET_METADATA, ETAT_LIVRE);
    poserDossier(ANAMNESE_C1_FIXTURE, [CAB_POSITIF]);
    expect(constatsDuCockpit(ANAMNESE_C1_FIXTURE, [jointe(CAB_POSITIF)])).toEqual([]);
    expect(await lireSignauxSecuriteOuverts('praticien@wellneuro.fr')).toEqual([]);
  });
});
