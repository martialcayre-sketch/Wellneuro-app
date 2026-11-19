import { isCbResultsEnabled } from '@/lib/biology-library/publie';

// Drapeau du flux de biologie vers la synthèse — [[D-513]] §2 et §12
// (arbitrage `20261113-2300-b`).
//
// UN DRAPEAU PROPRE AU FLUX. `WN_CB_RESULTS_ENABLED` est déjà allumé en
// production : s'il suffisait, le flux s'ouvrirait au déploiement du code. Ce
// drapeau-ci est créé ÉTEINT avec le code ; sa pose en production est un geste
// du responsable, après les trois préalables du §12 (paragraphe du dossier RGPD
// validé ; « Vos données personnelles » v24 et conditions v7 servies et
// constatées ; évaluation sur dossiers fictifs rendue).
//
// IL NE GARDE QUE LE FLUX : la lecture des résultats, la construction du bloc
// et le second appel qui le transmet ([[D-539]] §2). La consigne
// `synthese-v38`, celle du second appel, le schéma v4, les listes de champs et
// le contrôle de contamination se déploient sans lui. Sa pose exige les trois
// préalables de [[D-539]] §7b : paragraphe 2 quater validé, v24 et conditions
// v7 servies et constatées, évaluation de [[D-539]] §8 conforme.
//
// Fail-closed : seule la chaîne exacte « true » ouvre, et l'étage des
// résultats doit l'être aussi. Absent, vide, « 1 » ou « TRUE » laissent fermé.
// Les paramètres par défaut rendent le drapeau testable sans `process.env`.
export function isSyntheseBiologieEnabled(
  value = process.env.WN_SYNTHESE_BIOLOGIE_ENABLED,
  valueResultats = process.env.WN_CB_RESULTS_ENABLED,
  valueRayon = process.env.WN_CB_ENABLED,
): boolean {
  return value === 'true' && isCbResultsEnabled(valueResultats, valueRayon);
}
