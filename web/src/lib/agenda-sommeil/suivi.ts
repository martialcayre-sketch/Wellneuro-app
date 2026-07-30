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

function deriverLigne(
  ass: AssignationSuivi,
  nuits: NuitsSuivi | undefined,
  nomComplet: string,
  aujourdHui: string,
): LigneSuiviAgenda {
  const dates = [...(nuits?.dates ?? [])].sort();
  const fenetre = calculerFenetreDepuisDates(dates, aujourdHui);
  const derniereNuitNotee = dates.length > 0 ? dates[dates.length - 1] : null;

  let etat: EtatSuiviAgenda;
  if (fenetre.dateDebut === null) {
    // La fenêtre s'ancre à la première nuit : rien n'est perdu, un démarrage
    // tardif donne 21 nuits pleines. C'est l'état le plus relançable.
    etat = 'jamais_commence';
  } else if (fenetre.jourCourant === null) {
    // Fenêtre écoulée sans clôture : rien en base ne ferme cet agenda. Le
    // geste qui sauve la donnée est la clôture praticien, pas une relance —
    // demander de noter une nuit que `estDateSaisissable` refusera serait
    // mentir au patient.
    etat = 'a_transmettre';
  } else if (derniereNuitNotee === aujourdHui) {
    etat = 'a_jour';
  } else if (derniereNuitNotee === decalerDate(aujourdHui, -1)) {
    etat = 'nuit_du_jour_manquante';
  } else {
    etat = 'silencieux';
  }

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
    joursDepuisAssignation: ecartJours(ass.dateAssignationJour, aujourdHui),
    relancable:
      etat === 'jamais_commence' || etat === 'nuit_du_jour_manquante' || etat === 'silencieux',
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
