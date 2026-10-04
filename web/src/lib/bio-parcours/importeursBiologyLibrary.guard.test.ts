import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RACINE, estUnTest, fichiersSource, lire, specificateursImportes } from './balayageSources';

// BP-01 ([[D-266]]) — l'import de `biology-library` est interdit hors liste
// blanche NOMINATIVE. Le jour du lot, 26 fichiers de production l'importent :
// la liste les fige tous (arbitrage du 2026-10-04), et chaque entrée neuve
// passe par un diff relu de CE fichier. Le lecteur d'attente C4 s'y inscrira
// le jour venu, avec son motif.
// LIMITE : le banc juge l'import DIRECT. Un module neuf qui passerait par un
// importeur listé (un service, par exemple) lirait la biologie sans figurer
// ici ; ce chemin indirect relève de la revue.
//
// PÉRIMÈTRE : le code de production de `web/src`. Les bancs et tests en sont
// exclus (ils importent le module pour l'éprouver), le module lui-même aussi.
// Une prose qui CITE `biology-library` n'est pas un import (six fichiers le
// font) : seules les lignes de code comptent.
//
// DEUX SENS : un importeur absent de la liste rougit ; une entrée qui n'importe
// plus rougit aussi — une liste blanche qui se périme finit par couvrir un
// fichier qu'on ne relit plus.
const IMPORTEURS_ADMIS = [
  // Routes praticien de la biologie.
  'web/src/app/api/praticien/biologie/arbitrage/route.ts',
  'web/src/app/api/praticien/biologie/catalogue/route.ts',
  'web/src/app/api/praticien/biologie/import/compte-rendu/route.ts',
  'web/src/app/api/praticien/biologie/import/decisions/route.ts',
  'web/src/app/api/praticien/biologie/import/depot/route.ts',
  'web/src/app/api/praticien/biologie/import/extraction/route.ts',
  'web/src/app/api/praticien/biologie/import/route.ts',
  'web/src/app/api/praticien/biologie/proposition/courrier/route.ts',
  'web/src/app/api/praticien/biologie/proposition/document-patient/route.ts',
  'web/src/app/api/praticien/biologie/proposition/route.ts',
  'web/src/app/api/praticien/biologie/resultats/bilan/route.ts',
  'web/src/app/api/praticien/biologie/resultats/route.ts',
  // Routes praticien hors biologie : cockpit, fil, et refus de résolution d'une
  // version tant qu'un arbitrage biologique est ouvert.
  'web/src/app/api/praticien/cockpit/route.ts',
  'web/src/app/api/praticien/fil/route.ts',
  'web/src/app/api/praticien/protocoles/versions/route.ts',
  // Pages et composants praticien.
  'web/src/app/dashboard/bibliotheque/page.tsx',
  'web/src/app/dashboard/biologie/page.tsx',
  'web/src/app/dashboard/patients/[idPatient]/page.tsx',
  'web/src/components/biologie/FicheAnalytePanel.tsx',
  'web/src/components/biologie/RayonBiologiePanel.tsx',
  'web/src/components/patient-cockpit/ArbitrageBiologiquePanel.tsx',
  'web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx',
  'web/src/components/patient-cockpit/ImportCompteRenduPanel.tsx',
  'web/src/components/patient-cockpit/PropositionBilanPanel.tsx',
  // Portes biologiques des assiettes ([[D-245]]).
  'web/src/lib/clinical/portesBiologiquesService.ts',
  // Ancrage des courriers.
  'web/src/lib/praticien/ancrageCorrespondance.ts',
];

/** Un spécificateur qui désigne le module, en alias `@/` ou en relatif. */
function designeBiologyLibrary(specificateur: string): boolean {
  return /(^|\/)biology-library(\/|$)/.test(specificateur);
}

/** Le pipeline de lecture, pur — extrait pour être éprouvé (contre-épreuve). */
export function importeursDe(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => !f.chemin.startsWith('web/src/lib/biology-library/'))
    .filter(f => specificateursImportes(f.source).some(designeBiologyLibrary))
    .map(f => f.chemin)
    .sort();
}

describe('biology-library — liste blanche nominative des importeurs (BP-01)', () => {
  it('aucun importeur de production hors de la liste, aucune entrée périmée', () => {
    const lus = importeursDe(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));
    expect(
      lus,
      'importeur neuf de `biology-library` : l\'inscrire ici par un diff relu, avec son motif ; '
        + 'entrée qui n\'importe plus : la retirer',
    ).toEqual([...IMPORTEURS_ADMIS].sort());
  });

  it('chaque entrée désigne un fichier réel', () => {
    for (const chemin of IMPORTEURS_ADMIS) {
      expect(existsSync(join(RACINE, chemin)), `entrée périmée : ${chemin}`).toBe(true);
    }
  });

  // CONTRE-ÉPREUVE : la mutation que ce banc doit attraper — un module neuf
  // qui importe la bibliothèque — rougit, en alias comme en relatif, en import
  // statique comme dynamique ; une simple mention en commentaire ne rougit pas.
  it('le pipeline voit un import neuf, ignore une mention et un banc', () => {
    const lus = importeursDe([
      { chemin: 'web/src/lib/neuf/a.ts', source: "import { x } from '@/lib/biology-library/catalogue';" },
      { chemin: 'web/src/lib/neuf/b.ts', source: "const m = await import('../biology-library/resultats');" },
      { chemin: 'web/src/lib/neuf/c.ts', source: "export { y } from '../../lib/biology-library';" },
      { chemin: 'web/src/lib/neuf/d.ts', source: '// lit `@/lib/biology-library/x` en prose seulement' },
      { chemin: 'web/src/lib/neuf/e.guard.test.ts', source: "import '@/lib/biology-library/catalogue';" },
      { chemin: 'web/src/lib/biology-library/interne.ts', source: "import { z } from './catalogue';" },
    ]);
    expect(lus).toEqual(['web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.ts', 'web/src/lib/neuf/c.ts']);
  });
});
