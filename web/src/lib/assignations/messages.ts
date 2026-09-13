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
 * PAS D'ÉCRAN. Le motif d'origine est devenu faux le 2026-09-13, et sa
 * conclusion survit pour une autre raison — c'est pourquoi il est réécrit plutôt
 * que recopié. Il disait : « l'annulation vit dans la liste des patients, pas sur
 * la fiche qui porte le panneau d'orientation ». Ce n'est plus vrai : la fiche
 * porte désormais la liste des envois en attente ET le bouton d'annulation, à
 * quelques centimètres du panneau d'orientation (`FichePatientPanel` →
 * `TrajectoirePanel` → `OrientationPanel`).
 *
 * Ce qui interdit toujours de nommer le lieu ICI, c'est le COMPTE DES LECTEURS,
 * vérifié plutôt que supposé : cette phrase est rendue par CINQ écrans —
 * `BibliothequePanel`, `PatientsPanel`, `PacksPanel`, `fil/FileEnvoiAside` et
 * `OrientationPanel`. Un seul est sur la fiche. Écrire « sur cette fiche » dans
 * la constante mentirait sur les quatre autres. Le lieu appartient donc à
 * l'écran qui sait où il est : `OrientationPanel` l'ajoute à côté de ce texte,
 * et lui seul.
 *
 * PAS D'OBJET : les quatre routes qui rendent ce refus portent tantôt UN
 * questionnaire (assignation unitaire), tantôt un pack entier. « Ce
 * questionnaire » s'afficherait sous une carte « pack » de huit instruments.
 *
 * PAS DE NOMBRE : un pack déjà couvert exige d'annuler chacune de ses lignes,
 * pas « l'assignation existante » au singulier. La DATE de l'envoi qui bloque
 * n'est pas dans cette phrase non plus, et pour la même raison : elle ne se
 * connaît qu'au cas par cas, et c'est `dateAssignationOuverte` qui la sert à
 * côté.
 */
export const MESSAGE_DEJA_ASSIGNE =
  'Déjà assigné à ce patient et en attente de réponse. ' +
  'Pour le renvoyer, annulez d’abord ce qui est déjà assigné, puis réassignez.';
