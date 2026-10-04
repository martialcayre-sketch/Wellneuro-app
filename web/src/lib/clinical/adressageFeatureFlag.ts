// Drapeau de la lettre d'adressage ([[D-218]], LOT-04).
//
// POURQUOI UN DRAPEAU ICI, alors que le fil médecin n'en a aucun. Le fil
// consigne un geste déjà fait hors de l'outil ; cette route-ci PRODUIT un
// document qui nomme des signaux d'alerte déclarés par un patient et part vers
// un tiers. Si une revue RGPD imposait une suspension, il n'existerait aucun
// geste d'exploitation pour la produire — il faudrait un déploiement. Le
// drapeau est ce geste. (La revue du 2026-10-21 a reconduit le régime sans
// terme et maintenu la voie d'exception de cette route : [[D-265]].)
//
// Fail-closed : seule la chaîne exacte « true » ouvre. Absente, vide, « 1 » ou
// « TRUE » laissent fermé — une faute de frappe dans un panneau d'environnement
// n'ouvre jamais un chemin de document sortant par accident (même doctrine que
// WN_CB_ENABLED et WN_AGENDA_RELANCE).
//
// Le paramètre par défaut est délibéré : c'est lui qui rend le drapeau testable
// sans toucher à `process.env`.
export function isAdressageCourrierEnabled(
  value = process.env.WN_ADRESSAGE_COURRIER,
): boolean {
  return value === 'true';
}

/** Message de refus servi par la route quand le geste n'est pas ouvert. */
export const MESSAGE_ADRESSAGE_FERME =
  'La lettre d’adressage n’est pas ouverte sur cet environnement. Son activation '
  + 'se fait par le drapeau WN_ADRESSAGE_COURRIER.';

// Drapeau de la LEVÉE par adressage ([[D-257]], LOT-04).
//
// DISTINCT DU PRÉCÉDENT, ET C'EST LE POINT. `WN_ADRESSAGE_COURRIER` ouvre un
// document sortant ; celui-ci laisse une couverture consignée LEVER une
// inhibition de sécurité dans la chaîne C1. Les deux gestes ne se ferment pas
// pour les mêmes raisons, ni au même moment.
//
// IL NE S'ALLUME PAS AVANT LE LOT-05 : sans l'action d'orientation en tête du
// protocole, un dossier levé recevrait un protocole qui ne la porte pas.
//
// Éteint ⇒ aucune lecture de la table, et la chaîne C1 rend des cartes
// identiques, empreinte comprise, à celles d'avant ce lot. Même doctrine
// fail-closed : seule la chaîne exacte « true » ouvre.
export function isLeveeAdressageEnabled(
  value = process.env.WN_LEVEE_ADRESSAGE,
): boolean {
  return value === 'true';
}
