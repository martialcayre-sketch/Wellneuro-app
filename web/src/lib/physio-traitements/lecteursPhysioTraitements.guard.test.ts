import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, retirerLignesDeCommentaire } from '@/lib/bio-parcours/balayageSources';

// [[D-335]] §8 (BP-13) — les données physiologiques et les traitements en
// cours ne sont lus QUE par le cockpit du praticien, le portail du patient
// (ses lignes), la ligne de vigilance de la synthèse (les traitements en
// vigueur) et les pièces de constat (§7). Ni l'orientation, ni le scoring, ni
// le courrier, ni la garde de population, ni le texte transmis à l'IA. Ce
// banc épingle tout accès de production, sur le patron de `lecteursConstats`.
//
// CE QUI EST VU : les délégués Prisma, les relations inverses du dossier, les
// tables en SQL brut, les deux fonctions de lecture et les deux routes. Hors
// lignes de commentaire. Les listes fermées (`physio-traitements/liste`) et
// les dates ne sont pas des lignes : elles ne sont pas suivies.

const ACCES_ADMIS = [
  // Les deux routes : le cockpit (lecture journalisée, gestes du praticien)
  // et le portail (ses lignes, ses gestes).
  'web/src/app/api/praticien/physio-traitements/route.ts',
  'web/src/app/api/portail/physio-traitements/route.ts',
  // Lecture et écriture, sous les verrous du trigger.
  'web/src/lib/physio-traitements/ecriture.ts',
  'web/src/lib/physio-traitements/lecture.ts',
  // Les écrans : le panneau du cockpit, la fiche du portail, son lien, et
  // l'interrupteur de la fiche de renseignements à l'ouverture de l'espace.
  'web/src/components/physio-traitements/PhysioTraitementsPanel.tsx',
  'web/src/components/physio-traitements/DeclarationsPatient.tsx',
  'web/src/components/physio-traitements/LienFicheRenseignements.tsx',
  'web/src/app/portail/[token]/page.tsx',
  // La ligne de vigilance (§8) : les traitements en vigueur, sous drapeau ;
  // le texte transmis à l'IA ne les reçoit pas.
  'web/src/lib/synthese/generation.ts',
  // La pièce de constat qui cite un traitement (§7) : vérifiée sous verrou,
  // décodée et dite « à relire » quand sa ligne n'est plus la tête.
  'web/src/lib/bio-parcours/constats/ecriture.ts',
  'web/src/lib/bio-parcours/constats/lecture.ts',
  // Effacement du dossier : supprime, ne lit pas.
  'web/src/lib/patient/effacement.ts',
  // La garde du complément ciblé ([[D-345]] §3, J3-12h lot 3) : la TÊTE des
  // fils grossesse et allaitement, rien d'autre — un « oui » déclenche le
  // courrier au médecin, seul un « non » du praticien lève. Décision
  // postérieure à §8, qui la nomme.
  'web/src/lib/clinical/entreesGardeComplement.ts',
];

const MOTIF_ACCES =
  /\.donneePhysiologique\b|\.traitementEnCours\b|\bdonneesPhysiologiques\b|\btraitementsEnCours\b|\bdonnees_physiologiques\b|\btraitements_en_cours\b|\blireDonneesDuDossier\b|\blireTraitementsEnVigueur\b|\/api\/(?:praticien|portail)\/physio-traitements\b/;

export function lecteursPhysioTraitements(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => MOTIF_ACCES.test(retirerLignesDeCommentaire(f.source)))
    .map(f => f.chemin)
    .sort();
}

describe('Données physiologiques et traitements — lecteurs épinglés ([[D-335]] §8)', () => {
  it('aucun module neuf ne lit une ligne sans s’inscrire ici', () => {
    const lus = lecteursPhysioTraitements(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));
    expect(
      lus,
      'accès neuf aux données physiologiques ou aux traitements : D-335 §8 n’en admet aucun hors des lecteurs nommés. '
        + 'L’inscrire ici par un diff relu, avec son motif ; entrée qui n’y accède plus : la retirer',
    ).toEqual([...ACCES_ADMIS].sort());
  });

  // CONTRE-ÉPREUVE : chaque forme d'accès rougit ; la prose et les listes
  // fermées ne rougissent pas.
  it('le pipeline voit les formes d’accès, ignore la prose et les listes fermées', () => {
    const lus = lecteursPhysioTraitements([
      { chemin: 'web/src/lib/neuf/a.ts', source: 'await prisma.donneePhysiologique.findMany({});' },
      { chemin: 'web/src/lib/neuf/b.ts', source: 'await tx.traitementEnCours.findFirst({});' },
      { chemin: 'web/src/lib/neuf/c.ts', source: 'include: { traitementsEnCours: true },' },
      { chemin: 'web/src/lib/neuf/d.ts', source: 'include: { donneesPhysiologiques: true },' },
      { chemin: 'web/src/lib/neuf/e.ts', source: 'await prisma.$queryRaw`SELECT * FROM traitements_en_cours`;' },
      { chemin: 'web/src/lib/neuf/f.ts', source: "import { lireTraitementsEnVigueur } from '@/lib/physio-traitements/lecture';" },
      { chemin: 'web/src/lib/neuf/g.tsx', source: "await fetch('/api/portail/physio-traitements');" },
      { chemin: 'web/src/lib/neuf/h.ts', source: '// les lignes vivent dans `donnees_physiologiques`' },
      { chemin: 'web/src/lib/neuf/i.tsx', source: "import { LIBELLES_CRITERE } from '@/lib/physio-traitements/liste';" },
      { chemin: 'web/src/lib/neuf/j.test.ts', source: 'await prisma.traitementEnCours.create({});' },
    ]);
    expect(lus).toEqual([
      'web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.ts', 'web/src/lib/neuf/c.ts', 'web/src/lib/neuf/d.ts',
      'web/src/lib/neuf/e.ts', 'web/src/lib/neuf/f.ts', 'web/src/lib/neuf/g.tsx',
    ]);
  });
});
