// Suivi des agendas du sommeil du cabinet (domaine PUR, aucune dépendance
// Prisma — patron `lib/protocol/meteoPatientele.ts`).
//
// Cette vue ne sert que des FAITS DATÉS : nuits distinctes notées, jour dans
// la fenêtre, date de la dernière nuit reçue. Jamais un score de décrochage,
// jamais un ratio, jamais une prédiction — le « score automatique de
// décrochage » est un différé explicite du registre des frontières, et le
// vocabulaire trois états (régulière/fragile/interrompue) appartient à SP-MET.
// Praticien seul : ce module ne doit jamais être importé d'une surface
// portail/patient.

import { calculerFenetreDepuisDates } from './fenetre';
import { decalerDate } from './nuit';

export type EtatSuiviAgenda =
  | 'a_transmettre' // fenêtre de 21 jours écoulée, ≥ 1 nuit, non clôturé
  | 'jamais_commence' // aucune nuit : la fenêtre n'est pas ancrée
  | 'silencieux' // dans la fenêtre, dernière nuit avant-hier ou plus tôt
  | 'nuit_du_jour_manquante' // dans la fenêtre, dernière nuit = hier
  | 'a_jour'; // nuit du jour notée

export type AssignationSuivi = {
  idAssignation: string;
  idPatient: string;
  titre: string;
  dateAssignation: string; // ISO (affichage)
  // Jour de l'assignation en AAAA-MM-JJ, fuseau Europe/Paris (dateJourParis).
  // JAMAIS un slice d'ISO : une assignation à 00 h 30 à Paris porte la veille
  // en UTC, et l'écart en jours serait faux de un entre minuit et 2 h.
  dateAssignationJour: string;
};

export type NuitsSuivi = {
  dates: string[]; // dateNuit brutes (doublons de correction admis)
  derniereSaisie: string | null; // max(soumisLe), ISO — informatif
};

export type LigneSuiviAgenda = {
  idAssignation: string;
  idPatient: string;
  patient: string;
  titre: string;
  etat: EtatSuiviAgenda;
  nbRenseignees: number; // nuits DISTINCTES — jamais un compte de lignes
  jourCourant: number | null; // 1..21, null hors fenêtre
  dateDebut: string | null; // ancre = première nuit saisie
  derniereNuitNotee: string | null;
  joursDepuisDerniereNuit: number | null;
  dateAssignation: string;
  joursDepuisAssignation: number;
  relancable: boolean;
};

// Nombre de jours entre deux dates AAAA-MM-JJ (horloge murale, comme
// `diffJours` de la fenêtre — dupliqué ici car non exporté et trivial).
function ecartJours(depuis: string, jusqu: string): number {
  const [a1, m1, j1] = depuis.split('-').map(Number);
  const [a2, m2, j2] = jusqu.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, j2) - Date.UTC(a1, m1 - 1, j1)) / 86_400_000);
}

// L'ordre du panneau : ce qui appelle un geste praticien d'abord. Dérivé de
// faits datés, jamais d'un score (patron RANG_ETAT de meteoPatientele).
const RANG_ETAT: Record<EtatSuiviAgenda, number> = {
  a_transmettre: 0,
  silencieux: 1,
  jamais_commence: 2,
  nuit_du_jour_manquante: 3,
  a_jour: 4,
};

// SEUIL DE RELANCE — décision clinique du 2026-07-31. Ne pas la changer sans
// documenter, comme toute modification de seuil (CLAUDE.md).
//
// La règle tient en une phrase : ON NE RELANCE JAMAIS POUR UNE NUIT QUE LE
// PATIENT PEUT ENCORE NOTER. `estDateSaisissable` (./nuit) accepte la nuit
// d'aujourd'hui ET celle de la veille — un patient qui a noté hier a donc
// jusqu'à demain matin pour noter celle-ci, et n'a rien oublié.
//
// Avant cette règle, `nuit_du_jour_manquante` ouvrait la relance : le bouton
// apparaissait dès 00 h 05 sur un patient parfaitement à jour, la référence
// temporelle étant une date nue (`dateJourParis`, sans heure). Le suivi
// traitait en retard ce que la saisie traite comme normal. L'état reste
// affiché — c'est un fait utile au praticien — mais il n'ouvre plus rien.
//
// La relance s'ouvre donc à `silencieux` : la dernière nuit notée date
// d'avant-hier ou plus tôt, donc au moins une nuit est DÉFINITIVEMENT perdue,
// `estDateSaisissable` la refusant déjà. Soit deux nuits manquantes, pas une.
//
// Un agenda `jamais_commence` n'a aucune nuit à comparer : son seuil est un
// délai depuis l'assignation, le temps de laisser passer le jour de la
// consultation et le lendemain.
export const JOURS_AVANT_RELANCE_DEMARRAGE = 2;

// Éligibilité à la relance praticien. Exportée parce que DEUX surfaces en
// dépendent — le panneau du cabinet et la route d'envoi — et qu'un seuil
// dupliqué est un seuil qui finit par diverger. Un onglet resté ouvert
// enverrait sinon une relance que la règle interdit.
//
// Volontairement aveugle aux trous ANTÉRIEURS : un patient qui a noté hier est
// tenu pour actif quels que soient ses oublis passés (arbitrage du
// 2026-07-31 — seule la série en cours compte). Le mauvais remplisseur
// régulier reste donc invisible ici ; c'est un manque assumé, pas un oubli.
export function estRelancable(etat: EtatSuiviAgenda, joursDepuisAssignation: number): boolean {
  if (etat === 'silencieux') return true;
  if (etat === 'jamais_commence') return joursDepuisAssignation >= JOURS_AVANT_RELANCE_DEMARRAGE;
  // `a_transmettre` : le geste qui sauve la donnée est la clôture, pas une
  // relance. `nuit_du_jour_manquante` et `a_jour` : rien n'est encore perdu.
  return false;
}

// Dérivation de l'état à partir des seules dates de nuits. Extraite pour que la
// route d'envoi (`api/praticien/agenda-sommeil/relance`) applique EXACTEMENT le
// même arbitrage que le panneau, sans en reconstruire la chaîne de branches.
//
// PRÉCONDITION : `dates` doit être TRIÉE — la dernière nuit est lue en
// `dates[dates.length - 1]`. Un `findMany` Prisma sans `orderBy` rend un ordre
// arbitraire, et un appelant qui le passerait brut obtiendrait un état faux sans
// la moindre erreur. Les deux points d'entrée trient (`deriverLigne`,
// `evaluerRelanceDepuisNuits`) ; un troisième doit le faire aussi.
function deriverEtat(dates: string[], aujourdHui: string): EtatSuiviAgenda {
  const fenetre = calculerFenetreDepuisDates(dates, aujourdHui);
  const derniereNuitNotee = dates.length > 0 ? dates[dates.length - 1] : null;

  if (fenetre.dateDebut === null) {
    // La fenêtre s'ancre à la première nuit : rien n'est perdu, un démarrage
    // tardif donne 21 nuits pleines. Relançable seulement passé le délai de
    // grâce (`JOURS_AVANT_RELANCE_DEMARRAGE`) — pas le jour de la consultation.
    return 'jamais_commence';
  }
  if (fenetre.jourCourant === null) {
    // Fenêtre écoulée sans clôture : rien en base ne ferme cet agenda. Le
    // geste qui sauve la donnée est la clôture praticien, pas une relance —
    // demander de noter une nuit que `estDateSaisissable` refusera serait
    // mentir au patient.
    return 'a_transmettre';
  }
  if (derniereNuitNotee === aujourdHui) return 'a_jour';
  if (derniereNuitNotee === decalerDate(aujourdHui, -1)) return 'nuit_du_jour_manquante';
  return 'silencieux';
}

// Éligibilité calculée depuis les données BRUTES d'un agenda — le point d'entrée
// de la route d'envoi, qui dispose des dates de nuits et du jour d'assignation
// mais ne construit aucune `LigneSuiviAgenda`.
//
// Rend l'ÉTAT avec le verdict, et non un booléen nu : la route refuse deux
// populations très différentes (nuit du jour encore notable / agenda pas encore
// démarré) et doit pouvoir le dire au praticien dans les termes de ce qu'il a
// sous les yeux. Un message unique serait faux pour l'une des deux.
export function evaluerRelanceDepuisNuits(params: {
  dates: string[];
  aujourdHui: string;
  dateAssignationJour: string;
}): { relancable: boolean; etat: EtatSuiviAgenda } {
  const dates = [...params.dates].sort();
  const etat = deriverEtat(dates, params.aujourdHui);
  return {
    etat,
    relancable: estRelancable(etat, ecartJours(params.dateAssignationJour, params.aujourdHui)),
  };
}

function deriverLigne(
  ass: AssignationSuivi,
  nuits: NuitsSuivi | undefined,
  nomComplet: string,
  aujourdHui: string,
): LigneSuiviAgenda {
  const dates = [...(nuits?.dates ?? [])].sort();
  const fenetre = calculerFenetreDepuisDates(dates, aujourdHui);
  const derniereNuitNotee = dates.length > 0 ? dates[dates.length - 1] : null;
  const etat = deriverEtat(dates, aujourdHui);
  const joursDepuisAssignation = ecartJours(ass.dateAssignationJour, aujourdHui);

  return {
    idAssignation: ass.idAssignation,
    idPatient: ass.idPatient,
    patient: nomComplet,
    titre: ass.titre,
    etat,
    nbRenseignees: fenetre.nbRenseignees,
    jourCourant: fenetre.jourCourant,
    dateDebut: fenetre.dateDebut,
    derniereNuitNotee,
    joursDepuisDerniereNuit:
      derniereNuitNotee === null ? null : ecartJours(derniereNuitNotee, aujourdHui),
    dateAssignation: ass.dateAssignation,
    joursDepuisAssignation,
    relancable: estRelancable(etat, joursDepuisAssignation),
  };
}

// Résume les agendas OUVERTS du cabinet (l'appelant a déjà exclu `Annulée` et
// `verrouille`). Clé = assignation, jamais patient : un patient peut porter
// deux agendas ouverts (cas présent en production).
export function resumerAgendasEnCours(params: {
  assignations: AssignationSuivi[];
  nuitsParAssignation: Map<string, NuitsSuivi>;
  noms: Map<string, string>;
  aujourdHui: string;
}): LigneSuiviAgenda[] {
  const lignes = params.assignations.map((ass) =>
    deriverLigne(
      ass,
      params.nuitsParAssignation.get(ass.idAssignation),
      params.noms.get(ass.idPatient) ?? '',
      params.aujourdHui,
    ),
  );

  lignes.sort((a, b) => {
    if (RANG_ETAT[a.etat] !== RANG_ETAT[b.etat]) return RANG_ETAT[a.etat] - RANG_ETAT[b.etat];
    // Au sein d'un état, le plus ancien silence d'abord (fait daté, pas score).
    const anciennete =
      (b.joursDepuisDerniereNuit ?? b.joursDepuisAssignation) -
      (a.joursDepuisDerniereNuit ?? a.joursDepuisAssignation);
    if (anciennete !== 0) return anciennete;
    return a.patient.localeCompare(b.patient, 'fr');
  });

  return lignes;
}
