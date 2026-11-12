import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, specificateursImportes } from '../bio-parcours/balayageSources';

// [[D-480]] §8 — LA BIBLIOTHÈQUE N'AUTORISE AUCUNE PRESCRIPTION. Aucun
// parcours, courrier, portail, document remis ni appel à un modèle ne la lit.
// Ce banc lit le SOURCE de `web/src` et refuse tout importeur de production
// hors de son dossier.
//
// LES LECTEURS ADMIS s'ajoutent nommément, par la PR qui les apporte : l'atelier
// (PR 5) et le cockpit sous drapeau éteint (PR 6) du découpage de D-480. Un
// parcours, un courrier, le portail ou un appel à un modèle n'y entrent jamais.
const DOSSIER = 'web/src/lib/bibliotheque-options/';
const LECTEURS_ADMIS: readonly string[] = [];

const importeLaBibliotheque = (specificateur: string) => /(^|\/)bibliotheque-options(\/|$)/.test(specificateur);

describe('bibliothèque des options — aucun lecteur hors des bancs (D-480 §8)', () => {
  const sources = fichiersSource();

  it('le balayage voit le module lui-même (anti-vacuité)', () => {
    expect(sources).toContain(`${DOSSIER}bibliothequeBesoin2V1.ts`);
    expect(sources).toContain(`${DOSSIER}vocabulaire.ts`);
  });

  it('aucun code de production hors du dossier n’importe la bibliothèque', () => {
    const importeurs = sources
      .filter(chemin => !estUnTest(chemin) && !chemin.startsWith(DOSSIER))
      .filter(chemin => specificateursImportes(lire(chemin)).some(importeLaBibliotheque));
    expect(importeurs).toEqual([...LECTEURS_ADMIS]);
  });

  // CONTRE-ÉPREUVE : la mutation attendue — un import, par alias ou relatif,
  // statique, dynamique ou CommonJS — est vue ; une prose qui cite le dossier
  // ne l'est pas.
  it('le détecteur voit un import et ignore une citation en commentaire', () => {
    const source = [
      "import { BIBLIOTHEQUE_BESOIN2_V1 } from '@/lib/bibliotheque-options/bibliothequeBesoin2V1';",
      "export { RUBRIQUES_OPTION } from '../bibliotheque-options/vocabulaire';",
      "const v = await import('@/lib/bibliotheque-options/vocabulaire');",
      "const b = require('./bibliotheque-options/bibliothequeBesoin2V1');",
      'const g = await import(`@/lib/bibliotheque-options/vocabulaire`);',
      '// voir web/src/lib/bibliotheque-options/',
    ].join('\n');
    expect(specificateursImportes(source).filter(importeLaBibliotheque)).toHaveLength(5);
  });
});
