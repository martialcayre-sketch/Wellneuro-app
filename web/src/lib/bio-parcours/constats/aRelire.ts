// Le constat EN VIGUEUR d'une hypothèse, et pourquoi il se dit « à relire »
// ([[D-331]] §2, §5, BP-11) — PUR : la lecture (`lecture.ts`) lui passe ce
// qu'elle a lu, les bancs lui passent des fixtures. Aucune valeur n'entre
// ici : des clés, des dates de prélèvement ou de passation, des drapeaux.
//
// « À relire » se DÉRIVE, ne s'écrit jamais, et une condition levée (une
// annulation révoquée, par exemple) rend au constat son état sans geste.

import type { RaisonARelire } from './liste';
import { RAISONS_A_RELIRE } from './liste';

export type PieceLue =
  | { type: 'resultat'; idResultat: string }
  | { type: 'reponse'; idReponse: string };

export type ActeConstatLu = {
  id: string;
  /** `ordre` de la base, en chaîne (BigInt ne passe pas en JSON). */
  ordre: string;
  acte: 'pose' | 'retrait';
  hypotheseCode: string;
  verdict: string | null;
  motif: string | null;
  note: string | null;
  /** AAAA-MM-JJ, ou `null`. */
  aRevoirLe: string | null;
  idConstatRemplace: string | null;
  praticienEmail: string;
  /** ISO, posé par la base. */
  acteLe: string;
  pieces: PieceLue[];
};

/** Ce que la lecture sait d'une ligne de résultat citée. */
export type ResultatCite = {
  analyteCode: string;
  /** ISO. */
  preleveLe: string;
  /** Une ligne la supplante ([[D-124]]) — au sens de `correctionsParLigne`. */
  corrigee: boolean;
  /** Son fil porte une annulation active ([[D-294]]). */
  annulee: boolean;
};

/** Ce que la lecture sait d'une passation citée. */
export type ReponseCitee = {
  idQuestionnaire: string;
  /** ISO. */
  dateReponse: string;
  statutValidite: string;
};

export type EtatDuDossier = {
  resultats: ReadonlyMap<string, ResultatCite>;
  /** Par analyte : le prélèvement le plus récent parmi les lignes NON annulées du dossier (ISO). */
  dernierPrelevement: ReadonlyMap<string, string>;
  reponses: ReadonlyMap<string, ReponseCitee>;
  /** Par questionnaire : la passation la plus récente qui alimente le raisonnement (ISO). */
  derniereReponse: ReadonlyMap<string, string>;
  /** Les hypothèses de la structure signée en vigueur. */
  hypothesesEnVigueur: ReadonlySet<string>;
  /** Le jour, AAAA-MM-JJ, Europe/Paris (`dateJourParis`). */
  aujourdhui: string;
};

/** Les deux statuts de validité qui alimentent le raisonnement (doctrine des cinq statuts). */
export const VALIDITES_RETENUES: readonly string[] = ['VALID', 'AMBIGUOUS'];

export type HypotheseLue = {
  hypotheseCode: string;
  /** La pose en vigueur, ou `null` (aucun constat, ou retiré). */
  tete: ActeConstatLu | null;
  /** Tous les actes de l'hypothèse, dans l'ordre. */
  historique: ActeConstatLu[];
};

/**
 * Les actes du dossier, par hypothèse, dans l'ordre de la base : une pose
 * devient la tête, un retrait la vide — l'invariant que la base tient (une
 * pose remplace la tête, un retrait ne vise qu'elle).
 */
export function regrouperParHypothese(actes: readonly ActeConstatLu[]): HypotheseLue[] {
  const tries = [...actes].sort((a, b) => (BigInt(a.ordre) < BigInt(b.ordre) ? -1 : 1));
  const parHypothese = new Map<string, HypotheseLue>();
  for (const acte of tries) {
    const lue = parHypothese.get(acte.hypotheseCode)
      ?? { hypotheseCode: acte.hypotheseCode, tete: null, historique: [] };
    lue.historique.push(acte);
    lue.tete = acte.acte === 'pose' ? acte : null;
    parHypothese.set(acte.hypotheseCode, lue);
  }
  return [...parHypothese.values()].sort((a, b) => (a.hypotheseCode < b.hypotheseCode ? -1 : 1));
}

function plusRecent(a: string, b: string): boolean {
  return Date.parse(a) > Date.parse(b);
}

/**
 * Les conditions qui rendent une pose « à relire » ([[D-331]] §5), dans
 * l'ordre de la liste. Vide : le constat tient. Une re-signature de la
 * structure qui garde l'hypothèse ne compte pas (§5, dernier alinéa).
 */
export function raisonsARelire(constat: ActeConstatLu, etat: EtatDuDossier): RaisonARelire[] {
  const raisons = new Set<RaisonARelire>();

  // 1, 2, 3 — les pièces de biologie.
  const citeParAnalyte = new Map<string, string>();
  for (const piece of constat.pieces) {
    if (piece.type !== 'resultat') continue;
    const ligne = etat.resultats.get(piece.idResultat);
    if (!ligne) continue;
    if (ligne.corrigee) raisons.add('piece_corrigee');
    if (ligne.annulee) raisons.add('piece_annulee');
    const deja = citeParAnalyte.get(ligne.analyteCode);
    if (deja === undefined || plusRecent(ligne.preleveLe, deja)) citeParAnalyte.set(ligne.analyteCode, ligne.preleveLe);
  }
  for (const [analyte, cite] of citeParAnalyte) {
    const dernier = etat.dernierPrelevement.get(analyte);
    if (dernier !== undefined && plusRecent(dernier, cite)) raisons.add('nouveau_prelevement');
  }

  // 4, 5 — les pièces de questionnaire.
  const citeParQuestionnaire = new Map<string, string>();
  for (const piece of constat.pieces) {
    if (piece.type !== 'reponse') continue;
    const reponse = etat.reponses.get(piece.idReponse);
    if (!reponse) continue;
    if (!VALIDITES_RETENUES.includes(reponse.statutValidite)) raisons.add('passation_invalidee');
    const deja = citeParQuestionnaire.get(reponse.idQuestionnaire);
    if (deja === undefined || plusRecent(reponse.dateReponse, deja)) citeParQuestionnaire.set(reponse.idQuestionnaire, reponse.dateReponse);
  }
  for (const [questionnaire, cite] of citeParQuestionnaire) {
    const derniere = etat.derniereReponse.get(questionnaire);
    if (derniere !== undefined && plusRecent(derniere, cite)) raisons.add('passation_plus_recente');
  }

  // 6 — la date « à revoir le » est atteinte (le jour même compte).
  if (constat.aRevoirLe !== null && constat.aRevoirLe <= etat.aujourdhui) raisons.add('date_echue');

  // 7 — l'hypothèse ne figure plus dans la structure signée en vigueur.
  if (!etat.hypothesesEnVigueur.has(constat.hypotheseCode)) raisons.add('hypothese_hors_structure');

  return RAISONS_A_RELIRE.filter(r => raisons.has(r));
}
