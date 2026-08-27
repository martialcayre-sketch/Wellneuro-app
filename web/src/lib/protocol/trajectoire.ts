import { construireHistoriqueEquilibre, type ReponseBrute } from '@/lib/equilibre/depuisPrisma';
import { calculerDeltaMomentum, resoudreLectureJalon } from '@/lib/equilibre/momentum';
import {
  calculerMomentumParBesoin,
  construireHistoriqueParBesoin,
  type MomentumBesoin,
} from '@/lib/equilibre/momentumParBesoin';
import type { JalonMomentum, TendanceMomentum } from '@/lib/equilibre/types';
import {
  ancresOrdonnees,
  discordanceDOrdre,
  jalonsDuCycle,
  JALONS_MESURE,
  type AncreCycle,
} from './cycles';

// Fiche-trajectoire praticien (C2B LOT-09, registre A8) — objet DÉRIVÉ, lecture
// seule. « La Spirale comme index temporel des épisodes » : un index de repères
// datés (jalons confirmés) + un comparateur multi-épisodes SOUS garde de version.
// Ne réimplémente NI le score NI les jalons (propriété exclusive de
// lib/equilibre) : lit via momentum.ts + depuisPrisma, ancrés à l'ancre de
// chaque cycle (LOT-08, `D-113`). Jamais une courbe, jamais un pronostic (A6). Un jalon sans
// couverture est « non mesuré », jamais un 0 (A8-2). Deux lectures de
// versionScore différents ne sont jamais soustraites (A8-3).

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

// Un cycle = un épisode d'ANCRE confirmé (`T0`, `T1`, `T2`, …). Depuis `D-113`
// l'ancre porte le rang de son cycle : un deuxième cycle ne redéplace plus le
// point de départ du premier, il pose le sien.
export type TrajectoireCycle = {
  cycleId: string; // id de cycle stocké, à défaut id de l'épisode d'ancre
  /**
   * L'ancre de CE cycle — `T0` pour le premier, `T1` pour le deuxième, etc.
   * Servie explicitement plutôt que devinée : ses consommateurs lisent ses
   * jalons par nom, et « le jalon d'ancre » n'est plus un littéral connu
   * d'avance.
   */
  ancre: AncreCycle;
  /**
   * ISO du `confirmedAt` de l'ancre. Le champ s'appelait `dateT0` : ce nom
   * affirmait que tout cycle commence par un `T0`, et les libellés qui en
   * découlaient (« T0 le … », « T0 + 14 j ») seraient devenus FAUX à l'écran
   * dès le deuxième cycle.
   */
  dateAncre: string; // ISO
  // null = version de score inconnue (ligne antérieure au gate G2). Jamais
  // assimilée à la version courante : ce serait rendre A8-3 indéclenchable.
  versionScore: string | null;
  jalons: TrajectoireJalonLecture[];
  momentum: { tendance: TendanceMomentum; delta: number } | null; // ancre → dernier jalon mesuré
  /**
   * Momentum PAR BESOIN (LOT-07, `D-058`) : delta factuel, jamais qualifié
   * tant qu'aucune bande de bruit n'est publiée. Le scalaire ci-dessus reste
   * servi tel quel pour ses consommateurs — sa sémantique (« stable » à delta
   * exactement nul) ne s'étend pas ici. VIDE quand l'appelant n'a pas demandé
   * le calcul (`avecMomentumParBesoin`) — un tableau vide n'affirme rien.
   */
  momentumParBesoin: MomentumBesoin[];
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
  // Ordonnés par RANG D'ANCRE (`T0`, `T1`, `T2`, …), et non par date : le nom
  // fait foi pour l'identité d'un cycle (`D-113` §6).
  cycles: TrajectoireCycle[];
  comparaison: TrajectoireComparaison;
  /**
   * L'ordre des rangs contredit l'ordre des dates de confirmation — un `T2`
   * confirmé avant le `T1`. SIGNALÉ, jamais départagé (`DC-30`) : remettre
   * dans l'ordre choisirait en silence laquelle des deux sources a raison.
   */
  discordanceOrdreCycles: boolean;
};

export function construireTrajectoire(input: {
  episodes: TrajectoireEpisode[];
  reponses: ReponseBrute[];
  /**
   * Momentum par besoin (LOT-07) — OPT-IN : il rejoue `calculerEquilibre` à
   * chaque jalon atteint, et seuls la fiche-trajectoire le consomme. Le
   * chargement cabinet (tous les patients du praticien) et la carte de Fil
   * n'en lisent rien : ils ne paient pas ce calcul. Défaut : absent (`[]`).
   */
  avecMomentumParBesoin?: boolean;
}): Trajectoire {
  const episodesTriees = [...input.episodes].sort(
    (a, b) => a.confirmedAt.getTime() - b.confirmedAt.getTime(),
  );

  const index = episodesTriees.map((e) => ({
    milestone: e.milestone,
    date: e.confirmedAt.toISOString(),
    cycleId: e.cycleId,
  }));

  // Un cycle par ANCRE, ordonnés par rang (`D-113` §6). L'ordre venait de la
  // date de confirmation ; il vient du nom, qui seul identifie le cycle.
  const cycles: TrajectoireCycle[] = ancresOrdonnees(episodesTriees)
    .map((episodeAncre) => {
      // `ancresOrdonnees` a déjà filtré sur `estAncreDeCycle` : le transtypage
      // ne fait que porter au type ce que le filtre garantit.
      const ancre = episodeAncre.milestone as AncreCycle;
      const dateAncre = episodeAncre.confirmedAt;
      // Ancrage par épisode (LOT-08) : l'historique daté est reconstruit
      // relativement à l'ancre confirmée DE CE CYCLE — plus jamais celle d'un
      // cycle voisin.
      const historique = construireHistoriqueEquilibre(input.reponses, dateAncre);

      const jalons: TrajectoireJalonLecture[] = jalonsDuCycle(ancre).map((jalon) => {
        const lecture = resoudreLectureJalon(dateAncre, jalon, historique);
        return {
          jalon,
          mesure: lecture !== null,
          valeur: lecture?.valeur ?? null,
          date: lecture ? lecture.date.toISOString() : null,
        };
      });

      const lectureAncre = resoudreLectureJalon(dateAncre, ancre, historique);
      // Le dernier jalon de MESURE renseigné. Le test excluait l'ancre par son
      // littéral (`jalon !== 'T0'`) : sur un cycle ancré en `T1`, il aurait
      // laissé l'ancre entrer dans son propre momentum, qui vaut alors zéro.
      const dernierJalonMesure = [...JALONS_MESURE]
        .reverse()
        .find((jalon) => resoudreLectureJalon(dateAncre, jalon, historique) !== null);
      const lectureRecente = dernierJalonMesure
        ? resoudreLectureJalon(dateAncre, dernierJalonMesure, historique)
        : null;
      const momentum = calculerDeltaMomentum(lectureAncre, lectureRecente);

      // Par besoin : même ancre, même « maintenant » implicite que l'historique
      // scalaire (les jalons futurs sont omis pareil). Les deux lectures d'une
      // série viennent toujours du moteur courant : aucune garde de version
      // intra-cycle ici (revue LOT-07 B1) — la garde A8-3 inter-cycles reste
      // `resoudreComparaison` ci-dessous.
      //
      // L'ANCRE EST PASSÉE PAR SON NOM. Le défaut par `'T0'` du module était
      // dit provisoire (`D-113`, PR 1) : chaque `LectureBesoin` PORTE son
      // jalon, et ce nom est restitué au praticien — « T0 » sous une lecture
      // du cycle `T1` la daterait d'un départ qui n'est pas le sien.
      const momentumParBesoin = input.avecMomentumParBesoin
        ? calculerMomentumParBesoin({
            series: construireHistoriqueParBesoin(input.reponses, dateAncre, new Date(), ancre),
          })
        : [];

      return {
        // Le cycle d'une ancre est le sien : id stocké quand il existe, sinon
        // son propre id (repli pour les lignes antérieures au gate G2).
        cycleId: episodeAncre.cycleId ?? episodeAncre.id,
        ancre,
        dateAncre: dateAncre.toISOString(),
        versionScore: episodeAncre.versionScore,
        jalons,
        momentum: momentum ? { tendance: momentum.tendance, delta: momentum.delta } : null,
        momentumParBesoin,
      };
    });

  return {
    index,
    cycles,
    comparaison: resoudreComparaison(cycles),
    discordanceOrdreCycles: discordanceDOrdre(episodesTriees),
  };
}

// Un repère de l'index, rattaché au cycle qu'il documente. Rendu navigable côté
// UI (Vague 2) : l'index calculé depuis LOT-09 n'était affiché nulle part, si
// bien que les épisodes J21/J42/J90 confirmés restaient invisibles.
export type TrajectoireRepere = {
  milestone: JalonMomentum;
  date: string; // ISO
  cycleId: string | null; // null = repère antérieur à toute ancre confirmée
};

// Rattachement d'un repère à son cycle. Depuis le gate G2, le `cycleId` STOCKÉ
// sur l'épisode fait foi ; le rattachement par date ci-dessous n'est plus qu'un
// REPLI pour les lignes qui n'en portent pas (antérieures au gate, ou sans
// ancre antérieure au moment de leur confirmation).
// Le repli rattache au cycle ouvert par la dernière ancre antérieure ou égale.
// Un repère n'est JAMAIS rattaché à un cycle postérieur : un jalon ne peut pas
// documenter un cycle qui n'avait pas commencé. Sans ancre antérieure, il reste
// explicitement non rattaché plutôt que rangé de force dans le premier cycle.
export function rattacherReperesAuxCycles(
  index: Trajectoire['index'],
  cycles: TrajectoireCycle[],
): TrajectoireRepere[] {
  const ancres = cycles
    .map((cycle) => ({ cycleId: cycle.cycleId, instant: new Date(cycle.dateAncre).getTime() }))
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
