import { dateJourParis } from '@/lib/dateParis';
import { annulationParLigne, correctionsParLigne } from './filCorrection';
import type { LigneResultatDatee } from './derniersResultats';
import {
  champsInconnus,
  champsQuiDifferent,
  type ContextePrelevementSaisi,
} from './contextePrelevement';

// LA SÉRIE DES MESURES QUI FONT FOI, PAR ANALYTE (BP-03, cadrage v1 §4) —
// résolution PURE, testable sans base. Voisine de `derniersResultatsParAnalyte`,
// qui n'en garde que la dernière.
//
// MÊMES ÉLECTIONS, DANS LE MÊME ORDRE. Un fil annulé n'y entre pas
// ([[D-294]] §6) : `annulations` est OBLIGATOIRE, pour la même raison qu'à
// côté — un lecteur qui l'oublierait ferait foi d'une saisie reconnue fausse.
// Puis une tête par fil, élue par `correctionsParLigne` seule, fourche
// comprise. Le groupe est la RACINE, jamais la clé : une clé qui porte un fil
// annulé et un fil vivant ne rend que le vivant ([[D-294]] §3).
//
// TROIS DATES, JAMAIS CONFONDUES. Le prélèvement (`preleveLe`) ; l'entrée au
// dossier (`saisiLe` de la racine du fil — pour un import, la date de
// validation, pas celle du dépôt) ; la correction (`saisiLe` de la tête quand
// elle remplace une ligne).
//
// LE JOUR N EST UN FAIT ARITHMÉTIQUE : des jours calendaires de Paris depuis
// le jour 0 ([[D-255]]) en vigueur au prélèvement — le dernier dont la date
// civile ne le suit pas. Aucune étiquette de jalon, aucune fenêtre : aucune
// n'a de source biologique (`DC-19`).
//
// AUCUNE INTERPRÉTATION. La série ne rend jamais « comparable », seulement
// les motifs connus de ne pas l'être — comparés à l'identique, sans
// normalisation d'unité ni de laboratoire. Aucun écart, aucun champ numérique
// dérivé des valeurs : la valeur reste le texte de la base.

export type LigneDeSerie = LigneResultatDatee & {
  /** Le décimal tel que la base le porte, en texte — jamais un nombre. */
  valeur: string;
  unite: string | null;
  /**
   * Le laboratoire tel que lu sur l'en-tête de l'import, `null` pour une
   * saisie praticien ou un import sans laboratoire lu.
   */
  laboratoire: string | null;
  /**
   * La tête du contexte de prélèvement de CETTE ligne ([[D-497]] §4) — seule
   * une racine en porte une. `null` ou absent : aucune ligne de contexte,
   * « contexte de prélèvement non recueilli » (résultat antérieur à BP-05).
   */
  contexte?: ContextePrelevementSaisi | null;
  /**
   * L'import a-t-il lu l'heure du prélèvement (`LigneBiologiqueCandidate.heureLue`) ?
   * Le moment de la journée n'est pas un champ (§3) : sans heure lue — saisie
   * praticien comprise —, il est « inconnu ».
   */
  heureLue?: boolean;
};

/** Une ouverture du calendrier de suivi : un jour 0 et sa diffusion. */
export type JourZeroDeSuivi = { jourZero: Date; approbationId: string };

export type PositionDansLeSuivi =
  | { type: 'jour'; jour: number; jourZero: string }
  | { type: 'anterieur'; jourZero: string }
  | { type: 'aucune_diffusion' };

export const MOTIFS_NON_COMPARABILITE = [
  'point_unique',
  'unites_differentes',
  'laboratoire_non_identifie',
  'laboratoires_differents',
  // [[D-497]] §5 : tant qu'un point n'a pas de ligne de contexte, ou qu'un de
  // ses sept champs vaut « inconnu ». Un contexte n'est jamais « complet ».
  'contexte_non_renseigne',
  // [[D-497]] §5 : deux points qui diffèrent sur un même champ renseigné.
  'contextes_differents',
] as const;

export type MotifNonComparabilite = (typeof MOTIFS_NON_COMPARABILITE)[number];

export type PointDeSerie<T extends LigneDeSerie> = {
  ligne: T;
  /** `saisiLe` de la racine du fil, ISO. */
  entreeLe: string;
  /** `saisiLe` de la tête quand elle remplace une ligne, sinon `null`. */
  correctionLe: string | null;
  position: PositionDansLeSuivi;
  /**
   * Le contexte de la RACINE du fil ([[D-497]] §4 : une correction garde le
   * contexte de sa racine), `null` s'il n'a pas été recueilli.
   */
  contexte: ContextePrelevementSaisi | null;
  /** L'heure du prélèvement a-t-elle été lue à l'import (racine du fil) ? */
  heureLue: boolean;
};

export type SerieAnalyte<T extends LigneDeSerie> = {
  analyteCode: string;
  /** Dans l'ordre du prélèvement, puis de la saisie, puis de l'identifiant. */
  points: PointDeSerie<T>[];
  motifs: MotifNonComparabilite[];
};

/** Ordre croissant ; même départage que `plusRecente` (saisie, puis identifiant). */
function chronologique(a: LigneDeSerie, b: LigneDeSerie): number {
  if (a.preleveLe !== b.preleveLe) return a.preleveLe < b.preleveLe ? -1 : 1;
  if (a.saisiLe !== b.saisiLe) return a.saisiLe < b.saisiLe ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * La racine du fil d'une tête, en remontant le chaînage dans la série lue. Une
 * cible absente arrête la remontée là où elle se casse ; un cycle (base
 * abîmée) aussi — on ne boucle pas.
 */
function racineDe<T extends LigneDeSerie>(tete: T, parId: ReadonlyMap<string, T>): T {
  const vues = new Set<string>([tete.id]);
  let courante = tete;
  for (;;) {
    const cible = courante.supersedesResultatId;
    const amont = cible ? parId.get(cible) : undefined;
    if (!amont || vues.has(amont.id)) return courante;
    vues.add(amont.id);
    courante = amont;
  }
}

/** Jours calendaires de Paris entre deux instants — aucun piège d'heure d'été. */
function joursCalendaires(depuis: Date, jusqua: Date): number {
  const [a1, m1, j1] = dateJourParis(depuis).split('-').map(Number);
  const [a2, m2, j2] = dateJourParis(jusqua).split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, j2) - Date.UTC(a1, m1 - 1, j1)) / 86_400_000);
}

/**
 * La position d'un prélèvement dans le suivi. `joursZero` est trié, croissant.
 * Un prélèvement du jour même d'une diffusion, fût-ce le matin, est son jour 0.
 */
export function positionDansLeSuivi(
  preleveLe: string,
  joursZero: readonly JourZeroDeSuivi[],
): PositionDansLeSuivi {
  const premier = joursZero[0];
  if (!premier) return { type: 'aucune_diffusion' };
  const preleve = new Date(preleveLe);
  let enVigueur: JourZeroDeSuivi | null = null;
  for (const ouverture of joursZero) {
    if (joursCalendaires(ouverture.jourZero, preleve) >= 0) enVigueur = ouverture;
  }
  if (!enVigueur) return { type: 'anterieur', jourZero: premier.jourZero.toISOString() };
  return {
    type: 'jour',
    jour: joursCalendaires(enVigueur.jourZero, preleve),
    jourZero: enVigueur.jourZero.toISOString(),
  };
}

function motifsDe(points: readonly PointDeSerie<LigneDeSerie>[]): MotifNonComparabilite[] {
  const motifs: MotifNonComparabilite[] = [];
  if (points.length === 1) motifs.push('point_unique');
  // À l'identique : « UI/L » et « U/L » sont deux unités ici. Une table
  // d'équivalence de graphies serait une décision à part (F60).
  if (new Set(points.map(p => p.ligne.unite)).size > 1) motifs.push('unites_differentes');
  const laboratoires = points.map(p => p.ligne.laboratoire);
  if (laboratoires.some(l => l === null)) motifs.push('laboratoire_non_identifie');
  if (new Set(laboratoires.filter(l => l !== null)).size > 1) motifs.push('laboratoires_differents');
  // Les deux absences (non recueilli, inconnu) rendent le même motif : la
  // série ne compare pas ce qu'elle ne connaît pas. L'écran, lui, les dit
  // distinctement, point par point.
  if (points.some(p => p.contexte === null || champsInconnus(p.contexte).length > 0)) {
    motifs.push('contexte_non_renseigne');
  }
  const contextes = points.map(p => p.contexte).filter((c): c is ContextePrelevementSaisi => c !== null);
  if (contextes.some((a, i) => contextes.slice(i + 1).some(b => champsQuiDifferent(a, b).length > 0))) {
    motifs.push('contextes_differents');
  }
  return motifs;
}

/**
 * Les séries du dossier, une par analyte qui porte au moins une mesure qui
 * fait foi, dans l'ordre des codes.
 *
 * `annulations` : les annulations ACTIVES, indexées par la ligne qui les
 * porte ; une table vide dit « aucune », jamais « non lu ».
 * `joursZero` : tous les jours 0 du dossier (`joursZeroSuccessifs`), vide
 * s'il n'y a eu aucune diffusion.
 */
export function serieParAnalyte<T extends LigneDeSerie>(
  lignes: T[],
  annulations: ReadonlyMap<string, unknown>,
  joursZero: readonly JourZeroDeSuivi[],
): SerieAnalyte<T>[] {
  const corrigees = correctionsParLigne(lignes);
  const annulees = annulationParLigne(lignes, annulations);
  const parId = new Map(lignes.map(l => [l.id, l] as const));
  const ouvertures = [...joursZero].sort((a, b) => a.jourZero.getTime() - b.jourZero.getTime());

  const parAnalyte = new Map<string, PointDeSerie<T>[]>();
  for (const ligne of lignes) {
    if (corrigees.has(ligne.id) || annulees.has(ligne.id)) continue;
    const points = parAnalyte.get(ligne.analyteCode) ?? [];
    const racine = racineDe(ligne, parId);
    points.push({
      ligne,
      entreeLe: racine.saisiLe,
      correctionLe: ligne.supersedesResultatId ? ligne.saisiLe : null,
      position: positionDansLeSuivi(ligne.preleveLe, ouvertures),
      contexte: racine.contexte ?? null,
      heureLue: racine.heureLue ?? false,
    });
    parAnalyte.set(ligne.analyteCode, points);
  }

  return [...parAnalyte]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([analyteCode, points]) => {
      points.sort((a, b) => chronologique(a.ligne, b.ligne));
      return { analyteCode, points, motifs: motifsDe(points) };
    });
}
