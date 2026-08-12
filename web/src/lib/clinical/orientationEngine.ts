import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { PACKS_REGISTRY, type PackId } from '@/lib/questionnaires-functional';
import type { OrientationDeclencheur, OrientationRule, OrientationZone } from './orientationRulesV1';
import type { StopRule } from './stopRulesV1';

// Moteur d'orientation déterministe (campagne certification corpus, lot 7,
// contrat v2).
//
// Fonction pure : évalue les règles d'orientation NNPP2 sur des scores qu'on lui
// donne — aucune logique de scoring nouvelle, aucun accès base, aucun appel IA.
//
// CE QU'ON LUI DONNE A CHANGÉ le 2026-08-04, et ce module n'en sait rien : son
// appelant (`orientationService`) ne lui passe plus le `scoresJson` STOCKÉ mais
// le score RECALCULÉ depuis `rawAnswers`. Un score stocké est un instantané de
// la doctrine qui avait cours à la soumission ; une garde de scoring ajoutée
// ensuite ne l'atteignait jamais. Ce module reste pur, et c'est justement ce qui
// rendait le défaut invisible ici.
//
// Une règle ne s'applique
// que si TOUS ses déclencheurs sont atteints (ET logique) et si son statut est
// `publiee`. La recommandation est une proposition au praticien : rien n'est
// jamais auto-assigné, et le LLM de synthèse ne recevra que des cibles issues
// de ce moteur.

type InterpretationLue = { label?: unknown; color?: unknown } | null | undefined;

type SousScoreLu = {
  id?: unknown;
  label?: unknown;
  total?: unknown;
  interpretation?: InterpretationLue;
  /** Comptes d'items — absents chez les moteurs qui ne les publient pas. */
  repondus?: unknown;
  items?: unknown;
  missing?: unknown;
};

/**
 * PLANCHER GARANTI tel que `bandePlancher` (`questions.ts`) le sert — un
 * minimum de sévérité déjà acquis par les seules réponses recueillies, servi
 * SANS `interpretation` et sans conduite à tenir.
 *
 * `couleursPossibles` et `labelsPossibles` sont la FERMETURE VERS LE HAUT :
 * toutes les bandes que le score final peut encore atteindre, plancher compris.
 * Elles sont dérivées de la grille par le producteur ; ce module ne les
 * recalcule pas et n'en déduit aucun ordre de sévérité.
 */
type PlancherLu = {
  label?: unknown;
  color?: unknown;
  couleursPossibles?: unknown;
  labelsPossibles?: unknown;
  garanti?: unknown;
};

/** Un plancher et l'état du recueil dont il est tiré — les deux vont ensemble. */
type PlancherContexte = {
  bande: PlancherLu;
  /** Comptes du recueil, ou `null` si le porteur n'en publie aucun. */
  comptes: { manquants: number; total: number | null } | null;
};

/** Résultat de scoring tel que stocké — typage défensif, JSON non garanti. */
export type ScoresStockes = Record<string, unknown> | null | undefined;

export type ReponseOrientation = {
  idQuestionnaire: string;
  /** ISO 8601 — seule la réponse la plus récente par questionnaire compte. */
  dateReponse: string;
  /** Départage deux réponses au même horodatage (l'ordre SQL n'est pas stable). */
  idReponse?: string;
  scores: ScoresStockes;
};

export type MotifOrientation = {
  regleId: string;
  /** Une description lisible par déclencheur atteint (UI praticien). */
  conditions: string[];
  claims: { claimId: string; versionClaim: string }[];
};

export type CibleExploration =
  | { type: 'questionnaire'; questionnaireId: string }
  | { type: 'pack'; packId: PackId };

export type RecommandationExploration = {
  cible: CibleExploration;
  /** Plus petit rang de priorité parmi les suggestions agrégées (1 = premier). */
  priorite: number;
  niveau: 'socle' | 'approfondissement' | 'specialise';
  /** Objectifs cliniques énoncés par les règles (dédupliqués). */
  objectifs: string[];
  /** Besoins (1-12) visés par les règles agrégées (dédupliqués, triés). */
  needIds: number[];
  /** Questionnaire déjà assigné, ou composition connue du pack déjà couverte. */
  dejaAssigne: boolean;
  /**
   * Déjà répondu (fait affiché, jamais un filtre). `null` = inconnu — cas d'un
   * pack dont la composition n'est pas fournie : un fait inconnu ne doit pas se
   * présenter comme un fait négatif.
   */
  dejaRepondu: boolean | null;
  motifs: MotifOrientation[];
  /**
   * Extinction par une règle d'arrêt ([[D-053]]), ou absent.
   *
   * CHAMP SUR LA LIGNE, ET NON LISTE SÉPARÉE. L'interdit du lot — « une
   * extinction n'efface jamais l'historique » — est ainsi tenu par
   * construction : la recommandation garde ses `motifs` d'origine et porte en
   * plus le motif de son extinction. Une seconde collection aurait obligé à
   * recopier la ligne, et aurait cassé quatre lecteurs qui comptent sur celle-ci
   * — l'allowlist du garde de restitution de la synthèse, `orientationInjectee`
   * (qui teste `recommandations.length > 0` et désarmerait ce garde si tout
   * disparaissait), le filtre pack du service, et l'état vide du panneau.
   */
  extinction?: ExtinctionRecommandation | null;
};

export type ExtinctionRecommandation = {
  stopRuleId: string;
  /** Une description lisible par déclencheur d'arrêt atteint (UI praticien). */
  conditions: string[];
  /** Phrase française de la règle d'arrêt : POURQUOI cette extinction. */
  motif: string;
  claims: { claimId: string; versionClaim: string }[];
};

export type EntreeOrientation = {
  reponses: ReponseOrientation[];
  /** Questionnaires déjà assignés au patient (toutes assignations confondues). */
  idsQuestionnairesAssignes: string[];
  regles: OrientationRule[];
  /** Composition réelle des packs (qids) quand elle est connue ; un pack à
   *  composition inconnue n'est jamais marqué `dejaAssigne`. */
  compositionPacks?: Partial<Record<PackId, string[]>>;
  /** Filtre DUR droits/certification : une exploration non administrable est
   *  écartée, pas seulement dépriorisée — y compris un pack dont un seul
   *  membre connu ne l'est pas. Absent = tout est administrable (le registre
   *  des instruments sera branché au lot 10). */
  estAdministrable?: (questionnaireId: string) => boolean;
  /** Drapeaux d'anamnèse du patient (`extraireDrapeauxAnamnese`, LOT-04) —
   *  ce qu'il a DÉCLARÉ, à côté de ce que les instruments ont mesuré. Absent =
   *  aucun déclencheur `drapeau` n'est atteint (fail-closed) : une anamnèse non
   *  fournie ne vaut pas une anamnèse vide qu'on aurait le droit d'interpréter. */
  drapeaux?: DrapeauxAnamnese;
  /**
   * Règles d'arrêt à évaluer ([[D-053]]). Absent ou vide = aucune extinction.
   *
   * Le moteur reste PUR : c'est `orientationService` qui décide de fournir la
   * table ou pas, selon qu'elle est signée. Une table non signée n'arrive donc
   * jamais jusqu'ici, et le moteur n'a pas à connaître le verrou.
   */
  reglesArret?: StopRule[];
  /**
   * `dejaRepondu` devient EXCLUANT ([[D-053]], arbitrage 7) — commandé par le
   * même verrou que les règles d'arrêt, pour que la production ne change pas
   * tant que la table n'est pas signée.
   *
   * L'exclusion ne porte QUE sur une passation exploitable : le service met à
   * `null` le score d'une passation `INVALID`, `SUPERSEDED`, non interprétable
   * ou sans réponses brutes, précisément pour que le praticien qui invalide
   * reçoive à nouveau la recommandation de faire repasser l'instrument. Le
   * calcul de `dejaRepondu`, lui, ne bouge pas : le badge reste un fait
   * administratif.
   */
  exclureDejaRepondu?: boolean;
};

const NIVEAU_PACK = new Map(PACKS_REGISTRY.map(pack => [pack.id, pack.niveau]));

// Ordre de fondamentalité : à cible partagée par plusieurs règles, le niveau le
// plus fondamental l'emporte (une exploration socle reste socle même si une
// règle spécialisée la recommande aussi).
const RANG_NIVEAU: Record<'socle' | 'approfondissement' | 'specialise', number> = {
  socle: 0,
  approfondissement: 1,
  specialise: 2,
};

/**
 * Exporté pour le moteur de contradictions (LOT-01), qui doit sélectionner les
 * mêmes passations que celui-ci. Aucune logique n'est modifiée : c'est la même
 * fonction, appelée depuis deux moteurs, précisément pour qu'ils ne divergent
 * jamais sur « quelle passation fait foi ».
 */
export function derniereReponseParQuestionnaire(reponses: ReponseOrientation[]): Map<string, ReponseOrientation> {
  const dernieres = new Map<string, ReponseOrientation>();
  for (const reponse of reponses) {
    const connue = dernieres.get(reponse.idQuestionnaire);
    const date = Date.parse(reponse.dateReponse);
    if (Number.isNaN(date)) continue;
    if (!connue) {
      dernieres.set(reponse.idQuestionnaire, reponse);
      continue;
    }
    const dateConnue = Date.parse(connue.dateReponse);
    // Tie-break explicite : à horodatage égal, l'ordre de la requête SQL n'est
    // pas stable — sans départage, l'orientation ne serait pas reproductible.
    const plusRecente = date > dateConnue
      || (date === dateConnue && (reponse.idReponse ?? '') > (connue.idReponse ?? ''));
    if (plusRecente) dernieres.set(reponse.idQuestionnaire, reponse);
  }
  return dernieres;
}

/**
 * GARDE DE COMPLÉTUDE — un recueil incomplet n'est pas une mesure basse.
 *
 * LE SCÉNARIO, prouvé en revue adversariale le 2026-08-04. Un patient répond à
 * TROIS items de `Q_MOD_01`, un par axe, chacun à sa MEILLEURE option
 * (`SOMMEIL_Q001 = 4` « Excellent sommeil », `RYTHME_BIOLOGIQUE_Q001 = 4`,
 * `ADAPTATION_STRESS_Q001 = 8` « Je gère très bien »), puis abandonne. Les
 * totaux servis valaient 4, 4 et 8 — c'est-à-dire, sur une échelle qui monte à
 * 28 et 24, les zones les plus dégradées de la grille. Avec une apnée, un
 * burn-out et une attente de sommeil déclarés par ailleurs, il recevait SEPT
 * recommandations dont DEUX PACKS, motivées par un « Sommeil non réparateur »
 * qu'il venait de décrire comme excellent.
 *
 * POURQUOI `<=` EST LE SENS DANGEREUX. Un total partiel est toujours biaisé
 * VERS LE BAS : ce qui manque n'ajoute rien. Sur une échelle qui va dans le
 * sens du trouble (`Q_INF_03`, `>=`), le biais protège — un axe incomplet
 * déclenche moins. Sur une échelle INVERSÉE (`Q_MOD_01`, où un score bas est
 * défavorable, et où sept déclencheurs comparent en `<=`), le même biais
 * fabrique la dégradation. La garde ne fait donc pas de tri par opérateur :
 * elle refuse la mesure, quel que soit le sens, parce que c'est la mesure qui
 * n'existe pas.
 *
 * CE QUI EN PROTÉGEAIT LES RÈGLES V1 — ET CE QUI NE LES PROTÉGEAIT PAS. Les
 * règles V1 lisent une `interpretation` GLOBALE. `sum` (`Q_STR_02`) la retire
 * sur recueil partiel depuis #561 : celles-là sont couvertes. C'est le passage à
 * `comparaison` sur des SOUS-SCORES qui a ouvert la brèche traitée ici, un étage
 * plus bas que la garde existante.
 *
 * `psqi` EST DÉSORMAIS COUVERT — trou fermé au lot de signature, à la source.
 * Il ne l'était pas quand ces lignes ont été écrites : son total ne tombe à
 * `null` que si une composante entière est vide, et sept composantes mesurées
 * « à au moins un item » suffisaient à produire un total /21 biaisé vers le bas
 * — les items manquants de `C2`, `C5` et `C7` étant comptés à leur valeur la
 * plus FAVORABLE. Huit réponses sur dix-huit rendaient « Pas de trouble du
 * sommeil », et `R-SOM-01` lisait cette bande.
 *
 * Le moteur publie maintenant `missing`/`repondus` sur ses 18 items cotés et
 * retire sa bande sur recueil partiel : la garde ci-dessous l'attrape par la
 * branche `missing`, sans rien de spécifique au PSQI.
 *
 * ET CELA VAUT AUSSI POUR LES PASSATIONS DÉJÀ ENREGISTRÉES — ce qui n'allait pas
 * de soi et a failli ne pas être vrai. Le score est figé à la soumission : une
 * garde ajoutée après coup ne touche aucune ligne existante. C'est
 * `orientationService` qui referme ce trou-là, en recalculant depuis
 * `rawAnswers` ; sans lui, cette garde n'aurait protégé que l'avenir.
 *
 * `tfd` (`Q_GAS_01`) EST COUVERT DEPUIS LE 2026-08-04 — il était le dernier de la
 * classe atteignable par une règle publiée. Il ne publiait aucun compte, si bien
 * que `recueilIncomplet` rendait `false` faute de savoir quoi lire, et qu'un seul
 * item répondu par axe suffisait à produire un total /93 biaisé vers le bas : cinq
 * réponses sur trente-et-une, TOUTES au maximum de leur échelle, rendaient
 * « A — Absence de troubles fonctionnels », et `R-GAS-01` lisait cette bande.
 * Le moteur publie maintenant `missing`/`repondus` à la racine et `repondus`/
 * `items` sur chaque axe : la garde ci-dessous l'attrape par ses deux branches,
 * sans rien de spécifique au TFD.
 *
 * LES TROIS MOTEURS NOMMÉS SONT FERMÉS DEPUIS LE 2026-08-05 (PR #583).
 * `sum_decimal`, `count_threshold` et `ecab` portaient le même défaut ; les
 * trois ont reçu la même garde dans `web/src/lib/questions.ts` — recueil
 * incomplet → `interpretation: null` et note explicite (`count_threshold`
 * L2517, `ecab` L3357, `sum_decimal` L3706), couverte par trois bancs dédiés
 * (`qInf05RecueilPartiel`, `ecabRecueilPartiel`, `qdrsRecueilPartiel`).
 * Ce commentaire les a déclarés « encore ouverts » pendant trois jours après
 * leur fermeture, ici et dans `orientationRulesV1.ts` : le dépôt contredisait
 * sa propre correction à deux endroits (dette 3 de la déclaration 5.0).
 *
 * MAIS LA CLASSE, ELLE, N'EST PAS FERMÉE — et l'écrire serait le défaut
 * inverse. `seuils_points` (`questions.ts:2140`) ne garde que le recueil
 * ENTIÈREMENT vide (`repondus === 0`, L2131) : sur un recueil partiel il sert
 * la bande. Son porteur est `Q_ALI_01`, l'Enquête SIIN 57 items, **allumée en
 * production**, dont l'instrument n'est pas `cabinet` — un envoi partiel est
 * donc accepté. Les items muets ne rapportant pas de points, la bande servie
 * tend vers le bas : c'est le sens le moins dangereux de l'erreur, pas son
 * absence. L'arbitrage écrit L2183-2189 (« sur un total à 57 items, un
 * manquant est du bruit ») porte sur les SOUS-SCORES SERVIS, pas sur la bande.
 * Constat de la revue adversariale du 2026-08-08, hors périmètre du lot qui
 * l'a trouvé : aucune règle d'orientation publiée ne lit cette bande
 * aujourd'hui, et fermer `seuils_points` est un geste clinique qui demande sa
 * propre décision.
 *
 * ASYMÉTRIE À NE PAS PERDRE — `Q_MOD_03` est immunisé PAR CONSTRUCTION, et
 * `Q_MOD_01` ne l'est pas. Le moteur `plaintes_actuelles` de `Q_MOD_03` fait de
 * chaque domaine UN SEUL item (`total: getVal(domain.item)`) : un domaine sans
 * réponse rend `total: null`, jamais un total partiel, et aucune comparaison ne
 * peut s'y allumer. Le moteur `subscore` de `Q_MOD_01` et `Q_INF_03` somme dix
 * items par axe et sert le total dès le PREMIER. Les deux instruments portent
 * des règles écrites de la même façon ; un seul avait besoin de cette garde.
 * Rien dans la table ne le disait — d'où cette phrase, ici et sur la table.
 *
 * `null` rendu, jamais un compte : cette fonction dit ce que la valeur EST,
 * pas pourquoi elle manque. L'interprétation tombe avec la valeur — sur un
 * recueil partiel, une bande de sous-score est lue par le bas exactement comme
 * le total, et laisser vivre l'étiquette rouvrirait le même trou dès qu'une
 * règle serait réécrite en `{type: 'zone'}`.
 *
 * DEUX FORMES LUES, parce que le catalogue en sert deux. Les moteurs à
 * sous-scores publient `repondus` et `items` (le second vaut `repondus +
 * missing` : les questions écartées par un conditionnel n'y sont pas) ; les
 * moteurs à score global (`sum`, `seuils_points`, `sum_items`…) publient
 * `missing`. Un porteur qui ne publie NI l'un NI l'autre rend `false` — on ne
 * fabrique pas une complétude qu'on ne sait pas lire, on constate qu'on ne
 * sait rien en dire.
 */
function comptesDuRecueil(porteur: unknown): { manquants: number; total: number | null } | null {
  if (!porteur || typeof porteur !== 'object') return null;
  const nombre = (cle: 'repondus' | 'items' | 'missing') => {
    const brut = (porteur as Record<string, unknown>)[cle];
    return typeof brut === 'number' && Number.isFinite(brut) ? brut : null;
  };
  const repondus = nombre('repondus');
  const items = nombre('items');
  // Forme des moteurs à sous-scores : `items` EST le dénominateur, et il n'est
  // pas `repondus + missing` — les questions écartées par un conditionnel n'y
  // sont pas. C'est donc lui qu'on sert quand il existe.
  if (repondus !== null && items !== null) return { manquants: items - repondus, total: items };
  const missing = nombre('missing');
  if (missing === null) return null;
  // Forme des moteurs à score global : le dénominateur se reconstitue, et
  // seulement si l'autre moitié est publiée. Sinon `null` — un compte sans
  // dénominateur se dit sans dénominateur, il ne s'en invente pas un.
  return { manquants: missing, total: repondus !== null ? repondus + missing : null };
}

/**
 * UNE SEULE LECTURE DES COMPTES, dérivée du COMPTE et non l'inverse.
 *
 * Le motif praticien doit dire combien d'items manquent ET sur combien ; la
 * garde doit dire si le recueil est incomplet. Ce sont trois questions posées à
 * la même donnée, et `comptesDuRecueil` ci-dessus est la seule à la lire —
 * c'est la mise en garde de ce fichier contre le « concept à deux
 * orthographes », appliquée à lui-même. Un porteur qui ne publie NI
 * `repondus`/`items` NI `missing` rend `null` là-haut, donc `false` ici : on ne
 * fabrique pas une complétude qu'on ne sait pas lire, et on n'annonce pas un
 * compte qu'on n'a pas.
 */
function recueilIncomplet(porteur: unknown): boolean {
  const comptes = comptesDuRecueil(porteur);
  return comptes !== null && comptes.manquants > 0;
}

/**
 * Plancher porté par un porteur de scores, avec son CONTEXTE, ou `null`.
 *
 * `garanti !== true` ferme la lecture : le champ n'est servi que par
 * `bandePlancher`, qui le marque toujours, et un objet qui ne le porte pas
 * n'est pas un plancher — c'est une bande ordinaire arrivée là par erreur.
 *
 * Les `comptes` voyagent AVEC la bande parce que le motif praticien doit dire
 * les deux choses qu'un plancher est : une garantie basse, ET une garantie
 * tirée d'un recueil incomplet. Les séparer en deux champs frères aurait laissé
 * un appelant transporter l'un sans l'autre.
 */
function plancherLu(porteur: unknown): PlancherContexte | null {
  if (!porteur || typeof porteur !== 'object') return null;
  const brut = (porteur as Record<string, unknown>).bandePlancher;
  if (!brut || typeof brut !== 'object') return null;
  if ((brut as Record<string, unknown>).garanti !== true) return null;
  return { bande: brut as PlancherLu, comptes: comptesDuRecueil(porteur) };
}

/**
 * Valeur numérique, interprétation et PLANCHER visés (score global ou
 * sous-score).
 *
 * TROIS CHAMPS, ET LE TROISIÈME EST À PART. `valeur` et `interpretation` sont
 * la MESURE : elles tombent toutes les deux sur un recueil partiel, et les
 * deux lignes qui les annulent ci-dessous ne changent pas — c'est d'elles que
 * dépend l'immunité de `Q_MOD_01` (échelle inversée, sept déclencheurs en
 * `<=`), qui reste ainsi vraie par construction et non par relecture.
 *
 * `plancher` n'est PAS une mesure : c'est un minimum de sévérité déjà acquis,
 * et il n'est servi que là où la mesure manque. Marquer `interpretation` d'un
 * drapeau `garanti` aurait rouvert exactement le trou que la garde ferme —
 * toute comparaison numérique, tout consommateur d'étiquette l'aurait relu
 * comme une bande.
 */
function extraireCible(scores: ScoresStockes, sousScore: string | undefined): {
  valeur: number | null;
  interpretation: InterpretationLue;
  plancher: PlancherContexte | null;
} {
  if (!scores || typeof scores !== 'object') return { valeur: null, interpretation: null, plancher: null };
  if (sousScore) {
    const bruts = (scores as { subScores?: unknown }).subScores;
    if (!Array.isArray(bruts)) return { valeur: null, interpretation: null, plancher: null };
    // Deux passes : l'id prime toujours sur le libellé. Une passe unique
    // laisserait un label égal à l'id d'un autre axe capter la règle.
    const axes = bruts as SousScoreLu[];
    const cible = axes.find(s => s?.id === sousScore) ?? axes.find(s => s?.label === sousScore);
    if (!cible) return { valeur: null, interpretation: null, plancher: null };
    // Voir `recueilIncomplet` : un axe incomplet n'est pas une mesure basse.
    if (recueilIncomplet(cible)) return { valeur: null, interpretation: null, plancher: plancherLu(cible) };
    return {
      valeur: typeof cible.total === 'number' && Number.isFinite(cible.total) ? cible.total : null,
      interpretation: cible.interpretation ?? null,
      // Recueil COMPLET : la mesure existe, le plancher n'a plus rien à dire —
      // et un plancher servi à côté d'une bande pleine ferait deux verdicts
      // pour une seule mesure. Le producteur n'en sert d'ailleurs aucun ici.
      plancher: null,
    };
  }
  // MÊME GARDE AU NIVEAU GLOBAL, et elle n'est pas décorative : `seuils_points`
  // (`Q_ALI_01`) sert son `interpretation` SANS condition de complétude, là où
  // `sum` la retire depuis #561. Une enquête SIIN abandonnée après trois items
  // rend donc un total de quelques points sur 90 — bande « danger » —, et
  // `R2-ALI-01` y engagerait un PACK. C'est le scénario du dessus, transposé du
  // sous-score au score global.
  //
  // `psqi` (`Q_SOM_01`) publie `missing`/`repondus` depuis le lot de signature
  // et passe donc par cette garde ; `Q_STR_02` (`sum`) rend déjà
  // `interpretation: null` sur recueil partiel ; `tfd` (`Q_GAS_01`) publie ses
  // comptes depuis le 2026-08-04 et y passe à son tour. Les trois porteurs de
  // règles publiées sont donc couverts — ce qui ne vaut PAS pour les moteurs
  // sans règle, voir le rappel en tête de `recueilIncomplet` : « ne publie aucun
  // compte » n'est pas « est protégé ».
  if (recueilIncomplet(scores)) return { valeur: null, interpretation: null, plancher: plancherLu(scores) };
  const total = (scores as { total?: unknown }).total;
  return {
    valeur: typeof total === 'number' && Number.isFinite(total) ? total : null,
    interpretation: ((scores as { interpretation?: InterpretationLue }).interpretation) ?? null,
    plancher: null,
  };
}

/**
 * Zone GARANTIE par un plancher, ou `null`.
 *
 * LE PRÉDICAT, et il est tout le lot : un plancher `P` garantit une zone `Z` si
 * et seulement si TOUTES les bandes que le score final peut encore atteindre
 * sont dans `Z`. C'est la formulation exacte de « au moins aussi sévère », et
 * elle interdit d'elle-même le cas redouté — une zone visant `['warning']` seul
 * quand `danger` et `dark` sont au-dessus échoue l'inclusion, puisque le score
 * final peut encore y monter. Aucune règle « ne pas viser vers le bas » n'est
 * écrite nulle part : elle tombe de la dérivation.
 *
 * FAIL-CLOSED PAR CONSTRUCTION, sur DEUX défauts distincts qu'il ne faut pas
 * confondre — une première rédaction les confondait et donnait `success` en
 * exemple, alors que ce cas est inatteignable : sur une grille à sévérité
 * croissante `success` est la bande la plus basse, et une fermeture ne contient
 * jamais que des bandes AU-DESSUS du plancher.
 *
 *  · COULEUR INCONNUE — une couleur servie par une grille et absente de l'union
 *    d'`OrientationZone` (une couleur ajoutée demain au catalogue). Elle est
 *    PRÉSENTE dans la fermeture, l'inclusion échoue, la règle s'éteint.
 *  · FERMETURE ABSENTE — le producteur refuse de servir une liste dès qu'une
 *    bande atteignable n'a pas de couleur (ou de libellé) exploitable, plutôt
 *    que de l'amputer en silence (voir `bandePlancher` dans `questions.ts`).
 *    `fermeture()` ci-dessous rend alors `null`, et la règle s'éteint aussi.
 *
 * Le second est le plus perfide des deux : une liste amputée reste une liste
 * bien formée, et l'inclusion y devient PLUS FACILE à satisfaire. C'est voulu
 * dans les deux cas — on préfère taire un vrai positif que produire un motif sur
 * un ordre de sévérité qu'on ne connaît pas.
 */
function zoneGarantieParLePlancher(zone: OrientationZone, plancher: PlancherContexte): string | null {
  // UNE PLAGE N'EST JAMAIS GARANTIE. Un plancher borne par le BAS ; une plage
  // exige aussi une borne HAUTE, que les items sans réponse peuvent franchir —
  // ils ne peuvent qu'ajouter au score. « Score entre 21 et 26 » n'est donc
  // jamais acquis sur un recueil partiel, même quand 21 est déjà atteint.
  if (zone.type === 'plage') return null;

  const bande = plancher.bande;

  /** Fermeture servie par le producteur, ou `null` si elle est inexploitable. */
  const fermeture = (cle: 'couleursPossibles' | 'labelsPossibles'): string[] | null => {
    const brut = bande[cle];
    if (!Array.isArray(brut) || brut.length === 0) return null;
    if (!brut.every((v): v is string => typeof v === 'string')) return null;
    return brut;
  };

  // LE MOTIF DIT LES DEUX CHOSES QU'UN PLANCHER EST — une garantie basse, ET une
  // garantie tirée d'un recueil incomplet. Arbitrage de la revue du 2026-08-05,
  // et il ne relève pas du confort de lecture : le libellé `warning` de
  // `Q_STR_02` commence par « Adaptation satisfaisante mais inconstante », si
  // bien que `R-STR-02` proposerait un pack burn-out sous une phrase qui
  // commence par « satisfaisante ». Le « au moins » seul rend ce libellé PLUS
  // trompeur, pas moins : il annonce un minimum sans dire qu'on l'a tiré d'une
  // passation à trous. La mention rétablit ce que le praticien doit savoir pour
  // relire la phrase — d'où le compte, qui dit l'ampleur du trou.
  //
  // LE DÉNOMINATEUR EN FAIT PARTIE : « 23 items sans réponse » et « 23 sur 31 »
  // ne se lisent pas pareil, et seul le second permet de décider s'il faut
  // relancer le patient plutôt que lui proposer un pack. Il n'est servi que
  // quand il est CALCULABLE — jamais supposé —, la phrase se repliant alors sur
  // la forme sans dénominateur.
  //
  // Les comptes ne sont jamais inventés : ils viennent de `comptesDuRecueil`, la
  // même et seule lecture que la garde de complétude. S'ils manquaient, la
  // mention sort nue plutôt qu'avec un nombre supposé — cas inatteignable en
  // pratique, un plancher n'étant servi que là où cette lecture a rendu un
  // compte strictement positif.
  const comptes = plancher.comptes;
  const mention = comptes && comptes.manquants > 0
    ? ` — recueil partiel, ${comptes.manquants} item${comptes.manquants > 1 ? 's' : ''} sans réponse`
      + (comptes.total !== null ? ` sur ${comptes.total}` : '')
    : ' — recueil partiel';

  if (zone.type === 'interpretation') {
    // BRANCHE SYMÉTRIQUE, et aucune des quatre règles du lot ne l'utilise. Elle
    // existe parce qu'une asymétrie non motivée finit par être « réparée » par
    // quelqu'un qui n'a pas la fermeture en tête — et la réparation naturelle
    // (« le label du plancher est dans la liste ») est précisément le défaut
    // que ce prédicat existe pour empêcher. La mention de recueil partiel suit
    // la même règle : une branche qui l'oublierait servirait au praticien un
    // motif moins complet selon la forme de la zone, ce qu'aucune clinique ne
    // justifie.
    const labels = fermeture('labelsPossibles');
    if (!labels || !labels.every(l => zone.labels.includes(l))) return null;
    const label = typeof bande.label === 'string' ? bande.label : null;
    return label ? `au moins interprétation « ${label} »${mention}` : null;
  }

  const couleurs = fermeture('couleursPossibles');
  if (!couleurs || !couleurs.every(c => (zone.couleurs as string[]).includes(c))) return null;
  const couleur = typeof bande.color === 'string' ? bande.color : null;
  if (!couleur) return null;
  const label = typeof bande.label === 'string' ? bande.label : null;
  // « AU MOINS » N'EST PAS COSMÉTIQUE : cette chaîne sort en clair au praticien
  // (`OrientationPanel` rend `motif.conditions.join(' ; ')`). Sans elle, un
  // motif fondé sur un plancher se relirait comme une mesure — c'est-à-dire
  // comme la bande que la garde de recueil partiel vient de retirer. Le préfixe
  // reste donc en tête : c'est ce que la fermeture GARANTIT, et la mention qui
  // suit dit d'où la garantie est tirée.
  return label
    ? `au moins zone ${couleur} (« ${label} »)${mention}`
    : `au moins zone ${couleur}${mention}`;
}

/** Description lisible de la zone atteinte sur la MESURE, ou null. */
function evaluerZoneMesuree(zone: OrientationZone, valeur: number | null, interpretation: InterpretationLue): string | null {
  if (zone.type === 'plage') {
    if (valeur === null || valeur < zone.min || valeur > zone.max) return null;
    return `score ${valeur} dans la plage ${zone.min}–${zone.max}`;
  }
  const label = interpretation && typeof interpretation === 'object' && typeof interpretation.label === 'string'
    ? interpretation.label
    : null;
  const couleur = interpretation && typeof interpretation === 'object' && typeof interpretation.color === 'string'
    ? interpretation.color
    : null;
  if (zone.type === 'interpretation') {
    if (!label || !zone.labels.includes(label)) return null;
    return `interprétation « ${label} »`;
  }
  if (!couleur || !(zone.couleurs as string[]).includes(couleur)) return null;
  return label ? `zone ${couleur} (« ${label} »)` : `zone ${couleur}`;
}

/**
 * Description lisible de la zone atteinte, ou null si la zone ne matche pas.
 *
 * DEUX CHEMINS, DANS CET ORDRE, et le second ne s'ouvre que là où le premier
 * s'est tu. La mesure prime toujours : quand elle existe, le plancher n'est pas
 * servi (voir `extraireCible`), et le motif rendu est celui de la mesure. Le
 * chemin du plancher est donc strictement additif — il ne peut ni modifier ni
 * masquer un verdict existant, seulement rallumer une règle qui restait éteinte
 * faute de bande sur un recueil partiel.
 */
function evaluerZone(
  zone: OrientationZone,
  valeur: number | null,
  interpretation: InterpretationLue,
  plancher: PlancherContexte | null,
): string | null {
  const mesuree = evaluerZoneMesuree(zone, valeur, interpretation);
  if (mesuree) return mesuree;
  return plancher ? zoneGarantieParLePlancher(zone, plancher) : null;
}

function comparer(valeur: number, operateur: '>=' | '<=' | '>' | '<' | '==', reference: number): boolean {
  switch (operateur) {
    case '>=': return valeur >= reference;
    case '<=': return valeur <= reference;
    case '>': return valeur > reference;
    case '<': return valeur < reference;
    case '==': return valeur === reference;
  }
}

// Libellés du champ d'anamnèse visé, quelle que soit sa forme : les champs
// liste rendent un tableau, les champs radio une valeur unique ou `null`.
function valeursDuDrapeau(drapeaux: DrapeauxAnamnese, champ: keyof DrapeauxAnamnese): string[] {
  const brut = drapeaux[champ];
  if (Array.isArray(brut)) return brut;
  return typeof brut === 'string' && brut ? [brut] : [];
}

/**
 * Description lisible du déclencheur atteint, ou null s'il ne matche pas.
 *
 * Exporté pour le moteur de contradictions (LOT-01). Le partage est le but :
 * les gardes qui vivent ici — recueil incomplet, sous-score absent, plancher
 * jamais comparé numériquement, `DC-24` — doivent valoir à l'identique pour les
 * deux moteurs. Les réécrire ailleurs les aurait fait diverger en silence.
 */
export function evaluerDeclencheur(
  declencheur: OrientationDeclencheur,
  dernieres: Map<string, ReponseOrientation>,
  drapeaux: DrapeauxAnamnese | undefined
): string | null {
  if (declencheur.type === 'drapeau') {
    // Pas d'anamnèse fournie : le déclencheur n'est pas atteint. On ne déduit
    // rien d'une absence — voir `EntreeOrientation.drapeaux`.
    if (!drapeaux) return null;
    const presentes = new Set(valeursDuDrapeau(drapeaux, declencheur.champ));
    // Ordre de la règle, et non ordre de stockage : le motif affiché au
    // praticien est stable d'un patient à l'autre.
    const atteintes = declencheur.valeurs.filter(valeur => presentes.has(valeur));
    if (atteintes.length === 0) return null;
    return `anamnèse — ${declencheur.champ} : ${atteintes.map(v => `« ${v} »`).join(', ')}`;
  }

  const reponse = dernieres.get(declencheur.idQuestionnaire);
  if (!reponse) return null;
  const { valeur, interpretation, plancher } = extraireCible(reponse.scores, declencheur.sousScore);
  const prefixe = declencheur.sousScore
    ? `${declencheur.idQuestionnaire} (${declencheur.sousScore})`
    : declencheur.idQuestionnaire;
  if (declencheur.type === 'zone') {
    const atteinte = evaluerZone(declencheur.zone, valeur, interpretation, plancher);
    return atteinte ? `${prefixe} : ${atteinte}` : null;
  }
  // LE PLANCHER NE PASSE PAS PAR ICI, et c'est structurel plutôt que gardé : la
  // branche `comparaison` ne reçoit pas `plancher`, elle ne compare que
  // `valeur`, et `valeur` reste `null` sur tout recueil partiel. Une comparaison
  // numérique sur un plancher n'aurait d'ailleurs aucun sens dans les deux sens
  // à la fois — un `<=` sur une échelle inversée (`Q_MOD_01`) s'allumerait sur
  // le biais du recueil, ce que la garde de complétude existe pour empêcher.
  if (valeur === null || !comparer(valeur, declencheur.operateur, declencheur.valeur)) return null;
  return `${prefixe} : score ${valeur} ${declencheur.operateur} ${declencheur.valeur}`;
}

function cleCible(cible: CibleExploration): string {
  return cible.type === 'questionnaire' ? `q:${cible.questionnaireId}` : `p:${cible.packId}`;
}

function estAdministrable(entree: EntreeOrientation, questionnaireId: string): boolean {
  return !entree.estAdministrable || entree.estAdministrable(questionnaireId);
}

/**
 * La dernière passation de cet instrument est-elle EXPLOITABLE ?
 *
 * « Exploitable » ne veut pas dire « existe » : le service met le score à `null`
 * — sans retirer la ligne — quand la passation est `INVALID`, `SUPERSEDED`,
 * `HISTORICAL_ONLY`, déclarée non interprétable par le registre, non
 * administrable, ou dépourvue de réponses brutes. C'est exactement la
 * différence qui décide si une exploration reste utile : le praticien qui
 * invalide une passation ATTEND une re-passation, et une exclusion aveugle
 * ferait disparaître la recommandation qu'il attend ([[D-053]], arbitrage 7).
 */
function passationExploitable(dernieres: Map<string, ReponseOrientation>, questionnaireId: string): boolean {
  const reponse = dernieres.get(questionnaireId);
  return reponse != null && reponse.scores != null;
}

/**
 * Cette cible est-elle déjà couverte par des passations exploitables ?
 *
 * Composition de pack inconnue = jamais couverte. Un fait inconnu ne se présente
 * pas comme un fait acquis : l'inverse serait un fail-open, et c'est le même
 * choix que celui qui laisse `dejaRepondu` à `null` dans ce cas.
 */
function cibleDejaCouverte(
  entree: EntreeOrientation,
  dernieres: Map<string, ReponseOrientation>,
  cible: CibleExploration
): boolean {
  if (cible.type === 'questionnaire') return passationExploitable(dernieres, cible.questionnaireId);
  const composition = entree.compositionPacks?.[cible.packId];
  if (!Array.isArray(composition) || composition.length === 0) return false;
  return composition.every(qid => passationExploitable(dernieres, qid));
}

/** Un pack ne passe que si TOUS ses membres connus sont administrables. */
function packAdministrable(entree: EntreeOrientation, packId: PackId): boolean {
  if (!entree.estAdministrable) return true;
  const composition = entree.compositionPacks?.[packId];
  // Composition inconnue alors qu'un filtre d'administrabilité est en place :
  // le pack est ÉCARTÉ, au lieu d'être laissé passer comme avant.
  //
  // Ce n'est PAS la réparation d'un incident : la route refiltre déjà en sortie
  // et rejetait ce cas (`api/praticien/orientation/route.ts`). C'est le moteur
  // qui se met d'accord avec elle — pour que le prochain appelant hérite du
  // fail-closed sans avoir à le redécouvrir, et pour que le banc de la table,
  // qui décrivait déjà ce comportement, dise vrai.
  //
  // Le cas est réel : la route ne charge que les packs `actif: true`, si bien
  // qu'un pack désactivé arrive ici sans composition. Vérifié en base le
  // 2026-08-03 — `PACK_HUMEUR_NEURO` est précisément dans ce cas.
  if (!Array.isArray(composition)) return false;
  return composition.every(qid => estAdministrable(entree, qid));
}

export function evaluerOrientation(entree: EntreeOrientation): RecommandationExploration[] {
  const dernieres = derniereReponseParQuestionnaire(entree.reponses);
  const assignes = new Set(entree.idsQuestionnairesAssignes);
  const parCible = new Map<string, RecommandationExploration>();

  for (const regle of entree.regles) {
    if (regle.statut !== 'publiee') continue;
    if (regle.declencheurs.length === 0) continue;
    // Invariant de traçabilité : une règle sans claim justificatif ne peut pas
    // être remontée jusqu'à sa source NNPP2. Elle ne recommande rien.
    if (regle.justificationClaims.length === 0) continue;

    // ET logique : tous les déclencheurs doivent être atteints.
    const conditions: string[] = [];
    let tousAtteints = true;
    for (const declencheur of regle.declencheurs) {
      const condition = evaluerDeclencheur(declencheur, dernieres, entree.drapeaux);
      if (!condition) {
        tousAtteints = false;
        break;
      }
      conditions.push(condition);
    }
    if (!tousAtteints) continue;

    const motif: MotifOrientation = {
      regleId: regle.id,
      conditions,
      claims: regle.justificationClaims.map(claim => ({ ...claim })),
    };

    for (const suggestion of regle.suggestions) {
      const cibles: CibleExploration[] = [];
      // Filtre DUR : une exploration non administrable (droits, certification)
      // n'apparaît pas, même dépriorisée. Un pack tombe entièrement dès qu'un
      // de ses membres connus est non administrable — proposer un pack amputé
      // en silence changerait ce que le praticien croit assigner.
      if (suggestion.questionnaireId && estAdministrable(entree, suggestion.questionnaireId)) {
        cibles.push({ type: 'questionnaire', questionnaireId: suggestion.questionnaireId });
      }
      if (suggestion.packId && packAdministrable(entree, suggestion.packId)) {
        cibles.push({ type: 'pack', packId: suggestion.packId });
      }

      for (const cible of cibles) {
        // `dejaRepondu` EXCLUANT — gaté, et sur la seule passation exploitable.
        // Re-proposer un instrument dont la mesure est déjà faite et cotable
        // n'apporte rien ; le faire disparaître parce qu'une ligne existe, alors
        // que sa mesure a été écartée, ferait perdre le signal « mesure à
        // replanifier ». La ligne ne porte donc pas d'extinction : elle n'est
        // pas produite du tout, et le badge « déjà renseigné » continue de dire
        // le fait administratif sur les cibles qui, elles, restent proposées.
        if (entree.exclureDejaRepondu && cibleDejaCouverte(entree, dernieres, cible)) continue;

        const cle = cleCible(cible);
        const existante = parCible.get(cle);
        if (existante) {
          // Dédup par règle : deux suggestions d'une même règle vers la même
          // cible ne comptent que pour un motif (sinon le tri s'en trouve faussé).
          if (!existante.motifs.some(m => m.regleId === regle.id)) existante.motifs.push(motif);
          existante.priorite = Math.min(existante.priorite, suggestion.priorite);
          if (RANG_NIVEAU[regle.niveau] < RANG_NIVEAU[existante.niveau] && cible.type === 'questionnaire') {
            existante.niveau = regle.niveau;
          }
          if (suggestion.objectif && !existante.objectifs.includes(suggestion.objectif)) {
            existante.objectifs.push(suggestion.objectif);
          }
          for (const needId of regle.needIds ?? []) {
            if (!existante.needIds.includes(needId)) existante.needIds.push(needId);
          }
          existante.needIds.sort((a, b) => a - b);
          continue;
        }

        let dejaAssigne = false;
        let dejaRepondu: boolean | null = null;
        if (cible.type === 'questionnaire') {
          dejaAssigne = assignes.has(cible.questionnaireId);
          dejaRepondu = dernieres.has(cible.questionnaireId);
        } else {
          const composition = entree.compositionPacks?.[cible.packId];
          if (Array.isArray(composition) && composition.length > 0) {
            dejaAssigne = composition.every(qid => assignes.has(qid));
            dejaRepondu = composition.every(qid => dernieres.has(qid));
          }
        }

        parCible.set(cle, {
          cible,
          priorite: suggestion.priorite,
          niveau: cible.type === 'pack' ? NIVEAU_PACK.get(cible.packId) ?? regle.niveau : regle.niveau,
          objectifs: suggestion.objectif ? [suggestion.objectif] : [],
          needIds: [...(regle.needIds ?? [])].sort((a, b) => a - b),
          dejaAssigne,
          dejaRepondu,
          motifs: [motif],
        });
      }
    }
  }

  // ── UN PACK ABSORBE SES MEMBRES ────────────────────────────────────────────
  //
  // Arbitrage praticien du 2026-08-04. Quand un pack est recommandé, les
  // questionnaires qui font partie de SA composition ne s'affichent plus en
  // lignes distinctes. Vérifié en base le même jour : `PACK_SOMMEIL_CHRONO`
  // contient `Q_SOM_01`…`Q_SOM_06`, `Q_INF_03` et `Q_NEU_11` ;
  // `PACK_STRESS_BURNOUT` contient `Q_STR_02` et `Q_STR_05` ;
  // `PACK_DIGESTIF_INTESTIN` contient `Q_GAS_01`. Le praticien voyait donc le
  // pack ET plusieurs de ses propres membres, et devait déduire lui-même que
  // les assigner tous ferait passer deux fois les mêmes instruments.
  //
  // PAS DE PLAFOND GLOBAL, décision explicite : tout ce qui reste justifié
  // reste affiché, et c'est le praticien qui tranche. L'absorption ne retire
  // que la REDONDANCE, jamais la quantité.
  //
  // ICI, ET PAS AILLEURS. Après la déduplication (une cible absorbée peut avoir
  // agrégé plusieurs motifs, qu'on veut tous reporter) et avant le tri (le
  // nombre de motifs est une clé de tri : trier puis absorber classerait sur un
  // compte périmé).
  //
  // CE QUI EST REPORTÉ, ET CE QUI NE L'EST PAS. Quatre champs remontent sur le
  // pack — `motifs`, `needIds`, `niveau`, `objectifs` —, et un seul ne remonte
  // pas.
  //
  //   `motifs` et `needIds` : données de RÈGLE — pourquoi cette exploration est
  //   proposée, et quels besoins elle vise. Les perdre effacerait la traçabilité
  //   claim par claim qui fonde toute cette table.
  //
  //   `niveau` : LE PLUS FONDAMENTAL des deux (`socle` < `approfondissement` <
  //   `specialise`), même ordre que l'agrégation à cible partagée plus haut.
  //   Corrigé le 2026-08-04. Un pack absorbe des cibles d'un AUTRE axe clinique
  //   — `PACK_SOMMEIL_CHRONO` contient `Q_NEU_11` (HAD) et `Q_INF_03` —, si bien
  //   qu'un patient sévère voyait sa sortie tomber à trois packs tous
  //   `approfondissement`, et PLUS RIEN au `socle`, alors que des règles `socle`
  //   avaient bel et bien déclenché. L'absorption doit retirer la redondance,
  //   pas dégrader ce que le praticien lit comme le plus fondamental.
  //
  //   `objectifs` : reportés PRÉFIXÉS PAR LA CIBLE ABSORBÉE (« via Q_NEU_11 :
  //   … »). L'objectif est la seule phrase française qui dit POURQUOI, et elle
  //   part aussi au modèle de synthèse (`buildBlocOrientation`) : la jeter
  //   perdait l'information la plus lisible de la ligne. L'objection qui la
  //   faisait jeter — « un objectif écrit pour la cible absorbée se lirait comme
  //   une description du pack » — vaut pour une absorption du MÊME axe, pas
  //   quand le HAD est absorbé par le pack sommeil. Le préfixe la lève : la
  //   phrase dit de qui elle parle, et ne peut plus se lire comme une
  //   description du pack.
  //
  // La `priorite` du pack, elle, ne bouge PAS : absorber un membre ne rend pas
  // le pack plus urgent qu'il ne l'était.
  //
  // Composition inconnue = aucune absorption. On ne devine pas ce qu'un pack
  // contient ; c'est la même prudence que `packAdministrable`.
  //
  // Un membre partagé par DEUX packs recommandés voit ses motifs reportés sur le
  // PREMIER — l'ordre de `parCible`, c'est-à-dire l'ordre des règles dans la
  // table, donc reproductible. Les dupliquer sur les deux gonflerait la clé de
  // tri « cible la plus motivée » d'un même motif compté deux fois.
  const recommandations = [...parCible.values()];
  const membresDesPacksRecommandes = new Map<string, RecommandationExploration>();
  for (const recommandation of recommandations) {
    if (recommandation.cible.type !== 'pack') continue;
    const composition = entree.compositionPacks?.[recommandation.cible.packId];
    if (!Array.isArray(composition)) continue;
    for (const qid of composition) {
      if (!membresDesPacksRecommandes.has(qid)) membresDesPacksRecommandes.set(qid, recommandation);
    }
  }

  const retenues = recommandations.filter(recommandation => {
    if (recommandation.cible.type !== 'questionnaire') return true;
    const pack = membresDesPacksRecommandes.get(recommandation.cible.questionnaireId);
    if (!pack) return true;
    for (const motif of recommandation.motifs) {
      if (!pack.motifs.some(m => m.regleId === motif.regleId)) pack.motifs.push(motif);
    }
    for (const needId of recommandation.needIds) {
      if (!pack.needIds.includes(needId)) pack.needIds.push(needId);
    }
    pack.needIds.sort((a, b) => a - b);
    // Le niveau le plus fondamental l'emporte : un `socle` absorbé garde la
    // ligne au socle.
    if (RANG_NIVEAU[recommandation.niveau] < RANG_NIVEAU[pack.niveau]) {
      pack.niveau = recommandation.niveau;
    }
    // Préfixé par la cible : la phrase ne peut pas se lire comme une
    // description du pack. `questionnaireId` est garanti par le `return true`
    // du dessus — seule une cible questionnaire arrive ici.
    const qid = recommandation.cible.questionnaireId;
    for (const objectif of recommandation.objectifs) {
      const reporte = `via ${qid} : ${objectif}`;
      if (!pack.objectifs.includes(reporte)) pack.objectifs.push(reporte);
    }
    return false;
  });

  // ── EXTINCTION PAR LES RÈGLES D'ARRÊT ─────────────────────────────────────
  //
  // ICI, ET PAS AILLEURS. Après l'absorption pack/membre — sinon un pack ayant
  // absorbé un membre éteint porterait le motif d'une cible qui n'est plus
  // servie — et avant le tri, qui lit `motifs.length` : éteindre après aurait
  // classé sur un compte périmé.
  //
  // L'EXTINCTION RETIRE DES MOTIFS, PAS DES LIGNES. Une règle d'arrêt nomme des
  // RÈGLES ; on retire donc de chaque recommandation les motifs qui viennent
  // d'elles. Une recommandation qui garde au moins un motif reste ALLUMÉE : elle
  // est encore justifiée par une règle que rien n'a éteinte, possiblement d'un
  // autre axe clinique. Une recommandation qui les perd tous devient éteinte —
  // elle reste dans la liste, avec ses motifs d'origine ET son motif
  // d'extinction, parce qu'une extinction n'efface jamais l'historique.
  //
  // Une règle d'arrêt sans claim n'éteint rien : même invariant de traçabilité
  // que pour les règles d'orientation, et pour la même raison.
  for (const arret of entree.reglesArret ?? []) {
    if (arret.statut !== 'publiee') continue;
    if (arret.declencheurs.length === 0) continue;
    if (arret.justificationClaims.length === 0) continue;
    if (arret.reglesEteintes.length === 0) continue;

    const conditions: string[] = [];
    let tousAtteints = true;
    for (const declencheur of arret.declencheurs) {
      const condition = evaluerDeclencheur(declencheur, dernieres, entree.drapeaux);
      if (!condition) {
        tousAtteints = false;
        break;
      }
      conditions.push(condition);
    }
    if (!tousAtteints) continue;

    const eteintes = new Set(arret.reglesEteintes);
    for (const recommandation of retenues) {
      // Déjà éteinte par une règle d'arrêt précédente : la première qui mord
      // porte le motif. En ajouter un second décrirait deux fois le même état.
      if (recommandation.extinction) continue;
      if (recommandation.motifs.length === 0) continue;
      if (!recommandation.motifs.every(motif => eteintes.has(motif.regleId))) continue;
      recommandation.extinction = {
        stopRuleId: arret.id,
        conditions,
        motif: arret.motif,
        claims: arret.justificationClaims.map(claim => ({ ...claim })),
      };
    }
  }

  // Tri déterministe : priorité croissante, puis cibles les plus motivées,
  // puis clé stable. L'extinction ne déplace RIEN dans cet ordre : une ligne
  // éteinte garde sa place et son rang, c'est son affichage qui change.
  return retenues.sort((a, b) =>
    a.priorite - b.priorite
    || b.motifs.length - a.motifs.length
    || cleCible(a.cible).localeCompare(cleCible(b.cible))
  );
}
