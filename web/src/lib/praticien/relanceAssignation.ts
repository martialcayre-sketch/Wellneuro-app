import { JOURS_ENTRE_RELANCES } from '@/lib/agenda-sommeil/relanceEmail';

/**
 * RELANCER UN QUESTIONNAIRE QUI N'EST PAS REVENU — et dire pourquoi on ne le
 * relance pas.
 *
 * LE DÉFAUT QUE CE MODULE FERME. Une assignation dont l'échéance est dépassée
 * produit une CARTE POUR LE PRATICIEN (« Échéance dépassée depuis N jours »,
 * `lib/fil/cartes.ts`) et rien pour le patient. Côté patient, l'invitation part
 * une seule fois, à l'assignation : passée cette minute, rien ne lui redit
 * qu'un questionnaire l'attend. Le second rideau garde pourtant le `T0`
 * ([[D-158]]) — un questionnaire qui ne revient pas bloque toute la trajectoire,
 * en silence, des deux côtés.
 *
 * CE MODULE NE FAIT PAS : ni authentification, ni contrôle d'appartenance, ni
 * lecture base, ni envoi. Mêmes frontières que `relanceObjectif`, dont il
 * reprend la forme — l'appelant les porte, et il les porte AVANT.
 *
 * PAS DE `Date.now()` ICI. L'instant est INJECTÉ : une décision de cadence qui
 * lit l'horloge ne se rejoue pas deux fois pareil, et un banc ne pourrait pas
 * l'éprouver aux bornes.
 */

/** La cadence est EMPRUNTÉE, pas réinventée : la même qu'entre deux relances
 *  d'agenda et entre deux relances d'objectif. Chiffre purement TECHNIQUE
 *  (`DC-19`, `DC-20`) : il borne une fréquence d'envoi, il ne décrit aucun
 *  phénomène clinique. */
export const JOURS_ENTRE_RELANCES_ASSIGNATION = JOURS_ENTRE_RELANCES;

/** Les deux statuts terminaux que la base tient déjà (`assignations.statut`). */
const STATUT_RENDUE = 'Complété';
const STATUT_ANNULEE = 'Annulée';

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

export type RefusRelanceAssignation =
  | 'assignation_rendue'
  | 'assignation_annulee'
  | 'sans_echeance'
  | 'echeance_non_depassee'
  | 'cadence';

export type DecisionRelanceAssignation =
  | { ok: true }
  | { ok: false; raison: RefusRelanceAssignation; possibleLe: Date | null };

export type EntreeRelanceAssignation = {
  /** Le statut tel que la base le porte, jamais un booléen dérivé. */
  statut: string;
  /** `AAAA-MM-JJ` — la forme exacte de `assignations.date_limite`, ou `null`. */
  dateLimite: string | null;
  /** Les relances déjà tracées pour CETTE assignation, dans un ordre non
   *  supposé : la décision cherche la plus récente elle-même. */
  envoisPrecedents: { enregistreLe: Date }[];
  maintenant: Date;
};

/**
 * `AAAA-MM-JJ` → minuit LOCAL de ce jour, ou `null` si la forme n'est pas celle
 * que la base écrit.
 *
 * MÊME LECTURE QUE LE FIL (`parseDateLimite`, `lib/fil/cartes.ts`) : deux
 * lectures différentes de la même colonne feraient qu'une carte annonce un
 * retard que la relance refuse de constater, ou l'inverse.
 */
function minuitDe(dateLimite: string | null): Date | null {
  if (!dateLimite || !/^\d{4}-\d{2}-\d{2}$/.test(dateLimite)) return null;
  const jour = new Date(`${dateLimite}T00:00:00`);
  return Number.isNaN(jour.getTime()) ? null : jour;
}

/**
 * RELANCER, OU DIRE POURQUOI ON NE RELANCE PAS.
 *
 * `sans_echeance` N'EST PAS UN REFUS TECHNIQUE, c'est le point du lot. Une
 * relance sans borne ne dit rien de plus que l'invitation initiale — « il
 * reste un questionnaire » que le patient sait déjà. C'est l'échéance qui rend
 * le rappel actionnable, et c'est pour cela que le second rideau la porte
 * désormais.
 *
 * `echeance_non_depassee` : relancer avant le terme qu'on a soi-même donné
 * revient à le retirer. Le patient à qui on a dit « avant le 20 » et qu'on
 * relance le 12 apprend que la date ne voulait rien dire.
 */
export function deciderRelanceAssignation(
  entree: EntreeRelanceAssignation,
): DecisionRelanceAssignation {
  if (entree.statut === STATUT_RENDUE) {
    return { ok: false, raison: 'assignation_rendue', possibleLe: null };
  }
  if (entree.statut === STATUT_ANNULEE) {
    return { ok: false, raison: 'assignation_annulee', possibleLe: null };
  }

  const limite = minuitDe(entree.dateLimite);
  if (limite === null) return { ok: false, raison: 'sans_echeance', possibleLe: null };

  // DÉPASSÉE = LE JOUR D'APRÈS, jamais « l'instant d'après minuit le jour
  // même » : la date annonce une journée entière au patient, et le relancer à
  // 00 h 01 du jour dit lui reprocherait un retard qu'il n'a pas encore.
  const depasseeLe = new Date(limite.getTime() + MS_PAR_JOUR);
  if (entree.maintenant.getTime() < depasseeLe.getTime()) {
    return { ok: false, raison: 'echeance_non_depassee', possibleLe: depasseeLe };
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
    const possibleLe = new Date(dernier.getTime() + JOURS_ENTRE_RELANCES_ASSIGNATION * MS_PAR_JOUR);
    if (entree.maintenant.getTime() < possibleLe.getTime()) {
      return { ok: false, raison: 'cadence', possibleLe };
    }
  }

  return { ok: true };
}
