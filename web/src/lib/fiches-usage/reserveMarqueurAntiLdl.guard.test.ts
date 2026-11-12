import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { FICHES_USAGE_BESOIN2_V1 } from '@/lib/fiches-usage/ficheUsageBesoin2V1';
import { CLAIMS_SOUS_RESERVE_INDICATION } from '@/lib/fiches-usage/reserveIndication';
import { INDICATIONS_BIOLOGIE_V1 } from '@/lib/biology-library/indicationsBiologieV1';
import { CORPUS_CLINIQUE_SYNTHESE_V1 } from '@/lib/clinical/corpusSyntheseV1';

// LA RÉSERVE DE [[D-465]] §3, GARDÉE PAR UN BANC — [[D-498]].
//
// [[D-465]] a retiré le marqueur `BIO_ANTI_LDL_OXYDE` des panels et du lien
// d'axe. Des claims VALIDE qui le citent dans une liste de bilan restent
// servables, sous une réserve écrite : la présence du marqueur dans ces listes
// ne vaut plus indication de le demander, y compris dans une recommandation
// produite par l'IA. Jusqu'ici, aucun banc ne la gardait (§3, « Limite »).
//
// CE QUI LA GARDAIT DÉJÀ, ET RESTE AILLEURS : la composition des panels, tenue
// en base par `cb_catalogue_niveau_1_donnees.sql` (aucun item de panel ne porte
// le marqueur, [[D-465]] §2). Le courrier au médecin et le document patient
// recalculent leur proposition depuis les panels. Ce banc vérifie seulement que
// cette clause est toujours là, active.
//
// CE QUE CE BANC AJOUTE — trois portes qui ne tenaient que par l'état du code :
//   1. les fiches d'usage signées ([[D-457]]) : le marqueur n'y entre qu'au
//      statut « non validé », et aucune fiche qui cite un claim sous réserve
//      ne le porte dans ses analytes ;
//   2. les indications de biologie signées : une règle qui cite un claim sous
//      réserve ne nomme pas le marqueur ;
//   3. l'IA : le corpus signé de la synthèse ne nomme ni le marqueur ni un claim
//      sous réserve ; aucun module qui appelle le modèle ne lit le TEXTE des
//      claims du corpus, ni lui-même ni par un module qu'il importe, même
//      indirectement ; et aucun ne nomme le marqueur ni un claim sous réserve.
//      Deux outils de validation de l'atelier sont exemptés, nommés.
//
// SES LIMITES, ÉCRITES ([[D-498]] §4) : un appel au modèle par un client que le
// balayage ne reconnaît pas (ni le SDK, ni `lib/anthropic`, ni l'API par son
// adresse), ou une lecture du texte des claims par un autre nom que la colonne,
// le champ ou la fonction de recherche, lui échapperait. Le nom du marqueur
// n'est cherché que dans le module appelant lui-même : l'import des comptes
// rendus le connaît légitimement, par son résolveur de libellés.
//
// LA LISTE porte les cinq écarts clos de [[D-465]] §3 et les deux claims signés
// sous la même réserve par [[D-498]]. Des identifiants seulement : le texte
// des claims vit en base ([[D-251]] §4).
//
// HORS DE `lib/clinical/` À DESSEIN : ce dossier déclenche une release-db au
// merge (`release-db.yml`), et un banc n'a rien à appliquer.

const MARQUEUR = 'BIO_ANTI_LDL_OXYDE';

const CLAIMS_SOUS_RESERVE: readonly string[] = [
  // [[D-465]] §3 : les cinq écarts clos.
  'WN-CL-0043-017',
  'WN-CL-0168-025',
  'WN-CL-0178-054',
  'WN-CL-0376-016',
  'WN-CL-0386-003',
  // [[D-498]] : signés sous la même réserve.
  'WN-CL-0043-005',
  'WN-CL-0377-016',
];

// Le nom du marqueur tel qu'un texte destiné au modèle pourrait l'écrire.
const NOMS_DU_MARQUEUR: readonly RegExp[] = [/BIO_ANTI_LDL_OXYDE/, /anti[\s-]*LDL/i, /LDL[\s-]*oxyd/i];

// Résolu depuis CE fichier : un balayage parti du mauvais répertoire serait
// vert pour la pire des raisons.
const WEB = path.resolve(__dirname, '../../..');
const SRC = path.join(WEB, 'src');

/** Les outils de validation de l'atelier : ils soumettent au modèle les claims
 * d'UNE source pour évaluer une restitution ou tirer un questionnaire de
 * relecture. Ils ne produisent aucune recommandation pour un patient. */
const OUTILS_ATELIER = new Set(['lib/rag/claims/evaluation.ts', 'lib/rag/claims/questionnaire.ts']);

/** Un module qui appelle le modèle : le SDK, le client du dépôt (par alias ou
 * en relatif), ou l'API par son adresse. */
const APPEL_MODELE =
  /@anthropic-ai\/sdk|['"]@\/lib\/anthropic['"]|['"](?:\.\.?\/)+(?:[\w-]+\/)*anthropic['"]|api\.anthropic\.com/;

/** Lire le TEXTE d'un claim : la colonne, le champ du client, ou la fonction de
 * recherche qui le sert. Cherché hors commentaires. */
const LECTURE_TEXTE_CLAIMS = /\btexte_normalise\b|\btexteNormalise\b|\bmatch_wellneuro_rag_claims\b/;

/** Le source sans ses lignes de commentaire (`//`, `/*`, ` *`). */
function sansCommentaires(source: string): string {
  return source
    .split('\n')
    .filter((ligne) => !/^\s*(\/\/|\/\*|\*)/.test(ligne))
    .join('\n');
}

/** Les spécifieurs des imports de VALEUR : import statique (pas `import type`),
 * import latéral, ré-export, import dynamique. */
function specifieursDeValeur(source: string): string[] {
  const s: string[] = [];
  const motifs = [
    /^\s*import\s+(?!type\b)[^;]*?\bfrom\s+(['"])([^'"]+)\1/gm,
    /^\s*import\s+(['"])([^'"]+)\1/gm,
    /^\s*export\s+(?!type\b)[^;]*?\bfrom\s+(['"])([^'"]+)\1/gm,
    /\bimport\(\s*(['"])([^'"]+)\1\s*\)/g,
  ];
  for (const motif of motifs) for (const m of source.matchAll(motif)) s.push(m[2]);
  return s;
}

/** Résout un spécifieur du dépôt vers une clé `lib/…/x.ts` ; `null` pour un paquet. */
function resoudre(depuis: string, specifieur: string, existe: (cle: string) => boolean): string | null {
  let base: string;
  if (specifieur.startsWith('@/')) base = specifieur.slice(2);
  else if (specifieur.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(depuis), specifieur));
  else return null;
  for (const cle of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (/\.(ts|tsx)$/.test(cle) && existe(cle)) return cle;
  }
  return null;
}

/** Les modules atteints par imports de valeur depuis `entree`, `entree` comprise. */
function modulesAtteints(entree: string, sources: ReadonlyMap<string, string>): Set<string> {
  const vus = new Set<string>();
  const pile = [entree];
  while (pile.length > 0) {
    const cle = pile.pop() as string;
    if (vus.has(cle)) continue;
    vus.add(cle);
    for (const spec of specifieursDeValeur(sources.get(cle) ?? '')) {
      const cible = resoudre(cle, spec, (c) => sources.has(c));
      if (cible) pile.push(cible);
    }
  }
  return vus;
}

/** Les modules atteints depuis `entree` qui lisent le texte des claims. */
function lecteursAtteints(entree: string, sources: ReadonlyMap<string, string>): string[] {
  return [...modulesAtteints(entree, sources)]
    .filter((cle) => LECTURE_TEXTE_CLAIMS.test(sansCommentaires(sources.get(cle) ?? '')))
    .sort();
}

/** La clause du contrat du catalogue qui refuse le marqueur dans un panel,
 * active (hors commentaire de ligne `--` ou de bloc) et suivie de son refus à
 * zéro. Que le contrat s'exécute est l'affaire du CI, qui le joue
 * (`ci.yml`) : ce banc n'en vérifie que la présence. */
function clauseRefusMarqueurActive(contrat: string): boolean {
  const sansBlocs = contrat.replace(/\/\*[\s\S]*?\*\//g, '');
  return /^\s*SELECT count\(\*\) INTO nb FROM biology_panel_items WHERE analyte_code = 'BIO_ANTI_LDL_OXYDE';\s*\n\s*IF nb <> 0 THEN\s*\n\s*RAISE EXCEPTION 'D-465 §2:/m.test(
    sansBlocs,
  );
}

function sourcesDuDepot(): Map<string, string> {
  const sources = new Map<string, string>();
  const parcourir = (dossier: string) => {
    for (const nom of readdirSync(dossier)) {
      const chemin = path.join(dossier, nom);
      if (statSync(chemin).isDirectory()) {
        if (nom === 'generated' || nom === 'node_modules') continue;
        parcourir(chemin);
      } else if (/\.(ts|tsx)$/.test(nom) && !/\.test\.(ts|tsx)$/.test(nom)) {
        sources.set(path.relative(SRC, chemin).split(path.sep).join('/'), readFileSync(chemin, 'utf8'));
      }
    }
  };
  parcourir(SRC);
  return sources;
}

describe('Réserve de D-465 §3 : le marqueur anti-LDL oxydé ne vaut pas indication (D-498)', () => {
  it('la liste est celle de D-465 §3 et de D-498, sans doublon', () => {
    expect(new Set(CLAIMS_SOUS_RESERVE).size).toBe(7);
  });

  describe('1. fiches d’usage signées', () => {
    const fiches = FICHES_USAGE_BESOIN2_V1.fiches;

    // [[D-501]] : la liste que lit l'outil de rédaction est exactement celle-ci.
    it('la liste lue par l’outil de rédaction est celle du banc', () => {
      expect([...CLAIMS_SOUS_RESERVE_INDICATION]).toEqual([...CLAIMS_SOUS_RESERVE]);
    });

    // La liste exacte des claims sous réserve que la structure épingle : une
    // épingle nouvelle (à la prochaine re-signature) rougit ici, pour être relue
    // contre la réserve avant d'entrer dans la liste.
    it('le balayage lit la structure, et les claims sous réserve épinglés sont ceux attendus', () => {
      expect(fiches.length).toBeGreaterThan(0);
      const cites = new Set(fiches.flatMap((f) => f.claims.map((c) => c.claimId)));
      expect(CLAIMS_SOUS_RESERVE.filter((id) => cites.has(id))).toEqual([
        'WN-CL-0168-025',
        'WN-CL-0178-054',
        'WN-CL-0376-016',
        'WN-CL-0386-003',
      ]);
    });

    it('le marqueur n’entre dans une fiche qu’au statut « non validé »', () => {
      const fautives = fiches
        .filter((f) => f.codesAnalyte.includes(MARQUEUR) && f.statutUsage !== 'non_valide')
        .map((f) => `${f.id} (${f.statutUsage})`);
      expect(fautives).toEqual([]);
    });

    it('une fiche qui cite un claim sous réserve ne porte pas le marqueur', () => {
      const fautives = fiches
        .filter((f) => f.claims.some((c) => CLAIMS_SOUS_RESERVE.includes(c.claimId)))
        .filter((f) => f.codesAnalyte.includes(MARQUEUR))
        .map((f) => f.id);
      expect(fautives).toEqual([]);
    });
  });

  describe('2. indications de biologie signées et contrat du catalogue', () => {
    it('une règle qui cite un claim sous réserve ne nomme pas le marqueur', () => {
      const regles = INDICATIONS_BIOLOGIE_V1.filter((r) =>
        r.justificationClaims.some((c) => CLAIMS_SOUS_RESERVE.includes(c.claimId)),
      );
      expect(regles.length).toBeGreaterThan(0);
      const fautives = regles
        .filter((r) => NOMS_DU_MARQUEUR.some((nom) => nom.test(JSON.stringify(r))))
        .map((r) => r.id);
      expect(fautives).toEqual([]);
    });

    const contrat = readFileSync(path.join(WEB, 'prisma', 'checks', 'cb_catalogue_niveau_1_donnees.sql'), 'utf8');
    const select = "SELECT count(*) INTO nb FROM biology_panel_items WHERE analyte_code = 'BIO_ANTI_LDL_OXYDE';";

    it('le contrat du catalogue refuse toujours le marqueur dans un panel, clause active (D-465 §2)', () => {
      expect(clauseRefusMarqueurActive(contrat)).toBe(true);
    });

    it('mutations : clause commentée (ligne ou bloc), seuil changé, refus neutralisé — rouges', () => {
      const i = contrat.indexOf(select);
      expect(i).toBeGreaterThan(0);
      const avant = contrat.slice(0, i);
      const apres = contrat.slice(i);
      expect(clauseRefusMarqueurActive(contrat.replace(select, `-- ${select}`))).toBe(false);
      const fin = apres.indexOf('END IF;') + 'END IF;'.length;
      expect(clauseRefusMarqueurActive(`${avant}/* ${apres.slice(0, fin)} */${apres.slice(fin)}`)).toBe(false);
      expect(clauseRefusMarqueurActive(avant + apres.replace('IF nb <> 0 THEN', 'IF nb <> 5 THEN'))).toBe(false);
      expect(clauseRefusMarqueurActive(avant + apres.replace('IF nb <> 0 THEN', 'IF false THEN'))).toBe(false);
    });
  });

  describe('3. l’IA', () => {
    it('le corpus signé de la synthèse ne nomme ni le marqueur ni un claim sous réserve', () => {
      expect(CORPUS_CLINIQUE_SYNTHESE_V1.length).toBeGreaterThan(0);
      for (const nom of NOMS_DU_MARQUEUR) expect(CORPUS_CLINIQUE_SYNTHESE_V1).not.toMatch(nom);
      for (const id of CLAIMS_SOUS_RESERVE) expect(CORPUS_CLINIQUE_SYNTHESE_V1).not.toContain(id);
    });

    const sources = sourcesDuDepot();
    const appelants = [...sources.keys()].filter((cle) => APPEL_MODELE.test(sources.get(cle) as string)).sort();

    it('le balayage trouve les modules qui appellent le modèle, dont la synthèse et les outils de l’atelier', () => {
      expect(appelants).toContain('lib/synthese/generation.ts');
      for (const outil of OUTILS_ATELIER) {
        expect(existsSync(path.join(SRC, outil))).toBe(true);
        expect(appelants).toContain(outil);
      }
    });

    it('le graphe des imports est suivi : la synthèse atteint des dizaines de modules', () => {
      // Un résolveur cassé rendrait la porte transitive vide, donc verte.
      expect(modulesAtteints('lib/synthese/generation.ts', sources).size).toBeGreaterThan(30);
    });

    it('hors des outils de l’atelier, aucun module qui appelle le modèle ne lit le texte des claims, même indirectement', () => {
      const fautifs = appelants
        .filter((cle) => !OUTILS_ATELIER.has(cle))
        .flatMap((cle) => lecteursAtteints(cle, sources).map((lecteur) => `${cle} → ${lecteur}`));
      expect(fautifs).toEqual([]);
    });

    it('hors des outils de l’atelier, aucun module qui appelle le modèle ne nomme le marqueur ni un claim sous réserve', () => {
      const fautifs: string[] = [];
      for (const cle of appelants) {
        if (OUTILS_ATELIER.has(cle)) continue;
        const source = sansCommentaires(sources.get(cle) as string);
        if (NOMS_DU_MARQUEUR.some((n) => n.test(source))) fautifs.push(`${cle} : nomme le marqueur`);
        for (const id of CLAIMS_SOUS_RESERVE) if (source.includes(id)) fautifs.push(`${cle} : cite ${id}`);
      }
      expect(fautifs).toEqual([]);
    });

    it('mutations : lecture du texte directe, par un module importé puis ré-exporté, en relatif — rouges ; en commentaire — verte', () => {
      const graphe = new Map<string, string>([
        ['lib/ia/appelant.ts', "import { anthropic } from '@/lib/anthropic';\nimport { bloc } from './bloc';\nexport const x = [anthropic, bloc];"],
        ['lib/ia/bloc.ts', "export { lire as bloc } from '../rag/relais';"],
        ['lib/rag/relais.ts', "import { db } from '@/lib/db';\nexport async function lire() { return db.$queryRaw`SELECT texte_normalise FROM t`; }"],
        ['lib/db.ts', 'export const db = {};'],
        ['lib/ia/direct.ts', "import Anthropic from '@anthropic-ai/sdk';\nconst c = { texteNormalise: '' };\nexport { Anthropic, c };"],
        ['lib/ia/commente.ts', "import Anthropic from '@anthropic-ai/sdk';\n// texte_normalise n'est cité qu'en commentaire\nexport { Anthropic };"],
        ['lib/ia/relatif.ts', "import { anthropic } from '../anthropic';\nexport const y = anthropic;"],
      ]);
      expect(lecteursAtteints('lib/ia/appelant.ts', graphe)).toEqual(['lib/rag/relais.ts']);
      expect(lecteursAtteints('lib/ia/direct.ts', graphe)).toEqual(['lib/ia/direct.ts']);
      expect(lecteursAtteints('lib/ia/commente.ts', graphe)).toEqual([]);
      expect(APPEL_MODELE.test(graphe.get('lib/ia/relatif.ts') as string)).toBe(true);
    });
  });
});
