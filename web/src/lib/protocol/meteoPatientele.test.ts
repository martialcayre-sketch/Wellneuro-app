import { describe, expect, it } from 'vitest';
import { lignesMeteoPatientele } from './meteoPatientele';
import type { CheckinRow, PointEtape } from './checkinDomain';

// Patients fictifs autorisés uniquement (CLAUDE.md).
const PATIENTS = [
  { idPatient: 'P-SOPHIE', nomComplet: 'Sophie Nicola' },
  { idPatient: 'P-JENNIFER', nomComplet: 'Jennifer Martin' },
  { idPatient: 'P-MICHEL', nomComplet: 'Michel Dogné' },
];

function checkin(
  idPatient: string,
  pointEtape: PointEtape,
  adhesion: string,
  soumisLe: string,
): CheckinRow {
  return {
    id: `${idPatient}-${pointEtape}`,
    idPatient,
    idAssignation: 'ASG',
    protocolDraftId: 'DRAFT',
    pointEtape,
    reponses: { adhesion, tolerance: 'bien', energie: 'stable', sommeil: 'stable' } as CheckinRow['reponses'],
    canal: 'portail',
    supersedesCheckinId: null,
    soumisLe,
  };
}

describe('lignesMeteoPatientele', () => {
  it('trie interrompue > fragile > régulière, puis par nom, et compte les indéterminées', () => {
    const parPatient = new Map<string, CheckinRow[]>([
      ['P-SOPHIE', [checkin('P-SOPHIE', 'J14', 'tous_les_jours', '2026-07-14T08:00:00.000Z')]],
      ['P-JENNIFER', [checkin('P-JENNIFER', 'J14', 'pas_encore', '2026-07-14T08:00:00.000Z')]],
      // Michel : aucun check-in → indéterminé.
    ]);
    const { determinees, nbIndeterminees } = lignesMeteoPatientele(PATIENTS, parPatient);

    expect(determinees.map(l => l.patient)).toEqual(['Jennifer Martin', 'Sophie Nicola']);
    expect(determinees[0].etat).toBe('interrompue');
    expect(determinees[1].etat).toBe('reguliere');
    // Michel, sans point d'étape exploitable, est compté — jamais reclassé.
    expect(nbIndeterminees).toBe(1);
  });

  it('à état égal, ordonne alphabétiquement par nom', () => {
    const parPatient = new Map<string, CheckinRow[]>([
      ['P-SOPHIE', [checkin('P-SOPHIE', 'J7', 'quelques_jours', '2026-07-14T08:00:00.000Z')]],
      ['P-JENNIFER', [checkin('P-JENNIFER', 'J7', 'quelques_jours', '2026-07-14T08:00:00.000Z')]],
    ]);
    const { determinees } = lignesMeteoPatientele(PATIENTS, parPatient);
    expect(determinees.every(l => l.etat === 'fragile')).toBe(true);
    expect(determinees.map(l => l.patient)).toEqual(['Jennifer Martin', 'Sophie Nicola']);
  });

  it('un patient sans check-in exploitable est indéterminé, jamais interrompu par défaut', () => {
    const { determinees, nbIndeterminees } = lignesMeteoPatientele(
      [{ idPatient: 'P-SOPHIE', nomComplet: 'Sophie Nicola' }],
      new Map(),
    );
    expect(determinees).toEqual([]);
    expect(nbIndeterminees).toBe(1);
  });
});
