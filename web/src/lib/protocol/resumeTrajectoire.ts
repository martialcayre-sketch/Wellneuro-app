import { joursDepuisAncre } from './fenetreJalon';
import { jalonsDuCycle, type AncreCycle } from './cycles';
import type { JalonMomentum } from '@/lib/equilibre/types';
import { deriverEpisodeBandeau } from '@/lib/trajectoire-partagee/contrat';
import type { Trajectoire } from './trajectoire';

// Résumé de trajectoire pour la porte d'entrée « Trajectoires » (SP-TRAJ
// LOT-04) — module PUR, dérivé : rien n'est inventé. Sans cycle confirmé, le
// résumé le dit (« T0 à confirmer » — le premier cycle s'ancre bien en `T0`) ;
// un jalon non mesuré reste un jalon À VENIR à sa date théorique, jamais une
// valeur. Depuis [[D-255]], cette date part du jour 0 du suivi (la diffusion
// du protocole, pivot compris) pour un jalon de mesure, de l'ancre pour
// l'ancre ; sans diffusion, un jalon de mesure n'a pas de date.

const JOUR_MS = 24 * 60 * 60 * 1000;

export type ResumeTrajectoire = {
  // null : aucune ancre confirmée — aucun épisode n'est affirmé.
  // `ancre` est le NOM du cycle en cours (`T0`, `T1`, …) : les libellés qui en
  // découlent (« T1 + 14 j ») l'affichent tel quel, jamais un `T0` recopié.
  // `positionJours` se compte depuis `jourZero` ; tous deux null sans
  // protocole diffusé ([[D-255]]).
  episodeEnCours: {
    numero: number;
    ancre: AncreCycle;
    dateAncre: string;
    jourZero: string | null;
    positionJours: number | null;
  } | null;
  dernierJalonMesure: { jalon: JalonMomentum; valeur: number; date: string } | null;
  // Le premier jalon non mesuré du cycle courant, à sa date théorique (null
  // pour un jalon de mesure sans protocole diffusé) ; « T0 à confirmer » sans
  // cycle ; null si les 4 jalons sont mesurés.
  // Le libellé est le NOM du jalon : sur un cycle ancré en `T1`, c'est `T1`
  // qui s'affiche, jamais un `T0` recopié d'une liste globale.
  prochaineEcheance: { libelle: string; date: string | null } | null;
};

export function resumerTrajectoire(trajectoire: Trajectoire, aujourdhui: Date): ResumeTrajectoire {
  const cycles = trajectoire.cycles;
  const bandeau = deriverEpisodeBandeau(cycles, aujourdhui);

  if (!bandeau || cycles.length === 0) {
    return {
      episodeEnCours: null,
      dernierJalonMesure: null,
      prochaineEcheance: { libelle: 'T0 à confirmer', date: null },
    };
  }

  // Le cycle courant est celui du RANG le plus haut : `cycles` est ordonné par
  // rang d'ancre (`D-113` §6), plus par date de confirmation.
  const cycleCourant = cycles[cycles.length - 1];
  const ordreJalons = jalonsDuCycle(cycleCourant.ancre);

  let dernierJalonMesure: ResumeTrajectoire['dernierJalonMesure'] = null;
  for (const jalon of ordreJalons) {
    const lecture = cycleCourant.jalons.find((candidat) => candidat.jalon === jalon);
    if (lecture && lecture.mesure && lecture.valeur !== null && lecture.date) {
      dernierJalonMesure = { jalon, valeur: lecture.valeur, date: lecture.date };
    }
  }

  const dateAncre = new Date(cycleCourant.dateAncre);
  const jourZero = cycleCourant.jourZero === null ? null : new Date(cycleCourant.jourZero);
  let prochaineEcheance: ResumeTrajectoire['prochaineEcheance'] = null;
  for (const jalon of ordreJalons) {
    const lecture = cycleCourant.jalons.find((candidat) => candidat.jalon === jalon);
    if (!lecture || !lecture.mesure) {
      const base = jalon === cycleCourant.ancre ? dateAncre : jourZero;
      prochaineEcheance = {
        libelle: jalon,
        date: base === null ? null : new Date(base.getTime() + joursDepuisAncre(jalon) * JOUR_MS).toISOString(),
      };
      break;
    }
  }

  return {
    episodeEnCours: {
      numero: bandeau.numeroEpisode,
      ancre: cycleCourant.ancre,
      dateAncre: cycleCourant.dateAncre,
      jourZero: cycleCourant.jourZero,
      positionJours: bandeau.positionJours,
    },
    dernierJalonMesure,
    prochaineEcheance,
  };
}
