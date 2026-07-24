import { readFileSync, readdirSync } from 'fs';
import { extname, join, relative } from 'path';
import { describe, expect, it } from 'vitest';

// Garde structurelle SP-MET (accueil-observatoire LOT-02) : la Météo d'adhésion
// est un signal de PILOTAGE praticien. Elle ne doit apparaître sur AUCUNE
// surface lue par le patient — ni le badge, ni la route d'agrégat. Le contrôle
// ne juge pas le contenu : il vérifie qu'aucun fichier patient n'IMPORTE ces
// modules. Un import serait la première marche vers une fuite.

const RACINE = join(__dirname, '..');

const SURFACES_PATIENT = [
  'components/patient',
  'components/patient-companion',
  'components/patient-food-compass',
  'components/patient-food-observation',
  'components/food-observation',
  'app/portail',
  'app/patient',
  'app/api/portail',
  'app/api/patient',
];

// Modules réservés au praticien : leur présence dans un import patient est le
// défaut recherché.
const MODULES_INTERDITS = [
  'components/meteo/BadgeMeteo',
  'lib/protocol/adhesion',
  'lib/protocol/meteoPatientele',
  'api/praticien/meteo-adhesion',
];

const EXTENSIONS = new Set(['.ts', '.tsx']);

function fichiersSources(dossier: string): string[] {
  let entrees;
  try {
    entrees = readdirSync(dossier, { withFileTypes: true });
  } catch {
    return [];
  }
  return entrees.flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersSources(chemin);
    return EXTENSIONS.has(extname(entree.name)) ? [chemin] : [];
  });
}

describe('Météo d’adhésion — praticien seul (SP-MET, structurel)', () => {
  it('aucune surface patient n’importe le badge, l’agrégat ou la route Météo', () => {
    const fautifs: string[] = [];
    const fichiers = SURFACES_PATIENT.flatMap((surface) => fichiersSources(join(RACINE, surface)));

    for (const chemin of fichiers) {
      const relatif = relative(RACINE, chemin);
      const source = readFileSync(chemin, 'utf8');
      source.split('\n').forEach((ligne, index) => {
        const estImport = /\bimport\b|\brequire\(|\bfetch\(/.test(ligne);
        if (!estImport) return;
        for (const moduleInterdit of MODULES_INTERDITS) {
          if (ligne.includes(moduleInterdit)) fautifs.push(`${relatif}:${index + 1} — « ${moduleInterdit} »`);
        }
      });
    }

    expect(fautifs, `Météo d’adhésion référencée dans une surface patient :\n${fautifs.join('\n')}`).toEqual([]);
  });

  it('la liste des surfaces patient scannées n’est pas vide (garde anti-régression)', () => {
    const fichiers = SURFACES_PATIENT.flatMap((surface) => fichiersSources(join(RACINE, surface)));
    expect(fichiers.length).toBeGreaterThan(0);
  });
});
