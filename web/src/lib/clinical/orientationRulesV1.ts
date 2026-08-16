import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import type { FunctionalCategoryId, PackId } from '@/lib/questionnaires-functional';
import { sha256 } from './corpusSyntheseV1';

// Table de règles d'orientation NNPP2 (campagne certification corpus, lot 7,
// contrat v2 après intégration de l'audit externe).
//
// Chaque règle traduit une recommandation des fiches de synthèse NNPP2 :
// « si ces déclencheurs sont TOUS atteints, proposer ces explorations ». La
// table est du CODE VERSIONNÉ, relu en PR — jamais du runtime dynamique. Elle
// est régénérée par `tools/corpus/orientation/` (lot 9) à partir des seuls
// claims VALIDÉS par le praticien dans l'Atelier corpus (barrière D-003) :
// chaque règle épingle ses claims justificatifs (id + version immuable).
//
// Doctrine : le graphe clinique choisit les explorations POSSIBLES ; le
// praticien décide ; rien n'est jamais auto-assigné ; le LLM de synthèse ne
// reçoit que des candidats issus de cette table, jamais l'inverse.
//
// V1 (LOT-05, 2026-08-03) : table REMPLIE — six règles — mais
// `validationExterne: false`. Le moteur et la route existent et ne recommandent
// toujours rien : la table est écrite, pas signée. Le praticien signe après
// relecture clinique (même discipline que CORPUS_CLINIQUE_METADATA dans
// ./corpusSyntheseV1.ts).
//
// V2 (2026-08-04) : table portée à VINGT règles — seize de premier tour
// ajoutées, deux règles d'anamnèse retirées ou renommées, quatre règles de
// mesure conservées et requalifiées de second tour. La doctrine des deux tours
// qui commande cet ajout est écrite en tête de la table elle-même, plus bas.
// `validationExterne` reste `false` : écrire des règles et les signer sont deux
// gestes distincts, et le second n'a pas eu lieu.
//
// Deux des seize (`R2-NEU-04` et `R2-ALI-01`) sont issues de la revue
// adversariale du 2026-08-04 : la première parce que retenir `SE` sans `DA`
// était un arbitrage pris par omission, la seconde parce qu'une note d'abandon
// déclarait sans source une règle dont la source existait.

export type OrientationZone =
  // Plage numérique inclusive sur le score brut (total ou sous-score).
  | { type: 'plage'; min: number; max: number }
  // Libellés d'interprétation servis par le catalogue (questions.ts).
  | { type: 'interpretation'; labels: string[] }
  // Couleurs de zone servies par le catalogue (jamais `success` : une zone
  // favorable ne déclenche pas d'exploration).
  //
  // L'union couvre les QUATRE couleurs défavorables, par ordre de gravité
  // croissante — `info`, `warning`, `danger`, `dark`. Les deux extrémités
  // manquaient et chacune ouvrait le même trou, en miroir : `dark` porte les
  // bandes « Très sévère » (DASS-21), si bien qu'une règle écrite sur
  // `['warning', 'danger']` ignorait les patients les PLUS atteints ; `info`
  // porte des bandes légères mais actionnables (PSQI « Troubles du sommeil
  // légers », 5-10, au-dessus du seuil de 4 que l'instrument publie), et
  // l'omettre laissait dehors le versant bas.
  //
  // Le banc n'exige pas de citer les quatre : il exige qu'une règle ne
  // s'arrête jamais SOUS la plus sévère. Viser `danger` seul est licite ; viser
  // `danger` sans `dark` ne l'est pas. Où COMMENCER, en revanche, est un
  // arbitrage clinique par instrument, qu'aucun banc ne peut prendre — chaque
  // règle le motive sur place.
  | { type: 'couleur'; couleurs: Array<'info' | 'warning' | 'danger' | 'dark'> };

// Déclencheur FEUILLE : les trois formes historiques, seules admises sous une
// disjonction ([[D-060]] §3 — aucune imbrication, un `ou` ne contient jamais un
// autre `ou` ; la contrainte est portée par le type, pas par un banc). Une
// algèbre booléenne complète dans une table de règles cliniques serait
// illisible en revue, et la revue est le seul contrôle réel.
export type OrientationDeclencheurFeuille =
  | {
      type: 'zone';
      idQuestionnaire: string;
      /** Id ou libellé du sous-score visé ; absent = score global. */
      sousScore?: string;
      zone: OrientationZone;
    }
  | {
      type: 'comparaison';
      idQuestionnaire: string;
      sousScore?: string;
      operateur: '>=' | '<=' | '>' | '<' | '==';
      valeur: number;
    }
  // Drapeau d'anamnèse (`extraireDrapeauxAnamnese`, LOT-04) : ce que le patient
  // a DÉCLARÉ, par opposition à ce qu'un instrument a mesuré. Un déclencheur de
  // ce type est atteint si le drapeau porte au moins une des `valeurs` (champ
  // liste) ou lui est égal (champ radio).
  //
  // `champ` est typé par `keyof` : un nom de champ erroné ne compile pas. Les
  // `valeurs`, elles, sont des chaînes libres — c'est le banc anti-dérive de
  // `orientationRulesV1.test.ts` qui les confronte aux options réelles de
  // `ANAMNESE_SECTIONS`, car un libellé qui dérive ferait taire la règle sans
  // rien casser.
  //
  // JAMAIS `signauxAlerte` — et le motif n'est PAS le filtrage.
  //
  // Ce drapeau est bien filtré contre l'énuméré courant, mais tous les autres le
  // sont aussi, `attentes` et `antecedentsDomaines` compris, qui eux portent des
  // règles : « c'est filtré » ne distinguerait donc rien. La vraie raison est
  // qu'un signal d'alerte — « Idées noires ou suicidaires », « Douleur
  // thoracique » — appelle un ADRESSAGE, pas une exploration. Or cette table ne
  // sait produire qu'une cible (questionnaire ou pack) : y répondre par un
  // questionnaire ferait passer un signal d'alerte pour une chose que l'outil
  // traite. Mieux vaut ne rien produire que produire la mauvaise forme.
  //
  // Arbitrage praticien du 2026-08-03 : ces signaux DOIVENT être visibles à la
  // surface d'orientation, mais sans être présentés comme une exploration. La
  // surface manque — c'est un lot dédié, pas une règle. Question ouverte
  // consignée au SESSION_LOG. En attendant, `extraireVigilanceDeterministe`
  // (non filtré) reste le seul chemin par lequel ces signaux remontent.
  | {
      type: 'drapeau';
      champ: keyof DrapeauxAnamnese;
      valeurs: string[];
    };

// Disjonction ([[D-060]]) : atteinte si AU MOINS UNE branche complète l'est.
//
// « Complète » n'est pas décoratif, c'est le point 2 de la décision : une
// branche ne compte que si SON instrument est complètement recueilli —
// fail-closed, dans le doute la branche ne compte pas. Sans cette règle, le OU
// transformerait la garde de complétude (`DC-24`) en passoire : il suffirait
// d'une branche non recueillie pour la contourner. Corollaire acquis par
// construction : un plancher n'allume jamais un OU, puisqu'un plancher n'est
// servi que sur recueil incomplet.
//
// La traçabilité ne remonte que la branche ATTEINTE (point 4) : c'est elle, et
// elle seule, que les consommateurs (sources de contradiction, `responseId`
// des cartes de décision) citent. L'interdit `signauxAlerte` survit à la
// disjonction (point 5) — un banc le vérifie sous `ou` explicitement.
//
// Un `ou` sans branche n'est jamais atteint (même refus qu'une règle sans
// déclencheur : `some` sur une liste vide est faux, et c'est le bon défaut).
export type OrientationDeclencheur =
  | OrientationDeclencheurFeuille
  | {
      type: 'ou';
      declencheurs: OrientationDeclencheurFeuille[];
    };

/**
 * Les feuilles d'un déclencheur : lui-même, ou les branches de sa disjonction.
 *
 * C'est la lecture STATIQUE, pour les bancs anti-dérive : chaque interdit qui
 * vaut sur une feuille (libellé verbatim, `signauxAlerte`, instrument au
 * catalogue) doit valoir sur chaque branche d'un `ou`, sinon la disjonction
 * deviendrait la porte de service des interdits ([[D-060]] §5). L'évaluation,
 * elle, ne passe pas par ici — elle choisit une branche, jamais toutes.
 */
export function feuillesDuDeclencheur(declencheur: OrientationDeclencheur): OrientationDeclencheurFeuille[] {
  return declencheur.type === 'ou' ? declencheur.declencheurs : [declencheur];
}

type SuggestionBase = {
  /** 1 = plus prioritaire ; ordonne le pack hiérarchisé présenté au praticien. */
  priorite: number;
  /** Objectif clinique de l'exploration, tel que la fiche NNPP2 l'énonce. */
  objectif?: string;
};

// Union : au moins une cible (questionnaire et/ou pack). Le type l'impose —
// une suggestion sans cible serait ignorée en silence par le moteur.
export type OrientationSuggestion =
  | (SuggestionBase & { questionnaireId: string; packId?: PackId })
  | (SuggestionBase & { questionnaireId?: string; packId: PackId });

export type OrientationClaimRef = {
  claimId: string;
  versionClaim: string;
};

export type OrientationRule = {
  id: string;
  /** Seules les règles `publiee` sont évaluées par le moteur. */
  statut: 'brouillon' | 'publiee' | 'suspendue';
  /** ET logique : tous les déclencheurs doivent être atteints. */
  declencheurs: OrientationDeclencheur[];
  suggestions: OrientationSuggestion[];
  /** Besoins (1-12) que l'exploration vise à mesurer ou préciser. */
  needIds?: number[];
  categoriesCibles?: FunctionalCategoryId[];
  /**
   * Claims VALIDÉS à l'appui. Jamais vide : une règle sans claim ne serait pas
   * traçable jusqu'à sa source, et le moteur l'ignore (invariant de doctrine,
   * vérifié par `evaluerOrientation`).
   */
  justificationClaims: OrientationClaimRef[];
  niveau: 'socle' | 'approfondissement' | 'specialise';
};

// ─────────────────────────────────────────────────────────────────────────────
// Table d'orientation — VINGT règles, chacune adossée à des claims VALIDE du
// corpus NNPP2 (six en V1, portées à vingt en V2). Le compte est celui des
// entrées de `ORIENTATION_RULES_V1` : seize `R2-*` de premier tour, plus les
// quatre `R-*` de mesure conservées en second tour.
//
// AUCUN SEUIL N'EST CALCULÉ ICI — mais il ne faut pas se raconter que la table
// serait pour autant sans décision clinique. Les déclencheurs citent la bande
// d'interprétation que la grille certifiée produit déjà — par sa couleur
// (`type: 'couleur'`) ou par son libellé (`type: 'interpretation'`) —, jamais un
// nombre écrit à cet endroit : décider qu'un PSS-10 vaut « élevé » appartient à
// la grille, et les règles survivent donc à une recalibration de barème.
//
// ENTRE LES DEUX FORMES, LE CRITÈRE EST L'UNICITÉ DE L'INSTRUMENT. La couleur
// est plus robuste à une réécriture de libellé, et c'est la forme par défaut.
// Mais quand un même `idQuestionnaire` peut désigner DEUX instruments selon un
// drapeau — le cas de `Q_ALI_01` sous `WN_ALI_01_SIIN57` —, la couleur ne
// distingue pas les deux formes et la règle mord sur celle que son claim ne
// couvre pas. Le libellé, lui, appartient à une forme et à une seule. `R2-ALI-01`
// porte le cas et l'explique sur place.
//
// En revanche, CHOISIR LA BANDE D'ENTRÉE est bien un arbitrage clinique, et il
// est pris ici. Arbitrage praticien du 2026-08-03 : il se prend INSTRUMENT PAR
// INSTRUMENT, et non par une règle uniforme — chaque grille a ses propres
// bandes et son propre seuil publié. Chaque règle motive donc sa bande de
// départ sur place. En pratique : le PSS-10 et le TFD SIIN n'émettent AUCUNE
// bande `info`, et `warning` y est déjà leur première bande défavorable ; le
// PSQI en émet une et elle est PRISE (« Troubles du sommeil légers », 5-10,
// au-dessus du seuil de 4 qu'il publie) ; l'enquête SIIN (`Q_ALI_01`) en émet
// une et elle est LAISSÉE (« Alimentation plutôt équilibrée, mais
// insuffisamment protectrice », 51-70 — un libellé qui n'est pas défavorable).
//
// Corrigé le 2026-08-04 : ce paragraphe affirmait que « seul le PSQI émet une
// bande `info` porteuse de sens ». C'était vrai des instruments que V1
// déclenchait, faux depuis `R2-ALI-01`. Deux instruments à bande `info`, deux
// arbitrages opposés — c'est précisément ce que « instrument par instrument »
// veut dire, et l'écrire à deux exemples vaut mieux qu'à un.
//
// LA TABLE EST SIGNÉE DEPUIS LE 2026-08-04 — `ORIENTATION_METADATA` plus bas
// porte `validationExterne: true`, sa date et ses vingt-trois claims. La
// signature est un acte PRATICIEN, demandé explicitement en session après
// relecture des vingt règles ; elle n'a jamais été posée d'initiative, et ce
// fichier ne s'auto-signe pas davantage aujourd'hui qu'hier.
//
// CE QUE LA SIGNATURE NE SUFFIT PAS À FAIRE. Le verrou de la route est un ET :
// `tableSignee()` ET `WN_ENABLE_ORIENTATION_NNPP2 === '1'`. Tant que le drapeau
// n'est pas posé en production — geste de déploiement, distinct de celui-ci —
// la route reste fail-closed et ne sert RIEN. Deux gestes, deux responsables.
//
// Ce qui a été tranché à la signature, et qu'il faut savoir avant de toucher à
// ces règles :
//   · la citation `WN-CL-0105-001` de `R-STR-02` a été relue à la source et
//     CONSERVÉE — l'alerte qui la disait mal appariée était fausse (détail sur
//     la règle elle-même) ;
//   · le trou du PSQI partiel, nommé et laissé ouvert par le lot précédent, est
//     FERMÉ dans le moteur `psqi` (`questions.ts`, 2026-08-04) : il publie
//     désormais `missing`/`repondus` et retire sa BANDE sur recueil partiel ;
//   · `tfd` (`Q_GAS_01`), cible de `R-GAS-01` au second tour, était la réserve
//     connue de cette signature. Il est FERMÉ à son tour (2026-08-04) : le moteur
//     publie `missing`/`repondus` à la racine comme sur chaque axe, et retire ses
//     bandes — celle de l'instrument ET celle de l'axe — sur recueil partiel.
//     Cinq réponses sur trente-et-une, toutes au maximum de leur échelle,
//     rendaient « A — Absence de troubles fonctionnels ».
//
// RÉ-OUVERT LE 2026-08-05, ET IL FAUT LE LIRE ICI. Une rédaction antérieure de
// ces deux puces concluait que « `R-SOM-01` ne peut plus s'allumer sur un
// instrument à moitié rempli ». C'était vrai le 2026-08-04 ; c'est FAUX depuis
// que le plancher garanti est agi (D-021 a posé le plancher en RÉSERVANT
// l'orientation ; c'est D-024 qui lève cette réserve — le registre est
// append-only, la réserve de D-021 se lit donc encore telle qu'écrite) — un PSQI partiel dont
// le plancher est `warning` allume bel et bien `R-SOM-01`.
//
// Ce qui reste vrai, et qui n'a pas bougé d'un pouce : la bande MESURÉE exige
// toujours l'instrument complet, et `interpretation` reste `null` sur tout
// recueil partiel. Ce qui a changé : il existe désormais une SECONDE voie, qui
// n'est pas une mesure. Une règle `zone` s'allume sur un plancher quand toutes
// les bandes encore atteignables sont contenues dans sa zone —
// `zoneGarantieParLePlancher` (`orientationEngine.ts`) —, et le motif transmis
// au praticien porte alors « au moins ». Quatre règles sont concernées :
// `R-SOM-01`, `R-STR-01`, `R-STR-02` et `R-GAS-01` ; chacune motive sa fermeture
// sur place. Aucun objet de la table n'a été modifié pour cela, et la signature
// n'a donc pas été rouverte.
//
// CE QUI EST CLOS DEPUIS LE 2026-08-05 (PR #583) : `sum_decimal`,
// `count_threshold` et `ecab` ont reçu la même garde dans
// `web/src/lib/questions.ts` — recueil incomplet → `interpretation: null` et
// note explicite —, avec trois bancs dédiés. Ils n'« attendent » plus.
//
// CE QUI RESTE OUVERT dans la même classe : `seuils_points`, qui ne garde que
// le recueil entièrement vide, et dont le porteur `Q_ALI_01` est allumé en
// production. Aucune règle publiée ne lit sa bande — c'est la seule raison
// pour laquelle il attend. Motif complet dans `orientationEngine.ts`.
//
// TRAÇABILITÉ DES CLAIMS — ce que le CI vérifie, et ce qu'il ne peut pas.
// Le banc n'atteint que le FORMAT d'un `claimId` : les claims vivent dans
// `rag_corpus_claims` (base), qu'aucun test unitaire n'ouvre. Un identifiant
// inventé passerait donc le CI. Les claims cités ci-dessous ont été vérifiés à
// la main par lecture de la base, en 2026-08-03 puis 2026-08-04.
//
// LE COMPTE, MESURÉ et non additionné. Les quatre règles `R-*` de second tour
// citent SEPT claims distincts, les seize règles `R2-*` en citent VINGT, et
// quatre sont communs aux deux : l'union fait **vingt-trois**. Une rédaction
// précédente annonçait vingt-quatre, en additionnant deux sous-ensembles qui se
// recouvrent. Tous existent en
// `version_claim = 'v1.0'`, `statut = 'VALIDE'`, `prescriptif = true`,
// `active = true`. Cette lecture a été REFAITE EN BLOC à la signature, le
// 2026-08-04, sur les vingt-quatre identifiants alors envisagés — les
// vingt-trois retenus, plus un que seul un commentaire citait : tous répondent aux
// quatre conditions. Refaire cette lecture à chaque ajout de règle, et avant
// toute re-signature : c'est le maillon que l'automatisation ne couvre pas.
//
// `pack_humeur_motivation_neurochimie` n'est cible d'aucune règle : le pack
// correspondant (`PACK_HUMEUR_NEURO`) est `actif: false` en base. La route ne
// charge que les packs actifs, et une exploration humeur passe donc ici par le
// questionnaire HAD (`Q_NEU_11`) directement. Le jour où le pack est réactivé,
// c'est une décision produit — pas une correction de code.
//
// ─────────────────────────────────────────────────────────────────────────────
// V2 (2026-08-04) — LA DOCTRINE DES DEUX TOURS.
//
// V1 avait un défaut qu'aucun banc ne pouvait voir : ses six règles déclenchent
// sur `Q_SOM_01` (PSQI), `Q_STR_02` (PSS-10) et `Q_GAS_01` (TFD SIIN) — trois
// instruments qui ne sont PAS au pack de base. Le pack réellement administré au
// premier rendez-vous, par arbitrage praticien, est `Q_MOD_03`, `Q_MOD_01`,
// `Q_INF_03`, `Q_ALI_01`. Les règles de mesure de V1 ne pouvaient donc jamais
// s'allumer au premier tour : elles étaient justes, sourcées, publiées — et
// muettes au seul moment où le praticien attend quelque chose.
//
// D'où deux tours, et la table les nomme :
//
//   PREMIER TOUR — ce que le pack de base et l'anamnèse permettent de voir.
//   Déclencheurs sur `Q_MOD_01`, `Q_MOD_03`, `Q_INF_03` et les drapeaux
//   déclarés. Ce tour PROPOSE des instruments (PSQI, PSS-10, TFD…).
//
//   SECOND TOUR — ce que le premier tour a fait revenir rempli. Les quatre
//   règles de V1 conservées plus bas sont exactement cela : elles attendent le
//   retour des instruments que le premier tour vient de proposer. Elles ne sont
//   pas mortes, elles sont EN AVAL.
//
// La règle de doctrine de V1 est conservée telle quelle : UN DRAPEAU DÉCLARÉ
// SEUL NE PROPOSE JAMAIS UN ENSEMBLE D'INSTRUMENTS, SEULEMENT UN INSTRUMENT.
// Une case cochée dit
// ce que le patient redoute, pas ce qu'on a mesuré chez lui, et engager plusieurs
// instruments là-dessus ferait dire à l'outil plus qu'il ne sait. `R2-NEU-02` est la
// SEULE règle de cette table à déclencheur unique de drapeau — et elle propose
// bien un questionnaire unique (`Q_NEU_11`). Les trois règles qui proposent un
// ENSEMBLE SUR UN DRAPEAU (`R2-SOM-05`, `R2-STR-02`, `R2-GAS-02`) exigent toutes,
// en plus du drapeau, une mesure du pack de base.
//
// `R2-ALI-01` propose elle aussi un ensemble, et ne porte AUCUN drapeau : elle
// s'allume sur la seule bande globale d'un instrument certifié du pack de base.
// Ce n'est pas une exception à la doctrine — celle-ci n'interdit que le
// drapeau NU, et exige partout ailleurs qu'une mesure l'accompagne. Une mesure
// seule est le cas où il n'y a rien à accompagner.
//
// ── PLUS AUCUNE RÈGLE NE CIBLE UN PACK (2026-08-06, LOT-02, D-030) ──────────
//
// Les SIX suggestions qui portaient un `packId` — `R2-SOM-05`, `R2-STR-02`,
// `R2-GAS-02`, `R2-ALI-01`, `R-STR-02`, `R-GAS-01` — ciblent désormais des
// QUESTIONNAIRES, deux à trois par règle, pris au cœur de l'ancienne
// composition du pack. Le geste praticien qui en découle n'est plus une
// assignation de pack mais un ajout à la file d'envoi, instrument par
// instrument.
//
// CE QUI N'A PAS BOUGÉ : aucun déclencheur, aucun seuil, aucune zone, aucun
// `justificationClaims`, aucun `niveau`, aucune `priorite` de tête. Le compte
// reste de VINGT règles. Ce qui a bougé : les cibles, et les OBJECTIFS — les
// anciens décrivaient l'ensemble du pack (« exploration complète », « prise en
// charge globale ») et seraient devenus faux appliqués à un instrument. Chaque
// objectif dit maintenant ce que SON instrument mesure.
//
// Le type `OrientationSuggestion` accepte toujours un `packId`, et le moteur
// sait toujours l'absorber : c'est de la capacité conservée, pas une cible
// vivante. Une règle à `packId` réintroduite ici demanderait de rouvrir la
// question du geste praticien, qui ne sait plus assigner un pack depuis le
// panneau d'orientation.
//
// ── UN AXE INCOMPLET N'EST PAS UNE MESURE BASSE, ET LES DEUX INSTRUMENTS DU
//    PACK DE BASE NE SONT PAS LOGÉS À LA MÊME ENSEIGNE ────────────────────────
//
// Asymétrie relevée en revue adversariale le 2026-08-04, à écrire ici parce
// qu'elle ne se lit sur aucune des règles qu'elle concerne.
//
//   `Q_MOD_03` est IMMUNISÉ PAR CONSTRUCTION. Son moteur (`plaintes_actuelles`)
//   fait de chaque domaine UN SEUL item : un domaine sans réponse rend
//   `total: null`, jamais un total partiel, et aucune comparaison ne peut s'y
//   allumer. Les cinq règles écrites sur ses sous-scores n'ont besoin d'aucune
//   garde.
//
//   `Q_MOD_01` et `Q_INF_03` NE LE SONT PAS. Leur moteur (`subscore`) somme dix
//   items par axe et sert le total dès le PREMIER — un total réel, mais biaisé
//   VERS LE BAS. Sur `Q_MOD_01`, dont l'échelle est INVERSÉE et dont les sept
//   déclencheurs comparent en `<=`, ce biais FABRIQUE la dégradation : trois
//   items répondus à leur meilleure option, puis abandon, produisaient sept
//   recommandations dont deux packs, au motif d'un sommeil « non réparateur »
//   que le patient venait de décrire comme excellent.
//
// La garde vit dans `orientationEngine.ts` (`extraireCible` refuse un axe dont
// le recueil est incomplet), et `questions.ts` fait remonter `repondus` et
// `items` sur chaque sous-score pour la rendre possible. Ne pas conclure de
// l'immunité de `Q_MOD_03` que la classe de défaut est fermée : elle l'est par
// la forme de cet instrument-là, pas par une règle générale.
//
// La même garde vaut au niveau GLOBAL, et `R2-ALI-01` en dépend : le moteur
// `seuils_points` de `Q_ALI_01` sert son interprétation SANS condition de
// complétude, si bien qu'une enquête abandonnée après trois items rend la bande
// la plus sévère de sa grille.
//
// ── CE QUI A ÉTÉ ÉCARTÉ, FAUTE DE SOURCE ────────────────────────────────────
//
// Deux règles ont été envisagées et abandonnées, et l'abandon tient. Elles sont
// écrites ici pour qu'on ne les redécouvre pas : le sous-score existe dans les
// deux cas, c'est la source qui manque, et une règle sans claim ne serait de
// toute façon pas évaluée par le moteur.
//
//   1. Le pack cardio-métabolique sur une plainte de surpoids (`Q_MOD_03`
//      / `surpoids`). Aucun claim relu ne relie une plainte de surpoids
//      DÉCLARÉE à ce pack.
//   2. `Q_FIB_01` sur une plainte de douleur (`Q_MOD_03` / `douleurs`). Aucun
//      claim relu ne fonde le passage d'une plainte douloureuse à un
//      questionnaire de fibromyalgie.
//
// ── UN TROISIÈME ABANDON, RETIRÉ DE CETTE LISTE LE 2026-08-04 ───────────────
//
// Cette liste en comptait un troisième, et il y était sous une étiquette
// INEXACTE. Il disait qu'aucune règle alimentaire n'était possible « faute de
// source » — or la source existait, et la règle est désormais écrite
// (`R2-ALI-01`) : `WN-CL-0287-009` fonde explicitement le pack
// intestin-cerveau « lorsque le score global de l'enquête alimentaire SiiN
// détaillée est défavorable ». La note avait cherché une source pour la
// mauvaise règle, puis conclu de cet échec qu'il n'y avait rien.
//
// Ce qui de cet abandon reste VRAI, et n'a jamais été le même sujet :
// `Q_ALI_02` n'a pas à être proposé sur un `Q_MOD_01 / MODE_ALIMENTAIRE`
// dégradé — non par absence de source, mais par REDONDANCE. `WN-CL-0178-016`
// (« l'exploration contextuelle nutritionnelle du bilan classique et complet
// utilise l'enquête alimentaire contextuelle complète de SIIN ») désigne
// l'enquête SIIN, c'est-à-dire `Q_ALI_01`, DÉJÀ au pack de base : la règle
// proposerait de repasser ce qui vient d'être passé. `R2-ALI-01` ne fait pas
// cela — elle LIT `Q_ALI_01` revenu, et propose un pack digestif.
//
// La leçon vaut d'être gardée : « aucun claim ne justifie X » se vérifie sur
// la règle qu'on veut écrire, pas sur le thème dont elle relève.
//
// ── TRAÇABILITÉ ─────────────────────────────────────────────────────────────
//
// Les claims cités par cette table — 23 identifiants distincts en
// `justificationClaims`, plus `WN-CL-0178-016` qui n'apparaît que dans la note
// d'abandon ci-dessus, soit 24 en tout — ont été relus EN BASE le 2026-08-04,
// par `execute_sql` sur `rag_corpus_claims` : tous existent en
// `statut = 'VALIDE'`, `prescriptif = true`, `active = true`,
// `version_claim = 'v1.0'`. C'est le maillon que le CI ne couvre pas — le banc
// n'atteint que le FORMAT d'un `claimId`, jamais son existence. Refaire cette
// lecture à chaque ajout.
//
// Les deux règles ajoutées après la revue adversariale du 2026-08-04
// (`R2-NEU-04`, `R2-ALI-01`) n'introduisent AUCUN identifiant neuf : elles
// citent `WN-CL-0136-003`, `WN-CL-0136-004` et `WN-CL-0287-009`, déjà relus au
// titre de `R2-NEU-03`, `R2-GAS-02` et `R-GAS-01`. Le jeu de claims à
// re-vérifier avant signature est donc inchangé.
export const ORIENTATION_RULES_V1: OrientationRule[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // PREMIER TOUR — sur le pack de base (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`,
  // `Q_ALI_01`) et sur l'anamnèse. Ce sont les seules règles qui peuvent
  // s'allumer au premier rendez-vous.
  //
  // Sur `Q_MOD_01`, TOUS les déclencheurs sont des `comparaison`, jamais des
  // couleurs, et ce n'est pas un choix de style : cet instrument n'émet AUCUNE
  // interprétation globale (son `interpretation` est indexée par sous-échelle),
  // et ses grilles de sous-score ont des TROUS. Le détail est écrit sur
  // `R2-SOM-01`, qui porte le cas.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'R2-SOM-01',
    statut: 'publiee',
    // `WN-CL-0323-023` pose que « le PSQI peut être proposé systématiquement
    // avant la consultation et au cours de la prise en charge pour établir un
    // score et observer l'évolution sous traitement » ; `WN-CL-0178-017` place
    // le PSQI en tête de l'exploration contextuelle du sommeil du bilan complet
    // (« associe le PSQI, un agenda de sommeil et le chronotype de Horne »).
    // Un sommeil dégradé au questionnaire contextuel appelle donc la mesure
    // dédiée — c'est ce que fait cette règle.
    //
    // RESSERREMENT CONSERVATEUR NON SOURCÉ, nommé comme tel depuis le
    // 2026-08-04 (même geste que `R2-SOM-05`, qui le disait déjà). Le claim
    // écrit « SYSTÉMATIQUEMENT » : suivi à la lettre, il proposerait le PSQI à
    // tout le monde, sans aucun déclencheur. La règle exige en plus un contexte
    // de sommeil dégradé (`<= 14`). Ce resserrement ne vient d'aucune source —
    // il vient de l'arbitrage de ne pas alourdir le parcours d'un patient dont
    // le sommeil ne décroche pas. Il fait donc moins que ce que le corpus
    // autorise, jamais plus : c'est le sens dans lequel une règle non sourcée
    // est tolérable ici.
    //
    // POURQUOI `<= 14`, ET POURQUOI UNE COMPARAISON PLUTÔT QU'UNE COULEUR.
    // L'échelle de `Q_MOD_01` est INVERSÉE — un score bas est défavorable —
    // d'où `<=`. Sa grille `SOMMEIL` compte trois bandes : 0-8 « Sommeil non
    // réparateur » (danger), 10-14 « Sommeil insuffisant » (warning), 15-28
    // « Sommeil satisfaisant » (success). `<= 14` couvre les deux bandes
    // défavorables — et LE 9, que la grille ne couvre pas du tout. À cette
    // valeur, `interpretRanges` ne trouve aucune bande et rend `null` (son
    // unique repli ne joue que PAR LE HAUT, au-dessus du plafond de grille).
    // Un déclencheur `{type: 'couleur'}` laisserait donc échapper un patient
    // dont le sommeil est plus dégradé que celui d'un 10, faute d'étiquette à
    // lui accrocher. La comparaison lit le nombre, pas l'étiquette : elle
    // traverse le trou. `orientationRulesV1.test.ts` épingle le cas à 9 —
    // c'est le seul test que la mutation en couleur fait rougir.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_01', sousScore: 'SOMMEIL', operateur: '<=', valeur: 14 },
    ],
    suggestions: [
      { questionnaireId: 'Q_SOM_01', priorite: 1, objectif: 'Mesurer la qualité du sommeil par le PSQI quand le questionnaire contextuel la donne pour insuffisante ou non réparatrice.' },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0178-017', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0323-023', versionClaim: 'v1.0' },
    ],
    niveau: 'socle',
  },
  {
    id: 'R2-SOM-02',
    statut: 'publiee',
    // Même cible que `R2-SOM-01`, par l'autre versant : la PLAINTE plutôt que
    // le contexte. `WN-CL-0234-011` énonce que « l'évaluation du retentissement
    // sur le sommeil peut se faire par interrogatoire simple, par un
    // questionnaire type PSQI, ou par un agenda de sommeil » — la plainte de
    // sommeil ouvre donc bien sur le PSQI, que `WN-CL-0323-023` autorise à
    // proposer systématiquement.
    //
    // Deux règles vers une même cible n'est pas une redondance : le moteur les
    // agrège en une seule recommandation portant DEUX motifs, et une cible que
    // deux sources indépendantes désignent remonte plus haut au tri.
    //
    // POURQUOI `>= 7`. `Q_MOD_03` est une échelle de plainte de 1 à 10, sens du
    // trouble — un score haut est défavorable, d'où `>=`. Ses bandes sont 1-3
    // « Intensité faible ou absente », 4-6 « Intensité modérée », 7-8
    // « Intensité élevée », 9-10 « Intensité très élevée ». `>= 7` vise les deux
    // bandes hautes et elles seules : une plainte modérée ne justifie pas encore
    // d'ajouter un instrument au parcours.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_03', sousScore: 'sommeil', operateur: '>=', valeur: 7 },
    ],
    suggestions: [
      { questionnaireId: 'Q_SOM_01', priorite: 1, objectif: 'Objectiver par le PSQI une plainte de sommeil que le patient déclare intense.' },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0234-011', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0323-023', versionClaim: 'v1.0' },
    ],
    niveau: 'socle',
  },
  {
    id: 'R2-SOM-03',
    statut: 'publiee',
    // `WN-CL-0315-007` : « le questionnaire de chronotype de Horne est
    // indispensable dans un second temps pour une meilleure hygiène des rythmes
    // de vie et du sommeil ». `WN-CL-0323-025` ajoute qu'il « doit être réalisé
    // une seule fois car le chronotype est une dimension fondamentale et stable
    // qui n'évolue pas » — d'où `approfondissement` et non `socle` : un
    // instrument qu'on ne passe qu'une fois se propose quand le rythme le
    // motive, pas d'emblée.
    //
    // POURQUOI `<= 14`, sur `RYTHME_BIOLOGIQUE` cette fois. La grille de cet axe
    // est calquée sur celle de `SOMMEIL` : 0-8 « Rythme non réparateur », 10-14
    // « Rythme insuffisant », 15-28 « Rythme satisfaisant ». Elle porte donc le
    // MÊME trou à 9, et le seuil couvre ici encore les deux bandes défavorables
    // plus la valeur sans bande. Le chronotype est précisément ce qu'on
    // interroge quand les rythmes décrochent.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_01', sousScore: 'RYTHME_BIOLOGIQUE', operateur: '<=', valeur: 14 },
    ],
    suggestions: [
      { questionnaireId: 'Q_SOM_05', priorite: 1, objectif: "Situer le chronotype par le questionnaire de Horne quand le rythme biologique est insuffisant, pour ajuster l'hygiène des rythmes." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0315-007', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0323-025', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R2-SOM-04',
    statut: 'publiee',
    // DÉCLARÉ ET MESURÉ. `WN-CL-0359-025` demande que l'enquête contextuelle
    // recherche une cause liée au sommeil, en nommant explicitement les
    // « ronflements ou apnées » : c'est LUI qui porte l'indication de cette
    // règle. `WN-CL-0312-021` inscrit « le questionnaire de Berlin » au suivi
    // annuel recommandé par la SFRMS 2018 — il établit L'IDENTITÉ de
    // l'instrument (`Q_SOM_03` EST le questionnaire de Berlin), et rien de plus.
    //
    // Correction du 2026-08-04 : la rédaction précédente concluait de ce couple
    // que « la règle propose exactement ce que la source désigne ». C'était
    // surestimer `WN-CL-0312-021`, qui décrit une batterie de SUIVI ANNUEL EN
    // MÉDECINE DU TRAVAIL — un contexte, une périodicité et une population qui
    // ne sont pas ceux d'un dépistage déclenché par une plainte. Les deux
    // claims sont bien nécessaires, mais ils ne disent pas la même chose :
    // l'un nomme l'instrument, l'autre justifie qu'on le passe ici.
    //
    // L'antécédent respiratoire seul ne suffit pas : une apnée appareillée et
    // équilibrée n'appelle pas de dépistage. C'est la conjonction avec un
    // sommeil contextuel dégradé qui fait la question clinique, et c'est l'ET
    // logique du moteur qui l'impose.
    //
    // `<= 14` : même seuil et même raison que `R2-SOM-01` — les deux bandes
    // défavorables de `SOMMEIL`, plus le 9 sans bande.
    declencheurs: [
      { type: 'drapeau', champ: 'antecedentsDomaines', valeurs: ['Respiratoire / apnée du sommeil'] },
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_01', sousScore: 'SOMMEIL', operateur: '<=', valeur: 14 },
    ],
    suggestions: [
      { questionnaireId: 'Q_SOM_03', priorite: 1, objectif: "Dépister le syndrome d'apnées par le questionnaire de Berlin quand un antécédent respiratoire est déclaré et que le sommeil est dégradé." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0312-021', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0359-025', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R2-SOM-05',
    statut: 'publiee',
    // La règle de sommeil la plus engageante — un ENSEMBLE de deux
    // instruments —, et elle exige donc les deux : l'attente déclarée ET la
    // mesure. Une attente cochée dit ce que le patient veut, pas ce qu'on a
    // constaté — la doctrine en tête de table interdit d'engager un ensemble
    // là-dessus seul.
    //
    // `WN-CL-0178-017` décrit l'exploration du sommeil du bilan complet comme un
    // ENSEMBLE — « associe le PSQI, un agenda de sommeil et le chronotype de
    // Horne » —, et c'est bien un ensemble d'instruments, non une pièce unique,
    // qui y correspond. `WN-CL-0323-023` en fonde la pièce maîtresse.
    //
    // RE-CIBLÉE LE 2026-08-06 (LOT-02, D-030) : la cible
    // `pack_sommeil_chronobiologie` est remplacée par LES DEUX INSTRUMENTS QUE
    // LE CLAIM NOMME et que cette table sait proposer — le PSQI (`Q_SOM_01`) et
    // le chronotype de Horne (`Q_SOM_05`). C'est la composition arbitrée par le
    // praticien le 2026-08-06, après la revue adversariale du même jour.
    //
    // CE QUE LA RÈGLE NE PROPOSE PAS, ET POURQUOI — les trois cas sont
    // différents, et les confondre est ce que la première rédaction avait fait.
    //
    //   L'AGENDA DE SOMMEIL (`Q_SOM_09`), troisième pièce nommée par le claim,
    //   n'est pas une passation ponctuelle : c'est un RECUEIL LONGITUDINAL sur
    //   vingt-et-une nuits, avec son propre parcours et sa propre clôture
    //   (`lib/agenda-sommeil/`). Il n'appartenait pas non plus à la composition
    //   du pack que cette règle remplace. L'engager depuis une ligne
    //   d'orientation reviendrait à traiter un suivi de trois semaines comme un
    //   questionnaire de quinze minutes — c'est un geste d'une autre nature, et
    //   il ne relève pas de cette table.
    //
    //   L'ÉCHELLE D'EPWORTH (`Q_SOM_02`) et LE QUESTIONNAIRE DE BERLIN
    //   (`Q_SOM_03`) ont été RETIRÉS de cette règle le 2026-08-06, et le motif
    //   n'est pas le même pour les deux. Aucun des deux n'est nommé par
    //   `WN-CL-0178-017` : les proposer ici les aurait fait reposer sur un claim
    //   qui ne les couvre pas. Et pour Berlin, s'ajoute le défaut le plus grave
    //   des deux — `R2-SOM-04` conditionne le dépistage d'apnées à un ANTÉCÉDENT
    //   RESPIRATOIRE déclaré ; le proposer ici sur la seule attente de sommeil
    //   aurait CONTOURNÉ cette porte, sans que rien ne le signale. Les deux
    //   instruments restent portés par leurs règles dédiées : Epworth par
    //   `R2-SOM-06` (plainte de fatigue intense, sur `WN-CL-0314-012`), Berlin
    //   par `R2-SOM-04`.
    //
    // La leçon est celle que cette table paie régulièrement : une composition ne
    // se choisit pas sur ce qu'un pack contenait, mais sur ce que les claims de
    // la règle nomment — et une porte posée par une règle sœur ne se contourne
    // pas par une cible ajoutée ailleurs.
    //
    // POURQUOI `<= 8` ICI, ET NON `<= 14`. Ce seuil ne vise QUE la bande la plus
    // sévère, « Sommeil non réparateur » (0-8). Engager deux instruments n'est
    // pas en proposer un : le coût pour le patient n'est pas le même, et le
    // seuil se resserre en conséquence. Effet de bord voulu : le trou à 9
    // tombe ici du côté NON déclenchant, et un patient à 9 relève de
    // `R2-SOM-01`, qui lui propose le PSQI seul.
    declencheurs: [
      { type: 'drapeau', champ: 'attentes', valeurs: ['Améliorer le sommeil'] },
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_01', sousScore: 'SOMMEIL', operateur: '<=', valeur: 8 },
    ],
    suggestions: [
      { questionnaireId: 'Q_SOM_01', priorite: 1, objectif: "Mesurer la qualité du sommeil par le PSQI quand le patient demande à l'améliorer et que le sommeil est non réparateur." },
      { questionnaireId: 'Q_SOM_05', priorite: 2, objectif: "Situer le chronotype par le questionnaire de Horne quand le patient demande à améliorer un sommeil non réparateur." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0178-017', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0323-023', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R2-SOM-06',
    statut: 'publiee',
    // Un claim, deux instruments, et la règle les propose tous les deux dans
    // l'ordre où il les nomme. `WN-CL-0314-012` : « l'échelle d'Epworth doit
    // être proposée systématiquement, ainsi que l'échelle de Pichot, pour
    // évaluer l'impact sur la vitalité et la vigilance circadienne ». Epworth =
    // `Q_SOM_02` (priorité 1), Pichot = `Q_SOM_06` (priorité 2). La plainte de
    // FATIGUE est la porte d'entrée de ce couple : c'est l'impact sur la
    // vitalité que le claim vise.
    //
    // `>= 7` : bandes « Intensité élevée » (7-8) et « très élevée » (9-10) de
    // `Q_MOD_03`, comme pour `R2-SOM-02`.
    //
    // RESSERREMENT CONSERVATEUR NON SOURCÉ, nommé comme tel depuis le
    // 2026-08-04 — même cas que `R2-SOM-01`, et même geste que `R2-SOM-05`.
    // `WN-CL-0314-012` écrit « doit être proposée SYSTÉMATIQUEMENT » : la porte
    // d'entrée par une plainte de fatigue intense (`>= 7`) est ajoutée par cette
    // table, pas par la source. Elle fait moins que ce que le claim autorise —
    // un patient à plainte de fatigue modérée ne recevra ni Epworth ni Pichot,
    // alors que la source les proposerait — et c'est l'arbitrage assumé de ne
    // pas ouvrir deux instruments à tout le monde dès le premier tour.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_03', sousScore: 'fatigue', operateur: '>=', valeur: 7 },
    ],
    suggestions: [
      { questionnaireId: 'Q_SOM_02', priorite: 1, objectif: "Mesurer la somnolence diurne par l'échelle d'Epworth, que la source demande de proposer systématiquement." },
      { questionnaireId: 'Q_SOM_06', priorite: 2, objectif: "Mesurer la fatigue par l'échelle de Pichot, que la source associe à Epworth pour l'impact sur la vitalité." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0314-012', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R2-STR-01',
    statut: 'publiee',
    // `WN-CL-0314-008` et `WN-CL-0319-010` disent la même chose de deux façons :
    // « il est recommandé d'évaluer l'intensité du stress chronique par des
    // questionnaires habituels », complétés d'une évaluation du risque de
    // burnout. Le « questionnaire habituel » d'intensité est le PSS-10
    // (`Q_STR_02`) ; le volet burnout est porté par `R2-STR-03` et `R-STR-01`,
    // qui n'interviennent qu'une fois cette mesure revenue.
    //
    // POURQUOI `<= 17` ET NON `<= 14`. L'axe `ADAPTATION_STRESS` ne partage PAS
    // la grille des autres axes de `Q_MOD_01` : ses bandes sont 0-8 « Adaptation
    // perturbée », 10-17 « Adaptation insuffisante », 18-24 « Adaptation
    // satisfaisante ». 17 est donc la frontière RÉELLE de sa bande défavorable
    // haute — reprendre le 14 des axes voisins aurait laissé dehors, sans le
    // dire, la moitié haute des adaptations insuffisantes. Le trou à 9 est
    // couvert ici aussi.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_01', sousScore: 'ADAPTATION_STRESS', operateur: '<=', valeur: 17 },
    ],
    suggestions: [
      { questionnaireId: 'Q_STR_02', priorite: 1, objectif: "Mesurer l'intensité du stress chronique par le PSS-10 quand l'adaptation au stress est insuffisante ou perturbée." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0314-008', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0319-010', versionClaim: 'v1.0' },
    ],
    niveau: 'socle',
  },
  {
    id: 'R2-STR-02',
    statut: 'publiee',
    // DÉCLARÉ ET MESURÉ, comme `R-STR-02` le fait au second tour avec le PSS-10.
    // Ici c'est le pack de base qui fournit la mesure, et un ensemble
    // d'instruments du stress qui est proposé. `WN-CL-0314-008` fonde
    // l'évaluation du stress chronique complétée du risque de burnout : c'est
    // le SEUL claim de cette règle, et il couvre bien les trois cibles servies —
    // mesurer l'intensité du stress (PSS-10) et la préciser (DASS-21, Cungi).
    //
    // `WN-CL-0243-005` A ÉTÉ RETIRÉ D'ICI LE 2026-08-06, à la revue
    // adversariale. Il nomme le BMS-10 et le questionnaire de KARASEK — deux
    // instruments qu'aucune cible de cette règle ne sert. Il était cité au titre
    // du pack, dont la composition les embarquait ; le pack disparu, la citation
    // ne pointait plus rien, et un claim qui ne fonde aucune cible de sa règle
    // est une justification a posteriori. Il vit désormais sur `R-STR-02`, qui
    // propose Karasek pour de bon. Le jeu des 23 claims de la table est
    // inchangé : `R2-STR-03` le cite toujours, au titre du BMS-10.
    //
    // Le facteur déclenchant seul ne suffit pas à engager un ensemble entier :
    // c'est la ligne de doctrine, tenue ici comme en V1.
    //
    // RE-CIBLÉE LE 2026-08-06 (LOT-02, D-030) : `pack_stress_chronique_burnout`
    // est remplacé par trois questionnaires du cœur de son ancienne composition.
    // Chaque objectif dit ce que son instrument mesure ; aucun ne promet plus la
    // couverture d'un pack. Déclencheurs, seuils et niveau inchangés.
    //
    // `<= 17` : même seuil et même raison que `R2-STR-01` — la bande
    // « Adaptation insuffisante » de cet axe monte jusqu'à 17.
    declencheurs: [
      { type: 'drapeau', champ: 'facteursDeclenchants', valeurs: ['Stress aigu / burn-out'] },
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_01', sousScore: 'ADAPTATION_STRESS', operateur: '<=', valeur: 17 },
    ],
    suggestions: [
      { questionnaireId: 'Q_STR_02', priorite: 1, objectif: "Mesurer l'intensité du stress perçu par le PSS-10 quand un burn-out est déclaré comme facteur déclenchant et que l'adaptation est insuffisante." },
      { questionnaireId: 'Q_STR_04', priorite: 2, objectif: 'Situer dépression, anxiété et stress par le DASS-21 devant un burn-out déclaré comme facteur déclenchant.' },
      { questionnaireId: 'Q_STR_03', priorite: 3, objectif: "Préciser le vécu du stress par le questionnaire de Cungi quand l'adaptation au stress est insuffisante." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0314-008', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R2-STR-03',
    statut: 'publiee',
    // `WN-CL-0228-009` : « les questionnaires de surinvestissement (BMS et/ou
    // Karasek) doivent être utilisés pour évaluer le risque de burnout » ;
    // `WN-CL-0243-005` précise le format retenu, « le BMS (questionnaire de
    // Maslach-Pine) en 10 items ». `Q_STR_05` EST le BMS-10.
    //
    // POURQUOI `<= 8` ICI. Cette règle est le raccourci du premier tour vers le
    // BMS-10 : au second tour, c'est `R-STR-01` qui le propose sur la foi du
    // PSS-10, l'instrument fait pour ça. La proposer dès le pack de base ne se
    // justifie donc que sur la bande la plus sévère, « Adaptation perturbée »
    // (0-8) — une adaptation seulement insuffisante passe d'abord par la mesure
    // de stress que `R2-STR-01` propose.
    //
    // CE QUE LE RESSERREMENT NE FAIT PAS — correction du 2026-08-04. Une
    // rédaction précédente affirmait qu'il « évite de doubler `R2-STR-01` pour
    // tout patient qu'elle attrape déjà ». C'est faux, et vérifié : à
    // `ADAPTATION_STRESS = 8`, les DEUX règles s'allument, `R2-STR-01` incluse
    // (`8 <= 17`). Elles ne se doublent d'ailleurs pas, puisqu'elles visent des
    // cibles différentes — `Q_STR_02` d'un côté, `Q_STR_05` de l'autre — et le
    // moteur les sert comme deux recommandations distinctes. Ce que le
    // resserrement fait, et rien d'autre : il empêche `R2-STR-03` de mordre sur
    // la bande 10-17, où le BMS-10 attendra d'abord le retour du PSS-10.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_01', sousScore: 'ADAPTATION_STRESS', operateur: '<=', valeur: 8 },
    ],
    suggestions: [
      { questionnaireId: 'Q_STR_05', priorite: 1, objectif: "Évaluer sans attendre le risque de burnout par le BMS-10 quand l'adaptation au stress est perturbée." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0243-005', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0228-009', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R2-NEU-01',
    statut: 'publiee',
    // `WN-CL-0154-013` : « les questionnaires HAD et BDI sont utilisés pour
    // éliminer un problème dépressif et/ou un problème anxieux ».
    // `WN-CL-0234-010` laisse le choix entre « un questionnaire d'anxiété
    // spécifique, ou le DASS 21, ou le HAD, selon l'expérience et les
    // préférences du praticien ». Les deux claims nomment le HAD ; c'est le
    // seul des trois à être au catalogue et administrable, et c'est `Q_NEU_11`.
    //
    // `>= 7` : « Intensité élevée » et « très élevée » de `Q_MOD_03`. Le verbe
    // des claims est ÉLIMINER — objectiver une plainte de moral intense pour
    // savoir ce qu'on écarte —, ce qui en fait un geste de socle et non
    // d'approfondissement.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_03', sousScore: 'moral', operateur: '>=', valeur: 7 },
    ],
    suggestions: [
      { questionnaireId: 'Q_NEU_11', priorite: 1, objectif: "Objectiver l'humeur et l'anxiété par le HAD quand la plainte de moral est intense." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0154-013', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0234-010', versionClaim: 'v1.0' },
    ],
    niveau: 'socle',
  },
  {
    id: 'R2-NEU-02',
    statut: 'publiee',
    // Reprend `R-ANA-02` de V1 sans en changer un caractère : même déclencheur,
    // même cible, mêmes claims. Elle change seulement de nom, pour rejoindre la
    // famille du premier tour à laquelle elle appartenait déjà — l'anamnèse est
    // disponible au premier rendez-vous.
    //
    // `WN-CL-0339-010` : « en cas de suspicion d'épisode dépressif caractérisé,
    // il est recommandé de rechercher les antécédents psychiatriques et
    // somatiques lors du bilan initial » ; `WN-CL-0047-008` : « une exploration
    // systématique de l'humeur est fiable ». L'antécédent déclaré et
    // l'exploration systématique se répondent : c'est ce qui autorise, ici
    // seulement, un déclencheur de drapeau UNIQUE.
    //
    // Et c'est bien un QUESTIONNAIRE qui est proposé, jamais un pack — la seule
    // règle à déclencheur unique de drapeau de cette table est aussi celle qui
    // démontre la doctrine posée en tête. Le pack humeur est de toute façon
    // inactif en base (voir l'en-tête).
    declencheurs: [
      { type: 'drapeau', champ: 'antecedentsDomaines', valeurs: ['Psychiatrique (anxiété, dépression, burn-out)'] },
    ],
    suggestions: [
      { questionnaireId: 'Q_NEU_11', priorite: 1, objectif: "Objectiver l'humeur et l'anxiété quand un antécédent psychiatrique est déclaré au bilan initial." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0339-010', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0047-008', versionClaim: 'v1.0' },
    ],
    niveau: 'socle',
  },
  {
    id: 'R2-NEU-03',
    statut: 'publiee',
    // `WN-CL-0136-003` demande de refaire ensemble « les tests de motivation de
    // Lagrue, HAD, et les échelles fonctionnelles dopamine-sérotonine » : le
    // claim tient dans une même phrase le HAD et l'échelle fonctionnelle
    // sérotonine, c'est-à-dire le sous-score `SE` de `Q_INF_03`. C'est tout ce
    // qu'il est cité pour établir ici — la CO-ADMINISTRATION des deux
    // instruments —, et rien de plus. Il vient d'un contexte de SEVRAGE
    // TABAGIQUE (d'où le test de motivation de Lagrue à ses côtés) ; la règle
    // n'emprunte pas son indication, seulement le fait que ces deux mesures se
    // lisent ensemble.
    //
    // D'OÙ VIENT LE SEUIL — CORRECTION DU 2026-08-04. La rédaction précédente
    // affirmait que `>= 10` était « la négation exacte du profil favorable »
    // décrit par `WN-CL-0136-004` (« un score de motivation de Lagrue supérieur
    // à 6, un score HAD inférieur à 7, et des scores fonctionnels D et S
    // inférieurs à 10 »). C'est LOGIQUEMENT FAUX : ce profil est une
    // CONJONCTION de trois conditions, et la négation d'une conjonction est une
    // DISJONCTION — « Lagrue ≤ 6 OU HAD ≥ 7 OU D ≥ 10 OU S ≥ 10 ». Un patient
    // à `SE = 12` n'est pas hors du profil favorable à cause de son `SE` : il
    // en est hors, point, et on ne sait pas par quelle branche. Le déclencheur
    // ne peut donc pas se réclamer de cette négation.
    //
    // LE SEUIL EST CELUI DE LA GRILLE CERTIFIÉE DE `Q_INF_03`, et il n'a pas
    // besoin d'autre fondement : l'instrument lit 0-9 « Peu perturbé », 10-19
    // « Perturbations probables », 20-40 « Fortement perturbé » — wildcard
    // `subscale: '*'`, donc la même grille sur les quatre axes. `>= 10` est
    // l'entrée dans « Perturbations probables », c'est-à-dire la première bande
    // défavorable que la grille publie. C'est un arbitrage de BANDE D'ENTRÉE,
    // pris instrument par instrument comme le dit l'en-tête de table, et non un
    // nombre écrit ici.
    //
    // Que `WN-CL-0136-004` place lui aussi une frontière à 10 sur les échelles
    // fonctionnelles reste une convergence utile à noter — elle n'est pas ce
    // qui décide. `>=` parce que cette échelle-ci va dans le sens du trouble,
    // contrairement à `Q_MOD_01`. Une comparaison plutôt qu'une couleur car
    // `Q_INF_03` n'émet aucune interprétation globale : une zone sans
    // `sousScore` y serait morte.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'SE', operateur: '>=', valeur: 10 },
    ],
    suggestions: [
      { questionnaireId: 'Q_NEU_11', priorite: 1, objectif: "Explorer l'humeur par le HAD quand l'échelle fonctionnelle sérotonine entre dans la bande « Perturbations probables » de sa grille." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0136-003', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0136-004', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R2-NEU-04',
    statut: 'publiee',
    // JUMELLE DE `R2-NEU-03`, SUR L'AXE DOPAMINE — et son existence répare un
    // choix qui n'était pas dit.
    //
    // `WN-CL-0136-003` nomme « les échelles fonctionnelles
    // dopamine-sérotonine » et `WN-CL-0136-004` « des scores fonctionnels D et
    // S inférieurs à 10 » : les deux claims tiennent `D` et `S` AU MÊME RANG,
    // dans la même phrase, sous le même seuil. Écrire `R2-NEU-03` sur `SE` et
    // s'arrêter là revenait à retenir la moitié de ce que la source nomme, sans
    // que rien n'explique laquelle ni pourquoi — un arbitrage clinique pris par
    // omission. Il n'y en a pas à prendre : les deux axes ouvrent sur le même
    // instrument, et cette règle le dit à voix haute.
    //
    // Même seuil, même raison que `R2-NEU-03` : `>= 10` est l'entrée dans
    // « Perturbations probables », et la grille de `Q_INF_03` est déclarée en
    // wildcard `subscale: '*'` — c'est donc littéralement la MÊME grille sur
    // `DA` que sur `SE`, pas une grille voisine.
    //
    // Les deux règles atteignent `Q_NEU_11`. Ce n'est pas une redondance : le
    // moteur les agrège en une recommandation à deux motifs, et un HAD que deux
    // axes fonctionnels indépendants désignent remonte plus haut au tri.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'DA', operateur: '>=', valeur: 10 },
    ],
    suggestions: [
      { questionnaireId: 'Q_NEU_11', priorite: 1, objectif: "Explorer l'humeur par le HAD quand l'échelle fonctionnelle dopamine entre dans la bande « Perturbations probables » de sa grille." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0136-003', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0136-004', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R2-GAS-01',
    statut: 'publiee',
    // `WN-CL-0228-010` inscrit « un questionnaire des troubles fonctionnels
    // digestifs et intestinaux » dans le socle de l'évaluation clinique, au même
    // rang que le questionnaire de sommeil. C'est `Q_GAS_01` (TFD SIIN), et
    // c'est pourquoi cette règle est `socle` là où `R-GAS-01`, qui engage un
    // pack sur le résultat du même instrument, est `approfondissement`.
    //
    // `>= 7` : « Intensité élevée » et « très élevée » de `Q_MOD_03`, comme pour
    // les autres plaintes. Une plainte digestive intense appelle l'instrument
    // dédié ; une plainte modérée ne suffit pas seule — voir `R2-GAS-02`, qui
    // descend plus bas mais exige un antécédent en plus.
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_03', sousScore: 'digestion', operateur: '>=', valeur: 7 },
    ],
    suggestions: [
      { questionnaireId: 'Q_GAS_01', priorite: 1, objectif: 'Mesurer les troubles fonctionnels digestifs et intestinaux par le TFD SIIN quand la plainte digestive est intense.' },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0228-010', versionClaim: 'v1.0' },
    ],
    niveau: 'socle',
  },
  {
    id: 'R2-GAS-02',
    statut: 'publiee',
    // ARBITRAGE PRATICIEN DU 2026-08-04 — et il faut l'écrire ainsi, parce que
    // la rédaction précédente le présentait comme la lecture d'un claim.
    //
    // CE QUE LES CLAIMS FONDENT, exactement. `WN-CL-0228-010` inscrit « un
    // questionnaire des troubles fonctionnels digestifs et intestinaux » dans le
    // socle de l'évaluation : il fonde l'INSTRUMENT (le TFD), pas ce
    // déclencheur. `WN-CL-0287-009` pose que « l'assiette de détoxication peut
    // être proposée lorsque le score au questionnaire des troubles fonctionnels
    // intestinaux est élevé ou lorsque le score global de l'enquête alimentaire
    // SiiN détaillée est défavorable » : il fonde l'INDICATION de l'assiette
    // — que le pack intestin-cerveau porte — sur DEUX entrées, le TFD revenu
    // (c'est `R-GAS-01`) et l'enquête SIIN défavorable (c'est `R2-ALI-01`).
    // Ni l'un ni l'autre ne parle d'une plainte digestive contextuelle, ni d'un
    // antécédent déclaré.
    //
    // CE QUE LA TABLE AJOUTE, ET QUI N'EST DANS AUCUN CLAIM : le FAISCEAU
    // « antécédent digestif déclaré + plainte digestive au moins modérée »
    // comme porte d'entrée du même axe, dès le premier tour, avant que le TFD
    // ne soit revenu. C'est un raccourci clinique assumé, pris ici, et il se
    // défend sur deux appuis — l'axe qu'il engage est celui que
    // `WN-CL-0287-009` indique, et l'instrument de tête est celui que
    // `WN-CL-0228-010` place au socle. Les claims restent donc cités : ils
    // disent où mène la règle, pas d'où elle part.
    //
    // RE-CIBLÉE LE 2026-08-06 (LOT-02, D-030) : `pack_digestif_intestin_cerveau`
    // est remplacé par trois questionnaires du cœur de son ancienne composition.
    // Déclencheurs, seuils, claims et niveau inchangés.
    //
    // POURQUOI `>= 4`, ALORS QUE `R2-GAS-01` EXIGE `>= 7`. Le seuil descend
    // volontairement d'une bande, à « Intensité modérée » (4-6), PARCE QU'UN
    // ANTÉCÉDENT DIGESTIF DÉCLARÉ S'Y AJOUTE. Ce n'est pas le même patient :
    // une plainte modérée chez quelqu'un qui rapporte un SII, un reflux ou une
    // MICI ne se lit pas comme une plainte modérée isolée. Le déclencheur qui
    // s'ajoute paie l'abaissement du seuil — c'est l'ET logique du moteur qui
    // tient les deux ensemble, et l'un ne vaut jamais sans l'autre. Cet
    // abaissement-là non plus n'est dans aucun claim : il fait partie de
    // l'arbitrage.
    declencheurs: [
      { type: 'drapeau', champ: 'antecedentsDomaines', valeurs: ['Digestif (SII, reflux, MICI…)'] },
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_03', sousScore: 'digestion', operateur: '>=', valeur: 4 },
    ],
    suggestions: [
      { questionnaireId: 'Q_GAS_01', priorite: 1, objectif: 'Mesurer les troubles fonctionnels digestifs et intestinaux par le TFD SIIN quand un antécédent digestif est déclaré et que la plainte est au moins modérée.' },
      { questionnaireId: 'Q_GAS_03', priorite: 2, objectif: "Caractériser le transit par l'échelle de Bristol devant un antécédent digestif déclaré et une plainte au moins modérée." },
      { questionnaireId: 'Q_INF_01', priorite: 3, objectif: "Rechercher des signes d'hyperexcitabilité neuro-musculaire par le questionnaire d'hyperexcitabilité SIIN, quand un antécédent digestif est déclaré et que la plainte est au moins modérée." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0228-010', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0287-009', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R2-ALI-01',
    statut: 'publiee',
    // LA SECONDE PORTE DE `WN-CL-0287-009`, restée fermée jusqu'ici. Le claim
    // dit VERBATIM : « l'assiette de détoxication peut être proposée lorsque le
    // score au questionnaire des troubles fonctionnels intestinaux est élevé OU
    // LORSQUE LE SCORE GLOBAL DE L'ENQUÊTE ALIMENTAIRE SIIN DÉTAILLÉE EST
    // DÉFAVORABLE ». Sa première branche était câblée (`R-GAS-01`, sur le TFD
    // revenu au second tour) ; la seconde ne l'était pas, alors que `Q_ALI_01`
    // EST au pack de base et revient dès le premier rendez-vous. C'est la règle
    // que la note « écarté faute de source » disait à tort impossible.
    //
    // DÉCLENCHEUR GLOBAL, SANS `sousScore` — et c'est une contrainte de
    // l'instrument, pas un choix. `Q_ALI_01` tourne sur le moteur
    // `seuils_points` : il émet bien une `interpretation` GLOBALE sur /90, mais
    // AUCUN `subScores` (ses `dimensions` sont descriptives et ses
    // `sousScoresBesoins` servent Mon équilibre — `extraireCible` ne lit ni
    // l'une ni l'autre). Un déclencheur avec `sousScore` y serait mort en
    // silence.
    //
    // POURQUOI `{type: 'interpretation'}` ET NON `{type: 'couleur'}` — LA SEULE
    // FORME QUI RENDE CETTE RÈGLE SOLIDAIRE DE L'INSTRUMENT QUE SON CLAIM
    // COUVRE. Ce n'est pas un détail de style, et la première rédaction s'y
    // était trompée.
    //
    // `Q_ALI_01` désigne DEUX instruments selon `WN_ALI_01_SIIN57`
    // (`questionnaires/alimentaire.ts`) : la forme SIIN57 (57 items, moteur
    // `seuils_points`, /90) quand le drapeau vaut `'true'`, la forme COURT14
    // (14 items, moteur `sum`, /42) partout ailleurs. Le drapeau est ÉTEINT PAR
    // DÉFAUT : il est posé en production, et absent en CI, en dev et en preview.
    // Or le claim cité parle du « score global de l'enquête alimentaire SiiN
    // DÉTAILLÉE » — ce que la forme courte n'est pas ; elle en est une
    // réécriture indépendante (similarités de 0,00 à 0,33 au banc de
    // certification), avec ses propres bandes sur /42.
    //
    // Un déclencheur `{type: 'couleur'}` est AVEUGLE à cette bascule : les deux
    // formes émettent `warning` et `danger`, si bien que la règle engageait un
    // pack sur la forme courte aussi — sur un instrument que son claim ne
    // couvre pas. C'est la classe de défaut « un garde aveugle à la position du
    // drapeau ne garde rien », déjà payée sur cet instrument-là.
    //
    // Les libellés, eux, ne se recouvrent pas. La règle cite VERBATIM les deux
    // bandes défavorables de la forme SIIN57 ; celles de COURT14
    // (« Alimentation déséquilibrée — interventions prioritaires »,
    // « Alimentation très déséquilibrée — bilan approfondi nécessaire ») sont
    // d'autres phrases. Drapeau éteint, la règle cesse donc D'ELLE-MÊME de
    // mordre — sans garde à maintenir ailleurs, et sans qu'un score bas de la
    // forme courte puisse engager quoi que ce soit.
    //
    // Contrepartie assumée : ces libellés sont des phrases longues, rédigées
    // pour le professionnel, et une reformulation ferait taire la règle sans
    // rien casser. C'est le risque contre lequel existe la garde de drapeaux
    // verbatim, et il est ici PRÉFÉRABLE au précédent — une règle muette après
    // réécriture d'une bande se voit au banc ; une règle qui mord sur le mauvais
    // instrument, non.
    //
    // OÙ COMMENCE « DÉFAVORABLE », arbitrage praticien du 2026-08-04. La forme
    // SIIN57 publie quatre bandes sur /90 : 71-90 `success` « Alimentation
    // optimale, protectrice du capital santé », 51-70 `info` « plutôt
    // équilibrée, mais insuffisamment protectrice », 26-50 `warning`
    // « déséquilibrée, ne contribuant pas au maintien du capital santé », 0-25
    // `danger` « très déséquilibrée et défavorable ». « Défavorable » est pris
    // aux DEUX dernières, et la bande `info` est LAISSÉE DEHORS délibérément :
    // son libellé dit « plutôt équilibrée », ce qui n'est pas défavorable, et
    // engager un pack sur elle contredirait le claim qu'on cite.
    //
    // C'est le troisième instrument à bande `info` de cette table, et le
    // deuxième traitement : le PSQI la PREND (elle y couvre 5-10, au-dessus du
    // seuil de 4 qu'il publie), `Q_ALI_01` la LAISSE. L'en-tête de table
    // annonçait « seul le PSQI émet une bande `info` porteuse de sens » — c'est
    // corrigé là-haut : `Q_ALI_01` en émet une aussi, et elle ne l'est pas.
    //
    // EFFET DE BORD À NE PAS PRENDRE POUR LE MOTIF : `{type: 'interpretation'}`
    // sort du champ de la garde de monotonie des couleurs, qui aurait exigé de
    // citer `dark` — une couleur que cet instrument n'émet pas. Nommer ses
    // bandes une à une rend la question sans objet. C'est un bénéfice, pas la
    // raison du choix : la raison est le drapeau.
    //
    // UN ENSEMBLE SUR UNE MESURE SEULE. La doctrine de la table interdit
    // d'engager un ensemble sur un DRAPEAU seul ; cette règle n'a aucun drapeau.
    // Elle repose sur une mesure globale d'un instrument certifié du pack de
    // base, ce qui est précisément ce que la doctrine réclamait en plus du
    // drapeau ailleurs.
    //
    // RE-CIBLÉE LE 2026-08-06 (LOT-02, D-030) : `pack_digestif_intestin_cerveau`
    // est remplacé par les deux instruments digestifs de tête de son ancienne
    // composition. L'assiette de détoxication que `WN-CL-0287-009` indique n'est
    // PAS un questionnaire : elle relève de la prise en charge, et l'objectif ne
    // la promet donc plus. Déclencheur, libellés, claim et niveau inchangés.
    declencheurs: [
      {
        type: 'zone',
        idQuestionnaire: 'Q_ALI_01',
        zone: {
          type: 'interpretation',
          // Recopiés au caractère près depuis `Q_ALI_01_SIIN_57.scoring
          // .interpretation` (`questionnaires/alimentaire.ts`). Toute
          // reformulation de ces bandes doit être répercutée ici.
          labels: [
            'Alimentation déséquilibrée, ne contribuant pas au maintien du capital santé',
            'Alimentation très déséquilibrée et défavorable',
          ],
        },
      },
    ],
    suggestions: [
      { questionnaireId: 'Q_GAS_01', priorite: 1, objectif: "Mesurer les troubles fonctionnels digestifs et intestinaux par le TFD SIIN quand le score global de l'enquête alimentaire SIIN est défavorable." },
      { questionnaireId: 'Q_GAS_03', priorite: 2, objectif: "Caractériser le transit par l'échelle de Bristol quand le score global de l'enquête alimentaire SIIN est défavorable." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0287-009', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  // ───────────────────────────────────────────────────────────────────────────
  // SECOND TOUR — les quatre règles de mesure de V1, conservées telles quelles.
  //
  // Elles déclenchent sur `Q_SOM_01`, `Q_STR_02` et `Q_GAS_01`, qui ne sont pas
  // au pack de base : elles ne peuvent donc rien dire au premier rendez-vous.
  // Ce n'est plus un défaut depuis qu'elles sont nommées pour ce qu'elles sont
  // — l'aval. Ce sont précisément les trois instruments que le premier tour
  // propose (`R2-SOM-01`/`R2-SOM-02` → PSQI, `R2-STR-01` → PSS-10,
  // `R2-GAS-01` → TFD), et ces règles s'allument quand ils reviennent remplis.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'R-SOM-01',
    statut: 'publiee',
    // SECOND TOUR — attend le retour du PSQI que `R2-SOM-01` et `R2-SOM-02`
    // proposent au premier.
    // PSQI : interprétation globale (success / info / warning / danger).
    // Bande d'entrée `info` — et c'est délibéré : `info` y couvre un total de 5
    // à 10, donc au-dessus du seuil de 4 que l'instrument publie lui-même.
    // Commencer à `warning` aurait laissé dehors des patients que le PSQI
    // considère déjà comme mauvais dormeurs.
    //
    // RECUEIL PARTIEL — cette règle s'allume sur un PLANCHER GARANTI depuis le
    // 2026-08-05, et sa condition d'allumage est la FERMETURE : la zone doit
    // contenir toutes les bandes que le score final peut encore atteindre. Elle
    // la contient ici quel que soit le plancher, puisqu'elle cite les quatre
    // couleurs défavorables et que le PSQI n'en émet que trois (`info` 5-10,
    // `warning` 11-16, `danger` 17-21). Un plancher en `info` allume donc la
    // règle, et le motif servi au praticien porte « au moins ».
    //
    // Ce n'est PAS une propriété de la règle, c'est une propriété du couple
    // règle/grille : reserrer la zone sur `['warning', 'danger', 'dark']`
    // laisserait un plancher en `info` sans garantie — le score final pouvant
    // rester dans `info`, hors zone —, et cette règle cesserait de voir les
    // recueils partiels de la bande d'entrée qu'elle a délibérément choisie.
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_SOM_01', zone: { type: 'couleur', couleurs: ['info', 'warning', 'danger', 'dark'] } },
    ],
    suggestions: [
      { questionnaireId: 'Q_NEU_11', priorite: 1, objectif: "Explorer la dimension de l'humeur, que la source désigne explicitement par le test HAD." },
      { questionnaireId: 'Q_STR_03', priorite: 2, objectif: "Explorer la dimension du stress par le test de Cungi, que la source juge le plus pertinent dans les troubles du sommeil." },
    ],
    justificationClaims: [
      // « Le test de stress de Cungi est plus pertinent et sensible pour
      // explorer la dimension du stress dans les troubles du sommeil, tandis que
      // le test HAD suffit à explorer la dimension de l'humeur. » Les deux
      // instruments nommés par la source existent au catalogue et sont
      // administrables : Cungi = Q_STR_03, HAD = Q_NEU_11. Aucune substitution —
      // la règle propose exactement ce que le claim désigne.
      { claimId: 'WN-CL-0323-013', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0323-001', versionClaim: 'v1.0' },
    ],
    niveau: 'socle',
  },
  {
    id: 'R-STR-01',
    statut: 'publiee',
    // SECOND TOUR — attend le retour du PSS-10 que `R2-STR-01` propose au
    // premier. `R2-STR-03` atteint la même cible dès le premier tour, mais
    // seulement sur la bande la plus sévère : ici, c'est la mesure de stress
    // elle-même qui parle.
    // Bande d'entrée `warning` : le PSS-10 n'émet PAS de bande `info` — ses
    // trois bandes sont `success` (10-20), `warning` (21-26) et `danger`
    // (27-50). `warning` y est donc déjà sa première bande défavorable, et non
    // un choix de resserrer.
    //
    // RECUEIL PARTIEL — allumage sur PLANCHER GARANTI depuis le 2026-08-05, sous
    // condition de FERMETURE : la zone doit contenir toutes les bandes encore
    // atteignables. Sur le PSS-10 il n'y a qu'un plancher possible — `warning`,
    // `success` étant la bande la plus basse et ne faisant jamais plancher — et
    // sa fermeture est `{warning, danger}`, que la zone couvre. Un partiel déjà
    // à 21 rallume donc cette règle, avec un motif en « au moins ».
    //
    // La contre-épreuve est immédiate ici : une zone écrite `['warning']` seule
    // ne serait PAS garantie par ce même plancher, le score final pouvant encore
    // monter en `danger`. C'est ce cas qui prouve que la condition est bien une
    // inclusion, et non « la couleur du plancher figure dans la zone ».
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } },
    ],
    suggestions: [
      { questionnaireId: 'Q_STR_05', priorite: 1, objectif: "Ajouter l'évaluation d'un risque éventuel de burnout à l'intensité du stress chronique." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0314-008', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0319-010', versionClaim: 'v1.0' },
      // « Les questionnaires de surinvestissement (BMS et/ou Karasek) doivent
      // être utilisés pour évaluer le risque de burnout. » → BMS-10 = Q_STR_05.
      { claimId: 'WN-CL-0228-009', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R-STR-02',
    statut: 'publiee',
    // SECOND TOUR — même axe que `R2-STR-02`, mais sur le PSS-10 revenu plutôt
    // que sur le questionnaire contextuel. Le drapeau est le même : ce qui
    // change entre les deux tours, c'est la qualité de la mesure qui l'accompagne.
    // Déclaré ET mesuré : le facteur déclenchant seul ne suffit pas à engager un
    // ensemble entier. C'est l'ET logique du moteur qui l'impose.
    //
    // RE-CIBLÉE LE 2026-08-06 (LOT-02, D-030) : `pack_stress_chronique_burnout`
    // est remplacé par trois questionnaires. Le PSS-10 n'y figure pas — il vient
    // d'être lu par le déclencheur, le reproposer serait redemander ce qu'on a.
    // Déclencheurs, zone, claims et niveau inchangés.
    //
    // CITATION TRANCHÉE À LA SIGNATURE — `WN-CL-0105-001` RESTE, et l'alerte
    // qui le contestait était FAUSSE. Une note portée ici le 2026-08-04
    // affirmait que ce claim « porte sur l'éducation à un modèle alimentaire
    // méditerranéen » et proposait de le remplacer. Relecture directe en base le
    // même jour, sur `texte_normalise` : il porte sur « la prise en charge
    // globale du stress [qui] comprend un bilan personnalisé, suivi d'un
    // rééquilibrage sur 21 jours, puis d'un rendez-vous de contrôle et d'un
    // suivi dans le temps » — c'est-à-dire, mot pour mot, l'objectif servi par
    // cette règle. L'appariement est exact, et c'était l'alerte qui ne l'était
    // pas.
    //
    // TROIS CLAIMS, ET CHACUN FONDE QUELQUE CHOSE DE DIFFÉRENT — répartition
    // revue le 2026-08-06, à la revue adversariale.
    //
    //   `WN-CL-0314-008` fonde le DÉCLENCHEUR : évaluer le stress chronique,
    //   complété du risque de burnout.
    //
    //   `WN-CL-0243-005` fonde une CIBLE, et c'est nouveau ici. Il nomme « le
    //   BMS (questionnaire de Maslach-Pine) en 10 items OU LE QUESTIONNAIRE DE
    //   KARASEK » — or cette règle propose désormais Karasek (`Q_STR_06`). Le
    //   claim était jusqu'ici sur `R2-STR-02`, qui ne sert aucun des deux
    //   instruments qu'il nomme : il y était une justification a posteriori,
    //   héritée du pack dont la composition les embarquait. Il a suivi
    //   l'instrument.
    //
    //   `WN-CL-0105-001` fonde la prise en charge vers laquelle mène cette
    //   évaluation — bilan personnalisé, rééquilibrage, suivi. Depuis le
    //   re-ciblage du 2026-08-06, ce n'est plus un pack qui la porte : les trois
    //   instruments proposés ici sont ce qui la PRÉPARE, et le claim reste cité
    //   à ce titre.
    //
    // Le jeu des 23 claims de la table ne bouge pas pour autant :
    // `WN-CL-0243-005` était et reste cité par `R2-STR-03`, au titre du BMS-10.
    //
    // Ce que l'épisode laisse : une citation ne se juge pas sur son numéro ni
    // sur la mémoire qu'on en a, mais sur son texte relu à la source.
    //
    // RECUEIL PARTIEL — même fermeture que `R-STR-01`, sur la même grille : le
    // plancher `warning` du PSS-10 a pour fermeture `{warning, danger}`, que la
    // zone couvre, et le déclencheur s'allume avec un motif en « au moins ».
    //
    // MAIS L'ET LOGIQUE RESTE ENTIER, et c'est ce qui compte sur une règle qui
    // engage TROIS instruments : le drapeau d'anamnèse doit être atteint AUSSI. Un partiel
    // déjà sévère ne suffit donc pas à lui seul — la mesure garantie ne remplace
    // pas le facteur déclenchant, elle le complète.
    declencheurs: [
      { type: 'drapeau', champ: 'facteursDeclenchants', valeurs: ['Stress aigu / burn-out'] },
      { type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } },
    ],
    suggestions: [
      { questionnaireId: 'Q_STR_04', priorite: 1, objectif: 'Situer dépression, anxiété et stress par le DASS-21 quand le stress perçu est élevé et qu\'un burn-out est déclaré.' },
      { questionnaireId: 'Q_STR_06', priorite: 2, objectif: 'Évaluer la contrainte professionnelle par le questionnaire de Karasek quand un burn-out est déclaré et que le stress perçu est élevé.' },
      { questionnaireId: 'Q_STR_08', priorite: 3, objectif: "Évaluer le surinvestissement au travail par le WART quand un burn-out est déclaré et que le stress perçu est élevé." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0105-001', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0243-005', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0314-008', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  {
    id: 'R-GAS-01',
    statut: 'publiee',
    // SECOND TOUR — attend le retour du TFD que `R2-GAS-01` propose au premier.
    // C'est la chaîne complète en deux temps : plainte digestive → TFD →
    // approfondissement de l'axe.
    //
    // RE-CIBLÉE LE 2026-08-06 (LOT-02, D-030) : `pack_digestif_intestin_cerveau`
    // est remplacé par les deux questionnaires qui approfondissent l'axe SANS
    // redemander le TFD, que le déclencheur vient précisément de lire.
    // Déclencheur, zone, claim et niveau inchangés.
    // TFD SIIN : interprétation globale sur 93 (A / B / C). Comme le PSS-10, il
    // n'émet pas de bande `info` — `warning` (bande B, 24-49) est sa première
    // bande défavorable.
    //
    // CE QUE LE RECUEIL PARTIEL FAIT À CETTE RÈGLE — et il faut le lire ici
    // parce que c'est ici que ça se joue. Un TFD incomplet ne publie AUCUNE
    // bande (D-014, 2026-08-04) : la mesure est refusée, dans les deux sens.
    // Mais depuis le 2026-08-05, il publie à côté un PLANCHER GARANTI, et cette
    // règle s'allume dessus quand — et seulement quand — la zone qu'elle vise
    // CONTIENT toutes les bandes encore atteignables (`zoneGarantieParLePlancher`
    // dans `orientationEngine.ts`).
    //
    // Ici, la fermeture est exactement ce qu'il faut : le plancher B ne laisse
    // atteignables que B (`warning`) et C (`danger`), et la zone les couvre
    // toutes les deux. Huit réponses cotées 3 atteignent 24 — bande B — et
    // rallument donc cette règle ; trente items sur trente-et-un en atteignent 90.
    // Le motif servi au praticien porte « au moins » : il dit un minimum acquis,
    // jamais une mesure.
    //
    // CE QUI LE FONDE, et qui n'est pas une commodité : les items de `O_TFD` sont
    // cotés 0 à 3, donc un item sans réponse ne peut qu'AJOUTER au total. Un
    // partiel qui atteint déjà la bande B y est acquis — l'incertitude ne porte
    // que sur le fait d'être en B ou en C, jamais sur le fait d'être au-dessus
    // de A. C'est la même asymétrie que `seuilMonotone` dans `questions.ts` :
    // « le franchissement observé est DÉFINITIF, le non-franchissement ne vaut
    // que sur un comptage complet ».
    //
    // CE QUI RESTE ÉTEINT, pour que la condition d'allumage ne se lise pas comme
    // un acquis : une zone qui s'arrêterait à `['warning']` ne serait PAS
    // garantie par ce plancher — le score final peut encore monter en `danger`,
    // donc sortir de la zone. Élargir ou restreindre les couleurs de cette règle
    // change donc ce qu'elle voit d'un recueil partiel, et pas seulement sa
    // sévérité d'entrée.
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_GAS_01', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } },
    ],
    suggestions: [
      { questionnaireId: 'Q_GAS_03', priorite: 1, objectif: "Caractériser le transit par l'échelle de Bristol quand le score de troubles fonctionnels intestinaux est élevé." },
      { questionnaireId: 'Q_INF_01', priorite: 2, objectif: "Rechercher des signes d'hyperexcitabilité neuro-musculaire par le questionnaire d'hyperexcitabilité SIIN, quand le score de troubles fonctionnels intestinaux est élevé." },
    ],
    justificationClaims: [
      { claimId: 'WN-CL-0287-009', versionClaim: 'v1.0' },
    ],
    niveau: 'approfondissement',
  },
  // `R-ANA-01` et `R-ANA-02` ont disparu d'ici en V2, chacune pour sa raison.
  //
  // `R-ANA-02` est devenue `R2-NEU-02`, à l'identique — même déclencheur, même
  // cible, mêmes claims. Elle n'appartenait pas au second tour : l'anamnèse est
  // disponible dès le premier rendez-vous.
  //
  // `R-ANA-01` est RETIRÉE, et rien ne la remplace à l'identique. Elle proposait
  // le PSQI sur la seule attente « Améliorer le sommeil », c'est-à-dire sur ce
  // que le patient DÉCLARE vouloir. Le pack de base mesure désormais son
  // sommeil : `R2-SOM-01` (contexte de vie dégradé) et `R2-SOM-02` (plainte de
  // sommeil intense) atteignent la même cible sur une MESURE.
  //
  // CE RETRAIT COÛTE, ET IL FAUT LE DIRE — correction du 2026-08-04. La
  // rédaction précédente concluait « ce qui est strictement mieux qu'une
  // attente déclarée ». « Strictement mieux » supposerait que les nouveaux
  // ensembles CONTIENNENT l'ancien ; ils ne l'emboîtent pas. Le patient qui
  // déclare vouloir améliorer son sommeil, dont le contexte de vie sur cet axe
  // reste au-dessus du seuil (`Q_MOD_01 / SOMMEIL >= 15`) et dont la plainte de
  // sommeil reste sous le sien (`Q_MOD_03 / sommeil <= 6`), recevait le PSQI et
  // ne reçoit désormais RIEN sur cet axe. `R2-SOM-05` ne le rattrape pas : elle
  // exige `SOMMEIL <= 8`, plus bas encore.
  //
  // La perte est ASSUMÉE, pas niée : une attente déclarée dit ce que le patient
  // veut, deux mesures concordantes disent que son sommeil ne décroche pas, et
  // l'arbitrage est de suivre les mesures. Ce qu'on ne peut pas dire, c'est
  // qu'il n'y a rien à arbitrer. L'attente n'est pas perdue pour autant — elle
  // sert encore dans `R2-SOM-05`, en conjonction avec la mesure, là où elle
  // apporte quelque chose que la mesure seule ne dit pas : que le patient
  // demande cette exploration.
];

export type OrientationMetadata = {
  version: string;
  /**
   * Passe à true uniquement quand le praticien a signé la table compilée
   * (lot 9). Second verrou du double verrou fail-closed de la route
   * `/api/praticien/orientation` — le premier est WN_ENABLE_ORIENTATION_NNPP2.
   */
  validationExterne: boolean;
  dateValidation: string | null;
  claimsSource: OrientationClaimRef[];
};

/**
 * SIGNATURE DE LA TABLE — posée le 2026-08-04, sur demande explicite du
 * praticien après relecture des vingt règles.
 *
 * `claimsSource` porte les VINGT-TROIS claims distincts cités par la table,
 * dédoublonnés et triés. Vingt-trois, et non vingt-quatre : une première
 * rédaction de cette liste en portait un de plus — `WN-CL-0178-016`, qui
 * n'apparaît dans ce fichier que dans un COMMENTAIRE. Le banc d'égalité exacte
 * ci-dessous l'a attrapé à sa première exécution ; il a été écrit pour ce défaut
 * et l'a trouvé sur la liste de celui qui l'écrivait. Ce n'est pas une redite de `justificationClaims` : ces
 * derniers disent ce qui fonde CHAQUE règle, celui-ci dit ce que la SIGNATURE
 * couvre — le périmètre relu en une fois, à une date. Les deux divergeraient si
 * une règle était ajoutée sans re-signature, et c'est précisément ce qu'un banc
 * doit voir (voir `orientationRulesV1.test.ts`).
 *
 * Les vingt-trois ont été relus en base le 2026-08-06 : `statut = 'VALIDE'`,
 * `prescriptif = true`, `active = true`, `version_claim = 'v1.0'`.
 *
 * CE QUE SIGNER N'ALLUME PAS. `orientationActive()` exige AUSSI
 * `WN_ENABLE_ORIENTATION_NNPP2 === '1'`. Le verrou est un ET, délibérément :
 * signer est un acte clinique, déployer est un acte d'exploitation, et l'un ne
 * vaut pas l'autre. Tant que le drapeau n'est pas posé, la route reste
 * fail-closed.
 */
export const ORIENTATION_METADATA: OrientationMetadata = {
  version: 'orientation-nnpp2-v1',
  validationExterne: true,
  // RE-SIGNÉE LE 2026-08-06 (LOT-02) : les six suggestions à `packId` sont
  // devenues des suggestions à `questionnaireId`. Une table qui change de
  // cibles change de contenu clinique, donc de signature. Les 23 claims de
  // `claimsSource` ont été RELUS EN BASE ce jour-là (`execute_sql` sur
  // `rag_corpus_claims`) : tous en `statut = 'VALIDE'`, `prescriptif = true`,
  // `active = true`, `version_claim = 'v1.0'` — 23/23. Aucun claim ajouté ni
  // retiré : seules les cibles et les objectifs ont changé.
  dateValidation: '2026-08-06',
  claimsSource: [
    { claimId: 'WN-CL-0047-008', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0105-001', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0136-003', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0136-004', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0154-013', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0178-017', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0228-009', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0228-010', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0234-010', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0234-011', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0243-005', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0287-009', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0312-021', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0314-008', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0314-012', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0315-007', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0319-010', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0323-001', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0323-013', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0323-023', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0323-025', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0339-010', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0359-025', versionClaim: 'v1.0' },
  ],
};

export const ORIENTATION_RULES_SHA256 = sha256(JSON.stringify(ORIENTATION_RULES_V1));
