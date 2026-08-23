import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Banc-sentinelle des importeurs d'`evaluerAbstention` — relevé L-A de la
// revue du 2026-08-16, option « la moins invasive » retenue par elle.
//
// LE RISQUE : la fonction est exportée et rend un verdict AUX TEXTES SIGNÉS.
// (Cette prose disait, jusqu'au 2026-08-23, que la branche `safetyFindings > 0`
// était inatteignable depuis `construireChaineC1` : [[D-099]] y a branché un
// producteur, et le motif de l'export s'est réduit au banc de la table.)
// Un appelant de
// production qui l'appellerait directement obtiendrait « required » /
// « not_required » sans passer par `reglesPrioritesValidees()`, donc HORS
// VERROU : table non signée, il servirait quand même un verdict. Aucun type ne
// l'interdit ; cette liste épinglée le fait — un importeur nouveau doit venir
// s'inscrire ici, et la revue juge alors s'il passe par le verrou.
//
// PÉRIMÈTRE : `web/src`, délibérément — le code exécutable. Un appelant sous
// `scripts/` ou `web/e2e/` échapperait à ce banc et relèverait de la revue
// humaine ; élargir ferait rougir sur les handoffs et décisions qui CITENT la
// fonction (revue de ce lot, finding M2 : un banc qui promet plus qu'il ne
// garde est un banc qui endort — la limite est donc écrite).
const CE_FICHIER = 'web/src/lib/clinical-engine/evaluerAbstentionImporteurs.guard.test.ts';
const IMPORTEURS_ATTENDUS = [
  // Le producteur lui-même — seul appelant de production, derrière
  // `reglesPrioritesValidees()` (chaineC1.ts:~310).
  'web/src/lib/clinical-engine/chaineC1.ts',
  // Le banc de la procédure d'abstention — la raison d'être de l'export.
  'web/src/lib/clinical/priorityRulesV1.test.ts',
  // CITE LE NOM, N'APPELLE PAS LA FONCTION ([[D-099]], LOT-04). Le producteur
  // de constats de sécurité décrit dans sa prose l'effet de ce qu'il produit —
  // « `evaluerAbstention` passe en `required` ». Le balayage est TEXTUEL et ne
  // dépouille pas les commentaires (délibérément : c'est le même balayage que
  // ferait une revue), si bien qu'une mention suffit à faire rougir. Inscrit
  // ici plutôt que contourné en reformulant le commentaire — et le cas
  // ci-dessous vérifie que cette entrée reste une MENTION : le jour où ce
  // fichier importerait réellement la fonction, il rougirait de nouveau.
  'web/src/lib/clinical-engine/safetyFindings.ts',
];

/** Les entrées qui ne doivent citer le nom qu'en prose, jamais l'importer. */
const MENTIONS_SEULES = ['web/src/lib/clinical-engine/safetyFindings.ts'];

/** Le pipeline de lecture, pur — extrait pour être éprouvé (contre-épreuve). */
function importeursDepuisSortie(sortie: string): string[] {
  return sortie.split('\n').filter(Boolean)
    .filter(chemin => chemin !== CE_FICHIER)
    .sort();
}

describe('evaluerAbstention — la liste des importeurs est épinglée', () => {
  it('aucun appelant nouveau ne rejoint le verdict signé sans passer par ici', () => {
    const racine = join(__dirname, '..', '..', '..', '..');
    // L'auto-exclusion désigne un fichier RÉEL : si ce banc est déplacé ou
    // renommé, la cause est nommée ici au lieu de se lire dans un diff de liste.
    expect(existsSync(join(racine, CE_FICHIER)), `chemin d'auto-exclusion périmé : ${CE_FICHIER}`).toBe(true);
    // `git grep -l --untracked` : le même balayage que ferait une revue,
    // exécuté par le CI — et `--untracked` pour qu'il tienne AUSSI en local,
    // avant le premier `git add` du fichier fautif (finding M1 : c'est la
    // minute exacte où le développeur veut le signal). Sortie 1 sans stdout =
    // zéro correspondance ; toute autre erreur remonte.
    let sortie = '';
    try {
      sortie = execFileSync('git', ['grep', '-l', '--untracked', 'evaluerAbstention', '--', 'web/src'], {
        cwd: racine,
        encoding: 'utf8',
      });
    } catch (erreur) {
      const e = erreur as { status?: number; stdout?: string };
      if (e.status === 1 && !e.stdout) sortie = '';
      else throw erreur;
    }
    expect(
      importeursDepuisSortie(sortie),
      'importeur nouveau d\'`evaluerAbstention` : vérifier qu\'il passe par '
        + '`reglesPrioritesValidees()` (le verrou), puis l\'inscrire ici avec son motif',
    ).toEqual([...IMPORTEURS_ATTENDUS].sort());
  });

  // Une entrée « mention seule » qui deviendrait un VRAI importeur passerait
  // sous le radar de la liste, puisqu'elle y figure déjà. Ce cas ferme cette
  // porte : il exige que le fichier ne porte aucune forme d'import du symbole,
  // et il rougit le jour où la mention devient un appel.
  it('une entrée « mention seule » ne devient jamais un importeur en silence', () => {
    const racine = join(__dirname, '..', '..', '..', '..');
    for (const chemin of MENTIONS_SEULES) {
      expect(existsSync(join(racine, chemin)), `entrée périmée : ${chemin}`).toBe(true);
      const source = readFileSync(join(racine, chemin), 'utf8');
      // Ce qu'on cherche est l'usage réel : un import du symbole, ou un appel.
      expect(source, `${chemin} importe désormais evaluerAbstention`)
        .not.toMatch(/import\s+[^;]*\bevaluerAbstention\b/);
      expect(source, `${chemin} appelle désormais evaluerAbstention`)
        .not.toMatch(/\bevaluerAbstention\s*\(/);
    }
  });

  // CONTRE-ÉPREUVE : le pipeline sait rougir. Sans elle, un banc-sentinelle
  // est lui-même non gardé — un `filter` trop large qui viderait la sortie
  // laisserait la liste attendue verte à jamais.
  it('le pipeline signale un importeur surnuméraire, et applique l’auto-exclusion', () => {
    const fabriquee = [
      'web/src/lib/clinical-engine/chaineC1.ts',
      'web/src/app/api/praticien/fautif/route.ts',
      CE_FICHIER,
    ].join('\n');
    const lus = importeursDepuisSortie(fabriquee);
    expect(lus).toContain('web/src/app/api/praticien/fautif/route.ts');
    expect(lus).not.toContain(CE_FICHIER);
    expect(lus).not.toEqual([...IMPORTEURS_ATTENDUS].sort());
  });
});
