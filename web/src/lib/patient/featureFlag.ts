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

/**
 * Drapeau de la surface patient « Ce que j'ai compris de vous » (campagne
 * Alliance 6.0-A, LOT-04).
 *
 * Drapeau NEUF et ÉTEINT, distinct de `WN_CE_QUI_COMPTE`, pour la même raison
 * qu'au LOT-03 et une de plus : ce qui s'ouvre ici n'est pas seulement une
 * surface d'écriture, c'est un TEXTE DU PRATICIEN QUI ATTEINT LE PATIENT. Le
 * réutiliser ferait qu'ouvrir « ce qui compte » publierait aussi, du même
 * geste et sans que personne l'ait décidé, les synthèses de compréhension déjà
 * rédigées.
 *
 * Fail-closed : seule la chaîne EXACTE « true » ouvre. Même doctrine que
 * `WN_CE_QUI_COMPTE`, `WN_C4_ENABLED`, `WN_CB_ENABLED` et `WN_AGENDA_ALI`.
 *
 * IL GARDE TROIS GESTES, ET LE TROISIÈME EST LE MOINS ÉVIDENT :
 *   1. la route du portail (503) et 2. l'écran du portail (404) — « invisible
 *      et écrivable » reste la pire des combinaisons ;
 *   3. LA PUBLICATION côté praticien (503), et pas seulement l'affichage.
 *
 * Le troisième mérite son motif. Publier, c'est s'adresser au patient. Laisser
 * publier dans une surface fermée produirait un stock de synthèses que le
 * praticien croit remises, que personne ne lit, et qui atteindraient toutes le
 * patient d'un seul coup le jour de l'allumage — sans qu'aucune décision
 * n'ait ouvert CELLES-LÀ. C'est le défaut que `D-070` a constaté sur le rayon
 * biologie, vu depuis l'autre bout de la chaîne.
 *
 * Il ne garde PAS le brouillon : rédiger et réviser des versions non publiées
 * reste possible drapeau éteint. Un brouillon ne s'adresse à personne, et
 * préparer avant d'ouvrir est l'usage attendu d'une ouverture progressive.
 * Il ne garde pas non plus la LECTURE praticien : une liste vide côté dossier
 * est un silence honnête, un 503 ferait croire à une panne.
 */
export function isComprehensionEnabled(value = process.env.WN_COMPREHENSION): boolean {
  return value === 'true';
}
