/**
 * Messages de refus partagés entre la route qui décide et les écrans qui
 * proposent. Isolés dans un module sans dépendance (ni Prisma, ni serveur)
 * pour qu'un composant client puisse les importer : deux formulations du même
 * refus finiraient par diverger, et c'est l'écran qui mentirait.
 */

export const RAISON_DEJA_ASSIGNE = 'deja_assigne';

/**
 * Ne nomme ni écran, ni objet, ni nombre — les trois seraient faux quelque part.
 *
 * Pas d'écran : l'annulation vit dans la liste des patients, pas sur la fiche
 * qui porte le panneau d'orientation ; nommer un emplacement enverrait le
 * praticien chercher un bouton là où il n'est pas.
 *
 * Pas d'objet : les quatre routes qui rendent ce refus portent tantôt UN
 * questionnaire (assignation unitaire), tantôt un pack entier. « Ce
 * questionnaire » s'afficherait sous une carte « pack » de huit instruments.
 *
 * Pas de nombre : un pack déjà couvert exige d'annuler chacune de ses lignes,
 * pas « l'assignation existante » au singulier.
 */
export const MESSAGE_DEJA_ASSIGNE =
  'Déjà assigné à ce patient et en attente de réponse. ' +
  'Pour le renvoyer, annulez d’abord ce qui est déjà assigné, puis réassignez.';
