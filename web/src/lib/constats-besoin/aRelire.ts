// Le constat EN VIGUEUR d'un besoin, et pourquoi il se dit « à relire »
// ([[D-347]] §2, §5, t40) — PUR : la lecture (`lecture.ts`) lui passe ce
// qu'elle a lu, les tests lui passent des fixtures. Aucune valeur n'entre
// ici : des clés, des dates de prélèvement ou de passation, des drapeaux.
//
// « À relire » se DÉRIVE, ne s'écrit jamais, et une condition levée (une
// annulation révoquée, par exemple) rend au constat son état sans geste.
// Les conditions sur les pièces sont celles de [[D-331]] §5 (1 à 5) ; leur
// état se lit comme pour les constats du parcours (`EtatDuDossier` partagé).

import type { ReponseCitee, ResultatCite } from '@/lib/bio-parcours/constats/aRelire';
import { VALIDITES_RETENUES } from '@/lib/bio-parcours/constats/aRelire';
import { RAISONS_A_RELIRE, type RaisonARelire } from './liste';

export type PieceLue = { type: 'resultat'; idResultat: string } | { type: 'reponse'; idReponse: string };

export type ActeConstatBesoinLu = {
  id: string;
  /** `ordre` de la base, en chaîne (BigInt ne passe pas en JSON). */
  ordre: string;
  acte: 'pose' | 'retrait';
  besoin: number;
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

export type EtatPourBesoins = {
  resultats: ReadonlyMap<string, ResultatCite>;
  /** Par analyte : le prélèvement le plus récent parmi les lignes NON annulées du dossier (ISO). */
  dernierPrelevement: ReadonlyMap<string, string>;
  reponses: ReadonlyMap<string, ReponseCitee>;
  /** Par questionnaire : la passation la plus récente qui alimente le raisonnement (ISO). */
  derniereReponse: ReadonlyMap<string, string>;
  /** Les besoins qui portent une source de score ([[D-347]] §5.3). */
  besoinsAvecScore: ReadonlySet<number>;
  /** Le jour, AAAA-MM-JJ, Europe/Paris (`dateJourParis`). */
  aujourdhui: string;
};

export type BesoinLu = {
  besoin: number;
  /** La pose en vigueur, ou `null` (aucun constat, ou retiré). */
  tete: ActeConstatBesoinLu | null;
  /** Tous les actes du besoin, dans l'ordre. */
  historique: ActeConstatBesoinLu[];
};

/**
 * Les actes du dossier, par besoin, dans l'ordre de la base : une pose devient
 * la tête, un retrait la vide — l'invariant que la base tient (une pose
 * remplace la tête, un retrait ne vise qu'elle).
 */
export function regrouperParBesoin(actes: readonly ActeConstatBesoinLu[]): BesoinLu[] {
  const tries = [...actes].sort((a, b) => (BigInt(a.ordre) < BigInt(b.ordre) ? -1 : 1));
  const parBesoin = new Map<number, BesoinLu>();
  for (const acte of tries) {
    const lu = parBesoin.get(acte.besoin) ?? { besoin: acte.besoin, tete: null, historique: [] };
    lu.historique.push(acte);
    lu.tete = acte.acte === 'pose' ? acte : null;
    parBesoin.set(acte.besoin, lu);
  }
  return [...parBesoin.values()].sort((a, b) => a.besoin - b.besoin);
}

function plusRecent(a: string, b: string): boolean {
  return Date.parse(a) > Date.parse(b);
}

/** Les conditions qui rendent une pose « à relire » ([[D-347]] §5), dans l'ordre de la liste. Vide : le constat tient. */
export function raisonsARelireBesoin(constat: ActeConstatBesoinLu, etat: EtatPourBesoins): RaisonARelire[] {
  const raisons = new Set<RaisonARelire>();

  // §5.1 — les pièces de biologie (D-331 §5, conditions 1 à 3).
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

  // §5.1 — les pièces de questionnaire (D-331 §5, conditions 4 et 5).
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

  // §5.2 — la date « à revoir le » est atteinte (le jour même compte).
  if (constat.aRevoirLe !== null && constat.aRevoirLe <= etat.aujourdhui) raisons.add('date_echue');

  // §5.3 — le besoin porte une source de score.
  if (etat.besoinsAvecScore.has(constat.besoin)) raisons.add('besoin_avec_score');

  return RAISONS_A_RELIRE.filter(r => raisons.has(r));
}
