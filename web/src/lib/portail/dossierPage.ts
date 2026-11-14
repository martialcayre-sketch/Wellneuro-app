// LE DOSSIER DE LA PAGE ([[D-481]], complément DOC-12 ; [[D-488]], amendement
// DOC-12). Module PUR : lu par les composants clients du portail et par la
// garde serveur (`lib/trust/portailAuth.ts`), sans `node:crypto` ni Prisma.
//
// Le segment `[token]` de `/portail/<segment>` n'est pas un facteur
// d'authentification (LOT-04) : le dossier vient de la seule session. Mais une
// page reste ouverte pour le dossier sous lequel elle a été chargée. Si un autre
// patient se connecte ensuite dans le même navigateur — le cookie est commun aux
// onglets —, un envoi depuis cette page s'écrirait dans le dossier de ce
// dernier. Les cinq routes d'écriture visées par DOC-11 reçoivent donc le
// segment de la page qui envoie, et refusent en 409, sans rien écrire ni
// notifier, quand il n'est pas l'`idPatient` de la session (Q8 a). Un segment
// ABSENT est refusé de même : une page servie avant cette garde n'envoie rien,
// et T-51 dit de la recharger.

/** En-tête qui porte le segment de la page à la route d'écriture. */
export const EN_TETE_DOSSIER_PAGE = 'x-wn-dossier-page';

/** `reason` de la réponse 409 de la garde. */
export const RAISON_AUTRE_DOSSIER = 'autre_dossier';

/** T-51, accepté mot pour mot ([[D-488]], amendement DOC-12). */
export const MESSAGE_AUTRE_DOSSIER =
  'Rien n’a été envoyé : cette page a été ouverte sous un autre compte. Rechargez-la pour continuer.';

/**
 * Forme canonique d'un segment : décodé une fois s'il est encodé, puis encodé.
 * `useParams` et les `params` serveur ne promettent pas la même forme d'un
 * caractère réservé ; la comparaison se fait donc toujours sur celle-ci. Un
 * segment mal encodé reste tel quel, puis encodé : il ne vaudra aucun dossier.
 */
export function segmentCanonique(segment: string): string {
  let decode = segment;
  try {
    decode = decodeURIComponent(segment);
  } catch {
    // Séquence `%` invalide : on garde la forme reçue.
  }
  return encodeURIComponent(decode);
}

/** Le segment de la page désigne-t-il ce dossier ? Absent ou vide : non. */
export function segmentEstLeDossier(segment: string | null | undefined, idPatient: string): boolean {
  if (typeof segment !== 'string' || segment === '') return false;
  return segmentCanonique(segment) === encodeURIComponent(idPatient);
}

/** En-têtes à joindre à l'envoi d'une page ouverte sous `segment`. */
export function enTeteDossierPage(segment: string | null | undefined): Record<string, string> {
  return typeof segment === 'string' && segment !== '' ? { [EN_TETE_DOSSIER_PAGE]: segmentCanonique(segment) } : {};
}

/** La réponse est-elle le refus de la garde ? */
export function estRefusAutreDossier(status: number, data: { reason?: unknown } | null | undefined): boolean {
  return status === 409 && data?.reason === RAISON_AUTRE_DOSSIER;
}
