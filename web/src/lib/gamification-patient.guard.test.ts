import { readFileSync, readdirSync } from 'fs';
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
  'app/patient',
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
    return []; // dossier absent : la garde de non-vacuité ci-dessous le dira
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
});
