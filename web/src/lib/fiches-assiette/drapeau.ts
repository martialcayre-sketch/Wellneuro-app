// `WN_FICHES_ASSIETTE` — LE DRAPEAU GARDE L'ÉMISSION, PAS LA LECTURE
// ([[D-251]] §7). Fermé, le clic « Valider pour diffusion » fait exactement ce
// qu'il faisait avant le lot 8 : aucun aperçu de fiches, aucune remise. La
// relecture et la validation des fiches (rayon « Fiches conseils ») ne sont pas
// gardées, et le coupe-circuit de la LECTURE reste le retrait par version.
//
// Convention des drapeaux produit (`docs/FEATURE_FLAGS.md` § A) : la chaîne
// exacte `'true'`, absent = fermé. Posé en production le 2026-09-28, sur ordre
// du responsable, AVANT les conditions du §10 : celles-ci sont passées au
// drapeau de lecture, ci-dessous (amendement du 2026-09-28 au soir).

export function envoiFichesOuvert(): boolean {
  return process.env.WN_FICHES_ASSIETTE === 'true';
}

// `WN_FICHES_ASSIETTE_LECTURE` — LE DRAPEAU GARDE LA LECTURE PATIENT (lots 9-11).
// Fermé, la route du portail répond 503 avant toute lecture de session ou de
// base : aucune fiche remise n'atteint un patient. Il garde aussi l'e-mail
// neutre (lot 11, `annonce.ts`) : annoncer un document derrière une page
// fermée serait promettre une porte close. Il porte les conditions du
// §10 de [[D-251]] : les sept fiches validées, l'espace de lecture constaté, le
// document TRUST sur l'usage de l'IA publié, une contre-revue adverse.
//
// DISTINCT DU DRAPEAU D'ÉMISSION, et c'est le point de l'amendement : le
// drapeau d'émission est ouvert. Sous un drapeau unique, la première remise
// deviendrait lisible au merge de l'écran, avant le document TRUST.
//
// Posé en production le 2026-09-29 à 20:40:15 UTC, sur ordre du responsable,
// avant le constat de l'espace, le document TRUST et la contre-revue
// (amendement du 2026-09-29 au soir) : 7 fiches validées, 0 remise à la pose.

export function lectureFichesOuverte(): boolean {
  return process.env.WN_FICHES_ASSIETTE_LECTURE === 'true';
}
