// Fenêtre de recueil (domaine PUR). Transposition de `agenda-sommeil/fenetre.ts` :
// les 21 emplacements sont ancrés sur le PREMIER jour ENREGISTRÉ, RELU OU NON —
// pas sur la date d'assignation : un démarrage tardif n'ampute pas le recueil. Un
// emplacement non renseigné est un trou visible, jamais un 0. Aucune notion de
// score ici.

import { decalerDate, estDateValide } from './jour';
import { NB_JOURS_AGENDA_ALI, type JourRow } from './types';

export type EmplacementFenetreAli = {
  dateJour: string; // AAAA-MM-JJ
  index: number; // 1..NB_JOURS_AGENDA_ALI
  /** Une tête de chaîne RELUE porte cette date. */
  renseignee: boolean;
  /**
   * Une ligne de cette date est en QUARANTAINE : se lit « toute écriture sur
   * cette date sera refusée en 409 » (`agenda_illisible`).
   *
   * NON EXCLUSIF de `renseignee`. Le modèle est append-only : une même date peut
   * porter à la fois une tête de chaîne relue ET une ligne qu'on ne sait pas
   * relire — les deux drapeaux valent alors `true`. Un enum remplaçant
   * `renseignee` aurait forcé à choisir, et le choix aurait été faux dans un sens
   * comme dans l'autre.
   */
  illisible: boolean;
  estAujourdHui: boolean;
};

export type FenetreAgendaAli = {
  dateDebut: string | null; // dateJour du premier jour enregistré, relu ou non
  emplacements: EmplacementFenetreAli[];
  nbRenseignees: number;
  jourCourant: number | null; // 1..21, null hors fenêtre
  cloturablePatient: boolean;
};

/**
 * Option d'ANCRAGE, et rien d'autre.
 *
 * Le vocabulaire est celui de `LectureJours.datesIllisibles` (`persistence.ts`),
 * délibérément : ce n'est PAS une `datesAncre` générique. L'union se faisant à
 * l'intérieur de cette fonction, un appelant ne peut pas fournir une ancre
 * POSTÉRIEURE aux dates renseignées — il ne peut que verser des dates qui
 * entrent dans le même `min`.
 */
export type OptionsFenetreAli = { datesIllisibles?: readonly string[] };

function diffJours(depuis: string, jusqu: string): number {
  const [a1, m1, j1] = depuis.split('-').map(Number);
  const [a2, m2, j2] = jusqu.split('-').map(Number);
  const t1 = Date.UTC(a1, m1 - 1, j1);
  const t2 = Date.UTC(a2, m2 - 1, j2);
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000));
}

export function calculerFenetreAli(
  joursActifs: JourRow[],
  aujourdHui: string,
  options?: OptionsFenetreAli,
): FenetreAgendaAli {
  return calculerFenetreAliDepuisDates(
    joursActifs.map((j) => j.dateJour),
    aujourdHui,
    options,
  );
}

/**
 * Même arithmétique à partir des seules dates : c'est la forme que consomme une
 * vue de suivi, qui ne charge jamais le JSON des réponses. Une correction porte
 * la même date que la ligne qu'elle supplante, donc passer les dates brutes —
 * sans résoudre les chaînes — donne la même fenêtre : le Set déduplique.
 *
 * ── L'ANCRE SE CALCULE SUR L'UNION, LE COMPTE NON ───────────────────────────
 * `dateDebut` sort de `dates ∪ options.datesIllisibles`, jamais des seules
 * lignes RELUES. Sans cela, la journée la plus ancienne mise en quarantaine
 * (JSONB illisible) sortait de `jours`, l'ancre glissait vers la suivante, et la
 * borne des 21 jours glissait avec elle — un recueil pouvait dépasser sa propre
 * fenêtre. La quarantaine porte sur le JSONB, JAMAIS sur la colonne `date_jour`
 * (`schema.prisma:1003`) : la date est connue sans requête supplémentaire.
 *
 * En face, l'union ne touche PAS `renseignee` ni `nbRenseignees`. Une journée en
 * quarantaine n'est pas une journée relue : la compter ferait franchir les
 * seuils d'exploitabilité (14 jours, 4 week-ends, 7 paires) sur du vide.
 *
 * ── POURQUOI LE FILTRE `estDateValide` SUR L'UNION ENTIÈRE ──────────────────
 * Une date de `datesIllisibles` vient d'une ligne dont on ne sait RIEN relire.
 * `dateDebut` sortant d'un tri LEXICOGRAPHIQUE, un `1900-01-01` reculerait
 * l'ancre de 126 ans — et toute écriture serait alors refusée hors fenêtre. Le
 * filtre porte sur l'union entière, pas sur le seul apport de l'option.
 */
export function calculerFenetreAliDepuisDates(
  dates: string[],
  aujourdHui: string,
  options?: OptionsFenetreAli,
): FenetreAgendaAli {
  const renseignees = new Set(dates.filter(estDateValide));
  const illisibles = new Set((options?.datesIllisibles ?? []).filter(estDateValide));

  const union = [...renseignees, ...illisibles];
  if (union.length === 0) {
    return {
      dateDebut: null,
      emplacements: [],
      nbRenseignees: 0,
      jourCourant: null,
      cloturablePatient: false,
    };
  }

  const dateDebut = union.sort()[0];

  const emplacements: EmplacementFenetreAli[] = [];
  for (let index = 1; index <= NB_JOURS_AGENDA_ALI; index += 1) {
    const dateJour = decalerDate(dateDebut, index - 1);
    emplacements.push({
      dateJour,
      index,
      renseignee: renseignees.has(dateJour),
      illisible: illisibles.has(dateJour),
      estAujourdHui: dateJour === aujourdHui,
    });
  }

  const offset = diffJours(dateDebut, aujourdHui);
  const jourCourant = offset >= 0 && offset < NB_JOURS_AGENDA_ALI ? offset + 1 : null;
  const cloturablePatient = offset >= NB_JOURS_AGENDA_ALI - 1;

  return {
    dateDebut,
    emplacements,
    nbRenseignees: renseignees.size,
    jourCourant,
    cloturablePatient,
  };
}

/**
 * La date visée reste-t-elle EN DEÇÀ DE LA FIN de la fenêtre de recueil ?
 *
 * Prédicat PUR, posé ici pour que la route ne refasse aucune arithmétique de
 * date de son côté : deux calculs de la même borne, c'est deux bornes à tenir
 * d'accord.
 *
 * `true` quand `dateDebut === null` : l'agenda est vide, le premier POST pose
 * l'ancre. Refuser ici fermerait le recueil avant qu'il n'ait commencé.
 *
 * ── UNE BORNE SUPÉRIEURE, ET RIEN QU'ELLE (le nom le dit désormais) ─────────
 * La version précédente s'appelait `estDansFenetreAli` et bornait DES DEUX
 * CÔTÉS. Ce que la borne INFÉRIEURE coûtait, sur un agenda qui démarre : le
 * patient note aujourd'hui — l'écran ouvre directement là-dessus —, l'ancre vaut
 * J ; noter ensuite la veille était refusé par « votre recueil couvre déjà ses
 * 21 jours », alors qu'il en couvrait UNE. Un jour de recueil perdu au
 * démarrage, et une capacité que L4a acceptait retirée sans décision.
 *
 * D-018 motive la borne par « une 22ᵉ case n'existe jamais » : c'est la FIN de
 * fenêtre qui est en jeu, jamais son début. Une date ANTÉRIEURE à l'ancre est
 * donc acceptée, et elle RECULE l'ancre.
 *
 * ── POURQUOI RECULER L'ANCRE NE DÉBORDE PAS LES 21 JOURS ────────────────────
 * `estDateSaisissable` (barrière amont de la route) ne laisse écrire
 * qu'aujourd'hui ou la veille. L'ancre ne peut donc reculer que d'UN JOUR, et
 * seulement au démarrage — dès que la veille est ≥ l'ancre, la question ne se
 * pose plus. Le nombre de dates distinctes reste borné par 21 : au moment où
 * écrire J−1 reculerait l'ancre, un jour déjà écrit au-delà de la NOUVELLE borne
 * supérieure impliquerait qu'on est à J+20 ou plus depuis cette nouvelle ancre,
 * position où `estDateSaisissable` interdit déjà d'écrire J−1.
 *
 * ── CE RECUL N'EST PAS LE GLISSEMENT CORRIGÉ PLUS TÔT DANS LE LOT ───────────
 * Le glissement de quarantaine était SILENCIEUX, VERS L'AVANT et SUBI : une
 * ligne illisible sortait du calcul, l'ancre avançait toute seule, et la fenêtre
 * se déplaçait au rythme des corruptions — c'est pourquoi `datesIllisibles`
 * entre dans l'union ci-dessus. Ce recul-ci est EXPLICITE, VERS L'ARRIÈRE et
 * VOULU PAR LE PATIENT : il naît d'une écriture qu'il a demandée, sur une date
 * qu'il a choisie, et il ALLONGE le recueil vers son passé au lieu d'en rogner
 * la fin. Les deux mouvements sont opposés en sens comme en cause.
 */
export function estAvantFinFenetreAli(dateJour: string, dateDebut: string | null): boolean {
  if (dateDebut === null) return true;
  return dateJour <= decalerDate(dateDebut, NB_JOURS_AGENDA_ALI - 1);
}
