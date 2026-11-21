import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { CLES_INTERDITES } from './praticien/propositionObjectif';

// LISTES JUMELLES (lot `autonomie-pieges-restes`, partie 9). Une garde de
// nommage par liste de mots interdits a une sœur presque partout : la même
// interdiction, tenue sur une autre surface. Corriger la liste d'un fichier ne
// corrige pas sa voisine : au LOT-03 d'Alliance 6.0-B, la garde du panneau
// d'objectif portait encore la liste française seule, quinze jours après la
// correction de sa jumelle du moteur de proposition, et un
// `rank: candidat.rank` recopié tel qu'il arrive serait resté vert.
//
// Ce banc lit, dans le TEXTE, chaque déclaration de la constante
// `RACINES_INTERDITES` sous `web/src` et exige :
//
// 1. que chaque fichier qui en déclare une soit inscrit ici, avec sa famille.
//    Une sœur nouvelle ne s'ajoute pas en silence, et une inscription dont le
//    fichier a disparu rougit aussi ;
// 2. que chaque liste contienne le socle de sa famille, en français ET en
//    anglais, parce que la donnée amont des contrats cliniques est en anglais
//    (`clinical-engine/decisionCard.ts` porte `rank` et `confidence`) ;
// 3. que les jumelles exactes (même interdiction, même donnée amont) soient
//    ÉGALES : un ajout d'un seul côté rougit ;
// 4. que `CLES_INTERDITES` (égalité exacte sur les clés du blob, liste
//    distincte par décision) contienne les mots entiers du socle.
//
// TROUS ASSUMÉS. Seul le nom `RACINES_INTERDITES` est recensé : une liste
// sœur nommée autrement échappe à la règle 1. Les entrées se lisent comme des
// chaînes entre apostrophes ou guillemets, commentaires retirés, jusqu'au `];`
// qui ferme la liste : une racine bâtie par calcul, par gabarit ou par
// décomposition (`...AUTRES`) n'est pas vue. Le banc ne juge pas qu'un socle
// SUFFIT, seulement qu'il est présent partout.

const SRC = path.resolve(__dirname, '..');

type Famille = 'mesure-ordonnee' | 'certitude';

/**
 * Chaque fichier qui déclare `RACINES_INTERDITES`, chemin relatif à `web/src`.
 * `jumelle` désigne la liste qui doit lui être égale, quand il y en a une.
 */
const INSCRITS: Record<string, { famille: Famille; jumelle?: string; motif: string }> = {
  'lib/praticien/propositionObjectif.guard.test.ts': {
    famille: 'mesure-ordonnee',
    jumelle: 'lib/praticien/objectifNegocie.guard.test.ts',
    motif: 'G7-2 : moteur de proposition et sa route, nourris de `DecisionPriorityCandidate`',
  },
  'lib/praticien/objectifNegocie.guard.test.ts': {
    famille: 'mesure-ordonnee',
    jumelle: 'lib/praticien/propositionObjectif.guard.test.ts',
    motif: 'G2 : le panneau consomme les propositions du moteur, même amont',
  },
  'lib/comprehensionAppendOnly.guard.test.ts': {
    famille: 'mesure-ordonnee',
    motif: 'G2 : un désaccord ne se compte pas ; liste propre à la synthèse (moyenne, taux…)',
  },
  'lib/clinical/contradictionFinding.guard.test.ts': {
    famille: 'certitude',
    motif: 'aucun champ de vraisemblance sur un objet de contradiction (D-044)',
  },
};

/** Ce que toute liste d'une famille doit contenir, en français et en anglais. */
const SOCLES: Record<Famille, readonly string[]> = {
  'mesure-ordonnee': [
    'score',
    'seuil',
    'bande',
    'rang',
    'severit',
    'gravit',
    'poids',
    'rank',
    'confidence',
    'threshold',
    'weight',
  ],
  certitude: [
    'confian',
    'confidence',
    'certitud',
    'probabil',
    'vraisembl',
    'likelihood',
    'fiabilit',
    'reliabil',
    'poids',
    'weight',
  ],
};

/**
 * Les racines du socle « mesure ordonnée » que `CLES_INTERDITES` n'a pas à
 * porter, chacune avec son motif. Toute autre racine du socle doit y être : une
 * racine ajoutée au socle sans motif ici rougit tant que le blob ne la refuse
 * pas.
 */
const HORS_BLOB: Record<string, string> = {
  severit: 'racine tronquée, pas une clé possible',
  gravit: 'racine tronquée, pas une clé possible',
  poids: 'absente de l’arbitrage 1 du 2026-08-23 ; l’ajouter au blob est une décision',
};

const MOTS_ENTIERS_DU_SOCLE = SOCLES['mesure-ordonnee'].filter((r) => !(r in HORS_BLOB));

// La capture s'arrête au `]` suivi d'un `;` : un `]` cité dans un commentaire
// de la liste ne la tronque pas.
const DECLARATION = /\bconst\s+RACINES_INTERDITES\b[^=\n]*=\s*\[([\s\S]*?)\]\s*;/g;

function fichiersTs(dossier: string): string[] {
  const sortie: string[] = [];
  for (const nom of readdirSync(dossier)) {
    if (nom === 'node_modules' || nom.startsWith('.')) continue;
    const complet = path.join(dossier, nom);
    if (statSync(complet).isDirectory()) sortie.push(...fichiersTs(complet));
    else if (/\.tsx?$/.test(nom)) sortie.push(complet);
  }
  return sortie;
}

/** Les entrées de chaque déclaration du texte, commentaires retirés. */
export function listesDeclarees(texte: string): string[][] {
  const listes: string[][] = [];
  for (const m of texte.matchAll(DECLARATION)) {
    const corps = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    listes.push([...corps.matchAll(/(['"])([^'"\n]+)\1/g)].map((e) => e[2]));
  }
  return listes;
}

function relatif(complet: string): string {
  return path.relative(SRC, complet).split(path.sep).join('/');
}

// Ce banc nomme la constante dans ses commentaires et, coupée en deux, dans
// le texte de son dernier cas, jamais précédée du mot-clé de déclaration : il
// ne se recense pas lui-même (voir le cas « réciproquement »).
const DECLARANTS = new Map<string, string[][]>();
for (const f of fichiersTs(SRC)) {
  const listes = listesDeclarees(readFileSync(f, 'utf8'));
  if (listes.length > 0) DECLARANTS.set(relatif(f), listes);
}

function listeDe(fichier: string): string[] {
  const listes = DECLARANTS.get(fichier);
  if (!listes) throw new Error(`${fichier} : aucune déclaration RACINES_INTERDITES lue`);
  return listes[0];
}

describe('listes jumelles — RACINES_INTERDITES alignées sur toutes leurs surfaces', () => {
  it('l’extraction lit quelque chose (anti-vacuité)', () => {
    expect(DECLARANTS.size).toBeGreaterThanOrEqual(4);
    expect(listeDe('lib/praticien/propositionObjectif.guard.test.ts')).toContain('rank');
  });

  it('chaque fichier qui déclare RACINES_INTERDITES est inscrit au banc, et réciproquement', () => {
    expect([...DECLARANTS.keys()].sort()).toEqual(Object.keys(INSCRITS).sort());
  });

  it.each(Object.keys(INSCRITS))('%s déclare une seule liste, non vide', (fichier) => {
    const listes = DECLARANTS.get(fichier) ?? [];
    expect(listes).toHaveLength(1);
    expect(listes[0].length).toBeGreaterThan(5);
  });

  it.each(Object.entries(INSCRITS))('%s contient le socle de sa famille', (fichier, { famille }) => {
    const liste = listeDe(fichier);
    const manquantes = SOCLES[famille].filter((r) => !liste.includes(r));
    expect(manquantes).toEqual([]);
  });

  it.each(Object.entries(INSCRITS).filter(([, i]) => i.jumelle))(
    '%s est égale à sa jumelle',
    (fichier, { jumelle }) => {
      expect(INSCRITS[jumelle!]?.jumelle).toBe(fichier);
      expect([...listeDe(fichier)].sort()).toEqual([...listeDe(jumelle!)].sort());
    },
  );

  it('CLES_INTERDITES (égalité exacte sur le blob) contient les mots entiers du socle', () => {
    const manquants = MOTS_ENTIERS_DU_SOCLE.filter((m) => !CLES_INTERDITES.includes(m));
    expect(manquants).toEqual([]);
  });

  it('chaque exemption du blob vise une racine du socle (aucune exemption morte)', () => {
    const mortes = Object.keys(HORS_BLOB).filter((r) => !SOCLES['mesure-ordonnee'].includes(r));
    expect(mortes).toEqual([]);
    expect(MOTS_ENTIERS_DU_SOCLE.length).toBeGreaterThan(5);
  });

  it('l’extraction ignore une racine citée en commentaire, et un crochet cité', () => {
    const texte = [
      'const RACINES',
      "_INTERDITES = [\n  // 'priorit' reste absent, voir [G3]\n  'score', /* 'x' */\n  \"rank\",\n];",
    ].join('');
    expect(listesDeclarees(texte)).toEqual([['score', 'rank']]);
  });
});
