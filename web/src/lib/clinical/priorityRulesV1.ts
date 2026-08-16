import type { ValidatedClinicalRuleRef } from '@/lib/clinical-engine/types';
import { evaluerDeclencheur, type ReponseOrientation } from './orientationEngine';
import type { OrientationDeclencheur } from './orientationRulesV1';
import { sha256 } from './corpusSyntheseV1';

// Table des RÈGLES DE PRIORITÉ NNPP2 — [[D-054]], campagne « chaîne T0
// opérationnelle », LOT-04.
//
// Ce que la table dit, et qu'aucune autre ne dit : « au vu de ce dossier, VOICI
// LES AXES QU'IL EST UTILE DE REGARDER EN PREMIER ». La table d'orientation
// propose des EXPLORATIONS (quoi mesurer de plus), la table d'arrêt en RETIENT ;
// celle-ci hiérarchise des AXES DE TRAVAIL soumis au praticien. Les trois sont
// distinctes, et confondre la première avec celle-ci reviendrait à faire d'un
// questionnaire à passer un objectif de protocole.
//
// UNE PRIORITÉ CANDIDATE N'EST NI UN DIAGNOSTIC, NI UNE PRESCRIPTION (`DC-27`,
// `DC-31`, `DC-32`). C'est une proposition hiérarchisée, que le praticien
// sélectionne — ou pas. Rien n'est jamais auto-sélectionné : `buildDecisionCard`
// exige `selectedBy: 'practitioner'` et refuse toute sélection tant que la
// décision est bloquée. Cette table ne touche à aucune de ces gardes.
//
// NON SIGNÉE À LA LIVRAISON — même discipline que `contradictionsV1.ts` et
// `stopRulesV1.ts` : écrire une table et la signer sont deux gestes distincts, et
// le second est un acte PRATICIEN. Tant que `validationExterne` est `false`,
// `tablePrioritesSignee()` reste fermée : aucune `ClinicalRuleRef` n'atteint
// `buildClinicalReview`, l'abstention retombe sur `not_evaluated` comme
// aujourd'hui, et aucun candidat n'est produit. La production ne change pas au
// merge.
//
// LE VOCABULAIRE DE DÉCLENCHEURS EST CELUI DE LA TABLE D'ORIENTATION,
// DÉLIBÉRÉMENT. Les déclencheurs sont des `OrientationDeclencheur` évalués par
// `evaluerDeclencheur` — la même fonction, pas une copie. Les gardes qui vivent
// là-bas (recueil incomplet, sous-score absent, plancher jamais comparé
// numériquement, `DC-24`) valent donc ici sans être réécrites. Le piège du dépôt
// reste le même : un objet de score n'est pas une mesure — tout prédicat lit
// `scored`/`total` ou une bande, jamais `!= null`.
//
// AUCUN DÉCLENCHEUR DE DRAPEAU EN V1, et c'est un arbitrage, pas un oubli
// ([[D-054]], arbitrage 3). Un drapeau d'anamnèse et l'objectif prioritaire du
// patient sont des DÉCLARATIONS, non des mesures : ils ne peuvent pas entrer
// dans la `provenance` d'un candidat, que `validateProvenance` confronte au
// `ClinicalSnapshot`. Ils s'expriment en `rationale` et en `limitations`, et
// s'affichent au cockpit.

/** L'instrument qui porte le canal de plainte du patient. */
export const CANAL_PLAINTE = 'Q_MOD_03';

export type PriorityClaimRef = {
  claimId: string;
  versionClaim: string;
};

export type PriorityRule = {
  id: string;
  /** Seules les règles `publiee` sont évaluées. */
  statut: 'brouillon' | 'publiee' | 'suspendue';
  /** ET logique : tous les déclencheurs doivent être atteints. */
  declencheurs: OrientationDeclencheur[];
  /**
   * Domaine de `Q_MOD_03` auquel la règle se rattache, ou `null`.
   *
   * Sert UNIQUEMENT au classement : la règle de l'axe que le patient déclare le
   * plus intensément remonte en tête. Ce n'est pas un déclencheur — le
   * déclenchement reste porté par `declencheurs`, et une règle sans domaine se
   * classe simplement après.
   */
  domainePlainte: string | null;
  /**
   * Rang intrinsèque de la règle (1 = plus prioritaire), AVANT prise en compte
   * de la plainte dominante. Il départage deux règles qu'aucune plainte ne
   * distingue ; le rang réellement servi est recalculé séquentiellement, pour
   * que `buildDecisionCard` reçoive des rangs uniques et contigus.
   */
  priorite: number;
  /** Libellé français servi au praticien — l'axe, jamais une conclusion. */
  libelle: string;
  /** Phrase française : POURQUOI cet axe est proposé. Jamais un diagnostic. */
  motif: string;
  /** Besoins (1-12) que l'axe concerne. */
  needIds: number[];
  /** Limitations propres à la règle, ajoutées à celles du producteur. */
  limitations: string[];
  /**
   * Claims VALIDÉS à l'appui. Jamais vide : une priorité sans claim ne serait
   * pas traçable jusqu'à sa source, et l'interdit du lot est explicite —
   * « aucun candidat sans claim ».
   */
  justificationClaims: PriorityClaimRef[];
};

export type PriorityRuleEcartee = {
  id: string;
  motif: string;
  conditionDeRetour: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Table des priorités — DEUX règles, chacune adossée à des claims `VALIDE` et
// actifs du corpus NNPP2, relus sur la production le 2026-08-12.
//
// POURQUOI `>= 7`, ET POURQUOI CE N'EST PAS UN SEUIL NEUF. `Q_MOD_03` est une
// échelle de plainte de 1 à 10, sens du trouble — un score haut est défavorable,
// d'où `>=`. Ses bandes sont publiées par `questions.ts` : 1-3 « Intensité faible
// ou absente », 4-6 « Intensité modérée », 7-8 « Intensité élevée », 9-10
// « Intensité très élevée ». `>= 7` vise les deux bandes hautes et elles seules,
// et c'est EXACTEMENT la bande que la table d'orientation SIGNÉE cite déjà sur ce
// même instrument (`R2-SOM-02`). Aucun nombre nouveau n'entre dans le dépôt par
// cette table (`DC-19`, `DC-20`).
//
// POURQUOI LA COMPARAISON PLUTÔT QUE LA COULEUR. Les deux bandes hautes de
// `Q_MOD_03` portent la MÊME couleur (`danger`) : `{type: 'couleur'}` ne les
// distinguerait pas de rien, et `{type: 'interpretation'}` obligerait à citer
// deux libellés dont la retouche ferait taire la règle en silence. La
// comparaison lit le nombre du sous-score, que le moteur ne publie que si le
// domaine a reçu une réponse (`total: null` sinon) — le même choix, et pour la
// même raison, que `R2-SOM-02`.
//
// CE QUE LES CLAIMS DISENT, ET CE QU'ILS NE DISENT PAS. Aucun des onze claims
// épinglés ne prescrit de conduite (`prescriptif = false` en production) : ils
// décrivent des mécanismes. Ce qu'ils fondent, c'est que l'axe MÉRITE D'ÊTRE
// REGARDÉ — pas qu'il faille faire telle chose. La hiérarchisation elle-même est
// ce que la SIGNATURE praticien assumera ([[D-054]], arbitrage 9).
// ─────────────────────────────────────────────────────────────────────────────

export const PRIORITY_RULES_V1: PriorityRule[] = [
  {
    id: 'PRIO-DIG-01',
    statut: 'publiee',
    // CE QUE LE CORPUS PORTE, CLAIM PAR CLAIM.
    //
    // `WN-CL-0022-005` énonce que « les fonctions intestinales incluent la
    // digestion et l'absorption des nutriments et micronutriments, la
    // défense/tolérance, ainsi que l'information et la régulation systémique ».
    // C'est lui qui interdit de lire une plainte digestive comme une affaire
    // locale — et donc lui qui fonde qu'elle puisse être un axe de travail
    // prioritaire plutôt qu'un symptôme à ranger.
    //
    // `WN-CL-0022-010` décrit la dysfonction de la barrière intestinale (mucus,
    // trophicité des entérocytes, jonctions intercellulaires) ; `WN-CL-0022-012`
    // ses retentissements LOCAUX (inflammation de bas grade et aiguë, troubles du
    // transit, malabsorption) ; `WN-CL-0022-013` ses retentissements À DISTANCE
    // liés au passage d'antigènes. `WN-CL-0023-003` ajoute l'axe
    // microbiote-cerveau, « physiologiquement activé via le système nerveux
    // parasympathique par activation du nerf vague ».
    //
    // CE QUE LA RÈGLE NE CONCLUT PAS, ET LE CLAIM QU'ELLE N'ÉPINGLE PAS.
    // `WN-CL-0023-005` (« les troubles du microbiote semblent être la cause
    // plutôt que la conséquence ») est un claim INTERPRÉTÉ de causalité : le
    // citer ici ferait dire à la règle qu'une plainte digestive intense CAUSE le
    // reste du tableau. Association n'est pas causalité (`DC-27`) et la règle
    // n'en a pas besoin — elle propose un axe, elle n'explique rien. Il est donc
    // délibérément hors de la table.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: CANAL_PLAINTE, sousScore: 'digestion', operateur: '>=', valeur: 7 },
    ],
    domainePlainte: 'digestion',
    priorite: 1,
    libelle: 'Axe digestif',
    motif:
      'Le patient situe sa plainte digestive dans les bandes hautes de l’échelle de plaintes actuelles. '
      + 'Les fonctions intestinales portent la digestion, l’absorption des nutriments et micronutriments, la défense et une régulation systémique : '
      + 'une plainte digestive intense n’est pas un signe local, et l’axe mérite d’être regardé en premier.',
    // Besoin 4 « Perception et sensations corporelles » — le seul besoin dont
    // les sources sont les instruments digestif (`Q_GAS_01`) et inflammatoire
    // (`Q_INF_01`), voir `BESOIN_SOURCES`. Le rattachement est une DÉSIGNATION
    // d'axe, pas une mesure : la couverture du besoin, elle, reste celle que le
    // snapshot a calculée.
    needIds: [4],
    limitations: [
      'Les claims à l’appui décrivent des mécanismes ; ils ne recommandent aucune conduite.',
      'Une plainte déclarée sur une échelle de 1 à 10 n’est pas une mesure d’un instrument spécifique de l’axe digestif.',
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0022-005', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0022-010', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0022-012', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0022-013', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0023-003', versionClaim: 'v1.0' },
    ],
  },
  {
    id: 'PRIO-PON-01',
    statut: 'publiee',
    // CE QUE LE CORPUS PORTE, CLAIM PAR CLAIM.
    //
    // `WN-CL-0022-007` fait le pont entre l'alimentation et le versant pondéral :
    // « la "malbouffe" peut entraîner des troubles des fonctions intestinales se
    // manifestant par malabsorption/maldigestion (obésité, diabète) ». Il est
    // partagé avec la règle digestive, et c'est ce partage qui est le fait
    // clinique : les deux axes ne sont pas indépendants.
    //
    // Les cinq suivants décrivent l'insulino-résistance, mécanisme central de cet
    // axe en neuronutrition : `WN-CL-0025-009` (le message
    // insuline-récepteur-transcription ne fonctionne plus, quel que soit le
    // niveau d'insuline), `WN-CL-0025-010` (glycémie augmentée, nutriments qui
    // n'entrent plus dans les cellules), `WN-CL-0025-014` (conséquences
    // périphériques : perturbations cardio-métaboliques, inflammation de bas
    // grade), `WN-CL-0025-015` (conséquences centrales : dérivation de la
    // tyrosine, synthèse des catécholamines diminuée).
    //
    // `WN-CL-0025-016` EST CELUI QUI REND LA PRIORITÉ ACTIONNABLE, et il est
    // nommé plutôt que noyé : « les facteurs impliqués dans l'insulino-résistance
    // sont l'alimentation, le statut micronutritionnel, l'activité physique, le
    // sommeil, le métabolisme adipocytaire et l'environnement ». Sans lui, la
    // règle décrirait un mécanisme sans dire pourquoi il relève de cette
    // consultation-ci.
    //
    // CE QUE LA RÈGLE NE DIT PAS. Elle ne conclut à AUCUNE insulino-résistance :
    // aucun de ces claims ne fait d'une plainte de surpoids déclarée le
    // diagnostic d'un mécanisme (`DC-27`, `DC-32`). Elle propose de regarder
    // l'axe, ce que le corpus soutient ; elle n'affirme pas ce qu'on y trouvera.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: CANAL_PLAINTE, sousScore: 'surpoids', operateur: '>=', valeur: 7 },
    ],
    domainePlainte: 'surpoids',
    priorite: 2,
    libelle: 'Axe pondéral et métabolique',
    motif:
      'Le patient situe sa plainte de surpoids dans les bandes hautes de l’échelle de plaintes actuelles. '
      + 'Le corpus rattache cet axe à l’alimentation, au statut micronutritionnel, à l’activité physique et au sommeil, '
      + 'et en décrit les conséquences périphériques comme centrales : l’axe mérite d’être regardé, sans qu’aucun mécanisme soit affirmé ici.',
    // Besoins 1 « Équilibre de l'assiette » et 3 « Rythme alimentaire
    // (chronobiologie) » — les deux besoins que `WN-CL-0025-016` nomme parmi les
    // facteurs et que le dépôt sait rattacher à une source (`Q_ALI_01` et son
    // sous-score `RYTHME_CHRONO`). Le sommeil et l'activité physique, également
    // nommés par le claim, relèvent du besoin 5 : ils ne sont PAS revendiqués
    // ici, la règle ne lisant aucune mesure de ces axes.
    needIds: [1, 3],
    limitations: [
      'Les claims à l’appui décrivent des mécanismes ; ils ne recommandent aucune conduite.',
      'Aucun mécanisme métabolique n’est affirmé : une plainte déclarée n’est pas une mesure d’insulino-résistance.',
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0022-007', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0025-009', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0025-010', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0025-014', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0025-015', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0025-016', versionClaim: 'v1.0' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CE QUI N'EST PAS DANS LA TABLE, ET POURQUOI — [[D-054]].
//
// Patron `CONTRADICTIONS_REGLES_ECARTEES_V1` puis `STOP_RULES_ECARTEES_V1` : une
// règle écartée reste lisible avec son motif, plutôt que de disparaître dans un
// ticket que personne ne rouvre. `Q_MOD_03` porte SEPT domaines ; la V1 n'en
// couvre que deux, et l'écart doit se voir.
// ─────────────────────────────────────────────────────────────────────────────

export const PRIORITY_RULES_ECARTEES_V1: PriorityRuleEcartee[] = [
  {
    id: 'PRIO-SOM',
    motif:
      "Le domaine `sommeil` de Q_MOD_03 déclenche DÉJÀ une règle de la table d'orientation signée (`R2-SOM-02`, PSQI) sur exactement la même bande `>= 7`. Écrire ici une priorité sur le même déclencheur ferait dire deux choses différentes au même fait, sans qu'aucun claim distingue « objectiver la plainte par le PSQI » de « travailler l'axe sommeil en premier ». Le corpus relu le 2026-08-12 ne porte, pour cet axe, que des claims d'exploration — c'est précisément ce que la table d'orientation exprime déjà.",
    conditionDeRetour:
      "Un claim VALIDE qui fonde une INTERVENTION sur l'axe sommeil, distinct de ceux qui fondent l'exploration par le PSQI, et un arbitrage praticien sur l'articulation des deux tables quand elles lisent le même déclencheur.",
  },
  {
    id: 'PRIO-STR',
    motif:
      "Aucun domaine de Q_MOD_03 ne porte le stress : le plus proche est `moral`, qui mêle troubles dépressifs, anxiété et angoisse — trois objets que le libellé de l'item réunit et qu'une priorité devrait distinguer. Par ailleurs [[D-054]] (arbitrage 4) refuse tout pont depuis les règles d'arrêt : une extinction dit qu'une exploration n'a plus d'objet, jamais ce qu'il faut entreprendre. Conséquence assumée et VÉRIFIÉE par le banc : la V1 ne peut produire aucun candidat d'axe stress, quel que soit l'état des contradictions ouvertes.",
    conditionDeRetour:
      "Un instrument spécifique de l'axe stress lu par la table (le PSS-10 ou le DASS-21, dont les bandes sont publiées) ET un claim VALIDE fondant une intervention plutôt qu'une exploration.",
  },
  {
    id: 'PRIO-FAT',
    motif:
      "La fatigue est le domaine le plus fréquemment coté haut de Q_MOD_03, et c'est exactement ce qui la disqualifie comme priorité en V1 : elle est un carrefour, non un axe. Le dépôt le dit déjà ailleurs — le besoin 2 « Micronutriments essentiels » a été privé de sa source `Q_SOM_06` au motif que « l'échelle de fatigue de Pichot mesure la fatigue, pas la couverture micronutritionnelle », et que la fatigue est un motif d'EXPLORER (fer, B12, folates, vitamine D) sans en être la mesure. Une priorité « axe fatigue » recopierait le défaut corrigé en v3 → v4 du score d'équilibre.",
    conditionDeRetour:
      "Une règle qui conjugue la plainte de fatigue à une MESURE d'un instrument spécifique, et le claim qui fonde l'axe ainsi restreint.",
  },
  {
    id: 'PRIO-DOU',
    motif:
      "Les domaines `douleurs` et `mobilite` sont écartés ensemble : ils relèvent d'un champ — douleur chronique, appareil locomoteur — dont le corpus NNPP2 relu le 2026-08-12 ne porte pas de claim d'intervention neuronutritionnelle, et dont une part appelle un ADRESSAGE plutôt qu'un axe de travail. Produire une priorité sans claim est l'interdit explicite du lot ; produire un axe là où il faut orienter serait pire.",
    conditionDeRetour:
      "Des claims VALIDES sur l'axe douleur/mobilité, et l'arbitrage praticien qui trace la frontière entre un axe de travail et un motif d'adressage.",
  },
];

export type PriorityRulesMetadata = {
  version: string;
  validationExterne: boolean;
  /**
   * Date de signature praticien, ou `null`.
   *
   * DOIT ÊTRE UNE DATE ISO CANONIQUE (`new Date(x).toISOString() === x`) le jour
   * de la signature : elle devient le `validation.validatedAt` des
   * `ValidatedClinicalRuleRef`, que `buildClinicalReview` refuse autrement. Dit
   * ici plutôt que découvert le jour de la signature.
   */
  dateValidation: string | null;
  claimsSource: PriorityClaimRef[];
  /**
   * SHA du périmètre effectivement relu au moment de la signature — patron
   * [[D-063]] (verrou biologie), étendu aux quatre tables historiques par
   * [[D-067]]. C'est ce terme qui rend la PÉREMPTION DÉTECTABLE : dès qu'une
   * règle ou un texte d'abstention bouge, `PRIORITY_RULES_SHA256` change et ne
   * concorde plus — le verrou se ferme SEUL, au lieu de laisser le nouveau
   * contenu entrer sous une signature acquise. `null` tant que rien n'a été
   * relu. LITTÉRAL FIGÉ obligatoire, jamais la constante calculée : la
   * comparaison serait tautologique et la péremption invisible.
   */
  shaPerimetre: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// À LIRE AVANT DE RE-SIGNER — état au 2026-08-16, re-signature FAITE le même
// jour ([[D-067]], arbitrage praticien explicite en session).
//
// CE QUE LE SHA COUVRE. `PRIORITY_RULES_SHA256` porte sur `PRIORITY_RULES_V1` —
// déclencheurs, claims, libellés, motifs — ET, depuis [[D-062]], sur
// `ABSTENTION_PROCEDURE_V1`, cadre et textes de motifs compris.
//
// LA DETTE BLOQUANTE DE [[D-054]] EST CLOSE, ET C'EST [[D-062]] QUI LA FERME.
// La procédure d'abstention vivait dans `lib/clinical-engine/chaineC1.ts`,
// hors du périmètre haché : signer cette table ouvrait un verdict — « required »
// ou « not_required », servi au praticien et haché dans la carte de décision —
// dont aucune ligne signée ne décrivait la règle, ce que `DC-17` et `DC-26`
// interdisent. Elle est désormais décrite par des données signées. La
// conséquence mécanique — un périmètre agrandi APRÈS la signature du
// 2026-08-15 — est SOLDÉE par la re-signature du 2026-08-16, qui couvre le
// périmètre complet et le fige par `shaPerimetre`.
//
// CE QUI RESTE HORS DU SHA — DETTE RÉSIDUELLE, DITE PLUTÔT QUE SUPPOSÉE. Le
// producteur de candidats, le CLASSEMENT (plainte dominante, puis priorité
// intrinsèque, puis identifiant) et les textes `LIMITATION_*` servis avec chaque
// candidat vivent dans `lib/clinical-engine/chaineC1.ts` et relèvent des bancs
// ordinaires : aucune ligne signée ne les décrit. L'ordre d'évaluation des deux
// motifs d'abstention est dans le même cas — mécanique, mais non relu.
//
// SECONDE CHOSE QUE LA SIGNATURE ASSUME. Chacune des deux règles repose sur UN
// ITEM UNIQUE de `Q_MOD_03` — un auto-déclaré de 1 à 10, sans instrument
// spécifique à l'appui. `DC-28` (« un questionnaire isolé ne suffit pas à
// conclure ») est ici mitigé par ce que la règle PRODUIT — une proposition
// hiérarchisée, jamais une conclusion — et par les `limitations` que chaque
// candidat porte. Ce n'est pas une objection réfutée, c'est un arbitrage : il
// appartient au praticien qui signe.
// ─────────────────────────────────────────────────────────────────────────────

export const PRIORITY_RULES_METADATA: PriorityRulesMetadata = {
  version: 'priority-rules-nnpp2-v1',
  // SIGNÉE le 2026-08-15 (arbitrage praticien explicite, [[D-061]]).
  //
  // PASSAGE EN FORCE ASSUMÉ, ET NOMMÉ COMME TEL. Le bloc « À LIRE AVANT DE
  // RE-SIGNER » ci-dessus énonçait, au moment de la signature, une dette
  // BLOQUANTE relevée en revue le 2026-08-12 ([[D-054]]) : le SHA ne couvrait
  // pas la procédure d'abstention, qui vivait dans
  // `lib/clinical-engine/chaineC1.ts`, si bien que la signature ouvrait un
  // verdict « required » / « not_required » dont aucune ligne signée ne
  // décrivait la règle — ce que `DC-17` et `DC-26` interdisent. Le praticien a
  // signé en la connaissant, après qu'elle lui a été exposée ; [[D-061]] l'a
  // portée comme dette ouverte et prioritaire.
  //
  // CETTE DETTE EST CLOSE ([[D-062]], le lendemain) : la procédure d'abstention
  // est entrée dans le périmètre haché, et ses textes sont des données signées.
  //
  // RE-SIGNÉE le 2026-08-16 ([[D-067]], arbitrage praticien explicite en
  // session — « toutes les signatures praticien, sans réserves ») : la date
  // ci-dessous couvre le périmètre AGRANDI par [[D-062]], et `shaPerimetre` le
  // fige — c'est la chaîne hex que `PRIORITY_RULES_SHA256` valait au moment de
  // la relecture, recopiée telle quelle (patron [[D-063]]). Toute édition
  // ultérieure d'une règle ou d'un motif d'abstention rouvrira le verrou seule.
  //
  // La seconde chose que la signature assume — deux règles reposant sur un item
  // unique auto-déclaré de `Q_MOD_03`, `DC-28` mitigé par ce que la règle
  // PRODUIT — est un arbitrage clinique ordinaire, et il a été repris tel quel.
  validationExterne: true,
  dateValidation: '2026-08-16T00:00:00.000Z',
  // SURTOUT PAS `shaPerimetre: PRIORITY_RULES_SHA256` — la constante est
  // déclarée APRÈS cet objet (ReferenceError à l'import), et réordonner
  // rendrait la comparaison tautologique : le sha est recalculé à chaque
  // chargement depuis la table vivante, la concordance serait toujours vraie
  // et la péremption jamais détectée (piège documenté sur le verrou biologie,
  // changelog du 2026-08-16).
  shaPerimetre: 'cfd9b876e594d3298b35890e8c4827af15d88143fe03c594ff89c93ffd511ab4',
  // Les claims épinglés par les règles de cette table. Le contrat de fraîcheur
  // les contrôle sur la production, et `claimsEpinglesFraicheur.guard.test.ts`
  // refuse que cette liste diverge de celle du contrat — dans les deux sens.
  claimsSource: [
    { claimId: 'WN-CL-0022-005', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0022-007', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0022-010', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0022-012', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0022-013', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0023-003', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0025-009', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0025-010', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0025-014', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0025-015', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0025-016', versionClaim: 'v1.0' },
  ],
};

// La constante seule ne garde RIEN : ses deux membres bougent ensemble. Ce qui
// garde, c'est le littéral épinglé dans `priorityRulesV1.test.ts` — toute
// édition d'une règle après signature y rougit, et la sortie de secours est de
// RE-SIGNER, jamais de mettre le sha à jour en silence.
/**
 * PROCÉDURE D'ABSTENTION — entrée dans le périmètre signé ([[D-062]]).
 *
 * Elle vivait dans `lib/clinical-engine/chaineC1.ts`, hors de la table et donc
 * hors du SHA : signer `PRIORITY_RULES_METADATA` activait un verdict clinique
 * qu'aucune ligne signée ne décrivait (`DC-17`, `DC-26`). C'était la dette
 * bloquante de [[D-054]], franchie en connaissance au moment de la signature
 * ([[D-061]]) et fermée ici.
 *
 * SA PROVENANCE EST DOCTRINALE, PAS BIBLIOGRAPHIQUE, et c'est dit plutôt que
 * sous-entendu. Ses deux motifs ne dérivent d'aucun claim du corpus : ils
 * dérivent de la constitution clinique — un signal de sécurité prime sur tout
 * score et n'ajoute pas de points (`DC-12`, `DC-23`) ; une donnée absente n'est
 * ni nulle ni normale (`DC-24`, `DC-25`). `DC-26` exige qu'une règle clinique
 * vive « dans le registre, jamais seulement dans le code » : le registre est
 * ici celui des décisions, non celui des claims. Si le praticien veut des
 * claims `VALIDE` à l'appui, ils restent à écrire — la question est posée en
 * toutes lettres dans [[D-062]].
 *
 * LES TEXTES SONT DES DONNÉES, jamais des littéraux du moteur : c'est ce qui
 * les fait entrer dans `PRIORITY_RULES_SHA256`, donc dans ce que la signature
 * couvre. Les retoucher fait rougir le verrou de contenu, et la sortie de
 * secours est de RE-SIGNER.
 */
// PROFONDÉMENT EN LECTURE SEULE, et ce n'est pas cosmétique : ces données sont
// couvertes par `PRIORITY_RULES_SHA256`. Un `as` les rendrait mutables et
// annulerait le `as const` — la conformité se vérifie donc par `satisfies`,
// sous la déclaration, jamais par un cast qui élargit (revue Copilot du
// 2026-08-16).
export type MotifAbstention = {
  readonly id: string;
  /** Règles de la constitution qui fondent ce motif. Jamais vide. */
  readonly doctrine: readonly string[];
  /** Texte français servi au praticien, tel quel. */
  readonly limitation: string;
};

export const ABSTENTION_PROCEDURE_V1 = {
  version: 'abstention-procedure-v1',
  /** Portée, rappelée sous tout verdict — l'outil, jamais le patient. */
  cadre:
    'L’abstention porte sur la préparation de la décision par l’outil ; elle ne conclut rien sur le patient.',
  /** Évalués dans cet ordre ; le premier atteint l'emporte. AUCUN n'ajoute de points. */
  motifsRequired: [
    {
      id: 'ABST-SEC-01',
      doctrine: ['DC-12', 'DC-23'],
      limitation:
        'Au moins un constat de sécurité est présent : il prime sur tout score et exige une revue praticien avant toute priorité.',
    },
    {
      id: 'ABST-CAN-01',
      doctrine: ['DC-24', 'DC-25'],
      limitation:
        `Le canal de plainte (${CANAL_PLAINTE}) ne rend aucune mesure sur l’épisode confirmé : la table des priorités ne peut pas être évaluée, et une donnée absente n’est ni nulle ni normale.`,
    },
  ],
  /**
   * Verdict par défaut. SA PHRASE DIT L'ÉTAT DU DISPOSITIF, PAS CELUI DU
   * PATIENT : affirmer « aucun constat de sécurité n'est présent » serait servir
   * l'absence d'un contrôle comme le résultat d'un contrôle (`DC-24`), aucun
   * producteur de constat déterministe n'existant à ce jour.
   */
  notRequired: {
    id: 'ABST-NR-01',
    doctrine: ['DC-24'],
    limitation:
      'Aucun constat de sécurité n’est produit par le moteur déterministe — aucun producteur n’existe à ce jour —'
      + ` et le canal de plainte (${CANAL_PLAINTE}) rend une mesure sur l’épisode confirmé :`
      + ' la table des priorités ne retient aucun motif d’abstention.',
  },
} as const;

// CONFORMITÉ VÉRIFIÉE SANS ÉLARGISSEMENT. `satisfies` contrôle la forme,
// `as const` garde l'immuabilité : un motif sans `doctrine` ou sans
// `limitation` ne compile pas, et rien n'est rendu mutable au passage.
void (ABSTENTION_PROCEDURE_V1.motifsRequired satisfies readonly MotifAbstention[]);
void (ABSTENTION_PROCEDURE_V1.notRequired satisfies MotifAbstention);

// LE SHA COUVRE LA PROCÉDURE D'ABSTENTION depuis [[D-062]] — le périmètre
// signé s'était agrandi APRÈS la signature du 2026-08-15, et la re-signature
// requise a été FAITE le 2026-08-16 ([[D-067]]) : `dateValidation` et
// `shaPerimetre` ci-dessus couvrent ce périmètre complet.
export const PRIORITY_RULES_SHA256 = sha256(
  JSON.stringify({ regles: PRIORITY_RULES_V1, abstention: ABSTENTION_PROCEDURE_V1 }),
);

/**
 * La table des RÈGLES DE PRIORITÉ est-elle signée ? ([[D-054]])
 *
 * Même verrou auto-portant que `tableSignee()` et `tableArretSignee()`, et pour
 * le même motif : un `validationExterne` seul serait un booléen qu'un flip isolé
 * suffirait à ouvrir. Une table réellement signée porte aussi sa date de
 * validation et les claims qui la fondent.
 *
 * Il n'y a PAS de drapeau d'environnement propre ([[D-054]], arbitrage 7) : la
 * chaîne C1 est déjà derrière l'authentification praticien et la confirmation
 * T0. Un second drapeau donnerait l'illusion d'un second verrou là où il n'y a
 * qu'un seul chemin.
 */
export function tablePrioritesSignee(): boolean {
  // La date doit être ISO CANONIQUE : elle devient telle quelle le
  // `validation.validatedAt` des `ValidatedClinicalRuleRef`, où
  // `buildClinicalReview` exige cette forme. Sans ce terme, une signature à la
  // date mal formée OUVRIRAIT le verrou puis ferait jeter la consommation — un
  // échec bruyant en aval au lieu d'un verrou qui reste fermé (revue PR #671).
  const dateValidation = PRIORITY_RULES_METADATA.dateValidation;
  return PRIORITY_RULES_METADATA.validationExterne
    && dateValidation !== null
    // Le terme `getTime()` court-circuite l'illisible : `toISOString()` JETTE
    // sur une date invalide, et le verrou doit fermer, jamais jeter.
    && !Number.isNaN(new Date(dateValidation).getTime())
    && new Date(dateValidation).toISOString() === dateValidation
    && PRIORITY_RULES_METADATA.claimsSource.length > 0
    // CINQUIÈME TERME ([[D-067]], patron [[D-063]]) : la concordance du SHA de
    // périmètre. Une règle ou un motif d'abstention retouché après signature
    // change `PRIORITY_RULES_SHA256` — le verrou se ferme SEUL, au lieu de
    // laisser le nouveau contenu entrer sous une signature acquise.
    && PRIORITY_RULES_METADATA.shaPerimetre === PRIORITY_RULES_SHA256;
}

/** Les règles évaluables : `publiee` et pourvues d'au moins un claim. */
function reglesEvaluables(): PriorityRule[] {
  // Le second terme n'est pas décoratif : « aucun candidat sans claim » est un
  // interdit du lot, et une règle publiée sans claim doit se taire plutôt que
  // produire un candidat orphelin. Le banc de la table refuse par ailleurs
  // qu'une telle règle existe — la garde est ceinture et bretelles, comme
  // l'invariant équivalent d'`evaluerOrientation`.
  return PRIORITY_RULES_V1.filter(
    regle => regle.statut === 'publiee' && regle.justificationClaims.length > 0,
  );
}

/**
 * Les règles de la table, en `ValidatedClinicalRuleRef` — ou RIEN.
 *
 * FAIL-CLOSED : table non signée ⇒ liste vide. `buildClinicalReview` force alors
 * l'abstention à `not_evaluated` (son propre invariant : « aucune règle
 * d'abstention cliniquement validée n'est fournie »), et `buildDecisionCard`
 * refuse tout candidat dont la règle n'est pas validée. Le verrou est donc posé
 * ICI et nulle part ailleurs : c'est ce qui rend le merge invisible en
 * production.
 *
 * TOUTES LES RÈGLES PUBLIÉES, ET NON LES SEULES DÉCLENCHÉES. `rules` décrit le
 * référentiel sous lequel la revue a été produite, pas ce qu'il a rendu sur ce
 * dossier-ci : deux revues rédigées sous deux tables différentes seraient
 * autrement indiscernables à l'audit. C'est aussi ce qui permet à l'abstention
 * de citer une règle validée même quand aucune ne s'est déclenchée.
 */
export function reglesPrioritesValidees(): ValidatedClinicalRuleRef[] {
  if (!tablePrioritesSignee()) return [];
  const dateValidation = PRIORITY_RULES_METADATA.dateValidation as string;
  return reglesEvaluables().map(regle => ({
    ruleId: regle.id,
    version: PRIORITY_RULES_METADATA.version,
    lifecycle: 'clinically_validated' as const,
    validation: {
      validatedAt: dateValidation,
      validatorRole: 'practitioner' as const,
      // Une CHAÎNE, et le contrat C1 n'est pas étendu ([[D-054]], arbitrage 2) :
      // `DecisionPriorityCandidate` entre dans `decisionCard.inputHash`, donc
      // dans `versionId`. La traçabilité fine (claims, version, sha) vit dans la
      // table ; ce champ dit où la retrouver.
      sourceReference:
        `Table des priorités d’intervention NNPP2 ${PRIORITY_RULES_METADATA.version}`
        + ` (sha256 ${PRIORITY_RULES_SHA256}) — règle ${regle.id}`,
    },
  }));
}

export type PriorityRuleDeclenchee = {
  regle: PriorityRule;
  /** Une description lisible par déclencheur atteint (UI praticien). */
  conditions: string[];
  /**
   * Instruments réellement à l'appui de l'atteinte, dédupliqués, dans l'ordre
   * de première citation ([[D-060]] §4). Sous un `ou`, la branche atteinte
   * seule — c'est d'eux que `construireCandidats` tire ses `responseId`, et une
   * dérivation statique depuis la règle citerait des passations qui n'ont rien
   * décidé.
   */
  instruments: string[];
};

/**
 * Les règles dont TOUS les déclencheurs sont atteints (ET logique).
 *
 * Fonction pure : aucun accès base, aucun appel IA, aucune logique de scoring
 * nouvelle. `dernieres` est la dernière passation exploitable par instrument,
 * SCORE RECALCULÉ — jamais l'instantané stocké (voir
 * `scoresRecalculesPourRaisonnement`).
 *
 * Table non signée ⇒ rien, sans même évaluer : le verrou est le premier test.
 */
export function evaluerPriorites(
  dernieres: Map<string, ReponseOrientation>,
): PriorityRuleDeclenchee[] {
  if (!tablePrioritesSignee()) return [];
  const declenchees: PriorityRuleDeclenchee[] = [];
  for (const regle of reglesEvaluables()) {
    const conditions: string[] = [];
    const instruments: string[] = [];
    let atteinte = true;
    for (const declencheur of regle.declencheurs) {
      // `drapeaux` non fourni : la V1 ne porte aucun déclencheur de ce type
      // ([[D-054]], arbitrage 3). Le passer `undefined` n'affaiblit rien — un
      // déclencheur de drapeau sans anamnèse n'est jamais atteint.
      const condition = evaluerDeclencheur(declencheur, dernieres, undefined);
      if (condition === null) {
        atteinte = false;
        break;
      }
      conditions.push(condition.motif);
      for (const instrument of condition.instruments) {
        if (!instruments.includes(instrument.idQuestionnaire)) {
          instruments.push(instrument.idQuestionnaire);
        }
      }
    }
    // Une règle sans déclencheur s'allumerait sur tout dossier : elle est
    // refusée ici comme le banc de la table la refuse.
    if (atteinte && regle.declencheurs.length > 0) declenchees.push({ regle, conditions, instruments });
  }
  return declenchees;
}
