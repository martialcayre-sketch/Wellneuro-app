// LA MENTION « VALIDÉ PAR VOTRE PRATICIEN LE … » — lettre ba, fiche H35, [[D-369]].
//
// MODULE PUR, LISIBLE PAR LE NAVIGATEUR : l'accueil du protocole en tire sa
// mention. Aucune base, aucune variable d'environnement — la route du
// protocole sert l'instant de l'approbation de diffusion de la version servie
// (`valideLe`), ce module le dit en toutes lettres.
//
// TEXTE DU RESPONSABLE, VALIDÉ MOT POUR MOT LE 2026-10-24 ([[D-369]] §1) : un
// banc relit la décision et rougit au premier écart. Il ne se reformule pas
// ici ; une nouvelle version passe par une décision.

export const PREFIXE_MENTION_VALIDATION = 'Validé par votre praticien le';

// Le jour civil se lit en heure de Paris : une approbation donnée à 0 h 30 le
// 24 octobre est enregistrée le 23 en UTC, et le patient lirait la veille.
const DATE_EN_LETTRES = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * « 24 octobre 2026 », en heure de Paris. Partagé avec le pied de l'imprimable
 * ([[D-392]] §2) : les deux dates de la feuille se lisent au même format.
 */
export function dateEnLettres(instant: Date): string {
  // Usage typographique : « le 1er janvier », jamais « le 1 janvier ».
  return DATE_EN_LETTRES.formatToParts(instant)
    .map((part) => (part.type === 'day' && part.value === '1' ? '1er' : part.value))
    .join('');
}

/** « Validé par votre praticien le 24 octobre 2026 » ; `null` sur un instant illisible. */
export function mentionValidation(valideLe: string): string | null {
  const instant = new Date(valideLe);
  if (Number.isNaN(instant.getTime())) return null;
  return `${PREFIXE_MENTION_VALIDATION} ${dateEnLettres(instant)}`;
}
