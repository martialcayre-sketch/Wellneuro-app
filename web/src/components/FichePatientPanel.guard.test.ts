import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// LES LECTEURS CONCURRENTS DE LA FICHE PORTENT TOUS UNE GARDE DE GÉNÉRATION.
//
// Revue Codex du 2026-09-04, P1-2. `chargerCorrections` en portait une depuis
// l'origine ; `chargerTrajectoire`, écrit trois lignes plus bas et de forme
// identique, n'en avait pas. Le défaut : une confirmation d'épisode déclenche
// une seconde lecture pendant que celle de l'ouverture est encore en vol, la
// seconde répond la première (elle porte le nouvel épisode), puis la PREMIÈRE
// arrive et écrase l'état frais avec l'historique d'avant le geste. Le praticien
// vient de confirmer, et le bandeau, le jalon dû et le résumé de réévaluation
// restent sur l'état antérieur — voire affirment qu'aucun cycle n'est lisible,
// ce que `DC-24` interdit.
//
// POURQUOI UNE GARDE STRUCTURELLE, ET PAS UN BANC DE COMPORTEMENT. Reproduire
// l'inversion demande de piloter une confirmation d'épisode pendant qu'une
// lecture est en vol, donc de tenir l'ordre de résolution de deux promesses à
// travers le panneau de confirmation : un banc coûteux et fragile pour trois
// lignes copiées d'un voisin déjà éprouvé. Ce que ce cas garde vraiment, c'est
// la DISCIPLINE — un quatrième lecteur ajouté demain sans compteur fait rougir
// le CI, ce qu'aucune relecture humaine ne garantit.
//
// Sa limite, dite pour ne pas se croire couvert : il vérifie qu'un compteur
// existe et qu'il est consulté, pas qu'il est consulté au bon endroit.

const SOURCE = path.resolve(__dirname, 'FichePatientPanel.tsx');

/** Le corps d'un `useCallback` nommé, accolades équilibrées. */
function corpsDuLecteur(source: string, nom: string): string {
  const debut = source.indexOf(`const ${nom} = useCallback(`);
  if (debut < 0) return '';
  let profondeur = 0;
  for (let i = source.indexOf('{', debut); i < source.length; i++) {
    if (source[i] === '{') profondeur++;
    else if (source[i] === '}' && --profondeur === 0) return source.slice(debut, i + 1);
  }
  return '';
}

describe('FichePatientPanel — lecteurs concurrents', () => {
  const source = readFileSync(SOURCE, 'utf8');

  // Anti-vacuité : sans ce cas, un renommage viderait les suivants en silence.
  it.each(['chargerCorrections', 'chargerTrajectoire'])('le lecteur %s existe', nom => {
    expect(corpsDuLecteur(source, nom).length).toBeGreaterThan(200);
  });

  it.each(['chargerCorrections', 'chargerTrajectoire'])(
    '%s prend une génération et la relit avant d’écrire',
    nom => {
      const corps = corpsDuLecteur(source, nom);
      // Prise du jeton à l'entrée : `const generation = ++<compteur>.current`.
      expect(corps).toMatch(/const\s+generation\s*=\s*\+\+\w+\.current/);
      // Et relecture APRÈS l'await, sans quoi le jeton ne sert à rien. Deux au
      // moins : le chemin nominal et le chemin d'échec.
      const relectures = corps.match(/if\s*\(\s*generation\s*!==\s*\w+\.current\s*\)\s*return/g);
      expect(relectures?.length ?? 0).toBeGreaterThanOrEqual(2);
    },
  );
});
