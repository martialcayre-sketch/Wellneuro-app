import { JOURS_JALON, TOLERANCE_JOURS_JALON } from '@/lib/equilibre/constants';
import { JALONS_OBJECTIF, type JalonObjectif } from '@/lib/praticien/objectifNegocie';

// QUELLE ÉTAPE LE PATIENT PEUT-IL RENSEIGNER MAINTENANT ? (Alliance 6.0-B,
// LOT-05, `D-111`)
//
// MÊMES NOMBRES, MÊME ANCRE que tout le reste de la chaîne : les fenêtres
// viennent de `JOURS_JALON` et `TOLERANCE_JOURS_JALON`, et l'ancre est le
// `confirmedAt` du T0 confirmé LE PLUS RÉCENT — `cycle.dateT0`, celle que
// `resoudreJalonDu` et la trajectoire emploient déjà. C'est la Décision 6 de
// `D-111` : compter « J21 » depuis la naissance de la VERSION d'objectif aurait
// fabriqué un second calendrier, et deux calendriers pour un même mot est
// exactement ce que la Décision 1 reproche à `protocol_checkins`.
//
// CE MODULE LIT `equilibre/constants`, IL NE LE MODIFIE PAS (hors périmètre du
// lot, dit nommément à la fiche). Il ne redéfinit aucune borne : sans lui, la
// route devrait recopier « 21, 42, 90, ±8 », et une copie finit toujours par
// diverger de son original.
//
// POURQUOI PAS `resoudreJalonDu`, QUI RÉPOND À UNE QUESTION VOISINE. Parce que
// ce n'est pas la même question. `resoudreJalonDu` dit ce que LE PRATICIEN peut
// CONFIRMER, et il retire donc les jalons DÉJÀ CONFIRMÉS du cycle. Or la
// confirmation d'un jalon par le praticien ne dit rien de ce que le patient a
// raconté : réutiliser cette exclusion ferait disparaître la question d'étape
// d'un patient qui n'a jamais parlé, au seul motif que son praticien a confirmé
// l'épisode. Deux questions voisines, deux fonctions — et les mêmes nombres.
//
// ET IL NE PROPOSE JAMAIS `T0`. `resoudreJalonDu` rend `T0` pour un patient
// sans cycle confirmé ; ici, l'absence d'ancre rend `aucune`, avec son motif.
// `T0` est l'ancre des fenêtres, pas une étape — au moment où l'objectif se
// pose, il n'y a rien derrière soi.

const JOUR_MS = 24 * 60 * 60 * 1000;

export type FenetreJalonObjectif =
  | {
      statut: 'ouverte';
      jalon: JalonObjectif;
      /** Bornes de la fenêtre, ISO — affichées telles quelles, jamais recalculées ailleurs. */
      ouvertLe: string;
      fermeLe: string;
    }
  | {
      statut: 'aucune';
      /**
       * Pourquoi rien n'est proposé, EN FRANÇAIS ET SANS JUGEMENT. Un écran qui
       * n'affiche rien laisse croire à une panne ; et « vous n'avez pas
       * répondu » ferait d'un silence un manquement (`DC-24`, interdit nommé à
       * la fiche du lot).
       */
      motif: string;
      prochainJalon?: JalonObjectif;
      prochaineOuverture?: string;
    };

function fenetre(dateT0: Date, jalon: JalonObjectif): { debut: Date; fin: Date } {
  const centre = dateT0.getTime() + JOURS_JALON[jalon] * JOUR_MS;
  const tolerance = TOLERANCE_JOURS_JALON * JOUR_MS;
  return { debut: new Date(centre - tolerance), fin: new Date(centre + tolerance) };
}

/**
 * L'étape renseignable à l'instant donné, ou le motif qui l'en empêche.
 *
 * HORS FENÊTRE, RIEN N'EST PROPOSÉ — ni l'étape la plus proche, ni la suivante
 * « au cas où ». Recueillir un J90 le troisième jour daterait un point d'étape
 * d'un moment que le patient n'a pas vécu, et le praticien lirait ensuite ce
 * récit comme s'il avait eu lieu à sa date.
 *
 * `dateT0` À `null` = aucun cycle confirmé. C'est un état ORDINAIRE, pas une
 * erreur : le suivi n'a pas commencé, et il n'y a donc pas d'étape.
 */
export function jalonObjectifDu(
  dateT0: Date | null,
  maintenant: Date,
): FenetreJalonObjectif {
  if (!dateT0 || Number.isNaN(dateT0.getTime())) {
    return {
      statut: 'aucune',
      motif: 'Votre suivi n’a pas encore de point de départ : aucune étape n’est ouverte.',
    };
  }

  // Ordre chronologique garanti par la taxonomie elle-même. Les fenêtres ne se
  // chevauchent pas aux valeurs actuelles (21/42/90, ±8) ; si elles venaient à
  // se chevaucher, la PLUS PRÉCOCE gagne — jamais un choix implicite « la plus
  // proche du centre », qui ferait dépendre la réponse d'un arrondi.
  for (const jalon of JALONS_OBJECTIF) {
    const { debut, fin } = fenetre(dateT0, jalon);
    if (maintenant >= debut && maintenant <= fin) {
      return {
        statut: 'ouverte',
        jalon,
        ouvertLe: debut.toISOString(),
        fermeLe: fin.toISOString(),
      };
    }
  }

  const aVenir = JALONS_OBJECTIF.map((jalon) => ({ jalon, ...fenetre(dateT0, jalon) }))
    .filter((candidat) => candidat.debut > maintenant)
    .sort((gauche, droite) => gauche.debut.getTime() - droite.debut.getTime())[0];

  if (aVenir) {
    return {
      statut: 'aucune',
      motif: 'Aucune étape n’est ouverte aujourd’hui. La prochaine le sera à sa date.',
      prochainJalon: aVenir.jalon,
      prochaineOuverture: aVenir.debut.toISOString(),
    };
  }

  // Toutes passées. Le dire SANS reproche : le patient qui n'a rien écrit n'a
  // rien manqué, il n'a simplement rien écrit.
  return {
    statut: 'aucune',
    motif: 'Les étapes de ce suivi sont derrière vous.',
  };
}
