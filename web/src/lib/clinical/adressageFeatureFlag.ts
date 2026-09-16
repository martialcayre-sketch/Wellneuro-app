// Drapeau de la lettre d'adressage ([[D-218]], LOT-04).
//
// POURQUOI UN DRAPEAU ICI, alors que le fil médecin n'en a aucun. Le fil
// consigne un geste déjà fait hors de l'outil ; cette route-ci PRODUIT un
// document qui nomme des signaux d'alerte déclarés par un patient et part vers
// un tiers. Si la revue RGPD du 2026-10-21 imposait une suspension, il
// n'existerait aujourd'hui aucun geste d'exploitation pour la produire — il
// faudrait un déploiement. Le drapeau est ce geste.
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
