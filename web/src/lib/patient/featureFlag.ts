/**
 * Drapeau de la surface patient « Ce qui compte pour moi aujourd'hui »
 * (campagne Alliance 6.0-A, LOT-03).
 *
 * Drapeau NEUF et ÉTEINT, et non un drapeau existant : la table est en
 * production depuis le LOT-01, mais l'ouverture d'une surface d'ÉCRITURE au
 * patient est un geste d'exploitation distinct du déploiement du code. Se
 * greffer sur un drapeau déjà allumé rendrait l'écran visible à tous les
 * dossiers du cabinet dès le déploiement, sans qu'aucune décision ne l'ait
 * ouvert — le défaut exact que `D-070` a constaté sur le rayon biologie.
 *
 * Fail-closed : seule la chaîne EXACTE « true » ouvre. Une variable absente,
 * vide, « 1 », « TRUE » ou « oui » laisse la surface fermée — une faute de
 * frappe dans un panneau d'environnement n'ouvre jamais un chemin vers un
 * patient par accident. Même doctrine que `WN_C4_ENABLED`, `WN_CB_ENABLED`,
 * `WN_AGENDA_ALI` et `WN_AGENDA_RELANCE`.
 *
 * Le drapeau garde LES DEUX surfaces : la route de dépôt (503) et l'écran du
 * portail (404). Fermer l'écran seul laisserait la route ouverte — « invisible
 * et écrivable » est la pire des combinaisons.
 *
 * Il ne garde PAS la lecture praticien : une liste vide côté dossier est un
 * silence honnête, alors qu'un 503 ferait croire à une panne.
 */
export function isCeQuiCompteEnabled(value = process.env.WN_CE_QUI_COMPTE): boolean {
  return value === 'true';
}
