import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, retirerLignesDeCommentaire } from './balayageSources';

// [[D-331]] (BP-11) — le constat que le praticien pose sur une hypothèse n'est
// lu QUE par l'écran du praticien : ni le portail, ni le courrier au médecin,
// ni le scoring, ni l'orientation, ni l'IA (« Ne touche pas »). Ce banc
// épingle tout accès de production, sur le patron de `lecteursStatutPose`.
//
// CE QUI EST VU : les délégués Prisma (`prisma.constatPraticien`,
// `tx.pieceConstatPraticien`), les relations inverses (`constatsPraticien`,
// `piecesConstatsPraticien` sur le dossier, `piecesConstats` sur le résultat
// et la passation), les tables en SQL brut, le module de lecture
// (`lireConstatsDuDossier`) et la route qui le rend — un écran qui
// l'appellerait pour trier, colorer ou transmettre rougit ici. Hors lignes de
// commentaire. La liste fermée (`constats/liste` : verdicts, motifs,
// libellés) n'est pas un constat : elle n'est pas suivie.

const ACCES_ADMIS = [
  // Lecture du dossier par hypothèse, et écriture des gestes (pose,
  // remplacement, retrait), après lecture de la tête sous verrou.
  'web/src/app/api/praticien/biologie/constats/route.ts',
  'web/src/lib/bio-parcours/constats/ecriture.ts',
  'web/src/lib/bio-parcours/constats/lecture.ts',
  // L'écran du praticien : affiche les constats, offre les gestes.
  'web/src/components/biologie/ConstatsParcoursPanel.tsx',
  // Effacement du dossier : supprime, ne lit pas.
  'web/src/lib/patient/effacement.ts',
];

const MOTIF_ACCES =
  /\.constatPraticien\b|\.pieceConstatPraticien\b|\bconstatsPraticien\b|\bpiecesConstatsPraticien\b|\bpiecesConstats\b|\bconstats_praticien\b|\bpieces_constats_praticien\b|\blireConstatsDuDossier\b|\/api\/praticien\/biologie\/constats\b/;

export function lecteursDesConstats(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => MOTIF_ACCES.test(retirerLignesDeCommentaire(f.source)))
    .map(f => f.chemin)
    .sort();
}

describe('Constats du praticien — lecteurs épinglés ([[D-331]], BP-11)', () => {
  it('aucun module neuf ne lit un constat sans s’inscrire ici', () => {
    const lus = lecteursDesConstats(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));
    expect(
      lus,
      'accès neuf aux constats : D-331 n’en admet aucun hors de l’écran du praticien. '
        + 'L’inscrire ici par un diff relu, avec son motif ; entrée qui n’y accède plus : la retirer',
    ).toEqual([...ACCES_ADMIS].sort());
  });

  // CONTRE-ÉPREUVE : chaque forme d'accès rougit ; la prose et la liste
  // fermée ne rougissent pas.
  it('le pipeline voit les formes d’accès, ignore la prose et la liste fermée', () => {
    const lus = lecteursDesConstats([
      { chemin: 'web/src/lib/neuf/a.ts', source: 'await prisma.constatPraticien.findMany({});' },
      { chemin: 'web/src/lib/neuf/b.ts', source: 'await tx.pieceConstatPraticien.findMany({});' },
      { chemin: 'web/src/lib/neuf/c.ts', source: 'include: { constatsPraticien: true },' },
      { chemin: 'web/src/lib/neuf/d.ts', source: 'include: { piecesConstats: true },' },
      { chemin: 'web/src/lib/neuf/e.ts', source: 'await prisma.$queryRaw`SELECT * FROM constats_praticien`;' },
      { chemin: 'web/src/lib/neuf/f.ts', source: "import { lireConstatsDuDossier } from '@/lib/bio-parcours/constats/lecture';" },
      { chemin: 'web/src/lib/neuf/g.tsx', source: "await fetch('/api/praticien/biologie/constats?idPatient=x');" },
      { chemin: 'web/src/lib/neuf/h.ts', source: 'include: { piecesConstatsPraticien: true },' },
      { chemin: 'web/src/lib/neuf/i.ts', source: '// le constat vit dans `constats_praticien`' },
      { chemin: 'web/src/lib/neuf/j.tsx', source: "import { LIBELLES_VERDICT } from '@/lib/bio-parcours/constats/liste';" },
      { chemin: 'web/src/lib/neuf/k.test.ts', source: 'await prisma.constatPraticien.create({});' },
    ]);
    expect(lus).toEqual([
      'web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.ts', 'web/src/lib/neuf/c.ts', 'web/src/lib/neuf/d.ts',
      'web/src/lib/neuf/e.ts', 'web/src/lib/neuf/f.ts', 'web/src/lib/neuf/g.tsx', 'web/src/lib/neuf/h.ts',
    ]);
  });
});
