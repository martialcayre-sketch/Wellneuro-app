import { describe, expect, it } from 'vitest';
import { estAnnulable } from './annulabilite';

// Table de vérité complète : 4 valeurs de `statutReponses` × 2 de `aPassation`
// × 3 de `statut`, soit 24 lignes. Le prédicat est en liste blanche
// (fail-closed) : seules `non_rempli` et `deverrouille`, sans passation et
// hors `Complété`, sont annulables.
describe('estAnnulable — table de vérité', () => {
  const STATUTS_REPONSES = ['non_rempli', 'verrouille', 'modification_demandee', 'deverrouille'] as const;
  const STATUTS = ['En attente', 'Complété', 'Annulée'] as const;

  for (const statut of STATUTS) {
    for (const statutReponses of STATUTS_REPONSES) {
      for (const aPassation of [false, true]) {
        const attendu =
          statut !== 'Complété' &&
          (statutReponses === 'non_rempli' || statutReponses === 'deverrouille') &&
          !aPassation;
        it(`statut=${statut}, statutReponses=${statutReponses}, aPassation=${aPassation} → ${attendu}`, () => {
          expect(estAnnulable({ statut, statutReponses, aPassation })).toBe(attendu);
        });
      }
    }
  }
});

describe('estAnnulable — cas nommés', () => {
  it('non_rempli sans passation, En attente : annulable (cas courant)', () => {
    expect(estAnnulable({ statut: 'En attente', statutReponses: 'non_rempli', aPassation: false })).toBe(true);
  });

  it('deverrouille sans passation : annulable — réouverture, pas une soumission', () => {
    expect(estAnnulable({ statut: 'En attente', statutReponses: 'deverrouille', aPassation: false })).toBe(true);
  });

  // Contrôle négatif du cas précédent : si `aPassation` était ignoré, cette
  // ligne passerait à tort.
  it('deverrouille AVEC passation : refusé — une réouverture peut recouvrir une soumission réelle', () => {
    expect(estAnnulable({ statut: 'En attente', statutReponses: 'deverrouille', aPassation: true })).toBe(false);
  });

  it('verrouille : toujours refusé, passation ou non (soumission attestée par construction)', () => {
    expect(estAnnulable({ statut: 'Complété', statutReponses: 'verrouille', aPassation: true })).toBe(false);
    expect(estAnnulable({ statut: 'Complété', statutReponses: 'verrouille', aPassation: false })).toBe(false);
  });

  it('modification_demandee : toujours refusé — atteignable seulement depuis verrouille', () => {
    expect(estAnnulable({ statut: 'Complété', statutReponses: 'modification_demandee', aPassation: true })).toBe(
      false,
    );
  });

  it('statut=Complété force le refus même si statutReponses vaut non_rempli (incohérence défensive)', () => {
    expect(estAnnulable({ statut: 'Complété', statutReponses: 'non_rempli', aPassation: false })).toBe(false);
  });

  // Fail-closed : une cinquième valeur (String libre, pas d'enum) doit FERMER
  // l'annulation, jamais l'ouvrir par défaut.
  it('une valeur de statutReponses hors des 4 connues est refusée (fail-closed)', () => {
    expect(estAnnulable({ statut: 'En attente', statutReponses: 'valeur_future_inconnue', aPassation: false })).toBe(
      false,
    );
  });

  it('non_rempli avec passation : refusé — le comptage prime sur le statut affiché', () => {
    // Cas de la course avec `submit` : `statutReponses` peut encore lire
    // `non_rempli` alors qu'une `QuestionnaireReponse` existe déjà.
    expect(estAnnulable({ statut: 'En attente', statutReponses: 'non_rempli', aPassation: true })).toBe(false);
  });

  it('statut=Annulée, non_rempli, sans passation : le prédicat seul dit annulable — l’exclusion écran est ailleurs', () => {
    // `estAnnulable` ne connaît pas l'idempotence d'écran (pas de bouton sur
    // une ligne déjà annulée) : c'est un choix délibéré de l'appelant
    // (`PatientsPanel`), documenté à son site d'appel, pas ici — la route
    // reste idempotente sur `Annulée` (200 sans ré-écriture).
    expect(estAnnulable({ statut: 'Annulée', statutReponses: 'non_rempli', aPassation: false })).toBe(true);
  });
});
