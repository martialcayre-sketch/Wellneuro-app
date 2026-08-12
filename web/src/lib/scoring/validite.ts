// Validité clinique des passations (LOT-00, campagne « chaîne T0 »).
//
// Le statut vit sur questionnaire_reponses.statut_validite (migration
// 20260811030000). Doctrine, identique au commentaire du schéma : VALID et
// AMBIGUOUS alimentent le raisonnement clinique (AMBIGUOUS est signalé au
// praticien, jamais exclu en silence) ; INVALID, SUPERSEDED et HISTORICAL_ONLY
// en sortent — synthèse, orientation, équilibre/momentum, cockpit — mais la
// ligne reste lisible partout ailleurs (inbox, audit, dejaRepondu).
//
// DRAPEAU ÉTEINT PAR DÉFAUT (WN_ENABLE_VALIDITE_PASSATIONS) : tant que la
// migration n'est pas relâchée en production par release-db, ce module ne doit
// rien changer au comportement — drapeau éteint, aucune passation n'est
// exclue, quel que soit son statut. C'est la matérialisation de la règle
// « migration et code dépendant en PR séparées, ou drapeau éteint ».
//
// Un champ ABSENT (ancien client Prisma, fixture de test, mock) vaut VALID :
// l'exclusion ne s'applique qu'à un statut explicitement porté. Une valeur
// inconnue est impossible en base (contrainte CHECK) ; si elle apparaissait
// malgré tout (fixture erronée), elle serait traitée comme VALID plutôt que
// d'exclure en silence — le CHECK en base est le vrai garde.
//
// ── SUPERSEDED n'est PAS une re-passation ───────────────────────────────────
//
// À ne jamais poser automatiquement quand un patient repasse un instrument.
// Une re-mesure à J21 n'annule pas la mesure de T0 : `construireHistoriqueEquilibre`
// reconstruit chaque jalon depuis les passations connues À CETTE DATE-LÀ, donc
// marquer l'ancienne ferait disparaître le point de départ et, avec lui, tout
// le momentum. Les deux passations restent VALID, et c'est la fenêtre de jalon
// qui choisit laquelle parle.
//
// SUPERSEDED désigne un REMPLACEMENT : une passation fautive (saisie erronée,
// doublon technique, patient qui a répondu au hasard puis recommencé) que le
// praticien remplace explicitement. Le geste est le sien, jamais celui du
// moteur. `depuisPrisma` l'exclut de l'historique pour cette raison précise :
// une passation remplacée n'a jamais mesuré quoi que ce soit.
//
// ── Ce statut ne remplace pas le registre des passations non interprétables ──
//
// `passationsNonInterpretables.ts` dit autre chose : la passation a bien eu
// lieu, ses réponses brutes restent vraies, mais le RÉSULTAT calculé n'est pas
// une mesure. Elle est donc transmise NOMMÉE-MAIS-VIDÉE — ce qui laisse au
// praticien le signal « mesure à replanifier ». La convertir en INVALID
// effacerait ce signal. Les deux mécanismes se complètent ; aucun n'absorbe
// l'autre.

export const STATUTS_VALIDITE = [
  'VALID',
  'AMBIGUOUS',
  'INVALID',
  'SUPERSEDED',
  'HISTORICAL_ONLY',
] as const;

export type StatutValidite = (typeof STATUTS_VALIDITE)[number];

const STATUTS_EXCLUS_DU_RAISONNEMENT: ReadonlySet<string> = new Set([
  'INVALID',
  'SUPERSEDED',
  'HISTORICAL_ONLY',
]);

export function validitePassationsActive(): boolean {
  return process.env.WN_ENABLE_VALIDITE_PASSATIONS === '1';
}

/**
 * Le statut sort-il du raisonnement, INDÉPENDAMMENT du drapeau ?
 *
 * POURQUOI CETTE SECONDE PORTE. `estExclueDuRaisonnement` rend `false` quand le
 * drapeau est éteint, et c'est voulu : tant qu'il l'est, aucune passation ne
 * doit DISPARAÎTRE du raisonnement. Mais désigner une passation `INVALID`
 * comme celle qui FAIT FOI est une affirmation fausse même drapeau éteint —
 * elle ne retire rien, elle promeut. Un repère neuf n'a aucune raison
 * d'attendre l'allumage d'un filtre pour cesser de mentir.
 *
 * À n'utiliser que pour DÉSIGNER, jamais pour FILTRER : filtrer sans drapeau
 * ferait disparaître des lignes que le LOT-00 s'est engagé à transmettre.
 */
export function statutExcluDuRaisonnement(statutValidite: string | null | undefined): boolean {
  if (!statutValidite) return false;
  return STATUTS_EXCLUS_DU_RAISONNEMENT.has(statutValidite);
}

/**
 * Vrai si la passation doit sortir du raisonnement clinique. Drapeau éteint ou
 * statut absent → jamais exclue.
 */
export function estExclueDuRaisonnement(statutValidite: string | null | undefined): boolean {
  if (!validitePassationsActive()) return false;
  if (!statutValidite) return false;
  return STATUTS_EXCLUS_DU_RAISONNEMENT.has(statutValidite);
}

/**
 * Filtre une liste de passations pour le raisonnement clinique. Ne retire
 * jamais rien d'autre que les statuts exclus : l'ordre et le reste des lignes
 * sont préservés tels quels.
 */
export function filtrerPassationsExploitables<T extends { statutValidite?: string | null }>(
  reponses: readonly T[],
): T[] {
  if (!validitePassationsActive()) return [...reponses];
  return reponses.filter((r) => !r.statutValidite || !STATUTS_EXCLUS_DU_RAISONNEMENT.has(r.statutValidite));
}
