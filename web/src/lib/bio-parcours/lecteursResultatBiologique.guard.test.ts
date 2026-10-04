import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, retirerLignesDeCommentaire } from './balayageSources';

// BP-01 ([[D-266]]) — les faits du laboratoire ne sont consommés que par les
// modules autorisés. Le jour du lot, ces faits (intervalle et marquage tels
// qu'imprimés) n'existent pas encore : BIO-INGEST LOT-07 les ajoutera à
// `ResultatBiologique`. Ce banc garde donc le MODÈLE ENTIER — tout accès de
// production aux résultats biologiques passe par la liste ci-dessous — et
// LOT-07 l'affinera champ par champ quand les colonnes existeront.
//
// CE QUI EST VU : le délégué Prisma (`prisma.resultatBiologique`,
// `tx.resultatBiologique`), la relation inverse du dossier
// (`resultatsBiologiques`) et la table en SQL brut (`resultats_biologiques`),
// hors lignes de commentaire.
// CE QUI NE L'EST PAS, dit pour ne pas sur-promettre : les relations inverses
// au nom générique (`BiologyAnalyte.resultats`, `LigneBiologiqueCandidate.resultat`)
// — un `include` par elles échappe au balayage textuel et relève de la revue.
const ACCES_ADMIS = [
  // Saisie, lecture et correction praticien.
  'web/src/app/api/praticien/biologie/resultats/route.ts',
  'web/src/app/api/praticien/biologie/resultats/bilan/route.ts',
  // Seul chemin d'un import vers les résultats : la décision du praticien.
  'web/src/lib/biology-library/import/decisions.ts',
  // Portes biologiques des assiettes ([[D-245]]).
  'web/src/lib/clinical/portesBiologiquesService.ts',
  // Effacement du dossier (droit à l'effacement) : supprime, ne lit pas.
  'web/src/lib/patient/effacement.ts',
];

const MOTIF_ACCES = /\.resultatBiologique\b|\bresultatsBiologiques\b|\bresultats_biologiques\b/;

/** Le pipeline de lecture, pur — extrait pour être éprouvé (contre-épreuve). */
export function accedantsDe(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => MOTIF_ACCES.test(retirerLignesDeCommentaire(f.source)))
    .map(f => f.chemin)
    .sort();
}

describe('ResultatBiologique — accès de production épinglés (BP-01, faits du laboratoire)', () => {
  it('aucun module neuf ne lit les résultats biologiques sans s\'inscrire ici', () => {
    const lus = accedantsDe(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));
    expect(
      lus,
      'accès neuf aux résultats biologiques : l\'inscrire ici par un diff relu, avec son motif ; '
        + 'entrée qui n\'y accède plus : la retirer',
    ).toEqual([...ACCES_ADMIS].sort());
  });

  // CONTRE-ÉPREUVE : un module neuf qui lit par le délégué, par la relation du
  // dossier ou en SQL brut rougit ; un commentaire qui cite la table ne rougit pas.
  it('le pipeline voit les trois formes d\'accès, ignore la prose', () => {
    const lus = accedantsDe([
      { chemin: 'web/src/lib/neuf/a.ts', source: 'await prisma.resultatBiologique.findMany({});' },
      { chemin: 'web/src/lib/neuf/b.ts', source: 'include: { resultatsBiologiques: true },' },
      { chemin: 'web/src/lib/neuf/c.ts', source: 'await prisma.$queryRaw`SELECT * FROM resultats_biologiques`;' },
      { chemin: 'web/src/lib/neuf/d.ts', source: '// seul chemin vers `resultats_biologiques`' },
      { chemin: 'web/src/lib/neuf/e.test.ts', source: 'await prisma.resultatBiologique.create({});' },
    ]);
    expect(lus).toEqual(['web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.ts', 'web/src/lib/neuf/c.ts']);
  });
});
