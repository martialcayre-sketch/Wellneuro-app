import { describe, expect, it } from 'vitest';

import {
  fusionnerProvenances,
  lignesProvenance,
  lignesProvenanceMomentum,
  provenanceEtablie,
  provenanceMomentumEtablie,
} from './provenanceChiffre';

// [[D-333]] §2 règle 1 : chaque chiffre dit sa source, sa version et sa date ;
// sans source enregistrée, il ne s'affiche pas.
describe('provenanceChiffre', () => {
  const source = (idQuestionnaire: string, dateReponse: string | null) => ({ idQuestionnaire, dateReponse });

  it('établie : au moins une source, chacune datée', () => {
    expect(provenanceEtablie({ sources: [source('Q_NEU_11', '2026-10-01T10:00:00.000Z')], versionCalcul: 'v15' })).toBe(true);
  });

  it('non établie : champ absent, liste vide, ou une source sans date', () => {
    expect(provenanceEtablie(undefined)).toBe(false);
    expect(provenanceEtablie(null)).toBe(false);
    expect(provenanceEtablie({ sources: [], versionCalcul: 'v15' })).toBe(false);
    expect(
      provenanceEtablie({
        sources: [source('Q_NEU_11', '2026-10-01T10:00:00.000Z'), source('Q_STR_02', null)],
        versionCalcul: 'v15',
      }),
    ).toBe(false);
  });

  it('dit chaque questionnaire à sa date, puis la version du calcul', () => {
    expect(
      lignesProvenance({
        sources: [source('Q_NEU_11', '2026-10-01T10:00:00.000Z'), source('Q_STR_02', '2026-09-12T08:00:00.000Z')],
        versionCalcul: 'v15',
      }),
    ).toEqual([
      'Questionnaires : Q_NEU_11 (réponse du 01/10/2026), Q_STR_02 (réponse du 12/09/2026)',
      'Version du calcul : v15',
    ]);
  });

  it('une formule sans version le dit, sans en emprunter une', () => {
    expect(lignesProvenance({ sources: [source('Q_INF_01', '2026-10-02T10:00:00.000Z')], versionCalcul: null })).toEqual([
      'Questionnaire : Q_INF_01 (réponse du 02/10/2026)',
      'Formule non versionnée',
    ]);
  });

  it('la date se lit à Paris : une réponse à 23 h 30 UTC reste au lendemain', () => {
    expect(lignesProvenance({ sources: [source('Q_INF_01', '2026-10-01T23:30:00.000Z')], versionCalcul: null })[0]).toBe(
      'Questionnaire : Q_INF_01 (réponse du 02/10/2026)',
    );
  });

  it('momentum : les deux jalons soustraits, à leur date', () => {
    const p = {
      depart: { jalon: 'T0', date: '2026-08-01T10:00:00.000Z' },
      arrivee: { jalon: 'J21', date: '2026-08-22T10:00:00.000Z' },
      versionCalcul: 'v15',
    };
    expect(provenanceMomentumEtablie(p)).toBe(true);
    expect(lignesProvenanceMomentum(p)).toEqual([
      "Écart de l'indice global entre l'état au T0 (01/08/2026) et l'état au J21 (22/08/2026)",
      'Version du calcul : v15',
    ]);
    expect(provenanceMomentumEtablie({ ...p, arrivee: { jalon: 'J21', date: null } })).toBe(false);
    expect(provenanceMomentumEtablie(undefined)).toBe(false);
  });

  // r3_09 : la provenance du radar, figure de plusieurs chiffres.
  it('fusion : les sources établies, une fois chacune, dans l’ordre reçu', () => {
    const a = { sources: [source('Q_SOM_01', '2026-10-10T08:00:00.000Z')], versionCalcul: 'v15' };
    const b = {
      sources: [source('Q_INF_03', '2026-10-12T08:00:00.000Z'), source('Q_SOM_01', '2026-10-10T08:00:00.000Z')],
      versionCalcul: 'v15',
    };
    const sansDate = { sources: [source('Q_STR_02', null)], versionCalcul: 'v15' };
    expect(fusionnerProvenances([a, null, sansDate, b, undefined])).toEqual({
      sources: [source('Q_SOM_01', '2026-10-10T08:00:00.000Z'), source('Q_INF_03', '2026-10-12T08:00:00.000Z')],
      versionCalcul: 'v15',
    });
  });

  it('fusion : rien d’établi ne se fusionne pas', () => {
    expect(fusionnerProvenances([null, undefined])).toBeNull();
  });

  // Revue r3_09 : deux versions ne rendent pas la figure muette — chacune est dite.
  it('fusion : deux versions sont dites toutes deux, jamais résumées', () => {
    const p = fusionnerProvenances([
      { sources: [source('Q_SOM_01', '2026-10-10T08:00:00.000Z')], versionCalcul: 'v14' },
      { sources: [source('Q_INF_03', '2026-10-12T08:00:00.000Z')], versionCalcul: 'v15' },
    ]);
    expect(p?.versionCalcul).toBe('v14, v15');
    expect(lignesProvenance(p!)[1]).toBe('Version du calcul : v14, v15');
  });
});
