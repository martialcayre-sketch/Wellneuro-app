import type { OrientationDeclencheur } from './orientationRulesV1';
import { sha256 } from './corpusSyntheseV1';

// Table des RÈGLES D'ARRÊT NNPP2 — [[D-053]], campagne « chaîne T0
// opérationnelle », LOT-03.
//
// Ce que la table dit, et qu'aucune autre ne dit : « ces instruments-là sont
// rassurants, donc telles explorations n'ont plus lieu d'être proposées
// AUJOURD'HUI ». La table d'orientation propose ; celle-ci retient.
//
// UNE EXTINCTION EST UN ACTE PLUS EXIGEANT QU'UNE PROPOSITION (D-053, arbitrage
// 1). Une proposition superflue coûte une passation ; une extinction indue coûte
// une exploration qui n'aura pas lieu, et le praticien ne voit pas ce qui ne
// s'affiche pas. Une grille descriptive, un item auto-déclaré isolé, un indice
// non validé psychométriquement et un instrument dont le moteur ne publie pas
// ses comptes de complétude peuvent proposer ; aucun ne peut éteindre.
//
// NON SIGNÉE À LA LIVRAISON — même discipline que `contradictionsV1.ts` et que
// la table d'orientation à sa V1 : écrire une table et la signer sont deux
// gestes distincts, et le second est un acte PRATICIEN. Tant que
// `validationExterne` est `false`, `orientationService` ne passe RIEN au moteur :
// aucune extinction n'est produite et `dejaRepondu` reste décoratif. La
// production ne change pas au merge.
//
// LE VOCABULAIRE EST CELUI DE LA TABLE D'ORIENTATION, DÉLIBÉRÉMENT. Les
// déclencheurs sont des `OrientationDeclencheur` évalués par `evaluerDeclencheur`
// — la même fonction, pas une copie. Les gardes qui vivent là-bas (recueil
// incomplet, sous-score absent, plancher jamais comparé numériquement, `DC-24`)
// valent donc ici sans être réécrites. Le chemin du PLANCHER est fermé par
// construction : un plancher borne toujours par le bas, il ne peut donc jamais
// garantir une zone favorable.
//
// CE QUE CE PARTAGE NE SUFFIT PAS À FERMER, ET LA GARDE QU'IL A FALLU AJOUTER.
// La garde générale retire la mesure d'un recueil qui se DIT incomplet ; elle
// ne peut rien dire d'un moteur qui ne publie aucun compte. Le moteur d'arrêt
// porte donc SA garde : il refuse d'éteindre sur tout instrument dont la
// complétude n'est pas lisible OU dit un manquant, lue AU GRAIN DU DÉCLENCHEUR
// — l'axe visé quand il y en a un, la racine sinon (`orientationEngine.ts`,
// `comptesDuPorteurVise`, [[D-055]] arbitrage 3). Le grain n'est pas un
// détail : le DASS-21 (`subscore`) ne publie ses comptes que par axe, et une
// garde qui ne lisait que la racine refusait d'éteindre même sur une passation
// complète.
//
// À CONNAÎTRE AVANT DE SIGNER — mis à jour au LOT-08 ([[D-055]]), après que la
// version précédente de ce bloc est devenue fausse :
//
//   1. Le verrou historique est LEVÉ : `group_majority` publie ses comptes de
//      recueil depuis le LOT-08 (`questions.ts`, [[D-055]]), et sa bande n'est
//      servie que sur recueil complet. STOP-STR est démontrée mordante sur un
//      dossier rassurant complet, et muette sur recueil partiel, par le banc
//      de bout en bout de `stopRulesV1.test.ts` (vrai `calculateScore`, cette
//      table même, configuration réelle du service). Signer cette table est
//      désormais le geste qui allume l'extinction ET l'exclusion
//      `dejaRepondu` — les deux, ensemble, par le même verrou.
//   2. L'ORDRE DES SIGNATURES N'EST GARDÉ PAR RIEN, et il a un sens clinique :
//      la borne « une contradiction ouverte interdit l'extinction »
//      ([[D-053]] §5) ne peut mordre que si le système de contradictions est
//      ACTIF (drapeau `WN_ENABLE_CONTRADICTIONS_NNPP2` ET table
//      `contradictionsV1` signée). Signer la table d'arrêt seule fait tourner
//      l'extinction sans ce frein — aucun constat n'existe, donc rien n'est
//      « ouvert ». C'est la hiérarchie de verrous que [[D-055]] assume, mais
//      le signataire doit la choisir en connaissance, pas la subir.

export type StopRuleClaimRef = {
  claimId: string;
  versionClaim: string;
};

export type StopRule = {
  id: string;
  /** Seules les règles `publiee` sont évaluées par le moteur. */
  statut: 'brouillon' | 'publiee' | 'suspendue';
  /** ET logique : tous les déclencheurs doivent être atteints. */
  declencheurs: OrientationDeclencheur[];
  /**
   * Identifiants de RÈGLES d'orientation éteintes — jamais des cibles.
   *
   * La distinction porte tout l'arbitrage : une même cible peut être motivée par
   * des règles d'axes différents. Le Cungi (`Q_STR_03`) est proposé par
   * `R2-STR-02` (axe stress) ET par `R-SOM-01` (axe sommeil, priorité 2).
   * Éteindre par cible le ferait disparaître d'un axe qui n'a rien demandé —
   * c'est la même objection qui fait renoncer à éteindre le HAD (`D-053`,
   * arbitrage 3, `DC-30`).
   */
  reglesEteintes: string[];
  /** Phrase française servie au praticien, à côté du libellé générique. */
  motif: string;
  /**
   * Claims VALIDÉS à l'appui. Jamais vide : une règle d'arrêt sans claim ne
   * serait pas traçable jusqu'à sa source, et le moteur l'ignore.
   */
  justificationClaims: StopRuleClaimRef[];
};

export type StopRuleEcartee = {
  id: string;
  motif: string;
  conditionDeRetour: string;
};

// Ré-exporté depuis un module feuille : un composant client a besoin de ce
// libellé, et il ne doit pas tirer `crypto` ni le corpus clinique dans son
// bundle pour l'obtenir. Voir l'en-tête de `stopRulesLibelles.ts`.
export { LIBELLE_EXTINCTION } from './stopRulesLibelles';

export const STOP_RULES_V1: StopRule[] = [
  {
    id: 'STOP-STR',
    statut: 'publiee',
    // CE QUI PORTE LE CLAIM, ET CE QUI NE FAIT QUE RESSERRER.
    //
    // La spécification du lot écrivait cette règle sur « DASS + Cungi
    // rassurants ». La lecture de `rag_corpus_claims` en production le
    // 2026-08-12 (8 224 claims VALIDE et actifs) l'a corrigée : ni le DASS-21 ni
    // le Cungi ne portent de claim d'EXTINCTION — le corpus n'en publie que les
    // bandes. La seule échelle de stress dont le corpus attache une CONDUITE à
    // la bande rassurante est le questionnaire SIIN (`Q_STR_01`) :
    // `WN-CL-0051-033`, prescriptif, recommande d'« orienter vers les conseils
    // de vie antistress » sous 4, et `WN-CL-0051-030` qualifie ce niveau de
    // « rassurant relevant de l'hygiène de vie ». La bande voisine donne son
    // sens à celle-ci : `WN-CL-0051-031` réserve le « regard physiopathologique »
    // à l'intervalle 5-14. C'est cette hiérarchie-là — hygiène de vie plutôt
    // qu'exploration — que la règle applique ; elle ne l'invente pas.
    //
    // Le DASS-21 et le Cungi restent des conditions ADDITIONNELLES. Leurs bandes
    // sont publiées par le corpus (`WN-CL-0127-029`, `WN-CL-0127-030`,
    // `WN-CL-0051-019`) et les exiger rend l'extinction plus RARE : c'est le sens
    // du fail-closed. Conséquence assumée et non regrettée : un dossier où l'un
    // des trois manque n'éteint rien — un déclencheur non atteint sur un
    // instrument absent, jamais une absence lue comme une normalité (`DC-24`).
    //
    // L'AXE `D` DU DASS N'ENTRE PAS. C'est l'axe humeur ; l'exiger reviendrait à
    // faire dépendre l'extinction du stress d'un axe que cette règle n'éteint
    // pas, et rapprocherait la règle du HAD auquel `D-053` renonce.
    //
    // UNE IMPRÉCISION DE LA SOURCE, DITE PLUTÔT QUE LISSÉE. Le catalogue note
    // sur `Q_STR_01` que « les seuils 4 et 15 ne sont pas explicitement couverts
    // par la source Drive » et que 4 a été rattaché aux conseils antistress par
    // harmonisation. La bande citée ici englobe donc la valeur 4, que le claim
    // (« un score total INFÉRIEUR à 4 ») ne couvre pas. L'écart porte sur un
    // point de la grille, dans le sens le plus favorable — c'est le genre de
    // détail qu'une signature doit voir, pas découvrir.
    //
    // LES BANDES SONT CITÉES PAR LEUR LIBELLÉ, PAS PAR UN NOMBRE. Aucun seuil
    // nouveau n'entre dans le dépôt par cette table (`DC-19`, `DC-20`) : chaque
    // déclencheur nomme la bande que `questions.ts` publie déjà. Un libellé qui
    // dériverait ferait taire la règle sans rien casser — c'est le banc
    // anti-dérive de `stopRulesV1.test.ts` qui le rattrape.
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_STR_01', zone: { type: 'interpretation', labels: ['Oriente vers les conseils de vie antistress'] } },
      { type: 'zone', idQuestionnaire: 'Q_STR_04', sousScore: 'S', zone: { type: 'interpretation', labels: ['Normal'] } },
      { type: 'zone', idQuestionnaire: 'Q_STR_04', sousScore: 'A', zone: { type: 'interpretation', labels: ['Normal'] } },
      { type: 'zone', idQuestionnaire: 'Q_STR_03', zone: { type: 'interpretation', labels: ['Niveau de stress très bas'] } },
    ],
    // TROIS RÈGLES, ET LE CRITÈRE N'EST PAS L'AXE — c'est ce qui les déclenche.
    //
    // `R2-STR-01`, `R2-STR-02` et `R2-STR-03` partent d'un DÉPISTAGE : l'axe
    // `ADAPTATION_STRESS` de `Q_MOD_01` (un questionnaire de mode de vie) et un
    // burn-out déclaré à l'anamnèse. Elles demandent une mesure spécifique. Les
    // éteindre quand la mesure spécifique est revenue rassurante, c'est dire que
    // la question posée par le dépistage a reçu sa réponse.
    //
    // `R-STR-01` et `R-STR-02` sont d'un autre genre et NE SONT PAS ÉTEINTES :
    // leur déclencheur est le PSS-10 (`Q_STR_02`) en zone défavorable —
    // c'est-à-dire une MESURE, sur l'instrument que cette même table appelle
    // « le questionnaire habituel d'intensité ». STOP-STR ne lit pas le PSS-10.
    // Les éteindre reviendrait à faire taire un instrument spécifique
    // défavorable parce que d'autres sont rassurants, et à servir au praticien
    // un motif faux — « les explorations de l'axe stress n'ont pas d'objet » —
    // devant un stress perçu en zone danger. C'est l'objection qui fait renoncer
    // au HAD ([[D-053]], arbitrage 3), appliquée À L'INTÉRIEUR de l'axe : une
    // discordance se signale, elle ne se supprime pas (`DC-30`). Relevé en revue
    // adversariale du 2026-08-12.
    //
    // `R-SOM-01` propose aussi le Cungi, mais depuis l'axe sommeil : elle n'est
    // pas éteinte non plus.
    reglesEteintes: ['R2-STR-01', 'R2-STR-02', 'R2-STR-03'],
    motif:
      'Le questionnaire SIIN situe le stress dans la bande qui relève des conseils de vie antistress, et le DASS-21 (anxiété, stress) comme le Cungi sont dans leur bande la plus favorable. Les explorations complémentaires de l’axe stress n’ont pas d’objet en l’état.',
    justificationClaims: [
      { claimId: 'WN-CL-0051-019', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0051-030', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0051-033', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0127-029', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0127-030', versionClaim: 'v1.0' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CE QUI N'EST PAS DANS LA TABLE, ET POURQUOI — [[D-053]], arbitrage 4.
//
// Patron `CONTRADICTIONS_REGLES_ECARTEES_V1` : une règle écartée reste lisible
// avec son motif, plutôt que de disparaître dans un ticket que personne ne
// rouvre.
// ─────────────────────────────────────────────────────────────────────────────

export const STOP_RULES_ECARTEES_V1: StopRuleEcartee[] = [
  {
    id: 'STOP-SOM',
    motif:
      "La spécification l'énonce sur « PSQI 5 », valeur à laquelle la table d'orientation SIGNÉE dit que R-SOM-01 doit s'allumer : sa zone couvre la bande `info` du PSQI (5-10, « Troubles du sommeil légers »), délibérément prise au-dessus du seuil de 4 que l'instrument publie. L'écrire reviendrait à éteindre en V1 une règle signée le mois dernier sur la même valeur, sans re-signer la table. Sa seconde jambe, l'agenda du sommeil Q_SOM_09, porte deux réserves propres : son indice /100 est une construction WellNeuro sans validation psychométrique ni cohorte de calibration, et D-052 l'a déjà exclu du rideau T0 au motif qu'un recueil de 21 nuits ne conditionne pas une décision prise à J0 — la même objection vaut en miroir pour une extinction.",
    conditionDeRetour:
      "Un arbitrage praticien qui tranche la valeur de PSQI où l'exploration du sommeil cesse d'être justifiée, et la re-signature de la table d'orientation qu'il emporte.",
  },
  {
    id: 'STOP-APN',
    motif:
      "Son prédicat « absence de symptômes » n'est pas exprimable : le vocabulaire de déclencheurs ne connaît que des tests positifs (zone, comparaison, drapeau), et lire une liste vide comme « absent » est précisément ce que DC-24 interdit — même motif que l'écartement de C-ALI au LOT-01. Défaut supplémentaire à refermer avant toute reprise : le moteur du Berlin (Q_SOM_03) ne publie ni `missing` ni `repondus`, si bien que la garde de complétude générale ne mord pas, et sa garde propre se contente d'UN item mesuré par catégorie. Un Berlin à trois items sur neuf peut sortir « Risque faible » : pour une règle d'orientation c'est un faux négatif ; pour une règle d'arrêt, ce serait une extinction fondée sur un instrument vide.",
    conditionDeRetour:
      "Une négation dans le vocabulaire de déclencheurs — décision d'architecture, les trois moteurs partageant `evaluerDeclencheur` — ET une garde de complétude propre au moteur du Berlin.",
  },
];

export type StopRulesMetadata = {
  version: string;
  validationExterne: boolean;
  dateValidation: string | null;
  claimsSource: StopRuleClaimRef[];
};

export const STOP_RULES_METADATA: StopRulesMetadata = {
  version: 'stop-rules-nnpp2-v1',
  // SIGNÉE le 2026-08-15 (arbitrage praticien explicite, [[D-061]]). Le verrou
  // correspondant vit dans `orientationService.tableArretSignee()`. Signée
  // CONJOINTEMENT à `contradictionsV1` : l'ordre importe cliniquement, la borne
  // « une contradiction ouverte interdit l'extinction » ([[D-053]] §5) ne mord
  // que si les contradictions sont actives. Voir l'avertissement en tête de
  // fichier, point 2.
  validationExterne: true,
  dateValidation: '2026-08-15T00:00:00.000Z',
  // Les claims épinglés par les règles de cette table. Le contrat de fraîcheur
  // les contrôle sur la production, et `claimsEpinglesFraicheur.guard.test.ts`
  // refuse que cette liste diverge de celle du contrat — dans les deux sens.
  claimsSource: [
    { claimId: 'WN-CL-0051-019', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0051-030', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0051-033', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0127-029', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0127-030', versionClaim: 'v1.0' },
  ],
};

// La constante seule ne garde RIEN : ses deux membres bougent ensemble. Ce qui
// garde, c'est le littéral épinglé dans `stopRulesV1.test.ts` — toute édition
// d'une règle après signature y rougit, et la sortie de secours est de
// RE-SIGNER, jamais de mettre le sha à jour en silence.
export const STOP_RULES_SHA256 = sha256(JSON.stringify(STOP_RULES_V1));
