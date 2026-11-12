import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { FICHES_USAGE_BESOIN2_V1 } from '@/lib/fiches-usage/ficheUsageBesoin2V1';
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
// cette clause est toujours là.
//
// CE QUE CE BANC AJOUTE — trois portes qui ne tenaient que par l'état du code :
//   1. les fiches d'usage signées ([[D-457]]) : le marqueur n'y entre qu'au
//      statut « non validé », et aucune fiche qui cite un claim sous réserve
//      ne le porte dans ses analytes ;
//   2. les indications de biologie signées : une règle qui cite un claim sous
//      réserve ne nomme pas le marqueur ;
//   3. l'IA : le corpus signé de la synthèse ne nomme ni le marqueur ni un claim
//      sous réserve, et aucun module qui appelle le modèle ne lit les claims du
//      corpus, sauf les deux outils de validation de l'atelier, nommés.
//
// LA LISTE porte les cinq écarts clos de [[D-465]] §3 et les deux claims signés
// sous la même réserve par [[D-498]]. Des identifiants seulement : le texte
// des claims vit en base ([[D-251]] §4).

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

const APPEL_MODELE = /@anthropic-ai\/sdk|from\s+['"]@\/lib\/anthropic['"]|import\(\s*['"]@\/lib\/anthropic['"]\s*\)|api\.anthropic\.com/;
const LECTURE_CLAIMS = /['"](?:@\/lib\/rag(?:\/[^'"]*)?|[^'"]*\/rag\/claims(?:\/[^'"]*)?)['"]|match_wellneuro_rag_claims|rag_corpus_claims/;

function sourcesDuDepot(dossier: string): string[] {
  const fichiers: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) {
      if (nom === 'generated' || nom === 'node_modules') continue;
      fichiers.push(...sourcesDuDepot(chemin));
    } else if (/\.(ts|tsx)$/.test(nom) && !/\.test\.(ts|tsx)$/.test(nom)) {
      fichiers.push(chemin);
    }
  }
  return fichiers;
}

const relatif = (chemin: string) => path.relative(SRC, chemin).split(path.sep).join('/');

describe('Réserve de D-465 §3 : le marqueur anti-LDL oxydé ne vaut pas indication (D-498)', () => {
  it('la liste est celle de D-465 §3 et de D-498, sans doublon', () => {
    expect(new Set(CLAIMS_SOUS_RESERVE).size).toBe(7);
  });

  describe('1. fiches d’usage signées', () => {
    const fiches = FICHES_USAGE_BESOIN2_V1.fiches;

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

  describe('2. indications de biologie signées', () => {
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

    it('le contrat du catalogue refuse toujours le marqueur dans un panel (D-465 §2)', () => {
      const contrat = readFileSync(path.join(WEB, 'prisma', 'checks', 'cb_catalogue_niveau_1_donnees.sql'), 'utf8');
      expect(contrat).toMatch(
        /SELECT count\(\*\) INTO nb FROM biology_panel_items WHERE analyte_code = 'BIO_ANTI_LDL_OXYDE';/,
      );
      expect(contrat).toMatch(/RAISE EXCEPTION 'D-465 §2: % item\(s\) de panel portent encore le marqueur/);
    });
  });

  describe('3. l’IA', () => {
    it('le corpus signé de la synthèse ne nomme ni le marqueur ni un claim sous réserve', () => {
      expect(CORPUS_CLINIQUE_SYNTHESE_V1.length).toBeGreaterThan(0);
      for (const nom of NOMS_DU_MARQUEUR) expect(CORPUS_CLINIQUE_SYNTHESE_V1).not.toMatch(nom);
      for (const id of CLAIMS_SOUS_RESERVE) expect(CORPUS_CLINIQUE_SYNTHESE_V1).not.toContain(id);
    });

    const appelants = sourcesDuDepot(SRC).filter((f) => APPEL_MODELE.test(readFileSync(f, 'utf8')));

    it('le balayage trouve les modules qui appellent le modèle, dont la synthèse et les outils de l’atelier', () => {
      const noms = appelants.map(relatif);
      expect(noms).toContain('lib/synthese/generation.ts');
      for (const outil of OUTILS_ATELIER) expect(noms).toContain(outil);
    });

    it('hors des outils de l’atelier, aucun module qui appelle le modèle ne lit les claims ni ne nomme le marqueur', () => {
      const fautifs: string[] = [];
      for (const fichier of appelants) {
        const nom = relatif(fichier);
        if (OUTILS_ATELIER.has(nom)) continue;
        const source = readFileSync(fichier, 'utf8');
        if (LECTURE_CLAIMS.test(source)) fautifs.push(`${nom} : lit les claims du corpus`);
        if (NOMS_DU_MARQUEUR.some((n) => n.test(source))) fautifs.push(`${nom} : nomme le marqueur`);
        for (const id of CLAIMS_SOUS_RESERVE) if (source.includes(id)) fautifs.push(`${nom} : cite ${id}`);
      }
      expect(fautifs).toEqual([]);
    });
  });
});
