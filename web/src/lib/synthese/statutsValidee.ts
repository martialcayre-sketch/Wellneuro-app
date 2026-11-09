/**
 * Les statuts d'une synthèse qui valent validation praticien — la liste, et
 * rien d'autre.
 *
 * MODULE FEUILLE, SANS AUCUN IMPORT, sur le patron de `clinical-engine/rideauT0.ts`.
 * Deux lecteurs doivent juger « validée » avec EXACTEMENT le même ensemble :
 *
 *   - `clinical-engine/preconditionsT0.ts`, qui le ré-exporte sous son nom
 *     historique `STATUTS_SYNTHESE_VALIDEE` — ses lecteurs existants n'ont pas
 *     bougé d'un caractère ;
 *   - les adaptateurs bornés de `lib/objectif/` (`matierePriorite.ts`,
 *     `matiereComprehension.ts`), dont la garde de surface interdit tout import
 *     de `@/lib/clinical-engine` : `preconditionsT0.ts` tire des dépendances
 *     cliniques et Prisma. La constante ne pouvait donc pas rester là-bas.
 *
 * `Corrigee_Praticien` N'EST PAS UNE SYNTHÈSE NON VALIDÉE. La route de synthèse
 * ne la produit que depuis `Validee_Praticien`, quand le praticien annote une
 * synthèse déjà validée : texte et `dateValidation` restent ceux de la
 * validation. Une annotation commente une synthèse, elle ne la re-valide pas
 * (D-167 §2 et §10 amendées par la décision de t62).
 */
export const STATUTS_SYNTHESE_VALIDEE = ['Validee_Praticien', 'Corrigee_Praticien'] as const;
