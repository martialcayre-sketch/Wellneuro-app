// Bascule des liens permanents — réserve R4 de l'audit de conformité 5.0.
//
// LE PROBLÈME. Deux chemins d'accès au portail coexistent : le lien permanent
// historique (`patients.access_token`, en clair en base) et le lien magique G4
// (haché, 24 h, usage unique). La coexistence était voulue — introduire une
// expiration ne périme pas rétroactivement les liens déjà envoyés. Mais tant
// qu'aucune date de fin n'existe, G4 n'est pas « le seul chemin » et le jeton en
// clair reste indéfiniment valable.
//
// CE QUI EST TECHNIQUE, ET CE QUI NE L'EST PAS. La date de bascule est une
// décision produit : elle coupe l'accès de personnes réelles, en pleine phase de
// test. Elle n'appartient pas au code. Le mécanisme qui la rend applicable, si.
// Ce module est ce mécanisme : la date se pose en variable d'environnement
// (`WN_PORTAIL_LIEN_PERMANENT_FIN`), sans redéploiement de code ni migration.
//
// FAIL-OPEN, À L'INVERSE DES DRAPEAUX DE GATE. `WN_G4_LIEN_MAGIQUE` et
// `WN_C5_ENABLED` sont fail-closed : absents, ils ferment. Celui-ci fait
// l'inverse — absent, les liens restent honorés. Ce n'est pas une inattention :
// un gate fermé par défaut cache une fonctionnalité, tandis qu'une bascule
// fermée par défaut **met les patients dehors** au premier déploiement où la
// variable manquerait. Entre un lien qui vit quelques jours de trop et un
// dossier qu'on ne peut plus ouvrir, le second coûte plus cher.
//
// Une valeur illisible est traitée comme une absence, pour la même raison : une
// faute de frappe dans une date ne doit pas verrouiller la production. L'état
// `invalide` est distingué de `aucune` afin que l'appelant puisse le signaler —
// une bascule ignorée en silence serait une panne discrète.

export type BasculeLienPermanent =
  | { etat: 'aucune' }
  | { etat: 'invalide'; valeur: string }
  | { etat: 'programmee'; fin: Date };

/**
 * Lit la date de fin des liens permanents depuis l'environnement.
 *
 * Format attendu : une date ISO 8601 (`2026-10-21` ou
 * `2026-10-21T00:00:00.000Z`). Absente ou illisible : aucune bascule.
 */
export function lireBascule(
  valeur = process.env.WN_PORTAIL_LIEN_PERMANENT_FIN,
): BasculeLienPermanent {
  const brute = (valeur ?? '').trim();
  if (brute === '') return { etat: 'aucune' };

  const fin = new Date(brute);
  if (!Number.isFinite(fin.getTime())) return { etat: 'invalide', valeur: brute };

  return { etat: 'programmee', fin };
}

/**
 * Un lien permanent est-il encore honoré à cet instant ?
 *
 * `true` tant qu'aucune bascule n'est posée, ou tant que sa date n'est pas
 * atteinte. La comparaison est stricte : à l'instant exact de la bascule, le
 * lien n'est plus honoré.
 */
export function lienPermanentHonore(
  maintenant: Date = new Date(),
  bascule: BasculeLienPermanent = lireBascule(),
): boolean {
  if (bascule.etat !== 'programmee') return true;
  return maintenant.getTime() < bascule.fin.getTime();
}
