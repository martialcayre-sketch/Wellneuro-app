// L'IMPRIMABLE DU PROTOCOLE — lettre bh, fiche H69, [[D-392]].
//
// MODULE PUR, LISIBLE PAR LE NAVIGATEUR : le lien du détail et le pied de la
// page imprimable en tirent leurs textes. Aucune base, aucune variable
// d'environnement — le drapeau et la garde d'âge se jugent côté serveur
// (`protocoleImprimable.ts`), et la route du protocole sert `imprimable` ou ne
// le sert pas.
//
// TEXTES ACCEPTÉS LE 2026-10-28 ([[D-392]] §4), recopiés ici : un banc relit la
// décision et rougit au premier écart. Le bouton d'impression, le titre et la
// mention de validation sont des textes déjà servis, réutilisés tels quels.

import { dateEnLettres } from './texteMentionValidation';

export const LIEN_PROTOCOLE_IMPRIMABLE = 'Imprimer mon protocole';

export const PREFIXE_MENTION_IMPRESSION = 'Imprimé le';

/** « Imprimé le 28 octobre 2026. », en heure de Paris ; `null` sur un instant illisible. */
export function mentionImpression(instant: Date): string | null {
  if (Number.isNaN(instant.getTime())) return null;
  return `${PREFIXE_MENTION_IMPRESSION} ${dateEnLettres(instant)}.`;
}
