import type { EtatPopulation, ReponseEtat } from '@/lib/consultation/etatPopulation';

// GATE DE POPULATION — [[D-101]], LOT-05 « Doctrine exécutable », `DC-43`.
//
// CE QUE LA GATE FAIT. Elle croise les EXCLUSIONS DÉCLARÉES d'un axe candidat
// avec l'ÉTAT DÉCLARÉ du patient, AVANT le classement. Un candidat écarté
// n'entre jamais dans l'ordre : il ne s'en retire pas, il n'y figure pas. C'est
// la moitié de `DC-43` qui porte sur la place du filtre, et la seule que le
// code peut tenir seul.
//
// CE QU'ELLE NE FAIT PAS, ET QU'IL FAUT LIRE AVANT DE S'EN RÉCLAMER. La table
// de curation ci-dessous est **VIDE**. Aucun axe ne déclare d'exclusion, donc
// la gate n'écarte AUCUN candidat aujourd'hui, sur aucun dossier. Ce qu'elle
// produit à la place n'est pas rien : chaque candidat porte le motif
// « exclusions non curées », servi au praticien. C'est `DC-35`, et c'est le
// seul rempart entre « ouvert par défaut » et « aveugle par défaut ».
//
// POURQUOI VIDE PLUTÔT QUE CURÉE. Une exclusion s'écrit avec sa provenance ou
// ne s'écrit pas (`DC-19`, interdit explicite du lot). Aucune source du dépôt
// ne porte les exclusions de population des axes de travail : les 95 entrées de
// `nnpp2_interventions_registry.json` ont un champ `neCouvrePas` à `null` sur
// les 95, et aucun chemin d'exécution ne relie un candidat classé à une entrée
// de ce registre. Curer par déduction aurait été inventer. La curation est un
// acte praticien signé, et elle a son propre lot.
//
// POURQUOI CETTE TABLE N'EST PAS DANS LE PÉRIMÈTRE SIGNÉ DE `priorityRulesV1`.
// Elle ne porte aucun contenu clinique : elle déclare une IGNORANCE. L'y faire
// entrer aurait changé `PRIORITY_RULES_SHA256`, donc fermé `tablePrioritesSignee()`,
// donc retiré TOUS les candidats de la production — pour y inscrire un tableau
// vide. Le jour où une exclusion réelle s'y écrit, elle appelle une signature :
// `CURATION_EXCLUSIONS_METADATA` porte déjà les champs de ce verrou, éteints.
//
// AUCUN SEUIL, AUCUNE BORNE, AUCUN ÂGE PIVOT. Ce module ne compare aucun
// nombre. Il compare des états déclarés à des exclusions déclarées, et rien
// d'autre.

/** Un critère binaire de l'état de population, tel que le patient le déclare. */
export type CritereBinaire = Exclude<keyof EtatPopulation, 'alimentation'>;

/**
 * Une exclusion déclarée par un axe : « cet axe ne couvre pas les patientes
 * enceintes », avec la source qui l'établit.
 *
 * `source` N'EST PAS DÉCORATIVE et n'est pas optionnelle : une exclusion sans
 * provenance est exactement ce que l'interdit du lot refuse. Le type l'exige,
 * de sorte qu'une curation future ne puisse pas en poser une sans la citer.
 */
export type ExclusionDeclaree = {
  critere: CritereBinaire;
  /** L'état qui exclut — toujours `'oui'` : on exclut sur un fait déclaré. */
  valeurExcluante: Extract<ReponseEtat, 'oui'>;
  /** Libellé français servi au praticien. */
  libelle: string;
  /** Provenance certifiée de l'exclusion (claim, décision, source signée). */
  source: string;
};

/**
 * Exclusions par axe candidat — `null` signifie NON CURÉ, jamais « aucune ».
 *
 * La distinction est tout le module. `null` se DIT au praticien ; `[]` dirait
 * « curé, et cet axe ne connaît aucune exclusion », ce qu'aucune source
 * n'établit aujourd'hui. Un axe absent de la table est traité comme `null` —
 * une clé oubliée ne doit pas se lire comme une curation.
 */
export type CurationExclusions = Record<string, ExclusionDeclaree[] | null>;

/**
 * LA TABLE, ET ELLE EST VIDE — l'état au 2026-08-23.
 *
 * Vide et NOMMÉE vide : le banc `gatePopulationV1.guard.test.ts` rougit si une
 * entrée y apparaît sans que `CURATION_EXCLUSIONS_METADATA` soit signée. Curer
 * sans signer est le chemin par lequel une exclusion non relue atteindrait la
 * production.
 */
export const EXCLUSIONS_INTERVENTIONS_V1: CurationExclusions = {};

export const CURATION_EXCLUSIONS_METADATA = {
  version: 'gate-population-nnpp2-v1',
  /** NON SIGNÉE — aucune exclusion n'a été relue, parce qu'aucune n'existe. */
  validationExterne: false,
  dateValidation: null as string | null,
  shaPerimetre: null as string | null,
} as const;

/**
 * Le verdict de la gate sur UN candidat.
 *
 * Trois statuts, et le motif est OBLIGATOIRE sur chacun — y compris quand le
 * candidat passe. Un champ optionnel aurait laissé le silence redevenir
 * possible, et le silence est le mode de défaillance que `DC-35` vise.
 */
export type VerdictGatePopulation =
  | { statut: 'ecarte'; motif: string; critere: CritereBinaire }
  | { statut: 'propose_non_cure'; motif: string }
  | { statut: 'propose_etat_inconnu'; motif: string; critere: CritereBinaire }
  | { statut: 'propose'; motif: string };

const MOTIF_NON_CURE =
  'Proposé — les exclusions de population de cet axe ne sont pas curées :'
  + ' aucune source ne dit qui il ne couvre pas. L’absence d’exclusion déclarée'
  + ' ne vaut pas absence d’exclusion.';

const MOTIF_AUCUNE_ATTEINTE =
  'Proposé — exclusions de population curées, aucune n’est atteinte par l’état'
  + ' déclaré du patient.';

/**
 * Le candidat passe-t-il la gate de population ?
 *
 * FONCTION PURE, et la table est un PARAMÈTRE. La table de production est vide,
 * ce qui rendrait deux des quatre branches inatteignables et donc non gardées —
 * le défaut exact que le LOT-04 a payé sur `evaluerAbstention`. En la passant
 * en argument, le banc joue une curation réelle sans qu'aucune exclusion non
 * relue n'existe hors du test.
 *
 * ORDRE D'ÉVALUATION, ET IL EST CLINIQUE. L'exclusion atteinte prime sur tout :
 * dès qu'un critère déclaré `oui` rencontre une exclusion, le candidat est
 * écarté, sans que les autres critères soient regardés. Un état inconnu sur un
 * critère exclu ne fait ensuite QUE parler — il n'écarte pas.
 *
 * L'ÉTAT INCONNU N'ÉCARTE PAS, ET C'EST UN ARBITRAGE NON RENDU. `DC-24` dit
 * qu'un état inconnu n'est pas un état absent ; il ne dit pas qu'un inconnu
 * doit inhiber. Écarter sur inconnu retirerait des axes à tout dossier
 * antérieur à la section « État actuel », c'est-à-dire à tous. Le module
 * PARLE plutôt qu'il n'inhibe, et le dit au praticien. La branche est
 * INATTEIGNABLE en production tant que la table est vide ; l'arbitrage se rend
 * au moment de la curation, avec les exclusions sous les yeux.
 */
export function evaluerGatePopulation(
  ruleId: string,
  etat: EtatPopulation,
  curation: CurationExclusions = EXCLUSIONS_INTERVENTIONS_V1,
): VerdictGatePopulation {
  // Une clé absente et une clé à `null` disent la même chose — non curé — et
  // doivent produire le même motif. `?? null` les réunit avant tout test.
  const exclusions = curation[ruleId] ?? null;
  if (exclusions === null) return { statut: 'propose_non_cure', motif: MOTIF_NON_CURE };

  for (const exclusion of exclusions) {
    if (etat[exclusion.critere] === exclusion.valeurExcluante) {
      return {
        statut: 'ecarte',
        critere: exclusion.critere,
        motif:
          `Écarté — exclusion déclarée : ${exclusion.libelle}.`
          + ` L’état est déclaré par le patient. Source : ${exclusion.source}.`,
      };
    }
  }

  for (const exclusion of exclusions) {
    if (etat[exclusion.critere] === 'inconnu') {
      return {
        statut: 'propose_etat_inconnu',
        critere: exclusion.critere,
        motif:
          `Proposé — l’état du patient n’est pas renseigné sur un critère que cet axe exclut`
          + ` (${exclusion.libelle}) : l’exclusion n’a pas pu être vérifiée.`,
      };
    }
  }

  return { statut: 'propose', motif: MOTIF_AUCUNE_ATTEINTE };
}
