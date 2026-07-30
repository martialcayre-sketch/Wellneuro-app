// Fenêtre de recueil (domaine PUR). Transposition de `agenda-sommeil/fenetre.ts` :
// les 21 emplacements sont ancrés sur le PREMIER jour saisi, pas sur la date
// d'assignation — un démarrage tardif n'ampute pas le recueil. Un emplacement
// non renseigné est un trou visible, jamais un 0. Aucune notion de score ici.

import { decalerDate } from './jour';
import { NB_JOURS_AGENDA_ALI, type JourRow } from './types';

export type EmplacementFenetreAli = {
  dateJour: string; // AAAA-MM-JJ
  index: number; // 1..NB_JOURS_AGENDA_ALI
  renseignee: boolean;
  estAujourdHui: boolean;
};

export type FenetreAgendaAli = {
  dateDebut: string | null; // dateJour du premier jour saisi
  emplacements: EmplacementFenetreAli[];
  nbRenseignees: number;
  jourCourant: number | null; // 1..21, null hors fenêtre
  cloturablePatient: boolean;
};

function diffJours(depuis: string, jusqu: string): number {
  const [a1, m1, j1] = depuis.split('-').map(Number);
  const [a2, m2, j2] = jusqu.split('-').map(Number);
  const t1 = Date.UTC(a1, m1 - 1, j1);
  const t2 = Date.UTC(a2, m2 - 1, j2);
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000));
}

export function calculerFenetreAli(joursActifs: JourRow[], aujourdHui: string): FenetreAgendaAli {
  return calculerFenetreAliDepuisDates(
    joursActifs.map((j) => j.dateJour),
    aujourdHui,
  );
}

/**
 * Même arithmétique à partir des seules dates : c'est la forme que consomme une
 * vue de suivi, qui ne charge jamais le JSON des réponses. Une correction porte
 * la même date que la ligne qu'elle supplante, donc passer les dates brutes —
 * sans résoudre les chaînes — donne la même fenêtre : le Set déduplique.
 */
export function calculerFenetreAliDepuisDates(
  dates: string[],
  aujourdHui: string,
): FenetreAgendaAli {
  if (dates.length === 0) {
    return {
      dateDebut: null,
      emplacements: [],
      nbRenseignees: 0,
      jourCourant: null,
      cloturablePatient: false,
    };
  }

  const triees = [...dates].sort();
  const dateDebut = triees[0];
  const renseignees = new Set(triees);

  const emplacements: EmplacementFenetreAli[] = [];
  for (let index = 1; index <= NB_JOURS_AGENDA_ALI; index += 1) {
    const dateJour = decalerDate(dateDebut, index - 1);
    emplacements.push({
      dateJour,
      index,
      renseignee: renseignees.has(dateJour),
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
