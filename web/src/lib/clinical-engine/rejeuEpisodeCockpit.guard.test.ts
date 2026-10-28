import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// UN SEUL REJEU D'ÉPISODE, UNE SEULE FIN DE CYCLE (J3-cabinet, [[D-385]]).
//
// La page des comptes du cabinet rejoue chaque dossier par le chemin même du
// cockpit, et compte « à la fin de leur cycle » par le signal même du portail.
// Les fonctions du rejeu sont donc sorties de la route du cockpit vers
// `rejeuEpisodeCockpit.ts`, et la fin de cycle de la route du portail vers
// `protocol/finDeCycle.ts`. Une copie locale réintroduite demain referait deux
// calculs, qui divergeraient en silence.
//
// Sa limite, dite pour ne pas se croire couvert : il cherche des définitions
// par leur nom, pas toute réécriture possible.

const RACINE = path.resolve(__dirname, '../../..');
const lire = (...segments: string[]) => readFileSync(path.join(RACINE, ...segments), 'utf8');

const DEPLACEES = [
  'loadRuntimeInputs',
  'ancreCycleDepuis',
  'ancreCycleCourant',
  'ancrePoseeDe',
  'suffixeEnveloppe',
  'episodeRejouable',
  'episodePersisteRejouable',
  'rejouerChaine',
];
const definition = (nom: string) => new RegExp(`\\bfunction ${nom}\\(`);

/** Tous les sources de `src/`, hors bancs. */
function sources(depart: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) {
      if (['node_modules', 'generated'].includes(entree)) continue;
      trouves.push(...sources(complet));
    } else if (/\.(?:ts|tsx)$/.test(entree) && !/\.test\.tsx?$/.test(entree)) {
      trouves.push(complet);
    }
  }
  return trouves;
}

describe('rejeu d’épisode du cockpit — un seul module', () => {
  const route = lire('src', 'app', 'api', 'praticien', 'cockpit', 'route.ts');
  const rejeu = lire('src', 'lib', 'clinical-engine', 'rejeuEpisodeCockpit.ts');

  it.each(DEPLACEES)('%s est défini dans le module partagé', (nom) => {
    expect(rejeu).toMatch(definition(nom));
  });

  // TOUT `src/`, et pas seulement la route : une copie dans le chargeur de la
  // page des comptes rejouerait un dossier par un second chemin.
  it.each(DEPLACEES)('%s n’est défini nulle part ailleurs dans src/', (nom) => {
    const porteurs = sources(path.join(RACINE, 'src'))
      .filter(f => definition(nom).test(readFileSync(f, 'utf8')))
      .map(f => path.relative(RACINE, f));
    expect(porteurs).toEqual([path.join('src', 'lib', 'clinical-engine', 'rejeuEpisodeCockpit.ts')]);
  });

  it('la route importe le module partagé', () => {
    expect(route).toMatch(/from '@\/lib\/clinical-engine\/rejeuEpisodeCockpit'/);
  });
});

describe('fin de cycle — une seule définition', () => {
  it('JOURS_FIN_DE_CYCLE n’existe que dans protocol/finDeCycle.ts', () => {
    const porteurs = sources(path.join(RACINE, 'src'))
      .filter(f => /\bJOURS_FIN_DE_CYCLE\b/.test(readFileSync(f, 'utf8')))
      .map(f => path.relative(RACINE, f));
    expect(porteurs).toEqual([path.join('src', 'lib', 'protocol', 'finDeCycle.ts')]);
  });

  it('la route du portail appelle estFinDeCycle avec son horloge', () => {
    const route = lire('src', 'app', 'api', 'portail', 'protocole', 'route.ts');
    expect(route).toMatch(/from '@\/lib\/protocol\/finDeCycle'/);
    expect(route).toMatch(/estFinDeCycle\(jourZero, new Date\(\)\)/);
  });
});
