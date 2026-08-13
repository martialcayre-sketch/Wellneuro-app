import {
  CANAL_PLAINTE,
  evaluerPriorites,
  reglesPrioritesValidees,
  tablePrioritesSignee,
} from '@/lib/clinical/priorityRulesV1';
import type { ReponseOrientation } from '@/lib/clinical/orientationEngine';
import type { OrientationDeclencheur } from '@/lib/clinical/orientationRulesV1';
import { scoresRecalculesPourRaisonnement } from '@/lib/clinical/orientationService';
import { buildClinicalReview } from './clinicalReview';
import { buildClinicalSnapshot } from './clinicalSnapshot';
import { buildDecisionCard } from './decisionCard';
import type {
  AbstentionAssessment,
  ClinicalReview,
  ClinicalSnapshot,
  ConfirmedAssessmentEpisode,
  DecisionCard,
  DecisionPriorityCandidate,
  DecisionPrioritySelection,
  PatientContext,
  QuestionnaireResponseInput,
} from './types';

// CONSTRUCTION DE LA CHAÎNE C1 — snapshot → revue → carte de décision.
//
// UN SEUL CHEMIN, DEUX APPELANTS ([[D-054]], arbitrage 6). Le cockpit
// (`POST /api/praticien/cockpit`) construit la chaîne ; les deux points de
// persistance la RECONSTRUISENT pour comparer les empreintes soumises
// (`verifierChaineC1.ts`). Deux constructions divergentes rendraient 409 sur une
// carte honnête — c'est exactement pourquoi ce module existe plutôt qu'un second
// bloc de code recopié dans le vérificateur.
//
// CE MODULE NE FAIT PAS : ni authentification, ni contrôle d'appartenance, ni
// lecture base, ni journalisation. Mêmes frontières qu'`orientationService` :
// l'appelant les porte, et il les porte AVANT.

/**
 * La plainte que le patient déclare le plus intensément, telle que `Q_MOD_03`
 * la publie.
 *
 * Ce n'est PAS une sortie de règle : c'est la restitution d'une bande déjà
 * publiée par un instrument certifié. Elle n'est donc pas derrière le verrou de
 * signature ([[D-054]], arbitrage 7), et elle ne conclut rien — l'échelle est
 * descriptive, sa source Drive le dit (« questionnaire de suivi longitudinal,
 * sans seuil diagnostique »).
 */
export type PlainteDominante = {
  /** Identifiant du domaine, tel que le catalogue le nomme (`digestion`…). */
  domaine: string;
  /** Libellé français publié par le catalogue (« Digestion »). */
  libelle: string;
  /** Intensité déclarée, de 1 à 10. */
  valeur: number;
  /** Bande d'interprétation publiée, ou `null` si le catalogue n'en sert pas. */
  bande: string | null;
};

export type ChaineC1 = {
  snapshot: ClinicalSnapshot;
  review: ClinicalReview;
  decisionCard: DecisionCard;
  plainteDominante: PlainteDominante | null;
};

export type EntreeChaineC1 = {
  /** Identifiants d'enveloppe — EXCLUS des trois empreintes, par construction. */
  snapshotId: string;
  reviewId: string;
  decisionCardId: string;
  patientId: string;
  /**
   * Horodatage unique de la chaîne : `snapshot.asOf`, `review.createdAt` et
   * `decisionCard.createdAt`. Le cockpit en pose UN SEUL (`new Date()` à la
   * confirmation) et le vérificateur réutilise celui qui a été soumis — ces
   * trois champs entrent dans les empreintes, contrairement aux identifiants.
   */
  horodatage: string;
  episode: ConfirmedAssessmentEpisode;
  patientContext: PatientContext;
  responses: QuestionnaireResponseInput[];
  /**
   * Sélection praticien, ou `null`.
   *
   * LE SEUL CHAMP QUE LE SERVEUR NE PEUT PAS RECALCULER ([[D-054]], arbitrage
   * 5) : c'est un GESTE, pas une dérivation. Le cockpit passe `null` — il
   * confirme un épisode, il ne sélectionne rien. Le vérificateur réinjecte la
   * sélection soumise, que `buildDecisionCard` re-valide entièrement (auteur
   * praticien, candidat réellement classé, décision non bloquée).
   */
  selectionPraticien?: DecisionPrioritySelection | null;
};

/** Un objet de score lisible — typage défensif, le JSON n'est pas garanti. */
type ScoresLus = Record<string, unknown> | null;

type SousScoreLu = { id?: unknown; label?: unknown; total?: unknown; interpretation?: unknown };

/**
 * Dernière passation exploitable par instrument, SCORE RECALCULÉ.
 *
 * RECALCUL À LA LECTURE, jamais le score figé en base : c'est la fermeture
 * qu'`orientationService` a posée le 2026-08-04 et que `preconditionsT0` réutilise
 * — une garde de scoring ajoutée après coup ne touche aucune passation déjà
 * enregistrée. Les cinq motifs d'annulation viennent avec la fonction ; les
 * recopier ici les aurait fait diverger.
 *
 * `statutValidite` n'est pas transporté par `QuestionnaireResponseInput` : la
 * chaîne C1 reçoit des passations DÉJÀ filtrées par
 * `filtrerPassationsExploitables` en amont (cockpit comme vérificateur). Le
 * cinquième motif est donc appliqué avant d'arriver ici, pas ignoré.
 *
 * PÉRIMÈTRE : les réponses INCLUSES dans l'épisode confirmé, et elles seules.
 * C'est ce qui garantit que toute `provenance` produite plus bas désigne une
 * source réellement présente au snapshot — `validateProvenance` jette sinon.
 */
function dernieresParInstrument(
  responses: QuestionnaireResponseInput[],
  episode: ConfirmedAssessmentEpisode,
): Map<string, ReponseOrientation & { responseId: string; scores: ScoresLus }> {
  const inclus = new Set(episode.includedResponseIds);
  const dernieres = new Map<string, ReponseOrientation & { responseId: string; scores: ScoresLus }>();
  for (const response of responses) {
    if (!inclus.has(response.responseId)) continue;
    const courante = dernieres.get(response.questionnaireId);
    // Départage stable : l'horodatage d'abord, l'identifiant ensuite. L'ordre
    // SQL ne l'est pas, et deux passations au même instant produiraient sinon
    // deux chaînes différentes pour un même dossier — donc un 409 sur une carte
    // honnête.
    if (courante && (
      courante.dateReponse > response.observedAt
      || (courante.dateReponse === response.observedAt && courante.responseId >= response.responseId)
    )) continue;
    dernieres.set(response.questionnaireId, {
      idQuestionnaire: response.questionnaireId,
      dateReponse: response.observedAt,
      responseId: response.responseId,
      scores: scoresRecalculesPourRaisonnement(
        response.questionnaireId,
        (response.scoresJson ?? null) as Record<string, unknown> | null,
        new Date(response.observedAt),
      ),
    });
  }
  return dernieres;
}

/** Le canal de plainte rend-il une MESURE — et non un simple objet de score ? */
function canalPlainteMesure(scores: ScoresLus): boolean {
  // Le piège du dépôt, une troisième fois : un objet de score N'EST PAS une
  // mesure. `calculateScore` rend `{scored:false, total:null}` sur une passation
  // vide, et le moteur `plaintes_actuelles` rend `total: null` dès qu'un des
  // sept domaines manque. Tester `scores !== null` dirait « mesuré » d'un
  // questionnaire sans une seule réponse (`DC-24`). Même prédicat que
  // `passationExploitable` dans `preconditionsT0.ts`.
  if (scores === null) return false;
  if (scores.scored === false) return false;
  return typeof scores.total === 'number';
}

/**
 * Le domaine de plainte le plus intense, ou `null`.
 *
 * DÉPARTAGE, ET IL EST TECHNIQUE — dit comme tel ([[D-054]], arbitrage 8). À
 * valeur égale, le premier domaine dans l'ordre où le catalogue les publie
 * l'emporte (fatigue, douleurs, digestion, surpoids, sommeil, moral, mobilité).
 * Ce n'est PAS une hiérarchie clinique : c'est le seul moyen de rendre
 * l'affichage stable d'une lecture à l'autre. Un départage clinique — quelle
 * plainte prime à intensité égale — est un arbitrage praticien qui n'a pas été
 * rendu.
 */
export function plainteDominanteDepuisScores(scores: ScoresLus): PlainteDominante | null {
  if (scores === null) return null;
  const sousScores = scores.subScores;
  if (!Array.isArray(sousScores)) return null;
  let dominante: PlainteDominante | null = null;
  for (const brut of sousScores as SousScoreLu[]) {
    // Un domaine sans réponse rend `total: null` : il n'entre pas. Une absence
    // n'est ni un zéro ni une plainte faible (`DC-24`).
    if (typeof brut?.total !== 'number' || typeof brut.id !== 'string') continue;
    if (dominante !== null && brut.total <= dominante.valeur) continue;
    const interpretation = brut.interpretation as { label?: unknown } | null | undefined;
    dominante = {
      domaine: brut.id,
      libelle: typeof brut.label === 'string' ? brut.label : brut.id,
      valeur: brut.total,
      bande: typeof interpretation?.label === 'string' ? interpretation.label : null,
    };
  }
  return dominante;
}

const LIMITATION_PROPOSITION =
  'Une priorité candidate est une proposition hiérarchisée soumise au praticien : elle n’est ni un diagnostic, ni une prescription.';
const LIMITATION_CLASSEMENT =
  'Le classement est déterministe et sert la lisibilité : il ne mesure ni la gravité, ni l’urgence.';
const LIMITATION_OBJECTIF =
  'L’objectif prioritaire déclaré par le patient est affiché au praticien ; il n’entre pas dans le déclenchement de cette règle.';

/**
 * Évaluation EXPLICITE de l'abstention ([[D-054]]).
 *
 * Table non signée ⇒ `undefined` : `buildClinicalReview` retombe alors sur son
 * `not_evaluated` habituel, avec sa propre limitation (« aucune règle
 * d'abstention cliniquement validée n'est fournie »). C'est le comportement
 * d'aujourd'hui, laissé intact.
 *
 * DEUX MOTIFS DE `required`, ET AUCUN N'AJOUTE DE POINTS (`DC-12`, `DC-23`) :
 * un constat de sécurité, qui prime sur tout score et appelle une revue ; ou un
 * canal de plainte non mesurable sur l'épisode confirmé, auquel cas la table ne
 * peut RIEN évaluer et l'absence de donnée ne devient pas une normalité
 * (`DC-24`, `DC-25`).
 *
 * DETTE BLOQUANTE POUR LA SIGNATURE ([[D-054]], relevée en revue le
 * 2026-08-12). CETTE PROCÉDURE VIT ICI, hors de `PRIORITY_RULES_V1` et donc hors
 * de `PRIORITY_RULES_SHA256` : la table signée décrit ce qui DÉCLENCHE une
 * priorité, elle ne décrit pas ce qui commande l'abstention. Signer
 * `PRIORITY_RULES_METADATA` en l'état activerait donc un verdict clinique
 * qu'aucune ligne signée ne décrit (`DC-17`, `DC-26`). Avant toute signature,
 * cette procédure doit entrer dans le périmètre signé — dans la table, ou dans
 * un document signable qu'elle référence.
 */
function evaluerAbstention(input: {
  ruleIds: string[];
  safetyFindings: number;
  canalMesure: boolean;
}): AbstentionAssessment | undefined {
  if (input.ruleIds.length === 0) return undefined;
  const limitations = [
    'L’abstention porte sur la préparation de la décision par l’outil ; elle ne conclut rien sur le patient.',
  ];
  if (input.safetyFindings > 0) {
    return {
      status: 'required',
      ruleIds: input.ruleIds,
      limitations: [
        ...limitations,
        'Au moins un constat de sécurité est présent : il prime sur tout score et exige une revue praticien avant toute priorité.',
      ],
    };
  }
  if (!input.canalMesure) {
    return {
      status: 'required',
      ruleIds: input.ruleIds,
      limitations: [
        ...limitations,
        `Le canal de plainte (${CANAL_PLAINTE}) ne rend aucune mesure sur l’épisode confirmé : la table des priorités ne peut pas être évaluée, et une donnée absente n’est ni nulle ni normale.`,
      ],
    };
  }
  // CE QUE CETTE PHRASE DIT EXACTEMENT, et ce qu'elle se garde de promettre.
  //
  // Une première rédaction affirmait « aucun constat de sécurité n'est
  // présent » : un négatif qui n'a JAMAIS été évalué, puisque aucun producteur
  // de constat de sécurité déterministe n'existe dans le dépôt (`safetyFindings`
  // est câblé à 0 plus bas). Servir au praticien l'absence d'un contrôle comme
  // le résultat d'un contrôle est précisément ce que la doctrine interdit
  // (`DC-24`). La phrase dit donc l'état du dispositif, pas l'état du patient.
  return {
    status: 'not_required',
    ruleIds: input.ruleIds,
    limitations: [
      ...limitations,
      'Aucun constat de sécurité n’est produit par le moteur déterministe — aucun producteur n’existe à ce jour —'
      + ` et le canal de plainte (${CANAL_PLAINTE}) rend une mesure sur l’épisode confirmé :`
      + ' la table des priorités ne retient aucun motif d’abstention.',
    ],
  };
}

/**
 * Construit la chaîne C1 complète pour un épisode T0 confirmé.
 *
 * Fonction déterministe : mêmes entrées ⇒ mêmes empreintes. C'est la propriété
 * dont dépend tout le recalcul serveur.
 */
export function construireChaineC1(input: EntreeChaineC1): ChaineC1 {
  const snapshot = buildClinicalSnapshot({
    snapshotId: input.snapshotId,
    patientId: input.patientId,
    asOf: input.horodatage,
    assessmentEpisode: input.episode,
    patientContext: input.patientContext,
    responses: input.responses,
  });

  const dernieres = dernieresParInstrument(input.responses, input.episode);
  const canal = dernieres.get(CANAL_PLAINTE);
  const plainteDominante = canal ? plainteDominanteDepuisScores(canal.scores) : null;

  const regles = reglesPrioritesValidees();
  const abstention = evaluerAbstention({
    ruleIds: regles.map(regle => regle.ruleId),
    // Le moteur déterministe ne produit AUCUN constat de sécurité aujourd'hui —
    // la liste est donc vide, et c'est écrit plutôt que supposé. Le terme est
    // câblé pour que le chemin existe le jour où un producteur en pose un ; le
    // présenter comme une protection active en production serait faux.
    safetyFindings: 0,
    canalMesure: canalPlainteMesure(canal?.scores ?? null),
  });

  const review = buildClinicalReview({
    reviewId: input.reviewId,
    createdAt: input.horodatage,
    snapshot,
    rules: regles,
    ...(abstention ? { findings: { abstention } } : {}),
  });

  const candidats = construireCandidats({
    dernieres,
    plainteDominante,
    priorityGoal: input.patientContext.priorityGoal,
    // `review.abstention` et non l'objet local : c'est le statut NORMALISÉ, celui
    // que `buildClinicalReview` a pu ramener à `not_evaluated` faute de règle
    // validée. Lire l'intention plutôt que le verdict laisserait produire des
    // candidats sous une abstention que la revue n'a pas retenue.
    abstention: review.abstention.status,
  });
  const decisionCard = buildDecisionCard({
    decisionCardId: input.decisionCardId,
    createdAt: input.horodatage,
    snapshot,
    review,
    candidates: candidats,
    // Le rang 1 est PROPOSÉ, jamais sélectionné. `buildDecisionCard` le remet à
    // `null` dès que la décision est bloquée ou qu'aucun candidat n'existe.
    proposedMainPriorityId: candidats[0]?.candidateId ?? null,
    selectedMainPriority: input.selectionPraticien ?? null,
  });

  return { snapshot, review, decisionCard, plainteDominante };
}

/**
 * Les priorités candidates, classées — ou RIEN quand la table n'est pas signée.
 *
 * `origin: 'engine'` toujours : `buildDecisionCard` refuse toute autre valeur, et
 * l'interdit du lot est explicite — aucun candidat produit par le LLM.
 */
function construireCandidats(input: {
  dernieres: Map<string, ReponseOrientation & { responseId: string }>;
  plainteDominante: PlainteDominante | null;
  priorityGoal: string | null;
  abstention: AbstentionAssessment['status'];
}): DecisionPriorityCandidate[] {
  if (!tablePrioritesSignee()) return [];
  // UNE ABSTENTION REQUISE FAIT TAIRE LA TABLE (`DC-25`) — relevé en revue le
  // 2026-08-12.
  //
  // Le cas qui l'impose n'est pas théorique : `Q_MOD_03` amputé d'un seul
  // domaine rend `total: null`, ce qui déclare le canal de plainte non
  // mesurable — et pourtant les six domaines répondus, eux, portaient encore
  // leurs valeurs. La table se déclenchait donc sur un recueil que la revue
  // venait de déclarer insuffisant, et la carte servait des priorités à côté
  // d'une abstention qui disait de ne pas conclure.
  //
  // `buildDecisionCard` aurait bien remis `proposedMainPriorityId` à `null` (la
  // décision est `blocked`), mais il aurait GARDÉ les candidats classés : le
  // praticien aurait lu une liste hiérarchisée sous un bandeau de suspension.
  // Données insuffisantes ⇒ on réduit la conclusion, on ne l'habille pas.
  if (input.abstention !== 'not_required') return [];
  const declenchees = evaluerPriorites(input.dernieres);

  // CLASSEMENT — la plainte dominante d'abord, la priorité intrinsèque de la
  // table ensuite, l'identifiant en dernier ressort. Le troisième terme n'est
  // pas décoratif : sans lui, deux règles de même priorité s'ordonneraient selon
  // l'ordre de la table, qu'une édition future déplacerait en silence.
  const classees = [...declenchees].sort((gauche, droite) => {
    const rangPlainte = (candidate: typeof gauche) => (
      candidate.regle.domainePlainte !== null
      && candidate.regle.domainePlainte === input.plainteDominante?.domaine
        ? 0 : 1
    );
    return rangPlainte(gauche) - rangPlainte(droite)
      || gauche.regle.priorite - droite.regle.priorite
      || (gauche.regle.id < droite.regle.id ? -1 : gauche.regle.id > droite.regle.id ? 1 : 0);
  });

  return classees.map((declenchee, index) => {
    const instruments = new Set(
      declenchee.regle.declencheurs
        .filter((declencheur): declencheur is Exclude<OrientationDeclencheur, { type: 'drapeau' }> =>
          declencheur.type !== 'drapeau')
        .map(declencheur => declencheur.idQuestionnaire),
    );
    const responseIds = [...instruments]
      .map(idQuestionnaire => input.dernieres.get(idQuestionnaire)?.responseId)
      .filter((responseId): responseId is string => typeof responseId === 'string');
    return {
      candidateId: `priority:${declenchee.regle.id}`,
      origin: 'engine' as const,
      label: declenchee.regle.libelle,
      // Rang SÉQUENTIEL, jamais la priorité de la table : `buildDecisionCard`
      // exige des rangs uniques, et deux règles de même priorité intrinsèque le
      // feraient jeter.
      rank: index + 1,
      // `à_documenter`, la plus réservée des quatre valeurs, et toujours elle :
      // une règle déterministe ne produit aucune gradation de confiance
      // ([[D-041]]). Le champ est obligatoire au contrat C1 ; il dit ici que le
      // praticien reste celui qui documente.
      confidence: 'à_documenter' as const,
      ruleId: declenchee.regle.id,
      rationale: `${declenchee.regle.motif} Déclencheur atteint — ${declenchee.conditions.join(' ; ')}.`,
      // Uniquement des sources RÉELLEMENT présentes au snapshot : `dernieres` est
      // bornée aux réponses incluses dans l'épisode confirmé.
      provenance: { responseIds, needIds: declenchee.regle.needIds, clinicalObjectCodes: [] },
      limitations: [
        ...declenchee.regle.limitations,
        LIMITATION_PROPOSITION,
        LIMITATION_CLASSEMENT,
        ...(input.priorityGoal ? [LIMITATION_OBJECTIF] : []),
      ],
    };
  });
}
