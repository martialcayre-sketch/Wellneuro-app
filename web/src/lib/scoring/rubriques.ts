import type { ScoreInterpretation } from './types';

// Normalisation des résultats par rubrique d'un questionnaire.
//
// LE PROBLÈME. `computeScoreFromDef` (questions.ts) renvoie les résultats
// intermédiaires sous CINQ clés différentes, héritées de l'ordre dans lequel
// les instruments ont été implémentés :
//
//   subScores   {id, label, total, max?, interpretation?}   HAD, DNSM, TFD, UPPS, Karasek, EORTC…
//   components  {id, label, val}                            PSQI (7 composantes), QIF
//   parts       {id, label, total, …}                       IDTAS-AE
//   categories  {id, label, score?, positive}               Berlin (présence/absence, pas un score)
//   phases      {id, label, total, maxTotal}                Test des 5 mots (rappel immédiat/différé)
//
// Conséquence mesurable : `buildMiniSynthese` ne lit que `subScores`. PSQI,
// Berlin, IDTAS-AE, QIF, Francis et le test des 5 mots n'ont donc AUCUNE
// restitution par rubrique — leurs sept composantes, leurs deux phases, leurs
// trois catégories n'atteignent ni l'écran ni le prompt de synthèse.
//
// CE QUE FAIT CE MODULE. Il projette les cinq formes sur une seule, sans rien
// calculer et sans rien inventer : aucun total n'est recalculé, aucun seuil
// n'est appliqué, aucun maximum n'est supposé. Un maximum absent reste `null`
// et `maxOrigine` dit d'où il vient — un axe sans maximum connu ne peut pas se
// dessiner en proportion, et l'appelant doit pouvoir le savoir plutôt que de
// diviser par un nombre inventé.
//
// Fonction PURE, sans I/O. Le contrat est vérifié dans `rubriques.test.ts`
// contre les sorties RÉELLES de `calculateScore`, pas contre des fixtures
// écrites à la main : c'est le même principe que le banc de certification —
// on exécute le moteur, on ne relit pas sa définition.

/** D'où vient la valeur maximale d'une rubrique — jamais supposée. */
export type MaxOrigine = 'champ' | 'libelle' | 'inconnu';

/** Clé d'origine dans le résultat de scoring, conservée pour la traçabilité. */
export type RubriqueOrigine = 'subScores' | 'components' | 'parts' | 'categories' | 'phases';

export type RubriqueScore = {
  id: string;
  label: string;
  /** Valeur numérique de la rubrique, ou `null` si l'axe n'est pas chiffré. */
  valeur: number | null;
  /** Maximum de la rubrique, ou `null` s'il n'est pas connu. Jamais supposé. */
  max: number | null;
  maxOrigine: MaxOrigine;
  /** `true` quand l'axe est présence/absence (Berlin) et non un score. */
  binaire: boolean;
  /** Pour un axe binaire : positif ou non. `null` sinon. */
  positif: boolean | null;
  interpretation: ScoreInterpretation | null;
  origine: RubriqueOrigine;
};

type Brut = Record<string, unknown>;

const CLES: readonly RubriqueOrigine[] = ['subScores', 'components', 'parts', 'categories', 'phases'];

function nombreOuNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function texteOuVide(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * Maximum porté par le libellé, quand le champ ne le donne pas : les libellés
 * du QIF s'écrivent « Capacité fonctionnelle (/9.9) », « EVA douleur (/70) ».
 * Lire ce nombre-là reste une lecture, pas une supposition — d'où `maxOrigine`.
 */
function maxDuLibelle(label: string): number | null {
  const m = /\(\s*\/\s*(\d+(?:[.,]\d+)?)\s*\)/.exec(label);
  if (!m) return null;
  const n = Number.parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function interpretationOuNull(v: unknown): ScoreInterpretation | null {
  if (!v || typeof v !== 'object') return null;
  const i = v as Brut;
  return typeof i.label === 'string' && i.label.trim() ? (i as ScoreInterpretation) : null;
}

function normaliserUne(brut: Brut, origine: RubriqueOrigine, index: number): RubriqueScore {
  const label = texteOuVide(brut.label);
  const id = texteOuVide(brut.id) || `${origine}-${index}`;

  // `total` (subScores, parts, phases) · `val` (components) · `score` (categories).
  const valeur = nombreOuNull(brut.total) ?? nombreOuNull(brut.val) ?? nombreOuNull(brut.score);

  // `max` (subScores) · `maxTotal` (phases, parts).
  const maxChamp = nombreOuNull(brut.max) ?? nombreOuNull(brut.maxTotal);
  const maxLibelle = maxChamp === null ? maxDuLibelle(label) : null;

  // Berlin ne chiffre pas ses catégories : `positive` est le résultat clinique,
  // `score` n'existe que pour la première. Traiter C2 comme « 0 » en ferait un
  // axe au plus bas alors qu'il peut être positif.
  const binaire = typeof brut.positive === 'boolean';

  return {
    id,
    label,
    valeur,
    max: maxChamp ?? maxLibelle,
    maxOrigine: maxChamp !== null ? 'champ' : maxLibelle !== null ? 'libelle' : 'inconnu',
    binaire,
    positif: binaire ? (brut.positive as boolean) : null,
    interpretation: interpretationOuNull(brut.interpretation),
    origine,
  };
}

/**
 * Rubriques d'un résultat de scoring, quelle que soit la clé sous laquelle le
 * moteur les a rangées. Tableau vide si le questionnaire n'a pas de rubrique —
 * un score global seul en est un cas parfaitement normal, pas une anomalie.
 *
 * Les cinq clés sont lues dans l'ordre déclaré et la PREMIÈRE non vide gagne :
 * aucun résultat n'en porte deux aujourd'hui, et concaténer deux découpages
 * différents du même questionnaire produirait un total apparent faux.
 */
export function rubriquesDuScore(scores: unknown): RubriqueScore[] {
  if (!scores || typeof scores !== 'object') return [];
  const s = scores as Brut;

  for (const cle of CLES) {
    const brut = s[cle];
    if (!Array.isArray(brut) || brut.length === 0) continue;
    return brut
      .filter((e): e is Brut => !!e && typeof e === 'object')
      .map((e, i) => normaliserUne(e, cle, i));
  }
  return [];
}

/**
 * `true` si les rubriques sont toutes chiffrées ET bornées — la condition pour
 * qu'une lecture en proportion (réglette, petits multiples) ait un sens. Le
 * PSQI, dont les composantes n'ont pas de maximum déclaré, répond `false` :
 * c'est le signal qu'il faut lire les valeurs, pas les dessiner en pourcentage.
 */
export function rubriquesComparables(rubriques: readonly RubriqueScore[]): boolean {
  return (
    rubriques.length > 0 &&
    rubriques.every((r) => !r.binaire && r.valeur !== null && r.max !== null && r.max > 0)
  );
}
