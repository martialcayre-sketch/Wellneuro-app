import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// AUCUN COMPOSANT CLIENT N'IMPORTE UNE VALEUR DE `lib/clinical`.
//
// LE DÉFAUT QUE CE BANC FERME, trouvé en revue adversariale le 2026-08-12.
// `OrientationPanel.tsx` porte `'use client'` ; il a un moment importé
// `LIBELLE_EXTINCTION` — une VALEUR — depuis `stopRulesV1.ts`. Ce module importe
// `sha256` de `corpusSyntheseV1`, donc `crypto`, et appelle `sha256(...)` en
// portée module, ce qui RETIENT l'instantané du référentiel clinique. Le chunk
// client du cockpit aurait donc embarqué crypto-browserify, la table de règles
// entière et le corpus — et un fichier `/_next/static/…` n'est derrière aucune
// authentification.
//
// CE QUI NE L'AURAIT PAS VU. Ni `tsc`, ni le lint, ni les bancs, ni le build :
// Next résout `crypto` vers son polyfill compilé sans broncher. Le seul signe
// aurait été la taille d'un chunk que personne ne regarde.
//
// LA FRONTIÈRE EXACTE : `import type` est libre — il disparaît à la compilation
// et c'est ce que font tous les autres composants. C'est l'import de VALEUR qui
// est interdit, à une exception nommée près : les modules FEUILLES, qui
// n'importent rien et ne portent que des libellés.

// Résolu depuis CE fichier, et non depuis `process.cwd()` : le répertoire
// courant d'un run dépend de l'endroit d'où la suite est lancée, et un banc qui
// balaie un dossier vide est vert pour la pire des raisons.
const WEB = path.resolve(__dirname, '../../..');
const RACINE = path.join(WEB, 'src');
const CLINIQUE = path.join(WEB, 'src', 'lib', 'clinical');

/**
 * Modules de `lib/clinical` qu'un composant client a le droit d'importer en
 * valeur : ceux qui n'importent RIEN eux-mêmes. La condition est vérifiée ici,
 * pas déclarée — un import ajouté demain à l'un d'eux le sort de la liste.
 */
function feuillesAutorisees(): Set<string> {
  const feuilles = new Set<string>();
  for (const fichier of readdirSync(CLINIQUE)) {
    if (!fichier.endsWith('.ts') || fichier.endsWith('.test.ts')) continue;
    const source = readFileSync(path.join(CLINIQUE, fichier), 'utf8');
    // `[^;]*?` BORNE LA RECHERCHE À UN SEUL ÉNONCÉ. Avec `[\s\S]*?`, un import
    // ordinaire pouvait ouvrir la correspondance et courir jusqu'au `from` d'un
    // import de TYPE situé plus bas — le banc accusait alors une ligne qui
    // disparaît à la compilation. Un point-virgule ferme un énoncé : la
    // correspondance ne peut plus l'enjamber.
    const imports = [...source.matchAll(/^\s*import\s+(?!type\b)[^;]*?from\s+'([^']+)'/gm)];
    if (imports.length === 0) feuilles.add(fichier.replace(/\.ts$/, ''));
  }
  return feuilles;
}

function fichiersSources(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const complet = path.join(dossier, entree);
    if (statSync(complet).isDirectory()) {
      if (entree === 'node_modules') continue;
      trouves.push(...fichiersSources(complet));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entree) && !/\.test\.(ts|tsx)$/.test(entree)) trouves.push(complet);
  }
  return trouves;
}

describe('bundle client — la couche clinique ne part pas au navigateur', () => {
  const clients = fichiersSources(RACINE).filter(fichier => {
    const source = readFileSync(fichier, 'utf8');
    return /^\s*['"]use client['"]/m.test(source);
  });

  it('des composants clients existent bien — anti-vacuité', () => {
    expect(clients.length).toBeGreaterThan(10);
  });

  it('aucun composant client n’importe une VALEUR de lib/clinical', () => {
    const feuilles = feuillesAutorisees();
    // Anti-vacuité de la liste elle-même : si plus aucun module ne se qualifiait,
    // l'exception ne dispenserait plus personne — mais elle ne protégerait plus
    // rien non plus, et le banc mérite de le dire.
    expect(feuilles.size).toBeGreaterThan(0);

    const fautifs: string[] = [];
    for (const fichier of clients) {
      const source = readFileSync(fichier, 'utf8');
      for (const trouve of source.matchAll(/^\s*import\s+(?!type\b)([^;]*?)from\s+'(@\/lib\/clinical\/[^']+)'/gm)) {
        // `moduleCible`, et non `module` : le lint Next interdit d'assigner
        // cette variable-là, réservée par le runtime CommonJS.
        const moduleCible = trouve[2].split('/').pop() as string;
        if (feuilles.has(moduleCible)) continue;
        fautifs.push(`${path.relative(WEB, fichier)} → ${trouve[2]}`);
      }
    }
    expect(
      fautifs,
      'un composant client importe une valeur de lib/clinical : le corpus clinique et crypto partiraient dans le bundle navigateur',
    ).toEqual([]);
  });
});
