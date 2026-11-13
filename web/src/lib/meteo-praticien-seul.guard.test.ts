import { readFileSync, readdirSync } from 'fs';
import { extname, join, relative } from 'path';
import { describe, expect, it } from 'vitest';
import { RACINE as RACINE_DEPOT } from './bio-parcours/balayageSources';
import { contexteResolution, importsResolus, type ContexteResolution } from './bio-parcours/resolutionImports';

// Garde structurelle SP-MET (accueil-observatoire LOT-02) : la Météo d'adhésion
// est un signal de PILOTAGE praticien. Elle ne doit apparaître sur AUCUNE
// surface lue par le patient — ni le badge, ni la route d'agrégat. Le contrôle
// ne juge pas le contenu : il vérifie qu'aucun fichier patient n'IMPORTE ces
// modules. Un import serait la première marche vers une fuite.

const RACINE = join(__dirname, '..');

const SURFACES_PATIENT = [
  'components/patient',
  'components/patient-companion',
  'components/patient-food-observation',
  'components/food-observation',
  'app/portail',
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
  // Suivi des agendas du sommeil : même famille — un signal de pilotage
  // praticien (silences, retards) qui ne doit jamais atteindre le patient.
  'lib/agenda-sommeil/suivi',
  'api/praticien/agenda-sommeil/suivi',
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

/**
 * LES IMPORTS LUS PAR LE PARSEUR ET RÉSOLUS (lot `bp17-extension-bancs-garde`),
 * EN PLUS du balayage ligne à ligne, qui reste pour `fetch(` et ne retire rien
 * de ce qu'il voyait : un import dont le spécificateur est sur une autre ligne
 * que son mot-clé, un `export … from`, un commentaire glissé, une
 * concaténation constante, un alias ou un lien symbolique lui échappaient. Est
 * fautif l'import dont le spécificateur ou le FICHIER atteint nomme un module
 * interdit, ou qui est INDÉTERMINÉ (non constant, nom nu inconnu).
 */
function importsInterdits(chemin: string, contexte: ContexteResolution, source?: string): string[] {
  const relatifAuDepot = relative(RACINE_DEPOT, chemin).split('\\').join('/');
  return importsResolus(relatifAuDepot, contexte, source).flatMap((i) => {
    if (i.indetermine) return [i.specificateur];
    const atteint = i.atteint?.replace(/\.(?:[cm]?[jt]s|[jt]sx)$/, '') ?? '';
    return MODULES_INTERDITS.some((m) => i.specificateur.includes(m) || atteint.includes(m)) ? [i.specificateur] : [];
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

  it('aucune surface patient n’importe un module Météo, sous quelque forme que ce soit (parseur et résolution)', () => {
    const contexte = contexteResolution();
    const fichiers = SURFACES_PATIENT.flatMap((surface) => fichiersSources(join(RACINE, surface)));
    const fautifs = fichiers.flatMap((chemin) =>
      importsInterdits(chemin, contexte).map((s) => `${relative(RACINE, chemin)} — « ${s} »`),
    );
    expect(fautifs).toEqual([]);
    // CONTRE-ÉPREUVE : les formes que le balayage ligne à ligne ne voyait pas.
    const neuf = join(RACINE, 'components/patient/Neuf.tsx');
    for (const source of [
      "import {\n  BadgeMeteo,\n} from\n  '@/components/meteo/BadgeMeteo';",
      "export { calculer } from '../../lib/protocol/adhesion';",
      'const s = require("@/lib/agenda-sommeil/" + "suivi");',
      'const m = await import(chemin);',
    ]) {
      expect(importsInterdits(neuf, contexte, source), source).toHaveLength(1);
    }
    expect(importsInterdits(neuf, contexte, "import { x } from '@/lib/portail/session';")).toEqual([]);
  }, 60_000);

  it('la liste des surfaces patient scannées n’est pas vide (garde anti-régression)', () => {
    const fichiers = SURFACES_PATIENT.flatMap((surface) => fichiersSources(join(RACINE, surface)));
    expect(fichiers.length).toBeGreaterThan(0);
  });
});
