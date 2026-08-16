import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Garde de SOURCE, pas d'exécution — patron `indicationsBiologieV1.guard.test.ts`,
// étendu aux quatre tables historiques par [[D-067]] (finding M2 de la revue :
// « le patron D-063 est étendu, son garde ne l'est pas »).
//
// POURQUOI LIRE LE TEXTE : aucune assertion à l'exécution ne peut distinguer un
// littéral figé d'une référence tautologique à la constante calculée — les deux
// rendent une chaîne hex identique. Or la tautologie est exactement le geste du
// mainteneur pressé : une règle éditée fait rougir le banc de concordance, et le
// « réparer » en câblant `shaPerimetre: LA_CONSTANTE` rendrait la concordance
// toujours vraie — le verrou rouvert sans re-signature praticien, la péremption
// plus jamais détectée. Ce garde fait rougir CE geste-là, au seul endroit où il
// est visible : le source.
const TABLES = [
  { fichier: 'orientationRulesV1.ts', constante: 'ORIENTATION_RULES_SHA256' },
  { fichier: 'priorityRulesV1.ts', constante: 'PRIORITY_RULES_SHA256' },
  { fichier: 'stopRulesV1.ts', constante: 'STOP_RULES_SHA256' },
  { fichier: 'contradictionsV1.ts', constante: 'CONTRADICTIONS_RULES_SHA256' },
] as const;

describe('shaPerimetre — littéral figé dans les quatre tables, jamais la constante', () => {
  for (const table of TABLES) {
    const source = readFileSync(join(__dirname, table.fichier), 'utf8');

    it(`${table.fichier} : le shaPerimetre posé est une chaîne hex en dur`, () => {
      // La métadonnée porte un littéral de 64 hex — la forme que le CHECK de la
      // base impose aussi aux empreintes, et la seule que ce garde accepte.
      expect(source).toMatch(/shaPerimetre:\s*'[a-f0-9]{64}'/);
    });

    it(`${table.fichier} : jamais \`shaPerimetre: ${table.constante}\``, () => {
      // Ligne à ligne, HORS commentaires : la mise en garde « SURTOUT PAS »
      // cite elle-même le motif interdit — un balayage du texte entier se
      // ferait rougir par sa propre pancarte. Ne sont jugées que les lignes de
      // CODE qui affectent la propriété.
      // Une ligne de commentaire commence par `//` ou `*` : elle ne peut pas
      // matcher `^\s*shaPerimetre:`. Restent la déclaration de type
      // (`string | null`) et l'affectation dans la métadonnée — les deux
      // seules formes admises.
      const affectations = source.split('\n').filter(ligne => /^\s*shaPerimetre:/.test(ligne));
      expect(affectations.length, `${table.fichier} : aucune affectation trouvée`).toBeGreaterThan(0);
      for (const ligne of affectations) {
        expect(ligne, 'référence à une constante au lieu du littéral figé').not.toMatch(/SHA256/);
        expect(ligne).toMatch(/shaPerimetre:\s*(?:'[a-f0-9]{64}',|string \| null;)/);
      }
    });

    it(`${table.fichier} : la mise en garde contre la tautologie est écrite sur place`, () => {
      // Le commentaire est une DONNÉE de ce garde, pas une politesse : c'est lui
      // qui explique au mainteneur pourquoi le littéral est un littéral, au
      // moment exact où il s'apprête à le « simplifier ».
      expect(/tautolog/i.test(source), `${table.fichier} ne porte plus la mise en garde`).toBe(true);
    });
  }
});
