import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : CHAQUE CONSTRUCTION DE LA CHAÎNE C1 LIT LES COUVERTURES ([[D-257]], LOT-04).
//
// Le cockpit ÉMET la carte, le vérificateur la RECALCULE avant toute écriture
// de protocole, le rejeu la RECOMPOSE pour le portail patient. Une couverture
// passée d'un côté et pas de l'autre ferait, drapeau allumé, 409 sur une carte
// honnête — ou éteindrait l'écran du patient. Ce banc compte, fichier par
// fichier, les constructions et les couvertures qui les accompagnent.

const APPELANTS = [
  path.join('src', 'app', 'api', 'praticien', 'cockpit', 'route.ts'),
  path.join('src', 'lib', 'clinical-engine', 'verifierChaineC1.ts'),
  path.join('src', 'lib', 'clinical-engine', 'rejeuCarteDecision.ts'),
];

const CONSTRUIRE = /construireChaineC1Tolerante\(\{/g;
const PASSE = /^\s*couverturesAdressage(?::|,)/gm;

/** Tous les sources de `src/`, hors bancs et hors fixture de banc. */
function sources(depart: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) {
      if (['node_modules', 'generated'].includes(entree)) continue;
      trouves.push(...sources(complet));
    } else if (/\.(?:ts|tsx)$/.test(entree) && !/\.test\.tsx?$/.test(entree) && entree !== 'chaineC1Fixture.ts') {
      trouves.push(complet);
    }
  }
  return trouves;
}

describe('couvertures d’adressage — les quatre constructions de la chaîne C1', () => {
  it.each(APPELANTS)('%s passe les couvertures à chaque construction', (fichier) => {
    const source = readFileSync(path.join(process.cwd(), fichier), 'utf8');
    const constructions = [...source.matchAll(CONSTRUIRE)].length;
    expect(constructions).toBeGreaterThan(0);
    // Le passage à la chaîne, et lui seul : la clé dans l'objet d'entrée.
    const blocs = source.split(CONSTRUIRE).slice(1).map(bloc => bloc.split('}, await lireSelectionPriorite')[0]);
    expect(blocs).toHaveLength(constructions);
    for (const bloc of blocs) expect(bloc.match(PASSE)?.length ?? 0).toBe(1);
  });

  // TOUT `src/`, ET PAS SEULEMENT LES TROIS FICHIERS CONNUS (revue du
  // 2026-10-03, P2-7) : une cinquième construction écrite ailleurs échappait
  // au banc. La construction NUE (`construireChaineC1(`) n'est admise que dans
  // son propre module et dans l'enveloppe tolérante qui la porte.
  it('aucune construction de la chaîne hors des appelants nommés', () => {
    const racine = path.join(process.cwd(), 'src');
    const tolerante = sources(racine)
      .filter(f => /construireChaineC1Tolerante\(\{/.test(readFileSync(f, 'utf8')))
      .map(f => path.relative(process.cwd(), f))
      .sort();
    expect(tolerante).toEqual([...APPELANTS].sort());
    const nue = sources(racine)
      .filter(f => /\bconstruireChaineC1\(\{/.test(readFileSync(f, 'utf8')))
      .map(f => path.relative(process.cwd(), f))
      .sort();
    expect(nue).toEqual([path.join('src', 'lib', 'clinical-engine', 'selectionPrioritePrisma.ts')]);
  });

  it('le compte total est quatre : cockpit ×2, vérificateur, rejeu', () => {
    const total = APPELANTS
      .map(fichier => readFileSync(path.join(process.cwd(), fichier), 'utf8').match(CONSTRUIRE)?.length ?? 0)
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(4);
  });
});
