import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { PACKS_REGISTRY, type PackId } from '@/lib/questionnaires-functional';
import type { OrientationDeclencheur, OrientationRule, OrientationZone } from './orientationRulesV1';

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

function derniereReponseParQuestionnaire(reponses: ReponseOrientation[]): Map<string, ReponseOrientation> {
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
 * `tfd` (`Q_GAS_01`) RESTE, LUI, NON COUVERT, et c'est le dernier de la classe
 * atteignable par une règle publiée : il ne publie aucun compte à la racine, si
 * bien que `recueilIncomplet` rend `false` faute de savoir quoi lire. Ne pas
 * lire cette garde comme la clôture de la classe.
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
function recueilIncomplet(porteur: unknown): boolean {
  if (!porteur || typeof porteur !== 'object') return false;
  const nombre = (cle: 'repondus' | 'items' | 'missing') => {
    const brut = (porteur as Record<string, unknown>)[cle];
    return typeof brut === 'number' && Number.isFinite(brut) ? brut : null;
  };
  const repondus = nombre('repondus');
  const items = nombre('items');
  if (repondus !== null && items !== null) return repondus < items;
  const missing = nombre('missing');
  return missing !== null && missing > 0;
}

/** Valeur numérique et interprétation visées (score global ou sous-score). */
function extraireCible(scores: ScoresStockes, sousScore: string | undefined): {
  valeur: number | null;
  interpretation: InterpretationLue;
} {
  if (!scores || typeof scores !== 'object') return { valeur: null, interpretation: null };
  if (sousScore) {
    const bruts = (scores as { subScores?: unknown }).subScores;
    if (!Array.isArray(bruts)) return { valeur: null, interpretation: null };
    // Deux passes : l'id prime toujours sur le libellé. Une passe unique
    // laisserait un label égal à l'id d'un autre axe capter la règle.
    const axes = bruts as SousScoreLu[];
    const cible = axes.find(s => s?.id === sousScore) ?? axes.find(s => s?.label === sousScore);
    if (!cible) return { valeur: null, interpretation: null };
    // Voir `recueilIncomplet` : un axe incomplet n'est pas une mesure basse.
    if (recueilIncomplet(cible)) return { valeur: null, interpretation: null };
    return {
      valeur: typeof cible.total === 'number' && Number.isFinite(cible.total) ? cible.total : null,
      interpretation: cible.interpretation ?? null,
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
  // `interpretation: null` sur recueil partiel. Seul `tfd` (`Q_GAS_01`) ne
  // publie aucun compte au niveau global — « ne publie aucun compte » n'est PAS
  // « est protégé », voir le trou nommé en tête de `recueilIncomplet`.
  if (recueilIncomplet(scores)) return { valeur: null, interpretation: null };
  const total = (scores as { total?: unknown }).total;
  return {
    valeur: typeof total === 'number' && Number.isFinite(total) ? total : null,
    interpretation: ((scores as { interpretation?: InterpretationLue }).interpretation) ?? null,
  };
}

/** Description lisible de la zone atteinte, ou null si la zone ne matche pas. */
function evaluerZone(zone: OrientationZone, valeur: number | null, interpretation: InterpretationLue): string | null {
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

/** Description lisible du déclencheur atteint, ou null s'il ne matche pas. */
function evaluerDeclencheur(
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
  const { valeur, interpretation } = extraireCible(reponse.scores, declencheur.sousScore);
  const prefixe = declencheur.sousScore
    ? `${declencheur.idQuestionnaire} (${declencheur.sousScore})`
    : declencheur.idQuestionnaire;
  if (declencheur.type === 'zone') {
    const atteinte = evaluerZone(declencheur.zone, valeur, interpretation);
    return atteinte ? `${prefixe} : ${atteinte}` : null;
  }
  if (valeur === null || !comparer(valeur, declencheur.operateur, declencheur.valeur)) return null;
  return `${prefixe} : score ${valeur} ${declencheur.operateur} ${declencheur.valeur}`;
}

function cleCible(cible: CibleExploration): string {
  return cible.type === 'questionnaire' ? `q:${cible.questionnaireId}` : `p:${cible.packId}`;
}

function estAdministrable(entree: EntreeOrientation, questionnaireId: string): boolean {
  return !entree.estAdministrable || entree.estAdministrable(questionnaireId);
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

  // Tri déterministe : priorité croissante, puis cibles les plus motivées,
  // puis clé stable.
  return retenues.sort((a, b) =>
    a.priorite - b.priorite
    || b.motifs.length - a.motifs.length
    || cleCible(a.cible).localeCompare(cleCible(b.cible))
  );
}
