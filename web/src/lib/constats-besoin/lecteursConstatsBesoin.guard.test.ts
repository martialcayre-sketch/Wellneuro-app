import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, retirerLignesDeCommentaire } from '@/lib/bio-parcours/balayageSources';

// [[D-347]] §6 (t40) — le constat que le praticien pose sur un besoin sans
// score n'est lu QUE par l'écran du praticien : ni le portail, ni le courrier
// au médecin, ni le scoring, ni le compte des besoins mesurés, ni
// l'orientation, ni la re-passation ciblée, ni l'IA (« Ne touche pas »). Une
// règle aval ne peut le lire que par sa propre décision. Banc jumeau de
// `lecteursConstats.guard.test.ts` ([[D-331]]), qui ne doit pas être étendu :
// deux objets, deux listes.
//
// CE QUI EST VU : les délégués Prisma (`prisma.constatBesoinPraticien`,
// `tx.pieceConstatBesoinPraticien`), les relations inverses
// (`constatsBesoinPraticien`, `piecesConstatsBesoinPraticien` sur le dossier,
// `piecesConstatsBesoin` sur le résultat et la passation), les tables en SQL
// brut, le module de lecture (`lireConstatsBesoinDuDossier`) et la route qui
// le rend. Hors lignes de commentaire. La liste fermée (`constats-besoin/
// liste` : verdicts, motifs, libellés) n'est pas un constat : elle n'est pas
// suivie.

const ACCES_ADMIS = [
  // Lecture du dossier par besoin, et écriture des gestes (pose,
  // remplacement, retrait), après lecture de la tête sous verrou.
  'web/src/app/api/praticien/besoins/constats/route.ts',
  'web/src/lib/constats-besoin/ecriture.ts',
  'web/src/lib/constats-besoin/lecture.ts',
  // L'écran du praticien, sous l'onglet « Besoins » : affiche les constats, offre les gestes.
  'web/src/components/besoins/ConstatsBesoinPanel.tsx',
  // Effacement du dossier : supprime, ne lit pas.
  'web/src/lib/patient/effacement.ts',
];

const MOTIF_ACCES =
  /\.constatBesoinPraticien\b|\.pieceConstatBesoinPraticien\b|\bconstatsBesoinPraticien\b|\bpiecesConstatsBesoinPraticien\b|\bpiecesConstatsBesoin\b|\bconstats_besoin_praticien\b|\bpieces_constats_besoin_praticien\b|\blireConstatsBesoinDuDossier\b|\/api\/praticien\/besoins\/constats\b/;

export function lecteursDesConstatsBesoin(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => MOTIF_ACCES.test(retirerLignesDeCommentaire(f.source)))
    .map(f => f.chemin)
    .sort();
}

describe('Constats sur un besoin — lecteurs épinglés ([[D-347]] §6, t40)', () => {
  it('aucun module neuf ne lit un constat sur un besoin sans s’inscrire ici', () => {
    const lus = lecteursDesConstatsBesoin(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));
    expect(
      lus,
      'accès neuf aux constats sur un besoin : D-347 n’en admet aucun hors de l’écran du praticien. '
        + 'L’inscrire ici par un diff relu, avec son motif ; entrée qui n’y accède plus : la retirer',
    ).toEqual([...ACCES_ADMIS].sort());
  });

  // CONTRE-ÉPREUVE : chaque forme d'accès rougit ; la prose, la liste fermée
  // et les constats du parcours ([[D-331]]) ne rougissent pas.
  it('le pipeline voit les formes d’accès, ignore la prose, la liste fermée et l’objet voisin', () => {
    const lus = lecteursDesConstatsBesoin([
      { chemin: 'web/src/lib/neuf/a.ts', source: 'await prisma.constatBesoinPraticien.findMany({});' },
      { chemin: 'web/src/lib/neuf/b.ts', source: 'await tx.pieceConstatBesoinPraticien.findMany({});' },
      { chemin: 'web/src/lib/neuf/c.ts', source: 'include: { constatsBesoinPraticien: true },' },
      { chemin: 'web/src/lib/neuf/d.ts', source: 'include: { piecesConstatsBesoin: true },' },
      { chemin: 'web/src/lib/neuf/e.ts', source: 'await prisma.$queryRaw`SELECT * FROM constats_besoin_praticien`;' },
      { chemin: 'web/src/lib/neuf/f.ts', source: "import { lireConstatsBesoinDuDossier } from '@/lib/constats-besoin/lecture';" },
      { chemin: 'web/src/lib/neuf/g.tsx', source: "await fetch('/api/praticien/besoins/constats?idPatient=x');" },
      { chemin: 'web/src/lib/neuf/h.ts', source: 'include: { piecesConstatsBesoinPraticien: true },' },
      { chemin: 'web/src/lib/neuf/i.ts', source: '// le constat vit dans `constats_besoin_praticien`' },
      { chemin: 'web/src/lib/neuf/j.tsx', source: "import { LIBELLES_VERDICT } from '@/lib/constats-besoin/liste';" },
      { chemin: 'web/src/lib/neuf/k.test.ts', source: 'await prisma.constatBesoinPraticien.create({});' },
      { chemin: 'web/src/lib/neuf/l.ts', source: "await fetch('/api/praticien/besoins?idPatient=x'); await prisma.constatPraticien.findMany({});" },
    ]);
    expect(lus).toEqual([
      'web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.ts', 'web/src/lib/neuf/c.ts', 'web/src/lib/neuf/d.ts',
      'web/src/lib/neuf/e.ts', 'web/src/lib/neuf/f.ts', 'web/src/lib/neuf/g.tsx', 'web/src/lib/neuf/h.ts',
    ]);
  });
});
