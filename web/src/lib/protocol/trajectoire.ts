import { construireHistoriqueEquilibre, type ReponseBrute } from '@/lib/equilibre/depuisPrisma';
import { calculerDeltaMomentum, resoudreLectureJalon } from '@/lib/equilibre/momentum';
import type { JalonMomentum, TendanceMomentum } from '@/lib/equilibre/types';

// Fiche-trajectoire praticien (C2B LOT-09, registre A8) — objet DÉRIVÉ, lecture
// seule. « La Spirale comme index temporel des épisodes » : un index de repères
// datés (jalons confirmés) + un comparateur multi-épisodes SOUS garde de version.
// Ne réimplémente NI le score NI les jalons (propriété exclusive de
// lib/equilibre) : lit via momentum.ts + depuisPrisma, ancrés au T0 de chaque
// épisode (LOT-08). Jamais une courbe, jamais un pronostic (A6). Un jalon sans
// couverture est « non mesuré », jamais un 0 (A8-2). Deux lectures de
// versionScore différents ne sont jamais soustraites (A8-3).

const ORDRE_JALONS: readonly JalonMomentum[] = ['T0', 'J21', 'J42', 'J90'] as const;

// Épisode confirmé (une ligne assessment_episodes) — un jalon, pas un cycle.
export type TrajectoireEpisode = {
  id: string;
  milestone: JalonMomentum;
  confirmedAt: Date;
};

export type TrajectoireJalonLecture = {
  jalon: JalonMomentum;
  mesure: boolean; // false → « jalon non mesuré » (A8-2), jamais un 0
  valeur: number | null;
  date: string | null; // ISO de la lecture, null si non mesuré
};

// Un cycle = un épisode T0 confirmé (son ancre). Modèle mono-protocole actuel :
// en pratique un seul cycle par patient tant qu'un 2ᵉ T0 n'est pas confirmé.
export type TrajectoireCycle = {
  cycleId: string; // id de l'épisode T0 ancre
  dateT0: string; // ISO
  versionScore: string;
  jalons: TrajectoireJalonLecture[];
  momentum: { tendance: TendanceMomentum; delta: number } | null; // T0 → dernier jalon mesuré
};

export type TrajectoireComparaison = {
  disponible: boolean;
  // aucun_cycle / un_seul_cycle : pas encore de quoi comparer (A8-5-ii) ;
  // versions_differentes : « non comparable » (A8-3) ; comparable : ≥2 cycles v=.
  raison: 'aucun_cycle' | 'un_seul_cycle' | 'versions_differentes' | 'comparable';
};

export type Trajectoire = {
  // Index navigable : repères confirmés, datés, ordre chronologique. Jamais une
  // courbe — une liste de points cliquables (rendue côté UI).
  index: { milestone: JalonMomentum; date: string }[];
  cycles: TrajectoireCycle[];
  comparaison: TrajectoireComparaison;
};

export function construireTrajectoire(input: {
  episodes: TrajectoireEpisode[];
  reponses: ReponseBrute[];
  versionScore: string;
}): Trajectoire {
  const episodesTriees = [...input.episodes].sort(
    (a, b) => a.confirmedAt.getTime() - b.confirmedAt.getTime(),
  );

  const index = episodesTriees.map((e) => ({
    milestone: e.milestone,
    date: e.confirmedAt.toISOString(),
  }));

  const cycles: TrajectoireCycle[] = episodesTriees
    .filter((e) => e.milestone === 'T0')
    .map((t0) => {
      const dateT0 = t0.confirmedAt;
      // Ancrage T0 par épisode (LOT-08) : l'historique daté est reconstruit
      // relativement au T0 confirmé de ce cycle.
      const historique = construireHistoriqueEquilibre(input.reponses, dateT0);

      const jalons: TrajectoireJalonLecture[] = ORDRE_JALONS.map((jalon) => {
        const lecture = resoudreLectureJalon(dateT0, jalon, historique);
        return {
          jalon,
          mesure: lecture !== null,
          valeur: lecture?.valeur ?? null,
          date: lecture ? lecture.date.toISOString() : null,
        };
      });

      const lectureT0 = resoudreLectureJalon(dateT0, 'T0', historique);
      const dernierJalonMesure = [...ORDRE_JALONS]
        .reverse()
        .find((jalon) => jalon !== 'T0' && resoudreLectureJalon(dateT0, jalon, historique) !== null);
      const lectureRecente = dernierJalonMesure
        ? resoudreLectureJalon(dateT0, dernierJalonMesure, historique)
        : null;
      const momentum = calculerDeltaMomentum(lectureT0, lectureRecente);

      return {
        cycleId: t0.id,
        dateT0: dateT0.toISOString(),
        versionScore: input.versionScore,
        jalons,
        momentum: momentum ? { tendance: momentum.tendance, delta: momentum.delta } : null,
      };
    });

  return { index, cycles, comparaison: resoudreComparaison(cycles) };
}

// Un repère de l'index, rattaché au cycle qu'il documente. Rendu navigable côté
// UI (Vague 2) : l'index calculé depuis LOT-09 n'était affiché nulle part, si
// bien que les épisodes J21/J42/J90 confirmés restaient invisibles.
export type TrajectoireRepere = {
  milestone: JalonMomentum;
  date: string; // ISO
  cycleId: string | null; // null = repère antérieur à tout T0 confirmé
};

// Rattache chaque repère au cycle ouvert par le dernier T0 antérieur ou égal.
// Un repère n'est JAMAIS rattaché à un cycle postérieur : un jalon ne peut pas
// documenter un cycle qui n'avait pas commencé. Sans T0 antérieur, il reste
// explicitement non rattaché plutôt que rangé de force dans le premier cycle.
export function rattacherReperesAuxCycles(
  index: Trajectoire['index'],
  cycles: TrajectoireCycle[],
): TrajectoireRepere[] {
  const ancres = cycles
    .map((cycle) => ({ cycleId: cycle.cycleId, instant: new Date(cycle.dateT0).getTime() }))
    .filter((ancre) => Number.isFinite(ancre.instant))
    .sort((a, b) => a.instant - b.instant);

  return index.map((repere) => {
    const instant = new Date(repere.date).getTime();
    if (!Number.isFinite(instant)) {
      return { milestone: repere.milestone, date: repere.date, cycleId: null };
    }
    let cycleId: string | null = null;
    for (const ancre of ancres) {
      if (ancre.instant > instant) break;
      cycleId = ancre.cycleId;
    }
    return { milestone: repere.milestone, date: repere.date, cycleId };
  });
}

// Exporté pour test unitaire de la garde A8-3 (versions différentes → non
// comparable) : construireTrajectoire fixe aujourd'hui un versionScore uniforme,
// mais la garde doit rester correcte quand une future version en introduira.
export function resoudreComparaison(cycles: TrajectoireCycle[]): TrajectoireComparaison {
  if (cycles.length === 0) return { disponible: false, raison: 'aucun_cycle' };
  if (cycles.length === 1) return { disponible: false, raison: 'un_seul_cycle' };
  const versions = new Set(cycles.map((c) => c.versionScore));
  // A8-3 : jamais de comparaison hors versionScore identique.
  if (versions.size > 1) return { disponible: false, raison: 'versions_differentes' };
  return { disponible: true, raison: 'comparable' };
}
