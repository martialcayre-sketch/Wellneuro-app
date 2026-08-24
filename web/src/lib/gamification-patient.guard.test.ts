import { readFileSync, readdirSync, statSync } from 'fs';
import { extname, join, relative } from 'path';
import { describe, expect, it } from 'vitest';

// Garde structurelle — réserve R2 de l'audit de conformité 5.0, arbitrée le
// 2026-07-21.
//
// L'AUDIT NE TRANCHAIT PAS. Il relevait la barre « X % complété » de
// `GenericQuestionnaire` et les compteurs « X réponses sur Y », et notait qu'ils
// relèvent « ou non de la gamification proscrite selon la lecture retenue ».
//
// ARBITRAGE : ce ne sont PAS de la gamification. Un indicateur d'avancement
// interne à un formulaire est de la NAVIGATION — il dit combien il reste à
// faire, comme un numéro de page. Il ne survit pas au questionnaire, ne
// s'accumule pas d'une séance à l'autre, ne compare à personne et ne récompense
// rien. Le retirer coûterait au patient (« combien de temps encore ? ») sans
// rien protéger.
//
// CE QUI EST PROSCRIT, et que cette garde surveille : le vocabulaire du jeu —
// félicitations, séries de jours, classements, niveaux, points gagnés. La
// frontière n'est pas le chiffre, c'est ce qu'on en fait : décrire la tâche en
// cours, jamais récompenser, comparer, ni fixer au patient un but qu'il n'a pas
// choisi.
//
// CE QUE CETTE GARDE NE PROUVE PAS. Elle lit du texte, pas des intentions : une
// gamification écrite sans ces mots lui échappe. Elle attrape le vocabulaire qui
// la signale, ce qui est déjà la façon dont ces choses arrivent — une phrase
// d'encouragement recopiée d'un produit grand public.

const RACINE = join(__dirname, '..');

// Surfaces lues par le patient. Le praticien n'est pas concerné : « bravo »
// dans un écran praticien serait déplacé, pas interdit.
const SURFACES_PATIENT = [
  'components/patient',
  'components/patient-food-compass',
  'components/patient-food-observation',
  'components/food-observation',
  'app/portail',
  // Textes patient sortis des composants : le rappel de l'agenda vit dans un
  // module pur, hors de `components/patient` — sans cette entrée, un « 5 jours
  // d'affilée » y passerait sous le radar du garde.
  'lib/agenda-sommeil/rappelPortail.ts',
  // Même raison, LOT-07 « Doctrine exécutable » ([[D-106]]) : les libellés de
  // tendance de « Mon équilibre » ont quitté `components/patient` pour vivre
  // avec la doctrine qui les motive. Sans cette entrée, ils sortaient du
  // balayage en même temps — un texte patient déplacé est un texte patient
  // dégardé tant que son nouveau chemin n'est pas déclaré ici.
  'lib/equilibre/natureIndiceGlobal.ts',
];

// Apostrophe droite ou typographique, indifféremment.
const A = "['’]";

const VOCABULAIRE_DE_JEU: { motif: RegExp; quoi: string }[] = [
  { motif: /félicitations/i, quoi: 'félicitations' },
  { motif: /\bbravo\b/i, quoi: 'bravo' },
  { motif: /bien joué/i, quoi: 'bien joué' },
  { motif: /objectif atteint/i, quoi: 'objectif atteint' },
  { motif: /\bclassement\b/i, quoi: 'classement' },
  { motif: /palmarès/i, quoi: 'palmarès' },
  { motif: new RegExp(`jours d${A}affilée`, 'i'), quoi: "jours d'affilée" },
  { motif: /série en cours/i, quoi: 'série en cours' },
  { motif: /points gagnés/i, quoi: 'points gagnés' },
  { motif: /badge (débloqué|obtenu)/i, quoi: 'badge débloqué/obtenu' },
  { motif: /niveau (suivant|atteint)/i, quoi: 'niveau suivant/atteint' },
  { motif: /vous avez gagné/i, quoi: 'vous avez gagné' },
  { motif: /meilleur score/i, quoi: 'meilleur score' },
];

const EXTENSIONS = new Set(['.ts', '.tsx']);

// Les fichiers de test sont hors périmètre : rien n'y est rendu au patient, et
// ils contiennent précisément les assertions qui interdisent ce vocabulaire —
// `PatientFoodCompass.test.tsx` vérifie qu'aucun « classement » n'apparaît. Les
// scanner reviendrait à faire échouer une garde sur le texte d'une autre.
const EST_UN_TEST = /\.(test|spec)\.tsx?$/;

function fichiersSources(dossier: string): string[] {
  let entrees;
  try {
    entrees = readdirSync(dossier, { withFileTypes: true });
  } catch {
    // UN CHEMIN DE FICHIER N'EST PAS UN DOSSIER ABSENT — [[D-106]].
    //
    // `SURFACES_PATIENT` accepte les deux depuis que des textes patient vivent
    // hors de `components/patient`. `readdirSync` lève `ENOTDIR` sur un
    // fichier ; le `catch` rendait `[]`, donc **toute entrée de fichier était
    // un no-op silencieux**. `lib/agenda-sommeil/rappelPortail.ts` était ainsi
    // dégardé depuis son ajout, et l'entrée posée par le LOT-07 l'aurait été
    // de même — le compte global restait au-dessus du plancher, rien ne
    // bronchait. La non-vacuité PAR ENTRÉE, plus bas, est ce qui l'aurait dit.
    try {
      if (statSync(dossier).isFile() && EXTENSIONS.has(extname(dossier))) return [dossier];
    } catch {
      /* ni dossier ni fichier : la non-vacuité par entrée le dira */
    }
    return [];
  }
  return entrees.flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersSources(chemin);
    if (EST_UN_TEST.test(entree.name)) return [];
    return EXTENSIONS.has(extname(entree.name)) ? [chemin] : [];
  });
}

function fichiersPatient(): string[] {
  return SURFACES_PATIENT.flatMap((surface) => fichiersSources(join(RACINE, surface)));
}

describe('surfaces patient — aucune gamification (R2)', () => {
  it('aucun vocabulaire de jeu dans les surfaces lues par le patient', () => {
    const fautifs: string[] = [];

    for (const chemin of fichiersPatient()) {
      const relatif = relative(RACINE, chemin);
      const source = readFileSync(chemin, 'utf8');
      source.split('\n').forEach((ligne, index) => {
        for (const { motif, quoi } of VOCABULAIRE_DE_JEU) {
          if (motif.test(ligne)) fautifs.push(`${relatif}:${index + 1} — « ${quoi} »`);
        }
      });
    }

    // Le message nomme le fichier, la ligne et le mot : la correction consiste à
    // reformuler en constat factuel, pas à masquer le mot.
    expect(fautifs).toEqual([]);
  });

  it('la garde regarde bien un arbre non vide', () => {
    // Si l'arbre se vide (dossier renommé, extensions changées), le test
    // ci-dessus passerait au vert sans avoir rien lu.
    expect(fichiersPatient().length).toBeGreaterThan(20);
  });

  // LA NON-VACUITÉ PAR ENTRÉE, et c'est elle qui manquait — [[D-106]].
  //
  // Le plancher global ci-dessus est insensible à une entrée morte : les
  // dossiers en apportent des dizaines, une entrée qui n'apporte rien ne fait
  // pas descendre le total. Deux chemins de FICHIER y ont donc dormi sans que
  // rien ne le dise. Ici chaque entrée doit rendre au moins un fichier — un
  // chemin renommé, supprimé ou mal formé rougit, au lieu de se taire.
  it('chaque surface déclarée contribue au moins un fichier', () => {
    const steriles = SURFACES_PATIENT.filter(
      (surface) => fichiersSources(join(RACINE, surface)).length === 0,
    );
    expect(steriles).toEqual([]);
  });
});
