import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, specificateursImportes } from './balayageSources';

// BP-01 ([[D-266]] §6) — le module de fiches d'usage du premier parcours
// (« exploration du besoin 2 ») est un module signé DISTINCT de
// `catalogueConduitesV1` : il ne l'alimente pas, ne crée aucun axe, ne
// sélectionne aucun tableau clinique ([[D-206]] A2 inchangé).
//
// Le module n'existe pas encore : ce banc ne peut pas le nommer. Il garde donc
// les deux portes par lesquelles il pourrait se brancher au catalogue :
//   1. ce que le catalogue IMPORTE — un module neuf qui l'alimenterait
//      apparaîtrait ici ;
//   2. qui IMPORTE le catalogue — un module neuf qui sélectionnerait par lui
//      apparaîtrait ici.
// Chaque liste ne s'élargit que par un diff relu de ce fichier.
// LIMITE : un module neuf qui sélectionnerait PAR un importeur listé
// (`indicationsAssiettesService`, `portesBiologiquesService`) échappe au
// balayage direct et relève de la revue.
const CATALOGUE = 'web/src/lib/clinical/catalogueConduitesV1.ts';

/** Ce que le catalogue importe : la seule fonction d'empreinte. */
const IMPORTS_DU_CATALOGUE = ['@/lib/clinical-engine/canonical'];

/** Les importeurs de production du catalogue, le jour du lot. */
const IMPORTEURS_DU_CATALOGUE = [
  'web/src/lib/clinical/indicationsAssiettesService.ts',
  'web/src/lib/clinical/indicationsAssiettesV1.ts',
  'web/src/lib/clinical/portesBiologiquesAssiettesV1.ts',
  'web/src/lib/clinical/portesBiologiquesService.ts',
  'web/src/lib/fiches-assiette/securite.ts',
];

function designeCatalogue(specificateur: string): boolean {
  return /(^|\/)catalogueConduitesV1$/.test(specificateur);
}

/** Pipeline pur des importeurs — extrait pour la contre-épreuve. */
export function importeursDuCatalogue(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin) && f.chemin !== CATALOGUE)
    .filter(f => specificateursImportes(f.source).some(designeCatalogue))
    .map(f => f.chemin)
    .sort();
}

describe('catalogueConduitesV1 — séparé du module « besoin 2 » (BP-01, D-266 §6)', () => {
  it('le catalogue n\'importe que ce qu\'il importait : aucun module neuf ne l\'alimente', () => {
    expect([...new Set(specificateursImportes(lire(CATALOGUE)))].sort()).toEqual([...IMPORTS_DU_CATALOGUE].sort());
  });

  it('aucun importeur neuf du catalogue : aucun module neuf ne sélectionne par lui', () => {
    const lus = importeursDuCatalogue(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));
    expect(
      lus,
      'importeur neuf de `catalogueConduitesV1` : vérifier qu\'il n\'est pas le module « besoin 2 » '
        + '(D-266 §6), puis l\'inscrire ici par un diff relu',
    ).toEqual([...IMPORTEURS_DU_CATALOGUE].sort());
  });

  // CONTRE-ÉPREUVE : la mutation attendue — un module de fiches d'usage qui
  // importe le catalogue — rougit, en alias comme en relatif.
  it('le pipeline voit un importeur neuf, en alias comme en relatif', () => {
    const lus = importeursDuCatalogue([
      { chemin: 'web/src/lib/fiches-usage/a.ts', source: "import { x } from '@/lib/clinical/catalogueConduitesV1';" },
      { chemin: 'web/src/lib/clinical/b.ts', source: "import { y } from './catalogueConduitesV1';" },
      { chemin: 'web/src/lib/clinical/c.ts', source: "import { z } from './catalogueConduitesV1Bis';" },
    ]);
    expect(lus).toEqual(['web/src/lib/clinical/b.ts', 'web/src/lib/fiches-usage/a.ts']);
  });
});
