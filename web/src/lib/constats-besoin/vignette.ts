// LA VIGNETTE DU CONSTAT SUR UN BESOIN SANS SCORE ([[D-551]], J3-12f, H15) —
// PUR : la lecture lui passe la tête de chaque besoin et ce qui la rend « à
// relire » ; les tests lui passent des fixtures. Aucun import hors de la liste
// fermée du constat ([[D-347]] §3) : un composant client en lit les mots.
//
// CE QUE LA VIGNETTE EST ([[D-551]] §1) : le verdict du constat en vigueur, EN
// MOTS — ceux de [[D-347]] §3 —, jamais un nombre, une couleur ou une jauge.
// Hors du total et hors du compte des besoins mesurés : le besoin reste « non
// mesuré » (6, 7, 11) ou « hors score » (2). Un constat n'est pas une mesure
// ([[D-347]] §6). Le motif et la note restent dans le panneau du constat : la
// vignette ne les porte pas, et la route qui la sert ne les lit pas hors de
// la lecture du dossier.
//
// QUAND ELLE DISPARAÎT ([[D-551]] §3) : dès que le besoin porte une source de
// score — le constat reste lisible dans son panneau et dans l'historique, signalé
// « à relire ». Les autres raisons de relire ([[D-347]] §5.1 et §5.2 : pièce
// corrigée ou annulée, nouveau prélèvement, passation repassée ou invalidée,
// date atteinte) gardent la vignette, avec la mention « à relire ».
//
// CE QU'ELLE NE DEVIENT PAS ([[D-551]] §5) : aucun mot de jugement sur l'état du
// patient, aucune couleur d'état, aucun tri, aucune lecture par un moteur.

import { BESOINS_CONSTATABLES, estVerdict, LIBELLES_VERDICT, type RaisonARelire, type Verdict } from './liste';

/**
 * Le libellé qui précède le verdict ([[D-551]] §1, validé mot pour mot par le
 * responsable avant le merge).
 */
export const LIBELLE_VIGNETTE = 'constat du praticien :';

/** Ajoutée quand une raison de relire autre que le score tient ([[D-551]] §3). */
export const MENTION_VIGNETTE_A_RELIRE = 'à relire';

/** Ce que l'écran reçoit : un verdict de la liste fermée, et si le constat est à relire. */
export type VignetteConstat = { verdict: Verdict; aRelire: boolean };

/** Ce que la vignette lit de la lecture du dossier : la tête, et pourquoi elle se relit. */
export type BesoinLuPourVignette = {
  besoin: number;
  tete: { verdict: string | null } | null;
  aRelire: readonly RaisonARelire[];
};

/**
 * Les vignettes d'un dossier, par besoin. Un besoin sans vignette n'a pas de
 * clé : aucun constat posé (ou retiré), un besoin hors des quatre constatables,
 * un besoin qui porte une source de score, un verdict hors de la liste fermée.
 */
export function vignettesDesConstats(
  besoins: readonly BesoinLuPourVignette[],
  besoinsAvecScore: ReadonlySet<number>,
): Record<number, VignetteConstat> {
  const rendu: Record<number, VignetteConstat> = {};
  for (const lu of besoins) {
    if (!(BESOINS_CONSTATABLES as readonly number[]).includes(lu.besoin)) continue;
    if (besoinsAvecScore.has(lu.besoin)) continue;
    if (lu.tete === null || !estVerdict(lu.tete.verdict)) continue;
    rendu[lu.besoin] = {
      verdict: lu.tete.verdict,
      aRelire: lu.aRelire.some(r => r !== 'besoin_avec_score'),
    };
  }
  return rendu;
}

/** La ligne servie : « constat du praticien : à soutenir », suivie de « — à relire » le cas échéant. */
export function ligneVignette(v: VignetteConstat): string {
  return `${LIBELLE_VIGNETTE} ${LIBELLES_VERDICT[v.verdict]}${v.aRelire ? ` — ${MENTION_VIGNETTE_A_RELIRE}` : ''}`;
}
