import { createHash } from 'node:crypto';

// EMPREINTES DU SCORING DU CATALOGUE — t23, arbitrages du 2026-10-21.
//
// Lues par le seul banc `seuilsCatalogue.guard.test.ts` : jamais par
// l'application, jamais par un composant client (`node:crypto`).
//
// DEUX OBJETS, PARCE QUE LES SEUILS VIVENT À DEUX ENDROITS :
//   — le bloc `scoring` de chaque entrée de `QUESTIONNAIRE_CATALOGUE` : bandes,
//     interprétations, sous-scores, pondérations, statut de certification, et
//     la `note`, qui voyage telle quelle dans le résultat du score ;
//   — le MOTEUR : tout `questions.ts` hors du littéral du catalogue (imports,
//     `computeScoreFromDefBrut` et ses helpers) : Horne, QIF, Berlin, AUDIT, les
//     composantes du PSQI, Karasek, Bristol… y portent leurs seuils en dur.
//     Une contre-revue l'a mesuré : les « 33 seuils du catalogue » étaient
//     surtout ceux-là, et les blocs seuls ne les voyaient pas.

/** JSON à clés triées : un réordonnancement de clés ne change pas l'empreinte. */
function canonique(valeur: unknown): unknown {
  if (typeof valeur === 'number' && !Number.isFinite(valeur)) {
    // `JSON.stringify` écrirait `null` : une borne `Infinity` remplacée par
    // `null` ne changerait pas l'empreinte. Mieux vaut refuser que se taire.
    throw new Error(`nombre non fini dans un bloc de scoring : ${valeur}`);
  }
  if (Array.isArray(valeur)) return valeur.map(canonique);
  if (valeur === null || typeof valeur !== 'object') return valeur;
  return Object.fromEntries(
    Object.keys(valeur as Record<string, unknown>)
      .sort()
      .map(k => [k, canonique((valeur as Record<string, unknown>)[k])]),
  );
}

function sha256(texte: string): string {
  return createHash('sha256').update(texte).digest('hex');
}

export function empreinteScoring(scoring: unknown): string {
  return sha256(JSON.stringify(canonique(scoring)));
}

/**
 * Le source sans ses commentaires, blancs hors chaînes réduits à un espace.
 * Les CHAÎNES restent : le moteur écrit en dur des libellés d'interprétation,
 * et en retoucher un est une retouche clinique. Commenter ou réindenter ne
 * l'est pas. Un reformatage qui change l'espacement AUTOUR d'un opérateur
 * (`x<=41` contre `x <= 41`) change l'empreinte : faux positif, côté sûr.
 */
export function sourceSansCommentaires(source: string): string {
  const sortie: string[] = [];
  // Un `/` ouvre une regex après une ponctuation… ou après un mot-clé : sans
  // ce second cas, `return /a\/\//` serait lu comme une division, et le `//`
  // de la regex avalerait le reste de la ligne, seuil compris (contre-revue).
  const PRECEDE_UNE_REGEX = /(?:[=(,:[!&|?{};+\-*%<>~^]|\b(?:return|typeof|case|in|of|delete|void|throw|new|else|do|yield|await))$/;
  // Une `)` qui ferme la condition d'un `if`, `while` ou `for` précède aussi
  // une regex (`if (x) /re/.test(y)`) — mais pas `(x) / 2`, qui divise : d'où
  // la pile des ouvrantes, chacune marquée si elle ouvre une condition.
  const pile: boolean[] = [];
  let fermeUneCondition = false;
  let blanc = false;
  let queue = '';
  const pousser = (texte: string) => {
    const espace = blanc && sortie.length > 0 ? ' ' : '';
    if (espace) sortie.push(espace);
    blanc = false;
    sortie.push(texte);
    queue = (queue + espace + texte).slice(-16);
    fermeUneCondition = false;
  };
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];
    if (c === '/' && d === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      blanc = true;
    } else if (c === '/' && d === '*') {
      const fin = source.indexOf('*/', i + 2);
      i = fin < 0 ? source.length : fin + 2;
      blanc = true;
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== c) j += source[j] === '\\' ? 2 : 1;
      pousser(source.slice(i, j + 1));
      i = j + 1;
    } else if (c === '/' && (fermeUneCondition || PRECEDE_UNE_REGEX.test(queue || '('))) {
      let j = i + 1;
      let dansClasse = false;
      while (j < source.length && (dansClasse || source[j] !== '/') && source[j] !== '\n') {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === '[') dansClasse = true;
        if (source[j] === ']') dansClasse = false;
        j++;
      }
      pousser(source.slice(i, j + 1));
      i = j + 1;
    } else if (/\s/.test(c)) {
      blanc = true;
      i++;
    } else if (c === '(') {
      pile.push(/\b(?:if|while|for)$/.test(queue));
      pousser(c);
      i++;
    } else if (c === ')') {
      const condition = pile.pop() ?? false;
      pousser(c);
      fermeUneCondition = condition;
      i++;
    } else {
      pousser(c);
      i++;
    }
  }
  return sortie.join('');
}

export const DEBUT_DU_CATALOGUE = 'export const QUESTIONNAIRE_CATALOGUE = {';
export const FIN_DU_CATALOGUE = '}; // fin QUESTIONNAIRE_CATALOGUE';

/**
 * L'empreinte du MOTEUR : tout `questions.ts` SAUF le littéral du catalogue,
 * dont les blocs `scoring` ont chacun la leur. Le haut du fichier en fait
 * partie — les imports d'abord : rediriger `BANDES_PSQI` vers un autre module
 * changerait les bandes du PSQI sans toucher une ligne du calcul (contre-revue).
 */
export function empreinteMoteur(sourceQuestions: string): string {
  const debut = sourceQuestions.indexOf(DEBUT_DU_CATALOGUE);
  const fin = sourceQuestions.indexOf(FIN_DU_CATALOGUE);
  if (debut < 0 || fin < debut) throw new Error('bornes du littéral du catalogue introuvables');
  const horsCatalogue = sourceQuestions.slice(0, debut) + sourceQuestions.slice(fin + FIN_DU_CATALOGUE.length);
  return sha256(sourceSansCommentaires(horsCatalogue));
}
