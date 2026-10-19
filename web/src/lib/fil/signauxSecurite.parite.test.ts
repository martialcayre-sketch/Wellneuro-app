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
import { lireSignauxSecuriteOuverts } from './signauxSecurite';

const POSITIF = {
  idReponse: 'REP_BDI_POSITIF',
  idQuestionnaire: 'Q_NEU_01',
  dateReponse: new Date('2026-02-01T09:00:00.000Z'),
  scoresJson: { rawAnswers: { B7: 2 } },
  statutValidite: 'VALID',
};
const NON = { ...POSITIF, idReponse: 'REP_BDI_NON', scoresJson: { rawAnswers: { B7: 0 } } };

function poserDossier(anamnese: typeof ANAMNESE_C1_FIXTURE, passations: (typeof POSITIF)[]) {
  prisma.consultation.findMany.mockResolvedValue([
    { id: 'CONS_PORTEUSE', idPatient: 'PAT_1', dateValidation: new Date('2026-01-15T09:00:00.000Z'), ...anamnese },
  ]);
  prisma.questionnaireReponse.findMany.mockResolvedValue(passations.map(p => ({ ...p, idPatient: 'PAT_1' })));
}

function constatsDuCockpit(anamnese: typeof ANAMNESE_C1_FIXTURE, passations: (typeof POSITIF)[]): string[] {
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
