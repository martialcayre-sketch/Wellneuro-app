import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, retirerLignesDeCommentaire } from './balayageSources';

// BP-01 ([[D-266]]) — les faits du laboratoire ne sont consommés que par les
// modules autorisés. Le jour du lot, ces faits (intervalle et marquage tels
// qu'imprimés) n'existaient pas encore. Ce banc garde le MODÈLE ENTIER — tout
// accès de production aux résultats biologiques passe par la liste ci-dessous.
// LOT-07 a posé les faits sur la ligne lue, pas sur le résultat ([[D-267]]) :
// le second banc, plus bas, les épingle champ par champ.
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

// [[D-267]] §7 — LOT-07 a posé les faits sur `lignes_biologiques_candidates`,
// pas sur le résultat (A5 intact) : ce second banc épingle, champ par champ,
// les modules admis. §7 en nomme deux lecteurs — la décision du praticien,
// c'est-à-dire l'ÉCRAN où il décide (`lecture.ts`, `ImportCompteRenduPanel`),
// et la restitution (route des résultats, série, rendu partagé) — auxquels
// s'ajoutent les deux ÉCRIVAINS de l'extraction. L'ENREGISTREMENT de la
// décision (`decisions.ts`) ne les lit pas : il ne recopie aucun fait. Le client Prisma généré est ignoré par Git, donc hors
// balayage. La charge `faitsLaboratoire` rendue par la route est suivie aussi :
// un écran qui la lirait pour colorer ou trier rougit ici. Restent hors de vue,
// et relèvent de la revue : un `include` ou un `SELECT *` sur la ligne lue.
const FAITS_ADMIS = [
  // Relevé : schéma, consigne et parseur à clés exactes (`bio-extraction-v2`).
  'web/src/lib/biology-library/import/extraction.ts',
  // Écriture des lignes lues, telles que relevées.
  'web/src/lib/biology-library/import/lancerExtraction.ts',
  // Lecture du compte rendu pour l'écran de validation.
  'web/src/lib/biology-library/import/lecture.ts',
  // Écran de validation : juxtaposition, signal « non transcrit ».
  'web/src/components/patient-cockpit/ImportCompteRenduPanel.tsx',
  // Rendu attribué, partagé par la validation et la série.
  'web/src/components/patient-cockpit/FaitsDuLaboratoire.tsx',
  // Restitution juxtaposée au résultat créé, avec les silences de §5.
  'web/src/app/api/praticien/biologie/resultats/route.ts',
  // Série des mesures : transmet la charge de la route au rendu attribué.
  'web/src/components/patient-cockpit/EstimeMesurePanel.tsx',
];

const MOTIF_FAITS = /\b(?:(?:intervalle|marquage)(?:Lu|_lu|NonTranscrit|_non_transcrit)|faitsLaboratoire)\b/;

export function lecteursDesFaits(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => MOTIF_FAITS.test(retirerLignesDeCommentaire(f.source)))
    .map(f => f.chemin)
    .sort();
}

describe('Faits du laboratoire — modules épinglés champ par champ (BP-01, [[D-267]] §7)', () => {
  it('aucun module neuf ne lit ni n\'écrit l\'intervalle ou la marque lus sans s\'inscrire ici', () => {
    const lus = lecteursDesFaits(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));
    expect(
      lus,
      'accès neuf aux faits du laboratoire : l\'inscrire ici par un diff relu, avec son motif ; '
        + 'entrée qui n\'y accède plus : la retirer',
    ).toEqual([...FAITS_ADMIS].sort());
  });

  it('le pipeline voit les faits, leurs signaux et la charge de la route, ignore la prose', () => {
    const lus = lecteursDesFaits([
      { chemin: 'web/src/lib/neuf/a.ts', source: 'select: { intervalleLu: true },' },
      { chemin: 'web/src/lib/neuf/b.ts', source: 'await prisma.$queryRaw`SELECT marquage_lu FROM x`;' },
      { chemin: 'web/src/lib/neuf/c.ts', source: 'if (ligne.marquageNonTranscrit) {}' },
      { chemin: 'web/src/lib/neuf/d.ts', source: 'WHERE intervalle_non_transcrit' },
      { chemin: 'web/src/lib/neuf/e.ts', source: '// lit `intervalle_lu` ailleurs' },
      { chemin: 'web/src/lib/neuf/g.tsx', source: 'const c = m.faitsLaboratoire?.marquage ? "rouge" : "";' },
      { chemin: 'web/src/lib/neuf/f.test.ts', source: 'intervalleLu: null,' },
    ]);
    expect(lus).toEqual([
      'web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.ts', 'web/src/lib/neuf/c.ts', 'web/src/lib/neuf/d.ts',
      'web/src/lib/neuf/g.tsx',
    ]);
  });
});
