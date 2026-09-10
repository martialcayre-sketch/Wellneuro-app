import { JOURS_ENTRE_RELANCES } from '@/lib/agenda-sommeil/relanceEmail';

/**
 * RELANCER UN OBJECTIF DÉJÀ ÉCRIT (`D-161`, file d'attente du 2026-09-10).
 *
 * LE DÉFAUT QUE CE MODULE FERME. `notifierObjectifPropose` n'est appelée que sur
 * les deux chemins de `create` : l'envoi se déclenche à l'ÉCRITURE, jamais sur
 * l'état. Un objectif écrit avant la mise en service de l'expéditeur — ou dont
 * le courrier s'est perdu — ne produira donc JAMAIS d'e-mail, et son patient ne
 * saura jamais qu'un texte l'attend. C'est arrivé : un objectif de production est
 * resté muet par construction.
 *
 * CE MODULE NE FAIT PAS : ni authentification, ni contrôle d'appartenance, ni
 * lecture base, ni envoi. Mêmes frontières que `objectifNegocie` — l'appelant
 * les porte, et il les porte AVANT.
 *
 * PAS DE `Date.now()` ICI. L'instant est INJECTÉ : une décision de cadence qui
 * lit l'horloge ne se rejoue pas deux fois pareil, et un banc ne pourrait pas
 * l'éprouver aux bornes.
 */

/** La cadence est EMPRUNTÉE, pas réinventée : trois jours, comme les relances
 *  d'agenda. Le dépôt a déjà connu une interdiction qui ne vivait que dans
 *  l'écran ; celle-ci est opposable côté serveur. */
export const JOURS_ENTRE_RELANCES_OBJECTIF = JOURS_ENTRE_RELANCES;

export type RefusRelance =
  | 'aucun_objectif'
  | 'objectif_discordant'
  | 'objectif_clos'
  | 'deja_repondu'
  | 'cadence';

export type DecisionRelance =
  | { ok: true }
  | { ok: false; raison: RefusRelance; possibleLe: Date | null };

export type EntreeRelance = {
  /** Le nombre de têtes ACTIVES du dossier. */
  tetesActives: number;
  /** L'état de ratification de l'unique tête active, s'il y en a une. */
  etatTeteActive: 'en_attente' | 'ratifie' | 'conteste' | 'dit_autrement' | null;
  /** Les envois de type « objectif proposé » déjà tracés, du plus récent au
   *  plus ancien ou non — l'ordre n'est pas supposé. */
  envoisPrecedents: { enregistreLe: Date }[];
  maintenant: Date;
};

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * RELANCER, OU DIRE POURQUOI ON NE RELANCE PAS.
 *
 * `deja_repondu` N'EST PAS UN REFUS TECHNIQUE, c'est une retenue : rappeler à un
 * patient de répondre à ce qu'il a DÉJÀ ratifié ou contesté lui dirait qu'on ne
 * l'a pas lu. Un « dit autrement » compte comme une réponse — le patient a écrit
 * sa propre version, il n'attend rien.
 *
 * `objectif_discordant` : deux têtes actives ferment les trois gestes du patient
 * au portail. L'inviter à répondre le mènerait à un 409 ; le départage vient
 * d'abord.
 */
export function deciderRelance(entree: EntreeRelance): DecisionRelance {
  if (entree.tetesActives === 0) return { ok: false, raison: 'aucun_objectif', possibleLe: null };
  if (entree.tetesActives > 1) {
    return { ok: false, raison: 'objectif_discordant', possibleLe: null };
  }
  if (entree.etatTeteActive === null) return { ok: false, raison: 'objectif_clos', possibleLe: null };
  if (entree.etatTeteActive !== 'en_attente') {
    return { ok: false, raison: 'deja_repondu', possibleLe: null };
  }

  // LE PLUS RÉCENT, pas le premier trouvé : l'appelant n'est pas tenu de trier,
  // et se fier à son ordre ferait dépendre une garde de cadence d'un `orderBy`
  // qu'une lecture voisine pourrait changer sans le savoir.
  const dernier = entree.envoisPrecedents.reduce<Date | null>(
    (plusRecent, envoi) =>
      plusRecent === null || envoi.enregistreLe.getTime() > plusRecent.getTime()
        ? envoi.enregistreLe
        : plusRecent,
    null,
  );
  if (dernier !== null) {
    const possibleLe = new Date(dernier.getTime() + JOURS_ENTRE_RELANCES_OBJECTIF * MS_PAR_JOUR);
    if (entree.maintenant.getTime() < possibleLe.getTime()) {
      return { ok: false, raison: 'cadence', possibleLe };
    }
  }

  return { ok: true };
}
