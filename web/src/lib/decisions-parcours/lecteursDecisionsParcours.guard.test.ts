import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, retirerLignesDeCommentaire } from '@/lib/bio-parcours/balayageSources';

// [[D-343]] §9, §11 (BP-15) — les décisions de parcours ne sont lues QUE par
// le cockpit du praticien du dossier. Ni le calendrier du suivi, ni le
// versionnement du protocole, ni le scoring, ni l'orientation, ni le courrier,
// ni le portail, ni le texte transmis à l'IA. Ce banc épingle tout accès de
// production, sur le patron de `lecteursPhysioTraitements`.
//
// CE QUI EST VU : le délégué Prisma, les relations inverses du dossier et de
// la version, la table en SQL brut, la fonction de lecture et la route. Hors
// lignes de commentaire. Les listes fermées (`decisions-parcours/liste`) et
// les fils (`decisions-parcours/fils`, pur) ne sont pas des lignes : ils ne
// sont pas suivis.

const ACCES_ADMIS = [
  // La route du cockpit : lecture journalisée, gestes du praticien.
  'web/src/app/api/praticien/decisions-parcours/route.ts',
  // Lecture et écriture, sous les verrous du trigger.
  'web/src/lib/decisions-parcours/ecriture.ts',
  'web/src/lib/decisions-parcours/lecture.ts',
  // L'écran : le panneau du cockpit, et la fiche patient qui le monte sous
  // son drapeau — un montage ailleurs (le portail) rougit ici.
  'web/src/components/decisions-parcours/DecisionsParcoursPanel.tsx',
  'web/src/components/FichePatientPanel.tsx',
  // Effacement du dossier : supprime, ne lit pas.
  'web/src/lib/patient/effacement.ts',
];

const MOTIF_ACCES =
  /\.decisionParcours\b|\bDecisionsParcoursPanel\b|\bdecisionsParcours(?:Suivantes)?\b|\bdecisions_parcours\b|\blireDecisionsDuDossier\b|\/api\/praticien\/decisions-parcours\b/;

export function lecteursDecisionsParcours(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => MOTIF_ACCES.test(retirerLignesDeCommentaire(f.source)))
    .map(f => f.chemin)
    .sort();
}

describe('Décisions de parcours — lecteurs épinglés ([[D-343]] §9, §11)', () => {
  it('aucun module neuf ne lit une décision sans s’inscrire ici', () => {
    const lus = lecteursDecisionsParcours(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));
    expect(
      lus,
      'accès neuf aux décisions de parcours : D-343 §11 n’en admet aucun hors des lecteurs nommés — '
        + 'ni le calendrier ni le versionnement (§9). L’inscrire ici par un diff relu, avec son motif ; '
        + 'entrée qui n’y accède plus : la retirer',
    ).toEqual([...ACCES_ADMIS].sort());
  });

  // CONTRE-ÉPREUVE : chaque forme d'accès rougit ; la prose, le drapeau, les
  // listes fermées et les fils ne rougissent pas.
  it('le pipeline voit les formes d’accès, ignore la prose, le drapeau et les modules purs', () => {
    const lus = lecteursDecisionsParcours([
      { chemin: 'web/src/lib/neuf/a.ts', source: 'await prisma.decisionParcours.findMany({});' },
      { chemin: 'web/src/lib/neuf/b.ts', source: 'include: { decisionsParcours: true },' },
      { chemin: 'web/src/lib/neuf/c.ts', source: 'include: { decisionsParcoursSuivantes: true },' },
      { chemin: 'web/src/lib/neuf/d.ts', source: 'await prisma.$queryRaw`SELECT * FROM decisions_parcours`;' },
      { chemin: 'web/src/lib/neuf/e.ts', source: "import { lireDecisionsDuDossier } from '@/lib/decisions-parcours/lecture';" },
      { chemin: 'web/src/lib/neuf/f.tsx', source: "await fetch('/api/praticien/decisions-parcours?idPatient=x');" },
      { chemin: 'web/src/lib/neuf/g.ts', source: '// les lignes vivent dans `decisions_parcours`' },
      { chemin: 'web/src/lib/neuf/h.tsx', source: "import { LIBELLES_NATURE } from '@/lib/decisions-parcours/liste';" },
      { chemin: 'web/src/lib/neuf/i.ts', source: "import { filsDeLaVersion } from '@/lib/decisions-parcours/fils';" },
      { chemin: 'web/src/lib/neuf/j.tsx', source: 'decisionsParcoursActif={isDecisionsParcoursEnabled()}' },
      { chemin: 'web/src/lib/neuf/k.test.ts', source: 'await prisma.decisionParcours.create({});' },
      { chemin: 'web/src/lib/neuf/l.tsx', source: "import { DecisionsParcoursPanel } from '@/components/decisions-parcours/DecisionsParcoursPanel';" },
    ]);
    expect(lus).toEqual([
      'web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.ts', 'web/src/lib/neuf/c.ts', 'web/src/lib/neuf/d.ts',
      'web/src/lib/neuf/e.ts', 'web/src/lib/neuf/f.tsx', 'web/src/lib/neuf/l.tsx',
    ]);
  });
});
