import { readFileSync } from 'node:fs';
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

  it('le compte total est quatre : cockpit ×2, vérificateur, rejeu', () => {
    const total = APPELANTS
      .map(fichier => readFileSync(path.join(process.cwd(), fichier), 'utf8').match(CONSTRUIRE)?.length ?? 0)
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(4);
  });
});
