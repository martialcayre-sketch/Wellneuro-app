// Textes de « Pour votre médecin » au portail ([[D-307]] §3, F38).
//
// VALIDÉS TELS QUELS PAR LE RESPONSABLE LE 2026-10-19 — titre, phrase,
// message « rien à remettre » neutre, bouton et nom de fichier — comme
// l'engageait la déclaration RGPD de la migration (« le texte qui annoncera
// “Pour votre médecin” au portail se relira avec le code, avant que le drapeau
// s'allume »). Proposés par l'assistant ; toute modification se refait relire.

export const TITRE_DOCUMENT_MEDECIN = 'Pour votre médecin';

export const PHRASE_DOCUMENT_MEDECIN =
  'Votre praticien a préparé ce document pour votre médecin traitant. Téléchargez-le pour le lui '
  + 'remettre vous-même : Wellneuro ne l’envoie à personne.';

export const AUCUN_DOCUMENT_MEDECIN = 'Aucun document n’est à remettre à votre médecin pour l’instant.';

export const BOUTON_TELECHARGER = 'Télécharger le document';

/** Nom du fichier téléchargé — le même que celui que la route annonce. */
export const NOM_FICHIER_DOCUMENT_MEDECIN = 'pour-votre-medecin.html';

/** « Document du 18 octobre 2026 », à l'heure du cabinet. */
export function dateDuDocumentMedecin(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Document du ${date.toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}
