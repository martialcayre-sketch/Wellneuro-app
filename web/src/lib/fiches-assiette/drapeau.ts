// `WN_FICHES_ASSIETTE` — LE DRAPEAU GARDE L'ÉMISSION, PAS LA LECTURE
// ([[D-251]] §7). Fermé, le clic « Valider pour diffusion » fait exactement ce
// qu'il faisait avant le lot 8 : aucun aperçu de fiches, aucune remise. La
// relecture et la validation des fiches (rayon « Fiches conseils ») ne sont pas
// gardées, et le coupe-circuit de la LECTURE reste le retrait par version.
//
// Convention des drapeaux produit (`docs/FEATURE_FLAGS.md` § A) : la chaîne
// exacte `'true'`, absent = fermé. Il ne s'ouvre qu'aux conditions du §10 :
// sept fiches validées, espace de lecture constaté, document TRUST sur l'IA
// publié, contre-revue adverse.

export function envoiFichesOuvert(): boolean {
  return process.env.WN_FICHES_ASSIETTE === 'true';
}
