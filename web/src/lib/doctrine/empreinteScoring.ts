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
//   — le MOTEUR de `questions.ts` (de `calculateScore` à la fin du fichier,
//     `computeScoreFromDefBrut` compris) : Horne, QIF, Berlin, AUDIT, les
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
 * et en retoucher un est une retouche clinique. Commenter, réindenter ou
 * reformater ne l'est pas.
 */
export function sourceSansCommentaires(source: string): string {
  const sortie: string[] = [];
  const PRECEDE_UNE_REGEX = /[=(,:[!&|?{};+\-*%<>~^]$/;
  let blanc = false;
  const pousser = (texte: string) => {
    if (blanc && sortie.length > 0) sortie.push(' ');
    blanc = false;
    sortie.push(texte);
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
    } else if (c === '/' && PRECEDE_UNE_REGEX.test(sortie.join('').slice(-1) || '(')) {
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
    } else {
      pousser(c);
      i++;
    }
  }
  return sortie.join('');
}

export const DEBUT_DU_MOTEUR = 'export function calculateScore(';
export const FIN_DU_MOTEUR = '} // fin computeScoreFromDefBrut';

/** L'empreinte du moteur : de `calculateScore` à la fin du fichier. */
export function empreinteMoteur(sourceQuestions: string): string {
  const debut = sourceQuestions.indexOf(DEBUT_DU_MOTEUR);
  if (debut < 0) throw new Error(`début du moteur introuvable : ${DEBUT_DU_MOTEUR}`);
  return sha256(sourceSansCommentaires(sourceQuestions.slice(debut)));
}
