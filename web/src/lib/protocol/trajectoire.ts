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
// `cycleId` et `versionScore` sont STOCKÉS (gate G2) et donc nullables : une
// ligne héritée non rattachable reste null, jamais devinée.
export type TrajectoireEpisode = {
  id: string;
  milestone: JalonMomentum;
  confirmedAt: Date;
  cycleId: string | null;
  versionScore: string | null;
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
  cycleId: string; // id de cycle stocké, à défaut id de l'épisode T0 ancre
  dateT0: string; // ISO
  // null = version de score inconnue (ligne antérieure au gate G2). Jamais
  // assimilée à la version courante : ce serait rendre A8-3 indéclenchable.
  versionScore: string | null;
  jalons: TrajectoireJalonLecture[];
  momentum: { tendance: TendanceMomentum; delta: number } | null; // T0 → dernier jalon mesuré
};

export type TrajectoireComparaison = {
  disponible: boolean;
  // aucun_cycle / un_seul_cycle : pas encore de quoi comparer (A8-5-ii) ;
  // versions_differentes et version_inconnue : « non comparable » (A8-3) ;
  // comparable : ≥2 cycles de même version connue.
  raison:
    | 'aucun_cycle'
    | 'un_seul_cycle'
    | 'versions_differentes'
    | 'version_inconnue'
    | 'comparable';
};

export type Trajectoire = {
  // Index navigable : repères confirmés, datés, ordre chronologique. Jamais une
  // courbe — une liste de points cliquables (rendue côté UI). `cycleId` est
  // celui STOCKÉ sur l'épisode (gate G2) ; null → repli par date à la lecture.
  index: { milestone: JalonMomentum; date: string; cycleId: string | null }[];
  cycles: TrajectoireCycle[];
  comparaison: TrajectoireComparaison;
};

export function construireTrajectoire(input: {
  episodes: TrajectoireEpisode[];
  reponses: ReponseBrute[];
}): Trajectoire {
  const episodesTriees = [...input.episodes].sort(
    (a, b) => a.confirmedAt.getTime() - b.confirmedAt.getTime(),
  );

  const index = episodesTriees.map((e) => ({
    milestone: e.milestone,
    date: e.confirmedAt.toISOString(),
    cycleId: e.cycleId,
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
        // Le cycle d'un T0 est le sien : id stocké quand il existe, sinon son
        // propre id (repli pour les lignes antérieures au gate G2).
        cycleId: t0.cycleId ?? t0.id,
        dateT0: dateT0.toISOString(),
        versionScore: t0.versionScore,
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

// Rattachement d'un repère à son cycle. Depuis le gate G2, le `cycleId` STOCKÉ
// sur l'épisode fait foi ; le rattachement par date ci-dessous n'est plus qu'un
// REPLI pour les lignes qui n'en portent pas (antérieures au gate, ou sans T0
// antérieur au moment de leur confirmation).
// Le repli rattache au cycle ouvert par le dernier T0 antérieur ou égal. Un
// repère n'est JAMAIS rattaché à un cycle postérieur : un jalon ne peut pas
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
    if (repere.cycleId !== null) {
      return { milestone: repere.milestone, date: repere.date, cycleId: repere.cycleId };
    }
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

// Garde A8-3 : jamais de comparaison hors versionScore identique. Depuis le
// gate G2 la version est LUE sur chaque épisode (figée à la confirmation) et
// non plus recalculée depuis la constante courante — la garde est donc
// réellement déclenchable.
export function resoudreComparaison(cycles: TrajectoireCycle[]): TrajectoireComparaison {
  if (cycles.length === 0) return { disponible: false, raison: 'aucun_cycle' };
  if (cycles.length === 1) return { disponible: false, raison: 'un_seul_cycle' };
  // Une version nulle n'est jamais assimilée à la version courante : on ne sait
  // pas sous quelle calibration la mesure a été prise, donc on ne compare pas.
  if (cycles.some((c) => c.versionScore === null)) {
    return { disponible: false, raison: 'version_inconnue' };
  }
  const versions = new Set(cycles.map((c) => c.versionScore));
  if (versions.size > 1) return { disponible: false, raison: 'versions_differentes' };
  return { disponible: true, raison: 'comparable' };
}
