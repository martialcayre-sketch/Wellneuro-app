import { joursDepuisAncre } from './fenetreJalon';
import { jalonsDuCycle, type AncreCycle } from './cycles';
import type { JalonMomentum } from '@/lib/equilibre/types';
import { deriverEpisodeBandeau } from '@/lib/trajectoire-partagee/contrat';
import type { Trajectoire } from './trajectoire';

// Résumé de trajectoire pour la porte d'entrée « Trajectoires » (SP-TRAJ
// LOT-04) — module PUR, dérivé : rien n'est inventé. Sans cycle confirmé, le
// résumé le dit (« T0 à confirmer » — le premier cycle s'ancre bien en `T0`) ;
// un jalon non mesuré reste un jalon À VENIR à sa date théorique
// (dateAncre + JOURS_JALON), jamais une valeur.

const JOUR_MS = 24 * 60 * 60 * 1000;

export type ResumeTrajectoire = {
  // null : aucune ancre confirmée — aucun épisode n'est affirmé.
  // `ancre` est le NOM du cycle en cours (`T0`, `T1`, …) : les libellés qui en
  // découlent (« T1 + 14 j ») l'affichent tel quel, jamais un `T0` recopié.
  episodeEnCours: { numero: number; ancre: AncreCycle; dateAncre: string; positionJours: number } | null;
  dernierJalonMesure: { jalon: JalonMomentum; valeur: number; date: string } | null;
  // Le premier jalon non mesuré du cycle courant, à sa date théorique ;
  // « T0 à confirmer » sans cycle ; null si les 4 jalons sont mesurés.
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
  let prochaineEcheance: ResumeTrajectoire['prochaineEcheance'] = null;
  for (const jalon of ordreJalons) {
    const lecture = cycleCourant.jalons.find((candidat) => candidat.jalon === jalon);
    if (!lecture || !lecture.mesure) {
      prochaineEcheance = {
        libelle: jalon,
        date: new Date(dateAncre.getTime() + joursDepuisAncre(jalon) * JOUR_MS).toISOString(),
      };
      break;
    }
  }

  return {
    episodeEnCours: {
      numero: bandeau.numeroEpisode,
      ancre: cycleCourant.ancre,
      dateAncre: cycleCourant.dateAncre,
      positionJours: bandeau.positionJours,
    },
    dernierJalonMesure,
    prochaineEcheance,
  };
}
