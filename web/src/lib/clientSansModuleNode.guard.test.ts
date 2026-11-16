import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { estFichierSource, RACINE as RACINE_DEPOT } from './bio-parcours/balayageSources';
import { contexteResolution, importsResolus, type ContexteResolution } from './bio-parcours/resolutionImports';

// AUCUN COMPOSANT CLIENT N'ATTEINT UN MODULE NATIF DE NODE — directement ou par
// un voisin (lot `autonomie-pieges-restes`, partie 2).
//
// LE PIÈGE. Au LOT-03 d'Alliance 6.0-B, `ObjectifNegociePanel.tsx`
// ('use client') ne prenait de `propositionObjectif.ts` qu'une borne de
// longueur, et tirait tout le module, donc son `node:crypto`, dans le bundle
// du navigateur. `tsc`, le lint et Vitest étaient verts. Seul T2, par le vrai
// `next build`, a rougi : `Module not found: node:crypto`. Ce banc rougit
// avant le build, dans la suite Vitest complète (T2, CI). Pas en T1 :
// `test:changed` suit le graphe d'imports, et ce banc lit les composants
// sans les importer — même limite que `bundleClient.guard`.
//
// LA FORME SANS PRÉFIXE (`crypto`, `fs`) est visée aussi : Next ne la refuse
// pas, il la remplace par un polyfill compilé, et le défaut ne se voit plus
// qu'à la taille d'un chunk (voir `lib/clinical/bundleClient.guard.test.ts`).
//
// LA FRONTIÈRE. `import type` est libre : il disparaît à la compilation. Un
// module `'use server'` arrête le parcours : Next n'en envoie au navigateur
// qu'une référence d'action, jamais le corps.

const WEB = path.resolve(__dirname, '../..');
const RACINE = path.join(WEB, 'src');

const NATIFS = new Set(builtinModules.flatMap(m => [m, `node:${m}`]));

/** Le module natif que désigne un spécifieur, ou `null` (`node:fs/promises` et `fs/promises` comptent). */
function natif(specificateur: string): string | null {
  if (specificateur.startsWith('node:')) return specificateur;
  const tete = specificateur.split('/')[0];
  return NATIFS.has(specificateur) || NATIFS.has(tete) ? specificateur : null;
}

const INDETERMINE = '<import indéterminé>';

let contexte: ContexteResolution | undefined;
const dejaLus = new Map<string, { voisins: string[]; natifs: string[] }>();

/** Les imports de VALEUR d'un fichier : voisins du dépôt résolus, et modules natifs nommés. */
function importsDe(fichier: string): { voisins: string[]; natifs: string[] } {
  const lu = dejaLus.get(fichier);
  if (lu) return lu;
  const relatif = path.relative(RACINE_DEPOT, fichier).split(path.sep).join('/');
  const voisins: string[] = [];
  const natifs: string[] = [];
  for (const i of importsResolus(relatif, (contexte ??= contexteResolution()))) {
    if (i.typeSeul) continue;
    const n = natif(i.specificateur);
    if (n) {
      natifs.push(n);
      continue;
    }
    if (i.indetermine) {
      voisins.push(INDETERMINE);
      continue;
    }
    const cible = i.atteint;
    if (cible === null || cible.startsWith('../') || /(^|\/)node_modules\//.test(cible) || !estFichierSource(cible)) continue;
    voisins.push(path.join(RACINE_DEPOT, cible));
  }
  const resultat = { voisins, natifs };
  dejaLus.set(fichier, resultat);
  return resultat;
}

/**
 * Les directives du PROLOGUE d'un module : les chaînes nues en tête, avant
 * toute instruction, commentaires sautés. `'use strict'; 'use client';` est
 * client ; un `'use server'` cité dans un commentaire ou plus bas ne l'est pas
 * (Codex).
 */
export function directives(source: string): string[] {
  const trouvees: string[] = [];
  let reste = source;
  for (;;) {
    reste = reste.replace(/^(?:\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*/, '');
    const m = /^(['"])([^'"\n]*)\1\s*;?/.exec(reste);
    if (!m) return trouvees;
    trouvees.push(m[2]);
    reste = reste.slice(m[0].length);
  }
}

function estServeur(fichier: string): boolean {
  return directives(readFileSync(fichier, 'utf8')).includes('use server');
}

/**
 * Le PREMIER chemin d'imports de valeur menant de `depart` à un module natif —
 * ou `null`. En largeur, pour rapporter le chemin le plus court.
 */
function cheminVersUnNatif(depart: string): string[] | null {
  const vus = new Set<string>([depart]);
  const file: Array<[string, string[]]> = [[depart, [depart]]];
  while (file.length > 0) {
    const [courant, chemin] = file.shift() as [string, string[]];
    const { voisins, natifs } = importsDe(courant);
    if (natifs.length > 0) return [...chemin, natifs[0]];
    for (const suivant of voisins) {
      if (suivant === INDETERMINE) return [...chemin, suivant];
      if (vus.has(suivant)) continue;
      vus.add(suivant);
      if (estServeur(suivant)) continue;
      file.push([suivant, [...chemin, suivant]]);
    }
  }
  return null;
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
    // `.js`/`.jsx` aussi : un départ client JavaScript serait sinon invisible (Codex).
    if (/\.(ts|tsx|js|jsx|mjs)$/.test(entree) && !/\.test\.(ts|tsx|js|jsx|mjs)$/.test(entree)) trouves.push(complet);
  }
  return trouves;
}

function lisible(p: string): string {
  return p === INDETERMINE || !path.isAbsolute(p) ? p : path.relative(WEB, p);
}

describe('bundle client — aucun module natif de Node ne part au navigateur', () => {
  const clients = fichiersSources(RACINE).filter(f => directives(readFileSync(f, 'utf8')).includes('use client'));

  it('lit les directives du prologue seulement (Codex)', () => {
    expect(directives("'use strict'; 'use client';\nimport x from 'y';")).toEqual(['use strict', 'use client']);
    expect(directives("/* entête */\n// note\n\"use server\";\nexport async function f() {}")).toEqual(['use server']);
    expect(directives("/*\n'use server'\n*/\nimport fs from 'node:fs';")).toEqual([]);
    expect(directives("import x from 'y';\n'use client';")).toEqual([]);
  });

  it('la lecture du prologue retrouve tous les clients de l’ancienne lecture par ligne', () => {
    const parLigne = fichiersSources(RACINE).filter(f => /^\s*['"]use client['"]/m.test(readFileSync(f, 'utf8')));
    expect(clients.length).toBe(parLigne.length);
  });

  it('des composants clients existent bien — anti-vacuité', () => {
    expect(clients.length).toBeGreaterThan(10);
  });

  it('aucun composant client n’atteint node:* (ni crypto, fs, path…), même par un voisin', () => {
    const fautifs: string[] = [];
    for (const client of clients) {
      const chemin = cheminVersUnNatif(client);
      if (chemin) fautifs.push(chemin.map(lisible).join('\n    → '));
    }
    expect(
      fautifs,
      'un composant client atteint un module natif de Node : `next build` refusera node:*, ou embarquera un polyfill. Remède : sortir la fonction qui en a besoin dans un module que le client n’importe pas, ou faire porter la valeur par la réponse serveur',
    ).toEqual([]);
  }, 120_000);

  it('le parcours VOIT une chaîne indirecte vers node:crypto — anti-vacuité du parcours', () => {
    // `assemblageProposition.ts` porte le hachage depuis le correctif du LOT-03 :
    // un départ réel, non client, qui doit mener à un natif.
    const assemblage = path.join(RACINE, 'lib', 'praticien', 'assemblageProposition.ts');
    const chemin = cheminVersUnNatif(assemblage);
    expect(chemin, 'le parcours doit trouver le module natif du hachage').not.toBeNull();
    expect(natif((chemin as string[]).at(-1) as string)).not.toBeNull();
  });

  it('reconnaît les deux formes et les sous-chemins, et laisse les paquets', () => {
    expect(natif('node:crypto')).toBe('node:crypto');
    expect(natif('crypto')).toBe('crypto');
    expect(natif('fs/promises')).toBe('fs/promises');
    expect(natif('node:fs/promises')).toBe('node:fs/promises');
    expect(natif('next/navigation')).toBeNull();
    expect(natif('@/lib/praticien/propositionObjectif')).toBeNull();
  });
});
