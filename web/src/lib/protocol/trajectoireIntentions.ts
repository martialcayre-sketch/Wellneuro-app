import type { JalonMomentum } from '@/lib/equilibre/types';
import type { ProtocolActionType, SupplementCatalogRef } from '@/lib/clinical-engine/types';
import {
  optionLibelle,
  POINTS_ETAPE,
  resolveActiveCheckin,
  type CheckinRow,
  type PointEtape,
} from './checkinDomain';
import { deriverMeteoAdhesion, type MeteoAdhesion } from './adhesion';

// Vue trajectoire « intentions → épisodes » (C4 LOT-05) — objet DÉRIVÉ, LECTURE
// SEULE, PRATICIEN SEUL. Rien n'est persisté (aucune dépendance Prisma, aucune
// écriture) : c'est une juxtaposition calculée à la lecture, jetée après usage.
//
// Doctrine (proposition §6.4) : on JUXTAPOSE, par période, trois bandes de faits
//   — les intentions et matérialisations actives du protocole,
//   — les épisodes d'évaluation T0/J21/J42/J90,
//   — les faits d'observance rapportés par point d'étape (+ la météo d'adhésion,
//     agrégat EXISTANT réutilisé, jamais recalculé ni dupliqué).
// AUCUNE flèche causale, AUCUN coefficient : « pendant cette période, l'intention
// X était active ; adhésion rapportée : régulière ». Le praticien conclut. Les
// champs `causalite`/`coefficients` inscrivent cet interdit dans la donnée.
//
// Le patient ne voit rien de ceci : ce module importe `adhesion` (praticien seul)
// et ne doit jamais apparaître dans une surface portail/patient (garde-fou testé).

export const VERSION_TRAJECTOIRE_INTENTIONS = 'c4-trajectoire-intentions-v1' as const;

// Une action du protocole actif, réduite au strict nécessaire à la juxtaposition.
// `ProtocolAction` du contrat clinique est assignable à ce type structurel.
export type ProtocolActionInput = {
  actionId: string;
  type: ProtocolActionType;
  title: string;
  supplementCatalogRef?: SupplementCatalogRef;
};

// Un épisode d'évaluation, réduit aux champs juxtaposés. `AssessmentEpisode`
// (proposé ou confirmé) est assignable à ce type structurel.
export type EpisodeTrajectoireInput = {
  milestone: JalonMomentum;
  status: 'proposed' | 'confirmed';
  targetAt: string; // ISO — date théorique du jalon
  confirmedAt?: string | null; // ISO — présent uniquement si confirmé
};

// Bande 1 — intentions et matérialisations actives du protocole. `intitule` est
// le titre praticien de l'action (verbatim). `referenceCatalogue` n'existe que
// pour une matérialisation compléments et reste OPAQUE et gouvernée : ni produit,
// ni forme, ni dose, ni marque — seulement les identifiants du contrat V3.
export type IntentionActive = {
  actionId: string;
  type: ProtocolActionType;
  intitule: string;
  materialiseeComplement: boolean;
  referenceCatalogue: {
    ingredientId: string;
    ruleId: string;
    ruleVersion: number;
    productId: string | null;
  } | null;
};

// Bande 2 — épisodes T0/J21/J42/J90, datés, avec leur statut. Un épisode proposé
// porte sa date théorique ; un épisode confirmé, sa date de confirmation.
export type EpisodeJuxtapose = {
  milestone: JalonMomentum;
  statut: 'proposed' | 'confirmed';
  date: string | null; // ISO
};

// Bande 3 — faits d'observance rapportés par point d'étape (J7/J14/J21), verbatim.
// Jamais un état agrégé PAR point (ce serait un nouvel agrégat, interdit A8-4) :
// seulement les libellés des réponses telles quelles.
export type PointCheckinJuxtapose = {
  pointEtape: PointEtape;
  date: string; // ISO du check-in courant de ce point
  faitsRapportes: string[];
};

export type TrajectoireIntentions = {
  version: typeof VERSION_TRAJECTOIRE_INTENTIONS;
  intentions: IntentionActive[];
  episodes: EpisodeJuxtapose[];
  pointsCheckin: PointCheckinJuxtapose[];
  // Agrégat d'adhésion EXISTANT (SP-MET), réutilisé tel quel — pas un nouvel
  // agrégat, pas une météo par point d'étape. Sourcé sur son point d'étape.
  meteoAdhesion: MeteoAdhesion;
  // Invariants inscrits dans la donnée : la juxtaposition ne dérive aucune
  // causalité et ne calcule aucun coefficient.
  causalite: 'aucune';
  coefficients: 'aucun';
};

function dateEpisode(episode: EpisodeTrajectoireInput): string | null {
  if (episode.status === 'confirmed' && episode.confirmedAt) return episode.confirmedAt;
  return episode.targetAt ?? null;
}

function instant(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY; // les non-datés en fin d'axe, jamais devinés
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

// Faits rapportés d'un check-in, verbatim, sans agrégat ni interprétation.
function faitsRapportes(checkin: CheckinRow): string[] {
  const faits: string[] = [];
  const adhesion = optionLibelle('adhesion', checkin.reponses.adhesion);
  if (adhesion) faits.push(`Action principale : « ${adhesion} »`);

  const observance = checkin.reponses.observance_complements;
  if (observance) {
    const libelle = optionLibelle('observance_complements', observance);
    if (libelle) faits.push(`Compléments : « ${libelle} »`);
  }
  const motif = checkin.reponses.observance_complements_motif;
  if (motif) {
    const libelle = optionLibelle('observance_complements_motif', motif);
    if (libelle) faits.push(`Frein compléments rapporté : « ${libelle} »`);
  }
  return faits;
}

export function construireTrajectoireIntentions(input: {
  actions: ReadonlyArray<ProtocolActionInput>;
  episodes: ReadonlyArray<EpisodeTrajectoireInput>;
  checkins: CheckinRow[];
}): TrajectoireIntentions {
  const intentions: IntentionActive[] = input.actions.map((action) => {
    const materialiseeComplement =
      action.type === 'supplement_exploration' && action.supplementCatalogRef != null;
    const ref = materialiseeComplement ? action.supplementCatalogRef! : null;
    return {
      actionId: action.actionId,
      type: action.type,
      intitule: action.title,
      materialiseeComplement,
      referenceCatalogue: ref
        ? {
            ingredientId: ref.ingredientId,
            ruleId: ref.ruleId,
            ruleVersion: ref.ruleVersion,
            productId: ref.productId ?? null,
          }
        : null,
    };
  });

  const episodes: EpisodeJuxtapose[] = [...input.episodes]
    .map((episode) => ({
      milestone: episode.milestone,
      statut: episode.status,
      date: dateEpisode(episode),
    }))
    .sort((a, b) => instant(a.date) - instant(b.date));

  const pointsCheckin: PointCheckinJuxtapose[] = POINTS_ETAPE.flatMap((pointEtape) => {
    const actif = resolveActiveCheckin(input.checkins, pointEtape);
    if (!actif) return [];
    return [{ pointEtape, date: actif.soumisLe, faitsRapportes: faitsRapportes(actif) }];
  });

  return {
    version: VERSION_TRAJECTOIRE_INTENTIONS,
    intentions,
    episodes,
    pointsCheckin,
    meteoAdhesion: deriverMeteoAdhesion(input.checkins),
    causalite: 'aucune',
    coefficients: 'aucun',
  };
}
