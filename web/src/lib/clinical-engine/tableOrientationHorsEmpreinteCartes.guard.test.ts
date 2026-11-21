import { describe, expect, it, vi } from 'vitest';

// Les modules du moteur de cartes tirent `orientationService`, dont le module
// instancie un client Prisma au chargement : jamais appelé ici.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

// LA TABLE DE CONVERGENCE N'ENTRE DANS AUCUNE EMPREINTE DE CARTE ([[D-555]],
// [[D-338]] §2) — repris du banc écrit au lot 2 de J3-12f (suspension, non livrée),
// retourné vers la retouche qui est finalement livrée : une ligne
// d'exclusion `Q_ALI_01` / besoin 1 dans la table de convergence.
//
// Un banc d'imports ne suffit pas à le dire : le graphe de modules atteint la
// table par des chemins qui ne portent aucune donnée dans l'empreinte (un type
// importé seulement, un filtre qui écarte la convergence). Ce banc-ci prouve
// l'invariant par le COMPORTEMENT : la chaîne de référence — cliché, revue,
// carte de décision — est construite deux fois, sur la table de convergence
// LIVRÉE (avec l'exclusion) puis sur la même table sans cette ligne, et les
// trois empreintes sont les mêmes. Une dépendance neuve de la chaîne AUX DONNÉES
// de cette table (son hachage, ses exclusions lues pour fabriquer une empreinte)
// fera rougir ce banc.
//
// SA LIMITE, dite : la fixture de référence ne porte aucune passation
// `Q_ALI_01`. Si la chaîne consommait un jour les CONSTATS de convergence, ils
// seraient les mêmes avec et sans la ligne et ce banc resterait vert. Cette
// porte-là est tenue en amont par `exclusionQAli01Besoin1.guard.test.ts`
// (le service des contradictions n'est lu que par le chargeur du T0, qui écarte
// la forme `CONVERGENCE`).
//
// Contre-épreuve : le banc vérifie que le doublage de la table a bien eu lieu
// (le nombre d'exclusions diffère entre les deux constructions), faute de quoi
// l'égalité ne prouverait rien.

async function chaineAvecExclusion(avecExclusion: boolean) {
  vi.resetModules();
  vi.doMock('@/lib/clinical/convergenceV1', async importer => {
    const reel = await importer<typeof import('@/lib/clinical/convergenceV1')>();
    const exclusions = avecExclusion
      ? reel.EXCLUSIONS_CONVERGENCE_V1
      : reel.EXCLUSIONS_CONVERGENCE_V1.filter(e => !(e.idQuestionnaire === 'Q_ALI_01' && e.besoin === 1));
    return {
      ...reel,
      EXCLUSIONS_CONVERGENCE_V1: exclusions,
      TABLE_CONVERGENCE_V1: { ...reel.TABLE_CONVERGENCE_V1, exclusions },
    };
  });
  const table = (await import('@/lib/clinical/convergenceV1')).EXCLUSIONS_CONVERGENCE_V1;
  const fixture = await import('./chaineC1Fixture');
  fixture.signerTablePriorites();
  const chaine = fixture.chaineC1DeReference({ selection: fixture.CANDIDAT_RANG_1 });
  fixture.retablirTablePriorites();
  return {
    exclusions: table.length,
    cliche: chaine.snapshot.inputHash,
    revue: chaine.review.inputHash,
    carte: chaine.decisionCard.inputHash,
  };
}

describe('D-555 — la chaîne des cartes de décision ne lit pas la table de convergence', () => {
  it('cliché, revue et carte ont les mêmes empreintes, avec ou sans l’exclusion du besoin 1', async () => {
    try {
      const livree = await chaineAvecExclusion(true);
      const sans = await chaineAvecExclusion(false);
      // Le doublage a bien eu lieu.
      expect(livree.exclusions).toBe(sans.exclusions + 1);
      // Et rien, dans les trois empreintes, ne le voit.
      expect(sans.cliche).toBe(livree.cliche);
      expect(sans.revue).toBe(livree.revue);
      expect(sans.carte).toBe(livree.carte);
      expect(livree.carte).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      vi.doUnmock('@/lib/clinical/convergenceV1');
      vi.resetModules();
    }
  });
});
