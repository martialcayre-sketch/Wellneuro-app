import { describe, expect, it } from 'vitest';
import { sha256 } from './corpusSyntheseV1';
import { ORIENTATION_METADATA, ORIENTATION_RULES_SHA256, ORIENTATION_RULES_V1 } from './orientationRulesV1';
import { idBaseDepuisPackId, type PackId } from '@/lib/questionnaires-functional';

// Épinglage du verrou sombre (patron questions.pss10.test.ts) : si ce test
// casse, la table de règles ou son statut de validation a changé — cela
// n'arrive légitimement qu'au lot 9 (table compilée signée par le praticien),
// avec arbitrage explicite et fragment changelog.
describe('orientationRulesV1 — verrou v1', () => {
  it('la table v1 est vide et non validée (dark par construction)', () => {
    // Trois marqueurs, pas un : la route exige les trois pour s'ouvrir.
    expect(ORIENTATION_RULES_V1).toEqual([]);
    expect(ORIENTATION_METADATA.validationExterne).toBe(false);
    expect(ORIENTATION_METADATA.dateValidation).toBeNull();
    expect(ORIENTATION_METADATA.claimsSource).toEqual([]);
    expect(ORIENTATION_METADATA.version).toBe('orientation-nnpp2-v1');
  });

  it('le sha publié correspond au contenu de la table', () => {
    expect(ORIENTATION_RULES_SHA256).toBe(sha256(JSON.stringify(ORIENTATION_RULES_V1)));
  });

  // Vacant tant que la table est vide — et c'est exactement pourquoi il est
  // écrit MAINTENANT. Au lot 9, une règle citant un pack sans existence en base
  // (`idPackBase: null`) ne recommanderait rien, en silence : le fail-closed
  // rejette une composition absente sans rien dire. Ce banc transforme ce
  // silence en échec de CI.
  it('chaque pack cité par une règle existe réellement en base', () => {
    const inassignables = ORIENTATION_RULES_V1.flatMap(regle =>
      (regle.suggestions ?? [])
        .map(suggestion => suggestion.packId)
        .filter((packId): packId is PackId => Boolean(packId))
        .filter(packId => idBaseDepuisPackId(packId) === null)
        .map(packId => `${regle.id} → ${packId}`),
    );
    expect(inassignables).toEqual([]);
  });
});
