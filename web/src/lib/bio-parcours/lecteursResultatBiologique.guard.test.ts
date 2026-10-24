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
  // Annulation et révocation ([[D-294]]) : lit le fil de la clé visée, sous
  // les verrous de la garde ; n'écrit que dans la table des actes.
  'web/src/app/api/praticien/biologie/resultats/annulations/route.ts',
  // Statut posé près d'une valeur ([[D-322]], F58) : lit le fil de la clé
  // visée (tête, annulation), sous les mêmes verrous ; n'écrit que dans la
  // table des statuts — aucune valeur lue.
  'web/src/app/api/praticien/biologie/resultats/statuts/route.ts',
  // Les annulations actives et les clés occupées ([[D-294]] §3, §6) : relit
  // les fils (identité, chaînage, clé) et prend le verrou de clé en SQL —
  // aucune valeur lue.
  'web/src/lib/biology-library/annulations.ts',
  // Les constats du praticien ([[D-331]], BP-11) : lisent la clé et le fil
  // des lignes citées (tête, annulation), sous le verrou de clé à l'écriture —
  // aucune valeur lue ; n'écrivent que dans la table des constats.
  'web/src/lib/bio-parcours/constats/ecriture.ts',
  'web/src/lib/bio-parcours/constats/lecture.ts',
  // Le constat du praticien sur un besoin sans score ([[D-347]], t40), même
  // lecture que ceux du parcours : la clé et le fil des lignes citées en
  // pièce, sous le verrou de clé à l'écriture — aucune valeur lue ;
  // n'écrivent que dans la table des constats sur un besoin.
  'web/src/lib/constats-besoin/ecriture.ts',
  'web/src/lib/constats-besoin/lecture.ts',
  // Seul chemin d'un import vers les résultats : la décision du praticien.
  'web/src/lib/biology-library/import/decisions.ts',
  // L'entrée publiée de BioFlow ([[D-306]] §1) NOMME la table parmi celles
  // dont le module est propriétaire ; elle n'y accède pas. Ses ré-exports sont
  // fermés par `bioflowPublie.guard.test.ts`.
  'web/src/lib/biology-library/publie.ts',
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

// [[D-278]] §3 — LES COMMENTAIRES DU LABORATOIRE : texte libre, qui peut nommer
// un tiers, conservé après la purge. Ils ne sortent pas de l'écran de
// validation du praticien : ni restitution, ni portail, ni courriel, ni
// journal, ni export. Ce troisième banc épingle leurs écrivains et leurs
// lecteurs ; un module neuf qui les touche s'inscrit ici par un diff relu.
// Restent hors de vue, comme pour les faits, et relèvent de la revue : un
// `include` ou un `SELECT *` sur la ligne ou l'import lus.
const COMMENTAIRES_ADMIS = [
  // Relevé : schéma, consigne et parseur à clés exactes (`bio-extraction-v4`).
  'web/src/lib/biology-library/import/extraction.ts',
  // Écriture, avec la ligne et à la terminaison de l'import.
  'web/src/lib/biology-library/import/lancerExtraction.ts',
  // Lecture du compte rendu pour l'écran de validation.
  'web/src/lib/biology-library/import/lecture.ts',
  // Écran de validation : commentaires du compte rendu entier.
  'web/src/components/patient-cockpit/ImportCompteRenduPanel.tsx',
  // Rendu attribué du commentaire d'une ligne, et son signal.
  'web/src/components/patient-cockpit/FaitsDuLaboratoire.tsx',
  // BP-03, arbitrage 4 du 2026-10-14 : le commentaire d'un résultat est
  // recopié sous sa valeur, dans la série de la fiche — la route le lit sur la
  // ligne qui a créé le résultat, l'écran le transmet au rendu attribué.
  // Praticien seulement ; ceux du compte rendu entier restent à l'import.
  'web/src/app/api/praticien/biologie/resultats/route.ts',
  'web/src/components/patient-cockpit/EstimeMesurePanel.tsx',
];

// `commentaireLaboratoire` : la charge de la route des résultats (BP-03),
// suivie comme `faitsLaboratoire` l'est plus haut.
const MOTIF_COMMENTAIRES = /\bcommentaires?(?:Lus?|_lus?|NonTranscrits?|_non_transcrits?|Laboratoire)\b/;

export function lecteursDesCommentaires(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => MOTIF_COMMENTAIRES.test(retirerLignesDeCommentaire(f.source)))
    .map(f => f.chemin)
    .sort();
}

describe('Commentaires du laboratoire — modules épinglés ([[D-278]] §3)', () => {
  it('aucun module neuf ne lit ni n\'écrit un commentaire du laboratoire sans s\'inscrire ici', () => {
    const lus = lecteursDesCommentaires(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));
    expect(
      lus,
      'accès neuf aux commentaires du laboratoire : l\'inscrire ici par un diff relu, avec son motif ; '
        + 'entrée qui n\'y accède plus : la retirer',
    ).toEqual([...COMMENTAIRES_ADMIS].sort());
  });

  // Le lecteur rend TOUT le compte rendu, commentaires compris : un appelant
  // neuf qui sérialiserait son résultat ne contient aucun nom de colonne et
  // passerait le banc ci-dessus (revue Copilot de #1400). Ses appelants sont
  // donc épinglés à leur tour — la seule route praticien, aujourd'hui.
  it('seule la route praticien du compte rendu appelle `lireCompteRendu`', () => {
    const appelants = fichiersSource()
      .filter(chemin => !estUnTest(chemin))
      .filter(chemin => chemin !== 'web/src/lib/biology-library/import/lecture.ts')
      .filter(chemin => /\blireCompteRendu\b/.test(retirerLignesDeCommentaire(lire(chemin))))
      .sort();
    expect(
      appelants,
      'appelant neuf du lecteur de compte rendu (commentaires du laboratoire compris) : '
        + 'l\'inscrire ici par un diff relu, praticien seulement',
    ).toEqual(['web/src/app/api/praticien/biologie/import/compte-rendu/route.ts']);
  });

  it('le pipeline voit les deux colonnes et leurs signaux, ignore la prose et les tests', () => {
    const lus = lecteursDesCommentaires([
      { chemin: 'web/src/lib/neuf/a.ts', source: 'select: { commentaireLu: true },' },
      { chemin: 'web/src/lib/neuf/b.ts', source: 'await prisma.$queryRaw`SELECT commentaires_lus FROM x`;' },
      { chemin: 'web/src/lib/neuf/c.ts', source: 'if (i.commentairesNonTranscrits) {}' },
      { chemin: 'web/src/lib/neuf/d.ts', source: 'WHERE commentaire_non_transcrit' },
      { chemin: 'web/src/lib/neuf/e.ts', source: '// lit `commentaire_lu` ailleurs' },
      { chemin: 'web/src/lib/neuf/f.test.ts', source: 'commentaireLu: null,' },
      { chemin: 'web/src/lib/neuf/g.ts', source: 'const commentaire = "libre";' },
      { chemin: 'web/src/lib/neuf/h.tsx', source: 'const t = r.commentaireLaboratoire?.texte;' },
    ]);
    expect(lus).toEqual([
      'web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.ts', 'web/src/lib/neuf/c.ts', 'web/src/lib/neuf/d.ts',
      'web/src/lib/neuf/h.tsx',
    ]);
  });
});
