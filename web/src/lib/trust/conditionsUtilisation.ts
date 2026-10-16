// `WN_PORTAIL_CONDITIONS` — LES CONDITIONS D'UTILISATION DE L'ESPACE PATIENT
// ([[D-292]], lettre k ; ACT-1, H70). Fermé, le portail est exactement celui
// d'avant : accueil en trois textes, dépôt de compte rendu sous l'accusé de
// `usage_ia`, aucune page des conditions, et la route de lecture refuse leur
// accusé. Ouvert :
// - un nouveau patient majeur voit les conditions seules à l'accueil ; un
//   patient déjà suivi, rien (D-292 §3) ; un dossier mineur ou sans date de
//   naissance garde l'accueil en trois textes (arbitrage du 2026-10-16) ;
// - la page des conditions et son bouton « J'en ai pris connaissance » ;
// - le dépôt de compte rendu exige l'accusé des conditions (D-292 §4).
//
// Convention des drapeaux produit (`docs/FEATURE_FLAGS.md` § A) : la chaîne
// exacte `'true'`, absent = fermé. Variable serveur : un composant client ne la
// lit pas, c'est `api/portail/trust/etat` qui la lui dit.

import type { TrustDocumentKey } from './types';

export const CLE_CONDITIONS: TrustDocumentKey = 'conditions_utilisation';

export function conditionsUtilisationOuvertes(): boolean {
  return process.env.WN_PORTAIL_CONDITIONS === 'true';
}
