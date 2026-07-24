import { describe, expect, it } from 'vitest';
import type { CheckinReponses, CheckinRow, PointEtape } from './checkinDomain';
import { deriverMeteoAdhesion } from './adhesion';

const reponses = (partiel: Partial<CheckinReponses> = {}): CheckinReponses => ({
  adhesion: 'plupart_des_jours',
  tolerance: 'bien',
  energie: 'stable',
  sommeil: 'stable',
  ...partiel,
});

const checkin = (
  id: string,
  pointEtape: PointEtape,
  soumisLe: string,
  partiel: Partial<CheckinReponses> = {},
): CheckinRow => ({
  id,
  idPatient: 'PAT_SEED_01',
  idAssignation: 'ASG_1',
  protocolDraftId: 'DRAFT_1',
  pointEtape,
  reponses: reponses(partiel),
  canal: 'portail',
  supersedesCheckinId: null,
  soumisLe,
});

// Deliverable 2 : la réponse `observance_complements` entre comme FAIT OBSERVÉ
// supplémentaire — sans deuxième météo, sans pondération, sans nouvel agrégat.
// La forme de la météo reste identique : 3 états + indéterminée, dérivés de la
// seule question `adhesion`.
describe('deriverMeteoAdhesion — observance compléments comme fait observé', () => {
  it('la réponse compléments est rapportée verbatim, sourcée sur son point d’étape', () => {
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J14', '2026-01-15T10:00:00.000Z', {
        adhesion: 'plupart_des_jours',
        observance_complements: 'quelques_prises',
      }),
    ]);
    expect(meteo.faitsObserves).toContain('Compléments : « Quelques prises »');
    expect(meteo.pointEtapeSource).toBe('J14');
    expect(meteo.dateSource).toBe('2026-01-15T10:00:00.000Z');
  });

  it('le motif facultatif entre aussi comme fait observé, jamais culpabilisant', () => {
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J14', '2026-01-15T10:00:00.000Z', {
        observance_complements: 'pas_encore_commence',
        observance_complements_motif: 'gene_digestive',
      }),
    ]);
    expect(meteo.faitsObserves).toContain('Compléments : « Pas encore commencé »');
    expect(meteo.faitsObserves).toContain('Frein compléments rapporté : « Gêne digestive »');
  });

  it('l’observance ne change JAMAIS l’état (dérivé de la seule adhésion)', () => {
    // Adhésion « pas encore » → interrompue, quelle que soit l’observance compléments.
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J14', '2026-01-15T10:00:00.000Z', {
        adhesion: 'pas_encore',
        observance_complements: 'tous_les_jours',
      }),
    ]);
    expect(meteo.etat).toBe('interrompue');
  });

  it('absence de réponse compléments → aucun fait ajouté (aucune inférence)', () => {
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J14', '2026-01-15T10:00:00.000Z', { tolerance: 'bien' }),
    ]);
    // Seul le fait d’adhésion, comme avant l’extension.
    expect(meteo.faitsObserves).toEqual(['Action principale : « La plupart des jours »']);
  });

  it('la forme de la météo est inchangée : 3 états + indéterminée, aucun pourcentage', () => {
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J21', '2026-01-22T10:00:00.000Z', {
        adhesion: 'tous_les_jours',
        tolerance: 'quelques_genes',
        observance_complements: 'plupart_des_jours',
      }),
    ]);
    expect(['reguliere', 'fragile', 'interrompue', 'indeterminee']).toContain(meteo.etat);
    // Aucun fait ne contient de pourcentage ni de score chiffré.
    for (const fait of meteo.faitsObserves) {
      expect(fait).not.toMatch(/%|\d+\s*\/\s*\d+/);
    }
    // La structure retournée reste exactement celle de SP-MET.
    expect(Object.keys(meteo).sort()).toEqual(
      ['dateSource', 'etat', 'faitsObserves', 'pointEtapeSource', 'pointsEtapeRenseignes'].sort(),
    );
  });
});
