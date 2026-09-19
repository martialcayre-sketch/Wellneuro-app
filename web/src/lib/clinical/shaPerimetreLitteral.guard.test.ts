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
  // Enrôlée par [[D-084]] — le jour même de son ancrage, pour ne pas rejouer
  // le retard d'une table que D-067 avait précisément nommé (revue de D-084,
  // constat M1).
  { fichier: 'corpusSyntheseV1.ts', constante: 'CORPUS_CLINIQUE_SHA256' },
  // Enrôlée le jour de sa première signature ([[D-198]]) — et pas à [[D-196]],
  // qui écrivait l'échelle SANS la signer : `shaPerimetre` valait alors `null`,
  // la première assertion ci-dessous aurait rougi. Le retard d'enrôlement est
  // exactement ce que D-067 puis D-084 ont eu à rattraper deux fois.
  { fichier: 'baremeChargeV1.ts', constante: 'BAREME_CHARGE_SHA256' },
  // Enrôlée le jour de sa première signature ([[D-223]], 2026-09-17) — livrée
  // verrou éteint la veille, elle n'aurait pas pu l'être alors : `shaPerimetre`
  // valait `null`. Même règle que le barème juste au-dessus, appliquée sans
  // attendre que quelqu'un ait à la rattraper une troisième fois.
  { fichier: 'tableRepliV1.ts', constante: 'TABLE_REPLI_SHA256' },
  // Enrôlé le jour de sa première signature ([[D-224]], 2026-09-17), comme sa
  // surface de relecture l'avait prévu. Sa tautologie n'aurait PAS la forme
  // `shaPerimetre: UNE_CONSTANTE` — ce module calcule par une fonction, donc
  // elle s'écrirait `shaPerimetre: shaPerimetreConduites(...)`. Le second test
  // l'attrape quand même : il n'admet que le littéral hex ou la déclaration de
  // type, et refuse tout le reste — un appel de fonction compris.
  { fichier: 'catalogueConduitesV1.ts', constante: 'shaPerimetreConduites' },
  // Enrôlé le jour de sa première signature ([[D-236]], 2026-09-19), comme sa
  // surface de relecture l'avait prévu et comme [[D-198]], [[D-223]] et
  // [[D-224]] l'ont fait avant elle. Sa tautologie s'écrirait
  // `shaPerimetre: shaPerimetreIndicationsAssiettes(...)` — une fonction, non
  // une constante recopiable : c'est la forme que le cas 2 refuse.
  { fichier: 'indicationsAssiettesV1.ts', constante: 'shaPerimetreIndicationsAssiettes' },
] as const;

describe('shaPerimetre — littéral figé dans les tables signées, jamais la constante', () => {
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
