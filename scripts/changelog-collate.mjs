#!/usr/bin/env node
// Replie les fragments de `changelog.d/` dans `CHANGELOG.md`.
//
// Pourquoi ce script existe : les entrées de changelog s'écrivent désormais une
// par fichier dans `changelog.d/` (voir son README), pour que deux PR n'entrent
// plus en conflit sur le haut de `CHANGELOG.md`. Ce script fait l'opération
// inverse quand on consolide : il insère les fragments en tête de la section
// `## Non publié`, le plus récent d'abord, puis supprime les fichiers repliés.
//
// La logique est une fonction pure `collate()` (testable sur des fichiers de
// fixture) ; le bas du fichier n'est que le câblage CLI.

import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARQUEUR = '## Non publié';

/**
 * @param {object} opts
 * @param {string} opts.fragDir       Répertoire des fragments.
 * @param {string} opts.changelogPath Chemin du CHANGELOG.md cible.
 * @param {boolean} [opts.apply]      Écrit et supprime (true) ou simule (false).
 * @returns {{ inseres: number, fichiers: string[], contenu: string }}
 */
export function collate({ fragDir, changelogPath, apply = true }) {
  const fichiers = readdirSync(fragDir)
    .filter((nom) => nom.endsWith('.md') && nom !== 'README.md')
    // Préfixe date → tri chronologique croissant, puis inversé : le plus récent
    // se retrouve en tête, comme la convention d'écriture manuelle actuelle.
    .sort()
    .reverse();

  const changelog = readFileSync(changelogPath, 'utf8');
  if (fichiers.length === 0) return { inseres: 0, fichiers: [], contenu: changelog };

  const idx = changelog.indexOf(MARQUEUR);
  if (idx === -1) throw new Error(`Marqueur « ${MARQUEUR} » absent de ${changelogPath}`);

  // Chaque fragment est un bloc autonome ; on normalise ses bords pour ne pas
  // accumuler les lignes vides à la jointure.
  const blocs = fichiers.map((nom) => readFileSync(join(fragDir, nom), 'utf8').trim());

  // Insertion juste après la ligne du marqueur ; on réabsorbe les lignes vides
  // qui la suivaient pour garder un seul saut avant la première entrée.
  const finLigneMarqueur = changelog.indexOf('\n', idx) + 1;
  const avant = changelog.slice(0, finLigneMarqueur);
  const apres = changelog.slice(finLigneMarqueur).replace(/^\n+/, '');
  const contenu = `${avant}\n${blocs.join('\n\n')}\n\n${apres}`;

  if (apply) {
    writeFileSync(changelogPath, contenu);
    for (const nom of fichiers) rmSync(join(fragDir, nom));
  }
  return { inseres: fichiers.length, fichiers, contenu };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const simulation = process.argv.includes('--dry-run');
  const res = collate({
    fragDir: join(RACINE, 'changelog.d'),
    changelogPath: join(RACINE, 'CHANGELOG.md'),
    apply: !simulation,
  });
  if (res.inseres === 0) {
    console.error('Aucun fragment à replier.');
  } else if (simulation) {
    process.stdout.write(res.contenu);
    console.error(`\n${res.inseres} fragment(s) seraient repliés (dry-run, rien écrit).`);
  } else {
    console.error(`${res.inseres} fragment(s) repliés dans CHANGELOG.md et supprimés :`);
    for (const nom of res.fichiers) console.error(`  - changelog.d/${nom}`);
  }
}
