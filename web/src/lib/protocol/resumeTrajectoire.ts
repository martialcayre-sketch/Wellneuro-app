import { JOURS_JALON } from '@/lib/equilibre/constants';
import type { JalonMomentum } from '@/lib/equilibre/types';
import { deriverEpisodeBandeau } from '@/lib/trajectoire-partagee/contrat';
import type { Trajectoire } from './trajectoire';

// Résumé de trajectoire pour la porte d'entrée « Trajectoires » (SP-TRAJ
// LOT-04) — module PUR, dérivé : rien n'est inventé. Sans cycle confirmé, le
// résumé le dit (« T0 à confirmer ») ; un jalon non mesuré reste un jalon À
// VENIR à sa date théorique (dateT0 + JOURS_JALON), jamais une valeur.

const ORDRE_JALONS: readonly JalonMomentum[] = ['T0', 'J21', 'J42', 'J90'] as const;
const JOUR_MS = 24 * 60 * 60 * 1000;

export type ResumeTrajectoire = {
  // null : aucun T0 confirmé — aucun épisode n'est affirmé.
  episodeEnCours: { numero: number; dateT0: string; positionJours: number } | null;
  dernierJalonMesure: { jalon: JalonMomentum; valeur: number; date: string } | null;
  // Le premier jalon non mesuré du cycle courant, à sa date théorique ;
  // « T0 à confirmer » sans cycle ; null si les 4 jalons sont mesurés.
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

  const cycleCourant = cycles[cycles.length - 1];

  let dernierJalonMesure: ResumeTrajectoire['dernierJalonMesure'] = null;
  for (const jalon of ORDRE_JALONS) {
    const lecture = cycleCourant.jalons.find((candidat) => candidat.jalon === jalon);
    if (lecture && lecture.mesure && lecture.valeur !== null && lecture.date) {
      dernierJalonMesure = { jalon, valeur: lecture.valeur, date: lecture.date };
    }
  }

  const dateT0 = new Date(cycleCourant.dateT0);
  let prochaineEcheance: ResumeTrajectoire['prochaineEcheance'] = null;
  for (const jalon of ORDRE_JALONS) {
    const lecture = cycleCourant.jalons.find((candidat) => candidat.jalon === jalon);
    if (!lecture || !lecture.mesure) {
      prochaineEcheance = {
        libelle: jalon,
        date: new Date(dateT0.getTime() + JOURS_JALON[jalon] * JOUR_MS).toISOString(),
      };
      break;
    }
  }

  return {
    episodeEnCours: {
      numero: bandeau.numeroEpisode,
      dateT0: cycleCourant.dateT0,
      positionJours: bandeau.positionJours,
    },
    dernierJalonMesure,
    prochaineEcheance,
  };
}
