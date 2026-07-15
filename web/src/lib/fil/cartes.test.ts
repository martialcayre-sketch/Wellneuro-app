import { describe, expect, it } from 'vitest';
import {
  cartesAssignationsEnRetard,
  cartesReponsesRecentes,
  cartesReprise,
  cartesSynthesesAValider,
  construireFil,
  MAX_CARTES_PAR_TYPE,
} from './cartes';

// Patients fictifs autorisés uniquement (CLAUDE.md).
const NOMS = new Map([
  ['P-SOPHIE', 'Sophie Nicola'],
  ['P-JENNIFER', 'Jennifer Martin'],
  ['P-MICHEL', 'Michel Dogné'],
]);

const MAINTENANT = new Date('2026-07-15T10:00:00');

describe('cartesSynthesesAValider', () => {
  it('trie par date décroissante et pointe vers la page synthèse', () => {
    const cartes = cartesSynthesesAValider(
      [
        { idPatient: 'P-SOPHIE', dateGeneration: new Date('2026-07-10T09:00:00') },
        { idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-14T09:00:00') },
      ],
      NOMS,
    );
    expect(cartes.map(c => c.patient)).toEqual(['Jennifer Martin', 'Sophie Nicola']);
    expect(cartes[0].href).toBe('/dashboard/synthese');
    expect(cartes[0].pourquoi).toContain('validation');
  });
});

describe('cartesAssignationsEnRetard', () => {
  it('ne retient que les assignations non complétées dont la limite est dépassée', () => {
    const cartes = cartesAssignationsEnRetard(
      [
        { idPatient: 'P-MICHEL', titre: 'Mode de vie SIIN', dateLimite: '2026-07-10', statut: 'En attente' },
        { idPatient: 'P-SOPHIE', titre: 'Plaintes', dateLimite: '2026-07-10', statut: 'Complété' },
        { idPatient: 'P-JENNIFER', titre: 'Alimentaire', dateLimite: '2026-07-20', statut: 'En attente' },
        { idPatient: 'P-JENNIFER', titre: 'DNSM', dateLimite: null, statut: 'En attente' },
      ],
      NOMS,
      MAINTENANT,
    );
    expect(cartes).toHaveLength(1);
    expect(cartes[0].patient).toBe('Michel Dogné');
    expect(cartes[0].pourquoi).toContain('5 jours');
    expect(cartes[0].href).toBe('/dashboard/patients/P-MICHEL');
  });

  it('ignore les dates limites invalides', () => {
    const cartes = cartesAssignationsEnRetard(
      [{ idPatient: 'P-MICHEL', titre: 'Q', dateLimite: 'hier', statut: 'En attente' }],
      NOMS,
      MAINTENANT,
    );
    expect(cartes).toHaveLength(0);
  });
});

describe('cartesReponsesRecentes', () => {
  it('ne retient que la fenêtre de récence et plafonne le nombre de cartes', () => {
    const recentes = Array.from({ length: 7 }, (_, i) => ({
      idPatient: 'P-SOPHIE',
      titre: `Questionnaire ${i}`,
      dateReponse: new Date(`2026-07-1${4 - (i % 5)}T08:00:00`),
    }));
    const vieille = { idPatient: 'P-MICHEL', titre: 'Ancien', dateReponse: new Date('2026-06-01T08:00:00') };
    const cartes = cartesReponsesRecentes([...recentes, vieille], NOMS, MAINTENANT);
    expect(cartes.length).toBe(MAX_CARTES_PAR_TYPE);
    expect(cartes.every(c => c.patient === 'Sophie Nicola')).toBe(true);
  });
});

describe('cartesReprise', () => {
  it('signale les patients inactifs depuis plus de six mois, sans pack', () => {
    const cartes = cartesReprise(
      [
        { idPatient: 'P-SOPHIE', derniereReponse: new Date('2025-09-01T08:00:00') },
        { idPatient: 'P-JENNIFER', derniereReponse: new Date('2026-07-01T08:00:00') },
      ],
      NOMS,
      MAINTENANT,
    );
    expect(cartes).toHaveLength(1);
    expect(cartes[0].patient).toBe('Sophie Nicola');
    expect(cartes[0].pourquoi).toContain('mois');
    expect(cartes[0].actionLabel).toBe('Ouvrir la fiche');
  });
});

describe('construireFil', () => {
  it('ordonne le Fil : synthèses, retards, réponses, reprises', () => {
    const fil = construireFil({
      syntheses: [{ idPatient: 'P-JENNIFER', dateGeneration: new Date('2026-07-14T09:00:00') }],
      assignations: [
        { idPatient: 'P-MICHEL', titre: 'Mode de vie', dateLimite: '2026-07-01', statut: 'En attente' },
      ],
      reponses: [
        { idPatient: 'P-SOPHIE', titre: 'Plaintes', dateReponse: new Date('2026-07-14T08:00:00') },
      ],
      activites: [{ idPatient: 'P-SOPHIE', derniereReponse: new Date('2025-08-01T08:00:00') }],
      noms: NOMS,
      maintenant: MAINTENANT,
    });
    expect(fil.map(c => c.type)).toEqual([
      'synthese_a_valider',
      'assignation_en_retard',
      'reponse_recente',
      'reprise',
    ]);
  });
});
