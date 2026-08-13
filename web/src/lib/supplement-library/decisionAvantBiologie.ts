// Règle de décision « compléments avant biologie » (LOT-05, `D-056`).
//
// Module PUR : il ne lit rien: la couche appelante lui passe ce qu'elle a lu du
// catalogue. Il rend un VERDICT motivé, jamais un booléen — un refus doit dire
// lequel des sept obstacles il a rencontré, et « pas d'obstacle constaté » n'est
// pas un motif de refus recevable (`DC-34`, `DC-35`).
//
// L'inversion qui fait tout l'objet du module (`D-056`, arbitrage 2) : les
// conditions négatives de la spec — « aucune alerte active », « seuils
// respectés » — seraient VRAIES PAR VACUITÉ sur la production d'aujourd'hui, où
// `supplement_safety_alerts` et `ingredient_functional_thresholds` comptent zéro
// ligne. Elles passeraient parce que rien n'a été examiné, non parce que le
// complément est sûr. Ici, l'absence d'information vaut refus (`DC-24`).

import { sentinelleADeQuoiConclure } from './sentinelleCore';
import type {
  AlerteSecuriteJointe,
  IngredientResolu,
  RegleResolue,
  ResolutionIntentions,
  SeuilFonctionnelSource,
} from './types';

export const C4_DECISION_AVANT_BIOLOGIE_VERSION = 'c4-decision-avant-biologie-v1' as const;

/**
 * Éléments qui peuvent concourir à un déclencheur. `score_dnst` y figure pour
 * pouvoir être REFUSÉ nommément : il n'est pas un déclencheur recevable, seul
 * ou accompagné (`DC-27` score ≠ diagnostic, `DC-28` un questionnaire isolé ne
 * suffit pas à conclure).
 */
export type OrigineDeclencheur = 'besoin_degrade' | 'plainte' | 'anamnese' | 'score_dnst';

const ORIGINES_CLINIQUES_REQUISES: readonly OrigineDeclencheur[] = [
  'besoin_degrade',
  'plainte',
  'anamnese',
];

export type CauseRefus =
  | 'catalogue_decision_vide'
  | 'regle_non_validee'
  | 'source_absente'
  | 'claims_non_valides'
  | 'catalogue_alertes_non_publie'
  | 'alerte_securite_active'
  | 'aucun_seuil_publie'
  | 'seuil_depasse'
  | 'condition_illisible'
  | 'declencheur_insuffisant';

export type WaitForBiologie = { type: 'biologie'; cible: string; echeance?: string };

export type VerdictAvantBiologie =
  | {
      verdict: 'intention';
      contractVersion: typeof C4_DECISION_AVANT_BIOLOGIE_VERSION;
      statut: 'active' | 'conditionnelle_biologie';
      waitFor?: WaitForBiologie;
      ingredient: IngredientResolu;
      regleId: string;
      versionRegle: number;
      motif: string;
    }
  | {
      verdict: 'refus';
      contractVersion: typeof C4_DECISION_AVANT_BIOLOGIE_VERSION;
      cause: CauseRefus;
      ingredient: IngredientResolu | null;
      regleId: string | null;
      motif: string;
    };

/**
 * Ce que l'appelant doit avoir lu pour qu'une décision soit possible.
 *
 * `catalogueAlertesPublie` se garde au niveau CATALOGUE, pas au niveau
 * ingrédient : qu'un ingrédient ne porte aucune alerte est le cas normal et ne
 * prouve rien ; ce qui fait preuve, c'est que le catalogue d'alertes existe.
 * `seuilsActifs` se garde au niveau INGRÉDIENT : sans seuil publié, la borne de
 * dose portée par la règle n’est comparable à rien (`D-056`, arbitrage 2).
 */
export type ContexteDecision = {
  regle: RegleResolue;
  catalogueAlertesPublie: boolean;
  alertesActives: readonly AlerteSecuriteJointe[];
  seuilsActifs: readonly SeuilFonctionnelSource[];
  claimsValides: boolean;
  declencheur: readonly OrigineDeclencheur[];
};

function refus(
  cause: CauseRefus,
  motif: string,
  ingredient: IngredientResolu | null,
  regleId: string | null,
): VerdictAvantBiologie {
  return {
    verdict: 'refus',
    contractVersion: C4_DECISION_AVANT_BIOLOGIE_VERSION,
    cause,
    ingredient,
    regleId,
    motif,
  };
}

/**
 * Lecture de `conditionSupplementaire`, typée `unknown` en base.
 *
 * Trois issues et trois seulement : absente (règle inconditionnelle), lisible
 * comme condition biologique, ou ILLISIBLE — et une condition illisible est un
 * refus, jamais une règle inconditionnelle. Se tromper de sens ici ferait naître
 * « active » une intention que sa règle voulait suspendre.
 */
function lireConditionBiologique(
  valeur: unknown,
): { forme: 'absente' } | { forme: 'biologie'; waitFor: WaitForBiologie } | { forme: 'illisible' } {
  if (valeur === null || valeur === undefined) return { forme: 'absente' };
  if (typeof valeur !== 'object' || Array.isArray(valeur)) return { forme: 'illisible' };
  const condition = valeur as Record<string, unknown>;
  if (condition.type !== 'biologie') return { forme: 'illisible' };
  const cible = condition.cible;
  if (typeof cible !== 'string' || !cible.trim()) return { forme: 'illisible' };
  const echeance = condition.echeance;
  if (echeance === undefined || echeance === null) {
    return { forme: 'biologie', waitFor: { type: 'biologie', cible: cible.trim() } };
  }
  if (typeof echeance !== 'string') return { forme: 'illisible' };
  const date = new Date(echeance);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== echeance) return { forme: 'illisible' };
  return { forme: 'biologie', waitFor: { type: 'biologie', cible: cible.trim(), echeance } };
}

/** Une borne de dose, prise individuellement, dépasse-t-elle le seuil haut ? */
function depasseSeuilHaut(regle: RegleResolue, seuil: SeuilFonctionnelSource): boolean {
  if (seuil.seuilDoseHaute === null) return false;
  const haut = seuil.seuilDoseHaute;
  return (regle.doseCibleBasse !== null && regle.doseCibleBasse > haut)
    || (regle.doseCibleHaute !== null && regle.doseCibleHaute > haut);
}

/**
 * Décide d'UNE règle. L'ordre des contrôles n'est pas indifférent : la
 * validation d'abord (barrière `D-003` — rien d'actionnable sans validation
 * praticien signée), la sécurité ensuite (`DC-12`, `DC-23` — un signal de
 * sécurité prime), le déclencheur clinique en dernier.
 */
export function deciderIntentionAvantBiologie(contexte: ContexteDecision): VerdictAvantBiologie {
  const { regle } = contexte;
  const ingredient = regle.ingredient;

  // 1. Provenance certifiée (`DC-01`, `DC-02`).
  if (!regle.regleValidee || !regle.validePar || !regle.valideLe) {
    return refus(
      'regle_non_validee',
      `La règle « ${regle.regleId} » n’est pas validée par un praticien : aucune intention `
        + `ne peut en naître.`,
      ingredient,
      regle.regleId,
    );
  }
  if (!regle.source.citation.trim()) {
    return refus(
      'source_absente',
      `La règle « ${regle.regleId} » ne cite aucune source : une règle clinique sans `
        + `provenance ne s’applique pas.`,
      ingredient,
      regle.regleId,
    );
  }
  if (!contexte.claimsValides) {
    return refus(
      'claims_non_valides',
      `Les claims cités par la règle « ${regle.regleId} » ne sont pas valides au corpus.`,
      ingredient,
      regle.regleId,
    );
  }

  // 2. Sécurité — l'absence d'information ne vaut jamais autorisation.
  if (!contexte.catalogueAlertesPublie) {
    return refus(
      'catalogue_alertes_non_publie',
      `Le catalogue d’alertes de sécurité n’est pas publié : « aucune alerte » ne serait `
        + `pas un constat, seulement une absence d’examen. Aucun complément ne peut être `
        + `proposé tant que ce catalogue n'existe pas.`,
      ingredient,
      regle.regleId,
    );
  }
  const alerte = contexte.alertesActives[0];
  if (alerte !== undefined) {
    return refus(
      'alerte_securite_active',
      `Alerte de sécurité active sur « ${ingredient.nomFr} » : ${alerte.messageFr}`,
      ingredient,
      regle.regleId,
    );
  }
  if (contexte.seuilsActifs.length === 0) {
    return refus(
      'aucun_seuil_publie',
      `Aucun seuil fonctionnel publié pour « ${ingredient.nomFr} » : la dose cible de la `
        + `règle n’est comparable à rien, donc « seuils respectés » ne peut pas être conclu.`,
      ingredient,
      regle.regleId,
    );
  }
  const seuilDepasse = contexte.seuilsActifs.find(seuil => depasseSeuilHaut(regle, seuil));
  if (seuilDepasse !== undefined) {
    return refus(
      'seuil_depasse',
      `La dose cible de la règle « ${regle.regleId} » dépasse le seuil haut publié pour `
        + `« ${ingredient.nomFr} » (${seuilDepasse.seuilDoseHaute} ${seuilDepasse.unite}, `
        + `catégorie « ${seuilDepasse.categorieFonctionnelle.labelFr} »).`,
      ingredient,
      regle.regleId,
    );
  }

  // 3. Déclencheur : un tableau clinique, jamais un score.
  const origines = new Set(contexte.declencheur);
  const manquantes = ORIGINES_CLINIQUES_REQUISES.filter(origine => !origines.has(origine));
  if (manquantes.length > 0) {
    const complementDnst = origines.has('score_dnst')
      ? ' Un axe DNST ne comble aucun de ces éléments : il n’est pas un déclencheur recevable.'
      : '';
    return refus(
      'declencheur_insuffisant',
      `Le tableau clinique est incomplet pour « ${ingredient.nomFr} » — manque : `
        + `${manquantes.join(', ')}.${complementDnst}`,
      ingredient,
      regle.regleId,
    );
  }

  // 4. Statut de naissance selon la condition portée par la règle.
  const condition = lireConditionBiologique(regle.conditionSupplementaire);
  if (condition.forme === 'illisible') {
    return refus(
      'condition_illisible',
      `La condition supplémentaire de la règle « ${regle.regleId} » est illisible : elle `
        + `n’est pas traitée comme une absence de condition.`,
      ingredient,
      regle.regleId,
    );
  }
  const commun = {
    verdict: 'intention' as const,
    contractVersion: C4_DECISION_AVANT_BIOLOGIE_VERSION,
    ingredient,
    regleId: regle.regleId,
    versionRegle: regle.versionRegle,
  };
  if (condition.forme === 'biologie') {
    return {
      ...commun,
      statut: 'conditionnelle_biologie',
      waitFor: condition.waitFor,
      motif: `Intention fondée sur la règle validée « ${regle.regleId} », suspendue à `
        + `« ${condition.waitFor.cible} » : provisoire jusqu'à l'arbitrage biologique.`,
    };
  }
  return {
    ...commun,
    statut: 'active',
    motif: `Intention fondée sur la règle validée « ${regle.regleId} » : règle `
      + `inconditionnelle, sécurité examinée, tableau clinique complet.`,
  };
}

/**
 * Décide sur une résolution entière.
 *
 * `sentinelleADeQuoiConclure` est la porte d'entrée et NON une seconde
 * primitive : elle dit déjà « aucune règle validée n'atteint le moindre
 * ingrédient », ce qui est l'état de la production tant que `clinical_rules` est
 * vide. Sans cette porte, la boucle rendrait `[]` — et `[]` se lirait « aucune
 * intention indiquée » là où il faut lire « rien n'a été examiné ».
 */
export function deciderIntentionsAvantBiologie(
  resolution: ResolutionIntentions,
  catalogue: {
    catalogueAlertesPublie: boolean;
    alertesParIngredient: ReadonlyMap<string, readonly AlerteSecuriteJointe[]>;
    seuilsParIngredient: ReadonlyMap<string, readonly SeuilFonctionnelSource[]>;
    claimsValidesParRegle: ReadonlyMap<string, boolean>;
    declencheur: readonly OrigineDeclencheur[];
  },
): VerdictAvantBiologie[] {
  if (!sentinelleADeQuoiConclure(resolution)) {
    return [
      refus(
        'catalogue_decision_vide',
        'Aucune règle clinique validée n’atteint le moindre ingrédient : le catalogue de '
          + 'décision est vide. Rien n’a été examiné — ce n’est pas un feu vert.',
        null,
        null,
      ),
    ];
  }
  const verdicts: VerdictAvantBiologie[] = [];
  for (const { regles } of resolution.intentions) {
    for (const regle of regles) {
      if (!regle.regleValidee) continue;
      verdicts.push(deciderIntentionAvantBiologie({
        regle,
        catalogueAlertesPublie: catalogue.catalogueAlertesPublie,
        alertesActives: catalogue.alertesParIngredient.get(regle.ingredient.id) ?? [],
        seuilsActifs: catalogue.seuilsParIngredient.get(regle.ingredient.id) ?? [],
        claimsValides: catalogue.claimsValidesParRegle.get(regle.regleId) ?? false,
        declencheur: catalogue.declencheur,
      }));
    }
  }
  return verdicts;
}
