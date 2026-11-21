// Origine d'une déclaration « prête @<sha> » (`D-546` §2). FONCTIONS PURES.
//
// L'intégrateur ne sert une déclaration que si :
// - son auteur est le propriétaire du dépôt (login ET `author_association`
//   `OWNER`) ;
// - la tête de la PR vient du dépôt lui-même, jamais d'une fourche.
//
// Sinon la déclaration est marquée « contrôle indéterminé » : aucun merge. Le
// contrôle vivait dans le guetteur hors dépôt de l'intégrateur depuis le
// 2026-11-13 ; il est versé ici, avec son banc, pour la sonde `prete` de
// `wn-guetteur.mjs` et pour `wn-integrer.mjs`.
//
// Les sessions écrivent toutes sous le compte du propriétaire : ce contrôle
// écarte un tiers, il ne distingue pas une session d'une autre.

/**
 * Motifs de refus de l'origine ; un tableau vide vaut « origine vérifiée ».
 *
 * @param {{user?: {login?: string}, author_association?: string}} commentaire
 *   commentaire REST (`issues/<N>/comments`)
 * @param {{isCrossRepository?: boolean|null, headRepositoryOwner?: {login?: string}|null}} pr
 *   PR convertie par `versPrGraphql` (`scripts/lib/gh-rest.mjs`)
 * @param {string} proprietaire login du propriétaire du dépôt
 * @returns {string[]}
 */
export function motifsOrigine(commentaire, pr, proprietaire) {
  const motifs = [];
  if (typeof proprietaire !== 'string' || proprietaire === '') return ['proprietaire-inconnu'];
  if (commentaire?.user?.login !== proprietaire) motifs.push(`auteur=${commentaire?.user?.login ?? '?'}`);
  if (commentaire?.author_association !== 'OWNER') motifs.push(`association=${commentaire?.author_association ?? '?'}`);
  if (pr?.isCrossRepository !== false) motifs.push('fourche');
  if (pr?.headRepositoryOwner?.login !== proprietaire) motifs.push(`tete-depot=${pr?.headRepositoryOwner?.login ?? '?'}`);
  return motifs;
}

/**
 * Le suffixe de ligne lu par l'intégrateur. Mêmes mots que le guetteur hors
 * dépôt (`provenance=ok`, `CONTROLE-INDETERMINE(...)`) : la bascule vers la
 * sonde du dépôt ne change rien à ce qu'il lit.
 */
export function libelleOrigine(motifs) {
  return motifs.length ? `CONTROLE-INDETERMINE(${motifs.join(',')})` : 'provenance=ok';
}
