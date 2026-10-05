import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, specificateursImportes } from './balayageSources';

// BP-01 ([[D-266]] §7) — DC-03 est bloquante pour toute sortie LLM du
// programme : chaque module du périmètre biologie qui appelle un LLM importe
// `verifierDc03`. Le banc garde la structure (l'import), la revue garde l'usage
// (le verdict `ok: false` empêche bien de servir la sortie).
//
// PÉRIMÈTRE BIOLOGIE : chemin sous `biology-library/`, `bio-parcours/`,
// `fiches-usage/` (BP-12a) ou une route `biologie/`, ou module qui importe
// `biology-library` ou `bio-parcours`.
// APPELANT LLM : module qui importe `@/lib/anthropic` ou le SDK.
// LIMITE, dite pour ne pas sur-promettre : le banc juge l'appelant DIRECT. Un
// module hors périmètre qui rédigerait par LLM pour une surface biologie, sans
// lui-même importer la biologie, échappe au balayage et relève de la revue.
//
// UNE EXEMPTION, MOTIVÉE : l'extraction de compte rendu (BIO-INGEST, [[D-256]]).
// Elle ne rédige rien pour personne : sa sortie est un schéma fermé
// (`additionalProperties: false`), lu par un parseur à clés exactes, posé en
// staging et validé ligne à ligne par le praticien avant d'exister — jamais
// servi tel quel. Ce n'est pas une sortie du programme BIO-PARCOURS.
// L'exemption est LIÉE À CETTE FORME (revue BP-01) : les champs du schéma de
// sortie sont épinglés ci-dessous — un champ libre ajouté rougit, et la revue
// juge alors si l'exemption tient encore.
const EXEMPTES = ['web/src/lib/biology-library/import/extraction.ts'];
const CHAMPS_SORTIE_EXTRACTION = [
  'lisible', 'laboratoire', 'lignes', 'items',
  'page', 'libelle', 'valeur', 'unite', 'date_prelevement', 'heure_prelevement',
  // [[D-267]] (LOT-07, jugé à la revue) : deux faits RECOPIÉS tels qu'imprimés,
  // nullables, jamais rédigés — l'exemption tient : ils sont validés ligne à
  // ligne avec la valeur, et restitués attribués au laboratoire.
  'intervalle_reference', 'marquage',
];

function appelleUnLlm(specs: readonly string[]): boolean {
  return specs.some(s => s === '@/lib/anthropic' || /(^|\/)anthropic$/.test(s) || s.startsWith('@anthropic-ai/'));
}

function dansLePerimetre(chemin: string, specs: readonly string[]): boolean {
  return /\/(biology-library|bio-parcours|fiches-usage)\//.test(chemin)
    || /\/api\/praticien\/biologie\//.test(chemin)
    || specs.some(s => /(^|\/)(biology-library|bio-parcours)(\/|$)/.test(s));
}

/** Appelants LLM du périmètre biologie qui n'importent pas le vérificateur. */
export function appelantsSansVerificateur(fichiers: readonly { chemin: string; source: string }[]): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin) && f.chemin !== 'web/src/lib/anthropic.ts')
    .map(f => ({ chemin: f.chemin, specs: specificateursImportes(f.source) }))
    .filter(f => appelleUnLlm(f.specs) && dansLePerimetre(f.chemin, f.specs))
    .filter(f => !f.specs.some(s => /(^|\/)verifierDc03$/.test(s)))
    .map(f => f.chemin)
    .filter(chemin => !EXEMPTES.includes(chemin))
    .sort();
}

describe('appelants LLM du périmètre biologie — vérificateur DC-03 importé (BP-01)', () => {
  const fichiers = fichiersSource().map(chemin => ({ chemin, source: lire(chemin) }));

  it('aucun appelant LLM du périmètre sans `verifierDc03`', () => {
    expect(
      appelantsSansVerificateur(fichiers),
      'sortie LLM du programme : passer le texte par `verifierDc03` et ne pas servir un verdict `ok: false`',
    ).toEqual([]);
  });

  it('l\'exemption désigne toujours un appelant LLM réel (elle ne se périme pas)', () => {
    for (const chemin of EXEMPTES) {
      const f = fichiers.find(x => x.chemin === chemin);
      expect(f, `exemption périmée : ${chemin}`).toBeDefined();
      expect(appelleUnLlm(specificateursImportes(f!.source)), `${chemin} n'appelle plus de LLM`).toBe(true);
    }
  });

  it('l\'exemption tient à la forme fermée : schéma `additionalProperties: false`, champs épinglés', () => {
    const source = lire(EXEMPTES[0]);
    const debut = source.indexOf('const SCHEMA_SORTIE');
    const schema = source.slice(debut, source.indexOf('} as const;', debut));
    expect(debut, 'SCHEMA_SORTIE introuvable : l\'exemption n\'a plus d\'objet').toBeGreaterThan(-1);
    expect(schema.match(/additionalProperties:\s*false/g)?.length).toBe(2);
    expect([...schema.matchAll(/(\w+):\s*\{\s*type:/g)].map(m => m[1])).toEqual(CHAMPS_SORTIE_EXTRACTION);
  });

  // CONTRE-ÉPREUVE : la mutation attendue — un module de rédaction biologie
  // qui appelle le LLM sans le vérificateur — rougit ; avec lui, il passe ;
  // hors périmètre, il n'est pas jugé ici.
  it('le pipeline voit un rédacteur sans vérificateur, admet le vérificateur', () => {
    const lus = appelantsSansVerificateur([
      { chemin: 'web/src/lib/bio-parcours/redaction.ts', source: "import { anthropic } from '@/lib/anthropic';" },
      { chemin: 'web/src/app/api/praticien/x/route.ts', source: "import { anthropic } from '@/lib/anthropic';\nimport { a } from '@/lib/biology-library/catalogue';" },
      { chemin: 'web/src/lib/bio-parcours/ok.ts', source: "import { anthropic } from '@/lib/anthropic';\nimport { verifierDc03 } from './verifierDc03';" },
      { chemin: 'web/src/lib/synthese/generation.ts', source: "import { anthropic } from '@/lib/anthropic';" },
    ]);
    expect(lus).toEqual(['web/src/app/api/praticien/x/route.ts', 'web/src/lib/bio-parcours/redaction.ts']);
  });
});
