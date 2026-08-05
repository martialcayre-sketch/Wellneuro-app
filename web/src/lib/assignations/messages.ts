/**
 * Messages de refus partagés entre la route qui décide et les écrans qui
 * proposent. Isolés dans un module sans dépendance (ni Prisma, ni serveur)
 * pour qu'un composant client puisse les importer : deux formulations du même
 * refus finiraient par diverger, et c'est l'écran qui mentirait.
 */

export const RAISON_DEJA_ASSIGNE = 'deja_assigne';

/**
 * Ne nomme AUCUN écran. L'annulation vit aujourd'hui dans la liste des
 * patients, pas sur la fiche qui porte le panneau d'orientation : nommer un
 * emplacement enverrait le praticien chercher un bouton là où il n'est pas.
 */
export const MESSAGE_DEJA_ASSIGNE =
  'Ce questionnaire est déjà assigné à ce patient et en attente de réponse. ' +
  'Pour le renvoyer, annulez d’abord l’assignation existante, puis réassignez-le.';
