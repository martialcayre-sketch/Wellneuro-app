// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { FAMILLES_DONNEES_PATIENT, FAMILLES_EXEMPTEES } from './stockageAppareil';

// ═══════════════════════════════════════════════════════════════════════════
// GARDE DE CLASSE — aucune clé du portail n'échappe à l'inventaire
//
// CE BANC EXISTE PARCE QUE LA VERSION PRÉCÉDENTE DE CE LOT A RATÉ DEUX FAMILLES
// SUR TROIS. Elle purgeait les brouillons de questionnaire et annonçait avoir
// fermé la promesse « appareil partagé » ; le wizard fiche/anamnèse et l'agenda
// alimentaire patient — tous deux en `sessionStorage`, qui survit à la
// redirection dans le même onglet — restaient en place. Corriger les deux
// familles trouvées n'aurait rien changé au problème : la PROCHAINE rouvrirait
// le trou en silence.
//
// D'où une garde qui BALAIE au lieu de nommer : toute chaîne `wellneuro:`
// écrite sous une surface patient doit être déclarée — purgée par
// `FAMILLES_DONNEES_PATIENT`, ou exemptée AVEC MOTIF par `FAMILLES_EXEMPTEES`.
// Jamais ignorée.
// ═══════════════════════════════════════════════════════════════════════════

const RACINE = join(__dirname, '..', '..');

/** Surfaces qui tournent sur l'appareil d'un PATIENT. */
const SURFACES_PATIENT = [
  'app/portail',
  'components/patient',
  'components/patient-companion',
  'components/patient-food-observation',
  'components/food-observation/PatientFoodObservationPanel.tsx',
];

function fichiersSources(chemin: string): string[] {
  const absolu = join(RACINE, chemin);
  let infos;
  try {
    infos = statSync(absolu);
  } catch {
    return [];
  }
  if (infos.isFile()) return [absolu];

  const trouves: string[] = [];
  for (const entree of readdirSync(absolu, { withFileTypes: true })) {
    const enfant = join(absolu, entree.name);
    if (entree.isDirectory()) {
      trouves.push(...fichiersSources(join(chemin, entree.name)));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entree.name)) continue;
    // Les bancs fabriquent des clés pour éprouver le code : ils ne déposent
    // rien sur l'appareil de personne.
    if (/\.(test|guard\.test)\.tsx?$/.test(entree.name)) continue;
    trouves.push(enfant);
  }
  return trouves;
}

/** Toute chaîne littérale commençant par `wellneuro:` dans ces surfaces. */
function clesDeclarees(): { cle: string; fichier: string }[] {
  const trouvees: { cle: string; fichier: string }[] = [];
  for (const surface of SURFACES_PATIENT) {
    for (const fichier of fichiersSources(surface)) {
      const source = readFileSync(fichier, 'utf8');
      for (const m of source.matchAll(/['"`](wellneuro:[^'"`$]*)/g)) {
        trouvees.push({ cle: m[1], fichier: fichier.slice(RACINE.length + 1) });
      }
    }
  }
  return trouvees;
}

const declaree = (cle: string): boolean =>
  FAMILLES_DONNEES_PATIENT.some((f) => cle.startsWith(f.prefixe) || f.prefixe.startsWith(cle))
  || FAMILLES_EXEMPTEES.some((f) => cle.startsWith(f.prefixe) || f.prefixe.startsWith(cle));

describe('stockage appareil — garde de classe', () => {
  it('toute clé `wellneuro:` des surfaces patient est purgée ou exemptée', () => {
    const cles = clesDeclarees();
    // Le balayage doit trouver quelque chose : une regex qui ne matche plus
    // rendrait ce banc vert en ne gardant rien.
    expect(cles.length).toBeGreaterThanOrEqual(4);

    const orphelines = cles.filter(({ cle }) => !declaree(cle));
    expect(
      orphelines.map((o) => `${o.cle} (${o.fichier})`),
      'clé de stockage non déclarée : l’ajouter à FAMILLES_DONNEES_PATIENT (purgée) '
        + 'ou à FAMILLES_EXEMPTEES (avec motif écrit). Une famille oubliée survit à la déconnexion.',
    ).toEqual([]);
  });

  it('chaque exemption porte un motif, et il n’est pas décoratif', () => {
    for (const { prefixe, motif } of FAMILLES_EXEMPTEES) {
      expect(motif.length, `exemption sans motif : ${prefixe}`).toBeGreaterThan(40);
    }
  });

  // Le versant `sessionStorage` est la moitié qui avait été manquée : un
  // inventaire qui ne couvrirait que `localStorage` reproduirait le défaut.
  it('l’inventaire couvre les DEUX stockages', () => {
    const stockages = new Set(FAMILLES_DONNEES_PATIENT.map((f) => f.stockage));
    expect([...stockages].sort()).toEqual(['local', 'session']);
  });
});
