import { describe, expect, it } from 'vitest';
import { mapAssignationPatient } from './mapAssignation';

const base = {
  idAssignation: 'ASS_1',
  idQuestionnaire: 'Q_NEU_03',
  titre: 'Questionnaire test',
  statut: 'En attente',
  statutReponses: 'non_rempli',
  dateLimite: null as string | null,
};

describe('mapAssignationPatient — estEnAttenteSaisie', () => {
  it('une assignation ouverte non expirée est à saisir', () => {
    expect(mapAssignationPatient(base).estEnAttenteSaisie).toBe(true);
  });

  it('une assignation complétée n’est plus à saisir', () => {
    expect(
      mapAssignationPatient({ ...base, statut: 'Complété', statutReponses: 'verrouille' }).estEnAttenteSaisie,
    ).toBe(false);
  });

  it('une assignation ANNULÉE quitte la liste à saisir', () => {
    // Sans l'exclusion, son statut n'étant ni 'Complété' ni expiré, elle y
    // resterait — c'est le trou que Fil A ferme côté projection patient.
    expect(mapAssignationPatient({ ...base, statut: 'Annulée' }).estEnAttenteSaisie).toBe(false);
  });
});
