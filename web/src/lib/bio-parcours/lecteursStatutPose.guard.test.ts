import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, retirerLignesDeCommentaire } from './balayageSources';

// [[D-322]] (F58) — le statut que le praticien pose près d'une valeur n'est
// lu QUE par la série du praticien : ni le portail, ni le courrier au médecin,
// ni le scoring, ni l'orientation, ni l'IA (« Ne touche pas »). Ce banc épingle
// tout accès de production au statut — relecture `wn-reviewer` de #1550.
//
// CE QUI EST VU : le délégué Prisma (`prisma.statutPoseResultatBiologique`,
// `tx.…`), les relations inverses (`statutsPoses` sur le résultat,
// `statutsPosesResultatsBiologiques` sur le dossier), la table en SQL brut,
// le module de lecture (`statutPoseLecture`, `statutsPosesParLigne`) et la
// charge `statutPose` que le GET des résultats rend — un écran qui la lirait
// pour trier, colorer ou transmettre rougit ici. Hors lignes de commentaire.
// La liste fermée (`statutPoseListe` : codes et libellés) n'est pas un
// statut posé : elle n'est pas suivie.

const ACCES_ADMIS = [
  // Lecture jointe à la série : statut actif et historique de chaque ligne.
  'web/src/app/api/praticien/biologie/resultats/route.ts',
  // Écriture des actes (pose, retrait), après lecture du dernier acte sous verrou.
  'web/src/app/api/praticien/biologie/resultats/statuts/route.ts',
  // La série du praticien : affiche le statut, offre les gestes.
  'web/src/components/patient-cockpit/EstimeMesurePanel.tsx',
  // Le module de lecture lui-même.
  'web/src/lib/biology-library/statutPoseLecture.ts',
  // L'entrée publiée de BioFlow ([[D-306]] §1) NOMME la table parmi celles
  // dont le module est propriétaire ; elle n'y accède pas.
  'web/src/lib/biology-library/publie.ts',
  // Effacement du dossier : supprime, ne lit pas.
  'web/src/lib/patient/effacement.ts',
];

const MOTIF_ACCES =
  /\.statutPoseResultatBiologique\b|\bstatutsPoses\b|\bstatutsPosesResultatsBiologiques\b|\bstatuts_poses_resultats_biologiques\b|\bstatutPoseLecture\b|\bstatutsPosesParLigne\b|\bstatutPose\b/;

export function lecteursDuStatut(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => MOTIF_ACCES.test(retirerLignesDeCommentaire(f.source)))
    .map(f => f.chemin)
    .sort();
}

describe('Statut posé près d’une valeur — lecteurs épinglés ([[D-322]], F58)', () => {
  it('aucun module neuf ne lit le statut posé sans s’inscrire ici', () => {
    const lus = lecteursDuStatut(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));
    expect(
      lus,
      'accès neuf au statut posé : D-322 n’en admet aucun hors de la série du praticien. '
        + 'L’inscrire ici par un diff relu, avec son motif ; entrée qui n’y accède plus : la retirer',
    ).toEqual([...ACCES_ADMIS].sort());
  });

  // CONTRE-ÉPREUVE : chaque forme d'accès rougit ; la prose et la liste
  // fermée ne rougissent pas.
  it('le pipeline voit les formes d’accès, ignore la prose et la liste fermée', () => {
    const lus = lecteursDuStatut([
      { chemin: 'web/src/lib/neuf/a.ts', source: 'await prisma.statutPoseResultatBiologique.findMany({});' },
      { chemin: 'web/src/lib/neuf/b.ts', source: 'include: { statutsPoses: true },' },
      { chemin: 'web/src/lib/neuf/c.ts', source: 'await prisma.$queryRaw`SELECT * FROM statuts_poses_resultats_biologiques`;' },
      { chemin: 'web/src/lib/neuf/d.ts', source: "import { statutsPosesParLigne } from '@/lib/biology-library/statutPoseLecture';" },
      { chemin: 'web/src/lib/neuf/e.tsx', source: 'const s = r.statutPose?.actif;' },
      { chemin: 'web/src/lib/neuf/f.ts', source: 'include: { statutsPosesResultatsBiologiques: true },' },
      { chemin: 'web/src/lib/neuf/g.ts', source: '// le statut posé vit dans `statuts_poses_resultats_biologiques`' },
      { chemin: 'web/src/lib/neuf/h.tsx', source: "import { LIBELLES_STATUT_POSE } from '@/lib/biology-library/statutPoseListe';" },
      { chemin: 'web/src/lib/neuf/i.test.ts', source: 'await prisma.statutPoseResultatBiologique.create({});' },
    ]);
    expect(lus).toEqual([
      'web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.ts', 'web/src/lib/neuf/c.ts', 'web/src/lib/neuf/d.ts',
      'web/src/lib/neuf/e.tsx', 'web/src/lib/neuf/f.ts',
    ]);
  });
});
