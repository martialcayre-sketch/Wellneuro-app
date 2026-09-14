/**
 * LES MARQUES DE PROVENANCE D'UN OBJECTIF NÉGOCIÉ, nommées une seule fois.
 *
 * Elles sont posées par `constaterProvenance` ([[D-167]] §6) et relues par
 * l'écran. Ce module n'existe que pour qu'elles ne soient pas écrites deux
 * fois : `provenanceVerifiee.ts` importe `@/lib/prisma`, donc un composant
 * client ne peut pas l'importer sans traîner le client de base dans le paquet
 * du navigateur. Le module que voici n'importe RIEN — il se lit des deux côtés.
 *
 * Le défaut que ce partage ferme est réel et a été constaté : la colonne
 * `priorite_source` était écrite en base et servie à personne, si bien que
 * l'écran affirmait, sur une autre marque, que la priorité venait du praticien.
 * Une valeur recopiée à la main des deux côtés aurait rouvert le même écart au
 * premier renommage.
 */

/** L'énoncé est celui d'un « ce qui compte » du patient, mot pour mot. */
export const ENONCE_REPRIS = 'ce_qui_compte';

/** La reformulation est celle d'une synthèse IA, mot pour mot. */
export const REFORMULATION_REPRISE = 'synthese_ia';

/**
 * La priorité est celle que l'appel a proposée, MOT POUR MOT. Absente (`null`)
 * dès que le praticien l'a retouchée — « la marque tombe à la réécriture ».
 */
export const PRIORITE_REPRISE = 'proposition_ia';
