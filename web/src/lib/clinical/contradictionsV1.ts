import type {
  ContradictionClaimRef,
  FormeContradiction,
  ImportanceContradiction,
} from './contradictionFinding';
import { sha256 } from './corpusSyntheseV1';
import type { OrientationDeclencheur } from './orientationRulesV1';

// Table de règles de contradictions — LOT-01 de la campagne chaîne T0.
//
// Même patron que `orientationRulesV1.ts` : table versionnée, relue en PR,
// claims épinglés par paire immuable, signature et SHA. C'est du CODE, jamais
// du runtime dynamique (`DC-26` : les règles cliniques vivent dans le registre,
// pas seulement dans le code — la table EST ce registre côté dépôt).
//
// UNE SEULE RÈGLE EN V1 — [[D-042]]. La descente prédicat par prédicat des
// trois règles de la spec (`DOSSIER_REGLES_LOT-01.md`) a établi qu'elles ne
// sont pas dans le même état : C-STR est adossée aux bandes publiées de ses
// deux instruments, C-SOM sélectionnerait des patients introvertis qui dorment
// bien, et C-ALI suppose un drapeau d'anamnèse qui n'existe pas. Une règle
// signée juste vaut mieux que trois dont deux produisent des vigilances
// fausses. Les motifs des deux règles écartées sont INSCRITS DANS CETTE TABLE
// ([[D-042]] en fait un livrable) : les enterrer dans un commit les aurait
// rendus invisibles au prochain qui voudra « compléter » la V1.
//
// `validationExterne: false` À LA LIVRAISON. Écrire une règle et la signer sont
// deux gestes distincts — même discipline que `ORIENTATION_METADATA` et que
// `CORPUS_CLINIQUE_METADATA`. Le praticien signe après relecture clinique.

/**
 * Le vocabulaire de déclencheurs est celui de la table d'orientation, DÉLIBÉRÉMENT.
 *
 * Ce ne sont pas deux tables qui se ressemblent : c'est la même question posée à
 * un score — « cet axe est-il dans cette plage ? ». Le partager fait que les
 * deux moteurs échouent de la même façon sur les mêmes défauts : recueil
 * incomplet, sous-score absent, axe non mesuré. Un second vocabulaire aurait
 * fatalement dérivé sur `DC-24` (une donnée absente n'est jamais zéro), et la
 * dérive aurait été silencieuse.
 */
export type ContradictionDeclencheur = OrientationDeclencheur;

export type ContradictionRule = {
  id: string;
  /** Seules les règles `publiee` sont évaluées par le moteur. */
  statut: 'brouillon' | 'publiee' | 'suspendue';
  forme: FormeContradiction;
  /** ET logique : tous les déclencheurs doivent être atteints. */
  declencheurs: ContradictionDeclencheur[];
  /**
   * Formulation NEUTRE servie au praticien. Pas de causalité (`DC-27`), pas de
   * diagnostic (`DC-31`) : ce qui est constaté, et rien de plus.
   */
  description: string;
  importance: ImportanceContradiction;
  hypotheses: string[];
  actionSuggeree: string;
  /**
   * Claims à l'appui, jamais vide — le moteur ignore une règle sans claim, comme
   * `evaluerOrientation` le fait déjà. Contrôlés sur la production par
   * `prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql`.
   */
  justificationClaims: ContradictionClaimRef[];
  /** Ce que ce constat ne dit pas (`DC-14`, `DC-25`, `DC-28`). */
  limitations: string[];
  /**
   * `DC-37` — quand la population d'une règle recoupe celle d'une autre règle
   * publiée, la justification est PORTÉE PAR LA RÈGLE, pas supposée par qui la
   * lit. Deux sorties simultanées à l'écran doivent être défendables.
   */
  recoupementJustifie?: string;
};

/**
 * Une règle de la spec ÉCARTÉE de la V1, avec son motif et la condition exacte
 * de son retour. [[D-042]] en fait un livrable de la table : une règle retirée
 * sans motif lisible revient toujours, à l'identique, par la main de quelqu'un
 * qui ignorait pourquoi elle était partie.
 */
export type ContradictionRegleEcartee = {
  id: string;
  motif: string;
  /** Ce qui devrait exister pour que la règle soit écrivable. */
  conditionDeRetour: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// LA TABLE — une règle.
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRADICTIONS_RULES_V1: ContradictionRule[] = [
  {
    id: 'C-STR',
    statut: 'publiee',
    forme: 'DISCORDANCE',
    // LES TROIS CHIFFRES SONT DES BANDES PUBLIÉES, aucun n'est un arbitrage.
    //
    // `<= 8` est exactement la bande basse de l'axe `ADAPTATION_STRESS`, dont la
    // grille est 0-8 « Adaptation perturbée », 10-17 « Adaptation insuffisante »,
    // 18-24 « Adaptation satisfaisante » (`orientationRulesV1.ts`, en-tête de
    // `R2-STR-01`). `D <= 4` et `S <= 7` sont les bandes « Normal » publiées du
    // DASS-21 (`questions.ts`, interprétation de `Q_STR_04`). `DC-19` est tenue
    // sans réserve : aucun de ces trois nombres n'est inventé ni déplacé.
    //
    // LE TROU À 9 EST LAISSÉ OUVERT, DÉLIBÉRÉMENT. Les bandes de l'axe ne
    // couvrent pas la valeur 9. L'étendre à `<= 9` aurait fermé le trou au prix
    // d'un point sans source. Le patient à 9 n'est pas laissé sans rien :
    // `R2-STR-01` le couvre déjà (`<= 17`) et lui propose le PSS-10 — il perd la
    // vigilance de discordance, pas l'orientation.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_01', sousScore: 'ADAPTATION_STRESS', operateur: '<=', valeur: 8 },
      { type: 'comparaison', idQuestionnaire: 'Q_STR_04', sousScore: 'D', operateur: '<=', valeur: 4 },
      { type: 'comparaison', idQuestionnaire: 'Q_STR_04', sousScore: 'S', operateur: '<=', valeur: 7 },
    ],
    description:
      "Signal fonctionnel non confirmé par les instruments spécifiques — à clarifier en entretien : l'adaptation au stress déclarée est perturbée alors que le DASS-21 situe la dépression et le stress dans la bande « Normal ».",
    // POURQUOI `useful_not_urgent`, ET PAS LES DEUX AUTRES ([[D-048]]).
    // Cette valeur est restée NUE dans ce fichier jusqu'au 2026-08-12 : aucun
    // motif écrit, ni ici, ni dans [[D-041]], [[D-042]], [[D-046]], ni dans le
    // dossier de règles candidates. Le défaut était l'absence de justification,
    // pas la valeur — elle est confirmée, et voici pourquoi.
    //
    // PAS `critical_for_decision` : le libellé servi au praticien est
    // « Critique pour décider », et C-STR ne bloque aucune décision — elle
    // demande une clarification en entretien. `DC-23` ne RÉSERVE aucun niveau
    // (rédaction corrigée après revue) ; elle pose que les red flags restent
    // prioritaires sans se compenser avec aucun score. Hisser au niveau le plus
    // haut un constat qui n'est pas un signal de sécurité ([[D-046]])
    // brouillerait cette hiérarchie le jour où un vrai red flag arrive.
    //
    // PAS `optional` : la règle prescrit elle-même une clarification en
    // entretien (voir `description` et `actionSuggeree`). « Optionnelle » la
    // contredirait dans le même objet.
    //
    // CE QUE CETTE VALEUR N'EST PAS : un degré de vérité. C'est une PRIORITÉ —
    // elle ordonne ce que le praticien regarde d'abord, jamais ce qui est vrai
    // (`DC-29`, garde non négociable de [[D-041]]). Et elle n'anticipe pas le
    // classement praticien 1/2/3 de `DC-33`, que l'audit confie au LOT-04.
    importance: 'useful_not_urgent',
    hypotheses: [
      "Une charge de stress réelle que les échelles de dépression et de stress ne captent pas — les symptômes de stress ne corrèlent pas à la gravité de la charge allostatique (WN-CL-0238-002).",
      "Une difficulté d'adaptation circonscrite à un domaine de vie, sans retentissement thymique au moment de la passation.",
      "Une passation du DASS-21 antérieure ou postérieure à l'épisode que l'axe d'adaptation reflète.",
    ],
    actionSuggeree:
      "Clarifier en entretien ce que recouvre l'adaptation perturbée, avant toute conclusion tirée de l'un ou l'autre instrument.",
    // Le claim dit exactement ce que cette règle constate : l'absence de
    // corrélation entre ce que le patient rapporte et la charge réelle est
    // PRÉCISÉMENT ce qui rend la discordance informative plutôt qu'aberrante.
    //
    // Il est `prescriptif = false`, et c'est légitime ici — [[D-046]] : une règle
    // de contradiction CONSTATE, elle ne prescrit pas. Exiger `prescriptif` d'un
    // claim descriptif était une erreur de catégorie héritée de la table
    // d'orientation, dont chaque règle suggère une exploration.
    justificationClaims: [{ claimId: 'WN-CL-0238-002', versionClaim: 'v1.0' }],
    limitations: [
      "Deux instruments déclaratifs : la discordance dit qu'ils ne concordent pas, jamais lequel a raison.",
      "Aucune mesure biologique n'entre ici — la charge allostatique n'est ni mesurée ni inférée.",
      "Un questionnaire isolé ne suffit pas à conclure (DC-28) ; deux qui se contredisent encore moins.",
    ],
    // `DC-37` — la population de C-STR est un SOUS-ENSEMBLE de celle de
    // `R2-STR-01` (`ADAPTATION_STRESS <= 17`). Les deux sorties coexisteront
    // donc à l'écran pour un même patient, et c'est voulu : elles ne disent pas
    // la même chose. `R2-STR-01` propose une MESURE (le PSS-10) ; C-STR nomme
    // une CONTRADICTION entre deux mesures déjà faites. Supprimer l'une pour
    // éviter le doublon ferait perdre soit l'instrument à administrer, soit le
    // signal que les instruments existants se contredisent.
    recoupementJustifie:
      "Recoupe R2-STR-01 (ADAPTATION_STRESS <= 17), dont la population englobe celle-ci. Coexistence voulue : R2-STR-01 propose une mesure, C-STR nomme une contradiction entre deux mesures déjà faites.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CE QUI N'EST PAS DANS LA TABLE, ET POURQUOI — [[D-042]].
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRADICTIONS_REGLES_ECARTEES_V1: ContradictionRegleEcartee[] = [
  {
    id: 'C-SOM',
    motif:
      "L'axe ME du DNST (Q_INF_03) est titré « Mélatonine — Rythme ET SOCIALISATION » et porte six items de sociabilité sur dix (ME1, ME2, ME5, ME6, ME8, ME9), pesant jusqu'à 24 points sur 40. Comme la règle exige que le PSQI, l'Epworth et le Berlin soient rassurants, elle ne sélectionnerait pas une discordance de sommeil : elle sélectionnerait, systématiquement et non au hasard, des patients introvertis qui dorment bien. C'est le cas que DC-09 et DC-28 existent pour attraper.",
    conditionDeRetour:
      "Un sous-score de RYTHME seul (ME3, ME4, ME7, ME10 — plafond 16), qui n'existe pas au catalogue : score nouveau, donc versionScore et D-xxx propres, hors de ce lot.",
  },
  {
    id: 'C-ALI',
    motif:
      "Le prédicat « restriction déclarée (drapeau anamnèse) » n'a aucun support direct. Des dix clés de DrapeauxAnamnese, les deux plus proches ne déclarent ni l'une ni l'autre une éviction : variationPoids est proche du sujet sans le couvrir, et intolerancesAlimentaires déclare une CAUSE SUPPOSÉE, pas un comportement — un patient peut se déclarer intolérant sans rien évincer, et évincer sans se déclarer intolérant. Substituer l'un ou l'autre serait l'extrapolation que DC-14 interdit.",
    conditionDeRetour:
      "Un drapeau d'anamnèse « restriction déclarée » dans le recueil. Il modifie la collecte, pas la synthèse : autre lot. Le seuil >= 7 de la plainte surpoids, lui, est bien sourcé (bande « Intensité élevée » de Q_MOD_03, déjà utilisée au même seuil par R2-NEU-01).",
  },
];

export type ContradictionsMetadata = {
  version: string;
  validationExterne: boolean;
  dateValidation: string | null;
  claimsSource: ContradictionClaimRef[];
};

export const CONTRADICTIONS_METADATA: ContradictionsMetadata = {
  version: 'contradictions-nnpp2-v1',
  // SIGNÉE le 2026-08-15 (arbitrage praticien explicite, [[D-061]]), et
  // conjointement à `stopRulesV1` — sans quoi l'extinction tournerait sans le
  // frein de [[D-053]] §5. Le drapeau `WN_ENABLE_CONTRADICTIONS_NNPP2` reste un
  // geste d'exploitation distinct : signer n'allume pas.
  validationExterne: true,
  dateValidation: '2026-08-15T00:00:00.000Z',
  // Les claims épinglés par les règles de cette table. Le contrat de fraîcheur
  // les contrôle sur la production, et `claimsEpinglesFraicheur.guard.test.ts`
  // refuse que cette liste diverge de celle du contrat.
  claimsSource: [{ claimId: 'WN-CL-0238-002', versionClaim: 'v1.0' }],
};

export const CONTRADICTIONS_RULES_SHA256 = sha256(JSON.stringify(CONTRADICTIONS_RULES_V1));
