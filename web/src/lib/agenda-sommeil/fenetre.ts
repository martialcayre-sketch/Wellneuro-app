// Fenêtre de recueil (domaine PUR). Les 21 emplacements sont ancrés sur la
// PREMIÈRE nuit saisie, pas sur la date d'assignation : un démarrage tardif
// n'ampute pas le recueil. Un emplacement non renseigné est un trou visible,
// jamais un 0. Aucune notion de score ici — cette structure ne sert qu'à
// afficher la frise patient et à savoir si la clôture est ouverte.

import { decalerDate } from './nuit';
import { NB_JOURS_AGENDA, type NuitRow } from './types';

export type EmplacementFenetre = {
  dateNuit: string; // AAAA-MM-JJ
  index: number; // 1..NB_JOURS_AGENDA
  renseignee: boolean;
  estAujourdHui: boolean;
};

export type FenetreAgenda = {
  dateDebut: string | null; // dateNuit de la première nuit saisie
  emplacements: EmplacementFenetre[];
  nbRenseignees: number;
  jourCourant: number | null; // 1..21 (position d'aujourd'hui dans la fenêtre), null hors fenêtre
  cloturablePatient: boolean; // le patient peut transmettre (fenêtre atteinte/dépassée)
};

// Nombre de jours entre deux dates AAAA-MM-JJ (calcul en UTC, horloge murale).
function diffJours(depuis: string, jusqu: string): number {
  const [a1, m1, j1] = depuis.split('-').map(Number);
  const [a2, m2, j2] = jusqu.split('-').map(Number);
  const t1 = Date.UTC(a1, m1 - 1, j1);
  const t2 = Date.UTC(a2, m2 - 1, j2);
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000));
}

// Construit la fenêtre à partir des nuits ACTIVES (têtes de chaîne, cf.
// `resolveNuitsActives`) et de la date du jour locale du patient. Sans nuit
// saisie, la fenêtre est vide (aucun ancrage) : la première saisie l'amorcera.
export function calculerFenetre(nuitsActives: NuitRow[], aujourdHui: string): FenetreAgenda {
  if (nuitsActives.length === 0) {
    return {
      dateDebut: null,
      emplacements: [],
      nbRenseignees: 0,
      jourCourant: null,
      cloturablePatient: false,
    };
  }

  const dates = nuitsActives.map((n) => n.dateNuit).sort();
  const dateDebut = dates[0];
  const renseignees = new Set(dates);

  const emplacements: EmplacementFenetre[] = [];
  for (let index = 1; index <= NB_JOURS_AGENDA; index += 1) {
    const dateNuit = decalerDate(dateDebut, index - 1);
    emplacements.push({
      dateNuit,
      index,
      renseignee: renseignees.has(dateNuit),
      estAujourdHui: dateNuit === aujourdHui,
    });
  }

  // Position d'aujourd'hui dans la fenêtre (1..21), null s'il est avant le début
  // ou au-delà des 21 jours.
  const offset = diffJours(dateDebut, aujourdHui);
  const jourCourant = offset >= 0 && offset < NB_JOURS_AGENDA ? offset + 1 : null;

  // Clôturable dès que la fenêtre de 21 jours est atteinte ou dépassée : soit
  // aujourd'hui est le 21e jour ou plus tard (offset ≥ 20), soit la dernière
  // nuit saisie atteint l'index 21.
  const cloturablePatient = offset >= NB_JOURS_AGENDA - 1;

  return {
    dateDebut,
    emplacements,
    nbRenseignees: renseignees.size,
    jourCourant,
    cloturablePatient,
  };
}
